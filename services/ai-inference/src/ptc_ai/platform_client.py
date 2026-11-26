"""Minimal HTTP client for platform `/api/ingest/events`."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any


class PlatformIngestClient:
    def __init__(self, base_url: str, token: str, *, timeout_seconds: float = 8.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout_seconds = timeout_seconds

    def post_event(self, payload: dict[str, Any]) -> dict[str, Any]:
        request = urllib.request.Request(
            f"{self.base_url}/api/ingest/events",
            data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = response.read().decode("utf-8")
                parsed = json.loads(body) if body else {}
                return {"httpStatus": response.status, **(parsed if isinstance(parsed, dict) else {"body": parsed})}
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Ingest HTTP {error.code}: {detail}") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"Ingest unreachable: {error}") from error
