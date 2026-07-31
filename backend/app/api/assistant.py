"""Natural-language assistant endpoint."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas import QuestionRequest
from app.assistant import answer_question
from app.api.session import get_session

router = APIRouter(tags=["assistant"])

EXAMPLE_QUESTIONS = [
    "Why did Chennai-Bangalore become more expensive in February 2025?",
    "Which routes have unexplained increases?",
    "Which increases have supporting evidence?",
    "Which routes should an analyst investigate first?",
    "What was the peer comparison for Delhi-Jaipur?",
    "What evidence supports Ahmedabad-Mumbai's verdict?",
]


@router.post("/assistant/ask")
async def ask_question(request: QuestionRequest):
    """Answer a natural-language question about the analysis results."""
    session = await get_session()

    if not session["analysis_results"]:
        return {
            "answer": "No analysis has been run yet. Please load data and run the analysis first.",
            "sources": [],
            "supported": False,
        }

    result = answer_question(
        question=request.question,
        analysis_rows=session["analysis_results"],
        notes=session["notes"],
    )
    return result


@router.get("/assistant/examples")
async def get_example_questions():
    """Return example questions the assistant can answer."""
    return {"examples": EXAMPLE_QUESTIONS}
