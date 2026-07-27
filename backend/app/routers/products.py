from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from .. import firestore_db as fdb
from .. import activity_log
from ..storage import storage
from ..auth import require_admin
from .. import boilerplate as bp

router = APIRouter(prefix="/admin/products", tags=["products"])


def _allowed_categories() -> set:
    cats = bp.read("product_categories") or []
    return {c.get("key") for c in cats if c.get("key")}


def _normalize_specs(specs):
    """Accept either a list of dicts {label,value,unit} or legacy list of
    strings; always return a list of dicts."""
    out = []
    for s in specs or []:
        if isinstance(s, dict):
            label = (s.get("label") or "").strip()
            if not label:
                continue
            out.append({
                "label": label,
                "value": (s.get("value") or "").strip(),
                "unit": (s.get("unit") or "").strip(),
            })
        elif isinstance(s, str) and s.strip():
            out.append({"label": s.strip(), "value": "", "unit": ""})
    return out


def _serialize(p: dict) -> dict:
    return {
        "id": p["id"],
        "category": p.get("category"),
        "brand": p.get("brand"),
        "model_name": p.get("model_name"),
        "unit_value": p.get("unit_value"),
        "unit_label": p.get("unit_label"),
        "spec_title": p.get("spec_title"),
        "specs": p.get("specs") or [],
        "warranty_line": p.get("warranty_line"),
        "image_url": storage.url_for(p["image_path"]) if storage.exists(p.get("image_path")) else None,
        "created_at": p["created_at"].isoformat() if p.get("created_at") else None,
    }


@router.get("")
def list_products(category: Optional[str] = None):
    """Listing is open so the proposal form can populate product dropdowns."""
    rows = fdb.query_eq("products", "category", category) if category else fdb.list_all("products")
    rows.sort(key=lambda p: (p.get("category") or "", p.get("brand") or ""))
    return [_serialize(p) for p in rows]


@router.post("", dependencies=[Depends(require_admin)])
def create_product(body: dict, user=Depends(require_admin)):
    category = (body.get("category") or "").strip()
    if category not in _allowed_categories():
        raise HTTPException(400, f"Unknown category '{category}'. Add it in Admin first.")
    p = fdb.create("products", {
        "category": category,
        "brand": body.get("brand", ""),
        "model_name": body.get("model_name", ""),
        "unit_value": body.get("unit_value"),
        "unit_label": body.get("unit_label"),
        "spec_title": body.get("spec_title"),
        "specs": _normalize_specs(body.get("specs", [])),
        "warranty_line": body.get("warranty_line"),
        "image_path": None,
    })
    activity_log.log(user, "product.create", target=p["id"], detail=f"{p.get('brand')} {p.get('model_name')}".strip())
    return _serialize(p)


@router.put("/{product_id}", dependencies=[Depends(require_admin)])
def update_product(product_id: str, body: dict, user=Depends(require_admin)):
    patch = {}
    for field in ("brand", "model_name", "unit_value", "unit_label", "spec_title", "warranty_line"):
        if field in body:
            patch[field] = body[field]
    if "specs" in body:
        patch["specs"] = _normalize_specs(body["specs"])
    if "category" in body and body["category"] in _allowed_categories():
        patch["category"] = body["category"]
    p = fdb.update("products", product_id, patch)
    if not p:
        raise HTTPException(404, "Product not found")
    activity_log.log(user, "product.update", target=product_id, detail=f"{p.get('brand')} {p.get('model_name')}".strip())
    return _serialize(p)


@router.delete("/{product_id}", dependencies=[Depends(require_admin)])
def delete_product(product_id: str, user=Depends(require_admin)):
    p = fdb.get("products", product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    fdb.delete("products", product_id)
    activity_log.log(user, "product.delete", target=product_id, detail=f"{p.get('brand')} {p.get('model_name')}".strip())
    return {"ok": True}


@router.post("/{product_id}/image", dependencies=[Depends(require_admin)])
def upload_product_image(product_id: str, file: UploadFile = File(...)):
    if not fdb.get("products", product_id):
        raise HTTPException(404, "Product not found")
    image_path = storage.save_bytes(file.file.read(), file.filename)
    fdb.update("products", product_id, {"image_path": image_path})
    return {"image_url": storage.url_for(image_path)}
