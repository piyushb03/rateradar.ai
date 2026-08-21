import csv
import io
from app.exports import generate_csv, REQUIRED_COLUMNS


def test_csv_required_columns_and_order():
    """CSV must contain exactly the 8 required columns in exact order."""
    expected_header = [
        "route",
        "week_of",
        "cost_per_tonne_km",
        "vs_own_history",
        "vs_similar_routes",
        "flagged",
        "matched_note_id",
        "reason",
    ]
    assert REQUIRED_COLUMNS == expected_header

    rows = [{
        "route": "Delhi-Jaipur",
        "week_of": "2024-11-11",
        "cost_per_tonne_km": 4.1700,
        "vs_own_history": "+35.5% vs this route's past average",
        "vs_similar_routes": "+21.0% vs similar-length routes this week",
        "flagged": "Yes",
        "matched_note_id": "",
        "reason": "No matching note found for this route or date range.",
    }]

    csv_out = generate_csv(rows)
    reader = csv.reader(io.StringIO(csv_out))
    header = next(reader)
    assert header == expected_header

    data_row = next(reader)
    assert len(data_row) == 8
    assert data_row[0] == "Delhi-Jaipur"
    assert data_row[1] == "2024-11-11"
    assert data_row[2] == "4.1700"
    assert data_row[3] == "+35.5% vs this route's past average"
    assert data_row[4] == "+21.0% vs similar-length routes this week"
    assert data_row[5] == "Yes"
    assert data_row[6] == ""
    assert data_row[7] == "No matching note found for this route or date range."


def test_csv_injection_sanitization():
    """Malicious formula injection strings must be prefixed with single quote."""
    rows = [{
        "route": "=cmd|' /C calc'!A0",
        "week_of": "2025-01-01",
        "cost_per_tonne_km": 3.0,
        "vs_own_history": "+10.0% vs history",
        "vs_similar_routes": "-5.0% vs peer",
        "flagged": "No",
        "matched_note_id": "@SUM(B1:B10)",
        "reason": "Normal reason",
    }]
    csv_out = generate_csv(rows)
    reader = csv.reader(io.StringIO(csv_out))
    next(reader)
    row = next(reader)
    # The route started with '=', should be prefixed with "'"
    assert row[0].startswith("'=")
    # The note id started with '@', should be prefixed with "'"
    assert row[6].startswith("'@")
    # Percentages starting with '+' or '-' followed by digits should NOT have single quote prefix
    assert row[3] == "+10.0% vs history"
    assert row[4] == "-5.0% vs peer"
