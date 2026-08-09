"""Parses a power-quality analyzer trend-log export (CSV or XLSX) and
computes summary stats (kW, PF, THD) plus an hourly kW load profile for the
Power Analyzer step's chart.

Tolerant of the analyzer's messy two-row header layout: a group-name row
("Urms, Uthd, ..., W, VAR, VA, PF, cosF, tanF, ...", one label per column
group with blanks for the rest of the group's columns) directly above a
per-phase sub-header row ("Time, L1, L2, L3, ..."). Real power (W) columns
are per-phase kW; summed they give total kW for that sample.
"""
from __future__ import annotations

import csv
import io
import re
from datetime import datetime

import openpyxl

_NUM_RE = re.compile(r"^-?\d+(\.\d+)?")
# This analyzer's export uses YY/MM/DD (not DD/MM/YY) -- e.g. "26/05/22" is
# 2026-05-22, confirmed against the file's own "Start time"/"Stop time"
# metadata (a 2-day span, matching the 20s record period × sample count).
_TIME_FORMATS = ("%y/%m/%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S")


def _num(cell) -> float | None:
    if cell is None:
        return None
    if isinstance(cell, (int, float)):
        return float(cell)
    s = str(cell).strip()
    if not s:
        return None
    m = _NUM_RE.match(s)
    if not m:
        return None
    try:
        return float(m.group(0))
    except ValueError:
        return None


def _num_power(cell) -> float | None:
    """Like _num, but normalizes W/VAR/VA-suffixed cells to kW/kVAR/kVA --
    this analyzer auto-switches a phase's unit between W and kW depending on
    magnitude, so raw numeric literals aren't directly comparable/summable
    without checking which unit each cell is actually in."""
    val = _num(cell)
    if val is None:
        return None
    s = str(cell).strip().lower()
    if s.endswith(("kw", "kvar", "kva")):
        return val
    if s.endswith(("w", "var", "va")):
        return val / 1000.0
    return val


def _parse_time(cell) -> datetime | None:
    if cell is None:
        return None
    if isinstance(cell, datetime):
        return cell
    s = str(cell).strip()
    if not s:
        return None
    for fmt in _TIME_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _read_rows(file_bytes: bytes, filename: str) -> list[list]:
    lower = (filename or "").lower()
    if lower.endswith((".xlsx", ".xls")):
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
        ws = wb.active
        return [list(r) for r in ws.iter_rows(values_only=True)]
    text = file_bytes.decode("utf-8-sig", errors="ignore")
    return list(csv.reader(io.StringIO(text)))


