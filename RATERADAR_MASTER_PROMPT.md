# MASTER BUILD PROMPT — FREIGHTTIGER RATERADAR

## 1. Your Role and Mission

Act as a senior cross-functional product engineering team comprising:

- A senior software architect responsible for architecture, scalability, maintainability, and deployment.
- A senior frontend engineer responsible for a polished, accessible, responsive user experience.
- A senior backend and data engineer responsible for accurate freight-cost calculations and reliable data processing.
- An applied AI/RAG engineer responsible for evidence-grounded note retrieval and natural-language explanations.
- A security engineer responsible for file-upload safety, API security, privacy, and production hardening.
- A QA and data-quality engineer responsible for deterministic calculations, edge cases, evaluation evidence, and reproducibility.
- A product designer responsible for a distinctive, professional logistics analytics interface.

Your assignment is to build **RateRadar — Freight Cost Intelligence**, a complete web application for the FreightTiger Software Engineering Intern case study.

This must be a functional software product, not a landing-page prototype, static dashboard, generic AI chatbot, or collection of disconnected UI components.

Think through the architecture, data model, calculations, evidence retrieval, UX, security controls, and deployment trade-offs before implementation. Make sensible engineering decisions independently. Do not stop after presenting an implementation plan; implement the application in the current project.

The finished application must be suitable for a live demonstration, technical code review, and a 10-minute interview walkthrough.

## 2. First: Inspect the Existing Project and Assessment Files

Before making changes:

1. Inspect the current working directory, repository structure, package manifests, existing source code, and Git status.
2. Locate and inspect these assessment files:
   - `shipment_records.csv`
   - `context_notes.csv`
   - `sample_output_format_v2.csv`
   - `FreightTiger_Intern_CaseStudy.pdf`
3. Read the complete case study rather than relying only on its heading or summary.
4. Inspect the actual headers, representative records, data types, missing values, and date ranges in the CSV files.
5. Read any existing README and configuration files.
6. Preserve working existing functionality whenever practical. Do not blindly replace a usable repository with a new scaffold.

The shipment dataset uses these fields:

`shipment_id, origin, destination, route_type, material, quantity_tonnes, distance_km, freight_cost_inr, shipment_date, transporter`

The notes dataset uses:

`note_id, date, applies_to, note`

The required output schema is exactly:

`route, week_of, cost_per_tonne_km, vs_own_history, vs_similar_routes, flagged, matched_note_id, reason`

Important: the provided output-format CSV contains illustrative rows whose natural-language fields are not consistently escaped despite containing commas. Treat its eight-column header as the authoritative output schema, inspect the example values to understand their intended semantics, and generate a properly escaped, valid CSV. Do not copy malformed sample rows into the final output.

Never fabricate missing datasets, assessment results, or evidence. If a required input is absent from the working environment, implement the appropriate upload functionality and explain the limitation instead of pretending the data was processed.

## 3. Product Vision

Build a modern freight analytics workspace that helps a logistics or finance team answer:

- Which routes experienced unusual cost increases?
- What was the cost per tonne-kilometre for each route in each week?
- How does that rate compare with the route's recent history?
- How does it compare with similar-length routes in the same week?
- Is there an actual documented business reason for the increase?
- Which contextual note supports the conclusion?
- Which anomalies need human investigation?
- How can a reviewer reproduce and verify the result?
- What do the findings mean when a user asks a question in plain English?

The application must distinguish a suspicious cost increase from a documented and justified increase. A nearby note, a semantically similar note, or a plausible business explanation is not sufficient evidence.

Product identity: **RateRadar**.

Product positioning: **See the signals behind every freight-rate change.**

The interface should convey operational intelligence, financial accountability, and confidence in the underlying data. Avoid exaggerated claims such as guaranteed savings, perfect accuracy, or fully autonomous decision-making.

## 4. Recommended Architecture

First inspect whether the existing repository already has a suitable stack. Preserve it when reasonable. Otherwise, use this practical architecture:

### Frontend
- React
- TypeScript with strict type checking
- Vite
- Tailwind CSS
- A well-maintained accessible component system or small, reusable custom components
- A reliable charting library for time-series and comparison visualizations
- Typed API client, structured loading states, error states, and reusable data hooks

### Backend
- Python
- FastAPI
- Pydantic request and response validation
- Pandas or an equally reliable tabular processing approach for the analytical pipeline
- Pytest for focused backend and calculation tests
- Scikit-learn TF-IDF or another lightweight, local retrieval method if it improves contextual-note retrieval

Do not add unnecessary databases, microservices, message queues, cloud accounts, paid APIs, or complicated infrastructure for a small, fixed assessment dataset.

### Deployment architecture

Prefer a simple, independently understandable application that can run as one deployable service.

In production, build the frontend into static assets and serve those assets from the backend where practical. Provide a documented Docker deployment path and a conventional non-Docker development path.

All source code and deployment configuration must be included in the repository. The application must not depend on files manually created outside the repository, undocumented shell commands, private local paths, or code that only exists in the development environment.

Include appropriate dependency manifests, lockfiles where supported, a Dockerfile, an environment-variable example, a health endpoint, and clear deployment instructions.

No external LLM API key should be necessary for the core analysis, contextual evidence retrieval, CSV download, or basic question-answering workflow.

## 5. Non-Negotiable Analytical Contract

The FreightTiger brief is the authority for the calculations.

