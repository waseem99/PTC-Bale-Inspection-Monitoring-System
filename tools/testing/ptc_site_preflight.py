from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

REQUIRED_CAMERA_IDS = ("CAM-01", "CAM-02", "CAM-03", "CAM-04")
REQUIRED_ROIS = ("entry", "inspection", "grading", "accepted", "rejected", "scaleDisplay")
REQUIRED_MANUAL_CHECKS = (
    "timeSynchronizationVerified",
    "cameraVlanFirewallVerified",
    "cameraFirmwareAndTransportRecorded",
    "evidenceCaptureVerified",
    "singleCameraFailureIsolationVerified",
    "fourStreamStabilityVerified",
    "scaleDisplayReadabilityRecorded",
    "controlledCaptureManifestRecorded",
    "lockedTestSessionRecorded",
    "pmSiteApproval",
)
ENV_NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
URL_RE = re.compile(r"(?i)\b(?:rtsp|rtsps|https?)://[^\s\"'<>]+")
CREDENTIAL_RE = re.compile(r"(?i)(?:rtsp|rtsps|https?)://[^/@\s]+:[^/@\s]+@")
PRIVATE_HOST_RE = re.compile(
    r"(?<!\d)(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"192\.168\.\d{1,3}\.\d{1,3}|"
    r"172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?!\d)"
)


class ValidationError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class CameraSpec:
    camera_id: str
    stream_env_var: str
    physical_view: str
    min_width: int | None
    min_height: int | None
    min_fps: float | None


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValidationError(f"File not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValidationError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValidationError(f"JSON root must be an object: {path}")
    return value


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _validate_polygon(value: Any, label: str) -> None:
    if not isinstance(value, list) or len(value) < 3:
        raise ValidationError(f"{label} must contain at least three normalized points")
    for index, point in enumerate(value):
        if not isinstance(point, list) or len(point) != 2:
            raise ValidationError(f"{label}[{index}] must be [x, y]")
        try:
            x, y = float(point[0]), float(point[1])
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"{label}[{index}] must contain numeric coordinates") from exc
        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
            raise ValidationError(f"{label}[{index}] coordinates must be normalized to 0..1")


def validate_roi_config(data: dict[str, Any]) -> dict[str, Any]:
    cameras = data.get("cameras")
    if not isinstance(cameras, dict):
        raise ValidationError("ROI config must contain a cameras object")
    if tuple(sorted(cameras)) != REQUIRED_CAMERA_IDS:
        raise ValidationError("ROI config must contain exactly CAM-01 through CAM-04")
    for camera_id in REQUIRED_CAMERA_IDS:
        raw = cameras.get(camera_id)
        if not isinstance(raw, dict):
            raise ValidationError(f"{camera_id} ROI configuration must be an object")
        for roi_name in REQUIRED_ROIS:
            _validate_polygon(raw.get(roi_name), f"{camera_id}.{roi_name}")

    approval = data.get("approval") or {}
    if not isinstance(approval, dict):
        raise ValidationError("ROI approval must be an object")
    approved = approval.get("approved") is True
    approved_by = str(approval.get("approvedBy") or "").strip()
    approved_at = approval.get("approvedAt")
    approval_complete = approved and bool(approved_by) and bool(approved_at)

    versions = data.get("versions") or {}
    if not isinstance(versions, dict):
        raise ValidationError("ROI versions must be an object")
    config_version = str(versions.get("config") or "").strip()
    if not config_version:
        raise ValidationError("ROI versions.config is required")

    return {
        "valid": True,
        "approved": approval_complete,
        "configVersion": config_version,
        "cameraCount": len(cameras),
        "requiredRois": list(REQUIRED_ROIS),
    }


