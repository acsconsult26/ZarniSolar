import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response

from .. import firestore_db as fdb
from ..storage import storage
from ..schema import merged_field_values
from ..services.pptx_export_v2 import export_project_v2
from ..services.power_analyzer import analyze_power_log
from ..services.chart_power_hourly import render_hourly_chart
from ..services import imagegen
from ..services.map_image import fetch_static_map, MapImageError
from ..services.flowchart import render_priority_flowchart
from ..services.text_drafts import compose_power_priority_draft
from .. import boilerplate as bp
from ..auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(get_current_user)])


class _ProjectView:
    """Minimal attribute-access shim so pptx_export_v2.py (which reads
    `project.data` / `project.uploads`) doesn't need to change for Firestore's
    plain dicts."""

    def __init__(self, doc: dict):
        self.data = doc.get("data") or {}
        self.uploads = doc.get("uploads") or {}


def _gather_selected_products(data: dict) -> dict:
    """Build {category: product_dict} from the *_product_id values stored on
    the project, for the spec-table slides (14-16) and warranty (22)."""
    selected = {}
    for category in ("inverter", "battery", "panel", "gateway"):
        pid = data.get(f"{category}_product_id")
        if not pid:
            continue
        prod = fdb.get("products", str(pid))
        if prod:
            selected[category] = {
                "spec_title": prod.get("spec_title"),
                "brand": prod.get("brand"),
                "model_name": prod.get("model_name"),
                "unit_value": prod.get("unit_value"),
                "unit_label": prod.get("unit_label"),
                "specs": prod.get("specs") or [],
                "warranty_line": prod.get("warranty_line"),
                "image_path": prod.get("image_path"),
            }
    return selected


def _serialize(p: dict) -> dict:
    client_name = None
    if p.get("client_id"):
        client = fdb.get("clients", p["client_id"])
        client_name = client.get("name") if client else None
    return {
        "id": p["id"],
        "client_id": p.get("client_id"),
        "client_name": client_name,
        "name": p.get("name"),
        "status": p.get("status", "draft"),
        "data": p.get("data") or {},
        "uploads": {
            field: storage.url_for(path) for field, path in (p.get("uploads") or {}).items() if storage.exists(path)
        },
        "computed": merged_field_values(p.get("data") or {}),
        "slide19_image_url": storage.url_for(p["slide19_image_path"]) if storage.exists(p.get("slide19_image_path")) else None,
        "export_count": p.get("export_count", 0),
        "last_exported_at": p["last_exported_at"].isoformat() if p.get("last_exported_at") else None,
        "created_at": p["created_at"].isoformat() if p.get("created_at") else None,
        "updated_at": p["updated_at"].isoformat() if p.get("updated_at") else None,
    }


@router.post("")
def create_project(body: dict, user=Depends(get_current_user)):
    client_id = body.get("client_id")
    if client_id and not fdb.get("clients", client_id):
        raise HTTPException(404, "Client not found")
    project = fdb.create("projects", {
        "name": body.get("name", "Untitled Project"),
        "data": body.get("data", {}),
        "uploads": {},
        "client_id": client_id,
        "created_by_id": user["uid"],
        "status": "draft",
        "export_count": 0,
        "last_exported_at": None,
        "slide19_image_path": None,
        "flowchart_image_path": None,
    })
    return _serialize(project)


@router.get("")
def list_projects():
    rows = fdb.list_all("projects", order_by="updated_at", descending=True)
    return [_serialize(p) for p in rows]


@router.get("/{project_id}")
def get_project(project_id: str):
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return _serialize(project)


@router.put("/{project_id}")
def update_project(project_id: str, body: dict):
    if not fdb.get("projects", project_id):
        raise HTTPException(404, "Project not found")
    patch = {}
    if "name" in body:
        patch["name"] = body["name"]
    if "data" in body:
        patch["data"] = body["data"]
    if "client_id" in body:
        if body["client_id"] and not fdb.get("clients", body["client_id"]):
            raise HTTPException(404, "Client not found")
        patch["client_id"] = body["client_id"]
    project = fdb.update("projects", project_id, patch)
    return _serialize(project)


@router.delete("/{project_id}")
def delete_project(project_id: str):
    if not fdb.get("projects", project_id):
        raise HTTPException(404, "Project not found")
    fdb.delete("projects", project_id)
    return {"ok": True}


@router.post("/{project_id}/uploads")
def upload_field_image(project_id: str, field: str, file: UploadFile = File(...)):
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    path = storage.save_bytes(file.file.read(), file.filename)
    uploads = dict(project.get("uploads") or {})
    uploads[field] = path
    fdb.update("projects", project_id, {"uploads": uploads})
    return {"field": field, "url": storage.url_for(path)}


