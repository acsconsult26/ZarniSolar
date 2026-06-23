from __future__ import annotations
"""Storage abstraction. Dev implementation writes to local disk under
UPLOAD_DIR; swap this module for an S3-backed implementation in production
without touching callers (they only use save_file/read_file/url_for)."""
import os
import uuid
from pathlib import Path

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", Path(__file__).resolve().parent.parent / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class LocalStorage:
    def save_bytes(self, data: bytes, original_filename: str) -> str:
        ext = Path(original_filename).suffix
        key = f"{uuid.uuid4().hex}{ext}"
        path = UPLOAD_DIR / key
        path.write_bytes(data)
        return str(path)

    def read_bytes(self, path: str) -> bytes:
        return Path(path).read_bytes()

    def exists(self, path: str | None) -> bool:
        return bool(path) and Path(path).exists()

    def url_for(self, path: str) -> str:
        return f"/uploads/{Path(path).name}"


storage = LocalStorage()