Do not replace its definitions with a different statistical methodology merely because that methodology is more fashionable.

### 5.1 Route identity

Group records by:

- Exact origin
- Exact destination
- The supplied `route_type` field

The route type is already provided as Short, Medium, or Long. Do not derive it from the distance.

Treat origin-to-destination as a directional route. Do not silently combine A-to-B with B-to-A.

Normalize surrounding whitespace in text fields where appropriate, but do not merge different cities or routes based on fuzzy matching.

For presentation and CSV output, use the route representation:

`origin-destination`

Keep the internal route identity separate from the human-readable display label.

### 5.2 Week calculation

Weeks run Monday through Sunday.

Derive `week_of` from `shipment_date` by finding the Monday of that shipment's week.

For example, a shipment dated Wednesday, 2025-02-26, belongs to week `2025-02-24`.

Requirements:

- Parse dates consistently.
- Use `YYYY-MM-DD` for `week_of`.
- Handle weeks spanning months and years correctly.
- Do not group by month, ISO week number alone, or shipment date.
- Never use information from a future week to compute the current week's history baseline.

### 5.3 Weekly cost per tonne-kilometre

For each route, route type, and week, calculate:

`cost_per_tonne_km = SUM(freight_cost_inr) / SUM(quantity_tonnes * distance_km)`

Aggregate the shipment amounts and shipment quantity-distance products first. Do not take an unweighted average of the individual shipment-level cost ratios.

Use the full-precision result for all subsequent calculations. Round only when displaying or serializing the required reported figure.

Validate that quantities and distances are finite and strictly positive and that freight costs are valid non-negative amounts under the dataset's rules.

Invalid rows must generate a clear validation error or be excluded under a documented policy. Never silently substitute zero for missing or invalid quantities, distances, dates, or prices.

### 5.4 Own-history comparison

For the current route-week, calculate the average weekly cost per tonne-km from the **eight calendar weeks strictly preceding the current week**.

Use the interval:

`[current_week_of - 8 weeks, current_week_of)`

Use available valid historical weekly route metrics within that interval. Do not include the current week, use future data, fill missing weeks with fabricated values, or extrapolate missing observations.

If the route has fewer than eight preceding weeks of available data, use the valid observations available and explain the limited history in the README.

If no valid historical observation exists, return an explicit unavailable value. Never divide by zero or invent a historical baseline.

Calculate the percentage difference as:

`((current_cost / own_history_average) - 1) * 100`

The own-history comparison displayed in the required CSV must retain a clear text format, such as:

`+35.5% vs this route's past average`

Negative values must have the correct sign. Round percentages for presentation only.

### 5.5 Similar-route comparison

For each current week:

1. Calculate the weekly cost metric for each distinct route.
2. Identify other routes that have the same `route_type`.
3. Use their cost-per-tonne-km metrics from the same week.
4. Exclude the current route from the comparison.
5. Calculate the arithmetic mean of the remaining route-level metrics.

Do not average shipment records from other routes directly. Do not include the route itself in the peer average.

Calculate:

`((current_cost / peer_average) - 1) * 100`

Format the result clearly, for example:

`+21.0% vs similar-length routes this week`

If no valid peer route exists, report that the baseline is unavailable. Do not substitute a different route type or use data from another week.

### 5.6 Flagging rule

The brief does not prescribe a numeric anomaly threshold. Therefore, make the threshold explicit, configurable, and documented instead of pretending it was supplied by FreightTiger.

Use a default positive deviation threshold of **10%** and expose it through configuration or an equivalent clearly identified business-rule setting.

A route-week becomes an anomaly candidate when its current cost is more than the configured threshold above an available comparison baseline.

Evaluate the own-history and peer baselines independently. A missing baseline must not be treated as a zero-valued baseline. If neither baseline is available, do not declare an anomaly solely from missing information.

Document the rationale and trade-offs associated with the default threshold. Do not secretly change thresholds to manipulate the sample output.

### 5.7 The meaning of `flagged`

Preserve the values illustrated by the assessment's output-format examples:

- `Yes`: an anomaly candidate with no valid supporting note. This requires human review.
- `No (justified)`: an anomaly candidate with an applicable, genuinely supporting note.
- `No`: no qualifying anomaly was detected.

An increase with a plausible but inapplicable note must remain unexplained.

A normal cost week must not be labelled justified simply because an event note exists for that route.

Do not use vague or contradictory descriptions of these states in the UI, API, README, or CSV.

## 6. Evidence-Grounded Context Retrieval

Implement a deterministic retrieval pipeline over the supplied `context_notes.csv`.

Do not simply ask a generative model to select a note based on semantic similarity and accept its conclusion.

Use a transparent, hybrid process:

1. Retrieve candidate notes using relevant text, route references, and business context.
2. Validate route applicability through structured matching.
3. Validate temporal applicability using the note's date and explicitly supported period.
4. Check that the note actually states a reason that could justify increased costs.
5. Exclude notes that contradict the proposed explanation.
6. Produce a verdict and concise explanation from accepted evidence only.
7. Record the exact `note_id` used for every justified verdict.

A vector database is not required for ten short notes. Choose a lightweight method that is explainable, reproducible, deployment-friendly, and proportionate to the dataset.

If you implement TF-IDF, BM25, or an alternative retrieval mechanism, keep relevance ranking separate from the final eligibility rules. A high similarity score must never override an incorrect route, wrong date, or contradictory note.

### Mandatory note interpretation

