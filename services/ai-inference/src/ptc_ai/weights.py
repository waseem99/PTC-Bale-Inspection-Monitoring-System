from __future__ import annotations

from pathlib import Path


_TRACK_HINTS = ("track", "tracker", "bale-track", "bale_track")
_INSPECT_HINTS = ("inspect", "inspection", "inspected")
_WEIGHT_SUFFIXES = {".pt", ".onnx", ".engine"}


def default_models_dir() -> Path:
    here = Path(__file__).resolve()
    repo_root = here.parents[4]
    candidates = (
        Path.cwd() / "models",
        repo_root / "models",
        here.parents[1] / "models",
    )
    for path in candidates:
        if path.is_dir():
            return path
    return repo_root / "models"


def _weight_files(models_dir: Path) -> list[Path]:
    if not models_dir.is_dir():
        return []
    return sorted(
        path
        for path in models_dir.iterdir()
        if path.is_file() and path.suffix.lower() in _WEIGHT_SUFFIXES
    )


def _matches(path: Path, hints: tuple[str, ...]) -> bool:
    name = path.stem.lower().replace("-", "_")
    return any(hint.replace("-", "_") in name for hint in hints)


def resolve_model_weights(
    track_weights: str | Path | None = None,
    inspection_weights: str | Path | None = None,
    models_dir: str | Path | None = None,
) -> tuple[Path, Path]:
    directory = Path(models_dir) if models_dir is not None else default_models_dir()
    if track_weights is not None and inspection_weights is not None:
        return Path(track_weights), Path(inspection_weights)

    files = _weight_files(directory)
    track = Path(track_weights) if track_weights is not None else None
    inspect = Path(inspection_weights) if inspection_weights is not None else None

    if track is None:
        matches = [path for path in files if _matches(path, _TRACK_HINTS) and path != inspect]
        if len(matches) == 1:
            track = matches[0]
        elif inspect is None:
            remaining = [path for path in files if not _matches(path, _INSPECT_HINTS)]
            if len(remaining) == 1:
                track = remaining[0]

    if inspect is None:
        matches = [path for path in files if _matches(path, _INSPECT_HINTS) and path != track]
        if len(matches) == 1:
            inspect = matches[0]
        elif track is not None:
            remaining = [path for path in files if path != track]
            if len(remaining) == 1:
                inspect = remaining[0]

    if track is None or inspect is None or track == inspect:
        names = ", ".join(path.name for path in files) or "(none)"
        raise FileNotFoundError(
            "Need two YOLO weight files: one for bale tracking and one for inspection. "
            f"Looked in {directory}. Found: {names}. "
            "Name them with 'track' and 'inspect' (for example ptc-bale-track.pt and ptc-bale-inspect.pt) "
            "or pass --weights and --inspection-weights."
        )
    return track, inspect
