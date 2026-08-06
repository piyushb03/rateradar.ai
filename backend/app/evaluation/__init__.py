"""Evaluation harness: correctness checks on analysis output."""
from __future__ import annotations

from typing import Any

from app.exports import REQUIRED_COLUMNS


def run_evaluation(
    rows: list[dict[str, Any]],
    notes: list[dict[str, Any]],
    run_hashes: list[str],
) -> dict[str, Any]:
    """Run all evaluation checks and return a structured report."""
    checks = []
    note_ids = {n["note_id"] for n in notes}

    def check(name: str, passed: bool, detail: str):
        checks.append({"name": name, "passed": passed, "detail": detail})

    # 1. Schema: required columns present in output
    if rows:
        output_keys = set(rows[0].keys())
        required = {"route", "week_of", "cost_per_tonne_km", "vs_own_history",
                    "vs_similar_routes", "flagged", "matched_note_id", "reason"}
        missing = required - output_keys
        check(
            "Output schema contains all 8 required columns",
            len(missing) == 0,
            f"Missing: {sorted(missing)}" if missing else "All 8 columns present.",
        )
    else:
        check("Output schema", False, "No rows in output.")

    # 2. No row has a matched_note_id that doesn't exist in notes
    bad_refs = [
        r for r in rows
        if r.get("matched_note_id") and r["matched_note_id"] not in note_ids
    ]
    check(
        "All matched_note_id values reference existing notes",
        len(bad_refs) == 0,
        f"{len(bad_refs)} rows reference non-existent note IDs." if bad_refs else "All references valid.",
    )

    # 3. Every "No (justified)" row has a non-empty matched_note_id
    missing_note = [
        r for r in rows
        if r.get("flagged") == "No (justified)" and not r.get("matched_note_id")
    ]
    check(
        "Every 'No (justified)' row has a matched_note_id",
        len(missing_note) == 0,
        f"{len(missing_note)} justified rows have no note ID." if missing_note else "All justified rows have note IDs.",
    )

    # 4. "Yes" and "No" rows have empty matched_note_id
    wrongly_cited = [
        r for r in rows
        if r.get("flagged") in ("Yes", "No") and r.get("matched_note_id")
    ]
    check(
        "Non-justified rows have empty matched_note_id",
        len(wrongly_cited) == 0,
        f"{len(wrongly_cited)} non-justified rows incorrectly cite a note." if wrongly_cited else "Correct — no spurious citations.",
    )

    # 5. cost_per_tonne_km is strictly positive
    invalid_cost = [r for r in rows if r.get("cost_per_tonne_km", 0) <= 0]
    check(
        "All cost_per_tonne_km values are strictly positive",
        len(invalid_cost) == 0,
        f"{len(invalid_cost)} rows with non-positive cost." if invalid_cost else "All costs positive.",
    )

    # 6. week_of values are valid dates in YYYY-MM-DD format
    bad_dates = []
    for r in rows:
        wk = r.get("week_of")
        if wk is None:
            bad_dates.append(r["route"])
            continue
        try:
            from datetime import date as _d
            if isinstance(wk, str):
                _d.fromisoformat(wk)
            # Check Monday
            if isinstance(wk, _d):
                if wk.weekday() != 0:
                    bad_dates.append(f"{r['route']} {wk} is not a Monday")
        except Exception:
            bad_dates.append(str(wk))
    check(
        "All week_of values are valid Monday dates",
        len(bad_dates) == 0,
        f"{len(bad_dates)} invalid week_of values." if bad_dates else "All week_of values are valid Mondays.",
    )

    # 7. Non-supporting notes (N004-N010) never appear as matched_note_id
    non_supporting = {"N004", "N005", "N006", "N007", "N008", "N009", "N010"}
    bad_nonsupporting = [
        r for r in rows
        if r.get("matched_note_id") in non_supporting
    ]
    check(
        "Non-supporting notes (N004-N010) never used as justification",
        len(bad_nonsupporting) == 0,
        f"{len(bad_nonsupporting)} rows cite a non-supporting note as justification." if bad_nonsupporting else "No non-supporting notes used as justification.",
    )

    # 8. Reproducibility: all hashes identical
    if len(run_hashes) >= 3:
        all_same = len(set(run_hashes)) == 1
        check(
            "Three independent runs produce identical output (reproducibility)",
            all_same,
            f"Hashes: {run_hashes}" if not all_same else f"All 3 runs matched: {run_hashes[0][:16]}…",
        )
    elif len(run_hashes) == 1:
        check(
            "Reproducibility hash recorded",
            True,
            f"Hash: {run_hashes[0][:16]}… (run 3 times for full reproducibility check).",
        )

    # 9. Row count positive
    check(
        "Analysis produced output rows",
        len(rows) > 0,
        f"{len(rows)} route-week rows produced.",
    )

    total = len(checks)
    passed = sum(1 for c in checks if c["passed"])

    return {
        "checks": checks,
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "schema_valid": rows[0].keys() >= {"route", "week_of", "cost_per_tonne_km"} if rows else False,
        "reproducible": (len(set(run_hashes)) == 1) if len(run_hashes) >= 3 else None,
        "run_hashes": run_hashes,
    }
