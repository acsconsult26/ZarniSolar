"""Firebase Admin SDK initialization, shared across the app.

Honors the standard emulator env vars (FIRESTORE_EMULATOR_HOST,
FIREBASE_AUTH_EMULATOR_HOST) automatically -- set them for local dev,
leave unset in production to hit the real Firebase project.
"""
from __future__ import annotations

import os

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials
from firebase_admin import firestore
from google.auth.credentials import AnonymousCredentials

PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "zarni-solar-proposal-1c2b9")
STORAGE_BUCKET = os.environ.get("FIREBASE_STORAGE_BUCKET", f"{PROJECT_ID}.firebasestorage.app")
_USING_EMULATOR = bool(
    os.environ.get("FIRESTORE_EMULATOR_HOST") or os.environ.get("FIREBASE_AUTH_EMULATOR_HOST")
)


class _EmulatorCredential(credentials.Base):
    """Satisfies firebase_admin's credential interface locally -- the
    Firestore/Auth emulators don't validate tokens, so any credential object
    that doesn't attempt a real network auth handshake works."""

    def get_credential(self):
        return AnonymousCredentials()


if not firebase_admin._apps:
    cred = _EmulatorCredential() if _USING_EMULATOR else credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, options={"projectId": PROJECT_ID, "storageBucket": STORAGE_BUCKET})

db = firestore.client()
auth = fb_auth
