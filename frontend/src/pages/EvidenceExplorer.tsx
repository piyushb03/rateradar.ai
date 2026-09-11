import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, FileText, Search } from 'lucide-react'
import { getNoteDetails, type NoteDetail } from '../api'
import { useAppContext } from '../App'

export default function EvidenceExplorer() {
  const { hasData } = useAppContext()
  const [notes, setNotes] = useState<NoteDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!hasData) return
    setLoading(true)
    getNoteDetails()
      .then(d => setNotes(d.notes))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [hasData])

  const filtered = notes.filter(n =>
    !search ||
    n.note_id.toLowerCase().includes(search.toLowerCase()) ||
    n.applies_to.toLowerCase().includes(search.toLowerCase()) ||
    n.note.toLowerCase().includes(search.toLowerCase())
  )

  if (!hasData) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-16)' }}>
        <div className="empty-state">
          <FileText size={48} />
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>No data loaded</h2>
          <p>Load data to explore the context notes and their match status.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      <div className="container">
        <div className="page-header">
          <div className="section-kicker" style={{ marginBottom: 8 }}>Evidence Explorer</div>
          <h1 className="page-title">Context Notes</h1>
          <p className="page-subtitle">
            Every note with its applicability scope, whether it was used as justification, and the full rejection reason if not.
          </p>
        </div>

        <div style={{ marginBottom: 'var(--space-5)', position: 'relative', maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="note-search"
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {filtered.map(note => (
              <NoteCard key={note.note_id} note={note} />
            ))}
            {filtered.length === 0 && (
              <div className="empty-state">
                <FileText size={40} />
                <p>No notes match your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({ note }: { note: NoteDetail }) {
  const isMatched = note.matched_route_weeks.length > 0
  const isNonSupporting = note.is_non_supporting

  return (
    <div className="card-elevated" style={{
      padding: 'var(--space-5)',
      borderLeft: `4px solid ${isNonSupporting ? 'var(--color-gray-300)' : isMatched ? 'var(--color-success-500)' : 'var(--color-warning-400)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: isMatched ? 'var(--color-success-100)' : 'var(--color-gray-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {isMatched
            ? <CheckCircle2 size={18} color="var(--color-success-600)" />
            : <XCircle size={18} color="var(--color-gray-400)" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span className="badge badge-blue mono">{note.note_id}</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{note.date}</span>
            <span className={`badge ${note.applies_to === 'All Routes' ? 'badge-neutral' : 'badge-blue'}`}>
              {note.applies_to}
            </span>
            {isNonSupporting && <span className="badge badge-neutral">Non-supporting</span>}
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 8 }}>
            {note.note}
          </p>

          {/* Match status */}
          {isMatched ? (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success-700)', background: 'var(--color-success-50)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
              ✓ Justified {note.matched_route_weeks.length} route-week{note.matched_route_weeks.length > 1 ? 's' : ''}:
              {' '}{note.matched_route_weeks.join(', ')}
            </div>
          ) : isNonSupporting ? (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--color-gray-50)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
              ✗ Excluded: This note explicitly does not support a cost increase.
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-700)', background: 'var(--color-warning-50)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>
              ✗ Not matched to any anomaly (route/date/content eligibility not met)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
