"""Congreso oficial source: downloads the official portrait via cod_parlamentario.

The server returns 403/404 in many browser contexts (hotlinking is blocked) but
works fine from a server-side request with a browser User-Agent. That's why we
must download here and serve the photo from our own bucket — never hotlink.
"""

import time
from typing import Optional

from ..validate import PhotoValidationError, download, to_webp_square
from .base import PhotoSource, PoliticianRow, SourceMatch

REQUEST_DELAY = 1.5  # CLAUDE.md: do not lower this for congreso.es


class CongresoOficialSource:
    name = "congreso_oficial"
    priority = 2

    def __init__(self) -> None:
        self._last_request_at: float = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
        self._last_request_at = time.monotonic()

    def find(self, politician: PoliticianRow) -> Optional[SourceMatch]:
        if not politician.cod_parlamentario:
            return None
        url = f"https://www.congreso.es/img/diputados/{politician.cod_parlamentario}.jpg"
        self._throttle()
        try:
            raw = download(url)
            normalized = to_webp_square(raw)
        except PhotoValidationError as exc:
            print(f"[congreso_oficial] {politician.full_name} ({politician.cod_parlamentario}): {exc}")
            return None
        return SourceMatch(photo_bytes=normalized, source=self.name)
