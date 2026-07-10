"""Redesigned proposal deck (v2): dark-themed, built from scratch from form
data. Currently builds slides 1-12; later sections will be added incrementally.
"""
from __future__ import annotations

from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Inches, Pt

from ..schema import merged_field_values
from . import deck_theme as T
from .richtext import parse_html

CONTENTS_ITEMS = [
    "Project Objectives",
    "Surveying Data (Project Background)",
    "System Requirement",
    "Technical Proposal",
    "Product Specifications",
    "Technical Advantages",
    "Solar Panels Support Mounting Structure",
    "Warranty",
]


def _fmt(v, suffix=""):
    if v is None or v == "":
        return "—"
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return f"{v}{suffix}"


def _money(v):
    if v is None or v == "":
        return "—"
    try:
        return f"{float(v):,.0f}"
    except (TypeError, ValueError):
        return str(v)


class _Imgs:
    def __init__(self, uploads, storage):
        self.uploads = uploads or {}
        self.storage = storage

    def get(self, field):
        path = self.uploads.get(field)
        if path and self.storage.exists(path):
            return self.storage.read_bytes(path)
        return None


def export_project_v2(project, storage, company_info=None) -> bytes:
    data = project.data or {}
    v = merged_field_values(data)
    ci = company_info or {}
    company_name = ci.get("company_name") or "ZARNI AUNG & SONS Co.,Ltd"
    contact = ci.get("contact") or "09-2031977"
    client = v.get("site_name") or "Client"
    imgs = _Imgs(project.uploads, storage)

    prs = T.new_deck()
    W = prs.slide_width

    _slide1_cover(prs, client, v.get("proposal_date"), company_name, contact)
    _slide2_intro(prs, v.get("introduction"), company_name)
    _slide3_contents(prs, company_name)
    _slide4_objectives(prs, v.get("project_objectives"), company_name)
    _slide5_surveying(prs, v, imgs, company_name)
    _slide6_bill(prs, client, v, imgs, company_name)
    _slide7_survey_photos(prs, imgs, company_name)
    _slide8_solar_frame(prs, imgs, company_name)
    _slide9_data_result(prs, client, v, imgs, company_name, page=9,
                        prefix="", title=f"Surveying Data Result for {client}")
    _slide10_analyzer(prs, client, v.get("analyzer_date_range"), imgs.get("analyzer_image"),
                      company_name, page=10)

    if data.get("include_second_survey"):
        _slide9_data_result(prs, client, v, imgs, company_name, page=11, prefix="second_",
                            title="Surveying Data Result (Other Meters)")
        _slide10_analyzer(prs, client, v.get("second_analyzer_date_range"),
                          imgs.get("second_analyzer_image"), company_name, page=12)

    import io
    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()


# ---------------- individual slides ----------------

def _slide1_cover(prs, client, date, company_name, contact):
    slide = T.add_slide(prs, page=None, company_name=company_name)
    W, H = prs.slide_width, prs.slide_height
    # accent block
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.9), Inches(2.35), Inches(0.12), Inches(2.0))
    T._solid(bar, T.GOLD)
    T.add_text(slide, "BUSINESS ENERGY SOLUTION", Inches(1.15), Inches(2.3), W - Inches(2), Inches(0.7),
               size=34, bold=True, color=T.WHITE)
    T.add_text(slide, f"For  {client}", Inches(1.15), Inches(3.05), W - Inches(2), Inches(0.8),
               size=30, bold=True, color=T.ACCENT)
    T.add_text(slide, "Technical Proposal", Inches(1.18), Inches(3.95), W - Inches(2), Inches(0.5),
               size=18, italic=True, color=T.MUTED)
    T.add_text(slide, company_name, Inches(1.18), Inches(4.4), W - Inches(2), Inches(0.5),
               size=16, bold=True, color=T.WHITE)
    # date + contact bottom
    T.add_text(slide, f"Date – {date or ''}", Inches(0.9), H - Inches(1.1), Inches(5), Inches(0.4),
               size=13, color=T.MUTED)
    T.add_text(slide, f"Contact To; {contact}", W - Inches(5.5), H - Inches(1.1), Inches(4.6), Inches(0.4),
               size=13, color=T.MUTED, align=PP_ALIGN.RIGHT)


