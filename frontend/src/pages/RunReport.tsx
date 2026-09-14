import { useState } from 'react'
import { Play, Download, CheckCircle2, XCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react'
import { runAnalysis, getEvaluationReport, downloadCSV, type EvaluationReport, type RunInfo } from '../api'
import { useAppContext } from '../App'

export default function RunReport() {
  const { hasData, hasResults, runInfo, refreshData } = useAppContext()
  const [threshold, setThreshold] = useState(10)
  const [loading, setLoading] = useState(false)
  const [evalLoading, setEvalLoading] = useState(false)
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null)
  const [error, setError] = useState('')

  const handleRun = async () => {
    setLoading(true)
    setError('')
    try {
      await runAnalysis(threshold)
      await refreshData()
      setEvalReport(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEval = async () => {
    setEvalLoading(true)
    try {
      const r = await getEvaluationReport()
      setEvalReport(r)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEvalLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      <div className="container">
        <div className="page-header">
          <div className="section-kicker" style={{ marginBottom: 8 }}>Run Report</div>
          <h1 className="page-title">Analysis Execution & Transparency</h1>
          <p className="page-subtitle">Configure and run the analysis, inspect data quality, download the output CSV, and review evaluation checks.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
          {/* Left: run controls */}
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Analysis Configuration</h2>

            <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <label htmlFor="threshold-input" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'block', marginBottom: 6 }}>
                  Anomaly Threshold (%)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    id="threshold-input"
                    type="number"
                    className="input"
                    style={{ width: 100 }}
                    value={threshold}
                    min={0} max={200} step={1}
                    onChange={e => setThreshold(+e.target.value)}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Default: 10% (configurable per FreightTiger brief §5.6)
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
                  A route-week is an anomaly candidate when cost exceeds an available baseline by more than this threshold.
                  Missing baselines are not treated as zero. Default 10% chosen as a balance between signal sensitivity and noise.
                </p>
              </div>

              {!hasData && (
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={15} /> Load data first from the Data Import page.
                </div>
              )}

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={15} /> {error}
                </div>
              )}

              <button
                id="run-btn"
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: 12 }}
                onClick={handleRun}
                disabled={!hasData || loading}
              >
                {loading ? <span className="spinner" /> : <Play size={16} />}
                {loading ? 'Running analysis…' : 'Run Analysis'}
              </button>

              {hasResults && (
                <button
                  id="download-csv-btn"
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => downloadCSV()}
                >
                  <Download size={16} /> Download Required CSV (8 columns)
                </button>
              )}
            </div>

            {/* Run info */}
            {hasResults && runInfo && (
              <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>Run Summary</div>
                <RunInfoTable info={runInfo} />
              </div>
            )}
          </div>

          {/* Right: evaluation */}
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Evaluation & Reproducibility</h2>

            {hasResults ? (
              <>
                <button
                  id="eval-btn"
                  className="btn btn-accent"
                  style={{ width: '100%', marginBottom: 'var(--space-5)' }}
                  onClick={handleEval}
                  disabled={evalLoading}
                >
                  {evalLoading ? <span className="spinner" /> : <RefreshCw size={16} />}
                  Run Evaluation Checks
                </button>

                {evalReport && <EvalReportPanel report={evalReport} />}
              </>
            ) : (
              <div className="empty-state" style={{ paddingTop: 'var(--space-10)' }}>
                <Play size={40} />
                <p>Run the analysis to enable evaluation checks.</p>
              </div>
            )}

            {/* LLM Cost Report */}
            {hasResults && runInfo && (
              <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Token & Cost Report</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'LLM calls', value: runInfo.llm_calls },
                    { label: 'Input tokens', value: runInfo.llm_input_tokens },
                    { label: 'Output tokens', value: runInfo.llm_output_tokens },
                    { label: 'Cost (USD)', value: `$${runInfo.llm_cost_usd.toFixed(4)}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="stat-card" style={{ padding: 'var(--space-3)' }}>
                      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{value}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="alert alert-info" style={{ fontSize: 'var(--text-xs)' }}>
                  <Info size={14} /> {runInfo.llm_note}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RunInfoTable({ info }: { info: RunInfo }) {
  const rows = [
    ['Input shipments', info.input_shipments],
    ['Valid shipments', info.valid_shipments],
    ['Invalid rows excluded', info.invalid_shipments],
    ['Context notes', info.valid_notes],
    ['Route-week records', info.route_week_count],
    ['Routes analyzed', info.routes_analyzed],
    ['Anomaly threshold', `${info.anomaly_threshold_pct}%`],
    ['Anomaly candidates', info.anomaly_candidates],
    ['Justified (No (justified))', info.justified_anomalies],
    ['Unexplained (Yes)', info.unexplained_anomalies],
    ['Date range', `${info.date_range_start} → ${info.date_range_end}`],
  ]

  return (
    <table style={{ width: '100%', fontSize: 'var(--text-sm)' }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label as string}>
            <td style={{ padding: '5px 0', color: 'var(--text-secondary)', width: '55%' }}>{label}</td>
            <td style={{ padding: '5px 0', fontWeight: 600 }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EvalReportPanel({ report }: { report: EvaluationReport }) {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-4)' }}>
        {report.failed === 0
          ? <CheckCircle2 size={22} color="var(--color-success-600)" />
          : <AlertTriangle size={22} color="var(--color-warning-600)" />}
        <div>
          <div style={{ fontWeight: 700 }}>
            {report.passed} / {report.total} checks passed
          </div>
          {report.reproducible !== null && (
            <div style={{ fontSize: 'var(--text-xs)', color: report.reproducible ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
              {report.reproducible ? '✓ Reproducible' : '✗ Not yet reproducible (run 3x)'}
            </div>
          )}
        </div>
      </div>

      {report.run_hashes.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Run hashes:</div>
          {report.run_hashes.map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 2 }}>
              Run {i + 1}: {h.slice(0, 32)}…
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {report.checks.map((c, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 6,
            background: c.passed ? 'var(--color-success-50)' : 'var(--color-danger-50)',
          }}>
            {c.passed
              ? <CheckCircle2 size={14} color="var(--color-success-600)" style={{ flexShrink: 0, marginTop: 2 }} />
              : <XCircle size={14} color="var(--color-danger-600)" style={{ flexShrink: 0, marginTop: 2 }} />}
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
