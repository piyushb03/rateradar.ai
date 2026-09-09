import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, Database, RefreshCw } from 'lucide-react'
import { uploadData, loadDemoData, clearData, type UploadResponse } from '../api'
import { useAppContext } from '../App'

export default function DataImport() {
  const { hasData, shipmentCount, noteCount, usingDemoData, refreshData } = useAppContext()
  const [shipmentsFile, setShipmentsFile] = useState<File | null>(null)
  const [notesFile, setNotesFile] = useState<File | null>(null)
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState<'shipments' | 'notes' | null>(null)
  const shipRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!shipmentsFile || !notesFile) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await uploadData(shipmentsFile, notesFile)
      setResult(res)
      await refreshData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadDemo = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await loadDemoData()
      setResult(res)
      await refreshData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    await clearData()
    setResult(null)
    setShipmentsFile(null)
    setNotesFile(null)
    await refreshData()
  }

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      <div className="container">
        <div className="page-header">
          <div className="section-kicker" style={{ marginBottom: 8 }}>Data Import</div>
          <h1 className="page-title">Import Shipment Data</h1>
          <p className="page-subtitle">
            Upload your own shipment and context-note CSVs, or load the bundled demo dataset.
          </p>
        </div>

        {/* Current data status */}
        {hasData && (
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Database size={16} />
              <span>
                <strong>{usingDemoData ? 'Demo dataset' : 'Custom dataset'}</strong> loaded —
                {' '}{shipmentCount.toLocaleString()} shipments, {noteCount} notes.
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleClear}>
              <RefreshCw size={13} /> Clear data
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
          {/* Upload form */}
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Upload Custom CSV Files</h2>

            {/* Shipments drop zone */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'block', marginBottom: 8 }}>
                Shipment Records CSV
              </label>
              <div
                className={`upload-zone ${dragging === 'shipments' ? 'dragging' : ''}`}
                onClick={() => shipRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging('shipments') }}
                onDragLeave={() => setDragging(null)}
                onDrop={e => {
                  e.preventDefault(); setDragging(null)
                  const f = e.dataTransfer.files[0]
                  if (f) setShipmentsFile(f)
                }}
                style={{ padding: 'var(--space-8)', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-label="Upload shipment records CSV"
                onKeyDown={e => e.key === 'Enter' && shipRef.current?.click()}
              >
                <Upload size={24} color="var(--color-navy-500)" />
                {shipmentsFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{shipmentsFile.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {(shipmentsFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>Drop file here or click to browse</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                      shipment_records.csv
                    </div>
                  </div>
                )}
                <input ref={shipRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) setShipmentsFile(e.target.files[0]) }} />
              </div>
            </div>

            {/* Notes drop zone */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'block', marginBottom: 8 }}>
                Context Notes CSV
              </label>
              <div
                className={`upload-zone ${dragging === 'notes' ? 'dragging' : ''}`}
                onClick={() => noteRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging('notes') }}
                onDragLeave={() => setDragging(null)}
                onDrop={e => {
                  e.preventDefault(); setDragging(null)
                  const f = e.dataTransfer.files[0]
                  if (f) setNotesFile(f)
                }}
                style={{ padding: 'var(--space-8)', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-label="Upload context notes CSV"
                onKeyDown={e => e.key === 'Enter' && noteRef.current?.click()}
              >
                <FileText size={24} color="var(--color-teal-500)" />
                {notesFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{notesFile.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {(notesFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>Drop file here or click to browse</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                      context_notes.csv
                    </div>
                  </div>
                )}
                <input ref={noteRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) setNotesFile(e.target.files[0]) }} />
              </div>
            </div>

            <button
              id="upload-btn"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!shipmentsFile || !notesFile || loading}
              onClick={handleUpload}
            >
              {loading ? <span className="spinner" /> : <Upload size={16} />}
              Upload & Validate
            </button>

            <div className="divider" />

            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
              — or use bundled assessment data —
            </div>

            <button
              id="load-demo-btn"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={handleLoadDemo}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <Database size={16} />}
              Load Demo Dataset (FreightTiger Assessment)
            </button>
          </div>

          {/* Schema reference + result */}
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Required Schema</h2>

            <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 8, color: 'var(--color-navy-700)' }}>
                shipment_records.csv columns:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['shipment_id', 'origin', 'destination', 'route_type', 'material', 'quantity_tonnes', 'distance_km', 'freight_cost_inr', 'shipment_date', 'transporter'].map(c => (
                  <span key={c} className="badge badge-blue mono" style={{ textTransform: 'none', letterSpacing: 0 }}>{c}</span>
                ))}
              </div>
              <div style={{ marginTop: 12, fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 8, color: 'var(--color-teal-600)' }}>
                context_notes.csv columns:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['note_id', 'date', 'applies_to', 'note'].map(c => (
                  <span key={c} className="badge badge-neutral mono" style={{ textTransform: 'none', letterSpacing: 0 }}>{c}</span>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Dates: YYYY-MM-DD. route_type: Short | Medium | Long. Max file size: 10 MB.
                Duplicate IDs are skipped with a warning. Invalid rows are excluded and reported.
              </div>
            </div>

            {/* Validation result */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {result && (
              <div className="card" style={{ padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {result.success
                    ? <CheckCircle2 size={20} color="var(--color-success-600)" />
                    : <AlertTriangle size={20} color="var(--color-warning-600)" />}
                  <span style={{ fontWeight: 700 }}>
                    {result.success ? 'Loaded successfully' : 'Loaded with errors'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div className="stat-card" style={{ padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{result.shipment_count.toLocaleString()}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Valid shipments</div>
                  </div>
                  <div className="stat-card" style={{ padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{result.note_count}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Valid notes</div>
                  </div>
                </div>
                {result.invalid_shipment_rows > 0 && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-700)', marginBottom: 4 }}>
                    ⚠ {result.invalid_shipment_rows} invalid shipment rows excluded.
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div style={{ maxHeight: 180, overflowY: 'auto', fontSize: 'var(--text-xs)', background: 'var(--color-gray-50)', borderRadius: 6, padding: 8, fontFamily: 'var(--font-mono)' }}>
                    {result.errors.map((e, i) => <div key={i} style={{ color: 'var(--color-danger-700)', marginBottom: 2 }}>{e}</div>)}
                  </div>
                )}
                {result.warnings.length > 0 && (
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 'var(--text-xs)', background: 'var(--color-warning-50)', borderRadius: 6, padding: 8, marginTop: 8 }}>
                    {result.warnings.map((w, i) => <div key={i} style={{ color: 'var(--color-warning-700)', marginBottom: 2 }}>⚠ {w}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