def analyze_power_log(file_bytes: bytes, filename: str = "") -> dict:
    rows = _read_rows(file_bytes, filename)

    time_row_idx = None
    for i, row in enumerate(rows):
        if row and str(row[0] or "").strip().lower() == "time":
            time_row_idx = i
            break
    if not time_row_idx:
        raise ValueError("Couldn't find the analyzer's header row (expected a row starting with 'Time')")

    group_row = rows[time_row_idx - 1]
    sub_row = rows[time_row_idx]
    width = max(len(group_row), len(sub_row))

    # The group-name cell (e.g. "W") is centered over its group's L1/L2/L3(/
    # total) sub-columns from a merged Excel cell, so it doesn't sit in the
    # group's first column -- forward-filling from that position mis-assigns
    # a column to the next group. Instead, segment columns using blank
    # separator columns (where BOTH header rows are empty) as boundaries,
    # then look anywhere inside a segment for its name.
    def _blank(cell) -> bool:
        return cell is None or str(cell).strip() == ""

    groups: dict[str, list[int]] = {}
    seg_cols: list[int] = []
    seg_name: str | None = None
    for i in range(width):
        g = group_row[i] if i < len(group_row) else None
        s = sub_row[i] if i < len(sub_row) else None
        if _blank(g) and _blank(s):
            if seg_cols and seg_name:
                groups.setdefault(seg_name, []).extend(seg_cols)
            seg_cols, seg_name = [], None
        else:
            seg_cols.append(i)
            if not _blank(g):
                seg_name = str(g).strip()
    if seg_cols and seg_name:
        groups.setdefault(seg_name, []).extend(seg_cols)

    # Restrict to the actual L1/L2/L3 sub-columns -- some groups (W, VAR, VA)
    # carry an extra 4th "total" sub-column in the same segment, which must
    # NOT be included when we derive the total ourselves as L1+L2+L3.
    def phase_cols_for(group_name: str) -> list[int]:
        return [
            i for i in groups.get(group_name, [])
            if i < len(sub_row) and str(sub_row[i] or "").strip().upper() in ("L1", "L2", "L3")
        ]

    w_cols = phase_cols_for("W")
    pf_cols = phase_cols_for("PF")
    uthd_cols = phase_cols_for("Uthd")
    athd_cols = phase_cols_for("Athd")
    if not w_cols:
        raise ValueError("No real-power (W) column found -- is this a power analyzer export?")

    times: list[datetime] = []
    kw_series: list[float] = []
    pf_series: list[float | None] = []
    thd_v_series: list[float | None] = []
    thd_i_series: list[float | None] = []

    for row in rows[time_row_idx + 1:]:
        t = _parse_time(row[0] if row else None)
        if t is None:
            continue
        w_vals = [v for v in (_num_power(row[i]) for i in w_cols if i < len(row)) if v is not None]
        if not w_vals:
            continue
        kw = sum(w_vals)

        pf_vals = [v for v in (_num(row[i]) for i in pf_cols if i < len(row)) if v is not None]
        uthd_vals = [v for v in (_num(row[i]) for i in uthd_cols if i < len(row)) if v is not None]
        athd_vals = [v for v in (_num(row[i]) for i in athd_cols if i < len(row)) if v is not None]

        times.append(t)
        kw_series.append(kw)
        pf_series.append(sum(pf_vals) / len(pf_vals) if pf_vals else None)
        thd_v_series.append(sum(uthd_vals) / len(uthd_vals) if uthd_vals else None)
        thd_i_series.append(sum(athd_vals) / len(athd_vals) if athd_vals else None)

    if not kw_series:
        raise ValueError("No readable data rows found in the file")

    def _avg(vals):
        v = [x for x in vals if x is not None]
        return round(sum(v) / len(v), 2) if v else None

    def _peak(vals):
        v = [x for x in vals if x is not None]
        return round(max(v), 2) if v else None

    buckets: dict[datetime, list[float]] = {}
    for t, kw in zip(times, kw_series):
        bucket = t.replace(minute=0, second=0, microsecond=0)
        buckets.setdefault(bucket, []).append(kw)
    hourly = [
        {"hour": bucket.strftime("%d %b %H:%M"), "avg_kw": round(sum(vals) / len(vals), 2)}
        for bucket, vals in sorted(buckets.items())
    ]

    date_range = f"{times[0].strftime('%d.%b.%y')} – {times[-1].strftime('%d.%b.%y')}"

    # Daily energy consumption: Unit (kWh) = Σ (Watt_of_row × seconds_between_rows) / (3600 × 1000).
    # The analyzer logs at a fixed interval, so the seconds-between-rows term
    # only needs to be measured once, from the first two rows -- not
    # recomputed per row -- then applied uniformly to every sample.
    sample_interval_seconds = (times[1] - times[0]).total_seconds() if len(times) > 1 else 0.0
    # kw_series is already Watts/1000 (see _num_power), so
    # Σ(W × Δt)/(3600×1000) == Σ(kW) × Δt/3600.
    total_kwh = sum(kw_series) * sample_interval_seconds / 3600
    span_days = (times[-1] - times[0]).total_seconds() / 86400
    avg_daily_kwh = round(total_kwh / span_days, 2) if span_days > 0 else round(total_kwh, 2)

    return {
        "sample_count": len(kw_series),
        "start_time": times[0].isoformat(),
        "end_time": times[-1].isoformat(),
        "date_range": date_range,
        "avg_kw": _avg(kw_series),
        "peak_kw": _peak(kw_series),
        "avg_pf": _avg(pf_series),
        "peak_pf": _peak(pf_series),
        "avg_thd_voltage": _avg(thd_v_series),
        "peak_thd_voltage": _peak(thd_v_series),
        "avg_thd_current": _avg(thd_i_series),
        "peak_thd_current": _peak(thd_i_series),
        "sample_interval_seconds": round(sample_interval_seconds, 1),
        "total_kwh": round(total_kwh, 2),
        "avg_daily_kwh": avg_daily_kwh,
        "hourly": hourly,
    }
