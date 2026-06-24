from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import Base, engine
from .routers import projects, admin, products
from .storage import UPLOAD_DIR

Base.metadata.create_all(bind=engine)

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


@app.get("/health")
def health():
    return {"status": "ok"}
