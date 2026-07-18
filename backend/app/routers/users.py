from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..auth import require_admin, get_current_user, hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _serialize(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
    }


@router.get("", dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)):
    return [_serialize(u) for u in db.query(User).order_by(User.created_at).all()]


@router.post("", dependencies=[Depends(require_admin)])
def create_user(body: dict, db: Session = Depends(get_db)):
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(400, "email and password are required")
    if len(password) < 8:
        raise HTTPException(400, "password must be at least 8 characters")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "A user with this email already exists")
    role = body.get("role") or "staff"
    if role not in ("admin", "staff"):
        raise HTTPException(400, "role must be 'admin' or 'staff'")
    user = User(email=email, password_hash=hash_password(password), name=body.get("name", ""), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.put("/{user_id}", dependencies=[Depends(require_admin)])
def update_user(user_id: int, body: dict, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if "name" in body:
        user.name = body["name"]
    if "role" in body:
        if body["role"] not in ("admin", "staff"):
            raise HTTPException(400, "role must be 'admin' or 'staff'")
        user.role = body["role"]
    if "is_active" in body:
        user.is_active = bool(body["is_active"])
    if body.get("password"):
        if len(body["password"]) < 8:
            raise HTTPException(400, "password must be at least 8 characters")
        user.password_hash = hash_password(body["password"])
    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(user_id: int, db: Session = Depends(get_db), current=Depends(require_admin)):
    if user_id == current.id:
        raise HTTPException(400, "Cannot delete your own account")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}