Respect the actual contents of these provided notes:

- **N001 — Chennai-Bangalore:** Flooding disrupted movement from February 24 through March 8, 2025, causing detours and higher trip costs. Roads were passable again from March 9. Do not extend the disruption beyond the supported period.
- **N002 — Ahmedabad-Mumbai:** A regional festival week involved a temporary surcharge because of demand and limited truck availability. The note is route-specific and temporary.
- **N003 — All Routes:** Diesel prices rose nationwide starting the week of May 5, 2025, with approximately 5–7% higher transportation costs. Match the stated scope and timeframe; do not assume an unlimited period of impact without evidence.
- **N004 — All Routes:** The affected toll routes are explicitly stated not to be part of this dataset. This note cannot justify an increase on a dataset route.
- **N005 — Mumbai-Delhi:** The highway maintenance note explicitly states that costs were not significantly affected. Do not use it as justification for a cost increase.
- **N006 — All Routes:** Stable demand and no major disruptions were reported. This is not evidence that a cost increase was justified.
- **N007 — Delhi-Jaipur:** Road conditions improved after resurfacing. Do not convert an improvement in road conditions into an invented cause of higher costs.
- **N008 — Kolkata-Bhubaneswar:** No significant disruption was reported and freight movement remained normal. Do not use this as evidence for a cost increase.
- **N009 — Chennai-Bangalore:** The note states that the route returned to normal after flood-related repairs. Do not use it to justify a later unexplained rise.
- **N010 — All Routes:** Vehicle-tracking compliance costs were absorbed by transporters without a rate change. Do not claim that this caused higher customer freight rates.

Use these interpretations as hard evidence constraints. Do not rewrite the supplied notes to make them support a conclusion.

### Temporal matching rules

Use explicit dates and durations from the note text wherever available.

For a temporary event, limit applicability to the stated period. For a note with a start date but no explicit end date, do not automatically assume that its effect continues indefinitely.

Only justify a route-week when its timing is supported by the note.

An `All Routes` scope means the note may be considered across route identities only when its actual statement supports the relevant change in cost. It does not automatically make every note applicable to every route.

When multiple notes are eligible, apply a deterministic ranking and tie-breaking rule. Record the single best-supported note in `matched_note_id`, unless the output contract is deliberately extended elsewhere. Never put an unrelated note ID into the required CSV.

### Evidence and verdict invariants

- Every `No (justified)` row must have a non-empty `matched_note_id`.
- Every such ID must exist in the supplied notes.
- The cited note must apply to the correct route and time.
- The cited note must actually support a relevant cost increase.
- `Yes` and `No` rows must leave `matched_note_id` blank.
- A note stating no impact, stable conditions, improved conditions, or absorbed costs cannot become positive justification.
- If no supporting note exists, say so directly and recommend human review where appropriate.

Generate explanations from the source note and calculated data. Do not add unsupported claims about fuel prices, weather, tolls, demand, or transporters.

## 7. Meaningful Assistant and Natural-Language Questions

Build the intelligence around reliable analysis and evidence retrieval, not around adding an AI label to ordinary interface components.

Include a natural-language question panel that supports questions such as:

- Why did the Chennai-Bangalore route become more expensive in a particular month?
- Which routes have unexplained increases?
- Which increases have supporting evidence?
- What was the peer comparison for a specific week?
- What evidence supports this route's verdict?
- Which routes should an analyst investigate first?

Answers must be derived from the actual analysis output and retrieved source notes.

Use a constrained question-answering layer: identify the route, timeframe, intent, and relevant analytical records, then build a response using the retrieved facts. Use source references and exact note IDs when applicable.

If the question is ambiguous, ask for clarification. If the analysis or notes do not support an answer, say so instead of guessing.

You may introduce an optional language-model adapter for richer question interpretation, but the core analysis and verdicts must remain independent of it.

No API key, model download, or external inference service should be required for the default local demo.

Do not describe a TF-IDF or rule-based retrieval layer as a generative LLM. Document the actual approach honestly.

## 8. Required Application Experience

Build a complete, usable product with meaningful navigation and consistent design.

### A. Overview dashboard

Include:

- A clear product header and navigation.
- Selected analysis period.
- Number of route-week records analyzed.
- Number of anomaly candidates.
- Number of justified anomalies.
- Number of unexplained anomalies awaiting review.
- Routes or weeks with the most significant cost increases.
- A trend chart showing cost-per-tonne-km over time.
- A clearly labelled explanation of how an anomaly is defined.
- A prominent way to open the full route analysis.

These values must be derived from actual calculation results. Never hardcode statistics or fake chart data to make the interface impressive.

### B. Route analysis

Build an interactive results table containing the required fields and a usable presentation of additional context.

Support:

- Search by origin and destination.
- Filtering by route type, week, verdict, and evidence status.
- Sorting by cost, historical deviation, peer deviation, and week.
- Pagination or sensible virtualization.
- Clear loading, no-result, error, and incomplete-data states.
- A useful route-detail panel showing the relevant calculations and historical trend.
- A way to inspect any cited note in its original wording.

Make the difference between an unexplained anomaly, a justified anomaly, and a normal week immediately understandable.

### C. Evidence explorer

Provide a dedicated view showing:

- Note ID.
- Note date.
- Applicability.
- Original note text.
- Whether the note matched an anomaly.
- Which route-week used it.
- Why the note was accepted or rejected.

