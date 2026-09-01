// Typed API client for RateRadar backend
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.detail || err.message || 'An error occurred'
    return Promise.reject(new Error(msg))
  }
)

// --- Types ---
export interface UploadResponse {
  success: boolean
  shipment_count: number
  note_count: number
  invalid_shipment_rows: number
  invalid_note_rows: number
  errors: string[]
  warnings: string[]
}

export interface RunInfo {
  input_shipments: number
  valid_shipments: number
  invalid_shipments: number
  input_notes: number
  valid_notes: number
  route_week_count: number
  anomaly_threshold_pct: number
  anomaly_candidates: number
  justified_anomalies: number
  unexplained_anomalies: number
  routes_analyzed: number
  date_range_start: string | null
  date_range_end: string | null
  llm_calls: number
  llm_input_tokens: number
  llm_output_tokens: number
  llm_cost_usd: number
  llm_note: string
}

export interface AnalysisRow {
  route: string
  week_of: string
  cost_per_tonne_km: number
  vs_own_history: string
  vs_similar_routes: string
  flagged: 'Yes' | 'No (justified)' | 'No'
  matched_note_id: string
  reason: string
  route_type: string
  route_key: string
  own_history_avg: number | null
  own_history_pct: number | null
  peer_avg: number | null
  peer_pct: number | null
  shipment_count: number
  own_history_weeks: number
  peer_route_count: number
}

export interface AnalysisResponse {
  success: boolean
  run_info: RunInfo
  results: AnalysisRow[]
  run_hash: string
}

export interface NoteDetail {
  note_id: string
  date: string
  applies_to: string
  note: string
  matched_route_weeks: string[]
  is_non_supporting: boolean
  rejection_summary: string
}

export interface EvaluationCheck {
  name: string
  passed: boolean
  detail: string
}

export interface EvaluationReport {
  checks: EvaluationCheck[]
  total: number
  passed: number
  failed: number
  schema_valid: boolean
  reproducible: boolean | null
  run_hashes: string[]
}

// --- API calls ---

export const loadDemoData = () =>
  api.post<UploadResponse>('/data/load-demo').then(r => r.data)

export const uploadData = (shipmentsFile: File, notesFile: File) => {
  const fd = new FormData()
  fd.append('shipments_file', shipmentsFile)
  fd.append('notes_file', notesFile)
  return api.post<UploadResponse>('/data/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getDataStatus = () =>
  api.get<{
    has_data: boolean
    shipment_count: number
    note_count: number
    has_results: boolean
    using_demo_data: boolean
  }>('/data/status').then(r => r.data)

export const runAnalysis = (threshold?: number) =>
  api.post<AnalysisResponse>('/analysis/run', { anomaly_threshold_pct: threshold ?? 10 }).then(r => r.data)

export const getResults = () =>
  api.get<{ has_results: boolean; results: AnalysisRow[]; run_info: RunInfo | null }>('/analysis/results').then(r => r.data)

export const getNoteDetails = () =>
  api.get<{ notes: NoteDetail[] }>('/analysis/notes').then(r => r.data)

export const askQuestion = (question: string) =>
  api.post<{ answer: string; sources: string[]; supported: boolean }>('/assistant/ask', { question }).then(r => r.data)

export const getExampleQuestions = () =>
  api.get<{ examples: string[] }>('/assistant/examples').then(r => r.data)

export const getEvaluationReport = () =>
  api.get<EvaluationReport>('/evaluation/report').then(r => r.data)

export const downloadCSV = () =>
  api.get('/exports/csv', { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rateradar_output.csv'
    a.click()
    URL.revokeObjectURL(url)
  })

export const clearData = () =>
  api.delete('/data/clear').then(r => r.data)

export default api
