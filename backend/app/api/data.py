"""Data upload and demo-data loading endpoints."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.ingestion import parse_shipments, parse_notes
from app.api.session import get_session, acquire_lock

router = APIRouter(tags=["data"])

DEMO_DATA_DIR = Path(__file__).parent.parent.parent / "data"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/data/upload")
async def upload_data(
    shipments_file: UploadFile = File(...),
    notes_file: UploadFile = File(...),
):
    """Upload shipment and note CSV files for analysis."""
    # Validate content types
    for f in (shipments_file, notes_file):
        if f.content_type and f.content_type not in ("text/csv", "application/csv", "text/plain", "application/octet-stream"):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File '{f.filename}' must be a CSV file.",
            )

    # Read with size guard
    shipments_bytes = await shipments_file.read(MAX_UPLOAD_BYTES + 1)
    if len(shipments_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Shipments file exceeds 10 MB limit.")

    notes_bytes = await notes_file.read(MAX_UPLOAD_BYTES + 1)
    if len(notes_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Notes file exceeds 10 MB limit.")

    # Parse
    valid_shipments, s_errors, s_warnings = parse_shipments(shipments_bytes)
    valid_notes, n_errors, n_warnings = parse_notes(notes_bytes)

    all_errors = s_errors + n_errors
    all_warnings = s_warnings + n_warnings

    lock = await acquire_lock()
    async with lock:
        session = await get_session()
        session["shipments"] = valid_shipments
        session["notes"] = valid_notes
        session["analysis_results"] = []
        session["run_info"] = None
        session["using_demo_data"] = False
        session["run_hashes"] = []
        session["csv_content"] = ""

    return {
        "success": len(all_errors) == 0 or len(valid_shipments) > 0,
        "shipment_count": len(valid_shipments),
        "note_count": len(valid_notes),
        "invalid_shipment_rows": len(s_errors),
        "invalid_note_rows": len(n_errors),
        "errors": all_errors[:50],
        "warnings": all_warnings[:50],
    }


@router.post("/data/load-demo")
async def load_demo_data():
    """Load the bundled assessment demonstration dataset."""
    shipments_path = DEMO_DATA_DIR / "shipment_records.csv"
    notes_path = DEMO_DATA_DIR / "context_notes.csv"

    if not shipments_path.exists():
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Demo shipment data not found. Ensure data files are bundled with the backend.",
        )
    if not notes_path.exists():
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Demo notes data not found.",
        )

    valid_shipments, s_errors, s_warnings = parse_shipments(shipments_path.read_bytes())
    valid_notes, n_errors, n_warnings = parse_notes(notes_path.read_bytes())

    all_errors = s_errors + n_errors

    lock = await acquire_lock()
    async with lock:
        session = await get_session()
        session["shipments"] = valid_shipments
        session["notes"] = valid_notes
        session["analysis_results"] = []
        session["run_info"] = None
        session["using_demo_data"] = True
        session["run_hashes"] = []
        session["csv_content"] = ""

    return {
        "success": True,
        "shipment_count": len(valid_shipments),
        "note_count": len(valid_notes),
        "invalid_shipment_rows": len(s_errors),
        "invalid_note_rows": len(n_errors),
        "errors": all_errors[:20],
        "warnings": (s_warnings + n_warnings)[:20],
    }


@router.get("/data/status")
async def data_status():
    """Return current session data status."""
    session = await get_session()
    return {
        "has_data": len(session["shipments"]) > 0,
        "shipment_count": len(session["shipments"]),
        "note_count": len(session["notes"]),
        "has_results": len(session["analysis_results"]) > 0,
        "using_demo_data": session["using_demo_data"],
    }


@router.delete("/data/clear")
async def clear_data():
    """Clear all session data and analysis results."""
    lock = await acquire_lock()
    async with lock:
        session = await get_session()
        session["shipments"] = []
        session["notes"] = []
        session["analysis_results"] = []
        session["run_info"] = None
        session["using_demo_data"] = False
        session["run_hashes"] = []
        session["csv_content"] = ""
    return {"cleared": True}
