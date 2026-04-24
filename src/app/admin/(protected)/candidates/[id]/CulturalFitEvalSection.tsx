'use client'

import { useState, useEffect } from 'react'

interface DimensionResult {
  score: number
  max: number
  tier: string
  evidence: string
  feedback: string
}

interface Penalties {
  falta_honestidad: number
  defensividad_extrema: number
  falta_autocritica: number
}

interface Evaluation {
  dimensions: Record<string, DimensionResult>
  penalties: Penalties
  total: number
  band: string
  summary: string
  key_strengths: string[]
  priority_actions: string[]
}

interface Props {
  submissionId: string
  initialScore: number | null
  initialBand: string | null
  initialEvaluation: Evaluation | null
  initialTranscript: string | null
  culturalFitVideoPath: string | null
  culturalFitCompleted: boolean
}

const DIMENSION_LABELS: Record<string, string> = {
  gestion_conflictos: 'Gestión de Conflictos',
  fit_cultural:       'Fit Cultural',
  adaptabilidad:      'Adaptabilidad',
  dinamica_equipo:    'Dinámica de Equipo',
  gestion_feedback:   'Gestión de Feedback',
}

const DIMENSION_QUESTIONS: Record<string, string> = {
  gestion_conflictos: 'Cuéntame de una situación en la que tuviste un conflicto con un compañero de equipo.',
  fit_cultural:       '¿Qué tipo de ambiente de trabajo te hace rendir mejor? ¿Y en cuál no encajas?',
  adaptabilidad:      'Háblame de una vez en la que tuviste que adaptarte a un cambio importante.',
  dinamica_equipo:    'Cuando trabajas en equipo, ¿qué rol sueles tomar naturalmente? ¿Por qué?',
  gestion_feedback:   'Cuéntame de una situación donde recibiste feedback difícil. ¿Cómo reaccionaste?',
}

const TIER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  Elite:    { color: '#06d68a', bg: 'rgba(6,214,138,.1)',   border: 'rgba(6,214,138,.25)' },
  Solid:    { color: '#4361ee', bg: 'rgba(67,97,238,.1)',   border: 'rgba(67,97,238,.25)' },
  Critical: { color: '#e03554', bg: 'rgba(224,53,84,.1)',   border: 'rgba(224,53,84,.25)' },
}

