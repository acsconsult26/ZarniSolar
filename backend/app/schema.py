"""Field schema: VARIABLE fields the client form collects, their defaults,
and the AUTO fields computed from them. Mirrors zarni_ele.md section 4."""

VARIABLE_DEFAULTS = {
    # 4.1 cover & contact
    "site_name": "",
    "site_name_mm": "",
    "proposal_date": None,  # defaults to today at request time
    "contact_phone": "",
    # 4.2 project background & site
    "gps_lat": None,
    "gps_lng": None,
    "generator_capacity_kva": None,
    "min_grid_supply": "",
    # 4.3 load / survey data
    "max_load_kw": None,
    "avg_load_kw": None,
    "min_load_kw": None,
    "voltage_v": 230,
    "power_factor": None,
    "daily_usage_units": None,
    "data_logger_start": None,
    "data_logger_end": None,
    # 4.4 system design block
    "inverter_model": "Sigen 60kW M1 HYB",
    "inverter_qty": None,
    "inverter_unit_kw": 60,
    "battery_module": "Sigenstack 12.0kWh",
    "battery_qty": None,
    "battery_unit_kwh": 12,
    "panel_brand": "Longi",
    "panel_watt": 650,
    "panel_qty": None,
    "backup_hours": 8,
    "design_margin_pct": 20,
    "load_items": "MRTV transmitters, studio equipment, server room",
    # 4.5 power management & savings
    "bill_savings_low_pct": 70,
    "bill_savings_high_pct": 80,
    # 4.6 power source priority
    "solar_start_time": "09:00",
    "solar_end_time": "16:00",
    "solar_load_kw": None,  # falls back to avg_load_kw
    "battery_windows": ["16:00-23:00", "05:00-09:00"],
    "epc_start_time": "23:00",
    "epc_end_time": "05:00",
    "epc_precharge": True,
    "generator_dod_trigger_pct": 20,
    "priority_order": ["Solar", "Battery", "EPC", "Generator"],
    # 4.7 warranty
    "install_warranty_years": 1,
}

AUTO_FIELDS = ("total_inverter_kw", "total_battery_kwh", "total_solar_kwp")


def compute_auto_fields(data: dict) -> dict:
    def num(key, default=0):
        v = data.get(key)
        try:
            return float(v) if v is not None else default
        except (TypeError, ValueError):
            return default

    total_inverter_kw = num("inverter_qty") * num("inverter_unit_kw")
    total_battery_kwh = num("battery_qty") * num("battery_unit_kwh")
    total_solar_kwp = num("panel_qty") * num("panel_watt") / 1000

    def fmt(x):
        return int(x) if float(x).is_integer() else round(x, 2)

    return {
        "total_inverter_kw": fmt(total_inverter_kw),
        "total_battery_kwh": fmt(total_battery_kwh),
        "total_solar_kwp": fmt(total_solar_kwp),
    }


def merged_field_values(data: dict) -> dict:
    """defaults <- user data <- computed AUTO fields, plus a few derived fallbacks."""
    merged = {**VARIABLE_DEFAULTS, **{k: v for k, v in data.items() if v is not None}}
    merged.update(compute_auto_fields(merged))
    if not merged.get("solar_load_kw"):
        merged["solar_load_kw"] = merged.get("avg_load_kw")
    import datetime as _dt

    if not merged.get("proposal_date"):
        merged["proposal_date"] = _dt.date.today().isoformat()
    return merged