def _optional_positive_int(value: Any, label: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValidationError(f"{label} must be a positive integer")
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{label} must be a positive integer") from exc
    if parsed <= 0:
        raise ValidationError(f"{label} must be a positive integer")
    return parsed


def _optional_positive_float(value: Any, label: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValidationError(f"{label} must be positive")
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{label} must be positive") from exc
    if parsed <= 0:
        raise ValidationError(f"{label} must be positive")
    return parsed


def validate_manifest(data: dict[str, Any]) -> tuple[list[CameraSpec], dict[str, bool | None]]:
    cameras = data.get("cameras")
    if not isinstance(cameras, list) or len(cameras) != 4:
        raise ValidationError("Site manifest must contain exactly four cameras")

    parsed: list[CameraSpec] = []
    camera_ids: list[str] = []
    env_vars: list[str] = []
    for index, raw in enumerate(cameras):
        if not isinstance(raw, dict):
            raise ValidationError(f"cameras[{index}] must be an object")
        camera_id = str(raw.get("cameraId") or "").strip()
        stream_env_var = str(raw.get("streamEnvVar") or "").strip()
        physical_view = str(raw.get("physicalView") or "").strip()
        if not camera_id:
            raise ValidationError(f"cameras[{index}].cameraId is required")
        if not ENV_NAME_RE.fullmatch(stream_env_var):
            raise ValidationError(f"{camera_id}.streamEnvVar must be an uppercase environment-variable name")
        if not physical_view:
            raise ValidationError(f"{camera_id}.physicalView is required")
        expected = raw.get("expected") or {}
        if not isinstance(expected, dict):
            raise ValidationError(f"{camera_id}.expected must be an object")
        parsed.append(
            CameraSpec(
                camera_id=camera_id,
                stream_env_var=stream_env_var,
                physical_view=physical_view,
                min_width=_optional_positive_int(expected.get("minWidth"), f"{camera_id}.expected.minWidth"),
                min_height=_optional_positive_int(expected.get("minHeight"), f"{camera_id}.expected.minHeight"),
                min_fps=_optional_positive_float(expected.get("minFps"), f"{camera_id}.expected.minFps"),
            )
        )
        camera_ids.append(camera_id)
        env_vars.append(stream_env_var)

    if tuple(sorted(camera_ids)) != REQUIRED_CAMERA_IDS:
        raise ValidationError("Site manifest camera IDs must be exactly CAM-01 through CAM-04")
    if len(set(env_vars)) != len(env_vars):
        raise ValidationError("Each camera must use a distinct streamEnvVar")

    manual_checks = data.get("manualChecks")
    if not isinstance(manual_checks, dict):
        raise ValidationError("Site manifest must contain manualChecks")
    parsed_checks: dict[str, bool | None] = {}
    for key in REQUIRED_MANUAL_CHECKS:
        value = manual_checks.get(key)
        if value not in (True, False, None):
            raise ValidationError(f"manualChecks.{key} must be true, false, or null")
        parsed_checks[key] = value
    return parsed, parsed_checks


def _parse_rate(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in {"0/0", "N/A"}:
        return None
    if "/" in text:
        numerator, denominator = text.split("/", 1)
        try:
            den = float(denominator)
            return float(numerator) / den if den else None
        except ValueError:
            return None
    try:
        return float(text)
    except ValueError:
        return None


def sanitize_text(text: str, stream_url: str | None = None) -> str:
    safe = text or ""
    if stream_url:
        safe = safe.replace(stream_url, "[REDACTED_STREAM_URL]")
        try:
            parsed = urlsplit(stream_url)
            if parsed.netloc:
                safe = safe.replace(parsed.netloc, "[REDACTED_HOST]")
            if parsed.hostname:
                safe = safe.replace(parsed.hostname, "[REDACTED_HOST]")
        except ValueError:
            pass
    safe = CREDENTIAL_RE.sub(lambda match: match.group(0).split("://", 1)[0] + "://[REDACTED]@", safe)
    safe = URL_RE.sub("[REDACTED_URL]", safe)
    safe = PRIVATE_HOST_RE.sub("[REDACTED_PRIVATE_HOST]", safe)
    return safe[:1000]


def _probe_command(ffprobe: str, stream_url: str) -> list[str]:
    scheme = urlsplit(stream_url).scheme.lower()
    command = [ffprobe, "-v", "error"]
    if scheme in {"rtsp", "rtsps"}:
        command.extend(["-rtsp_transport", "tcp"])
    command.extend(
        [
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name,width,height,avg_frame_rate,r_frame_rate",
            "-of",
            "json",
            stream_url,
        ]
    )
    return command


def _probe_once(ffprobe: str, stream_url: str, timeout: int) -> tuple[dict[str, Any] | None, str | None]:
    try:
        completed = subprocess.run(
            _probe_command(ffprobe, stream_url),
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError:
        return None, "ffprobe executable not found"
    except subprocess.TimeoutExpired:
        return None, "ffprobe timed out"
    if completed.returncode != 0:
        message = sanitize_text(completed.stderr or completed.stdout or "ffprobe failed", stream_url)
        return None, message
    try:
        payload = json.loads(completed.stdout or "{}")
    except json.JSONDecodeError:
        return None, "ffprobe returned invalid JSON"
    streams = payload.get("streams") if isinstance(payload, dict) else None
    if not isinstance(streams, list) or not streams or not isinstance(streams[0], dict):
        return None, "ffprobe returned no video stream"
    stream = streams[0]
    rate = _parse_rate(stream.get("avg_frame_rate")) or _parse_rate(stream.get("r_frame_rate"))
    return (
        {
            "codec": str(stream.get("codec_name") or "unknown"),
            "width": int(stream.get("width") or 0),
            "height": int(stream.get("height") or 0),
            "fps": round(rate, 3) if rate is not None else None,
        },
        None,
    )


def _meets_expected(spec: CameraSpec, metadata: dict[str, Any]) -> tuple[bool, list[str]]:
    gaps: list[str] = []
    width = int(metadata.get("width") or 0)
    height = int(metadata.get("height") or 0)
    fps = metadata.get("fps")
    if spec.min_width is not None and width < spec.min_width:
        gaps.append(f"width below expected minimum {spec.min_width}")
    if spec.min_height is not None and height < spec.min_height:
        gaps.append(f"height below expected minimum {spec.min_height}")
    if spec.min_fps is not None and (fps is None or float(fps) < spec.min_fps):
        gaps.append(f"fps below expected minimum {spec.min_fps}")
    return not gaps, gaps


def probe_camera(spec: CameraSpec, ffprobe: str, attempts: int, timeout: int) -> dict[str, Any]:
    stream_url = os.environ.get(spec.stream_env_var, "").strip()
    if not stream_url:
        return {
            "cameraId": spec.camera_id,
            "physicalView": spec.physical_view,
            "streamEnvVar": spec.stream_env_var,
            "configured": False,
            "reachable": False,
            "repeatProbePassed": False,
            "scheme": None,
            "metadata": None,
            "meetsExpectedMinimums": False,
            "gaps": [f"environment variable {spec.stream_env_var} is not set"],
        }

    try:
        scheme = urlsplit(stream_url).scheme.lower()
    except ValueError:
        scheme = ""
    if scheme not in {"rtsp", "rtsps", "http", "https"}:
        return {
            "cameraId": spec.camera_id,
            "physicalView": spec.physical_view,
            "streamEnvVar": spec.stream_env_var,
            "configured": True,
            "reachable": False,
            "repeatProbePassed": False,
            "scheme": scheme or "invalid",
            "metadata": None,
            "meetsExpectedMinimums": False,
            "gaps": ["unsupported stream URL scheme"],
        }

    metadata: dict[str, Any] | None = None
    errors: list[str] = []
    successes = 0
    for _ in range(max(1, attempts)):
        result, error = _probe_once(ffprobe, stream_url, timeout)
        if result is not None:
            successes += 1
            if metadata is None:
                metadata = result
        elif error:
            errors.append(error)

    expected_ok = False
    expected_gaps: list[str] = []
    if metadata is not None:
        expected_ok, expected_gaps = _meets_expected(spec, metadata)
    gaps = expected_gaps + (["one or more repeated reachability probes failed"] if successes < max(1, attempts) else [])
    if errors:
        gaps.extend(f"probe: {item}" for item in errors[:2])
    return {
        "cameraId": spec.camera_id,
        "physicalView": spec.physical_view,
        "streamEnvVar": spec.stream_env_var,
        "configured": True,
        "reachable": successes > 0,
        "repeatProbePassed": successes == max(1, attempts),
        "scheme": scheme,
        "metadata": metadata,
        "meetsExpectedMinimums": expected_ok,
        "gaps": gaps,
    }


def _release_commit(cli_value: str | None) -> str:
    value = (cli_value or os.environ.get("PTC_RELEASE_COMMIT") or os.environ.get("GITHUB_SHA") or "").strip()
    if re.fullmatch(r"[0-9a-fA-F]{7,40}", value):
        return value
    return "not-recorded"


def build_report(
    manifest_path: Path,
    roi_path: Path,
    cameras: list[CameraSpec],
    manual_checks: dict[str, bool | None],
    roi_summary: dict[str, Any],
    ffprobe: str,
    attempts: int,
    timeout: int,
    validate_only: bool,
    release_commit: str | None,
) -> dict[str, Any]:
    camera_results = [] if validate_only else [probe_camera(item, ffprobe, attempts, timeout) for item in cameras]
    manual_complete = all(value is True for value in manual_checks.values())
    camera_technical_pass = bool(camera_results) and all(
        item["reachable"] and item["repeatProbePassed"] and item["meetsExpectedMinimums"] for item in camera_results
    )

    if validate_only:
        status = "prepared"
    elif not camera_technical_pass or not roi_summary["valid"]:
        status = "blocked"
    elif roi_summary["approved"] and manual_complete:
        status = "pass"
    else:
        status = "technical-pass-pending-manual-acceptance"

    pending_manual = [key for key, value in manual_checks.items() if value is not True]
    return {
        "schemaVersion": "ptc-site-preflight-report-v1",
        "status": status,
        "releaseCommit": _release_commit(release_commit),
        "inputs": {
            "manifestSha256": _sha256(manifest_path),
            "roiConfigSha256": _sha256(roi_path),
            "roiConfigVersion": roi_summary["configVersion"],
        },
        "roi": roi_summary,
        "cameras": camera_results,
        "manualChecks": manual_checks,
        "pendingManualChecks": pending_manual,
        "automatedChecks": {
            "manifestValid": True,
            "roiConfigValid": True,
            "fourCameraIdentityValid": True,
            "streamURLsLoadedOnlyFromEnvironment": True,
            "repeatedReachabilityProbe": False if validate_only else all(item["repeatProbePassed"] for item in camera_results),
            "cameraTechnicalMinimums": False if validate_only else camera_technical_pass,
        },
        "limitations": [
            "Repeated ffprobe attempts prove repeated reachability only; they do not replace the deliberate disconnect/reconnect/backoff test.",
            "Time synchronization, VLAN/firewall isolation, evidence capture, one-camera failure isolation, four-stream stability, scale readability, controlled capture, locked-test separation, and PM/site approval remain manual/site evidence.",
        ],
        "security": {
            "streamUrlsWrittenToReport": False,
            "credentialsWrittenToReport": False,
            "rawFramesWrittenToReport": False,
            "rawFootageWrittenToReport": False,
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="PTC #84 camera/ROI site preflight with sanitized evidence output")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--roi-config", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--ffprobe", default="ffprobe")
    parser.add_argument("--attempts", type=int, default=2)
    parser.add_argument("--probe-timeout", type=int, default=12)
    parser.add_argument("--release-commit")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args(argv)

    if args.attempts < 1:
        parser.error("--attempts must be at least 1")
    if args.probe_timeout < 1:
        parser.error("--probe-timeout must be at least 1 second")

    try:
        manifest = _read_json(args.manifest)
        roi_config = _read_json(args.roi_config)
        cameras, manual_checks = validate_manifest(manifest)
        roi_summary = validate_roi_config(roi_config)
        report = build_report(
            args.manifest,
            args.roi_config,
            cameras,
            manual_checks,
            roi_summary,
            args.ffprobe,
            args.attempts,
            args.probe_timeout,
            args.validate_only,
            args.release_commit,
        )
    except ValidationError as exc:
        print(f"site preflight validation failed: {exc}", file=sys.stderr)
        return 2

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "output": str(args.output)}, sort_keys=True))
    if report["status"] == "blocked":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
