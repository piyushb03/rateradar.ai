"""Deterministic anomaly detection.

A route-week is an anomaly CANDIDATE when its cost_per_tonne_km exceeds
an available baseline by more than the configured threshold (default 10%).

Own-history and peer baselines are evaluated INDEPENDENTLY.
A missing baseline is NOT treated as a zero or "not exceeded" baseline.

Flagged status:
  - "Yes"           — anomaly candidate with no valid supporting note.
  - "No (justified)" — anomaly candidate with a valid, applicable supporting note.
  - "No"            — no qualifying anomaly detected.
"""
from __future__ import annotations

import os
from typing import Any

DEFAULT_THRESHOLD_PCT = float(os.getenv("ANOMALY_THRESHOLD_PCT", "10.0"))


def classify(
    metrics: list[dict[str, Any]],
    baselines: dict,
    note_matches: dict,
    threshold_pct: float = DEFAULT_THRESHOLD_PCT,
) -> list[dict[str, Any]]:
    """Classify every route-week and assemble the full result rows.

    Args:
        metrics:     list of route-week metric dicts from aggregation.
        baselines:   dict keyed (route_key, week_of) → baseline info.
        note_matches: dict keyed (route_key, week_of) → NoteMatchResult-like dict.
        threshold_pct: anomaly threshold percentage (default 10%).

    Returns:
        list of dicts matching the AnalysisRow schema (plus extras).
    """
    rows: list[dict[str, Any]] = []

    for m in metrics:
        rk = m["route_key"]
        wk = m["week_of"]
        current_cost = m["cost_per_tonne_km"]
        bl = baselines.get((rk, wk), {})
        nm = note_matches.get((rk, wk), {"matched": False, "note_id": None, "reason": ""})

        own_pct = bl.get("own_history_pct")
        peer_pct = bl.get("peer_pct")
        own_avg = bl.get("own_history_avg")
        peer_avg = bl.get("peer_avg")

        # Anomaly candidate: EITHER baseline exceeds threshold
        is_candidate = False
        if own_pct is not None and own_pct > threshold_pct:
            is_candidate = True
        if peer_pct is not None and peer_pct > threshold_pct:
            is_candidate = True
        # If neither baseline exists, do not flag from missing information alone.

        # Determine flagged status
        if is_candidate and nm.get("matched"):
            flagged = "No (justified)"
            matched_note_id = nm.get("note_id", "")
            reason = nm.get("reason", "")
        elif is_candidate:
            flagged = "Yes"
            matched_note_id = ""
            reason = nm.get("reason", "") or _unexplained_reason(own_pct, peer_pct, own_avg, peer_avg, current_cost)
        else:
            flagged = "No"
            matched_note_id = ""
            reason = _normal_reason(own_pct, peer_pct)

        # Format the comparison strings
        vs_own = _format_pct(own_pct, "this route's past average")
        vs_peer = _format_pct(peer_pct, "similar-length routes this week")

        rows.append(
            {
                "route": m["route"],
                "week_of": wk,
                "cost_per_tonne_km": round(current_cost, 4),
                "vs_own_history": vs_own,
                "vs_similar_routes": vs_peer,
                "flagged": flagged,
                "matched_note_id": matched_note_id or "",
                "reason": reason,
                "route_type": m["route_type"],
                "route_key": rk,
                "own_history_avg": own_avg,
                "own_history_pct": round(own_pct, 2) if own_pct is not None else None,
                "peer_avg": peer_avg,
                "peer_pct": round(peer_pct, 2) if peer_pct is not None else None,
                "shipment_count": m.get("shipment_count", 0),
                "own_history_weeks": bl.get("own_history_weeks", 0),
                "peer_route_count": bl.get("peer_route_count", 0),
            }
        )

    # Deterministic sort: route_key, then week_of
    rows.sort(key=lambda r: (r["route_key"], str(r["week_of"])))
    return rows


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_pct(pct: float | None, label: str) -> str:
    if pct is None:
        return f"N/A (no baseline available for {label})"
    sign = "+" if pct >= 0 else ""
    return f"{sign}{round(pct, 1)}% vs {label}"


def _unexplained_reason(
    own_pct: float | None,
    peer_pct: float | None,
    own_avg: float | None,
    peer_avg: float | None,
    current: float,
) -> str:
    parts = []
    if own_pct is not None and own_pct > 0:
        parts.append(
            f"Cost is {round(own_pct, 1)}% above this route's 8-week average "
            f"(₹{round(own_avg, 2)}/tonne-km vs current ₹{round(current, 2)}/tonne-km)."
        )
    if peer_pct is not None and peer_pct > 0:
        parts.append(
            f"Also {round(peer_pct, 1)}% above similar-route peers this week "
            f"(peer avg ₹{round(peer_avg, 2)}/tonne-km)."
        )
    parts.append("No matching note found for this route or date range. Cost rise looks unexplained and warrants human review.")
    return " ".join(parts)


def _normal_reason(own_pct: float | None, peer_pct: float | None) -> str:
    parts = []
    if own_pct is not None:
        parts.append(f"Cost is within {round(abs(own_pct), 1)}% of historical average.")
    else:
        parts.append("No historical baseline available for own-route comparison.")
    if peer_pct is not None:
        parts.append(f"Peer deviation: {round(peer_pct, 1)}%.")
    else:
        parts.append("No peer baseline available.")
    return " ".join(parts) + " No anomaly detected."
