import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, X,
  TrendingUp, AlertTriangle, CheckCircle2
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useAppContext } from '../App'
import type { AnalysisRow } from '../api'

function FlagBadge({ flag }: { flag: string }) {
  if (flag === 'Yes') return <span className="status-yes" style={{ whiteSpace: 'nowrap' }}><AlertTriangle size={11} /> Unexplained</span>
  if (flag === 'No (justified)') return <span className="status-justified" style={{ whiteSpace: 'nowrap' }}><CheckCircle2 size={11} /> Justified</span>
  return <span className="status-no" style={{ whiteSpace: 'nowrap' }}>Normal</span>
}

const PAGE_SIZE = 25

type SortKey = 'route' | 'week_of' | 'cost_per_tonne_km' | 'own_history_pct' | 'peer_pct'

export default function RouteAnalysis() {
  const { results, hasResults, hasData, runInfo } = useAppContext()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [filterType, setFilterType] = useState(searchParams.get('type') || '')
  const [filterFlag, setFilterFlag] = useState(searchParams.get('flag') || '')
  const [sortKey, setSortKey] = useState<SortKey>('week_of')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AnalysisRow | null>(null)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = [...results]
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.route.toLowerCase().includes(q) ||
        r.week_of.includes(q)
      )
    }
    if (filterType) rows = rows.filter(r => r.route_type === filterType)
    if (filterFlag) {
      if (filterFlag === 'flagged') rows = rows.filter(r => r.flagged !== 'No')
      else if (filterFlag === 'unexplained') rows = rows.filter(r => r.flagged === 'Yes')
      else if (filterFlag === 'justified') rows = rows.filter(r => r.flagged === 'No (justified)')
      else if (filterFlag === 'normal') rows = rows.filter(r => r.flagged === 'No')
    }
    rows.sort((a, b) => {
      let av: any = a[sortKey] ?? ''
      let bv: any = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return rows
  }, [results, search, filterType, filterFlag, sortKey, sortAsc])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Build detail chart data for the selected route
  const detailChartData = useMemo(() => {
    if (!selected) return []
    return results
      .filter(r => r.route_key === selected.route_key)
      .sort((a, b) => a.week_of.localeCompare(b.week_of))
      .map(r => ({
        week: r.week_of.slice(5),
        cost: +r.cost_per_tonne_km.toFixed(4),
        history_avg: r.own_history_avg ? +r.own_history_avg.toFixed(4) : null,
        peer_avg: r.peer_avg ? +r.peer_avg.toFixed(4) : null,
        flagged: r.flagged,
      }))
  }, [selected, results])

  if (!hasData) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-16)' }}>
        <div className="empty-state">
          <TrendingUp size={48} />
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>No data loaded</h2>
          <p>Load the demo dataset or upload your own CSVs to view route analysis.</p>
        </div>
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-16)' }}>
        <div className="empty-state">
          <TrendingUp size={48} />
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Analysis not run yet</h2>
          <p>Go to the Run Report page or click "Run Analysis" on the Overview.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      <div className="container">
        <div className="page-header">
          <div className="section-kicker" style={{ marginBottom: 8 }}>Route Analysis</div>
          <h1 className="page-title">All Route-Week Results</h1>
          <p className="page-subtitle">
            {runInfo?.route_week_count} route-week records · {runInfo?.routes_analyzed} routes · threshold: {runInfo?.anomaly_threshold_pct}%
          </p>
        </div>

        {/* ---- FILTERS ---- */}
        <div style={{
          display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center',
          marginBottom: 'var(--space-5)',
        }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="route-search"
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="Search route or week…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              aria-label="Search routes"
            />
          </div>
          <select
            id="filter-type"
            className="input"
            style={{ flex: '0 1 160px' }}
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}
            aria-label="Filter by route type"
          >
            <option value="">All types</option>
            <option value="Short">Short</option>
            <option value="Medium">Medium</option>
            <option value="Long">Long</option>
          </select>
          <select
            id="filter-flag"
            className="input"
            style={{ flex: '0 1 180px' }}
            value={filterFlag}
            onChange={e => { setFilterFlag(e.target.value); setPage(1) }}
            aria-label="Filter by verdict"
          >
            <option value="">All verdicts</option>
            <option value="unexplained">Unexplained only</option>
            <option value="justified">Justified only</option>
            <option value="normal">Normal only</option>
            <option value="flagged">All flagged</option>
          </select>
          {(search || filterType || filterFlag) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterType(''); setFilterFlag(''); setPage(1) }}>
              <X size={14} /> Clear
            </button>
          )}
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} of {results.length} rows
          </span>
        </div>

        {/* ---- TABLE ---- */}
        <div className="table-wrap" style={{ marginBottom: 'var(--space-5)' }}>
          <table aria-label="Route analysis results">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('route')}>
                  Route {sortKey === 'route' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="sortable" onClick={() => toggleSort('week_of')}>
                  Week of {sortKey === 'week_of' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th>Type</th>
                <th className="sortable" onClick={() => toggleSort('cost_per_tonne_km')}>
                  Rate (<span className="currency-symbol">₹</span>/t-km) {sortKey === 'cost_per_tonne_km' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="sortable" onClick={() => toggleSort('own_history_pct')}>
                  vs History {sortKey === 'own_history_pct' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="sortable" onClick={() => toggleSort('peer_pct')}>
                  vs Peers {sortKey === 'peer_pct' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th>Verdict</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
                    No results match your filters.
                  </td>
                </tr>
              ) : paginated.map(row => (
                <tr
                  key={`${row.route_key}-${row.week_of}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(row === selected ? null : row)}
                  aria-selected={selected?.route_key === row.route_key && selected?.week_of === row.week_of}
                >
                  <td style={{ fontWeight: 600 }}>{row.route}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{row.week_of}</td>
                  <td><span className="badge badge-blue">{row.route_type}</span></td>
                  <td style={{ fontWeight: 600 }}>
                    <span className="currency-symbol">₹</span>
                    <span className="mono">{row.cost_per_tonne_km.toFixed(4)}</span>
                  </td>
                  <td style={{ color: (row.own_history_pct ?? 0) > 10 ? 'var(--color-danger-600)' : 'var(--text-primary)' }}>
                    {row.own_history_pct != null
                      ? `${row.own_history_pct >= 0 ? '+' : ''}${row.own_history_pct.toFixed(1)}%`
                      : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                  </td>
                  <td style={{ color: (row.peer_pct ?? 0) > 10 ? 'var(--color-warning-600)' : 'var(--text-primary)' }}>
                    {row.peer_pct != null
                      ? `${row.peer_pct >= 0 ? '+' : ''}${row.peer_pct.toFixed(1)}%`
                      : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                  </td>
                  <td><FlagBadge flag={row.flagged} /></td>
                  <td>
                    {row.matched_note_id
                      ? <span className="badge badge-success mono">{row.matched_note_id}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- PAGINATION ---- */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? '…' as any : totalPages - (6 - i)
              if (p === '…') return <span key="ellipsis" style={{ color: 'var(--text-muted)' }}>…</span>
              return (
                <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPage(+p)}>{p}</button>
              )
            })}
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
          </div>
        )}
      </div>

      {/* ---- DETAIL PANEL ---- */}
      {selected && (
        <>
          <div className="detail-overlay" onClick={() => setSelected(null)} />
          <div className="detail-panel" role="dialog" aria-label="Route detail panel" aria-modal="true">
            <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{selected.route}</h2>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Week of {selected.week_of} · {selected.route_type}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} aria-label="Close detail panel"><X size={18} /></button>
            </div>
            <div style={{ padding: 'var(--space-5)' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>
                    <span className="currency-symbol">₹</span>
                    <span className="mono">{selected.cost_per_tonne_km.toFixed(4)}</span>
                  </div>
                  <div className="stat-label">Cost per tonne-km</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>{selected.shipment_count}</div>
                  <div className="stat-label">Shipments this week</div>
                </div>
              </div>

              {/* Verdict */}
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 'var(--text-sm)' }}>Verdict</div>
                <FlagBadge flag={selected.flagged} />
              </div>

              {/* Comparisons */}
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 'var(--text-sm)' }}>Comparisons</div>
                <div style={{ background: 'var(--color-gray-50)', borderRadius: 8, padding: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>vs 8-week own history</span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: (selected.own_history_pct ?? 0) > 10 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
                      {selected.own_history_pct != null ? `${selected.own_history_pct >= 0 ? '+' : ''}${selected.own_history_pct.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  {selected.own_history_avg && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                      History avg: <span className="currency-symbol">₹</span>{selected.own_history_avg.toFixed(4)}/t-km ({selected.own_history_weeks} weeks)
                    </div>
                  )}
                  <div className="divider" style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>vs {selected.route_type} peers this week</span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: (selected.peer_pct ?? 0) > 10 ? 'var(--color-warning-600)' : 'var(--color-success-600)' }}>
                      {selected.peer_pct != null ? `${selected.peer_pct >= 0 ? '+' : ''}${selected.peer_pct.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  {selected.peer_avg && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Peer avg: <span className="currency-symbol">₹</span>{selected.peer_avg.toFixed(4)}/t-km ({selected.peer_route_count} routes)
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              {selected.matched_note_id && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 'var(--text-sm)' }}>Supporting Evidence</div>
                  <div style={{ background: 'var(--color-success-50)', border: '1px solid var(--color-success-100)', borderRadius: 8, padding: 'var(--space-3)' }}>
                    <span className="badge badge-success mono" style={{ marginBottom: 6 }}>{selected.matched_note_id}</span>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {selected.reason}
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 'var(--text-sm)' }}>Analysis Reason</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, background: 'var(--color-gray-50)', borderRadius: 8, padding: 'var(--space-3)' }}>
                  {selected.reason}
                </div>
              </div>

              {/* Historical trend */}
              {detailChartData.length > 1 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 'var(--text-sm)' }}>Cost History — {selected.route}</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={detailChartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => [`₹${v}`, '']} />
                      <Line type="monotone" dataKey="cost" stroke="var(--color-navy-600)" strokeWidth={2} dot={{ r: 3 }} name="Actual cost" />
                      <Line type="monotone" dataKey="history_avg" stroke="var(--color-gray-400)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="8-wk avg" />
                      <Line type="monotone" dataKey="peer_avg" stroke="var(--color-teal-500)" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Peer avg" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
