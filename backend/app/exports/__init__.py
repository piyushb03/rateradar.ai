"""Safe CSV export of analysis results.

Produces exactly eight columns in the required order:
  route, week_of, cost_per_tonne_km, vs_own_history, vs_similar_routes,
  flagged, matched_note_id, reason

Prevents CSV formula injection in text fields.
Numeric fields are not prefixed (safe).
"""
from __future__ import annotations

import csv
import io
from typing import Any

REQUIRED_COLUMNS = [
    "route",
    "week_of",
    "cost_per_tonne_km",
    "vs_own_history",
    "vs_similar_routes",
    "flagged",
    "matched_note_id",
    "reason",
]

# Characters that would trigger formula injection in spreadsheets
_INJECTION_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _sanitize(value: str) -> str:
    """Prefix dangerous formula injection strings with a single quote.

    Legitimate signs followed by digits (such as '+35.5% vs...') are preserved.
    """
    if not value:
        return value
    if value[0] in ("=", "@", "\t", "\r"):
        return "'" + value
    if value[0] in ("+", "-"):
        if len(value) > 1 and (value[1].isdigit() or value[1] == "."):
            return value
        return "'" + value
    return value


def generate_csv(rows: list[dict[str, Any]]) -> str:
    """Serialize analysis rows to a valid, safely-escaped CSV string."""
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")

    # Header
    writer.writerow(REQUIRED_COLUMNS)

    for row in rows:
        week_str = str(row["week_of"]) if not isinstance(row["week_of"], str) else row["week_of"]
        cost_str = f"{row['cost_per_tonne_km']:.4f}"

        writer.writerow(
            [
                _sanitize(str(row["route"])),
                _sanitize(week_str),
                cost_str,
                _sanitize(str(row["vs_own_history"])),
                _sanitize(str(row["vs_similar_routes"])),
                _sanitize(str(row["flagged"])),
                _sanitize(str(row.get("matched_note_id", ""))),
                _sanitize(str(row["reason"])),
            ]
        )

    return buf.getvalue()
