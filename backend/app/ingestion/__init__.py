"""CSV ingestion and validation for shipment records and context notes."""
from __future__ import annotations

import io
import logging
from datetime import date, datetime
from typing import Any

import pandas as pd

from app.schemas import RouteType

logger = logging.getLogger(__name__)

# Required columns
SHIPMENT_REQUIRED = {
    "shipment_id", "origin", "destination", "route_type",
    "material", "quantity_tonnes", "distance_km",
    "freight_cost_inr", "shipment_date", "transporter",
}
NOTE_REQUIRED = {"note_id", "date", "applies_to", "note"}

VALID_ROUTE_TYPES = {rt.value for rt in RouteType}


def parse_shipments(
    content: bytes | str,
) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    """Parse and validate shipment CSV content.

    Returns (valid_rows, errors, warnings).
    Invalid rows are excluded from valid_rows with an explanatory error.
    Warnings are informational but do not exclude a row.
    """
    errors: list[str] = []
    warnings: list[str] = []
    valid: list[dict[str, Any]] = []

    try:
        if isinstance(content, bytes):
            content = content.decode("utf-8-sig")  # strip BOM if present
        df = pd.read_csv(io.StringIO(content), dtype=str, keep_default_na=False)
    except Exception as exc:
        return [], [f"Failed to parse CSV: {exc}"], []

    # Column validation
    cols = set(df.columns.str.strip())
    missing = SHIPMENT_REQUIRED - cols
    if missing:
        return [], [f"Missing required columns: {sorted(missing)}"], []

    extra = cols - SHIPMENT_REQUIRED
    if extra:
        warnings.append(f"Ignoring unrecognised columns: {sorted(extra)}")

    df.columns = df.columns.str.strip()
    seen_ids: set[str] = set()

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed, +1 for header
        row = {k: v.strip() if isinstance(v, str) else v for k, v in row.items()}

        sid = row.get("shipment_id", "").strip()
        if not sid:
            errors.append(f"Row {row_num}: missing shipment_id — skipped.")
            continue
        if sid in seen_ids:
            warnings.append(f"Row {row_num}: duplicate shipment_id '{sid}' — skipped.")
            continue
        seen_ids.add(sid)

        # Route type
        rt = row.get("route_type", "").strip()
        if rt not in VALID_ROUTE_TYPES:
            errors.append(f"Row {row_num} ({sid}): invalid route_type '{rt}' — skipped.")
            continue

        # Numeric fields
        try:
            qty = float(row["quantity_tonnes"])
        except (ValueError, TypeError):
            errors.append(f"Row {row_num} ({sid}): non-numeric quantity_tonnes — skipped.")
            continue
        if qty <= 0 or not _is_finite(qty):
            errors.append(f"Row {row_num} ({sid}): quantity_tonnes must be > 0 (got {qty}) — skipped.")
            continue

        try:
            dist = float(row["distance_km"])
        except (ValueError, TypeError):
            errors.append(f"Row {row_num} ({sid}): non-numeric distance_km — skipped.")
            continue
        if dist <= 0 or not _is_finite(dist):
            errors.append(f"Row {row_num} ({sid}): distance_km must be > 0 (got {dist}) — skipped.")
            continue

        try:
            cost = float(row["freight_cost_inr"])
        except (ValueError, TypeError):
            errors.append(f"Row {row_num} ({sid}): non-numeric freight_cost_inr — skipped.")
            continue
        if cost < 0 or not _is_finite(cost):
            errors.append(f"Row {row_num} ({sid}): freight_cost_inr must be >= 0 (got {cost}) — skipped.")
            continue

        # Date
        try:
            shipment_date = _parse_date(row["shipment_date"])
        except ValueError as e:
            errors.append(f"Row {row_num} ({sid}): {e} — skipped.")
            continue

        # Text fields
        origin = row.get("origin", "").strip()
        destination = row.get("destination", "").strip()
        if not origin or not destination:
            errors.append(f"Row {row_num} ({sid}): missing origin or destination — skipped.")
            continue

        valid.append(
            {
                "shipment_id": sid,
                "origin": origin,
                "destination": destination,
                "route_type": rt,
                "material": row.get("material", "").strip(),
                "quantity_tonnes": qty,
                "distance_km": dist,
                "freight_cost_inr": cost,
                "shipment_date": shipment_date,
                "transporter": row.get("transporter", "").strip(),
            }
        )

    return valid, errors, warnings


def parse_notes(
    content: bytes | str,
) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    """Parse and validate context_notes CSV."""
    errors: list[str] = []
    warnings: list[str] = []
    valid: list[dict[str, Any]] = []

    try:
        if isinstance(content, bytes):
            content = content.decode("utf-8-sig")
        df = pd.read_csv(io.StringIO(content), dtype=str, keep_default_na=False)
    except Exception as exc:
        return [], [f"Failed to parse notes CSV: {exc}"], []

    cols = set(df.columns.str.strip())
    missing = NOTE_REQUIRED - cols
    if missing:
        return [], [f"Notes CSV missing required columns: {sorted(missing)}"], []

    df.columns = df.columns.str.strip()
    seen_ids: set[str] = set()

    for idx, row in df.iterrows():
        row_num = idx + 2
        row = {k: v.strip() if isinstance(v, str) else v for k, v in row.items()}

        nid = row.get("note_id", "").strip()
        if not nid:
            errors.append(f"Notes row {row_num}: missing note_id — skipped.")
            continue
        if nid in seen_ids:
            warnings.append(f"Notes row {row_num}: duplicate note_id '{nid}' — skipped.")
            continue
        seen_ids.add(nid)

        note_text = row.get("note", "").strip()
        if not note_text:
            errors.append(f"Notes row {row_num} ({nid}): empty note text — skipped.")
            continue

        applies_to = row.get("applies_to", "").strip()
        if not applies_to:
            errors.append(f"Notes row {row_num} ({nid}): missing applies_to — skipped.")
            continue

        try:
            note_date = _parse_date(row["date"])
        except ValueError as e:
            errors.append(f"Notes row {row_num} ({nid}): {e} — skipped.")
            continue

        valid.append(
            {
                "note_id": nid,
                "date": note_date,
                "applies_to": applies_to,
                "note": note_text,
            }
        )

    return valid, errors, warnings


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_date(value: str) -> date:
    """Parse YYYY-MM-DD dates strictly."""
    value = value.strip()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"unparseable date '{value}' (expected YYYY-MM-DD)")


def _is_finite(value: float) -> bool:
    import math
    return math.isfinite(value)
