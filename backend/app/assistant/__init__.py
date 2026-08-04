"""Natural-language assistant: rule-based question answering over analysis results.

This is NOT a generative LLM. It is a constrained Q&A system that:
1. Identifies intent and entities from the question using keyword patterns.
2. Looks up relevant analytical rows and notes.
3. Constructs a factual answer from retrieved data.

If the data does not support an answer, it says so directly.
"""
from __future__ import annotations

import re
from datetime import date
from typing import Any, Optional

# Month-name to number
_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# Known routes in the dataset
KNOWN_ROUTES = [
    "Mumbai-Pune", "Delhi-Jaipur", "Chennai-Bangalore",
    "Kolkata-Bhubaneswar", "Ahmedabad-Mumbai", "Mumbai-Delhi",
]


def answer_question(
    question: str,
    analysis_rows: list[dict[str, Any]],
    notes: list[dict[str, Any]],
) -> dict[str, Any]:
    """Answer a natural-language question from analysis results.

    Returns {"answer": str, "sources": list[str], "supported": bool}
    """
    if not analysis_rows:
        return {
            "answer": "No analysis has been run yet. Please upload data and run the analysis first.",
            "sources": [],
            "supported": False,
        }

    q_lower = question.lower().strip()

    # --- Intent detection ---

    if _matches(q_lower, ["unexplained", "no explanation", "human review", "flagged yes", "not justified"]):
        return _unexplained_routes(analysis_rows)

    if _matches(q_lower, ["justified", "supported", "evidence", "documented"]):
        return _justified_routes(analysis_rows, notes)

    if _matches(q_lower, ["investigate first", "priority", "highest deviation", "worst", "most expensive"]):
        return _priority_routes(analysis_rows)

    if _matches(q_lower, ["peer comparison", "similar route", "similar-length"]):
        return _peer_comparison_answer(question, analysis_rows)

    if _matches(q_lower, ["note", "evidence for", "what note", "which note", "supporting note"]):
        route = _extract_route(q_lower)
        return _note_for_route(route, analysis_rows, notes)

    if _matches(q_lower, ["why", "expensive", "cost increase", "higher cost", "increased"]):
        route = _extract_route(q_lower)
        month = _extract_month(q_lower)
        year = _extract_year(q_lower)
        return _why_expensive(route, month, year, analysis_rows, notes)

    if _matches(q_lower, ["cost per tonne", "rate", "cost_per_tonne_km"]):
        route = _extract_route(q_lower)
        month = _extract_month(q_lower)
        year = _extract_year(q_lower)
        return _cost_lookup(route, month, year, analysis_rows)

    # Fallback
    return {
        "answer": (
            "I can answer questions about route costs, anomalies, evidence, and comparisons. "
            "Try asking: 'Which routes have unexplained increases?', "
            "'Why did Chennai-Bangalore become expensive in February 2025?', or "
            "'Which routes should I investigate first?'"
        ),
        "sources": [],
        "supported": False,
    }


# ---------------------------------------------------------------------------
# Answer builders
# ---------------------------------------------------------------------------

def _unexplained_routes(rows: list[dict[str, Any]]) -> dict[str, Any]:
    flagged = [r for r in rows if r.get("flagged") == "Yes"]
    if not flagged:
        return {
            "answer": "No unexplained anomalies were found in the current analysis. All flagged route-weeks have documented justifications or no anomalies were detected.",
            "sources": [],
            "supported": True,
        }
    lines = [f"• {r['route']} — week of {r['week_of']} ({r['vs_own_history']}, {r['vs_similar_routes']})" for r in flagged[:10]]
    total = len(flagged)
    answer = f"Found {total} unexplained anomal{'y' if total == 1 else 'ies'} requiring human review:\n" + "\n".join(lines)
    if total > 10:
        answer += f"\n…and {total - 10} more."
    return {"answer": answer, "sources": ["analysis results"], "supported": True}


def _justified_routes(rows: list[dict[str, Any]], notes: list[dict[str, Any]]) -> dict[str, Any]:
    justified = [r for r in rows if r.get("flagged") == "No (justified)"]
    if not justified:
        return {
            "answer": "No anomalies with documented justification were found in the current analysis.",
            "sources": [],
            "supported": True,
        }
    note_map = {n["note_id"]: n for n in notes}
    lines = []
    sources = []
    for r in justified[:8]:
        nid = r.get("matched_note_id", "")
        note_info = note_map.get(nid)
        note_desc = note_info["note"][:80] + "…" if note_info and len(note_info["note"]) > 80 else (note_info["note"] if note_info else "")
        lines.append(f"• {r['route']} (week {r['week_of']}): supported by {nid} — {note_desc}")
        if nid:
            sources.append(f"Note {nid}")
    answer = f"Found {len(justified)} justified anomal{'y' if len(justified) == 1 else 'ies'}:\n" + "\n".join(lines)
    return {"answer": answer, "sources": list(set(sources)), "supported": True}


def _priority_routes(rows: list[dict[str, Any]]) -> dict[str, Any]:
    unexplained = [r for r in rows if r.get("flagged") == "Yes"]
    if not unexplained:
        return {
            "answer": "No unexplained anomalies found. All anomaly candidates have supporting evidence or no anomalies were detected.",
            "sources": [],
            "supported": True,
        }
    # Sort by own_history_pct descending (worst deviation first)
    unexplained.sort(key=lambda r: (r.get("own_history_pct") or 0), reverse=True)
    lines = []
    for i, r in enumerate(unexplained[:5], 1):
        pct = r.get("own_history_pct")
        pct_str = f"{pct:+.1f}% vs history" if pct is not None else "no history baseline"
        lines.append(f"{i}. {r['route']} — week {r['week_of']} ({pct_str})")
    answer = "Routes to investigate first (highest unexplained deviation):\n" + "\n".join(lines)
    return {"answer": answer, "sources": ["analysis results"], "supported": True}