Distinguish "retrieved candidate" from "accepted supporting evidence."

A rejected note must not appear as if it justified the anomaly.

### D. Data import and validation

Allow a reviewer to import shipment and note CSVs.

Include:

- File selection and clear format instructions.
- Required-column checks.
- Date and number validation.
- Helpful row-level validation errors.
- Invalid-record counts and a clear processing summary.
- Safe handling of duplicate shipment IDs and duplicate records.
- A confirmation step before replacing the active analysis.
- A way to load the supplied demonstration dataset.

Never silently change the source files. Use an immutable input snapshot or equivalent isolation for each analysis run.

### E. Analysis execution and exports

Provide a clear action to run the analysis.

Display the processing state and a truthful completion summary.

Allow the user to download the required CSV generated by the real analytical pipeline.

The downloadable CSV must contain exactly these columns, in exactly this order:

`route,week_of,cost_per_tonne_km,vs_own_history,vs_similar_routes,flagged,matched_note_id,reason`

Do not append internal IDs, confidence scores, route types, timestamps, or other additional columns to this required assessment CSV.

Keep any extra debugging or audit information in a separate file or view.

### F. Run transparency

Expose a compact run-information section with:

- Input record count.
- Valid and invalid record counts.
- Route-week count.
- Analysis configuration and anomaly threshold.
- Historical or peer baseline availability.
- Evaluation result.
- Reproducibility status.
- LLM call count and token/cost information, where applicable.

The interface should help a reviewer understand the result instead of hiding the calculations behind an opaque assistant.

### G. Application states

Design meaningful states for first-time use, loading, completed analysis, zero anomalies, missing history, unavailable peer baselines, invalid inputs, and server errors.

Disable actions that cannot currently be performed and explain why.

Do not use fake progress indicators, fabricated success messages, or controls that look functional but do nothing.

## 9. Primary UI/UX Reference: Joblet.ai — High-Fidelity Visual Translation

**Primary reference:** https://joblet.ai/

The previous approach of treating Joblet.ai as a vague source of inspiration is not sufficient. Treat it as the principal visual reference for RateRadar. Closely reproduce its observable layout patterns, visual hierarchy, interface density, typography hierarchy, search/form treatments, card compositions, section pacing, and responsive behavior—translated to freight analytics and using RateRadar's own brand and data.

The goal is a high-fidelity visual translation, not a generic admin dashboard. Build the equivalent components and layouts for RateRadar rather than merely mentioning Joblet.ai in the design brief.

Do not copy Joblet's logo, name, proprietary illustrations, job data, marketing wording, or source code. Recreate the visible design principles and comparable component geometry with RateRadar labels and the real freight-analysis workflow.

### 9.1 Required reference-site reconnaissance before UI implementation

Before designing the frontend, perform a focused, read-only audit of the public reference website:

- Homepage: `https://joblet.ai/`
- Job listings/search: `https://joblet.ai/jobs`
- Employer-facing page: `https://joblet.ai/employers`
- About page: `https://joblet.ai/about-us`

Use the tools that are actually available in the environment. If a browser or screenshot capability is available, it may be used **only to inspect Joblet.ai**, not to test or capture RateRadar. Capture reference-only screenshots at desktop and mobile viewports if the tool permits it. If screenshots are unavailable, inspect the live DOM, page source, linked stylesheets, available assets, and computed styles through a suitable read-only method. Do not invent measurements or claim to have inspected something that was inaccessible.

Create a short internal design-audit note before implementation that records, where verifiable:

1. Page width and content max-width, page gutters, section spacing, and vertical rhythm.
2. Header/nav height, brand placement, nav density, link spacing, CTA placement, and mobile navigation behavior.
3. Font family names, available font files, heading/body scale, weights, line heights, letter spacing, and text colors.
4. Background, surface, text, accent, border, and status colors, including exact hex values where they can be read from CSS.
5. Search inputs, buttons, chips, dropdowns, filters, pills, cards, badges, accordions, and footer styles.
6. Corner radii, shadows, border thickness, separators, hover/focus treatments, transitions, and active states.
7. Desktop and mobile changes in grid columns, stacking order, typography, navigation, card density, and overflow behavior.
8. Any custom illustration, decorative layout, subtle animation, or repeated motif that materially contributes to the visual identity.

Inspect real CSS/computed values if available. Do not guess an exact font family, color token, or spacing value. If a value cannot be verified, record it as an informed visual approximation and choose a consistent token. Do not make access to the reference site a hard blocker for building the application.

### 9.2 Observable Joblet.ai patterns to translate into RateRadar

Use the following as the starting inventory, then verify it against the live reference pages wherever possible.

**A. Header and navigation**

- A clean brand area with a compact logo/wordmark.
- A restrained horizontal navigation with clear text links and a small number of high-priority actions.
- Group related destinations logically instead of placing every destination in the top navigation.
- Use consistent spacing and alignment, and implement a deliberate mobile navigation state.

Translate this to RateRadar navigation such as Overview, Route Analysis, Evidence, Data, and Run Reports, with a clearly visible primary action for running an analysis when appropriate. Use a RateRadar mark/wordmark of your own; do not use Joblet assets.

**B. Prominent hero/search interaction**

Joblet's homepage uses an oversized, high-contrast headline, a concise explanatory line, paired search inputs for role/company and location, a primary search action, a guided-search affordance, and a preference-based search prompt. Translate that direct, task-first composition into a RateRadar analysis header—not a marketing landing page detached from the product.

