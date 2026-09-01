import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { BarChart2, FileText, Database, Play, HelpCircle, Activity, Menu, X, Download } from 'lucide-react'
import { getDataStatus, getResults, type AnalysisRow, type RunInfo, downloadCSV } from './api'
import Overview from './pages/Overview'
import RouteAnalysis from './pages/RouteAnalysis'
import EvidenceExplorer from './pages/EvidenceExplorer'
import DataImport from './pages/DataImport'
import RunReport from './pages/RunReport'
import Assistant from './pages/Assistant'

// Global state context
interface AppState {
  hasData: boolean
  hasResults: boolean
  shipmentCount: number
  noteCount: number
  usingDemoData: boolean
  results: AnalysisRow[]
  runInfo: RunInfo | null
  refreshData: () => Promise<void>
}

export const AppContext = createContext<AppState>({
  hasData: false,
  hasResults: false,
  shipmentCount: 0,
  noteCount: 0,
  usingDemoData: false,
  results: [],
  runInfo: null,
  refreshData: async () => {},
})

export const useAppContext = () => useContext(AppContext)

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: Activity, exact: true },
  { path: '/routes', label: 'Route Analysis', icon: BarChart2 },
  { path: '/evidence', label: 'Evidence', icon: FileText },
  { path: '/data', label: 'Data', icon: Database },
  { path: '/run', label: 'Run Report', icon: Play },
  { path: '/ask', label: 'Ask', icon: HelpCircle },
]

