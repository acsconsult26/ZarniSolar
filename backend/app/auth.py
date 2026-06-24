"""Demo-grade admin authentication.

A single admin account is configured via environment variables. On login we
issue an HMAC-signed, time-limited bearer token (no external dependency).
This is intentionally simple for a demo/testing deployment — for production,
swap in real user accounts + password hashing (passlib) + JWT.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@zarni.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "demo1234")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "dev-insecure-secret-change-me")
TOKEN_TTL_SECONDS = int(os.environ.get("ADMIN_TOKEN_TTL", str(24 * 3600)))

_bearer = HTTPBearer(auto_error=False)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def verify_credentials(email: str, password: str) -> bool:
    return hmac.compare_digest(email or "", ADMIN_EMAIL) and hmac.compare_digest(
        password or "", ADMIN_PASSWORD
    )


def issue_token(email: str) -> str:
    payload = {"sub": email, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64(json.dumps(payload).encode())
    sig = hmac.new(ADMIN_SECRET.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(sig)}"


def _validate_token(token: str) -> bool:
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(ADMIN_SECRET.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64decode(sig), expected):
            return False
        payload = json.loads(_b64decode(body))
        return payload.get("exp", 0) >= int(time.time())
    except Exception:
        return False


def require_admin(creds: HTTPAuthorizationCredentials = Depends(_bearer)):
    if creds is None or not _validate_token(creds.credentials):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return True
