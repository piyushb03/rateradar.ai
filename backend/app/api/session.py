"""In-memory session state shared across API requests.

Single-user session for the assessment demo.
Concurrent-request isolation is handled by the session lock.
"""
from __future__ import annotations

import asyncio
from typing import Any, Optional

# Global in-memory session (single-user demo)
_session: dict[str, Any] = {
    "shipments": [],
    "notes": [],
    "analysis_results": [],
    "run_info": None,
    "using_demo_data": False,
    "run_hashes": [],
    "csv_content": "",
}

_lock = asyncio.Lock()


async def get_session() -> dict[str, Any]:
    return _session


async def acquire_lock():
    return _lock
