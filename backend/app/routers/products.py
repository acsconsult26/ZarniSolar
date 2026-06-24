from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Product
from ..storage import storage
from ..auth import require_admin

router = APIRouter(prefix="/admin/products", tags=["products"])

CATEGORIES = {"panel", "inverter", "battery"}


def _serialize(p: Product) -> dict:
    return {
        "id": p.id,
        "category": p.category,
        "brand": p.brand,
        "model_name": p.model_name,
        "unit_value": p.unit_value,
        "unit_label": p.unit_label,
        "specs": p.specs or [],
        "warranty_line": p.warranty_line,
        "image_url": storage.url_for(p.image_path) if storage.exists(p.image_path) else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("")
def list_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Listing is open so the proposal form can populate product dropdowns."""
    q = db.query(Product)
    if category:
        q = q.filter(Product.category == category)
    return [_serialize(p) for p in q.order_by(Product.category, Product.brand).all()]


@router.post("", dependencies=[Depends(require_admin)])
def create_product(body: dict, db: Session = Depends(get_db)):
    category = (body.get("category") or "").lower()
    if category not in CATEGORIES:
        raise HTTPException(400, f"category must be one of {sorted(CATEGORIES)}")
    p = Product(
        category=category,
        brand=body.get("brand", ""),
        model_name=body.get("model_name", ""),
        unit_value=body.get("unit_value"),
        unit_label=body.get("unit_label"),
        specs=body.get("specs", []),
        warranty_line=body.get("warranty_line"),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _serialize(p)


@router.put("/{product_id}", dependencies=[Depends(require_admin)])
def update_product(product_id: int, body: dict, db: Session = Depends(get_db)):
    p = db.query(Product).get(product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    for field in ("brand", "model_name", "unit_value", "unit_label", "specs", "warranty_line"):
        if field in body:
            setattr(p, field, body[field])
    if "category" in body and body["category"] in CATEGORIES:
        p.category = body["category"]
    db.commit()
    db.refresh(p)
    return _serialize(p)


@router.delete("/{product_id}", dependencies=[Depends(require_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).get(product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.post("/{product_id}/image", dependencies=[Depends(require_admin)])
def upload_product_image(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    p = db.query(Product).get(product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    p.image_path = storage.save_bytes(file.file.read(), file.filename)
    db.commit()
    return {"image_url": storage.url_for(p.image_path)}
