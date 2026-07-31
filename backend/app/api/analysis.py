"""Analysis execution and results endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas import AnalysisConfig
from app.services import run_analysis
from app.retrieval import get_note_details
from app.api.session import get_session, acquire_lock

router = APIRouter(tags=["analysis"])


@router.post("/analysis/run")
async def run_analysis_endpoint(config: AnalysisConfig = None):
    """Execute the analytical pipeline over the current session data."""
    if config is None:
        config = AnalysisConfig()

    session = await get_session()

    if not session["shipments"]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "No shipment data loaded. Upload data or load the demo dataset first.",
        )
    if not session["notes"]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "No context notes loaded. Upload notes CSV first.",
        )

    lock = await acquire_lock()
    async with lock:
        result = run_analysis(
            shipments=session["shipments"],
            notes=session["notes"],
            threshold_pct=config.anomaly_threshold_pct,
        )
        session["analysis_results"] = result["results"]
        session["run_info"] = result["run_info"]
        session["csv_content"] = result["csv_content"]

        # Accumulate run hashes for reproducibility (keep last 3)
        session["run_hashes"].append(result["run_hash"])
        if len(session["run_hashes"]) > 3:
            session["run_hashes"] = session["run_hashes"][-3:]

    # Serialize week_of dates to strings for JSON
    serialized = [
        {**r, "week_of": str(r["week_of"])}
        for r in result["results"]
    ]

    return {
        "success": True,
        "count": len(serialized),
        "run_info": result["run_info"],
        "results": serialized,
        "run_hash": result["run_hash"],
    }


@router.get("/analysis/results")
async def get_results():
    """Return the most recent analysis results."""
    session = await get_session()
    if not session["analysis_results"]:
        return {"has_results": False, "results": [], "run_info": None}

    serialized = [
        {**r, "week_of": str(r["week_of"])}
        for r in session["analysis_results"]
    ]
    return {
        "has_results": True,
        "results": serialized,
        "run_info": session["run_info"],
    }


@router.get("/analysis/notes")
async def get_note_details_endpoint():
    """Return evidence explorer data: all notes with match context."""
    session = await get_session()
    if not session["notes"]:
        return {"notes": []}

    details = get_note_details(session["notes"], session["analysis_results"])
    return {"notes": details}
