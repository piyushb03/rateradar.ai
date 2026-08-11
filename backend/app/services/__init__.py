"""Main analysis orchestration service."""
from __future__ import annotations

import hashlib
import json
from datetime import date
from typing import Any

from app.ingestion import parse_shipments, parse_notes
from app.aggregation import compute_weekly_metrics
from app.baselines import compute_baselines
from app.retrieval import retrieve_note_matches
from app.detection import classify, DEFAULT_THRESHOLD_PCT
from app.exports import generate_csv


def run_analysis(
    shipments: list[dict[str, Any]],
    notes: list[dict[str, Any]],
    threshold_pct: float = DEFAULT_THRESHOLD_PCT,
) -> dict[str, Any]:
    """Run the complete analytical pipeline.

    Returns a dict with:
        results (list[dict]), run_info (dict), csv_content (str)
    """
    # 1. Aggregate weekly metrics
    metrics = compute_weekly_metrics(shipments)

    # 2. Compute baselines
    baselines = compute_baselines(metrics)

    # 3. Retrieve note matches
    note_matches = retrieve_note_matches(metrics, notes)

    # 4. Classify
    rows = classify(metrics, baselines, note_matches, threshold_pct)

    # 5. Collect run info
    anomaly_candidates = [r for r in rows if r["flagged"] != "No"]
    justified = [r for r in rows if r["flagged"] == "No (justified)"]
    unexplained = [r for r in rows if r["flagged"] == "Yes"]

    dates = [s["shipment_date"] for s in shipments]
    date_start = str(min(dates)) if dates else None
    date_end = str(max(dates)) if dates else None

    unique_routes = len({r["route_key"] for r in rows})

    run_info = {
        "input_shipments": len(shipments),
        "valid_shipments": len(shipments),
        "invalid_shipments": 0,
        "input_notes": len(notes),
        "valid_notes": len(notes),
        "route_week_count": len(rows),
        "anomaly_threshold_pct": threshold_pct,
        "anomaly_candidates": len(anomaly_candidates),
        "justified_anomalies": len(justified),
        "unexplained_anomalies": len(unexplained),
        "routes_analyzed": unique_routes,
        "date_range_start": date_start,
        "date_range_end": date_end,
        "llm_calls": 0,
        "llm_input_tokens": 0,
        "llm_output_tokens": 0,
        "llm_cost_usd": 0.0,
        "llm_note": (
            "Core analysis uses deterministic TF-IDF/rule-based retrieval only; "
            "no external LLM API is required or called."
        ),
    }

    # 6. Generate CSV
    csv_content = generate_csv(rows)

    # 7. Compute reproducibility hash
    run_hash = _hash_output(rows)

    return {
        "results": rows,
        "run_info": run_info,
        "csv_content": csv_content,
        "run_hash": run_hash,
    }


def _hash_output(rows: list[dict[str, Any]]) -> str:
    """SHA-256 of the serialized required output for reproducibility checking."""
    def _serialize(r: dict) -> str:
        return json.dumps(
            {
                "route": r["route"],
                "week_of": str(r["week_of"]),
                "cost_per_tonne_km": f"{r['cost_per_tonne_km']:.4f}",
                "vs_own_history": r["vs_own_history"],
                "vs_similar_routes": r["vs_similar_routes"],
                "flagged": r["flagged"],
                "matched_note_id": r.get("matched_note_id", ""),
                "reason": r["reason"],
            },
            sort_keys=True,
        )

    combined = "\n".join(_serialize(r) for r in rows)
    return hashlib.sha256(combined.encode()).hexdigest()
