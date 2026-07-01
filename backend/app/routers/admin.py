from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ReferenceImage
from ..storage import storage
from ..auth import verify_credentials, issue_token, require_admin
from ..boilerplate import BOILERPLATE_DEFAULTS, EDITABLE_KEYS, get_or_seed

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login")
def login(body: dict):
    email = body.get("email", "")
    password = body.get("password", "")
    if not verify_credentials(email, password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": issue_token(email), "email": email}


@router.get("/me", dependencies=[Depends(require_admin)])
def me():
    return {"authenticated": True}

@router.get("/boilerplate/{key}")
def get_boilerplate(key: str, db: Session = Depends(get_db)):
    if key not in BOILERPLATE_DEFAULTS:
        raise HTTPException(404, f"Unknown boilerplate key: {key}")
    return get_or_seed(db, key).value


@router.put("/boilerplate/{key}", dependencies=[Depends(require_admin)])
def put_boilerplate(key: str, value=Body(...), db: Session = Depends(get_db)):
    if key not in EDITABLE_KEYS:
        raise HTTPException(404, f"Unknown or read-only boilerplate key: {key}")
    row = get_or_seed(db, key)
    row.value = value
    db.commit()
    return row.value


@router.get("/reference-images")
def list_reference_images(db: Session = Depends(get_db)):
    rows = db.query(ReferenceImage).order_by(ReferenceImage.sort_order).all()
    return [
        {"id": r.id, "url": storage.url_for(r.file_path), "tag": r.tag, "sort_order": r.sort_order}
        for r in rows
    ]


@router.post("/reference-images")
def upload_reference_image(tag: str = "", file: UploadFile = File(...), db: Session = Depends(get_db)):
    path = storage.save_bytes(file.file.read(), file.filename)
    max_order = db.query(ReferenceImage).count()
    row = ReferenceImage(file_path=path, tag=tag, sort_order=max_order)
    db.add(row)
    db.commit()
    return {"id": row.id, "url": storage.url_for(path)}


@router.delete("/reference-images/{image_id}")
def delete_reference_image(image_id: int, db: Session = Depends(get_db)):
    row = db.query(ReferenceImage).get(image_id)
    if not row:
        raise HTTPException(404, "Not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.put("/reference-images/reorder")
def reorder_reference_images(order: list[int], db: Session = Depends(get_db)):
    for idx, image_id in enumerate(order):
        row = db.query(ReferenceImage).get(image_id)
        if row:
            row.sort_order = idx
    db.commit()
    return {"ok": True}
