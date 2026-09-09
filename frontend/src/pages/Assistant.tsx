import { useState, useEffect, useRef } from 'react'
import {
  HelpCircle, Send, Sparkles, AlertCircle,
  FileText, ArrowRight, RefreshCw, ShieldCheck
} from 'lucide-react'
import { askQuestion, getExampleQuestions } from '../api'
import { useAppContext } from '../App'
import { Link } from 'react-router-dom'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  supported?: boolean
  timestamp: string
}

export default function Assistant() {
  const { hasResults, results } = useAppContext()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your Freight Cost Intelligence assistant. Ask me questions about route anomalies, cost increases, peer comparisons, or supporting evidence. All answers are deterministically computed from your analysis data with zero external LLM calls.',
      supported: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [examples, setExamples] = useState<string[]>([
    'Which routes have unexplained increases?',
    'Why did Chennai-Bangalore become expensive in February 2025?',
    'Which routes should an analyst investigate first?',
    'Which increases have supporting evidence?',
    'What was the peer comparison for Ahmedabad-Mumbai in January 2025?',
  ])

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getExampleQuestions()
      .then(res => {
        if (res.examples && res.examples.length > 0) {
          setExamples(res.examples)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim()
    if (!q || loading) return

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await askQuestion(q)
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        supported: res.supported,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `Error retrieving answer: ${err.message || 'Server error'}. Please ensure analysis has been run.`,
        supported: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-8) 0', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'var(--color-navy-800)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ECDC4'
          }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', margin: 0 }}>
              Freight Intelligence Q&amp;A
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
              Grounded, verifiable explanations across your route rates and operational notes
            </p>
          </div>
        </div>

        {/* Methodology Notice Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          background: 'var(--color-navy-50)', border: '1px solid var(--color-navy-200)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
          marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-navy-800)'
        }}>
          <ShieldCheck size={18} style={{ color: 'var(--color-navy-600)', flexShrink: 0 }} />
          <div>
            <strong>100% Deterministic &amp; Auditable:</strong> Answers are retrieved strictly from calculated metrics and contextual notes.
            No hallucinated statements, zero external LLM API calls, and full traceability to specific route-weeks and note IDs.
          </div>
        </div>
      </div>

      {!hasResults && (
        <div className="card" style={{
          marginBottom: 'var(--space-6)',
          background: 'var(--warning-light)',
          borderColor: 'var(--warning-border)',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <AlertCircle size={20} style={{ color: 'var(--color-amber-600)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-amber-800)', fontSize: 'var(--text-sm)' }}>
                Analysis Not Yet Executed
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-amber-700)' }}>
                Questions will return best results once the dataset is loaded and analyzed.
              </div>
            </div>
          </div>
          <Link to="/run" className="btn btn-sm btn-primary" style={{ gap: 4 }}>
            Run Report <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Suggested prompts */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
          Suggested Inquiries
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {examples.map((ex, i) => (
            <button
              key={i}
              className="btn btn-sm btn-secondary"
              onClick={() => handleSend(ex)}
              disabled={loading}
              style={{ fontSize: 'var(--text-xs)', borderRadius: 20, padding: '4px 12px' }}
            >
              <Sparkles size={12} style={{ color: 'var(--color-teal-600)' }} />
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="card" style={{
        display: 'flex', flexDirection: 'column',
        minHeight: 420, maxHeight: 600, overflow: 'hidden', padding: 0
      }}>
        <div style={{
          flex: 1, overflowY: 'auto', padding: 'var(--space-5)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)'
        }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '82%',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3) var(--space-4)',
                background: msg.role === 'user' ? 'var(--color-navy-800)' : 'var(--bg-subtle)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 'var(--space-3)', marginBottom: 'var(--space-1)',
                  fontSize: 'var(--text-xs)',
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'
                }}>
                  <span style={{ fontWeight: 600 }}>
                    {msg.role === 'user' ? 'You' : 'RateRadar Assistant'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <div style={{
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>

                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div style={{
                    marginTop: 'var(--space-3)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--border-default)',
                    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)'
                  }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={12} /> Sources:
                    </span>
                    {msg.sources.map((src, idx) => (
                      <span key={idx} className="badge badge-blue" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)', color: 'var(--text-muted)'
              }}>
                <RefreshCw size={14} className="animate-spin" />
                Retrieving verifiable evidence...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault()
            handleSend()
          }}
          style={{
            display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--border-default)', background: 'white'
          }}
        >
          <input
            type="text"
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about route rates, increases, or justifications..."
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!input.trim() || loading}
            style={{ gap: 6 }}
          >
            <Send size={15} />
            <span>Ask</span>
          </button>
        </form>
      </div>

      {/* Info card footer */}
      <div style={{
        marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between',
        fontSize: 'var(--text-xs)', color: 'var(--text-muted)'
      }}>
        <span>Grounded in TF-IDF cosine ranking &amp; domain rules</span>
        <span>Routes in session: {results ? new Set(results.map(r => r.route)).size : 0}</span>
      </div>
    </div>
  )
}
