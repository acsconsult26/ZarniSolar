import datetime

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth as fb_auth
from firebase_admin.auth import EmailAlreadyExistsError

from .. import firestore_db as fdb
from .. import activity_log
from ..auth import require_admin

router = APIRouter(prefix="/users", tags=["users"])


def _serialize(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u.get("email"),
        "name": u.get("name"),
        "role": u.get("role"),
        "is_active": u.get("is_active", True),
        "created_at": u["created_at"].isoformat() if u.get("created_at") else None,
        "last_login_at": u["last_login_at"].isoformat() if u.get("last_login_at") else None,
    }


@router.get("", dependencies=[Depends(require_admin)])
def list_users():
    return [_serialize(u) for u in fdb.list_all("users", order_by="created_at")]


@router.post("", dependencies=[Depends(require_admin)])
def create_user(body: dict, current=Depends(require_admin)):
    """Invite-only: creates the Firebase Auth account with no password set.
    The frontend follows up with a password-reset email, which the invitee
    uses to set their own password and land back on the login page."""
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "email is required")
    role = body.get("role") or "staff"
    if role not in ("admin", "staff"):
        raise HTTPException(400, "role must be 'admin' or 'staff'")
    try:
        auth_user = fb_auth.create_user(email=email, display_name=body.get("name", ""), email_verified=False)
    except EmailAlreadyExistsError:
        raise HTTPException(409, "A user with this email already exists")
    profile = fdb.set_doc("users", auth_user.uid, {
        "email": email,
        "name": body.get("name", ""),
        "role": role,
        "is_active": True,
        "created_at": datetime.datetime.utcnow(),
        "last_login_at": None,
    })
    activity_log.log(current, "user.create", target=auth_user.uid, detail=email)
    return _serialize(profile)


@router.put("/{user_id}", dependencies=[Depends(require_admin)])
def update_user(user_id: str, body: dict, current=Depends(require_admin)):
    if not fdb.get("users", user_id):
        raise HTTPException(404, "User not found")
    patch = {}
    if "name" in body:
        patch["name"] = body["name"]
    if "role" in body:
        if body["role"] not in ("admin", "staff"):
            raise HTTPException(400, "role must be 'admin' or 'staff'")
        patch["role"] = body["role"]
    if "is_active" in body:
        patch["is_active"] = bool(body["is_active"])
    if body.get("password"):
        if len(body["password"]) < 8:
            raise HTTPException(400, "password must be at least 8 characters")
        fb_auth.update_user(user_id, password=body["password"])
    profile = fdb.update("users", user_id, patch) if patch else fdb.get("users", user_id)
    activity_log.log(current, "user.update", target=user_id, detail=profile.get("email"))
    return _serialize(profile)


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(user_id: str, current=Depends(require_admin)):
    if user_id == current["uid"]:
        raise HTTPException(400, "Cannot delete your own account")
    profile = fdb.get("users", user_id)
    if not profile:
        raise HTTPException(404, "User not found")
    try:
        fb_auth.delete_user(user_id)
    except fb_auth.UserNotFoundError:
        pass
    fdb.delete("users", user_id)
    activity_log.log(current, "user.delete", target=user_id, detail=profile.get("email"))
    return {"ok": True}
