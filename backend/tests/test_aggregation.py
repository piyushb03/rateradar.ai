from datetime import date
from app.aggregation import compute_weekly_metrics, monday_of_week


def test_monday_of_week_midweek():
    # Wednesday 2025-02-26 -> Monday 2025-02-24
    d = date(2025, 2, 26)
    assert monday_of_week(d) == date(2025, 2, 24)


def test_monday_of_week_already_monday():
    # Monday 2025-02-24 -> Monday 2025-02-24
    d = date(2025, 2, 24)
    assert monday_of_week(d) == date(2025, 2, 24)


def test_monday_of_week_sunday():
    # Sunday 2025-03-02 -> Monday 2025-02-24
    d = date(2025, 3, 2)
    assert monday_of_week(d) == date(2025, 2, 24)


def test_compute_weekly_metrics_weighted_formula():
    """Verify that cost_per_tonne_km is SUM(cost)/SUM(qty*dist), NOT mean of ratios."""
    shipments = [
        {
            "shipment_id": "S1",
            "origin": "Mumbai",
            "destination": "Pune",
            "route_type": "Short",
            "material": "Steel",
            "quantity_tonnes": 10.0,
            "distance_km": 150.0,
            "freight_cost_inr": 6000.0,  # 6000 / (10 * 150) = 6000 / 1500 = 4.0
            "shipment_date": date(2025, 2, 24),
            "transporter": "T1",
        },
        {
            "shipment_id": "S2",
            "origin": "Mumbai",
            "destination": "Pune",
            "route_type": "Short",
            "material": "Cement",
            "quantity_tonnes": 50.0,
            "distance_km": 150.0,
            "freight_cost_inr": 15000.0,  # 15000 / (50 * 150) = 15000 / 7500 = 2.0
            "shipment_date": date(2025, 2, 25),
            "transporter": "T2",
        },
    ]
    # Unweighted average of rates: (4.0 + 2.0) / 2 = 3.0
    # Weighted formula: (6000 + 15000) / (1500 + 7500) = 21000 / 9000 = 2.33333333...
    metrics = compute_weekly_metrics(shipments)
    assert len(metrics) == 1
    m = metrics[0]
    assert m["route"] == "Mumbai-Pune"
    assert m["week_of"] == date(2025, 2, 24)
    assert m["shipment_count"] == 2
    assert abs(m["cost_per_tonne_km"] - (21000.0 / 9000.0)) < 1e-6


def test_directional_route_separation():
    """Origin->Destination must not be merged with Destination->Origin."""
    shipments = [
        {
            "shipment_id": "S1",
            "origin": "Mumbai",
            "destination": "Pune",
            "route_type": "Short",
            "material": "Steel",
            "quantity_tonnes": 10.0,
            "distance_km": 150.0,
            "freight_cost_inr": 3000.0,
            "shipment_date": date(2025, 2, 24),
            "transporter": "T1",
        },
        {
            "shipment_id": "S2",
            "origin": "Pune",
            "destination": "Mumbai",
            "route_type": "Short",
            "material": "Steel",
            "quantity_tonnes": 10.0,
            "distance_km": 150.0,
            "freight_cost_inr": 4500.0,
            "shipment_date": date(2025, 2, 24),
            "transporter": "T1",
        },
    ]
    metrics = compute_weekly_metrics(shipments)
    assert len(metrics) == 2
    routes = {m["route"] for m in metrics}
    assert routes == {"Mumbai-Pune", "Pune-Mumbai"}
