from fastapi import APIRouter, Depends, HTTPException

from .. import firestore_db as fdb
from ..auth import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])


def _serialize(c: dict, project_count: int | None = None) -> dict:
    return {
        "id": c["id"],
        "name": c.get("name"),
        "phone": c.get("phone"),
        "email": c.get("email"),
        "organization": c.get("organization"),
        "address": c.get("address"),
        "notes": c.get("notes"),
        "project_count": project_count if project_count is not None else fdb.count_projects_for_client(c["id"]),
        "created_at": c["created_at"].isoformat() if c.get("created_at") else None,
        "updated_at": c["updated_at"].isoformat() if c.get("updated_at") else None,
    }


@router.get("", dependencies=[Depends(get_current_user)])
def list_clients():
    rows = fdb.list_all("clients", order_by="name")
    counts = fdb.count_projects_by_client()
    return [_serialize(c, counts.get(c["id"], 0)) for c in rows]


@router.get("/{client_id}", dependencies=[Depends(get_current_user)])
def get_client(client_id: str):
    client = fdb.get("clients", client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    return _serialize(client)


@router.post("", dependencies=[Depends(get_current_user)])
def create_client(body: dict):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "name is required")
    client = fdb.create("clients", {
        "name": name,
        "phone": body.get("phone"),
        "email": body.get("email"),
        "organization": body.get("organization"),
        "address": body.get("address"),
        "notes": body.get("notes"),
    })
    return _serialize(client)


@router.put("/{client_id}", dependencies=[Depends(get_current_user)])
def update_client(client_id: str, body: dict):
    patch = {k: body[k] for k in ("name", "phone", "email", "organization", "address", "notes") if k in body}
    client = fdb.update("clients", client_id, patch)
    if not client:
        raise HTTPException(404, "Client not found")
    return _serialize(client)


@router.delete("/{client_id}", dependencies=[Depends(get_current_user)])
def delete_client(client_id: str):
    client = fdb.get("clients", client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    if fdb.count_projects_for_client(client_id) > 0:
        raise HTTPException(409, "Cannot delete a client with existing projects")
    fdb.delete("clients", client_id)
    return {"ok": True}
