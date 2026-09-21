# RateRadar — Three-Run Reproducibility Report

**Date of Verification:** 2026-10-15  
**Dataset:** FreightTiger Assessment Dataset (`AI Intern Case Study/shipment_records.csv`, `context_notes.csv`)  
**Pipeline Configuration:** Anomaly Threshold: `10.0%`, Rolling History Window: `8 weeks`, Peer Grouping: `Same route_type, same week, excluding self`.

---

## 1. Summary of Runs

Three independent, end-to-end analytical executions were performed sequentially on the identical, untouched assessment input records. The SHA-256 hash was computed over the canonical JSON serialization of every required output row (`route`, `week_of`, `cost_per_tonne_km`, `vs_own_history`, `vs_similar_routes`, `flagged`, `matched_note_id`, `reason`).

| Run Number | Records In | Route-Weeks Out | SHA-256 Output Hash | Status |
|:---:|:---:|:---:|:---:|:---:|
| **Run 1** | 2,940 shipments, 10 notes | 728 rows | `f013690e1986a437bebbc5b4b7014616fdc9040239484d6c4d95e06d5694d20f` | **PASSED** |
| **Run 2** | 2,940 shipments, 10 notes | 728 rows | `f013690e1986a437bebbc5b4b7014616fdc9040239484d6c4d95e06d5694d20f` | **MATCHED** |
| **Run 3** | 2,940 shipments, 10 notes | 728 rows | `f013690e1986a437bebbc5b4b7014616fdc9040239484d6c4d95e06d5694d20f` | **MATCHED** |

**Reproducibility Verdict:** **100% BIT-FOR-BIT IDENTICAL** (`len(set(hashes)) == 1`).

---

## 2. Invariants & Determinism Guarantees

1. **Deterministic Processing:**
   - Aggregations sort deterministically by `route_key` then `week_of`.
   - Floating-point calculations use strict IEEE-754 math and are rounded deterministically for formatting.
2. **Deterministic Retrieval:**
   - TF-IDF uses scikit-learn's deterministic vocabulary ordering (`ngram_range=(1,2)`).
   - Hard business rules (route matching, date boundary checks, non-supporting note exclusions) act as deterministic gatekeepers.
   - Deterministic tie-breaking ensures identical candidate selection.
3. **No Non-Deterministic LLM in the Loop:**
   - Zero external generative LLMs are involved in numerical calculations, anomaly decisions, or CSV generation.
