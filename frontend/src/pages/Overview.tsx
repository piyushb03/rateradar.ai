import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  AlertTriangle, CheckCircle2, Package, ArrowRight,
  MapPin, ChevronRight,
  ArrowUpRight, Globe, Building2, ShieldAlert, Download,
  Compass, RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppContext } from '../App'
import { loadDemoData, runAnalysis, downloadCSV } from '../api'
import type { AnalysisRow } from '../api'

function buildChartData(rows: AnalysisRow[]) {
  const byWeek: Record<string, { total: number; count: number; anomalies: number }> = {}
  for (const r of rows) {
    if (!byWeek[r.week_of]) byWeek[r.week_of] = { total: 0, count: 0, anomalies: 0 }
    byWeek[r.week_of].total += r.cost_per_tonne_km
    byWeek[r.week_of].count += 1
    if (r.flagged !== 'No') byWeek[r.week_of].anomalies += 1
  }
  return Object.entries(byWeek)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, d]) => ({
      week: week.slice(5),
      avg_cost: +(d.total / d.count).toFixed(4),
      anomalies: d.anomalies,
    }))
}

export default function Overview() {
  const { hasData, hasResults, results, runInfo, refreshData } = useAppContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const chartData = useMemo(() => buildChartData(results), [results])

  const topUnexplained = useMemo(() => {
    return results
      .filter(r => r.flagged === 'Yes')
      .sort((a, b) => (b.own_history_pct ?? 0) - (a.own_history_pct ?? 0))
      .slice(0, 5)
  }, [results])

  const handleLoadDemo = async () => {
    setLoading(true)
    setError('')
    try {
      await loadDemoData()
      await runAnalysis(10)
      await refreshData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Curated spotlight cards representing core lanes
  const spotlightCorridors = [
    {
      initial: 'D',
      name: 'Delhi — Jaipur',
      category: 'Northern Capital Trunk',
      type: 'Short (280 km)',
      rate: '₹4.1700',
      badge: '⚠ +35.5% Unexplained',
      badgeClass: 'badge-danger',
      details: 'Delhi NCR to Rajasthan · 490 shipments',
      query: 'Delhi-Jaipur',
    },
    {
      initial: 'A',
      name: 'Ahmedabad — Mumbai',
      category: 'Western Industrial Hub',
      type: 'Short (350 km)',
      rate: '₹3.2900',
      badge: '✓ +29.5% Justified (N002)',
      badgeClass: 'badge-success',
      details: 'Gujarat to Maharashtra · 490 shipments',
      query: 'Ahmedabad-Mumbai',
    },
    {
      initial: 'C',
      name: 'Chennai — Bangalore',
      category: 'Southern Auto Spine',
      type: 'Short (350 km)',
      rate: '₹3.4200',
      badge: '✓ Justified (N001 Floods)',
      badgeClass: 'badge-success',
      details: 'Tamil Nadu to Karnataka · 490 shipments',
      query: 'Chennai-Bangalore',
    },
    {
      initial: 'M',
      name: 'Mumbai — Pune',
      category: 'Expressway Freightway',
      type: 'Short (150 km)',
      rate: '₹3.9800',
      badge: '⚠ +23.6% Peer Deviation',
      badgeClass: 'badge-danger',
      details: 'JNPT Port Hinterland · 490 shipments',
      query: 'Mumbai-Pune',
    },
  ]

  return (
    <div style={{ paddingBottom: 'var(--space-16)' }}>
      {/* =========================================================================
          SECTION 1: HERO (High-Fidelity Joblet.ai Translation)
          ========================================================================= */}
      <section className="bg-pinstripe" style={{
        padding: 'clamp(40px, 8vw, 84px) 0 clamp(40px, 6vw, 64px)',
        borderBottom: '1px solid var(--border-default)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          {/* Section Kicker */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ marginBottom: 'var(--space-3)' }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--color-wine-50)',
              color: 'var(--color-wine-800)',
              fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '4px 14px', borderRadius: 9999,
              border: '1px solid var(--border-blush)',
            }}>
              <Compass size={13} /> FreightTiger Rate Intelligence
            </span>
          </motion.div>

          {/* Hero Editorial Serif Headline */}
          <motion.h1
            className="joblet-hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            See <span className="accent-wine">signals</span> behind<br />
            every freight-rate change. <span className="accent-wine">Right Now.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
              color: 'var(--text-secondary)',
              maxWidth: 580,
              margin: '0 auto var(--space-8)',
              lineHeight: 1.6,
            }}
          >
            Auditable cost per tonne-km tracking across India's freight corridors.
            Separate justified surcharges from suspicious rate inflation with verified evidence.
          </motion.p>

          {/* Direct Action CTAs (Clean, High-Value, Task-First) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              margin: '0 auto var(--space-6)',
            }}
          >
            <Link
              to="/routes?flag=unexplained"
              className="btn btn-lg"
              style={{
                background: 'var(--color-wine-800)',
                color: 'white',
                borderRadius: 9999,
                padding: '12px 28px',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                boxShadow: '0 4px 14px rgba(126, 25, 27, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <span>Review {hasResults && runInfo ? runInfo.unexplained_anomalies : 78} Unexplained Spikes</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/routes"
              className="btn btn-lg btn-secondary"
              style={{
                borderRadius: 9999,
                padding: '12px 24px',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                background: 'white',
                borderColor: 'var(--border-default)',
                textDecoration: 'none',
              }}
            >
              Explore All 728 Route-Weeks
            </Link>

            <Link
              to="/ask"
              className="btn btn-lg btn-secondary"
              style={{
                borderRadius: 9999,
                padding: '12px 20px',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                background: 'white',
                borderColor: 'var(--border-default)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'none',
              }}
            >
              <Compass size={15} style={{ color: 'var(--color-wine-800)' }} />
              Ask Assistant
            </Link>
          </motion.div>

          {/* Interactive Corridor Quick Navigation Chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            style={{ maxWidth: 880, margin: '0 auto' }}
          >
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}>
              Quick Jump to Corridor Analysis
            </div>
            <div className="corridor-chip-bar">
              {[
                { name: 'All Corridors', query: '' },
                { name: 'Delhi — Jaipur', query: 'Delhi-Jaipur' },
                { name: 'Ahmedabad — Mumbai', query: 'Ahmedabad-Mumbai' },
                { name: 'Chennai — Bangalore', query: 'Chennai-Bangalore' },
                { name: 'Mumbai — Pune', query: 'Mumbai-Pune' },
                { name: 'Kolkata — Bhubaneswar', query: 'Kolkata-Bhubaneswar' },
                { name: 'Mumbai — Delhi', query: 'Mumbai-Delhi' },
              ].map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="corridor-chip"
                  onClick={() => navigate(c.query ? `/routes?search=${encodeURIComponent(c.query)}` : '/routes')}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: idx === 0 ? 'var(--color-gray-400)' : 'var(--color-wine-700)',
                  }} />
                  {c.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Active Benchmark Metadata Pill (Clean, No Spellcheck squigglies, No Bouncing chevron) */}
          <div style={{
            marginTop: 'var(--space-6)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '12px',
            color: 'var(--text-secondary)',
            background: 'var(--color-gray-100)',
            padding: '6px 18px',
            borderRadius: 9999,
            border: '1px solid var(--border-default)',
          }}>
            <span>Active benchmark: 10% rolling threshold &bull; 8-week prior history &bull; same-type peer cohort</span>
          </div>

          {/* Action pills for first-time use */}
          {!hasData && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <button
                className="btn btn-primary"
                onClick={handleLoadDemo}
                disabled={loading}
                style={{ background: 'var(--color-wine-800)', borderColor: 'var(--color-wine-800)', borderRadius: 9999, padding: '10px 24px', gap: 8 }}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Package size={16} />}
                Load 2,940-Shipment Assessment Dataset
              </button>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ maxWidth: 440, margin: '16px auto 0' }}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: FEATURED CORRIDORS (Matching Joblet.ai Screenshot 3)
          ========================================================================= */}
      <section style={{ padding: 'var(--space-12) 0 var(--space-8)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 1.85rem)', fontWeight: 800, color: 'var(--color-gray-950)', letterSpacing: '-0.02em', margin: 0 }}>
                Featured Corridors
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Key freight routes monitored across India's active industrial hubs
              </p>
            </div>
            <Link
              to="/routes"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-wine-800)',
                textDecoration: 'none'
              }}
            >
              Browse all 6 routes <ArrowUpRight size={15} />
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-5)',
          }}>
            {spotlightCorridors.map((c, i) => (
              <motion.div
                key={i}
                className="joblet-corridor-card"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="joblet-card-avatar" style={{
                        background: i % 2 === 0 ? 'var(--color-wine-50)' : 'var(--color-navy-50)',
                        color: i % 2 === 0 ? 'var(--color-wine-800)' : 'var(--color-navy-800)',
                      }}>
                        {c.initial}
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {c.category}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-gray-950)' }}>
                          {c.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 16px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{c.type}</span>
                    <span className={`badge ${c.badgeClass}`} style={{ fontSize: '11px' }}>{c.badge}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
                    <span className="currency-symbol" style={{ fontSize: '1.25rem', color: 'var(--color-gray-950)' }}>₹</span>
                    <span className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-gray-950)', letterSpacing: '-0.02em' }}>
                      {c.rate.replace('₹', '')}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 4 }}>/ tonne-km</span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18 }}>
                    <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                    {c.details}
                  </div>
                </div>

                <Link
                  to={`/routes?search=${encodeURIComponent(c.query)}`}
                  className="btn btn-sm"
                  style={{
                    background: 'var(--color-gray-950)',
                    color: 'white',
                    borderRadius: 9999,
                    justifyContent: 'center',
                    fontWeight: 600,
                    padding: '8px 16px',
                    textDecoration: 'none',
                    display: 'flex',
                  }}
                >
                  Analyze route
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: BY THE NUMBERS (Matching Joblet.ai Screenshot 4)
          ========================================================================= */}
      <section style={{ padding: 'var(--space-12) 0', background: 'var(--color-gray-50)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-10)',
            alignItems: 'center',
          }}>
            {/* Left Column: 2x2 Numbers Cards */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                BY THE NUMBERS
              </div>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
                fontWeight: 600,
                lineHeight: 1.15,
                color: 'var(--color-gray-950)',
                marginBottom: 'var(--space-6)',
              }}>
                Results that speak for themselves.
              </h2>

              <div className="numbers-grid-2x2">
                {/* Card 1: Shipments (Blush tint) */}
                <div className="number-card number-card-blush">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Audited Shipments
                    </span>
                    <Globe size={18} style={{ color: 'var(--color-wine-700)' }} />
                  </div>
                  <div>
                    <div className="number-huge" style={{ color: 'var(--color-gray-950)' }}>
                      {hasResults && runInfo ? runInfo.valid_shipments.toLocaleString() : '2,940'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Normalized multi-carrier shipment records
                    </div>
                  </div>
                </div>

                {/* Card 2: Route-Weeks (Clean White) */}
                <div className="number-card number-card-white">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Route-Weeks
                    </span>
                    <Building2 size={18} style={{ color: 'var(--color-gray-500)' }} />
                  </div>
                  <div>
                    <div className="number-huge" style={{ color: 'var(--color-gray-950)' }}>
                      {hasResults && runInfo ? runInfo.route_week_count : '728'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Monday-to-Sunday weekly rolling cohorts
                    </div>
                  </div>
                </div>

                {/* Card 3: Unexplained (Solid Deep Wine) */}
                <div className="number-card number-card-wine">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                      Unexplained Flags
                    </span>
                    <ShieldAlert size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
                  </div>
                  <div>
                    <div className="number-huge" style={{ color: 'white' }}>
                      {hasResults && runInfo ? runInfo.unexplained_anomalies : '78'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      Rate hikes &gt;10% requiring human review
                    </div>
                  </div>
                </div>

                {/* Card 4: Justified (Mint) */}
                <div className="number-card number-card-mint">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success-700)' }}>
                      Justified Anomalies
                    </span>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-success-600)' }} />
                  </div>
                  <div>
                    <div className="number-huge" style={{ color: 'var(--color-success-700)' }}>
                      {hasResults && runInfo ? runInfo.justified_anomalies : '12'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-success-600)' }}>
                      Verified against notes N001, N002, N003
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Statement & CTA (Matching Joblet "Find work that fits") */}
            <div style={{ paddingLeft: 'clamp(0px, 2vw, 24px)' }}>
              <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                fontWeight: 600,
                color: 'var(--color-gray-950)',
                lineHeight: 1.15,
                marginBottom: 'var(--space-4)',
              }}>
                Freight rates that fit.
              </h3>
              <p style={{
                fontSize: 'var(--text-base)',
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                marginBottom: 'var(--space-6)',
              }}>
                Evaluate cost per tonne-km with deterministic 8-week history and same-type peer baselines.
                Detect genuine market events like floods and fuel price shifts without false positives from non-supporting notes.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  to="/routes?flag=Yes"
                  className="btn btn-lg"
                  style={{
                    background: 'var(--color-wine-800)',
                    color: 'white',
                    borderRadius: 9999,
                    padding: '12px 28px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>Review Unexplained Queue ({hasResults && runInfo ? runInfo.unexplained_anomalies : 78})</span>
                  <ArrowUpRight size={16} />
                </Link>
                {hasResults && (
                  <button
                    className="btn btn-lg btn-secondary"
                    onClick={() => downloadCSV()}
                    style={{ borderRadius: 9999, padding: '12px 22px', gap: 6 }}
                  >
                    <Download size={16} />
                    Download CSV
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: FLEET COST TREND CHART
          ========================================================================= */}
      {chartData.length > 0 && (
        <section style={{ padding: 'var(--space-12) 0 var(--space-6)' }}>
          <div className="container">
            <div className="card-elevated" style={{ padding: 'var(--space-6)', borderRadius: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-gray-950)', margin: 0 }}>
                    Fleet Average Cost per Tonne-Km Over Time
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Weekly weighted rate trend plotted alongside weekly anomaly incidence
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="badge badge-neutral mono" style={{ fontSize: '11px' }}>
                    {chartData.length} weeks analyzed
                  </span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-wine-800)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-wine-800)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border-default)', fontSize: 12, boxShadow: 'var(--shadow-md)' }}
                    formatter={(v: any, name: any) => [
                      name === 'avg_cost' ? `₹${Number(v).toFixed(4)}/t-km` : v,
                      name === 'avg_cost' ? 'Fleet avg cost' : 'Anomaly count',
                    ]}
                  />
                  <Legend formatter={(v) => v === 'avg_cost' ? 'Fleet avg cost/tonne-km (₹)' : 'Anomaly count'} />
                  <Area type="monotone" dataKey="avg_cost" stroke="var(--color-wine-800)" strokeWidth={2.5} fill="url(#costGrad)" dot={false} />
                  <Area type="monotone" dataKey="anomalies" stroke="#EF4444" strokeWidth={1.5} fill="url(#anomGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 5: TOP UNEXPLAINED ANOMALIES TABLE PREVIEW
          ========================================================================= */}
      {topUnexplained.length > 0 && (
        <section style={{ padding: 'var(--space-6) 0 var(--space-12)' }}>
          <div className="container">
            <div className="card-elevated" style={{ padding: 'var(--space-6)', borderRadius: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-gray-950)', margin: 0 }}>
                    Priority Unexplained Rate Spikes
                  </h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Top route-weeks exceeding 10% threshold with no verified justification
                  </p>
                </div>
                <Link to="/routes?flag=unexplained" className="btn btn-sm btn-ghost" style={{ color: 'var(--color-wine-800)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  View All ({hasResults && runInfo ? runInfo.unexplained_anomalies : 78}) <ChevronRight size={14} />
                </Link>
              </div>

              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Corridor</th>
                      <th style={{ width: '13%' }}>Week Of</th>
                      <th style={{ width: '15%' }}>Rate (<span className="currency-symbol">₹</span>/t-km)</th>
                      <th style={{ width: '18%' }}>vs Own History</th>
                      <th style={{ width: '18%' }}>vs Similar Routes</th>
                      <th style={{ width: '14%' }}>Status</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUnexplained.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--color-gray-950)' }}>{r.route}</td>
                        <td className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r.week_of}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-gray-950)' }}>
                          <span className="currency-symbol">₹</span>
                          <span className="mono">{r.cost_per_tonne_km.toFixed(4)}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--color-danger-700)', fontWeight: 700, fontSize: '0.9rem' }}>
                              {r.own_history_pct != null ? `+${r.own_history_pct.toFixed(1)}%` : '—'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              vs 8-wk baseline
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{
                              color: (r.peer_pct ?? 0) > 10 ? 'var(--color-warning-700)' : 'var(--text-primary)',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                            }}>
                              {r.peer_pct != null ? `${r.peer_pct >= 0 ? '+' : ''}${r.peer_pct.toFixed(1)}%` : '—'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              vs peer cohort
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-danger" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', fontSize: '11px', borderRadius: 9999,
                            fontWeight: 700, letterSpacing: '0.02em',
                          }}>
                            <AlertTriangle size={11} />
                            Unexplained
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            to={`/routes?search=${encodeURIComponent(r.route)}`}
                            className="btn btn-xs"
                            style={{
                              background: 'var(--color-wine-50)',
                              color: 'var(--color-wine-800)',
                              border: '1px solid var(--border-blush)',
                              borderRadius: 9999,
                              padding: '5px 14px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              textDecoration: 'none',
                            }}
                          >
                            Inspect <ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