For RateRadar, use a strong editorial headline, a short explanation, and a compact work area for selecting or importing shipment data, choosing the analysis period, and running the analysis. Provide sensible guided filters and visible, reusable selection chips where they help. Make the primary action visually obvious without turning the entire interface into a giant hero section.

**C. Grouped navigation/search discovery content**

The homepage organizes links into named groups such as job discovery, tools, popular locations, and companies. Translate this into clear grouped destinations and shortcuts for routes, anomaly reviews, contextual notes, imports, exports, and evaluation reports. Keep such navigation secondary to the actual freight-analysis task.

**D. Featured cards and pastel card treatment**

The job listing reference screenshot surfaced through image search shows a light interface, a prominent search/filter area, compact job/result cards, small metadata labels, pastel-tinted card surfaces (including pale green, blue, and warm yellow tones), and dark pill-shaped actions. Treat that image as a secondary clue only; it may reflect an older version of the site. Verify the current live reference before adopting any exact value.

Translate this visual language into compact anomaly and route cards, review queue items, evidence snippets, and summary cards. Use pastel color sparingly to differentiate neutral categories or states, and use color plus text/icon labels so state is never conveyed by color alone. Avoid turning every dashboard panel into a different colored card.

**E. Category/use-case tiles**

Joblet's homepage organizes work modes into repeatable tiles with a short kicker/label, prominent category heading, brief supporting text, and a link/action. Translate that repeatable structure into high-value analytical shortcuts such as Unexplained Increases, Justified Changes, Highest Deviations, Missing Baselines, and Recent Runs. Every tile must link to a working filtered view or action; no decorative dead-end cards.

**F. Trust rows, statistics, and proof points**

Joblet uses company/logo rows and numeric metric bands as short proof points. For RateRadar, adapt these into truthful run metrics such as shipments analyzed, route-weeks evaluated, anomalies flagged, documented justifications, and evaluation checks passed. Populate every metric only from real computation. Do not fabricate customers, logos, accuracy percentages, savings, or successful test counts.

**G. Numbered sections and clear editorial hierarchy**

The About page uses numbered section labels, concise statements, mission/vision-style blocks, principle cards, product feature areas, and a sequence of content sections with clear headings. Translate this into a clear analytical narrative: what changed, how the comparison works, which evidence applies, and what action the reviewer should take. Numbered micro-labels may be used for process steps or evidence stages, but avoid marketing copy that does not serve the work.

**H. Feature blocks and explanatory content**

Joblet's public pages present product features in distinct blocks with short headings, concise explanations, and clear calls to action. For RateRadar, use this pattern in route detail, comparison methodology, evidence decisions, data validation, and reproducibility. Keep calculations and evidence close to the claim they support.

**I. FAQ/accordion and helper content**

Where Joblet uses expandable questions or grouped supporting information, use accessible accordions for methodology, threshold policy, missing-baseline rules, evidence applicability, and limitations when that helps reduce clutter. Preserve keyboard operation, visible focus, correct ARIA state, and clear open/closed affordances.

**J. Footer and secondary links**

Joblet uses a structured footer grouping product, company, and legal destinations. RateRadar should have a similarly organized but appropriately smaller footer containing product/version details, methodology, data/privacy notes, README/help, and relevant assessment artifacts. Do not copy Joblet's company details or links.

### 9.3 Extract and implement a coherent design system

Create centralized design tokens based on the reference audit instead of styling individual elements ad hoc. Include tokens for:

- Font families, font sizes, weights, line heights, and letter spacing.
- Primary text, secondary text, muted text, page background, raised surfaces, card surfaces, borders, and accent colors.
- Semantic success, warning, danger, and neutral states with accessible contrast.
- Spacing scale, page max-width, responsive gutters, grid gaps, and section spacing.
- Border radius, shadow, focus ring, animation duration, and easing.
- Input, button, badge, chip, card, navigation, table, chart, dialog, dropdown, and accordion dimensions.

If the live site makes exact CSS values available, use those as a visual baseline for comparable elements. Otherwise, derive a documented approximation from screenshots and visible rendering. Maintain a small, deliberate set of tokens; consistency is more important than introducing many nearly identical values.

Use the same tokens across all screens. Charts, tables, upload flows, dialogs, filter controls, evidence details, and responsive layouts must feel like parts of one designed product.

### 9.4 RateRadar screen designs must reuse those visual patterns

Apply the reference language consistently to these screens:

1. **Overview:** prominent page heading, compact filter/action region, metric strip, trend visualization, and a well-structured list of important route changes.
2. **Route Analysis:** clear search/filter bar, dense but readable data grid, metadata/status chips, compact details, pagination, and strong alignment between headings and values.
3. **Route Detail:** clear title and context, cost trend, current-vs-history and current-vs-peer comparisons, plus evidence and verdict in a readable hierarchy.
4. **Evidence Explorer:** searchable notes with scope/date labels, source text, match/rejection status, and a visibly traceable connection to route-week findings.
5. **Data Import:** guided file-selection area, accepted-schema help, validation summary, row-level errors, and a clear replace/confirm step.
6. **Run Reports:** analysis configuration, actual data-quality counts, evaluation checks, deterministic-run comparison, and token/cost report.
7. **Natural-language Questions:** a restrained conversational panel integrated with results, with suggested example questions, source-linked answers, and a clear unsupported-answer state.

