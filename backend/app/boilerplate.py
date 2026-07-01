"""Shared admin-editable boilerplate store (key/value JSON), used by both the
admin router and the export pipeline."""
from __future__ import annotations

from sqlalchemy.orm import Session

from .models import Boilerplate
from .services.imagegen import DEFAULT_PROMPT_TEMPLATE

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
    "reference_projects": [],
    "reference_sites_table": [],
    "slide19_prompt_template": DEFAULT_PROMPT_TEMPLATE,
    "field_defaults": {
        "inverter_model": "Sigen 60kW M1 HYB",
        "battery_module": "Sigenstack 12.0kWh",
        "panel_brand": "Longi",
        "panel_watt": 650,
        "voltage_v": 230,
        "design_margin_pct": 20,
    },
    # read-only stat, not user-editable in the UI
    "export_stats": {"total": 0, "by_month": {}},
}

# Keys the admin UI is allowed to write
EDITABLE_KEYS = set(BOILERPLATE_DEFAULTS) - {"export_stats"}


def get_or_seed(db: Session, key: str) -> Boilerplate:
    row = db.query(Boilerplate).get(key)
    if row is None:
        row = Boilerplate(key=key, value=BOILERPLATE_DEFAULTS.get(key, {}))
        db.add(row)
        db.commit()
    return row


def read(db: Session, key: str):
    return get_or_seed(db, key).value


def write(db: Session, key: str, value):
    row = get_or_seed(db, key)
    row.value = value
    db.commit()
    return row.value
