"""Historical (own-route) and peer (same route-type) baselines.

Own history:   average cost_per_tonne_km from the 8 calendar weeks strictly
               preceding the current week for the same route.
               Interval: [current_week - 8 weeks, current_week)

Peer baseline: arithmetic mean of cost_per_tonne_km from OTHER routes
               with the same route_type in the same week.
               The current route is explicitly excluded from the peer set.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional


HISTORY_WINDOW_WEEKS = 8


def compute_baselines(
    metrics: list[dict[str, Any]],
) -> dict[tuple[str, date], dict[str, Any]]:
    """Compute historical and peer baselines for every route-week.

    Returns a dict keyed by (route_key, week_of) with values:
        own_history_avg, own_history_weeks,
        own_history_pct (% vs own history, or None),
        peer_avg, peer_route_count,
        peer_pct (% vs peer, or None).
    """
    # Index metrics by (route_key, week_of) for O(1) lookup
    by_key: dict[tuple[str, date], dict[str, Any]] = {}
    for m in metrics:
        by_key[(m["route_key"], m["week_of"])] = m

    # Group weeks by route_key for history lookup
    by_route: dict[str, list[date]] = {}
    for rk, wk in by_key:
        by_route.setdefault(rk, []).append(wk)
    for rk in by_route:
        by_route[rk].sort()

    # Group metrics by week for peer lookup
    by_week: dict[date, list[dict[str, Any]]] = {}
    for m in metrics:
        by_week.setdefault(m["week_of"], []).append(m)

    results: dict[tuple[str, date], dict[str, Any]] = {}

    for (rk, wk), m in by_key.items():
        current_cost = m["cost_per_tonne_km"]

        # --- Own history ---
        window_start = wk - timedelta(weeks=HISTORY_WINDOW_WEEKS)
        window_end = wk  # exclusive

        hist_costs = [
            by_key[(rk, prior_wk)]["cost_per_tonne_km"]
            for prior_wk in by_route.get(rk, [])
            if window_start <= prior_wk < window_end
        ]
        own_avg: Optional[float] = None
        own_pct: Optional[float] = None
        if hist_costs:
            own_avg = sum(hist_costs) / len(hist_costs)
            own_pct = ((current_cost / own_avg) - 1) * 100

        # --- Peer baseline ---
        rt = m["route_type"]
        peers = [
            p["cost_per_tonne_km"]
            for p in by_week.get(wk, [])
            if p["route_key"] != rk and p["route_type"] == rt
        ]
        peer_avg: Optional[float] = None
        peer_pct: Optional[float] = None
        if peers:
            peer_avg = sum(peers) / len(peers)
            peer_pct = ((current_cost / peer_avg) - 1) * 100

        results[(rk, wk)] = {
            "own_history_avg": own_avg,
            "own_history_weeks": len(hist_costs),
            "own_history_pct": own_pct,
            "peer_avg": peer_avg,
            "peer_route_count": len(peers),
            "peer_pct": peer_pct,
        }

    return results
