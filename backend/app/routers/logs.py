import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from .. import activity_log
from ..auth import require_admin

router = APIRouter(prefix="/admin/logs", tags=["logs"])

LOG_ACTION_LABELS = {
    "login": "Logged in",
    "logout": "Logged out",
    "client.create": "Created client",
    "client.update": "Updated client",
    "client.delete": "Deleted client",
    "product.create": "Added product",
    "product.update": "Updated product",
    "product.delete": "Deleted product",
    "user.create": "Created user",
    "user.update": "Updated user",
    "user.delete": "Deleted user",
}


def _serialize(row: dict) -> dict:
    return {
        "id": row["id"],
        "actor_email": row.get("actor_email"),
        "action": row.get("action"),
        "target": row.get("target"),
        "detail": row.get("detail"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


def _parse_date(value: str | None, *, end_of_day: bool = False) -> datetime.datetime | None:
    """Parses a plain "YYYY-MM-DD" (from an HTML <input type=date>) into a
    UTC-aware datetime at the start (00:00:00) or end (23:59:59) of that day
    -- Firestore range filters require timezone-aware datetimes to match the
    stored server-timestamp values."""
    if not value:
        return None
    try:
        d = datetime.date.fromisoformat(value)
    except ValueError:
        raise HTTPException(400, f"Invalid date: {value!r} (expected YYYY-MM-DD)")
    t = datetime.time(23, 59, 59, 999999) if end_of_day else datetime.time(0, 0, 0)
    return datetime.datetime.combine(d, t, tzinfo=datetime.timezone.utc)


def _parse_cursor(value: str | None) -> datetime.datetime | None:
    if not value:
        return None
    try:
        return datetime.datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(400, "Invalid cursor")


@router.get("", dependencies=[Depends(require_admin)])
def list_logs(limit: int = 20, cursor: str | None = None, from_: str | None = Query(None, alias="from"), to: str | None = None):
    limit = max(1, min(limit, 100))
    rows, has_more = activity_log.list_page(
        limit=limit,
        cursor=_parse_cursor(cursor),
        date_from=_parse_date(from_),
        date_to=_parse_date(to, end_of_day=True),
    )
    items = [_serialize(r) for r in rows]
    next_cursor = items[-1]["created_at"] if (items and has_more) else None
    return {"items": items, "has_more": has_more, "next_cursor": next_cursor}


@router.get("/export.pdf", dependencies=[Depends(require_admin)])
def export_logs_pdf(from_: str | None = Query(None, alias="from"), to: str | None = None):
    from ..services.logs_pdf import render_logs_pdf

    rows = activity_log.list_all_in_range(
        date_from=_parse_date(from_),
        date_to=_parse_date(to, end_of_day=True),
    )
    items = [_serialize(r) for r in rows]
    pdf_bytes = render_logs_pdf(items, from_, to, LOG_ACTION_LABELS)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="system-logs.pdf"'},
    )
