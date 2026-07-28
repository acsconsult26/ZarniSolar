"""Render the Power Analyzer hourly-load bar chart with matplotlib.
Same transparent/dark-deck styling as chart_usage.py."""
from __future__ import annotations

import io

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BAR = "#2E8BE6"
TEXT = "#FFFFFF"
LABEL = "#C9D4E2"


def render_hourly_chart(hourly: list[dict]) -> bytes:
    """hourly: list of {hour, avg_kw}, chronological."""
    labels = [h["hour"] for h in hourly]
    values = [float(h.get("avg_kw") or 0) for h in hourly]
    n = max(len(labels), 1)

    fig, ax = plt.subplots(figsize=(max(11.5, n * 0.3), 5.2), dpi=150)
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)

    ax.bar(range(len(labels)), values, color=BAR, width=0.7)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, color=TEXT, fontsize=8, rotation=60, ha="right")
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.get_yaxis().set_visible(False)
    top = (max(values) if values else 1) * 1.2
    ax.set_ylim(0, top)

    for i, v in enumerate(values):
        ax.annotate(f"{v:.0f}", (i, v), textcoords="offset points", xytext=(0, 4),
                    ha="center", color=LABEL, fontsize=7)

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", transparent=True, bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()
