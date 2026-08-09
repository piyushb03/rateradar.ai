"""Evidence-grounded context note retrieval.

This module implements a DETERMINISTIC, HYBRID retrieval pipeline:
1. Candidate retrieval via TF-IDF cosine similarity.
2. Hard eligibility rules (route applicability, temporal applicability,
   note content must support a cost increase).
3. A single best-supported note is selected per route-week.

A high TF-IDF score NEVER overrides a failed eligibility rule.
This is NOT a generative LLM — it is an explainable retrieval system.

Note interpretation hard-constraints (per master prompt section 6):
  N004: toll routes not in dataset — cannot justify.
  N005: costs not significantly affected — cannot justify.
  N006: stable demand, no disruptions — not evidence of increase.
  N007: improved road conditions — cannot invent higher costs from improvement.
  N008: no disruption, normal movement — cannot justify.
  N009: return to normal — cannot justify later unexplained rise.
  N010: compliance costs absorbed by transporters — no rate change.
"""
from __future__ import annotations

import logging
import re
from datetime import date, timedelta
from typing import Any, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Notes that explicitly state costs were NOT affected, stable, or improved.
NON_SUPPORTING_NOTE_IDS = {"N004", "N005", "N006", "N007", "N008", "N009", "N010"}

# For N001: disruption Feb 24 – Mar 8, 2025; roads passable Mar 9.
N001_START = date(2025, 2, 24)
N001_END = date(2025, 3, 8)  # inclusive end of disruption

# For N003: diesel prices rose starting week of May 5, 2025.
N003_START = date(2025, 5, 5)
# No explicit end date — we use a 12-week window as a reasonable bounded scope.
N003_WINDOW_WEEKS = 12

# For N002: festival week — apply only the week of the note date.
N002_WINDOW_DAYS = 7


def retrieve_note_matches(
    metrics: list[dict[str, Any]],
    notes: list[dict[str, Any]],
) -> dict[tuple[str, date], dict[str, Any]]:
    """For each route-week metric, find the best supporting note (if any).

    Returns a dict keyed by (route_key, week_of) with values:
        matched (bool), note_id (str|None), reason (str),
        rejection_reasons (list[str])
    """
    if not notes:
        return {}

    # Build TF-IDF index over note texts
    note_texts = [n["note"] for n in notes]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    note_matrix = vectorizer.fit_transform(note_texts)

    results: dict[tuple[str, date], dict[str, Any]] = {}

    for m in metrics:
        rk = m["route_key"]
        wk = m["week_of"]  # already a date object
        origin = m["route"].split("-")[0]
        destination = m["route"].split("-")[-1]
        route_display = m["route"]

        # Build a query from the route context
        query = f"freight cost increase {origin} {destination} route higher expensive"
        query_vec = vectorizer.transform([query])
        scores = cosine_similarity(query_vec, note_matrix)[0]

        # Rank notes by TF-IDF score (descending) for candidate ordering
        ranked = sorted(
            enumerate(notes), key=lambda x: scores[x[0]], reverse=True
        )

        best_match: Optional[dict[str, Any]] = None
        rejection_log: list[str] = []

        for _, note in ranked:
            nid = note["note_id"]
            result = _evaluate_note(note, wk, origin, destination)
            if result["eligible"]:
                best_match = {"note_id": nid, "reason": result["reason"]}
                break
            else:
                rejection_log.append(f"{nid}: {result['rejection']}")

        if best_match:
            results[(rk, wk)] = {
                "matched": True,
                "note_id": best_match["note_id"],
                "reason": best_match["reason"],
                "rejection_reasons": rejection_log,
            }
        else:
            results[(rk, wk)] = {
                "matched": False,
                "note_id": None,
                "reason": "",
                "rejection_reasons": rejection_log,
            }

    return results


def _evaluate_note(
    note: dict[str, Any],
    week_of: date,
    origin: str,
    destination: str,
) -> dict[str, Any]:
    """Apply hard eligibility rules to one note for one route-week.

    Returns {"eligible": bool, "reason": str, "rejection": str}.
    """
    nid = note["note_id"]
    note_date: date = note["date"]
    applies_to: str = note["applies_to"].strip()
    note_text: str = note["note"]

    # Rule 1: Notes that cannot support a cost increase (hard-coded from master prompt)
    if nid in NON_SUPPORTING_NOTE_IDS:
        return {
            "eligible": False,
            "reason": "",
            "rejection": f"Note {nid} explicitly does not support a cost increase (content states no impact, stable, improved, or absorbed costs).",
        }

    # Rule 2: Route applicability
    route_match = _matches_route(applies_to, origin, destination)
    if not route_match:
        return {
            "eligible": False,
            "reason": "",
            "rejection": f"Note {nid} applies to '{applies_to}', not to {origin}-{destination}.",
        }

    # Rule 3: Temporal applicability
    temporal = _check_temporal(nid, note_date, week_of, note_text)
    if not temporal["ok"]:
        return {
            "eligible": False,
            "reason": "",
            "rejection": temporal["reason"],
        }

    # Rule 4: Note must state a reason that could explain a cost increase
    supports = _note_supports_increase(nid, note_text)
    if not supports:
        return {
            "eligible": False,
            "reason": "",
            "rejection": f"Note {nid} does not state a cost-driving reason (content does not support an increase).",
        }

    reason = _build_reason(nid, note_date, note_text, temporal["period_desc"])
    return {"eligible": True, "reason": reason, "rejection": ""}


