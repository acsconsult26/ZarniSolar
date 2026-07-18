from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body
from sqlalchemy.orm import Session

import datetime

from ..db import get_db
from ..models import ReferenceImage
from ..storage import storage
from ..auth import authenticate, issue_token, require_admin, get_current_user
from ..boilerplate import BOILERPLATE_DEFAULTS, EDITABLE_KEYS, get_or_seed

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login")
def login(body: dict, db: Session = Depends(get_db)):
    email = body.get("email", "")
    password = body.get("password", "")
    user = authenticate(db, email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user.last_login_at = datetime.datetime.utcnow()
    db.commit()
    return {"token": issue_token(user), "email": user.email, "name": user.name, "role": user.role}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"authenticated": True, "email": user.email, "name": user.name, "role": user.role}

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
