"""Renders the System Logs table as a PDF for the admin's "Export PDF"
button -- same date-range-filtered rows the paginated list view can show,
just all in one document instead of paged."""
from __future__ import annotations

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

import io


def render_logs_pdf(items: list[dict], date_from: str | None, date_to: str | None, action_labels: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        leftMargin=1.5 * cm, rightMargin=1.5 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Zarni Solar — System Logs", styles["Title"]))
    period = f"{date_from or 'earliest'} to {date_to or 'latest'}"
    story.append(Paragraph(f"Period: {period} &nbsp;&nbsp;|&nbsp;&nbsp; {len(items)} entries", styles["Normal"]))
    story.append(Spacer(1, 12))

    header = ["When", "User", "Action", "Detail"]
    rows = [header]
    for r in items:
        when = (r.get("created_at") or "").replace("T", " ").split(".")[0]
        action = action_labels.get(r.get("action"), r.get("action") or "")
        detail = r.get("detail") or "—"
        rows.append([when, r.get("actor_email") or "—", action, detail])

    if len(rows) == 1:
        story.append(Paragraph("No activity recorded in this period.", styles["Normal"]))
    else:
        table = Table(rows, colWidths=[4 * cm, 6 * cm, 4 * cm, 11 * cm], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d2c54")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f7fa")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e6eaf0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(table)

    doc.build(story)
    return buf.getvalue()
