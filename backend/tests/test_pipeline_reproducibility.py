from pathlib import Path
from app.ingestion import parse_shipments, parse_notes
from app.services import run_analysis
from app.evaluation import run_evaluation


def test_reproducibility_on_demo_data():
    """Three runs of the pipeline on identical input must produce identical SHA-256 hashes."""
    data_dir = Path(__file__).parent.parent / "data"
    shipments_csv = (data_dir / "shipment_records.csv").read_text(encoding="utf-8")
    notes_csv = (data_dir / "context_notes.csv").read_text(encoding="utf-8")

    shipments, _, _ = parse_shipments(shipments_csv)
    notes, _, _ = parse_notes(notes_csv)

    run1 = run_analysis(shipments, notes, threshold_pct=10.0)
    run2 = run_analysis(shipments, notes, threshold_pct=10.0)
    run3 = run_analysis(shipments, notes, threshold_pct=10.0)

    hash1 = run1["run_hash"]
    hash2 = run2["run_hash"]
    hash3 = run3["run_hash"]

    assert hash1 == hash2 == hash3
    assert len(hash1) == 64  # SHA-256


def test_evaluation_checks_pass():
    """All evaluation checks must pass on the demo analysis output."""
    data_dir = Path(__file__).parent.parent / "data"
    shipments_csv = (data_dir / "shipment_records.csv").read_text(encoding="utf-8")
    notes_csv = (data_dir / "context_notes.csv").read_text(encoding="utf-8")

    shipments, _, _ = parse_shipments(shipments_csv)
    notes, _, _ = parse_notes(notes_csv)

    analysis = run_analysis(shipments, notes, threshold_pct=10.0)
    rows = analysis["results"]

    eval_report = run_evaluation(
        rows, notes, [analysis["run_hash"], analysis["run_hash"], analysis["run_hash"]]
    )

    assert eval_report["failed"] == 0
    assert eval_report["passed"] == eval_report["total"]
    assert eval_report["schema_valid"] is True
    assert eval_report["reproducible"] is True
