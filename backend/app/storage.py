from __future__ import annotations
"""Storage abstraction backed by Firebase Storage (Cloud Storage bucket).
Rules allow public read (see storage.rules), so uploaded files are reachable
via Firebase's public download URL with no signed token needed."""
import os
import uuid
from urllib.parse import quote

from firebase_admin import storage as fb_storage

_bucket = None


def _get_bucket():
    global _bucket
    if _bucket is None:
        _bucket = fb_storage.bucket()
    return _bucket


class FirebaseStorage:
    def save_bytes(self, data: bytes, original_filename: str) -> str:
        ext = os.path.splitext(original_filename)[1]
        key = f"uploads/{uuid.uuid4().hex}{ext}"
        blob = _get_bucket().blob(key)
        blob.upload_from_string(data)
        return key

    def read_bytes(self, path: str) -> bytes:
        return _get_bucket().blob(path).download_as_bytes()

    def exists(self, path: str | None) -> bool:
        return bool(path) and _get_bucket().blob(path).exists()

    def url_for(self, path: str) -> str:
        bucket_name = _get_bucket().name
        encoded = quote(path, safe="")
        return f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded}?alt=media"


storage = FirebaseStorage()
