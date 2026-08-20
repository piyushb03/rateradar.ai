from datetime import date
from app.detection import classify


def test_classify_unexplained_anomaly():
    """An anomaly candidate without a matching note is flagged 'Yes'."""
    wk = date(2025, 2, 24)
    rk = "Delhi|Jaipur|Short"
    metrics = [{
        "route_key": rk,
        "route": "Delhi-Jaipur",
        "route_type": "Short",
        "week_of": wk,
        "cost_per_tonne_km": 4.17,
        "shipment_count": 5,
    }]
    baselines = {
        (rk, wk): {
            "own_history_avg": 3.0,
            "own_history_weeks": 8,
            "own_history_pct": 39.0,  # > 10%
            "peer_avg": 3.4,
            "peer_route_count": 2,
            "peer_pct": 22.6,  # > 10%
        }
    }
    note_matches = {
        (rk, wk): {"matched": False, "note_id": None, "reason": ""}
    }

    rows = classify(metrics, baselines, note_matches, threshold_pct=10.0)
    assert len(rows) == 1
    r = rows[0]
    assert r["flagged"] == "Yes"
    assert r["matched_note_id"] == ""
    assert "unexplained" in r["reason"].lower()


def test_classify_justified_anomaly():
    """An anomaly candidate with a matching note is flagged 'No (justified)'."""
    wk = date(2025, 1, 20)
    rk = "Ahmedabad|Mumbai|Short"
    metrics = [{
        "route_key": rk,
        "route": "Ahmedabad-Mumbai",
        "route_type": "Short",
        "week_of": wk,
        "cost_per_tonne_km": 3.29,
        "shipment_count": 3,
    }]
    baselines = {
        (rk, wk): {
            "own_history_avg": 2.54,
            "own_history_weeks": 6,
            "own_history_pct": 29.5,  # > 10%
            "peer_avg": 2.68,
            "peer_route_count": 3,
            "peer_pct": 22.8,  # > 10%
        }
    }
    note_matches = {
        (rk, wk): {
            "matched": True,
            "note_id": "N002",
            "reason": "Matches note N002: festival surcharge.",
        }
    }

    rows = classify(metrics, baselines, note_matches, threshold_pct=10.0)
    assert len(rows) == 1
    r = rows[0]
    assert r["flagged"] == "No (justified)"
    assert r["matched_note_id"] == "N002"
    assert "N002" in r["reason"]


def test_classify_normal_week():
    """A normal week within 10% threshold is flagged 'No' and matched_note_id is empty."""
    wk = date(2025, 2, 24)
    rk = "Mumbai|Pune|Short"
    metrics = [{
        "route_key": rk,
        "route": "Mumbai-Pune",
        "route_type": "Short",
        "week_of": wk,
        "cost_per_tonne_km": 3.0,
        "shipment_count": 4,
    }]
    baselines = {
        (rk, wk): {
            "own_history_avg": 2.9,
            "own_history_weeks": 8,
            "own_history_pct": 3.4,  # <= 10%
            "peer_avg": 3.1,
            "peer_route_count": 2,
            "peer_pct": -3.2,  # <= 10%
        }
    }
    # Even if an event note exists nearby, it should not justify a normal week
    note_matches = {
        (rk, wk): {"matched": True, "note_id": "N002", "reason": "festival note"}
    }

    rows = classify(metrics, baselines, note_matches, threshold_pct=10.0)
    assert len(rows) == 1
    r = rows[0]
    assert r["flagged"] == "No"
    assert r["matched_note_id"] == ""
