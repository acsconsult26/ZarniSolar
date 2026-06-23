"""Draw the slide-20 power-source-priority flowchart programmatically
(not AI-generated) from the §4.6 fields, matching the deck's navy/blue palette."""
import io

import graphviz

NAVY = "#0d2c54"
BLUE = "#1f6fb2"
LIGHT = "#eaf2fb"


def render_priority_flowchart(values: dict) -> bytes:
    order = values.get("priority_order") or ["Solar", "Battery", "EPC", "Generator"]
    labels = {
        "Solar": (
            "SOLAR PV\n"
            f"{values.get('solar_start_time')}–{values.get('solar_end_time')}\n"
            f"Serves {values.get('solar_load_kw')} kW load"
        ),
        "Battery": (
            "BATTERY ESS\n"
            + ", ".join(values.get("battery_windows") or [])
            + f"\n{values.get('total_battery_kwh')} kWh capacity"
        ),
        "EPC": (
            "EPC / GRID\n"
            f"{values.get('epc_start_time')}–{values.get('epc_end_time')}\n"
            + ("Battery pre-charge enabled" if values.get("epc_precharge") else "No pre-charge")
        ),
        "Generator": (
            "GENERATOR BACKUP\n"
            f"Triggers at {values.get('generator_dod_trigger_pct')}% DoD"
        ),
    }

    dot = graphviz.Digraph(format="png")
    dot.attr(rankdir="LR", bgcolor="white", splines="curved")
    dot.attr("node", shape="box", style="rounded,filled", fontname="Helvetica",
              fontcolor="white", fillcolor=NAVY, color=NAVY, fontsize="14", margin="0.25,0.18")
    dot.attr("edge", color=BLUE, penwidth="2", arrowsize="0.8")

    for i, key in enumerate(order):
        dot.node(key, labels.get(key, key))
        if i > 0:
            dot.edge(order[i - 1], key)

    png_bytes = dot.pipe()
    return png_bytes
