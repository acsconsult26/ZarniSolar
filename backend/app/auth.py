"""Authentication: Firebase Auth verifies identity (email/password, ID
tokens); Firestore's `users/{uid}` doc holds the app-specific profile
(role, active flag) since that's not something Firebase Auth models
natively. Role lives in Firestore rather than an Auth custom claim so a
role change takes effect immediately, without forcing a re-login.
"""
from __future__ import annotations

import datetime
import os

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as fb_auth
from firebase_admin.auth import EmailAlreadyExistsError

from . import firestore_db as fdb

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@zarni.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "demo1234")

_bearer = HTTPBearer(auto_error=False)


def ensure_seed_admin() -> None:
    """Create one admin account (Auth + Firestore profile) if no user
    profiles exist yet, from the ADMIN_EMAIL/ADMIN_PASSWORD env vars."""
    if fdb.list_all("users"):
        return
    try:
        user = fb_auth.create_user(email=ADMIN_EMAIL, password=ADMIN_PASSWORD, display_name="Admin")
    except EmailAlreadyExistsError:
        user = fb_auth.get_user_by_email(ADMIN_EMAIL)
    fdb.set_doc("users", user.uid, {
        "email": ADMIN_EMAIL,
        "name": "Admin",
        "role": "admin",
        "is_active": True,
        "created_at": datetime.datetime.utcnow(),
        "last_login_at": None,
    })


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        decoded = fb_auth.verify_id_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Not authenticated")
    uid = decoded["uid"]
    profile = fdb.get("users", uid)
    if not profile or not profile.get("is_active", True):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"uid": uid, "email": profile.get("email", decoded.get("email")), **profile}


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
