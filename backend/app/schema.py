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
    # --- Redesigned deck (v2) slides 1-12 ---
    "introduction": "",             # slide 2 rich text (HTML)
    "project_objectives": "",       # slide 4 rich text (HTML)
    "survey_location_name": "",     # slide 5
    "survey_lat": None,
    "survey_lng": None,
    "project_solution": "",         # slide 5 solution name
    "install_area_sqft": None,      # slide 5 area (sq ft)
    "tilt_angle": None,             # slide 5 tilt angle (deg)
    # slide 6 - electricity bill
    "total_epc_cost": None,         # MMK
    "total_epc_units": None,        # units
    # slide 9 - surveying data result
    "duration_hours": None,
    "transformer_kva": None,
    "pv_installation_area_sqft": None,
    "survey_avg_units": None,       # from Excel analysis (confirmed)
    "survey_peak_units": None,
    # slide 10 - power analyzer
    "analyzer_date_range": "",
    # slide 11/12 - optional second survey
    "include_second_survey": False,
    "second_max_load_kw": None,
    "second_duration_hours": None,
    "second_voltage_v": None,
    "second_transformer_kva": None,
    "second_generator_kva": None,
    "second_pv_area_sqft": None,
    "second_power_factor": None,
    "second_avg_units": None,
    "second_peak_units": None,
    "second_analyzer_date_range": "",
    # slides 13-14 - system requirement options (up to 4)
    # [{title, capex, items:[{name, qty, unit}]}]
    "system_options": [],
    # slide 15 - ROI (EPC vs Solar)
    "roi_total_epc_units": None,        # total daily usage (units)
    "roi_epc_with_solar_units": None,   # daily EPC units still used with solar
    "roi_solar_units": None,            # daily solar units
    "roi_avg_unit_cost": None,          # MMK per unit
    "roi_years": 5,                     # 1-10
    # slide 16 - usage comparison chart baseline ("Daily Usage Unit" group)
    "chart_daily_usage": None,
    # slide 17 - payback comparison table (globals; per-option values live in system_options)
    "payback_epc_units_month": None,   # total EPC units per month (same for all options)
    "payback_unit_cost": None,         # MMK per unit
    # slides 23/24 - shade report "Perfect Match" checkboxes
    "west_shade_perfect": False,
    "south_shade_perfect": False,
    # Slide 18 free-text narrative (Burmese); blank = keep template default
    "power_management_text": "",
    # Slide 21 narrative (Burmese); auto-drafted then editable. Blank = keep template default
    "power_priority_text": "",
    # 4.7 warranty
    "install_warranty_years": 1,
}

AUTO_FIELDS = (
    "total_inverter_kw",
    "total_battery_kwh",
    "total_solar_kwp",
    "battery_autonomy_hours",
)


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

    # Battery-only runtime if the grid is down: usable battery energy / average load.
    avg_load = num("avg_load_kw")
    battery_autonomy_hours = (total_battery_kwh / avg_load) if avg_load else 0

    # Slide 6: per-unit electricity cost = total cost / total units
    epc_units = num("total_epc_units")
    per_unit_cost = (num("total_epc_cost") / epc_units) if epc_units else 0

    def fmt(x):
        return int(x) if float(x).is_integer() else round(x, 2)

    return {
        "total_inverter_kw": fmt(total_inverter_kw),
        "total_battery_kwh": fmt(total_battery_kwh),
        "total_solar_kwp": fmt(total_solar_kwp),
        "battery_autonomy_hours": fmt(round(battery_autonomy_hours, 1)),
        "per_unit_cost": round(per_unit_cost, 2),
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
