"""Analyze an uploaded electricity-consumption spreadsheet (hourly units) and
return average + peak consumption. Tolerant of arbitrary layouts: it finds the
numeric column most likely to be the consumption series."""
from __future__ import annotations

import io

import openpyxl

CONSUMPTION_HINTS = ("unit", "kwh", "kw", "consum", "load", "usage", "energy", "power")


def _numeric(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", "")
        try:
            return float(s)
        except ValueError:
            return None
    return None


def analyze_consumption(file_bytes: bytes) -> dict:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise ValueError("Spreadsheet is empty")

    # Detect a header row (first row with any non-numeric text cells)
    header = rows[0]
    header_is_text = any(isinstance(c, str) and c.strip() for c in header)
    data_rows = rows[1:] if header_is_text else rows

    ncols = max((len(r) for r in rows), default=0)

    # Score each column: prefer header hint, then count of numeric values
    best_col = None
    best_score = -1
    for col in range(ncols):
        values = [_numeric(r[col]) for r in data_rows if col < len(r)]
        nums = [v for v in values if v is not None]
        if not nums:
            continue
        score = len(nums)
        if header_is_text and col < len(header) and isinstance(header[col], str):
            if any(h in header[col].lower() for h in CONSUMPTION_HINTS):
                score += 100000  # strongly prefer a hinted column
        if score > best_score:
            best_score = score
            best_col = col

    if best_col is None:
        raise ValueError("No numeric consumption column found in the spreadsheet")

    series = [v for v in (_numeric(r[best_col]) for r in data_rows if best_col < len(r)) if v is not None]
    if not series:
        raise ValueError("No numeric values found")

    col_name = None
    if header_is_text and best_col < len(header) and isinstance(header[best_col], str):
        col_name = header[best_col].strip()

    average = sum(series) / len(series)
    peak = max(series)
    return {
        "average_units": round(average, 2),
        "peak_units": round(peak, 2),
        "sample_count": len(series),
        "column": col_name,
    }
