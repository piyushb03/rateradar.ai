# RateRadar — 10-Minute Technical Interview Walkthrough

**Role:** Freight Cost Intelligence Engineering  
**Application:** RateRadar (FreightTiger Case Study)  
**Live URL / Port:** `http://localhost:8000` (Production single-service) or `http://localhost:5173` (Vite dev)

---

## Walkthrough Timeline

### Minute 0–1: Problem Statement & Product Vision
- **Objective:** Introduce the freight cost variance dilemma.
- **Talking Points:**
  - In freight operations, rate spikes happen constantly due to fuel price changes, detours, seasonal festivals, or carrier surcharges.
  - The core problem: distinguishing **unjustified/suspicious rate hikes** that require procurement investigation from **operationally justified rate adjustments** backed by hard evidence.
  - RateRadar delivers deterministic freight calculations paired with an evidence-grounded retrieval system that guarantees mathematical correctness, zero hallucination, and full financial audibility.

### Minute 1–2: Architecture & Data Ingestion
- **Objective:** Showcase data loading, schema validation, and security hygiene.
- **Actions in App:**
  - Navigate to **Data** (`/data`).
  - Demonstrate "Load Demo Dataset" or drag-and-drop shipment/notes CSVs.
  - Highlight the column validation checks, duplicate ID prevention, and row error reporting.
  - Note: File size limits (50MB) and in-memory session locking prevent concurrent request data contamination.

### Minute 2–4: Deep-Dive into Analytical Contract (§5)
- **Objective:** Prove mathematical rigor and exact compliance with FreightTiger rules.
- **Talking Points & Code References:**
  - **Unit Cost Formula:** $\frac{\sum \text{freight\_cost\_inr}}{\sum (\text{quantity\_tonnes} \times \text{distance\_km})}$. Emphasize that we do NOT take an unweighted average of individual shipment ratios.
  - **Weekly Grouping:** ISO weeks starting on Monday (`week_of` strictly set to the Monday date).
  - **Directional Route Isolation:** `Mumbai-Pune` is distinct from `Pune-Mumbai`.
  - **Rolling 8-Week History:** Strict interval $[t-8\text{ weeks}, t)$ with zero look-ahead bias. Handled gracefully when $<8$ weeks of prior observations exist.
  - **Peer Comparison:** Arithmetic mean of other distinct routes in the *same week* with the *same route_type*, explicitly excluding the route itself.

### Minute 4–6: Anomaly Detection & Evidence Retrieval (§6)
- **Objective:** Demonstrate the difference between 'Yes', 'No (justified)', and 'No'.
- **Actions in App:**
  - Navigate to **Route Analysis** (`/routes`).
  - Filter by verdict **"Unexplained (Yes)"**: Point to `Delhi-Jaipur` in week `2024-11-11` (+35.5% vs history, +21.0% vs peers). No note matches. Flagged for review.
  - Filter by verdict **"Justified (No (justified))"**: Point to `Ahmedabad-Mumbai` in week `2025-01-20` (+29.5% vs history). Matched with note `N002` (regional festival surcharge).
  - Inspect **Normal ("No")**: Cost is within $\pm 10\%$ baseline threshold.
  - **Show Route Slide-in Detail Panel:** Click any row to reveal historical time-series chart and calculation audit trail.

### Minute 6–7: Evidence Explorer & Strict Negative Constraints
- **Objective:** Highlight the critical invariant that prevents non-supporting notes from justifying cost increases.
- **Actions in App:**
  - Navigate to **Evidence** (`/evidence`).
  - Show the 10 context notes:
    - `N001` (Chennai-Bangalore flooding): Only applies Feb 24 – Mar 8, 2025.
    - `N003` (Diesel increase): Nationwide, bounded to active weeks from May 5, 2025.
    - `N004`–`N010`: Marked as **Non-Supporting**. Emphasize that notes citing road improvements (`N007`), stable demand (`N006`), absorbed tracking costs (`N010`), or unaffected corridors (`N005`) are hard-filtered out and can *never* justify an anomaly.

### Minute 7–8: Natural-Language Q&A & Transparency (§7)
- **Objective:** Demonstrate verifiable question answering without an opaque generative model.
- **Actions in App:**
  - Navigate to **Ask** (`/ask`).
  - Click suggested inquiries:
    - *"Why did Chennai-Bangalore become expensive in February 2025?"* -> Cites note `N001` flood disruption.
    - *"Which routes should an analyst investigate first?"* -> Ranks top unexplained anomalies by deviation.
    - *"Which routes have unexplained increases?"* -> Lists unresolved routes requiring human review.
  - Highlight the operational cost: **0 external LLM API calls, $0.00 cost, zero data leakage**.

### Minute 8–9: Evaluation Harness & Reproducibility (§14 & §15)
- **Objective:** Walk through the verification evidence.
- **Actions in App:**
  - Navigate to **Run Report** (`/run`).
  - Point to the **9/9 Evaluation Harness Checks** table.
  - Show the **Three-Run SHA-256 Hash**: `f013690e1986a437bebbc5b4b7014616fdc9040239484d6c4d95e06d5694d20f`.
  - Click **Download Required CSV** to verify the exact 8-column schema and minimal safe CSV escaping.

### Minute 9–10: Production Architecture & Known Trade-offs
- **Objective:** Discuss scalability, security, and future enhancements.
- **Talking Points:**
  - Single-container Docker deployment (`Dockerfile` multi-stage build serving React static assets directly through FastAPI).
  - Security posture: File type validation, 50MB max upload, CSV formula injection neutralization, no secrets in Git.
  - Trade-offs: In-memory session vs PostgreSQL (chosen for zero-dependency assessment portability; in enterprise production, a Redis task queue and Postgres timeseries store would back multi-tenant historical analysis).
