'use client'

import { useState } from 'react'

interface MetricResult {
  score: number
  max: number
  variables: Record<string, number>
  penalties: number
  evidence: string
  feedback: string
}

interface Evaluation {
  stage: string
  metrics: Record<string, MetricResult>
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
  roleplayVideoPath: string | null
  roleplayCompleted: boolean
}

const METRIC_LABELS: Record<string, string> = {
  C1: 'Diagnóstico y Venta Consultiva',
  C2: 'Propuesta de Solución',
  C3: 'Manejo de Objeciones',
  C4: 'Escucha Activa y Empatía',
  C5: 'Cierre y Seguimiento',
  C6: 'Componentes Conductuales',
}

const METRIC_MAX: Record<string, number> = {
  C1: 25, C2: 20, C3: 20, C4: 15, C5: 10, C6: 10,
}

const bandColor = (band: string) => {
  if (band === 'ELITE')             return { color: '#06d68a', bg: 'rgba(6,214,138,.08)', border: 'rgba(6,214,138,.2)' }
  if (band === 'SÓLIDO')            return { color: '#4361ee', bg: 'rgba(67,97,238,.08)', border: 'rgba(67,97,238,.2)' }
  if (band === 'EN DESARROLLO')     return { color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' }
  if (band === 'REQUIERE COACHING') return { color: '#e03554', bg: 'rgba(224,53,84,.08)', border: 'rgba(224,53,84,.2)' }
  return { color: '#ff6b6b', bg: 'rgba(255,107,107,.08)', border: 'rgba(255,107,107,.2)' }
}

const scoreColor = (score: number, max: number) => {
  const pct = max > 0 ? (score / max) * 100 : 0
  if (pct >= 75) return 'var(--teal)'
  if (pct >= 50) return 'var(--gold)'
  return '#ff6b6b'
}

export function RolePlayEvalSection({
  submissionId,
  initialScore,
  initialBand,
  initialEvaluation,
  initialTranscript,
  roleplayVideoPath,
  roleplayCompleted,
}: Props) {
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [score,      setScore]      = useState<number | null>(initialScore)
  const [band,       setBand]       = useState<string | null>(initialBand)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(initialEvaluation)
  const [transcript, setTranscript] = useState<string | null>(initialTranscript)
  const [showTranscript, setShowTranscript] = useState(false)
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null)

  const handleEvaluate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/evaluate-roleplay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al evaluar')
      setEvaluation(data.evaluation)
      setScore(data.evaluation.total)
      setBand(data.evaluation.band)
      setTranscript(data.transcript)
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
        <h3 style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', margin: 0 }}>
          📞 Role Play — Evaluación IA
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {transcript && (
            <button
              onClick={() => setShowTranscript(v => !v)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 11.5,
                background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
                color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              }}
            >
              {showTranscript ? 'Ocultar' : 'Ver'} transcripción
            </button>
          )}
          {roleplayVideoPath && (
            <button
              onClick={handleEvaluate}
              disabled={loading}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: loading ? 'rgba(255,255,255,.06)' : 'linear-gradient(140deg,#e03554,#c22448)',
                border: 'none', color: loading ? 'var(--muted)' : '#fff',
                fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(224,53,84,.3)',
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
      {!roleplayVideoPath && (
        <div style={{ padding: '20px', borderRadius: 10, background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.15)', color: 'var(--dim)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
          {roleplayCompleted
            ? '✅ RolePlay completado — sin grabación disponible para evaluar.'
            : '❌ RolePlay no completado.'}
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
          {/* Band + stage */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: bc.bg, border: `1px solid ${bc.border}`, width: 'fit-content' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: bc.color }} />
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: bc.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{band}</span>
            </div>
            {evaluation?.stage && (
              <div style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
                Etapa detectada: <strong style={{ color: 'var(--dim)' }}>{evaluation.stage}</strong>
              </div>
            )}
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
            {evaluation.key_strengths.map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans', lineHeight: 1.6, paddingLeft: 12, borderLeft: '2px solid rgba(6,214,160,.3)', marginBottom: 6 }}>{s}</div>
            ))}
          </div>
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(224,53,84,.04)', border: '1px solid rgba(224,53,84,.15)' }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--red)', marginBottom: 10 }}>🎯 Acciones prioritarias</div>
            {evaluation.priority_actions.map((a, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans', lineHeight: 1.6, paddingLeft: 12, borderLeft: '2px solid rgba(224,53,84,.3)', marginBottom: 6 }}>{i + 1}. {a}</div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics breakdown */}
      {evaluation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 4 }}>Desglose por métrica</div>
          {Object.entries(evaluation.metrics).map(([key, metric]) => {
            const isExpanded = expandedMetric === key
            const effectiveMax = metric.max > 0 ? metric.max : (METRIC_MAX[key] ?? 100)
            const pct = effectiveMax > 0 ? (metric.score / effectiveMax) * 100 : 0
            const col = scoreColor(metric.score, effectiveMax)
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
                {/* Metric row */}
                <div
                  onClick={() => setExpandedMetric(isExpanded ? null : key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer' }}
                >
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: col, flexShrink: 0, width: 28 }}>{key}</div>
                  <div style={{ flex: 1, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--text)' }}>{METRIC_LABELS[key]}</div>
                  {/* Mini bar */}
                  <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: col, flexShrink: 0, width: 52, textAlign: 'right' }}>
                    {metric.score}/{effectiveMax}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 10, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${col}20` }}>
                    {metric.penalties !== 0 && (
                      <div style={{ fontSize: 11.5, fontFamily: 'Space Mono, monospace', color: '#ff6b6b', marginBottom: 10, marginTop: 12 }}>
                        ⚠ Penalización aplicada: {metric.penalties} pts
                      </div>
                    )}
                    {metric.evidence && (
                      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.6, fontStyle: 'italic' }}>
                        <span style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--muted)', fontSize: 10, fontFamily: 'Space Mono', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Evidencia</span>
                        "{metric.evidence}"
                      </div>
                    )}
                    {metric.score < metric.max && metric.feedback && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(224,53,84,.04)', border: '1px solid rgba(224,53,84,.15)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 700, color: '#f07090', fontSize: 10, fontFamily: 'Space Mono', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Feedback accionable</span>
                        {metric.feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Transcript viewer */}
      {showTranscript && transcript && (
        <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', maxHeight: 400, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12 }}>Transcripción</div>
          <pre style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
            {transcript}
          </pre>
        </div>
      )}
    </div>
  )
}
