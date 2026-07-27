from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import firebase  # noqa: F401  -- side effect: initializes the Firebase Admin SDK
from .routers import projects, admin, products, users, clients
from .auth import ensure_seed_admin

ensure_seed_admin()

app = FastAPI(title="Solar ESS Proposal Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(users.router)
app.include_router(clients.router)


@app.get("/health")
def health():
    return {"status": "ok"}
