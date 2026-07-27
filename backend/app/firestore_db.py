"""Thin Firestore data-access helpers, replacing the old SQLAlchemy models.py.

Firestore has no ORM/relationships, so callers work with plain dicts (each
carrying an `id` key for the document ID) instead of model instances.
Timestamps are stored as Firestore server timestamps and come back as
datetime-like objects with `.isoformat()`, same as the old
`created_at.isoformat()` call sites expected.
"""
from __future__ import annotations

import datetime
from typing import Optional

from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from google.cloud.firestore_v1.base_query import FieldFilter

from .firebase import db


def _doc_to_dict(snapshot) -> Optional[dict]:
    if not snapshot.exists:
        return None
    data = snapshot.to_dict() or {}
    data["id"] = snapshot.id
    return data


def create(collection: str, data: dict) -> dict:
    now = SERVER_TIMESTAMP
    payload = {**data, "created_at": now, "updated_at": now}
    _, ref = db.collection(collection).add(payload)
    return _doc_to_dict(ref.get())


def set_doc(collection: str, doc_id: str, data: dict, merge: bool = False) -> dict:
    """Create/overwrite a document at a caller-chosen ID (boilerplate keys,
    user profiles keyed by Firebase Auth uid) instead of an auto-generated one."""
    ref = db.collection(collection).document(doc_id)
    ref.set(data, merge=merge)
    return _doc_to_dict(ref.get())


def get(collection: str, doc_id: str) -> Optional[dict]:
    if not doc_id:
        return None
    return _doc_to_dict(db.collection(collection).document(doc_id).get())


def list_all(collection: str, order_by: str | None = None, descending: bool = False) -> list[dict]:
    q = db.collection(collection)
    if order_by:
        direction = "DESCENDING" if descending else "ASCENDING"
        q = q.order_by(order_by, direction=direction)
    return [_doc_to_dict(d) for d in q.stream()]


def query_eq(collection: str, field: str, value) -> list[dict]:
    q = db.collection(collection).where(filter=FieldFilter(field, "==", value))
    return [_doc_to_dict(d) for d in q.stream()]


def update(collection: str, doc_id: str, patch: dict) -> Optional[dict]:
    ref = db.collection(collection).document(doc_id)
    if not ref.get().exists:
        return None
    ref.update({**patch, "updated_at": SERVER_TIMESTAMP})
    return _doc_to_dict(ref.get())


def delete(collection: str, doc_id: str) -> None:
    db.collection(collection).document(doc_id).delete()


def increment(collection: str, doc_id: str, field: str, amount: int = 1) -> None:
    from google.cloud.firestore_v1 import Increment
    db.collection(collection).document(doc_id).update({field: Increment(amount)})


# ---- domain-specific helpers ----

def count_projects_for_client(client_id: str) -> int:
    return len(query_eq("projects", "client_id", client_id))


def count_projects_by_client() -> dict[str, int]:
    """Single collection scan instead of one query per client -- avoids
    N+1 reads when serializing the client list."""
    counts: dict[str, int] = {}
    for doc in db.collection("projects").select(["client_id"]).stream():
        client_id = doc.to_dict().get("client_id")
        if client_id:
            counts[client_id] = counts.get(client_id, 0) + 1
    return counts


def list_projects_for_client(client_id: str) -> list[dict]:
    return query_eq("projects", "client_id", client_id)
