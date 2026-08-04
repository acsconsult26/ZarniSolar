"""Shared admin-editable boilerplate store (key/value JSON), used by both the
admin router and the export pipeline. Each key is its own Firestore document
in the `boilerplate` collection, holding a single `value` field."""
from __future__ import annotations

from .firebase import db
from .services.imagegen import DEFAULT_PROMPT_TEMPLATE

BOILERPLATE_DEFAULTS = {
    "company_info": {
        "branches": [
            {"address": "No (93), 41st Street, Bet: 83rd & 84th Street, Mandalay.", "phone": "02-33440, 68133"},
            {"address": "No. 357/359, Thein Phyu Road, Mingalar Taung Nyunt Tsp, Yangon", "phone": "09-9773033440"},
        ],
        "website": "http://www.zarnielect.com",
        "company_name": "ZARNI AUNG & SONS Co.,Ltd",
        "contact": "09-2031977",
    },
    "warranty_lines": [
        "Sigenergy PV 60M1-HYB - 5 Years Full Warranty (Replacement)",
        "Sigenergy Battery 12kWh, 5+5 Years Warranty (Replacement)",
        "Sigenergy GateWay Home SP - 2 Years Services Warranty",
    ],
    # Named warranty templates (slide 34) -- the proposal form lets the user
    # pick one per project instead of hand-typing warranty lines each time.
    "warranty_templates": [
        {
            "id": "standard",
            "name": "Standard Warranty",
            "lines": [
                "Sigenergy Inverter + Battery - 5 Years Full Warranty (Replacement)",
                "Sigenergy GateWay - 2 Years Service Warranty",
                "Solar Panel - 15 Years Warranty",
                "Installation (ZARNI Electronics) - 1 Year Warranty",
            ],
        },
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
    # Product catalog categories (admin-manageable). key = stored value, label = display.
    "product_categories": [
        {"key": "panel", "label": "Solar Panel"},
        {"key": "inverter", "label": "Inverter"},
        {"key": "battery", "label": "Battery"},
        {"key": "gateway", "label": "Gateway"},
        {"key": "base_main", "label": "Base Main"},
        {"key": "base_sub", "label": "Base SUB"},
        {"key": "battery_controller", "label": "Battery Controller (BC)"},
        {"key": "installation_kit", "label": "Installation Kit"},
        {"key": "solar_support", "label": "Solar Support Structure"},
        {"key": "switch", "label": "Switch"},
        {"key": "main_breaker", "label": "Main / Breaker"},
        {"key": "plug", "label": "Plug"},
        {"key": "accessory", "label": "Other Accessory"},
    ],
    # read-only stat, not user-editable in the UI
    "export_stats": {"total": 0, "by_month": {}},
}

# Keys the admin UI is allowed to write
EDITABLE_KEYS = set(BOILERPLATE_DEFAULTS) - {"export_stats"}


def _doc_ref(key: str):
    return db.collection("boilerplate").document(key)


def get_or_seed(key: str):
    """Returns the stored value for `key`, seeding it from BOILERPLATE_DEFAULTS
    on first read. Kept as a function (not a row object) since Firestore has
    no ORM row to return here -- callers only ever wanted `.value` anyway."""
    snap = _doc_ref(key).get()
    if snap.exists:
        return (snap.to_dict() or {}).get("value")
    default = BOILERPLATE_DEFAULTS.get(key, {})
    _doc_ref(key).set({"value": default})
    return default


def read(key: str):
    return get_or_seed(key)


def write(key: str, value):
    _doc_ref(key).set({"value": value})
    return value


def ensure_category(key: str, label: str) -> None:
    """Adds a product category to an already-seeded `product_categories` doc
    if missing -- BOILERPLATE_DEFAULTS only applies on first-ever read, so a
    live deployment needs this to pick up newly added categories."""
    categories = get_or_seed("product_categories") or []
    if any(c.get("key") == key for c in categories):
        return
    write("product_categories", categories + [{"key": key, "label": label}])
