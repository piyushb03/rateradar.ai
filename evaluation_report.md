# RateRadar — Evaluation & Correctness Report

**Assessment:** FreightTiger Software Engineering Intern Case Study  
**Verification Date:** 2026-10-15  
**Total Checks Executed:** 9 automated harness checks + 27 pytest integration unit tests  
**Overall Result:** **ALL 9/9 HARNESS CHECKS PASSED — 27/27 UNIT TESTS PASSED**

---

## 1. Automated Evaluation Harness Checks

The evaluation module (`app.evaluation.run_evaluation`) automatically executes the following validation rules over the generated output:

| # | Invariant / Validation Rule | Result | Verification Detail |
|:---:|:---|:---:|:---|
| **1** | **Output schema contains all 8 required columns** | **PASS** | Exactly `route, week_of, cost_per_tonne_km, vs_own_history, vs_similar_routes, flagged, matched_note_id, reason` present in exact order. |
| **2** | **All matched_note_id values reference existing notes** | **PASS** | Every cited note exists in the source note catalog (`N001`–`N010`). |
| **3** | **Every 'No (justified)' row has a matched_note_id** | **PASS** | 100% of the 12 justified anomaly rows cite an applicable note ID. |
| **4** | **Non-justified rows have empty matched_note_id** | **PASS** | All 78 'Yes' (unexplained) and 638 'No' (normal) rows have blank note IDs. No spurious citations. |
| **5** | **All cost_per_tonne_km values are strictly positive** | **PASS** | Validated across all 728 route-week records. |
| **6** | **All week_of values are valid Monday dates** | **PASS** | All dates are formatted `YYYY-MM-DD` and strictly fall on Mondays (ISO 8601 week start). |
| **7** | **Non-supporting notes (N004–N010) never used as justification** | **PASS** | Zero occurrences of non-supporting notes in `matched_note_id`. Notes stating stable conditions, road improvements, absorbed costs, or unaffected routes are strictly prevented from justifying rate hikes. |
| **8** | **Three-run reproducibility** | **PASS** | Three independent executions yielded identical SHA-256 hash `f013690e1986a437bebbc5b4b7014616fdc9040239484d6c4d95e06d5694d20f`. |
| **9** | **Output volume & completeness** | **PASS** | Generated 728 distinct route-week rows covering all 6 routes across the full timeline. |

---

## 2. Unit & Integration Test Suite Summary

Executed via `pytest` under Python 3.13:
- **`tests/test_aggregation.py`** (5 tests): Monday derivation, weighted aggregation formula ($SUM(cost)/SUM(qty \times dist)$), directional route isolation.
- **`tests/test_baselines.py`** (3 tests): Strict 8-week prior rolling window, first-week zero history handling, peer baseline calculation excluding current route.
- **`tests/test_detection.py`** (3 tests): Unexplained anomaly candidate, justified anomaly with note, normal week threshold check.
- **`tests/test_retrieval.py`** (3 tests): Non-supporting note exclusions, N001 flood temporal bounds (Feb 24 – Mar 8, 2025), route applicability checking.
- **`tests/test_exports.py`** (2 tests): Exact 8-column header, formula injection sanitization while preserving valid signed percentages.
- **`tests/test_ingestion.py`** (4 tests): CSV column checks, negative value validation, malformed date rejection, note parser.
- **`tests/test_pipeline_reproducibility.py`** (2 tests): End-to-end multi-run SHA-256 hash matching, evaluation harness validation.
- **`tests/test_api_endpoints.py`** (5 tests): Health check, demo data loading, analysis run, assistant question answering, CSV download endpoint.

**Test Execution Time:** ~31 seconds  
**Total Passed:** 27 / 27 (100%)
