from fastapi import APIRouter, Depends

from .. import activity_log
from ..auth import require_admin

router = APIRouter(prefix="/admin/logs", tags=["logs"])


def _serialize(row: dict) -> dict:
    return {
        "id": row["id"],
        "actor_email": row.get("actor_email"),
        "action": row.get("action"),
        "target": row.get("target"),
        "detail": row.get("detail"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


@router.get("", dependencies=[Depends(require_admin)])
def list_logs():
    return [_serialize(r) for r in activity_log.list_recent()]