def _peer_comparison_answer(question: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    route = _extract_route(question.lower())
    month = _extract_month(question.lower())
    year = _extract_year(question.lower())
    filtered = _filter_rows(rows, route, month, year)
    if not filtered:
        return {"answer": _not_found_msg(route, month, year), "sources": [], "supported": False}
    lines = [
        f"• {r['route']} week {r['week_of']}: {r['vs_similar_routes']} (peer avg ₹{r.get('peer_avg', 'N/A'):.2f}/tonne-km)"
        if r.get("peer_avg") else f"• {r['route']} week {r['week_of']}: {r['vs_similar_routes']}"
        for r in filtered[:5]
    ]
    return {"answer": "Peer comparisons:\n" + "\n".join(lines), "sources": ["analysis results"], "supported": True}


def _why_expensive(
    route: Optional[str], month: Optional[int], year: Optional[int],
    rows: list[dict[str, Any]], notes: list[dict[str, Any]]
) -> dict[str, Any]:
    filtered = _filter_rows(rows, route, month, year)
    if not filtered:
        return {"answer": _not_found_msg(route, month, year), "sources": [], "supported": False}

    note_map = {n["note_id"]: n for n in notes}
    lines = []
    sources = []
    for r in filtered:
        nid = r.get("matched_note_id", "")
        if r["flagged"] == "No (justified)" and nid:
            note_text = note_map.get(nid, {}).get("note", "")
            lines.append(
                f"• {r['route']} (week {r['week_of']}): {r['vs_own_history']}. "
                f"Justified by note {nid}: {note_text[:120]}…"
            )
            sources.append(f"Note {nid}")
        elif r["flagged"] == "Yes":
            lines.append(
                f"• {r['route']} (week {r['week_of']}): {r['vs_own_history']}. "
                f"UNEXPLAINED — no supporting note found. Warrants human review."
            )
        else:
            lines.append(
                f"• {r['route']} (week {r['week_of']}): cost was within normal range ({r['vs_own_history']})."
            )

    answer = "\n".join(lines) if lines else _not_found_msg(route, month, year)
    return {"answer": answer, "sources": list(set(sources)), "supported": True}


def _note_for_route(
    route: Optional[str], rows: list[dict[str, Any]], notes: list[dict[str, Any]]
) -> dict[str, Any]:
    note_map = {n["note_id"]: n for n in notes}
    matched = [r for r in rows if r.get("matched_note_id") and (not route or route.lower() in r["route"].lower())]
    if not matched:
        msg = f"No supporting notes found" + (f" for route {route}" if route else "") + "."
        return {"answer": msg, "sources": [], "supported": True}
    lines = []
    sources = []
    for r in matched[:5]:
        nid = r["matched_note_id"]
        note = note_map.get(nid)
        note_text = note["note"] if note else "Note not found."
        lines.append(f"• {r['route']} week {r['week_of']}: note {nid} — {note_text[:120]}")
        sources.append(f"Note {nid}")
    return {"answer": "Supporting evidence:\n" + "\n".join(lines), "sources": list(set(sources)), "supported": True}


def _cost_lookup(
    route: Optional[str], month: Optional[int], year: Optional[int],
    rows: list[dict[str, Any]]
) -> dict[str, Any]:
    filtered = _filter_rows(rows, route, month, year)
    if not filtered:
        return {"answer": _not_found_msg(route, month, year), "sources": [], "supported": False}
    lines = [
        f"• {r['route']} week {r['week_of']}: ₹{r['cost_per_tonne_km']:.4f}/tonne-km"
        for r in filtered[:10]
    ]
    return {"answer": "Cost per tonne-km:\n" + "\n".join(lines), "sources": ["analysis results"], "supported": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _matches(text: str, keywords: list[str]) -> bool:
    return any(kw in text for kw in keywords)


def _extract_route(text: str) -> Optional[str]:
    for r in KNOWN_ROUTES:
        if r.lower() in text:
            return r
    # Try "origin-destination" pattern
    m = re.search(r"([a-z]+)-([a-z]+)", text)
    if m:
        return f"{m.group(1).title()}-{m.group(2).title()}"
    return None


def _extract_month(text: str) -> Optional[int]:
    for name, num in _MONTHS.items():
        if name in text:
            return num
    return None


def _extract_year(text: str) -> Optional[int]:
    m = re.search(r"\b(20\d{2})\b", text)
    return int(m.group(1)) if m else None


def _filter_rows(
    rows: list[dict[str, Any]],
    route: Optional[str],
    month: Optional[int],
    year: Optional[int],
) -> list[dict[str, Any]]:
    result = rows
    if route:
        result = [r for r in result if route.lower() in r["route"].lower()]
    if month or year:
        def _week_matches(wk) -> bool:
            if isinstance(wk, str):
                try:
                    wk = date.fromisoformat(wk)
                except Exception:
                    return False
            if month and wk.month != month:
                return False
            if year and wk.year != year:
                return False
            return True
        result = [r for r in result if _week_matches(r["week_of"])]
    return result


def _not_found_msg(route: Optional[str], month: Optional[int], year: Optional[int]) -> str:
    parts = []
    if route:
        parts.append(f"route '{route}'")
    if month:
        month_names = {v: k.title() for k, v in _MONTHS.items() if len(k) > 3}
        parts.append(f"month {month_names.get(month, month)}")
    if year:
        parts.append(f"year {year}")
    if parts:
        return f"No analysis data found for {', '.join(parts)}. Please check the route name or date range."
    return "No relevant data found. Try specifying a route name or time period."
