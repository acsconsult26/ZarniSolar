from __future__ import annotations
import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body

from .. import firestore_db as fdb
from .. import activity_log
from ..storage import storage
from ..auth import require_admin, get_current_user
from ..boilerplate import BOILERPLATE_DEFAULTS, EDITABLE_KEYS, get_or_seed, write as write_boilerplate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/me")
def me(user=Depends(get_current_user)):
    was_new_login = user.get("last_login_at") is None or (
        (datetime.datetime.utcnow() - user["last_login_at"]).total_seconds() > 60 * 30
        if isinstance(user.get("last_login_at"), datetime.datetime) else True
    )
    fdb.update("users", user["uid"], {"last_login_at": datetime.datetime.utcnow()})
    if was_new_login:
        activity_log.log(user, "login")
    return {"authenticated": True, "email": user.get("email"), "name": user.get("name"), "role": user.get("role")}


@router.post("/logout")
def logout(user=Depends(get_current_user)):
    activity_log.log(user, "logout")
    return {"ok": True}


@router.get("/boilerplate/{key}")
def get_boilerplate(key: str):
    if key not in BOILERPLATE_DEFAULTS:
        raise HTTPException(404, f"Unknown boilerplate key: {key}")
    return get_or_seed(key)


@router.put("/boilerplate/{key}", dependencies=[Depends(require_admin)])
def put_boilerplate(key: str, value=Body(...)):
    if key not in EDITABLE_KEYS:
        raise HTTPException(404, f"Unknown or read-only boilerplate key: {key}")
    return write_boilerplate(key, value)


@router.get("/reference-images")
def list_reference_images():
    rows = fdb.list_all("reference_images", order_by="sort_order")
    return [
        {"id": r["id"], "url": storage.url_for(r["file_path"]), "tag": r.get("tag"), "sort_order": r.get("sort_order", 0)}
        for r in rows
    ]


@router.post("/reference-images")
def upload_reference_image(tag: str = "", file: UploadFile = File(...)):
    path = storage.save_bytes(file.file.read(), file.filename)
    max_order = len(fdb.list_all("reference_images"))
    row = fdb.create("reference_images", {"file_path": path, "tag": tag, "sort_order": max_order})
    return {"id": row["id"], "url": storage.url_for(path)}


@router.delete("/reference-images/{image_id}")
def delete_reference_image(image_id: str):
    if not fdb.get("reference_images", image_id):
        raise HTTPException(404, "Not found")
    fdb.delete("reference_images", image_id)
    return {"ok": True}


@router.put("/reference-images/reorder")
def reorder_reference_images(order: list[str]):
    for idx, image_id in enumerate(order):
        if fdb.get("reference_images", image_id):
            fdb.update("reference_images", image_id, {"sort_order": idx})
    return {"ok": True}
