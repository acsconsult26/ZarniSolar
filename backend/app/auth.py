"""User authentication: password-hashed accounts with admin/staff roles.

Tokens are HMAC-signed and time-limited (no external JWT dependency). On
first startup, `ensure_seed_admin` creates one admin account from the
ADMIN_EMAIL/ADMIN_PASSWORD env vars if the users table is empty, so existing
deployments don't get locked out.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import datetime

import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@zarni.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "demo1234")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "dev-insecure-secret-change-me")
TOKEN_TTL_SECONDS = int(os.environ.get("ADMIN_TOKEN_TTL", str(24 * 3600)))

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], password_hash.encode())
    except Exception:
        return False


def ensure_seed_admin(db: Session) -> None:
    """Create one admin account from env vars if no users exist yet."""
    if db.query(User).count() > 0:
        return
    db.add(User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        name="Admin",
        role="admin",
        is_active=True,
    ))
    db.commit()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        return None
    if not verify_password(password or "", user.password_hash):
        return None
    return user


def issue_token(user: User) -> str:
    payload = {"sub": user.id, "role": user.role, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64(json.dumps(payload).encode())
    sig = hmac.new(ADMIN_SECRET.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(sig)}"


def _decode_token(token: str) -> dict | None:
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(ADMIN_SECRET.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64decode(sig), expected):
            return None
        payload = json.loads(_b64decode(body))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = _decode_token(creds.credentials) if creds else None
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).get(payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