Keep a shared shell and stable interaction patterns across screens. Do not make each page look like an unrelated template.

### 9.5 Fidelity and usability rules

- Aim for high visual fidelity to the observable Joblet design language and component composition, not a loose “inspired by” dashboard.
- Match typography hierarchy, page rhythm, grid alignment, card geometry, input/button treatments, metadata density, and responsive behavior wherever measurable.
- Preserve RateRadar's own name, logo, language, data, functionality, and freight-specific workflow.
- Do not copy Joblet's logo, proprietary images, exact marketing text, or source code.
- Do not add AI-themed decorative gradients, robot illustrations, glowing brains, or generic AI stock graphics.
- Avoid excessive rounded cards, excessive shadows, giant empty hero areas, and decorative UI that pushes real analytical content below the fold.
- Use high-quality, restrained motion; respect `prefers-reduced-motion`.
- All visible controls must work. No fake charts, placeholder actions, or decorative buttons.
- Ensure tables remain readable, all statuses are explicit, and evidence can be inspected without excessive navigation.
- If exact Joblet styles cannot be determined, be transparent in the internal audit and use the closest verified approximation rather than asserting false precision.

### 9.6 Reference inspection and manual approval boundary

It is acceptable to inspect Joblet.ai itself and capture reference-only screenshots when tools permit. **Do not launch RateRadar in Chrome or another browser, do not run browser-based automated UI tests, and do not take screenshots of the RateRadar application.** I will inspect the implemented interface manually and provide feedback for iteration.

The finished product should feel deliberately designed and substantially more polished than a typical assessment project, while retaining the clear, task-first and approachable visual patterns observed on Joblet.ai.


## 10. Responsive Design and Accessibility

Make the application work at mobile, tablet, laptop, desktop, and wide-screen sizes.

Do not simply scale the desktop layout down or make mobile typography excessively large.

Use fluid, readable typography and logical spacing. Keep controls comfortably touchable and ensure text remains readable without excessive zoom.

On smaller screens:

- Convert multi-column content into a sensible single-column hierarchy.
- Collapse the main navigation appropriately.
- Stack metric panels logically.
- Replace wide analytical tables with an appropriate responsive table, compact row cards, or a deliberate horizontally scrollable table.
- Keep primary actions easy to reach.
- Ensure charts remain legible and interactive.
- Prevent horizontal overflow across the overall page.
- Preserve meaningful information, filters, and evidence access.

Target WCAG 2.2 AA accessibility practices where applicable.

Include semantic HTML, keyboard navigation, visible focus indicators, accessible form labels, sufficient contrast, proper status announcements, and non-colour indicators for verdicts.

Respect reduced-motion preferences.

## 11. Security and Production Hardening

Follow widely accepted secure-development practices and OWASP guidance appropriate to the architecture. Do not claim that the application is guaranteed vulnerability-free.

### File-upload protection

Treat all uploaded CSVs as untrusted input.

- Restrict permitted formats and enforce a configurable file-size limit.
- Validate encoding, column names, row counts, and data types.
- Protect against malformed CSVs and oversized input.
- Validate numeric ranges and date formats.
- Reject invalid files with controlled, useful error messages.
- Never evaluate uploaded content as code.
- Prevent path traversal and unsafe filenames.
- Avoid exposing filesystem paths or raw stack traces.
- Clean up temporary files.
- Do not overwrite source datasets during analysis.

### API security

- Validate every request and response.
- Use appropriate error handling and status codes.
- Configure CORS narrowly if cross-origin deployment is needed.
- Avoid leaking server configuration, local paths, secrets, or internal errors.
- Use timeouts and sensible request-size limits.
- Prevent concurrent requests from mixing different users' uploaded datasets.
- Keep expensive or repeated analysis work controlled.
- Include a health-check endpoint.
- Keep dependencies maintained and avoid unnecessary packages.

### Data and output safety

- Prevent CSV formula injection in exported text fields while preserving correct numeric results.
- Escape user-controlled strings in the UI.
- Do not render uploaded HTML or execute imported content.
- Do not log sensitive file contents unnecessarily.
- Avoid persistent storage of uploads unless explicitly required.
- Keep API responses scoped to the correct analysis session.
- Use structured, privacy-conscious logs.

### Secrets and configuration

- Never commit API keys, passwords, tokens, or private credentials.
- Provide `.env.example` with non-secret configuration.
- Keep real environment files out of Git.
- Do not require a secret in order to start the default assessment demo.
- Do not disable security controls merely to make deployment easier.

## 12. Error Handling and Edge Cases

Handle the following deliberately:

- Empty CSV files.
- Missing required columns.
- Extra unexpected columns.
- Malformed rows.
- Invalid or unparseable dates.
- Invalid route names.
- Missing route type.
- Unsupported route type.
- Zero or negative quantity.
- Zero or negative distance.
- Negative or non-finite freight cost.
- Duplicate shipment IDs.
- Duplicate note IDs.
- Missing note dates or note text.
- Missing history.
- Missing peer baseline.
- A route with only one observation.
- Weeks crossing month or year boundaries.
- Multiple qualifying notes.
- A note with the correct route but wrong period.
- A note with the correct date but wrong route.
- A note that explicitly says costs were unaffected.
- No anomalies found.
- All anomalies justified.
- All anomalies unexplained.
- A question referring to an unknown route or absent month.
- Repeated analysis runs.
- API failures and malformed requests.
- Interrupted processing.
- Missing optional configuration.
- Production serving of the built frontend.
- Missing demonstration files during deployment.