const bandColor = (band: string) => {
  if (band === 'TOP TALENT')    return { color: '#06d68a', bg: 'rgba(6,214,138,.08)',   border: 'rgba(6,214,138,.2)' }
  if (band === 'STRONG FIT')    return { color: '#4361ee', bg: 'rgba(67,97,238,.08)',   border: 'rgba(67,97,238,.2)' }
  if (band === 'POTENTIAL RISK') return { color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' }
  return { color: '#e03554', bg: 'rgba(224,53,84,.08)', border: 'rgba(224,53,84,.2)' }
}

const scoreColor = (score: number, max: number) => {
  const pct = max > 0 ? (score / max) * 100 : 0
  if (pct >= 75) return 'var(--teal)'
  if (pct >= 50) return 'var(--gold)'
  return '#ff6b6b'
}

export function CulturalFitEvalSection({
  submissionId,
  initialScore,
  initialBand,
  initialEvaluation,
  initialTranscript,
  culturalFitVideoPath,
  culturalFitCompleted,
}: Props) {
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [score,         setScore]         = useState<number | null>(initialScore)
  const [band,          setBand]          = useState<string | null>(initialBand)
  const [evaluation,    setEvaluation]    = useState<Evaluation | null>(initialEvaluation)
  const [transcript,    setTranscript]    = useState<string | null>(initialTranscript)
  const [showTranscript, setShowTranscript] = useState(false)
  const [expandedDim,   setExpandedDim]   = useState<string | null>(null)

  // Auto-trigger only when video exists but NO previous evaluation AND score is null (not 0)
  useEffect(() => {
    if (culturalFitVideoPath && initialEvaluation === null && initialScore === null) {
      handleEvaluate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEvaluate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/evaluate-cultural-fit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId, force: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al evaluar')
      if (!data.evaluation) throw new Error('La API no devolvió una evaluación válida')
      setEvaluation(data.evaluation)
      setScore(data.evaluation.total ?? null)
      setBand(data.evaluation.band ?? null)
      setTranscript(data.transcript ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--r)', padding: 28, marginBottom: 20,
  }

  const bc = band ? bandColor(band) : null

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '2px', color: '#a855f7', margin: 0 }}>
          🎙 Cultural Fit — Evaluación IA
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {transcript && (
            <button
              onClick={() => setShowTranscript(v => !v)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 11.5,
                background: 'rgba(168,85,247,.06)', border: '1px solid rgba(168,85,247,.2)',
                color: '#a855f7', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              }}
            >
              {showTranscript ? 'Ocultar' : 'Ver'} transcripción
            </button>
          )}
          {culturalFitVideoPath && (
            <button
              onClick={handleEvaluate}
              disabled={loading}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: loading ? 'rgba(255,255,255,.06)' : 'linear-gradient(140deg,#a855f7,#7c3aed)',
                border: 'none', color: loading ? 'var(--muted)' : '#fff',
                fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(168,85,247,.3)',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />
                  Evaluando… (~2 min)
                </>
              ) : score !== null ? '🔄 Re-evaluar' : '✨ Evaluar con IA'}
            </button>
          )}
        </div>
      </div>

      {/* No video warning */}
      {!culturalFitVideoPath && (
        <div style={{ padding: '20px', borderRadius: 10, background: 'rgba(168,85,247,.04)', border: '1px solid rgba(168,85,247,.15)', color: 'var(--dim)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
          {culturalFitCompleted
            ? '✅ Cultural Fit completado — sin grabación disponible para evaluar.'
            : '❌ Cultural Fit no completado.'}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(224,53,84,.06)', border: '1px solid rgba(224,53,84,.2)', color: '#f07090', fontSize: 13, fontFamily: 'DM Sans, sans-serif', marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Score summary */}
      {score !== null && band && bc && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          {/* Total score */}
          <div style={{ flex: '0 0 auto', textAlign: 'center', padding: '20px 32px', borderRadius: 14, background: bc.bg, border: `1px solid ${bc.border}` }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 52, fontWeight: 700, color: bc.color, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', marginTop: 4 }}>/ 100 pts</div>
          </div>
          {/* Band + summary */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: bc.bg, border: `1px solid ${bc.border}`, width: 'fit-content' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: bc.color }} />
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: bc.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{band}</span>
            </div>
            {evaluation?.summary && (
              <p style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.7, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{evaluation.summary}</p>
            )}
          </div>
        </div>
      )}

      {/* Strengths + Actions */}
      {evaluation && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(6,214,160,.04)', border: '1px solid rgba(6,214,160,.15)' }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--teal)', marginBottom: 10 }}>💪 Fortalezas</div>
            {(evaluation.key_strengths || []).map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans', lineHeight: 1.6, paddingLeft: 12, borderLeft: '2px solid rgba(6,214,160,.3)', marginBottom: 6 }}>{s}</div>
            ))}
          </div>
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(168,85,247,.04)', border: '1px solid rgba(168,85,247,.15)' }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a855f7', marginBottom: 10 }}>🎯 Acciones prioritarias</div>
            {(evaluation.priority_actions || []).map((a, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans', lineHeight: 1.6, paddingLeft: 12, borderLeft: '2px solid rgba(168,85,247,.3)', marginBottom: 6 }}>{i + 1}. {a}</div>
            ))}
          </div>
        </div>
      )}

      {/* Dimension breakdown */}
      {evaluation?.dimensions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 4 }}>Desglose por dimensión</div>
          {Object.entries(evaluation.dimensions).map(([key, dim]) => {
            const isExpanded = expandedDim === key
            const pct = dim.max > 0 ? (dim.score / dim.max) * 100 : 0
            const col = scoreColor(dim.score, dim.max)
            const label = DIMENSION_LABELS[key] ?? key
            const question = DIMENSION_QUESTIONS[key]
            const tierStyle = dim.tier ? (TIER_COLORS[dim.tier] ?? TIER_COLORS['Critical']) : null
            return (
              <div
                key={key}
                style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${isExpanded ? col + '40' : 'var(--border)'}`,
                  background: isExpanded ? `${col}08` : 'rgba(255,255,255,.02)',
                  transition: 'all .15s',
                }}
              >
                <div
                  onClick={() => setExpandedDim(isExpanded ? null : key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                    {question && (
                      <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: 'var(--muted)', lineHeight: 1.4 }}>{question}</div>
                    )}
                  </div>
                  {tierStyle && dim.tier && (
                    <span style={{
                      fontSize: 10, fontFamily: 'Space Mono, monospace', fontWeight: 700,
                      padding: '3px 8px', borderRadius: 100, flexShrink: 0,
                      background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, color: tierStyle.color,
                      letterSpacing: '.5px', textTransform: 'uppercase',
                    }}>
                      {dim.tier}
                    </span>
                  )}
                  <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: col, flexShrink: 0, width: 52, textAlign: 'right' }}>
                    {dim.score}/{dim.max}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 10, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${col}20` }}>
                    {dim.evidence && (
                      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.6, fontStyle: 'italic' }}>
                        <span style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--muted)', fontSize: 10, fontFamily: 'Space Mono', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Evidencia</span>
                        "{dim.evidence}"
                      </div>
                    )}
                    {dim.feedback && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(168,85,247,.04)', border: '1px solid rgba(168,85,247,.15)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700, color: '#a855f7', fontSize: 10, fontFamily: 'Space Mono', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Feedback</span>
                        {dim.feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Penalties */}
      {evaluation?.penalties && Object.values(evaluation.penalties).some(v => v !== 0) && (
        <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10, background: 'rgba(224,53,84,.04)', border: '1px solid rgba(224,53,84,.18)' }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#e03554', marginBottom: 10 }}>⚠ Red Flags aplicadas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {evaluation.penalties.falta_honestidad !== 0 && (
              <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#f07090', display: 'flex', justifyContent: 'space-between' }}>
                <span>Falta de Honestidad</span>
                <span style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>{evaluation.penalties.falta_honestidad} pts</span>
              </div>
            )}
            {evaluation.penalties.defensividad_extrema !== 0 && (
              <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#f07090', display: 'flex', justifyContent: 'space-between' }}>
                <span>Defensividad Extrema</span>
                <span style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>{evaluation.penalties.defensividad_extrema} pts</span>
              </div>
            )}
            {evaluation.penalties.falta_autocritica !== 0 && (
              <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#f07090', display: 'flex', justifyContent: 'space-between' }}>
                <span>Falta de Autocrítica</span>
                <span style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>{evaluation.penalties.falta_autocritica} pts</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcript viewer */}
      {showTranscript && transcript && (
        <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', maxHeight: 400, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12 }}>Transcripción — Entrevista con Felipe</div>
          <pre style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
            {transcript}
          </pre>
        </div>
      )}
    </div>
  )
}
