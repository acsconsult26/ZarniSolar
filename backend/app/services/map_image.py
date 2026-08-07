"""Fetches a Google Static Maps snapshot for a lat/lng, for the Surveying
Data step (slide 5). Key is read from env so this can be left unconfigured
without breaking anything else -- the caller gets a clear error and the
proposal form falls back to manual photo upload."""
from __future__ import annotations

import os

import httpx

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")


class MapImageError(Exception):
    pass


def _request_static_map(lat: float, lng: float, maptype: str, zoom: int) -> httpx.Response:
    params = {
        "center": f"{lat},{lng}",
        "zoom": str(zoom),
        "size": "640x640",
        "scale": "2",
        "maptype": maptype,
        "markers": f"color:red|{lat},{lng}",
        "key": GOOGLE_MAPS_API_KEY,
    }
    return httpx.get("https://maps.googleapis.com/maps/api/staticmap", params=params, timeout=15)


def fetch_static_map(lat: float, lng: float, *, maptype: str = "satellite", zoom: int = 18) -> bytes:
    if not GOOGLE_MAPS_API_KEY:
        raise MapImageError(
            "Google Maps isn't configured on the server yet -- set the GOOGLE_MAPS_API_KEY "
            "env var (Maps Static API enabled) on the backend."
        )
    resp = _request_static_map(lat, lng, maptype, zoom)

    # Some Google Cloud projects are subject to an EEA/Digital Markets Act
    # restriction that blocks satellite/hybrid tiles specifically (regardless
    # of where the request is served from -- this runs server-side on Cloud
    # Run, not from the requesting browser). Roadmap tiles aren't restricted,
    # so fall back to those rather than failing the whole feature.
    if resp.status_code == 403 and maptype in ("satellite", "hybrid") and "not available for your account" in resp.text:
        resp = _request_static_map(lat, lng, "roadmap", zoom)

    if resp.status_code != 200 or resp.headers.get("content-type", "").startswith("text"):
        raise MapImageError(f"Google Maps request failed: {resp.status_code} {resp.text[:200]}")
    return resp.content