def _slide2_intro(prs, introduction, company_name):
    slide = T.add_slide(prs, page=2, company_name=company_name)
    top = T.add_title(slide, prs, "Introduction")
    blocks = parse_html(introduction) or [{"type": "p", "items": [[{"text": "", "bold": False, "italic": False}]]}]
    T.add_richtext(slide, blocks, Inches(0.9), top, prs.slide_width - Inches(1.8),
                   prs.slide_height - top - Inches(0.8), size=16)


def _slide3_contents(prs, company_name):
    slide = T.add_slide(prs, page=3, company_name=company_name)
    top = T.add_title(slide, prs, "CONTENTS")
    box = slide.shapes.add_textbox(Inches(1.2), top, prs.slide_width - Inches(2.4), prs.slide_height - top - Inches(0.8))
    tf = box.text_frame
    T._no_autosize(tf)
    for i, item in enumerate(CONTENTS_ITEMS):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(8)
        r1 = p.add_run(); T._apply_run(r1, f"{i + 1}.  ", size=20, bold=True, italic=False, color=T.GOLD, font=T.FONT)
        r2 = p.add_run(); T._apply_run(r2, item, size=20, bold=False, italic=False, color=T.WHITE, font=T.FONT)


def _slide4_objectives(prs, objectives, company_name):
    slide = T.add_slide(prs, page=4, company_name=company_name)
    top = T.add_title(slide, prs, "Project Objectives  –  ရည်ရွယ်ချက်များ")
    blocks = parse_html(objectives) or [{"type": "p", "items": [[{"text": "", "bold": False, "italic": False}]]}]
    T.add_richtext(slide, blocks, Inches(0.9), top, prs.slide_width - Inches(1.8),
                   prs.slide_height - top - Inches(0.8), size=15)


def _slide5_surveying(prs, v, imgs, company_name):
    slide = T.add_slide(prs, page=5, company_name=company_name)
    top = T.add_title(slide, prs, "Surveying Data  –  Project Background")
    lat, lng = v.get("survey_lat"), v.get("survey_lng")
    loc = f"{lat}, {lng}" if (lat or lng) else "—"
    rows = [
        ("Project Location", loc),
        ("Project Solution", v.get("project_solution") or "—"),
        ("Solar Panel Installation Area", _fmt(v.get("install_area_sqft"), " sq ft")),
        ("Tilt Angle", _fmt(v.get("tilt_angle"), "°")),
    ]
    box = slide.shapes.add_textbox(Inches(0.9), top, Inches(6.2), prs.slide_height - top - Inches(0.9))
    tf = box.text_frame; T._no_autosize(tf)
    for i, (k, val) in enumerate(rows):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(14)
        r1 = p.add_run(); T._apply_run(r1, f"{k}:  ", size=16, bold=True, italic=False, color=T.ACCENT, font=T.FONT)
        r2 = p.add_run(); T._apply_run(r2, str(val), size=16, bold=False, italic=False, color=T.WHITE, font=T.FONT)
    img = imgs.get("survey_image")
    if img:
        T.add_image_contain(slide, img, Inches(7.4), top, Inches(5.0), prs.slide_height - top - Inches(1.0))


def _slide6_bill(prs, client, v, imgs, company_name):
    slide = T.add_slide(prs, page=6, company_name=company_name)
    top = T.add_title(slide, prs, f"{client}  ဓာတ်အားခ သုံးစွဲယူနစ်တောင်းခံလွှာ")
    img = imgs.get("meter_bill_image")
    if img:
        T.add_image_contain(slide, img, Inches(0.9), top, Inches(5.6), prs.slide_height - top - Inches(1.0))
    # figures panel on the right
    px = Inches(7.0)
    rows = [
        ("ဓာတ်အားခ စုစုပေါင်း", f"{_money(v.get('total_epc_cost'))} ကျပ်"),
        ("သုံးစွဲယူနစ် စုစုပေါင်း", f"{_money(v.get('total_epc_units'))} ယူနစ်"),
        ("တစ်ယူနစ် ကျသင့်ငွေ", f"{_money(v.get('per_unit_cost'))} ကျပ်"),
    ]
    box = slide.shapes.add_textbox(px, top + Inches(0.3), Inches(5.3), Inches(4))
    tf = box.text_frame; T._no_autosize(tf)
    for i, (k, val) in enumerate(rows):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(18)
        r1 = p.add_run(); T._apply_run(r1, f"{k}  –  ", size=17, bold=False, italic=False, color=T.MUTED, font=T.MM_FONT)
        r2 = p.add_run(); T._apply_run(r2, str(val), size=18, bold=True, italic=False, color=T.GOLD, font=T.MM_FONT)


