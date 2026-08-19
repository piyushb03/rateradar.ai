from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_data_load_demo_and_status():
    res = client.post("/api/data/load-demo")
    assert res.status_code == 200
    data = res.json()
    assert data["shipment_count"] > 0
    assert data["note_count"] > 0

    status_res = client.get("/api/data/status")
    assert status_res.status_code == 200
    st = status_res.json()
    assert st["has_data"] is True
    assert st["shipment_count"] == data["shipment_count"]


def test_run_analysis_and_results():
    # Ensure demo data is loaded first
    client.post("/api/data/load-demo")

    run_res = client.post("/api/analysis/run", json={"anomaly_threshold_pct": 10.0})
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["count"] > 0
    assert len(run_data["results"]) > 0
    assert run_data["run_info"]["anomaly_threshold_pct"] == 10.0

    # Get results endpoint
    results_res = client.get("/api/analysis/results")
    assert results_res.status_code == 200
    res_data = results_res.json()
    assert res_data["has_results"] is True
    assert len(res_data["results"]) > 0


def test_assistant_ask():
    # Ask questions over the analysis results
    res = client.post("/api/assistant/ask", json={"question": "Which routes have unexplained increases?"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert data["supported"] is True


def test_csv_export():
    res = client.get("/api/exports/csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "route,week_of,cost_per_tonne_km,vs_own_history,vs_similar_routes,flagged,matched_note_id,reason" in res.text
