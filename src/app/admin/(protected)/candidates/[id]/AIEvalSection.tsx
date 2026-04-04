'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface DimensionScore {
  rubric_id: string
  name: string
  score: number
  max_score: number
  weight: number
  label: string
  justification: string
}

interface AIEval {
  id: string
  section: string
  question_id?: string
  question_text?: string
  answer_text?: string
  transcript_text?: string
  dimension_scores: DimensionScore[]
  weighted_score: number
  overall_feedback: string
  model_used: string
  evaluated_at: string
  eval_status: string
  assemblyai_job_id?: string
}

interface Props {
  submissionId: string
  aiEvals: AIEval[]
  casoAnswers: any[]
  videoRecorded: boolean
}

const scoreColor = (score: number, max: number) => {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.75) return 'var(--teal)'
  if (pct >= 0.5)  return 'var(--gold)'
  return '#ff6b6b'
}

function EvalBlock({
  evals,
  submissionId,
  section,
  videoRecorded,
}: {
  evals: AIEval[]
  submissionId: string
  section: 'caso' | 'sharktank'
  videoRecorded?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [localEvals, setLocalEvals] = useState<AIEval[]>(evals)
  const [activeQ, setActiveQ] = useState(0)
  const [autoPolling, setAutoPolling] = useState(false)
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoPollCount = useRef(0)

  const hasEvals = localEvals.length > 0
  const pending = localEvals.find(e => e.eval_status === 'transcribing' || e.eval_status === 'evaluating')

  // Poll SharkTank if there's a pending transcription/evaluation
  useEffect(() => {
    if (!pending) return
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/evaluate-sharktank?evalId=${pending.id}`)
      const data = await res.json()
      if (data.eval_status === 'completed' || data.eval_status === 'error') {
        clearInterval(pollRef.current!)
        window.location.reload()
      }
    }, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pending])

  // Auto-poll caso DB while waiting for the background auto-eval to complete
  useEffect(() => {
    if (section !== 'caso' || hasEvals || loading) return

    setAutoPolling(true)
    autoPollCount.current = 0

    autoPollRef.current = setInterval(async () => {
      autoPollCount.current++
      // Stop after ~2 minutes (30 × 4s)
      if (autoPollCount.current > 30) {
        clearInterval(autoPollRef.current!)
        setAutoPolling(false)
        return
      }
      try {
        const res = await fetch(`/api/evaluate-caso?submissionId=${submissionId}`)
        const data = await res.json()
        if (data.evals && data.evals.length > 0) {
          clearInterval(autoPollRef.current!)
          setAutoPolling(false)
          setLocalEvals(data.evals)
        }
      } catch { /* ignore poll errors */ }
    }, 4000)

    return () => { if (autoPollRef.current) clearInterval(autoPollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, submissionId])

  const runEval = async (force = false) => {
    setLoading(true)
    try {
      const endpoint = section === 'sharktank' ? '/api/evaluate-sharktank' : '/api/evaluate-caso'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, force }),
      })
      const data = await res.json()
      if (data.success || data.pending || data.skipped) {
        window.location.reload()
      } else {
        alert('Error: ' + (data.error || 'Error desconocido'))
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const avgScore = hasEvals && !pending
    ? Math.round(localEvals.filter(e => e.eval_status === 'completed').reduce((s, e) => s + (e.weighted_score || 0), 0) / (localEvals.filter(e => e.eval_status === 'completed').length || 1))
    : null

  const sectionConfig = {
    caso: { label: 'Caso Práctico', icon: '📊', color: 'var(--blue)', colorBg: 'rgba(67,97,238,.08)', colorBorder: 'rgba(67,97,238,.2)' },
    sharktank: { label: 'SharkTank Pitch', icon: '🦈', color: 'var(--red)', colorBg: 'rgba(233,69,96,.06)', colorBorder: 'rgba(233,69,96,.2)' },
  }
  const cfg = sectionConfig[section]

  const noVideoMsg = section === 'sharktank' && !videoRecorded

  return (
    <div style={{ background: 'var(--card)', border: `1px solid ${cfg.colorBorder}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasEvals ? 20 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '4px 10px', borderRadius: 100, background: cfg.colorBg, border: `1px solid ${cfg.colorBorder}` }}>
            <span style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: cfg.color, fontWeight: 700 }}>
              ✦ IA · {cfg.icon} {cfg.label}
            </span>
          </div>
          {avgScore !== null && (
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: avgScore >= 70 ? 'var(--teal)' : avgScore >= 40 ? 'var(--gold)' : '#ff6b6b' }}>
              {avgScore}%
            </span>
          )}
          {(pending || autoPolling) && (
            <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              {autoPolling ? 'Evaluando automáticamente...' : pending?.eval_status === 'transcribing' ? 'Transcribiendo...' : 'Evaluando...'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {hasEvals && !pending && (
            <button
              onClick={() => runEval(true)}
              disabled={loading}
              style={{ padding: '6px 12px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 12, fontFamily: 'DM Sans', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? '⏳' : '↺'} Re-evaluar
            </button>
          )}
          {!hasEvals && !noVideoMsg && !autoPolling && (
            <button
              onClick={() => runEval(false)}
              disabled={loading}
              style={{ padding: '8px 16px', borderRadius: 8, background: cfg.color === 'var(--blue)' ? 'var(--blue)' : 'var(--red)', border: 'none', color: '#fff', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5, boxShadow: `0 2px 12px ${cfg.colorBg}` }}
            >
              {loading ? '⏳ Procesando...' : `✦ Evaluar ${section === 'sharktank' ? 'video' : 'respuestas'}`}
            </button>
          )}
        </div>
      </div>

      {noVideoMsg && (
        <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans', padding: '8px 0' }}>
          Este candidato no grabó un video pitch.
        </div>
      )}

      {!hasEvals && !noVideoMsg && !loading && !autoPolling && (
        <div style={{ textAlign: 'center', padding: '20px 0 4px', fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans' }}>
          {section === 'sharktank'
            ? 'La evaluación transcribe el video y lo analiza con IA.'
            : 'La evaluación analiza las respuestas escritas del candidato.'}
        </div>
      )}
      {autoPolling && !hasEvals && (
        <div style={{ textAlign: 'center', padding: '20px 0 4px', fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans' }}>
          La evaluación corre automáticamente al recibir el assessment — los resultados aparecerán aquí en unos segundos.
        </div>
      )}

      {hasEvals && !pending && localEvals.some(e => e.eval_status === 'error') && localEvals.filter(e => e.eval_status === 'completed').length === 0 && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,100,100,.06)', border: '1px solid rgba(255,100,100,.2)', borderRadius: 9, fontSize: 12, color: '#ff8080', fontFamily: 'DM Sans' }}>
          {localEvals[0]?.overall_feedback?.includes('No audio')
            ? '⚠️ El video no tiene pista de audio — no se puede transcribir. Este problema ya está corregido para nuevas grabaciones.'
            : '⚠️ Error al procesar el video. Intenta re-evaluar.'}
        </div>
      )}

      {hasEvals && !pending && localEvals.length > 0 && (() => {
        const completed = localEvals.filter(e => e.eval_status === 'completed')
        if (completed.length === 0) return null
        const ev = section === 'sharktank' ? completed[0] : completed[activeQ]
        if (!ev) return null

        return (
          <>
            {/* Question tabs for caso */}
            {section === 'caso' && completed.length > 1 && (
              <div style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap' }}>
                {completed.map((e, i) => (
                  <button key={e.id} onClick={() => setActiveQ(i)} style={{
                    padding: '5px 12px', borderRadius: 7, fontSize: 11, fontFamily: 'DM Sans',
                    fontWeight: activeQ === i ? 600 : 400, cursor: 'pointer',
                    background: activeQ === i ? 'rgba(67,97,238,.1)' : 'transparent',
                    border: activeQ === i ? '1px solid rgba(67,97,238,.2)' : '1px solid var(--border)',
                    color: activeQ === i ? 'var(--blue)' : 'var(--dim)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    P{i + 1}
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700, color: scoreColor(e.weighted_score, 100) }}>
                      {e.weighted_score}%
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Transcript preview for sharktank */}
            {section === 'sharktank' && ev.transcript_text && (
              <details style={{ marginBottom: 16 }}>
                <summary style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', cursor: 'pointer', marginBottom: 6 }}>
                  Transcript del pitch
                </summary>
                <div style={{ marginTop: 8, padding: '12px 16px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--dim)', lineHeight: 1.7, fontFamily: 'DM Sans', fontStyle: 'italic' }}>
                  "{ev.transcript_text}"
                </div>
              </details>
            )}

            {/* Question context for caso */}
            {section === 'caso' && ev.question_text && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14, fontSize: 12, color: 'var(--dim)', fontFamily: 'DM Sans' }}>
                <strong style={{ color: 'var(--text)' }}>Pregunta:</strong> {ev.question_text}
              </div>
            )}

            {/* Dimension scores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(ev.dimension_scores || []).map(ds => {
                const pct = ds.max_score > 0 ? (ds.score / ds.max_score) * 100 : 0
                const color = scoreColor(ds.score, ds.max_score)
                return (
                  <div key={ds.rubric_id} style={{ padding: '12px 14px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'DM Sans', color: 'var(--text)' }}>{ds.name}</span>
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, fontFamily: 'Space Mono', fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30` }}>{ds.label}</span>
                          <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'Space Mono' }}>peso {ds.weight}%</span>
                        </div>
                        {ds.justification && (
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'DM Sans', lineHeight: 1.5 }}>{ds.justification}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color }}>{ds.score}</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Space Mono' }}>/{ds.max_score}</span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Overall feedback */}
            {ev.overall_feedback && (
              <div style={{ padding: '12px 16px', borderRadius: 9, background: `${cfg.colorBg}`, border: `1px solid ${cfg.colorBorder}` }}>
                <div style={{ fontSize: 9, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: cfg.color, marginBottom: 5 }}>✦ Feedback IA</div>
                <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.7, fontFamily: 'DM Sans' }}>{ev.overall_feedback}</div>
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 9, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', textAlign: 'right' }}>
              {ev.model_used} · {ev.evaluated_at ? new Date(ev.evaluated_at).toLocaleString('es-CO') : ''}
            </div>
          </>
        )
      })()}
    </div>
  )
}

export function AIEvalSection({ submissionId, aiEvals, casoAnswers, videoRecorded }: Props) {
  const casoEvals = aiEvals.filter(e => e.section === 'caso')
  const sharkEvals = aiEvals.filter(e => e.section === 'sharktank')

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 14 }}>
        ✦ Evaluación Automática IA
      </div>
      <EvalBlock evals={sharkEvals} submissionId={submissionId} section="sharktank" videoRecorded={videoRecorded} />
      <EvalBlock evals={casoEvals}  submissionId={submissionId} section="caso" />
    </div>
  )
}
