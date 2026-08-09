"""Pydantic schemas for all request, response, and internal data models."""
from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Domain enumerations
# ---------------------------------------------------------------------------

class RouteType(str, Enum):
    SHORT = "Short"
    MEDIUM = "Medium"
    LONG = "Long"


class FlaggedStatus(str, Enum):
    YES = "Yes"
    NO_JUSTIFIED = "No (justified)"
    NO = "No"


# ---------------------------------------------------------------------------
# Internal data models
# ---------------------------------------------------------------------------

class ShipmentRecord(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    route_type: RouteType
    material: str
    quantity_tonnes: float
    distance_km: float
    freight_cost_inr: float
    shipment_date: date
    transporter: str


class ContextNote(BaseModel):
    note_id: str
    date: date
    applies_to: str
    note: str


class RouteWeekMetric(BaseModel):
    """Weekly aggregated metric for a single route."""
    route_key: str          # "origin|destination|route_type"
    route: str              # "origin-destination" display form
    route_type: RouteType
    week_of: date
    cost_per_tonne_km: float
    total_freight_cost: float
    total_tonne_km: float
    shipment_count: int


class BaselineResult(BaseModel):
    """Historical and peer baselines for one route-week."""
    route_key: str
    week_of: date
    own_history_avg: Optional[float] = None
    own_history_weeks: int = 0
    own_history_pct: Optional[float] = None
    peer_avg: Optional[float] = None
    peer_route_count: int = 0
    peer_pct: Optional[float] = None


class NoteMatchResult(BaseModel):
    note_id: Optional[str] = None
    matched: bool = False
    reason: str = ""
    rejection_reasons: list[str] = Field(default_factory=list)


class AnalysisRow(BaseModel):
    """One row of the final output, corresponding to the 8-column contract."""
    route: str
    week_of: date
    cost_per_tonne_km: float
    vs_own_history: str
    vs_similar_routes: str
    flagged: FlaggedStatus
    matched_note_id: str       # empty string when none
    reason: str
    # Extra context (not exported in required CSV)
    route_type: RouteType
    own_history_avg: Optional[float] = None
    own_history_pct: Optional[float] = None
    peer_avg: Optional[float] = None
    peer_pct: Optional[float] = None
    shipment_count: int = 0


# ---------------------------------------------------------------------------
# API request / response schemas
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    success: bool
    shipment_count: int = 0
    note_count: int = 0
    invalid_shipment_rows: int = 0
    invalid_note_rows: int = 0
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AnalysisConfig(BaseModel):
    anomaly_threshold_pct: float = Field(
        default=10.0,
        ge=0.0,
        le=200.0,
        description="Percentage above baseline to flag an anomaly candidate (default 10%).",
    )


class RunInfo(BaseModel):
    input_shipments: int
    valid_shipments: int
    invalid_shipments: int
    input_notes: int
    valid_notes: int
    route_week_count: int
    anomaly_threshold_pct: float
    anomaly_candidates: int
    justified_anomalies: int
    unexplained_anomalies: int
    routes_analyzed: int
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    llm_calls: int = 0
    llm_input_tokens: int = 0
    llm_output_tokens: int = 0
    llm_cost_usd: float = 0.0
    llm_note: str = "Core analysis uses deterministic TF-IDF/rule-based retrieval only; no external LLM required."


class AnalysisResponse(BaseModel):
    success: bool
    run_info: RunInfo
    results: list[AnalysisRow]
    errors: list[str] = Field(default_factory=list)


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class QuestionResponse(BaseModel):
    answer: str
    sources: list[str] = Field(default_factory=list)
    supported: bool = True


class NoteDetail(BaseModel):
    note_id: str
    date: str
    applies_to: str
    note: str
    matched_route_weeks: list[str] = Field(default_factory=list)
    rejection_summary: str = ""


class EvaluationCheck(BaseModel):
    name: str
    passed: bool
    detail: str


class EvaluationReport(BaseModel):
    checks: list[EvaluationCheck]
    total: int
    passed: int
    failed: int
    schema_valid: bool
    reproducible: Optional[bool] = None
    run_hashes: list[str] = Field(default_factory=list)


class SessionState(BaseModel):
    """In-memory session: holds parsed data and last analysis results."""
    shipments: list[dict[str, Any]] = Field(default_factory=list)
    notes: list[dict[str, Any]] = Field(default_factory=list)
    analysis_results: list[dict[str, Any]] = Field(default_factory=list)
    run_info: Optional[dict[str, Any]] = None
    using_demo_data: bool = False
