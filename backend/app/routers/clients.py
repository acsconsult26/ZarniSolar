from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Client
from ..auth import get_current_user

router = APIRouter(prefix="/clients", tags=["clients"])


def _serialize(c: Client) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "email": c.email,
        "organization": c.organization,
        "address": c.address,
        "notes": c.notes,
        "project_count": len(c.projects or []),
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("", dependencies=[Depends(get_current_user)])
def list_clients(db: Session = Depends(get_db)):
    return [_serialize(c) for c in db.query(Client).order_by(Client.name).all()]


@router.get("/{client_id}", dependencies=[Depends(get_current_user)])
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).get(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    return _serialize(client)


@router.post("", dependencies=[Depends(get_current_user)])
def create_client(body: dict, db: Session = Depends(get_db)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "name is required")
    client = Client(
        name=name,
        phone=body.get("phone"),
        email=body.get("email"),
        organization=body.get("organization"),
        address=body.get("address"),
        notes=body.get("notes"),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return _serialize(client)


@router.put("/{client_id}", dependencies=[Depends(get_current_user)])
def update_client(client_id: int, body: dict, db: Session = Depends(get_db)):
    client = db.query(Client).get(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    for field in ("name", "phone", "email", "organization", "address", "notes"):
        if field in body:
            setattr(client, field, body[field])
    db.commit()
    db.refresh(client)
    return _serialize(client)


@router.delete("/{client_id}", dependencies=[Depends(get_current_user)])
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).get(client_id)
    if not client:
        raise HTTPException(404, "Client not found")
    if client.projects:
        raise HTTPException(409, "Cannot delete a client with existing projects")
    db.delete(client)
    db.commit()
    return {"ok": True}
