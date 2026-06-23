from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Boilerplate, ReferenceImage
from ..storage import storage
from ..services.imagegen import DEFAULT_PROMPT_TEMPLATE

router = APIRouter(prefix="/admin", tags=["admin"])

BOILERPLATE_DEFAULTS = {
    "company_info": {
        "branches": [
            {"address": "No (93), 41st Street, Bet: 83rd & 84th Street, Mandalay.", "phone": "02-33440, 68133"},
            {"address": "No. 357/359, Thein Phyu Road, Mingalar Taung Nyunt Tsp, Yangon", "phone": "09-9773033440"},
        ],
        "website": "http://www.zarnielect.com",
        "company_name": "ZARNI AUNG & SONS TRADING Co.,Ltd",
    },
    "warranty_lines": [
        "Sigenergy PV 60M1-HYB - 5 Years Full Warranty (Replacement)",
        "Sigenergy Battery 12kWh, 5+5 Years Warranty (Replacement)",
        "Sigenergy GateWay Home SP - 2 Years Services Warranty",
    ],
    "closing_statement": "Zarni Electronic မှ တပ်ဆင်ပေးထားသော Sigenergy Brand သည် တပ်ဆင်ထားသည်မှ ယနေ့အချိန်...",
    "reference_projects": [],  # slides 24 & 25, admin-managed: list of {name, system_kw, system_kwp, system_kwh, equipment_lines, image_paths}
    "reference_sites_table": [],  # slide 26 rows: {site_name, spec_string, grid_connection_date}
    "slide19_prompt_template": DEFAULT_PROMPT_TEMPLATE,
    "field_defaults": {
        "inverter_model": "Sigen 60kW M1 HYB",
        "battery_module": "Sigenstack 12.0kWh",
        "panel_brand": "Longi",
        "panel_watt": 650,
        "voltage_v": 230,
        "design_margin_pct": 20,
    },
}


def _get_or_seed(db: Session, key: str):
    row = db.query(Boilerplate).get(key)
    if row is None:
        row = Boilerplate(key=key, value=BOILERPLATE_DEFAULTS.get(key, {}))
        db.add(row)
        db.commit()
    return row


@router.get("/boilerplate/{key}")
def get_boilerplate(key: str, db: Session = Depends(get_db)):
    if key not in BOILERPLATE_DEFAULTS:
        raise HTTPException(404, f"Unknown boilerplate key: {key}")
    return _get_or_seed(db, key).value


@router.put("/boilerplate/{key}")
def put_boilerplate(key: str, value: dict, db: Session = Depends(get_db)):
    if key not in BOILERPLATE_DEFAULTS:
        raise HTTPException(404, f"Unknown boilerplate key: {key}")
    row = _get_or_seed(db, key)
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
