"""Weekly route metric aggregation.

Calculates cost_per_tonne_km = SUM(freight_cost_inr) / SUM(quantity_tonnes * distance_km)
per (origin, destination, route_type, week_of) group.

Week starts on Monday (ISO convention).
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import pandas as pd


def monday_of_week(d: date) -> date:
    """Return the Monday of the ISO week containing date d."""
    return d - timedelta(days=d.weekday())


def compute_weekly_metrics(shipments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aggregate shipments into weekly route metrics.

    Args:
        shipments: list of valid shipment dicts from ingestion.

    Returns:
        list of dicts with keys:
            route_key, route, route_type, week_of,
            cost_per_tonne_km, total_freight_cost, total_tonne_km, shipment_count
    """
    if not shipments:
        return []

    df = pd.DataFrame(shipments)

    # Derive week_of as the Monday of each shipment's week
    df["week_of"] = df["shipment_date"].apply(monday_of_week)

    # Route key: internal identity (directional, exact text)
    df["route_key"] = (
        df["origin"].str.strip()
        + "|"
        + df["destination"].str.strip()
        + "|"
        + df["route_type"].str.strip()
    )

    # Display route: "origin-destination"
    df["route"] = df["origin"].str.strip() + "-" + df["destination"].str.strip()

    # Intermediate: tonne-km per shipment
    df["tonne_km"] = df["quantity_tonnes"] * df["distance_km"]

    # Group by route_key and week_of
    agg = (
        df.groupby(["route_key", "route", "route_type", "week_of"], as_index=False)
        .agg(
            total_freight_cost=("freight_cost_inr", "sum"),
            total_tonne_km=("tonne_km", "sum"),
            shipment_count=("shipment_id", "count"),
        )
    )

    # cost_per_tonne_km: aggregate formula (not mean of individual ratios)
    agg["cost_per_tonne_km"] = agg["total_freight_cost"] / agg["total_tonne_km"]

    # Sort deterministically
    agg = agg.sort_values(["route_key", "week_of"]).reset_index(drop=True)

    return agg.to_dict(orient="records")
