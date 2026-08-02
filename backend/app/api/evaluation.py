"""Evaluation and reproducibility endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.evaluation import run_evaluation
from app.api.session import get_session

router = APIRouter(tags=["evaluation"])


@router.get("/evaluation/report")
async def get_evaluation_report():
    """Run evaluation checks on current analysis results."""
    session = await get_session()

    if not session["analysis_results"]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "No analysis results available. Run the analysis first.",
        )

    report = run_evaluation(
        rows=session["analysis_results"],
        notes=session["notes"],
        run_hashes=session.get("run_hashes", []),
    )
    return report