def _slide7_survey_photos(prs, imgs, company_name):
    slide = T.add_slide(prs, page=7, company_name=company_name)
    top = T.add_title(slide, prs, "Surveying ပြုလုပ်သည့် မှတ်တမ်းပုံများ")
    half = (prs.slide_width - Inches(2.1)) / 2
    for i, field in enumerate(("survey_photo_1", "survey_photo_2")):
        left = Inches(0.7) + i * (half + Inches(0.5))
        img = imgs.get(field)
        if img:
            T.add_image_contain(slide, img, left, top, half, prs.slide_height - top - Inches(1.0))
        else:
            _placeholder(slide, left, top, half, prs.slide_height - top - Inches(1.0))


def _slide8_solar_frame(prs, imgs, company_name):
    slide = T.add_slide(prs, page=8, company_name=company_name)
    top = T.add_title(slide, prs, "Solar Frame ပြုလုပ်မည့် နေရာ")
    fields = [("solar_frame_map_image", "Google Map Overview"),
              ("solar_frame_site_1", "Site View 1"),
              ("solar_frame_site_2", "Site View 2")]
    third = (prs.slide_width - Inches(2.4)) / 3
    h = prs.slide_height - top - Inches(1.2)
    for i, (field, label) in enumerate(fields):
        left = Inches(0.7) + i * (third + Inches(0.45))
        img = imgs.get(field)
        if img:
            T.add_image_contain(slide, img, left, top, third, h)
        else:
            _placeholder(slide, left, top, third, h)
        T.add_text(slide, label, left, top + h + Inches(0.1), third, Inches(0.4),
                   size=12, italic=True, color=T.MUTED, align=PP_ALIGN.CENTER)


def _slide9_data_result(prs, client, v, imgs, company_name, page, prefix, title):
    slide = T.add_slide(prs, page=page, company_name=company_name)
    top = T.add_title(slide, prs, title)

    def g(base):
        return v.get(f"{prefix}{base}") if prefix else v.get(base)

    rows = [
        ("Maximum Load Consumption", _fmt(g("max_load_kw"), " kWp")),
        ("Duration Hours", _fmt(g("duration_hours"), " Hr")),
        ("Line Voltage", _fmt(g("voltage_v"), " V")),
        ("Power Factor", _fmt(g("power_factor"))),
        ("Transformer Size", _fmt(g("transformer_kva"), " kVA")),
        ("Generator", _fmt(g("generator_capacity_kva") if not prefix else g("generator_kva"), " kVA")),
        ("PV Installation Area", _fmt(g("pv_installation_area_sqft") if not prefix else g("pv_area_sqft"), " sq ft")),
        ("Average Consumption", _fmt(g("avg_units") if prefix else v.get("survey_avg_units"), " Units/day")),
        ("Peak Consumption", _fmt(g("peak_units") if prefix else v.get("survey_peak_units"), " Units")),
    ]
    box = slide.shapes.add_textbox(Inches(0.9), top, Inches(7.2), prs.slide_height - top - Inches(0.9))
    tf = box.text_frame; T._no_autosize(tf)
    for i, (k, val) in enumerate(rows):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(8)
        r1 = p.add_run(); T._apply_run(r1, f"{k}  –  ", size=15, bold=True, italic=False, color=T.ACCENT, font=T.FONT)
        r2 = p.add_run(); T._apply_run(r2, str(val), size=15, bold=False, italic=False, color=T.WHITE, font=T.FONT)


def _slide10_analyzer(prs, client, date_range, image, company_name, page):
    slide = T.add_slide(prs, page=page, company_name=company_name)
    top = T.add_title(slide, prs, f"Power Analyzer Recording for {client}",
                      subtitle=(date_range or None))
    if image:
        T.add_image_contain(slide, image, Inches(0.9), top, prs.slide_width - Inches(1.8),
                            prs.slide_height - top - Inches(0.9))
    else:
        _placeholder(slide, Inches(0.9), top, prs.slide_width - Inches(1.8), prs.slide_height - top - Inches(0.9))


def _placeholder(slide, left, top, w, h):
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, w, h)
    box.fill.solid(); box.fill.fore_color.rgb = T.PANEL
    box.line.color.rgb = T.LINE
    tf = box.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); T._apply_run(r, "No image added", size=13, bold=False, italic=True, color=T.MUTED, font=T.FONT)
