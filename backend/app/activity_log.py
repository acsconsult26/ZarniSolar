"""Audit trail: records who did what, when, in an `activity_log` collection."""
from __future__ import annotations

from . import firestore_db as fdb


def log(actor: dict, action: str, target: str | None = None, detail: str | None = None) -> None:
    fdb.create("activity_log", {
        "actor_uid": actor.get("uid"),
        "actor_email": actor.get("email"),
        "action": action,
        "target": target,
        "detail": detail,
    })


def list_recent(limit: int = 200) -> list[dict]:
    rows = fdb.list_all("activity_log", order_by="created_at", descending=True)
    return rows[:limit]