Use typed exceptions or equivalent explicit error categories. Show users understandable messages while keeping diagnostic detail in controlled server logs.

Do not add unnecessary fallback behavior that hides invalid data or changes the assessment's calculations.

## 13. API and Internal Code Organization

Organize responsibilities cleanly. Suggested backend modules:

- `schemas`: request, response, and internal data models.
- `ingestion`: CSV parsing and validation.
- `aggregation`: weekly route metrics.
- `baselines`: historical and peer comparisons.
- `detection`: deterministic anomaly classification.
- `retrieval`: note search and applicability checks.
- `explanations`: evidence-grounded reason generation.
- `assistant`: natural-language question interpretation and result lookup.
- `evaluation`: correctness checks and evaluation reporting.
- `exports`: safe CSV serialization.
- `services`: orchestration.
- `api`: HTTP endpoints and dependency management.

Suggested frontend areas:

- Application shell and navigation.
- Overview dashboard.
- Route analysis table.
- Route detail and historical chart.
- Context-note explorer.
- Data upload and validation.
- Analysis execution and run report.
- Question panel.
- Reusable UI primitives.
- API client, types, and error handling.

Adapt this organization to the actual repository. Do not force a structure that adds unnecessary abstraction.

Provide useful API endpoints for health checking, uploading data, running analysis, retrieving results, asking questions, and downloading the output CSV.

Use clear API contracts, typed schemas, and consistent error responses.

## 14. Evaluation Harness and Correctness Evidence

The assessment requires evidence that the solution is trustworthy, not just that its dashboard looks good.

Create a lightweight, reproducible evaluation harness and focused test cases.

Include cases for:

1. Monday-to-Sunday weekly grouping.
2. Correct cost-per-tonne-km aggregation.
3. Correct rolling-history baseline.
4. No look-ahead in historical calculations.
5. Correct peer averaging.
6. Exclusion of the current route from peers.
7. Correct percentage comparisons and rounding.
8. Missing and invalid baselines.
9. Valid, route-specific contextual evidence.
10. Correct temporal note matching.
11. Explicitly non-supporting notes.
12. Stable anomaly classification.
13. Correct `matched_note_id` behavior.
14. Exact output schema and valid CSV escaping.
15. Deterministic ordering and serialization.

Include focused synthetic test fixtures for edge cases, but never replace the supplied assessment data with synthetic data when generating the required production output.

The evaluation should include positive and negative evidence-matching cases. Specifically, it must prove that a note saying costs were unaffected cannot justify an increase and that a geographically or temporally unrelated note cannot justify an anomaly.

Report measurable checks such as:

- Output schema validity.
- Numerical invariants.
- Number of justified rows with invalid note references.
- Number of justifications that fail route applicability.
- Number of justifications outside their documented timeframe.
- Whether repeated runs yield identical analytical output.

Do not claim perfect accuracy merely because unit tests pass. Describe exactly what was tested and what remains a limitation.

## 15. Three-Run Reproducibility Requirement

Use the exact same untouched assessment input and identical configuration for three independent analytical runs.

The three runs must produce identical:

- Route-week identities and ordering.
- Cost values.
- Historical comparisons.
- Peer comparisons.
- Flags.
- Matched note IDs.
- Reasons and other CSV values.

For maximum determinism, use deterministic processing, stable sorting, consistent numeric formatting, deterministic note-ranking and tie-breaking rules, and no random sampling.

A language model must never determine the numerical calculation or final verdict.

Prefer templated explanations based on structured source evidence, which makes the required CSV deterministic.

If an optional model is used elsewhere, configure it for repeatability where supported, explain the remaining limitations, and keep it out of the critical decision path.

Generate a reproducibility report containing the three output hashes, comparison result, input identity, and the configuration used. Ensure the report reflects actual executed runs rather than a manually written claim.

Respect my request not to launch Chrome, open a browser, run browser-based automated UI testing, or capture screenshots. I will inspect the interface manually.

CLI-only calculations and the three required analysis runs may be performed to produce the mandatory reproducibility evidence. Do not perform visual inspection or claim that I approved the UI.

## 16. Token and Cost Reporting

The FreightTiger brief requires the number of LLM calls, total input tokens, total output tokens, and estimated cost for a complete run over the shipment file.

Track actual usage rather than estimating tokens from the number of rows.

If the default implementation uses deterministic retrieval, templates, and no LLM, record honestly:

- LLM calls: 0.
- LLM input tokens: 0.
- LLM output tokens: 0.
- LLM cost: 0.

Explain that zero is the actual LLM usage because the analytical pipeline does not require an external LLM.

Do not label internal TF-IDF calculations or ordinary Python processing as LLM tokens.

If you implement optional model-assisted features, instrument the adapter to collect actual provider usage metadata and calculate costs from documented pricing for the model and version used. If pricing or usage is unavailable, identify the estimate as unavailable rather than inventing a precise figure.

Keep the core analysis functional when model services are unavailable.

## 17. Required Deliverables

Deliver the complete application and all required assessment artifacts.

At minimum, provide:

