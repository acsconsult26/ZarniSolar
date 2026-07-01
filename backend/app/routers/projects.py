from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Project, Product
from ..storage import storage
from ..schema import merged_field_values
from ..services.pptx_export import export_project
from ..services import imagegen
from ..services.flowchart import render_priority_flowchart
from ..services.text_drafts import compose_power_priority_draft

router = APIRouter(prefix="/projects", tags=["projects"])


def _gather_selected_products(data: dict, db: Session) -> dict:
    """Build {category: product_dict} from the *_product_id values stored on
    the project, for the spec-table slides (14-16) and warranty (22)."""
    selected = {}
    for category in ("inverter", "battery", "panel"):
        pid = data.get(f"{category}_product_id")
        if not pid:
            continue
        prod = db.query(Product).get(pid)
        if prod:
            selected[category] = {
                "spec_title": prod.spec_title,
                "brand": prod.brand,
                "model_name": prod.model_name,
                "unit_value": prod.unit_value,
                "unit_label": prod.unit_label,
                "specs": prod.specs or [],
                "warranty_line": prod.warranty_line,
                "image_path": prod.image_path,
            }
    return selected


def _serialize(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "data": p.data or {},
        "uploads": p.uploads or {},
        "computed": merged_field_values(p.data or {}),
        "slide19_image_url": storage.url_for(p.slide19_image_path) if storage.exists(p.slide19_image_path) else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.post("")
def create_project(body: dict, db: Session = Depends(get_db)):
    project = Project(name=body.get("name", "Untitled Project"), data=body.get("data", {}), uploads={})
    db.add(project)
    db.commit()
    db.refresh(project)
    return _serialize(project)


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    return [_serialize(p) for p in db.query(Project).order_by(Project.updated_at.desc()).all()]


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return _serialize(project)


@router.put("/{project_id}")
def update_project(project_id: int, body: dict, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if "name" in body:
        project.name = body["name"]
    if "data" in body:
        project.data = body["data"]
    db.commit()
    db.refresh(project)
    return _serialize(project)


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()
    return {"ok": True}


@router.post("/{project_id}/uploads")
def upload_field_image(project_id: int, field: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    path = storage.save_bytes(file.file.read(), file.filename)
    uploads = dict(project.uploads or {})
    uploads[field] = path
    project.uploads = uploads
    db.commit()
    return {"field": field, "url": storage.url_for(path)}


@router.post("/{project_id}/slide19/generate")
def generate_slide19(project_id: int, body: dict, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    values = merged_field_values(project.data or {})
    template = body.get("prompt_template") or imagegen.DEFAULT_PROMPT_TEMPLATE
    try:
        prompt = imagegen.render_prompt(template, values)
        img_bytes = imagegen.generate_image(prompt)
    except imagegen.ImageGenError as e:
        raise HTTPException(502, f"Image generation failed: {e}. Upload an image manually instead.")
    path = storage.save_bytes(img_bytes, "slide19.png")
    project.slide19_image_path = path
    db.commit()
    return {"url": storage.url_for(path)}


@router.post("/{project_id}/slide19/upload")
def upload_slide19_fallback(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    path = storage.save_bytes(file.file.read(), file.filename)
    project.slide19_image_path = path
    db.commit()
    return {"url": storage.url_for(path)}


@router.get("/{project_id}/slide21/draft")
def slide21_draft(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    values = merged_field_values(project.data or {})
    return {"text": compose_power_priority_draft(values)}


@router.get("/{project_id}/slide20/preview")
def preview_flowchart(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    values = merged_field_values(project.data or {})
    png = render_priority_flowchart(values)
    return Response(content=png, media_type="image/png")


@router.post("/{project_id}/export")
def export(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).get(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    selected_products = _gather_selected_products(project.data or {}, db)
    pptx_bytes = export_project(project, storage, selected_products=selected_products)
    filename = f"{(project.data or {}).get('site_name') or project.name}_proposal.pptx".replace(" ", "_")
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
