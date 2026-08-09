"""Audit trail: records who did what, when, in an `activity_log` collection."""
from __future__ import annotations

import datetime

from . import firestore_db as fdb


def log(actor: dict, action: str, target: str | None = None, detail: str | None = None) -> None:
    fdb.create("activity_log", {
        "actor_uid": actor.get("uid"),
        "actor_email": actor.get("email"),
        "action": action,
        "target": target,
        "detail": detail,
    })


def list_page(
    limit: int = 20,
    cursor: datetime.datetime | None = None,
    date_from: datetime.datetime | None = None,
    date_to: datetime.datetime | None = None,
) -> tuple[list[dict], bool]:
    """Newest-first, cursor-paginated -- reads only `limit` (+1) documents
    per call instead of scanning the whole collection."""
    return fdb.query_page(
        "activity_log", "created_at", descending=True, limit=limit,
        cursor=cursor, date_from=date_from, date_to=date_to,
    )


def list_all_in_range(date_from: datetime.datetime | None = None, date_to: datetime.datetime | None = None) -> list[dict]:
    """Unpaginated -- only for an explicit export, where the whole (already
    date-scoped) range is genuinely needed in one response."""
    rows, _ = fdb.query_page(
        "activity_log", "created_at", descending=True, limit=10_000,
        date_from=date_from, date_to=date_to,
    )
    return rows
