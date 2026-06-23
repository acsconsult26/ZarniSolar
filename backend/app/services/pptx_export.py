from __future__ import annotations
"""Export pipeline: merge a project's data into template.pptx and produce
the final downloadable deck. Tokens are replaced inside existing runs only
(never rebuilds paragraphs), so original formatting is preserved. Burmese
runs are forced onto a Myanmar-capable font so they never render as boxes."""
import io
import re
from pathlib import Path

from pptx import Presentation
from pptx.util import Emu

from ..schema import merged_field_values
from .flowchart import render_priority_flowchart

TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "template.pptx"

TOKEN_RE = re.compile(r"\{\{(\w+)\}\}")
BURMESE_RE = re.compile(r"[က-႟]")
BURMESE_FONT = "Pyidaungsu"

# slide index (1-based) -> shape name -> field key in `uploads` dict
IMAGE_SLOTS = {
    3: {"Picture 13": "satellite_photo"},
    4: {
        "Picture 1": "survey_photo_1",
        "Picture 2": "survey_photo_2",
        "Picture 3": "survey_photo_3",
        "Picture 5": "survey_photo_4",
        "Picture 4": "survey_photo_5",
        "Picture 8": "survey_photo_6",
    },
    5: {
        "Picture 1": "data_logger_photo_1",
        "Picture 2": "data_logger_photo_2",
        "Picture 4": "data_logger_photo_3",
    },
    6: {"Picture 20": "load_profile_chart"},
    9: {"Image": "system_drawing"},
}


def find_shape(shapes, name):
    for shape in shapes:
        if shape.shape_type == 6:
            found = find_shape(shape.shapes, name)
            if found is not None:
                return found
        if shape.name == name:
            return shape
    return None


def _text_frames_of(shape):
    if shape.has_table:
        for row in shape.table.rows:
            for cell in row.cells:
                yield cell.text_frame
    elif shape.has_text_frame:
        yield shape.text_frame


def replace_tokens(prs, values: dict):
    for slide in prs.slides:
        for shape in slide.shapes:
            _replace_in_shape(shape, values)


def _replace_in_shape(shape, values: dict):
    if shape.shape_type == 6:
        for sub in shape.shapes:
            _replace_in_shape(sub, values)
        return
    for tf in _text_frames_of(shape):
        for paragraph in tf.paragraphs:
            for run in paragraph.runs:
                if "{{" not in run.text:
                    continue
                new_text = TOKEN_RE.sub(lambda m: str(values.get(m.group(1), "")), run.text)
                if new_text != run.text:
                    run.text = new_text
                if BURMESE_RE.search(run.text):
                    run.font.name = BURMESE_FONT


def _replace_picture(slide, shape_name: str, image_bytes: bytes):
    shape = find_shape(slide.shapes, shape_name)
    if shape is None:
        return False
    left, top, width, height = shape.left, shape.top, shape.width, shape.height
    shape._element.getparent().remove(shape._element)
    slide.shapes.add_picture(io.BytesIO(image_bytes), left, top, width, height)
    return True


def _load_image_bytes(uploads: dict, field: str, storage):
    path = uploads.get(field)
    if not path or not storage.exists(path):
        return None
    return storage.read_bytes(path)


def export_project(project, storage, reference_images: list[bytes] | None = None) -> bytes:
    """project: has .data (dict), .uploads (dict), .slide19_image_path, .flowchart_image_path"""
    values = merged_field_values(project.data or {})
    prs = Presentation(str(TEMPLATE_PATH))
    replace_tokens(prs, values)

    uploads = project.uploads or {}
    for slide_idx, slots in IMAGE_SLOTS.items():
        slide = prs.slides[slide_idx - 1]
        for shape_name, field in slots.items():
            img = _load_image_bytes(uploads, field, storage)
            if img:
                _replace_picture(slide, shape_name, img)
            # if missing, leave the original placeholder image in place (never crash)

    # Slide 19 - AI-generated infographic (cached image on the project, or manual fallback)
    if storage.exists(project.slide19_image_path):
        img19 = storage.read_bytes(project.slide19_image_path)
        slide19 = prs.slides[18]
        left = top = Emu(0)
        width = prs.slide_width
        height = prs.slide_height
        slide19.shapes.add_picture(io.BytesIO(img19), left, top, width, height)

    # Slide 20 - data-driven flowchart (drawn, not AI), inserted over the placeholder
    flowchart_path = project.flowchart_image_path
    if not (flowchart_path and storage.exists(flowchart_path)):
        flowchart_bytes = render_priority_flowchart(values)
    else:
        flowchart_bytes = storage.read_bytes(flowchart_path)
    slide20 = prs.slides[19]
    _replace_picture(slide20, "Picture 3", flowchart_bytes)

    # Slide 23 - admin reference gallery (replace as many photo slots as we have images for)
    if reference_images:
        slide23 = prs.slides[22]
        photo_shapes = [
            s for s in slide23.shapes
            if s.shape_type == 13 and s.name.startswith("Picture")
        ]
        for shape, img in zip(photo_shapes, reference_images):
            _replace_picture(slide23, shape.name, img)

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()