- `README.md` — setup, architecture, calculations, thresholds, retrieval rules, security, deployment, limitations, and evaluation.
- All frontend source code.
- All backend source code.
- Required dependency manifests and lockfiles.
- `Dockerfile` and `.env.example`.
- The final valid assessment CSV, using exactly the eight-column contract.
- A reproducibility report based on three identical analysis runs.
- A token and cost report for one full analysis run.
- An evaluation report showing the checks performed and their results.
- Focused test files and test fixtures.
- A short 10-minute walkthrough outline with demo steps, trade-offs, evidence examples, and known limitations.

Use a clean, understandable directory structure. Keep generated artifacts separate from source datasets and test fixtures.

The final output CSV must be downloadable directly from the application and reproducible using a documented command.

Never create fake screenshots, fake logs, fake test results, or fake claims about deployment.

## 18. README Requirements

The README must be useful to an engineer reviewing the project for the first time.

Explain:

1. The business problem and the intended users.
2. The main application features.
3. The architecture and principal data flow.
4. How to install and run the application locally.
5. How to use the provided assessment files.
6. The precise weekly aggregation formula.
7. The historical and peer comparison definitions.
8. How missing baselines are handled.
9. The configurable 10% anomaly threshold and its rationale.
10. The meaning of `Yes`, `No (justified)`, and `No`.
11. How route applicability and temporal evidence matching work.
12. How unsupported notes are rejected.
13. What the natural-language assistant can and cannot answer.
14. What the evaluation harness measures.
15. The actual three-run reproducibility results.
16. The actual token and cost figures.
17. Security and deployment considerations.
18. Limitations and trade-offs.
19. The exact command that generates the required CSV.
20. The exact steps needed to deploy the application.

Document that when fewer than eight weeks of valid historical data are available, the implementation uses only the available earlier observations, without invented or extrapolated values.

Include a small architecture diagram in Mermaid if useful.

## 19. Ten-Minute Interview Demonstration

Prepare a walkthrough that demonstrates the actual application and makes the reasoning easy to defend.

Suggested flow:

- Minute 0–1: Introduce the problem and RateRadar.
- Minute 1–2: Show the dashboard and imported dataset.
- Minute 2–4: Open a suspicious route-week and walk through the calculations.
- Minute 4–6: Compare a justified anomaly with an unexplained anomaly.
- Minute 6–7: Open the exact supporting note and explain why an invalid note is rejected.
- Minute 7–8: Explain the evaluation harness and reproducibility checks.
- Minute 8–9: Show the output CSV and actual token/cost report.
- Minute 9–10: Explain architecture, trade-offs, security, and deployment.

This must reflect real functionality in the application. Do not prepare a demonstration that depends on fake records, hardcoded answers, or features that do not work.

## 20. Implementation Workflow

Follow this order:

**Phase 1 — Discovery:** Inspect the repository, read the assessment files, identify constraints, and formulate the architecture.

**Phase 2 — Core engine:** Implement ingestion, weekly aggregation, both baselines, deterministic anomaly classification, note applicability, and exact output serialization.

**Phase 3 — Evidence and evaluation:** Implement retrieval, grounded explanations, the evaluation harness, reproducibility reporting, and token/cost reporting.

**Phase 4 — Frontend:** Build the complete responsive application around actual API responses and analytical results.

**Phase 5 — Integration and deployment:** Connect all screens, error states, upload handling, API endpoints, exports, and production asset serving.

**Phase 6 — Assessment artifacts:** Generate the final output CSV, required reports, README, and walkthrough outline.

Maintain a clear separation between numerical analysis, anomaly decisions, evidence matching, explanations, and presentation.

Do not let frontend formatting change analytical values. Do not let a note change the underlying calculations. Do not let natural-language generation alter the verdict. Do not allow a styling change to break application behavior.

## 21. Final Acceptance Checklist

Before declaring the implementation complete, verify that:

- The real assessment CSVs are used without fabricated replacement data.
- Weekly grouping starts on Monday.
- The unit-cost formula is correct.
- The historical average contains no current or future observations.
- Peer averages use the correct route type and exclude the route itself.
- Missing data is represented honestly.
- The anomaly threshold is explicit and configurable.
- Every justified verdict has genuinely applicable evidence.
- Unsupported notes cannot justify an increase.
- The output contains exactly eight columns in the correct order.
- The exported CSV is valid and safely escaped.
- The application works without a paid external AI service.
- The natural-language assistant uses real analysis results.
- Upload errors and edge cases are handled safely.
- The interface is responsive and keyboard-accessible.
- API requests cannot mix analysis data between sessions.
- No secrets or machine-specific paths are required.
- The frontend and backend can be deployed using documented steps.
- Three independent analytical runs produce identical required output.
- The token/cost report reflects actual usage.
- Evaluation results describe checks that were genuinely executed.
- Joblet.ai may have been inspected for design-reference purposes, but the local RateRadar application has not been opened in a browser and no screenshots of the local application have been captured.

Finish by providing a concise implementation report containing:

1. What was built.
2. The final project structure.
3. How to run it locally.
4. How to deploy it.
5. Where to find the required CSV and reports.
6. The actual reproducibility and evaluation results.
7. Any known limitations or steps still requiring my manual review.

Do not claim there are no possible bugs or security issues. Aim for robust, auditable engineering, disclose known limitations, and never misrepresent unverified behavior.

**Priority order:** Correct calculations and assessment compliance first; evidence integrity and security second; reproducibility and deployability third; exceptional user experience fourth; optional sophistication only when it does not compromise the first four.

Now inspect the project and implement the complete solution. Do not stop after presenting a plan.