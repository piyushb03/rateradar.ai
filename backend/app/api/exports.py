"""CSV export endpoint."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from app.api.session import get_session

router = APIRouter(tags=["exports"])


@router.get("/exports/csv")
async def download_csv():
    """Download the required 8-column assessment CSV."""
    session = await get_session()

    if not session.get("csv_content"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "No analysis results to export. Run the analysis first.",
        )

    return Response(
        content=session["csv_content"],
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="rateradar_output.csv"',
            "Cache-Control": "no-cache",
        },
    )