@router.post("/{project_id}/slide19/generate")
def generate_slide19(project_id: str, body: dict):
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    values = merged_field_values(project.get("data") or {})
    template = body.get("prompt_template") or bp.read("slide19_prompt_template") or imagegen.DEFAULT_PROMPT_TEMPLATE
    try:
        prompt = imagegen.render_prompt(template, values)
        img_bytes = imagegen.generate_image(prompt)
    except imagegen.ImageGenError as e:
        raise HTTPException(502, f"Image generation failed: {e}. Upload an image manually instead.")
    path = storage.save_bytes(img_bytes, "slide19.png")
    fdb.update("projects", project_id, {"slide19_image_path": path})
    return {"url": storage.url_for(path)}


@router.post("/{project_id}/slide19/upload")
def upload_slide19_fallback(project_id: str, file: UploadFile = File(...)):
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    path = storage.save_bytes(file.file.read(), file.filename)
    fdb.update("projects", project_id, {"slide19_image_path": path})
    return {"url": storage.url_for(path)}


@router.post("/{project_id}/analyze-power-log")
def analyze_power_log_endpoint(project_id: str, field: str, file: UploadFile = File(...)):
    """Parses an uploaded power-analyzer trend log (CSV/XLSX), computes
    summary stats, renders the hourly-load bar chart, and stores both on the
    project so the pptx export can reuse the same chart image."""
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    try:
        result = analyze_power_log(file.file.read(), file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(400, f"Could not analyze the file: {e}")

    chart_png = render_hourly_chart(result["hourly"])
    chart_path = storage.save_bytes(chart_png, f"{field}_chart.png")

    uploads = dict(project.get("uploads") or {})
    uploads[f"{field}_chart"] = chart_path
    data = dict(project.get("data") or {})
    stats = {k: v for k, v in result.items() if k != "hourly"}
    data[f"{field}_stats"] = stats
    # The slide subtitle field (e.g. analyzer_date_range) is derived from the
    # log itself now, instead of being hand-entered.
    data[f"{field}_date_range"] = result["date_range"]
    fdb.update("projects", project_id, {"uploads": uploads, "data": data})

    return {"stats": stats, "hourly": result["hourly"], "chart_url": storage.url_for(chart_path)}


@router.post("/{project_id}/fetch-map-image")
def fetch_map_image_endpoint(project_id: str, lat: float, lng: float):
    """Grabs a Google Static Maps satellite snapshot centered on the given
    coordinates and stores it as the survey_image upload (slide 5)."""
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    try:
        img_bytes = fetch_static_map(lat, lng)
    except MapImageError as e:
        raise HTTPException(400, str(e))
    path = storage.save_bytes(img_bytes, "survey_map.png")
    uploads = dict(project.get("uploads") or {})
    uploads["survey_image"] = path
    fdb.update("projects", project_id, {"uploads": uploads})
    return {"url": storage.url_for(path)}


@router.get("/{project_id}/slide21/draft")
def slide21_draft(project_id: str):
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    values = merged_field_values(project.get("data") or {})
    return {"text": compose_power_priority_draft(values)}


@router.get("/{project_id}/slide20/preview")
def preview_flowchart(project_id: str):
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    values = merged_field_values(project.get("data") or {})
    png = render_priority_flowchart(values)
    return Response(content=png, media_type="image/png")


@router.post("/{project_id}/export")
def export(project_id: str):
    project = fdb.get("projects", project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    company_info = bp.read("company_info")
    selected_products = _gather_selected_products(project.get("data") or {})
    introduction_message = bp.read("introduction_message")
    thank_you_message = bp.read("thank_you_message")
    warranty_template_id = (project.get("data") or {}).get("warranty_template_id")
    warranty_template = None
    if warranty_template_id:
        templates = bp.read("warranty_templates") or []
        warranty_template = next((t for t in templates if t.get("id") == warranty_template_id), None)
    pptx_bytes = export_project_v2(
        _ProjectView(project), storage, company_info=company_info,
        selected_products=selected_products, introduction_message=introduction_message,
        thank_you_message=thank_you_message, warranty_template=warranty_template,
    )
    # track export stats (month bucket) for the dashboard
    stats = dict(bp.read("export_stats") or {})
    by_month = dict(stats.get("by_month") or {})
    m = datetime.date.today().strftime("%Y-%m")
    by_month[m] = by_month.get(m, 0) + 1
    bp.write("export_stats", {"total": (stats.get("total", 0) + 1), "by_month": by_month})
    fdb.update("projects", project_id, {
        "status": "exported",
        "export_count": (project.get("export_count") or 0) + 1,
        "last_exported_at": datetime.datetime.utcnow(),
    })
    filename = f"{(project.get('data') or {}).get('site_name') or project.get('name')}_proposal.pptx".replace(" ", "_")
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
