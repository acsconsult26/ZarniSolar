from __future__ import annotations
"""Storage abstraction backed by Firebase Storage (Cloud Storage bucket).
Rules allow public read (see storage.rules), so uploaded files are reachable
via Firebase's public download URL with no signed token needed."""
import io
import os
import uuid
from urllib.parse import quote

from firebase_admin import storage as fb_storage
from PIL import Image

_bucket = None

_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
_MAX_DIMENSION = 1920
_JPEG_QUALITY = 82


def _get_bucket():
    global _bucket
    if _bucket is None:
        _bucket = fb_storage.bucket()
    return _bucket


def _compress_image(data: bytes) -> tuple[bytes, str, str]:
    """Downscales large images and re-encodes as JPEG (or PNG if the image
    has real transparency) to keep Firebase Storage usage small. Falls back
    to the original bytes if the file isn't a decodable image."""
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        return data, ".bin", "application/octet-stream"

    if img.mode == "P":
        img = img.convert("RGBA")
    w, h = img.size
    if max(w, h) > _MAX_DIMENSION:
        scale = _MAX_DIMENSION / max(w, h)
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)

    has_alpha = img.mode in ("RGBA", "LA") and img.getchannel("A").getextrema()[0] < 255
    buf = io.BytesIO()
    if has_alpha:
        img.save(buf, format="PNG", optimize=True)
        return buf.getvalue(), ".png", "image/png"
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.save(buf, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
    return buf.getvalue(), ".jpg", "image/jpeg"


class FirebaseStorage:
    def save_bytes(self, data: bytes, original_filename: str) -> str:
        ext = os.path.splitext(original_filename)[1].lower()
        content_type = None
        if ext in _IMAGE_EXTS:
            data, ext, content_type = _compress_image(data)
        key = f"uploads/{uuid.uuid4().hex}{ext}"
        blob = _get_bucket().blob(key)
        blob.upload_from_string(data, content_type=content_type)
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
