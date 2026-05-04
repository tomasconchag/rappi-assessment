'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TrainingSubmission {
  id: string
  cohort_id: string
  farmer_email: string
  farmer_name: string | null
  status: string
  completed_at: string | null
  score: number | null
  band: string | null
  evaluated_at: string | null
  vapi_call_id: string | null
  transcript: string | null
  evaluation: Record<string, unknown> | null
}

interface Cohort {
  id: string
  name: string
  is_active: boolean
}

const bandStyle = (band: string | null) => {
  if (!band) return { color: 'var(--muted)', bg: 'rgba(255,255,255,.04)', border: 'var(--border)' }
  if (band === 'ELITE') return { color: '#06d6a0', bg: 'rgba(6,214,160,.08)', border: 'rgba(6,214,160,.2)' }
  if (band === 'SÓLIDO') return { color: '#4361ee', bg: 'rgba(67,97,238,.08)', border: 'rgba(67,97,238,.2)' }
  if (band === 'EN DESARROLLO') return { color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' }
  return { color: '#e03554', bg: 'rgba(224,53,84,.08)', border: 'rgba(224,53,84,.2)' }
}

const statusStyle = (status: string) => {
  if (status === 'completed') return { color: '#06d6a0', label: 'Completado' }
  if (status === 'evaluating') return { color: '#f59e0b', label: 'Evaluando…' }
  if (status === 'eval_failed') return { color: '#e03554', label: 'Error eval.' }
  return { color: 'var(--muted)', label: 'Pendiente' }
}

const scoreColor = (v: number) => v >= 70 ? '#06d6a0' : v >= 50 ? '#f59e0b' : '#e03554'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function TrainingResultsTable({
  submissions,
  cohorts,
}: {
  submissions: TrainingSubmission[]
  cohorts: Cohort[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [cohortFilter, setCohortFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState<string | null>(null)

  const filtered = submissions.filter(s => {
    if (cohortFilter !== 'all' && s.cohort_id !== cohortFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = (s.farmer_name || '').toLowerCase()
      const email = s.farmer_email.toLowerCase()
      if (!name.includes(q) && !email.includes(q)) return false
    }
    return true
  })

  const handleEval = async (submissionId: string) => {
    setEvaluating(submissionId)
    try {
      const res = await fetch('/api/evaluate-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, force: true }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(`Error: ${d.error}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      alert('Error al evaluar')
    } finally {
      setEvaluating(null)
    }
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          style={{
            flex: 1, minWidth: 200, padding: '9px 13px', borderRadius: 8,
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
            color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none',
          }}
        />
        <select
          value={cohortFilter}
          onChange={e => setCohortFilter(e.target.value)}
          style={{
            padding: '9px 13px', borderRadius: 8,
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
            color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">Todas las cohortes</option>
          {cohorts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: filtered.length, color: 'var(--text)' },
          { label: 'Completados', value: filtered.filter(s => s.status === 'completed').length, color: '#06d6a0' },
          { label: 'Pendientes', value: filtered.filter(s => s.status === 'pending').length, color: '#f59e0b' },
          { label: 'Score promedio', value: (() => {
            const scored = filtered.filter(s => s.score != null)
            if (!scored.length) return '—'
            return Math.round(scored.reduce((a, s) => a + (s.score ?? 0), 0) / scored.length) + '%'
          })(), color: '#8098f8' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9, minWidth: 100 }}>
            <div style={{ fontSize: 9.5, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Fraunces, serif', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Sin resultados aún</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans' }}>Cuando los farmers completen el training, sus resultados aparecerán aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => {
            const isExpanded = expandedId === s.id
            const st = statusStyle(s.status)
            const bs = bandStyle(s.band)
            const cohortName = cohorts.find(c => c.id === s.cohort_id)?.name ?? s.cohort_id.slice(0, 8)
            type DimEntry = { score: number; max: number; label: string; evidence?: string; feedback?: string }
            type EvalData = {
              dimensions?: Record<string, DimEntry>
              summary?: string
              key_strengths?: string[]
              priority_actions?: string[]
            }
            const evalData = s.evaluation as EvalData | null
            const dims = evalData?.dimensions

            return (
              <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                >
                  {/* Avatar */}
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(6,214,160,.2), rgba(67,97,238,.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#06d6a0', flexShrink: 0, fontFamily: 'DM Sans' }}>
                    {(s.farmer_name || s.farmer_email).charAt(0).toUpperCase()}
                  </div>

                  {/* Name + email */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.farmer_name || s.farmer_email}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'DM Sans', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.farmer_name ? s.farmer_email : ''} · {cohortName}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                    {s.score != null ? (
                      <div style={{ fontSize: 18, fontFamily: 'Space Mono, monospace', fontWeight: 700, color: scoreColor(s.score) }}>{s.score}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Space Mono' }}>—</div>
                    )}
                  </div>

                  {/* Band */}
                  {s.band && (
                    <span style={{ fontSize: 10, fontFamily: 'Space Mono', padding: '3px 9px', borderRadius: 100, background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`, fontWeight: 600, flexShrink: 0 }}>
                      {s.band}
                    </span>
                  )}

                  {/* Status */}
                  <span style={{ fontSize: 11, color: st.color, fontFamily: 'DM Sans', flexShrink: 0 }}>{st.label}</span>

                  {/* Date */}
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', flexShrink: 0 }}>{fmt(s.completed_at)}</span>

                  {/* Eval button */}
                  {(s.status === 'eval_failed' || s.status === 'pending') && (
                    <button
                      onClick={e => { e.stopPropagation(); handleEval(s.id) }}
                      disabled={evaluating === s.id}
                      style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(67,97,238,.12)', border: '1px solid rgba(67,97,238,.25)', color: '#8098f8', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {evaluating === s.id ? '⏳' : '⚡ Eval'}
                    </button>
                  )}

                  <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
                    {/* Dimensions */}
                    {dims && Object.entries(dims).length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 9.5, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 10 }}>Dimensiones</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {Object.entries(dims).map(([key, dim]) => {
                            const pct = dim.max > 0 ? Math.round((dim.score / dim.max) * 100) : 0
                            return (
                              <div key={key} style={{ padding: '10px 14px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: dim.evidence || dim.feedback ? 8 : 0 }}>
                                  <div style={{ flex: 1, fontSize: 12.5, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)' }}>
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                  </div>
                                  <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: scoreColor(pct) }}>{dim.score}/{dim.max}</span>
                                  {dim.label && (
                                    <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'var(--muted)' }}>{dim.label}</span>
                                  )}
                                </div>
                                {dim.evidence && (
                                  <div style={{ fontSize: 11.5, color: 'var(--dim)', fontFamily: 'DM Sans', fontStyle: 'italic', marginBottom: 4 }}>
                                    &ldquo;{dim.evidence}&rdquo;
                                  </div>
                                )}
                                {dim.feedback && (
                                  <div style={{ fontSize: 11.5, color: '#f59e0b', fontFamily: 'DM Sans' }}>
                                    💡 {dim.feedback}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {evalData?.summary && (
                      <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 9.5, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>Resumen</div>
                        <p style={{ fontSize: 13, fontFamily: 'DM Sans', color: 'var(--dim)', lineHeight: 1.6, margin: 0 }}>{evalData.summary}</p>
                      </div>
                    )}

                    {/* Strengths & Actions */}
                    {(evalData?.key_strengths || evalData?.priority_actions) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                        {evalData?.key_strengths && (
                          <div style={{ padding: '12px 14px', background: 'rgba(6,214,160,.04)', borderRadius: 8, border: '1px solid rgba(6,214,160,.12)' }}>
                            <div style={{ fontSize: 9.5, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#06d6a0', marginBottom: 8 }}>Fortalezas</div>
                            {evalData.key_strengths.map((str, i) => (
                              <div key={i} style={{ fontSize: 12, fontFamily: 'DM Sans', color: 'var(--dim)', marginBottom: 4 }}>✓ {str}</div>
                            ))}
                          </div>
                        )}
                        {evalData?.priority_actions && (
                          <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,.04)', borderRadius: 8, border: '1px solid rgba(245,158,11,.12)' }}>
                            <div style={{ fontSize: 9.5, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#f59e0b', marginBottom: 8 }}>Acciones prioritarias</div>
                            {evalData.priority_actions.map((action, i) => (
                              <div key={i} style={{ fontSize: 12, fontFamily: 'DM Sans', color: 'var(--dim)', marginBottom: 4 }}>→ {action}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transcript */}
                    {s.transcript && (
                      <details style={{ marginTop: 12 }}>
                        <summary style={{ cursor: 'pointer', fontSize: 11, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', userSelect: 'none' }}>
                          Ver transcripción
                        </summary>
                        <pre style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(0,0,0,.2)', borderRadius: 8, fontSize: 11.5, fontFamily: 'DM Sans', color: 'var(--dim)', lineHeight: 1.7, whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 300 }}>
                          {s.transcript}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
