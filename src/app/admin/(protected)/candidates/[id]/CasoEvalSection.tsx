'use client'

import { useState } from 'react'

interface Props {
  submissionId: string
  initialScore: number | null
  casoCompleted: boolean  // true if submission has caso answers
}

const scoreColor = (v: number) => v >= 70 ? 'var(--teal)' : v >= 40 ? 'var(--gold)' : '#ff6b6b'

export function CasoEvalSection({ submissionId, initialScore, casoCompleted }: Props) {
  const [score,   setScore]   = useState<number | null>(initialScore)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<{ questions_evaluated: number; questions_failed: number } | null>(null)

  async function runEval(force: boolean) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/evaluate-caso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, force }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      if (data.avg_caso_ai_score != null) setScore(data.avg_caso_ai_score)
      setResult({ questions_evaluated: data.questions_evaluated ?? 0, questions_failed: data.questions_failed ?? 0 })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!casoCompleted) return null

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', borderRadius: 9,
    fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
    cursor: loading ? 'default' : 'pointer',
    transition: 'all .15s',
    border: '1px solid',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: 28,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Evaluación IA — Caso Práctico</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {score != null && (
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
              padding: '4px 12px', borderRadius: 100,
              background: `${scoreColor(score)}18`,
              border: `1px solid ${scoreColor(score)}40`,
              color: scoreColor(score),
            }}>
              {score}%
            </span>
          )}
          {score == null ? (
            <button
              onClick={() => runEval(false)}
              disabled={loading}
              style={{
                ...btnBase,
                color: loading ? 'var(--muted)' : 'var(--teal)',
                background: loading ? 'rgba(255,255,255,.04)' : 'rgba(6,214,160,.08)',
                borderColor: loading ? 'var(--border)' : 'rgba(6,214,160,.25)',
              }}
            >
              {loading ? '⏳ Evaluando...' : '✨ Evaluar con IA'}
            </button>
          ) : (
            <button
              onClick={() => runEval(true)}
              disabled={loading}
              style={{
                ...btnBase,
                color: loading ? 'var(--muted)' : 'var(--blue)',
                background: loading ? 'rgba(255,255,255,.04)' : 'rgba(67,97,238,.08)',
                borderColor: loading ? 'var(--border)' : 'rgba(67,97,238,.2)',
              }}
            >
              {loading ? '⏳ Re-evaluando...' : '🔄 Re-evaluar'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 9, marginBottom: 16,
          background: 'rgba(233,69,96,.08)', border: '1px solid rgba(233,69,96,.25)',
          fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#ff6b6b',
        }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{
          padding: '12px 16px', borderRadius: 9, marginBottom: 16,
          background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.2)',
          fontFamily: 'Space Mono, monospace', fontSize: 12, color: 'var(--teal)',
        }}>
          ✓ Evaluadas {result.questions_evaluated} pregunta{result.questions_evaluated !== 1 ? 's' : ''}
          {result.questions_failed > 0 && (
            <span style={{ color: 'var(--gold)', marginLeft: 10 }}>
              · {result.questions_failed} con error
            </span>
          )}
          {score != null && (
            <span style={{ marginLeft: 10, fontWeight: 700, color: scoreColor(score) }}>
              · Score: {score}%
            </span>
          )}
        </div>
      )}

      {score == null && !loading && !result && (
        <div style={{
          padding: '20px 16px', borderRadius: 9,
          background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)',
          textAlign: 'center',
          fontFamily: 'Space Mono, monospace', fontSize: 12, color: 'var(--muted)',
        }}>
          Sin evaluación IA. Haz clic en "Evaluar con IA" para generar el score.
        </div>
      )}
    </div>
  )
}
