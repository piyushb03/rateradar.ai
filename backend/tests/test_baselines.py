from datetime import date, timedelta
from app.baselines import compute_baselines


def test_own_history_strict_8_weeks():
    """Verify that own-history baseline only includes weeks in [current - 8 weeks, current)."""
    route_key = "Delhi|Jaipur|Short"
    base_monday = date(2025, 3, 3)

    metrics = []
    # Create 10 weeks of history: week 0 to 9
    # Week 0 is base_monday - 10 weeks (outside 8-week window)
    # Week 1 is base_monday - 9 weeks (outside 8-week window)
    # Weeks 2 to 9 are base_monday - 8 weeks to base_monday - 1 week (inside 8-week window)
    # Week 10 is base_monday itself (current week)
    for w in range(11):
        wk = base_monday - timedelta(weeks=10 - w)
        metrics.append({
            "route_key": route_key,
            "route": "Delhi-Jaipur",
            "route_type": "Short",
            "week_of": wk,
            "cost_per_tonne_km": 2.0 if w < 10 else 4.0,  # History is 2.0, current is 4.0
            "total_freight_cost": 1000.0,
            "total_tonne_km": 500.0,
            "shipment_count": 1,
        })

    baselines = compute_baselines(metrics)
    current_bl = baselines[(route_key, base_monday)]

    # Exactly 8 weeks should be in window
    assert current_bl["own_history_weeks"] == 8
    assert current_bl["own_history_avg"] == 2.0
    # Current cost 4.0 vs 2.0 -> ((4.0 / 2.0) - 1) * 100 = +100%
    assert abs(current_bl["own_history_pct"] - 100.0) < 1e-6


def test_own_history_zero_prior_weeks():
    """First week of a route has no historical baseline."""
    route_key = "Delhi|Jaipur|Short"
    base_monday = date(2025, 3, 3)
    metrics = [{
        "route_key": route_key,
        "route": "Delhi-Jaipur",
        "route_type": "Short",
        "week_of": base_monday,
        "cost_per_tonne_km": 4.0,
        "total_freight_cost": 1000.0,
        "total_tonne_km": 250.0,
        "shipment_count": 1,
    }]
    baselines = compute_baselines(metrics)
    bl = baselines[(route_key, base_monday)]
    assert bl["own_history_avg"] is None
    assert bl["own_history_pct"] is None
    assert bl["own_history_weeks"] == 0


def test_peer_baseline_excludes_self():
    """Peer baseline must exclude the route itself and only include matching route_type."""
    wk = date(2025, 2, 24)
    metrics = [
        {
            "route_key": "Mumbai|Pune|Short",
            "route": "Mumbai-Pune",
            "route_type": "Short",
            "week_of": wk,
            "cost_per_tonne_km": 5.0,
        },
        {
            "route_key": "Delhi|Jaipur|Short",
            "route": "Delhi-Jaipur",
            "route_type": "Short",
            "week_of": wk,
            "cost_per_tonne_km": 3.0,
        },
        {
            "route_key": "Chennai|Bangalore|Short",
            "route": "Chennai-Bangalore",
            "route_type": "Short",
            "week_of": wk,
            "cost_per_tonne_km": 3.0,
        },
        {
            "route_key": "Kolkata|Bhubaneswar|Medium",  # Different route_type!
            "route": "Kolkata-Bhubaneswar",
            "route_type": "Medium",
            "week_of": wk,
            "cost_per_tonne_km": 10.0,
        },
    ]

    baselines = compute_baselines(metrics)
    mumbai_bl = baselines[("Mumbai|Pune|Short", wk)]

    # For Mumbai|Pune|Short: peers are Delhi-Jaipur (3.0) and Chennai-Bangalore (3.0)
    # Arithmetic mean = (3.0 + 3.0) / 2 = 3.0
    # Kolkata is excluded (different route type: Medium)
    # Mumbai is excluded (self)
    assert mumbai_bl["peer_route_count"] == 2
    assert mumbai_bl["peer_avg"] == 3.0
    # ((5.0 / 3.0) - 1) * 100 = +66.6666...%
    assert abs(mumbai_bl["peer_pct"] - (2.0 / 3.0 * 100.0)) < 1e-4
