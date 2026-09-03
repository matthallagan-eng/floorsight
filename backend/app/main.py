from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(
    title="FloorSight API",
    description="Production monitoring and OEE analytics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["ops"])
def health():
    return {"status": "ok"}

from .routers import auth as auth_router
from .routers import uploads as uploads
from .routers import auth as auth_router
from .routers import uploads, machines,metrics, alerts

app.include_router(auth_router.router)
app.include_router(uploads.router)
app.include_router(auth_router.router)
app.include_router(uploads.router)
app.include_router(machines.router)
app.include_router(metrics.router)
app.include_router(alerts.router)