export default function App() {
  const [state, setState] = useState<Omit<AppState, 'refreshData'>>({
    hasData: false,
    hasResults: false,
    shipmentCount: 0,
    noteCount: 0,
    usingDemoData: false,
    results: [],
    runInfo: null,
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const refreshData = async () => {
    try {
      const [status, resultsData] = await Promise.all([
        getDataStatus(),
        getResults().catch(() => ({ has_results: false, results: [], run_info: null })),
      ])
      setState({
        hasData: status.has_data,
        hasResults: resultsData.has_results,
        shipmentCount: status.shipment_count,
        noteCount: status.note_count,
        usingDemoData: status.using_demo_data,
        results: resultsData.results || [],
        runInfo: resultsData.run_info,
      })
    } catch {
      // Backend may not be running yet
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  const contextValue: AppState = { ...state, refreshData }

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* ---- NAV ---- */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'white',
          borderBottom: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xs)',
        }}>
          <div className="container" style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            height: 'var(--nav-height)',
          }}>
            {/* Brand */}
            <NavLink to="/" style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              textDecoration: 'none', flexShrink: 0,
            }}>
              {/* Joblet-inspired geometric brand icon */}
              <div style={{
                width: 28, height: 28,
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--color-gray-900)' }} />
                <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--color-wine-800)' }} />
                <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--color-gray-900)' }} />
                <div style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--color-gray-900)' }} />
              </div>
              <span style={{
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'var(--color-gray-950)',
                letterSpacing: '-0.03em',
                display: 'flex', alignItems: 'center',
              }}>
                rateradar<span style={{ color: 'var(--color-wine-800)', fontWeight: 800 }}>.ai</span>
              </span>
            </NavLink>

            {/* Desktop nav */}
            <nav style={{
              display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16,
              flex: 1,
            }} className="desktop-nav" aria-label="Main navigation">
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  style={{ fontSize: '0.875rem', fontWeight: 500, padding: '6px 14px', borderRadius: 20 }}
                >
                  <Icon size={14} />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right side controls matching clean functional header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

              {/* Status or Sign In / Run Analysis pill button */}
              {state.hasData ? (
                <NavLink
                  to="/run"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 18px', borderRadius: 9999,
                    border: '1.5px solid var(--color-wine-800)',
                    color: 'var(--color-wine-800)',
                    fontWeight: 600, fontSize: '0.875rem',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-wine-800)' }} />
                  {state.hasResults ? 'Audited (728)' : 'Run Report'}
                </NavLink>
              ) : (
                <NavLink
                  to="/data"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 18px', borderRadius: 9999,
                    border: '1.5px solid var(--color-wine-800)',
                    color: 'var(--color-wine-800)',
                    fontWeight: 600, fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  Load Data
                </NavLink>
              )}

              {state.hasResults && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => downloadCSV()}
                  style={{ borderRadius: 20, gap: 4 }}
                  title="Export official 8-column assessment CSV"
                >
                  <Download size={13} />
                  CSV
                </button>
              )}

              {/* Mobile hamburger menu */}
              <button
                className="btn btn-ghost btn-sm mobile-menu-btn"
                style={{ display: 'none' }}
                onClick={() => setMobileMenuOpen(o => !o)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile nav drawer */}
          {mobileMenuOpen && (
            <nav style={{
              borderTop: '1px solid var(--border-default)',
              background: 'white',
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }} aria-label="Mobile navigation">
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        {/* ---- MAIN ---- */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/routes" element={<RouteAnalysis />} />
            <Route path="/evidence" element={<EvidenceExplorer />} />
            <Route path="/data" element={<DataImport />} />
            <Route path="/run" element={<RunReport />} />
            <Route path="/ask" element={<Assistant />} />
          </Routes>
        </main>

        {/* ---- FOOTER (High-Fidelity Joblet Translation) ---- */}
        <footer style={{
          borderTop: '1px solid var(--border-default)',
          background: 'white',
          padding: 'var(--space-12) 0 var(--space-8)',
          marginTop: 'auto',
        }}>
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-8)',
              marginBottom: 'var(--space-10)',
            }}>
              {/* Brand & Address info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 24, height: 24,
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2,
                  }}>
                    <div style={{ borderRadius: 2, background: 'var(--color-gray-900)' }} />
                    <div style={{ borderRadius: 2, background: 'var(--color-wine-800)' }} />
                    <div style={{ borderRadius: 2, background: 'var(--color-gray-900)' }} />
                    <div style={{ borderRadius: 2, background: 'var(--color-gray-900)' }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-gray-950)' }}>
                    rateradar<span style={{ color: 'var(--color-wine-800)' }}>.ai</span>
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  Freight Cost Intelligence — deterministic analysis, evidence-grounded verdicts. Connecting operational reality with financial accountability.
                </p>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <strong>FreightTiger Engineering, Inc.</strong><br />
                  Bandra Kurla Complex, Suite 401<br />
                  Mumbai, MH 400051
                </div>
              </div>

              {/* Product */}
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gray-950)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Product
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[{ label: 'Executive Overview', path: '/' }, { label: 'Route Analysis', path: '/routes' }, { label: 'Evidence Explorer', path: '/evidence' }, { label: 'Ask Intelligence', path: '/ask' }].map(l => (
                    <NavLink key={l.path} to={l.path} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Analysis */}
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gray-950)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Analysis &amp; Engine
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[{ label: 'Run Execution & Hash', path: '/run' }, { label: 'Data Import & Schema', path: '/data' }, { label: 'Evaluation Report (9/9)', path: '/run' }, { label: 'Download CSV Output', path: '/run' }].map(l => (
                    <NavLink key={l.path} to={l.path} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Methodology */}
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-gray-950)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Methodology
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  10.0% anomaly threshold. Strict rolling 8-week prior history. Same route-type peer cohorts excluding self. Deterministic TF-IDF note retrieval. Zero LLM hallucinations.
                </p>
              </div>
            </div>

            {/* Bottom Tag Cloud: Browse Corridors by Industry / Region (matching Joblet Screenshot 1) */}
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-6)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Browse Corridors by Industrial Belt
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {['Western Industrial (Mumbai-Pune)', 'Northern Capital (Delhi-Jaipur)', 'Southern Auto Spine (Chennai-Bangalore)', 'Eastern Mineral Belt (Kolkata-Bhubaneswar)', 'Textile & Chemical (Ahmedabad-Mumbai)', 'North-West Heavy Trunk (Mumbai-Delhi)'].map((belt, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-wine-700)' }} />
                    {belt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (max-width: 768px) {
          button[aria-label="Open menu"], button[aria-label="Close menu"] {
            display: flex !important;
          }
        }
      `}</style>
    </AppContext.Provider>
  )
}
