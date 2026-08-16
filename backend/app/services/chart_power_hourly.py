"""Render the Power Analyzer hourly-load bar chart with matplotlib.
Same transparent/dark-deck styling as chart_usage.py."""
from __future__ import annotations

import io

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BAR = "#2E8BE6"
PEAK = "#F5C518"
TEXT = "#FFFFFF"
LABEL = "#C9D4E2"


def render_hourly_chart(hourly: list[dict]) -> bytes:
    """hourly: list of {hour, avg_kw, peak_kw}, chronological. Bars show the
    hourly average; the peak line/markers show the true max sample within
    each hour -- plotting avg alone made the chart's tallest point
    understate the analyzer's real peak_kw stat, since an hour's average is
    always <= its max."""
    labels = [h["hour"] for h in hourly]
    avg_values = [float(h.get("avg_kw") or 0) for h in hourly]
    peak_values = [float(h.get("peak_kw") if h.get("peak_kw") is not None else h.get("avg_kw") or 0) for h in hourly]
    n = max(len(labels), 1)

    fig, ax = plt.subplots(figsize=(max(11.5, n * 0.3), 5.2), dpi=150)
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)

    x = range(len(labels))
    ax.bar(x, avg_values, color=BAR, width=0.7, label="Avg kW")
    ax.plot(x, peak_values, color=PEAK, marker="o", markersize=4, linewidth=1.6, label="Peak kW")

    ax.set_xticks(x)
    ax.set_xticklabels(labels, color=TEXT, fontsize=8, rotation=60, ha="right")
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.get_yaxis().set_visible(False)
    top = (max(peak_values + avg_values) if (peak_values or avg_values) else 1) * 1.25
    ax.set_ylim(0, top)

    for i, v in enumerate(avg_values):
        ax.annotate(f"{v:.0f}", (i, v), textcoords="offset points", xytext=(0, 4),
                    ha="center", color=LABEL, fontsize=7)
    for i, v in enumerate(peak_values):
        ax.annotate(f"{v:.0f}", (i, v), textcoords="offset points", xytext=(0, 8),
                    ha="center", color=PEAK, fontsize=7, fontweight="bold")

    leg = ax.legend(loc="upper center", ncol=2, frameon=False, bbox_to_anchor=(0.5, 1.08), fontsize=10)
    for t in leg.get_texts():
        t.set_color(TEXT)

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", transparent=True, bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()