def _matches_route(applies_to: str, origin: str, destination: str) -> bool:
    """True if the note applies to this route (exact or 'All Routes')."""
    at = applies_to.strip()
    if at.lower() == "all routes":
        return True
    # Route-specific: "Origin-Destination"
    parts = at.split("-")
    if len(parts) >= 2:
        note_origin = parts[0].strip()
        note_dest = "-".join(parts[1:]).strip()
        return (
            note_origin.lower() == origin.lower()
            and note_dest.lower() == destination.lower()
        )
    return False


def _check_temporal(
    nid: str, note_date: date, week_of: date, note_text: str
) -> dict[str, Any]:
    """Check whether the note's temporal scope covers the given week."""
    week_end = week_of + timedelta(days=6)

    if nid == "N001":
        # Disruption Feb 24 – Mar 8, 2025
        if week_of <= N001_END and week_end >= N001_START:
            return {"ok": True, "reason": "", "period_desc": "Feb 24 – Mar 8, 2025"}
        return {
            "ok": False,
            "reason": f"N001 disruption period (Feb 24 – Mar 8, 2025) does not overlap week {week_of}.",
        }

    if nid == "N002":
        # Festival week: 7-day window around note date
        window_end = note_date + timedelta(days=N002_WINDOW_DAYS - 1)
        if week_of <= window_end and week_end >= note_date:
            return {"ok": True, "reason": "", "period_desc": f"festival week of {note_date}"}
        return {
            "ok": False,
            "reason": f"N002 festival week ({note_date} to {window_end}) does not overlap week {week_of}.",
        }

    if nid == "N003":
        # Diesel: starting May 5, 2025; bounded to 12 weeks
        end = N003_START + timedelta(weeks=N003_WINDOW_WEEKS)
        if week_of >= N003_START and week_of < end:
            return {"ok": True, "reason": "", "period_desc": f"from {N003_START} (diesel price increase)"}
        return {
            "ok": False,
            "reason": f"N003 diesel period ({N003_START} to {end}) does not cover week {week_of}.",
        }

    # Generic: note date within or before the week (same week or earlier in the same window)
    # For non-specific notes: note date must be within ±4 weeks of the route week
    delta_days = abs((week_of - note_date).days)
    if delta_days <= 28:
        return {"ok": True, "reason": "", "period_desc": str(note_date)}
    return {
        "ok": False,
        "reason": f"Note {nid} dated {note_date} is too far from week {week_of} ({delta_days} days apart).",
    }


def _note_supports_increase(nid: str, note_text: str) -> bool:
    """Heuristic: does the note describe a cost-driving event?"""
    positive_signals = [
        "higher", "increase", "surcharge", "disruption", "flooding", "detour",
        "festival", "demand", "limited", "diesel", "prices rose", "higher trip costs",
        "pushing up", "expensive", "cost",
    ]
    text_lower = note_text.lower()
    return any(sig in text_lower for sig in positive_signals)


def _build_reason(nid: str, note_date: date, note_text: str, period_desc: str) -> str:
    # Truncate note for readability (first 200 chars)
    excerpt = note_text[:200].rstrip()
    if len(note_text) > 200:
        excerpt += "…"
    return (
        f"Matches note {nid} dated {note_date} ({period_desc}): {excerpt} "
        f"This documented event provides a plausible business justification for the cost increase."
    )


def get_note_details(
    notes: list[dict[str, Any]],
    analysis_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build note detail objects for the Evidence Explorer view."""
    # Index which route-weeks each note was matched to
    matched_to: dict[str, list[str]] = {}
    for row in analysis_rows:
        nid = row.get("matched_note_id", "")
        if nid:
            matched_to.setdefault(nid, []).append(
                f"{row['route']} week {row['week_of']}"
            )

    details = []
    for n in notes:
        nid = n["note_id"]
        details.append(
            {
                "note_id": nid,
                "date": str(n["date"]),
                "applies_to": n["applies_to"],
                "note": n["note"],
                "matched_route_weeks": matched_to.get(nid, []),
                "is_non_supporting": nid in NON_SUPPORTING_NOTE_IDS,
                "rejection_summary": (
                    "This note explicitly does not support a cost increase (non-supporting note)."
                    if nid in NON_SUPPORTING_NOTE_IDS
                    else ""
                ),
            }
        )
    return details
