from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, engine, SessionLocal
from .routers import projects, admin, products, users, clients
from .storage import UPLOAD_DIR
from .auth import ensure_seed_admin

Base.metadata.create_all(bind=engine)

_db = SessionLocal()
try:
    ensure_seed_admin(_db)
finally:
    _db.close()

app = FastAPI(title="Solar ESS Proposal Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(projects.router)
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(users.router)
app.include_router(clients.router)


@app.get("/health")
def health():
    return {"status": "ok"}
