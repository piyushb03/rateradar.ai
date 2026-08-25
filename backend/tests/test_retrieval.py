from datetime import date
from app.retrieval import retrieve_note_matches, NON_SUPPORTING_NOTE_IDS


def test_non_supporting_notes_never_match():
    """Verify notes N004 through N010 are strictly non-supporting."""
    assert "N004" in NON_SUPPORTING_NOTE_IDS
    assert "N005" in NON_SUPPORTING_NOTE_IDS
    assert "N006" in NON_SUPPORTING_NOTE_IDS
    assert "N007" in NON_SUPPORTING_NOTE_IDS
    assert "N008" in NON_SUPPORTING_NOTE_IDS
    assert "N009" in NON_SUPPORTING_NOTE_IDS
    assert "N010" in NON_SUPPORTING_NOTE_IDS

    notes = [
        {"note_id": "N005", "date": date(2025, 4, 1), "applies_to": "Mumbai-Delhi", "note": "Highway maintenance; costs were not significantly affected."},
        {"note_id": "N006", "date": date(2025, 9, 22), "applies_to": "All Routes", "note": "Stable demand and no major disruptions reported."},
        {"note_id": "N007", "date": date(2025, 3, 10), "applies_to": "Delhi-Jaipur", "note": "Road conditions improved after resurfacing."},
    ]
    metrics = [
        {"route_key": "Mumbai|Delhi|Long", "route": "Mumbai-Delhi", "route_type": "Long", "week_of": date(2025, 4, 7)},
        {"route_key": "Delhi|Jaipur|Short", "route": "Delhi-Jaipur", "route_type": "Short", "week_of": date(2025, 3, 10)},
    ]
    matches = retrieve_note_matches(metrics, notes)
    for res in matches.values():
        assert res["matched"] is False
        assert res["note_id"] is None


def test_n001_temporal_bounds():
    """N001 covers flooding Feb 24 - Mar 8, 2025. Does not cover late March."""
    notes = [{
        "note_id": "N001",
        "date": date(2025, 2, 24),
        "applies_to": "Chennai-Bangalore",
        "note": "Flooding disrupted movement from Feb 24 through Mar 8, 2025, causing detours and higher trip costs. Passable from Mar 9.",
    }]
    metrics = [
        # In period: Monday 2025-02-24 (week Feb 24 - Mar 2)
        {"route_key": "Chennai|Bangalore|Short", "route": "Chennai-Bangalore", "route_type": "Short", "week_of": date(2025, 2, 24)},
        # In period: Monday 2025-03-03 (week Mar 3 - Mar 9: overlaps up to Mar 8)
        {"route_key": "Chennai|Bangalore|Short", "route": "Chennai-Bangalore", "route_type": "Short", "week_of": date(2025, 3, 3)},
        # After period: Monday 2025-03-17 (week Mar 17 - Mar 23)
        {"route_key": "Chennai|Bangalore|Short", "route": "Chennai-Bangalore", "route_type": "Short", "week_of": date(2025, 3, 17)},
    ]

    matches = retrieve_note_matches(metrics, notes)
    assert matches[("Chennai|Bangalore|Short", date(2025, 2, 24))]["matched"] is True
    assert matches[("Chennai|Bangalore|Short", date(2025, 2, 24))]["note_id"] == "N001"

    assert matches[("Chennai|Bangalore|Short", date(2025, 3, 3))]["matched"] is True
    assert matches[("Chennai|Bangalore|Short", date(2025, 3, 3))]["note_id"] == "N001"

    assert matches[("Chennai|Bangalore|Short", date(2025, 3, 17))]["matched"] is False


def test_route_mismatch_rejected():
    """N002 is for Ahmedabad-Mumbai only, should not match Delhi-Jaipur."""
    notes = [{
        "note_id": "N002",
        "date": date(2025, 1, 20),
        "applies_to": "Ahmedabad-Mumbai",
        "note": "A regional festival week involved a temporary surcharge because of demand and limited truck availability.",
    }]
    metrics = [
        {"route_key": "Delhi|Jaipur|Short", "route": "Delhi-Jaipur", "route_type": "Short", "week_of": date(2025, 1, 20)},
    ]
    matches = retrieve_note_matches(metrics, notes)
    assert matches[("Delhi|Jaipur|Short", date(2025, 1, 20))]["matched"] is False
