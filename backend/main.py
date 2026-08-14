"""RateRadar Backend - Freight Cost Intelligence Application.

FastAPI application serving the analytical pipeline for FreightTiger
shipment cost analysis, anomaly detection, and evidence retrieval.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.api import health, analysis, data, assistant, evaluation, exports

app = FastAPI(
    title="RateRadar API",
    description="Freight Cost Intelligence — Analytical pipeline and REST API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS — narrow in production; dev allows the Vite dev server
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Accept"],
)

# Mount API routers
app.include_router(health.router, prefix="/api")
app.include_router(data.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(exports.router, prefix="/api")

# Serve built frontend static assets (production)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon_fallback():
        fav_svg = os.path.join(FRONTEND_DIST, "favicon.svg")
        if os.path.isfile(fav_svg):
            return FileResponse(fav_svg, media_type="image/svg+xml")
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        index = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index)
