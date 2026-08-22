from datetime import date
from app.ingestion import parse_shipments, parse_notes


def test_parse_shipments_valid():
    csv_data = """shipment_id,origin,destination,route_type,material,quantity_tonnes,distance_km,freight_cost_inr,shipment_date,transporter
S1,Mumbai,Pune,Short,Steel,10.0,150.0,6000.0,2025-02-24,T1
S2,Delhi,Jaipur,Short,Cement,20.0,280.0,12000.0,2025-02-25,T2
"""
    valid, errors, warnings = parse_shipments(csv_data)
    assert len(valid) == 2
    assert len(errors) == 0
    assert valid[0]["shipment_id"] == "S1"
    assert valid[0]["shipment_date"] == date(2025, 2, 24)
    assert valid[1]["shipment_id"] == "S2"


def test_parse_shipments_missing_column():
    csv_data = """shipment_id,origin,destination,route_type
S1,Mumbai,Pune,Short
"""
    valid, errors, warnings = parse_shipments(csv_data)
    assert len(valid) == 0
    assert len(errors) > 0
    assert "Missing required columns" in errors[0]


def test_parse_shipments_invalid_rows():
    csv_data = """shipment_id,origin,destination,route_type,material,quantity_tonnes,distance_km,freight_cost_inr,shipment_date,transporter
S1,Mumbai,Pune,Short,Steel,-10.0,150.0,6000.0,2025-02-24,T1
S2,Mumbai,Pune,Short,Steel,10.0,-50.0,6000.0,2025-02-24,T1
S3,Mumbai,Pune,Short,Steel,10.0,150.0,-500.0,2025-02-24,T1
S4,Mumbai,Pune,Short,Steel,10.0,150.0,6000.0,invalid-date,T1
S5,Mumbai,Pune,InvalidType,Steel,10.0,150.0,6000.0,2025-02-24,T1
"""
    valid, errors, warnings = parse_shipments(csv_data)
    assert len(valid) == 0
    assert len(errors) == 5


def test_parse_notes_valid():
    csv_data = """note_id,date,applies_to,note
N001,2025-02-24,Chennai-Bangalore,Flooding disrupted movement causing detours.
"""
    valid, errors, warnings = parse_notes(csv_data)
    assert len(valid) == 1
    assert len(errors) == 0
    assert valid[0]["note_id"] == "N001"
    assert valid[0]["date"] == date(2025, 2, 24)
