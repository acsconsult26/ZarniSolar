"""Render the slide-16 grouped bar chart (Load / Grid / Solar per option)
with matplotlib. Transparent background + light text so it sits on the dark
deck; colors match the reference image."""
from __future__ import annotations

import io

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

COL_LOAD = "#E0912F"   # orange
COL_GRID = "#7C8A4E"   # olive green (EPC)
COL_SOLAR = "#79B4A6"  # teal
TEXT = "#FFFFFF"
LABEL = "#C9D4E2"


def render_usage_chart(groups) -> bytes:
    """groups: list of {label, load, grid, solar}"""
    labels = [g["label"] for g in groups]
    load = [float(g.get("load") or 0) for g in groups]
    grid = [float(g.get("grid") or 0) for g in groups]
    solar = [float(g.get("solar") or 0) for g in groups]

    x = np.arange(len(labels))
    w = 0.26
    fig, ax = plt.subplots(figsize=(11.5, 5.2), dpi=150)
    fig.patch.set_alpha(0)
    ax.patch.set_alpha(0)

    bars = [
        ax.bar(x - w, load, w, color=COL_LOAD, label="Load"),
        ax.bar(x, grid, w, color=COL_GRID, label="Grid"),
        ax.bar(x + w, solar, w, color=COL_SOLAR, label="Solar"),
    ]
    for bset in bars:
        for r in bset:
            h = r.get_height()
            ax.annotate(f"{int(round(h))}", (r.get_x() + r.get_width() / 2, h),
                        textcoords="offset points", xytext=(0, 5), ha="center",
                        color=LABEL, fontsize=11)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, color=TEXT, fontsize=12)
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.get_yaxis().set_visible(False)
    top = max(load + grid + solar + [1]) * 1.22
    ax.set_ylim(0, top)

    leg = ax.legend(loc="upper center", ncol=3, frameon=False, bbox_to_anchor=(0.5, 1.14), fontsize=12)
    for t in leg.get_texts():
        t.set_color(TEXT)

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", transparent=True, bbox_inches="tight")
    plt.close(fig)
    return buf.getvalue()
