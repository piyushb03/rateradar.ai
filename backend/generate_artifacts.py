"""CLI script to execute the 3-run reproducibility test and generate final assessment CSV."""
import json
from pathlib import Path
from app.ingestion import parse_shipments, parse_notes
from app.services import run_analysis
from app.evaluation import run_evaluation

def main():
    root_dir = Path(__file__).parent.parent
    data_dir = root_dir / "AI Intern Case Study"
    
    print(f"Reading assessment data from: {data_dir}")
    shipments_csv = (data_dir / "shipment_records.csv").read_text(encoding="utf-8")
    notes_csv = (data_dir / "context_notes.csv").read_text(encoding="utf-8")

    shipments, ship_err, ship_warn = parse_shipments(shipments_csv)
    notes, note_err, note_warn = parse_notes(notes_csv)

    print(f"Parsed {len(shipments)} shipments ({len(ship_err)} errors, {len(ship_warn)} warnings)")
    print(f"Parsed {len(notes)} notes ({len(note_err)} errors, {len(note_warn)} warnings)")

    # Execute 3 independent runs
    runs = []
    for i in range(1, 4):
        res = run_analysis(shipments, notes, threshold_pct=10.0)
        runs.append(res)
        print(f"Run {i}: hash = {res['run_hash']}")

    hashes = [r["run_hash"] for r in runs]
    assert len(set(hashes)) == 1, "Reproducibility failure: Hashes differ across runs!"
    print(f"\n[OK] 3-Run Reproducibility Verified! SHA-256: {hashes[0]}")

    # Generate evaluation report
    eval_res = run_evaluation(runs[0]["results"], notes, hashes)
    print(f"Evaluation report: {eval_res['passed']}/{eval_res['total']} checks passed.")
    for c in eval_res["checks"]:
        print(f"  - [{'PASS' if c['passed'] else 'FAIL'}] {c['name']}: {c['detail']}")

    # Save final CSV artifact
    out_csv = root_dir / "rateradar_output.csv"
    out_csv.write_text(runs[0]["csv_content"], encoding="utf-8")
    print(f"\nSaved required CSV to: {out_csv}")
    print(f"Total rows in CSV: {len(runs[0]['results'])}")

    # Print summary of flagged verdicts
    results = runs[0]["results"]
    flagged_yes = [r for r in results if r["flagged"] == "Yes"]
    flagged_justified = [r for r in results if r["flagged"] == "No (justified)"]
    flagged_no = [r for r in results if r["flagged"] == "No"]

    print("\n--- Summary of Analysis Results ---")
    print(f"Total route-weeks: {len(results)}")
    print(f"Unexplained anomalies (Yes): {len(flagged_yes)}")
    print(f"Justified anomalies (No (justified)): {len(flagged_justified)}")
    print(f"Normal weeks (No): {len(flagged_no)}")

    # Save json summary for reports
    summary_data = {
        "run_hash": hashes[0],
        "hashes": hashes,
        "run_info": runs[0]["run_info"],
        "eval_report": eval_res,
        "counts": {
            "total": len(results),
            "unexplained": len(flagged_yes),
            "justified": len(flagged_justified),
            "normal": len(flagged_no),
        }
    }
    (root_dir / "analysis_run_summary.json").write_text(json.dumps(summary_data, indent=2), encoding="utf-8")
    print("Saved run summary JSON.")

if __name__ == "__main__":
    main()
