'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { normalizedWeights } from '@/lib/challenges'
import type { SectionId } from '@/lib/challenges'

interface Submission {
  id: string
  config_id: string | null
  completed_at: string | null
  overall_score_pct: number | null
  math_score_pct: number | null
  caso_score_pct: number | null
  roleplay_score: number | null
  cultural_fit_score: number | null
  cultural_fit_band: string | null
  cultural_fit_completed: boolean | null
  video_recorded: boolean | null
  roleplay_completed: boolean | null
  enabled_sections: string[] | null
  challenge_weights: Partial<Record<SectionId, number>> | null
  candidates: { name: string; email: string; cedula: string } | { name: string; email: string; cedula: string }[] | null
  proctoring_reports: { fraud_score: number; fraud_level: string } | { fraud_score: number; fraud_level: string }[] | null
}

interface AssessmentConfig {
  id: string
  label: string
  is_active: boolean
}

const fraudStyle = (level: string) => {
  if (level === 'Confiable')    return { color: 'var(--teal)', bg: 'rgba(6,214,160,.08)',  border: 'rgba(6,214,160,.2)',  dot: 'var(--teal)' }
  if (level === 'Riesgo Medio') return { color: 'var(--gold)', bg: 'rgba(244,162,97,.08)', border: 'rgba(244,162,97,.2)', dot: 'var(--gold)' }
  return { color: '#ff6b6b', bg: 'rgba(233,69,96,.08)', border: 'rgba(233,69,96,.2)', dot: '#ff6b6b' }
}

const fraudShort = (level: string) => {
  if (level === 'Confiable')    return 'Confiable'
  if (level === 'Riesgo Medio') return 'Medio'
  return 'Alto'
}

const scoreColor = (v: number) => v >= 70 ? 'var(--teal)' : v >= 40 ? 'var(--gold)' : '#ff6b6b'

/** Returns the real set of sections for a submission, expanding beyond enabled_sections
 *  when scores/completion flags reveal sections that weren't recorded in the DB field. */
function effectiveSections(s: Submission): SectionId[] {
  const base = (s.enabled_sections ?? ['sharktank', 'caso', 'math']) as SectionId[]
  return [...new Set([
    ...base,
    ...(s.roleplay_completed  || s.roleplay_score      != null ? ['roleplay'     as SectionId] : []),
    ...(s.cultural_fit_completed || s.cultural_fit_score != null ? ['cultural_fit' as SectionId] : []),
  ])]
}

function computeOverall(s: Submission): number | null {
  const effectiveSec = effectiveSections(s)
  const weights = normalizedWeights(effectiveSec, s.challenge_weights ?? undefined)

  const scored: { id: SectionId; score: number }[] = []
  if (effectiveSec.includes('math')         && s.math_score_pct     != null) scored.push({ id: 'math',         score: s.math_score_pct })
  if (effectiveSec.includes('caso')         && s.caso_score_pct     != null) scored.push({ id: 'caso',         score: s.caso_score_pct })
  // roleplay_score is raw pts out of 87 — normalize to 0–100 for consistent weighting
  if (effectiveSec.includes('roleplay')     && s.roleplay_score     != null) scored.push({ id: 'roleplay',     score: Math.round((s.roleplay_score / 87) * 100) })
  // Completed but not yet manually scored → treat as 0 so it still pulls the average down
  if (effectiveSec.includes('roleplay')     && s.roleplay_completed  && s.roleplay_score     == null) scored.push({ id: 'roleplay',     score: 0 })
  if (effectiveSec.includes('cultural_fit') && s.cultural_fit_score  != null) scored.push({ id: 'cultural_fit', score: s.cultural_fit_score })
  if (effectiveSec.includes('cultural_fit') && s.cultural_fit_completed && s.cultural_fit_score == null) scored.push({ id: 'cultural_fit', score: 0 })

  if (scored.length === 0) return null
  const weightTotal = effectiveSec.reduce((sum, id) => sum + (weights[id] ?? 0), 0)
  if (weightTotal === 0) return null
  const weightedSum = scored.reduce((sum, { id, score }) => sum + score * (weights[id] ?? 0), 0)
  return Math.round(weightedSum / weightTotal)
}

function ScoreBar({ value }: { value: number }) {
  const color = scoreColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 52, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color }}>{value}%</span>
    </div>
  )
}

function exportCSV(submissions: Submission[]) {
  const headers = ['Nombre', 'Email', 'Cédula', 'Fecha', 'Score General', 'Math', 'RolePlay', 'Cultural Fit Score', 'Cultural Fit Band', 'Video', 'Integridad', 'Fraud Score']
  const rows = submissions.map(s => {
    const cand = Array.isArray(s.candidates) ? s.candidates[0] : s.candidates
    const pr   = Array.isArray(s.proctoring_reports) ? s.proctoring_reports[0] : s.proctoring_reports
    const date = s.completed_at ? new Date(s.completed_at).toLocaleDateString('es-CO') : ''
    return [
      cand?.name || '',
      cand?.email || '',
      cand?.cedula || '',
      date,
      computeOverall(s) ?? '',
      s.math_score_pct ?? '',
      s.roleplay_score ?? '',
      s.cultural_fit_score ?? '',
      s.cultural_fit_band ?? '',
      s.video_recorded ? 'Sí' : 'No',
      pr?.fraud_level || '',
      pr?.fraud_score ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url; a.download = `candidatos_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type SortKey = 'date' | 'overall' | 'math' | 'roleplay'
type SortDir = 'asc' | 'desc'
type FraudFilter = 'all' | 'Confiable' | 'Riesgo Medio' | 'Riesgo Alto'

const PAGE_SIZE = 50

export function CandidatesTable({ submissions, totalCount, configs = [] }: { submissions: Submission[]; totalCount?: number; configs?: AssessmentConfig[] }) {
  // Default to the first active config, so the list is pre-filtered by test
  const defaultConfig = configs.find(c => c.is_active)?.id ?? 'all'
  const [configFilter, setConfigFilter] = useState<string>(defaultConfig)
  const [query,       setQuery]       = useState('')
  const [sortKey,     setSortKey]     = useState<SortKey>('date')
  const [sortDir,     setSortDir]     = useState<SortDir>('desc')
  const [fraudFilter, setFraudFilter] = useState<FraudFilter>('all')
  const [minScore,    setMinScore]    = useState('')
  const [page,        setPage]        = useState(0)
  const [reEvalLoading, setReEvalLoading] = useState<Record<string, boolean>>({})
  const [reEvalDone,    setReEvalDone]    = useState<Record<string, boolean>>({})

  const triggerReEval = useCallback(async (s: Submission) => {
    const sid = s.id
    setReEvalLoading(prev => ({ ...prev, [sid]: true }))
    const sec = effectiveSections(s)
    const calls: Promise<unknown>[] = []
    if (sec.includes('roleplay') && s.roleplay_completed && s.roleplay_score == null)
      calls.push(fetch('/api/evaluate-roleplay',    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: sid, force: true }) }))
    if (sec.includes('cultural_fit') && s.cultural_fit_completed && s.cultural_fit_score == null)
      calls.push(fetch('/api/evaluate-cultural-fit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: sid, force: true }) }))
    await Promise.allSettled(calls)
    setReEvalLoading(prev => ({ ...prev, [sid]: false }))
    setReEvalDone(prev => ({ ...prev, [sid]: true }))
  }, [])

  const hasPendingEval = (s: Submission) => {
    const sec = effectiveSections(s)
    if (sec.includes('roleplay')     && s.roleplay_completed     && s.roleplay_score     == null) return true
    if (sec.includes('cultural_fit') && s.cultural_fit_completed && s.cultural_fit_score == null) return true
    return false
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(0)
  }

  const handleFilterChange = (fn: () => void) => { fn(); setPage(0) }

  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'

  const filtered = submissions
    .filter(s => {
      const cand = Array.isArray(s.candidates) ? s.candidates[0] : s.candidates
      const pr   = Array.isArray(s.proctoring_reports) ? s.proctoring_reports[0] : s.proctoring_reports
      if (configFilter !== 'all' && s.config_id !== configFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!cand?.name?.toLowerCase().includes(q) && !cand?.email?.toLowerCase().includes(q)) return false
      }
      if (fraudFilter !== 'all' && pr?.fraud_level !== fraudFilter) return false
      if (minScore && (computeOverall(s) ?? 0) < Number(minScore)) return false
      return true
    })
    .sort((a, b) => {
      let va = 0, vb = 0
      if (sortKey === 'date')    { va = new Date(a.completed_at || 0).getTime(); vb = new Date(b.completed_at || 0).getTime() }
      else if (sortKey === 'overall')  { va = computeOverall(a) ?? 0; vb = computeOverall(b) ?? 0 }
      else if (sortKey === 'math')     { va = a.math_score_pct ?? 0;  vb = b.math_score_pct ?? 0 }
      else if (sortKey === 'roleplay') { va = a.roleplay_score ?? 0;  vb = b.roleplay_score ?? 0 }
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // ── Summary stats ────────────────────────────────────────────────────────
  const total        = submissions.length
  const withScore    = submissions.filter(s => (computeOverall(s) ?? 0) > 0)
  const avgScore     = withScore.length > 0
    ? Math.round(withScore.reduce((sum, s) => sum + (computeOverall(s) ?? 0), 0) / withScore.length)
    : 0
  const completados  = withScore.length
  const pendienteIA  = submissions.filter(hasPendingEval).length

  const statCards = [
    { label: 'Total candidatos',    value: total,        color: 'var(--blue)',  icon: '👥' },
    { label: 'Score promedio',      value: `${avgScore}%`, color: scoreColor(avgScore), icon: '📊' },
    { label: 'Completados',         value: completados,  color: 'var(--teal)', icon: '✅' },
    { label: 'Pendientes eval IA',  value: pendienteIA,  color: pendienteIA > 0 ? 'var(--gold)' : 'var(--muted)', icon: '🤖' },
  ]

  const th: React.CSSProperties = {
    padding: '11px 16px',
    textAlign: 'left',
    fontFamily: 'Space Mono, monospace',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'var(--muted)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    background: 'rgba(255,255,255,.03)',
    fontWeight: 400,
  }

  const td: React.CSSProperties = {
    padding: '13px 16px',
    borderBottom: '1px solid rgba(255,255,255,.04)',
    verticalAlign: 'middle',
  }

  return (
    <div>

      {/* ── PRUEBAS ACTIVAS PICKER ───────────────────────────────────────── */}
      {configs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase',
            letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 10,
          }}>
            📋 Prueba activa
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* "Todas" pill */}
            <button
              onClick={() => handleFilterChange(() => setConfigFilter('all'))}
              style={{
                padding: '8px 16px', borderRadius: 100, fontSize: 12.5,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                border: `1px solid ${configFilter === 'all' ? 'rgba(67,97,238,.5)' : 'var(--border)'}`,
                background: configFilter === 'all' ? 'rgba(67,97,238,.12)' : 'var(--card)',
                color: configFilter === 'all' ? '#93c5fd' : 'var(--muted)',
                fontWeight: configFilter === 'all' ? 600 : 400,
                transition: 'all .15s',
              }}
            >
              Todas ({submissions.length})
            </button>

            {/* One pill per config, active ones highlighted */}
            {configs.map(cfg => {
              const count = submissions.filter(s => s.config_id === cfg.id).length
              const active = configFilter === cfg.id
              return (
                <button
                  key={cfg.id}
                  onClick={() => handleFilterChange(() => setConfigFilter(cfg.id))}
                  style={{
                    padding: '8px 16px', borderRadius: 100, fontSize: 12.5,
                    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                    border: `1px solid ${active ? 'rgba(0,214,138,.5)' : cfg.is_active ? 'rgba(0,214,138,.2)' : 'var(--border)'}`,
                    background: active ? 'rgba(0,214,138,.12)' : cfg.is_active ? 'rgba(0,214,138,.04)' : 'var(--card)',
                    color: active ? 'var(--green)' : cfg.is_active ? 'rgba(0,214,138,.8)' : 'var(--muted)',
                    fontWeight: active ? 700 : 400,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all .15s',
                  }}
                >
                  {cfg.is_active && <span style={{ fontSize: 8, background: 'var(--green)', borderRadius: '50%', width: 7, height: 7, flexShrink: 0, display: 'inline-block' }} />}
                  {cfg.label}
                  <span style={{ fontSize: 11, opacity: .7, fontFamily: 'Space Mono, monospace' }}>({count})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SUMMARY STATS BAR ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── SEARCH BAR ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)', display: 'flex' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => handleFilterChange(() => setQuery(e.target.value))}
          placeholder="Buscar por nombre o email..."
          style={{
            width: '100%',
            padding: '10px 14px 10px 38px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 9,
            color: 'var(--text)',
            fontSize: 13,
            fontFamily: 'DM Sans, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color .2s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(67,97,238,.4)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setPage(0) }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1, padding: 2 }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── FILTER BAR ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {/* Fraud filter */}
        <select
          value={fraudFilter}
          onChange={e => handleFilterChange(() => setFraudFilter(e.target.value as FraudFilter))}
          style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: 'var(--card)', border: '1px solid var(--border)',
            color: fraudFilter !== 'all' ? 'var(--text)' : 'var(--muted)',
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">Integridad: Todos</option>
          <option value="Confiable">✅ Confiable</option>
          <option value="Riesgo Medio">⚠ Riesgo Medio</option>
          <option value="Riesgo Alto">🔴 Riesgo Alto</option>
        </select>

        {/* Min score filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'DM Sans' }}>Score min:</span>
          <input
            type="number" min={0} max={100}
            value={minScore}
            onChange={e => handleFilterChange(() => setMinScore(e.target.value))}
            placeholder="—"
            style={{
              width: 56, padding: '7px 10px', borderRadius: 7, fontSize: 12,
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--text)', fontFamily: 'Space Mono, monospace',
              outline: 'none', textAlign: 'center',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans' }}>%</span>
        </div>

        {/* Clear filters */}
        {(fraudFilter !== 'all' || minScore || configFilter !== 'all') && (
          <button
            onClick={() => { setFraudFilter('all'); setMinScore(''); setConfigFilter('all'); setPage(0) }}
            style={{
              padding: '7px 12px', borderRadius: 7, fontSize: 11.5,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--muted)', fontFamily: 'DM Sans', cursor: 'pointer',
            }}
          >
            × Limpiar filtros
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 20 }}>Candidato</th>
                <th
                  style={{ ...th, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('date')}
                >
                  Fecha{sortIcon('date')}
                </th>
                <th
                  style={{ ...th, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('overall')}
                >
                  Score General{sortIcon('overall')}
                </th>
                <th
                  style={{ ...th, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('math')}
                >
                  Excel{sortIcon('math')}
                </th>
                <th
                  style={{ ...th, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('roleplay')}
                >
                  Role Play{sortIcon('roleplay')}
                </th>
                <th style={th}>Cultural Fit</th>
                <th style={th}>Integridad</th>
                <th style={{ ...th, textAlign: 'right', paddingRight: 20 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '56px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                    <div style={{ fontSize: 14, color: 'var(--dim)', fontFamily: 'DM Sans' }}>
                      {query ? `Sin resultados para "${query}"` : 'No hay candidatos aún.'}
                    </div>
                  </td>
                </tr>
              ) : paginated.map(s => {
                const pr   = Array.isArray(s.proctoring_reports) ? s.proctoring_reports[0] : s.proctoring_reports
                const cand = Array.isArray(s.candidates) ? s.candidates[0] : s.candidates
                const date = s.completed_at
                  ? new Date(s.completed_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'
                const fs      = pr ? fraudStyle(pr.fraud_level) : null
                const overall = computeOverall(s)
                const sec     = effectiveSections(s)

                return (
                  <tr
                    key={s.id}
                    style={{ transition: 'background .12s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.025)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {/* Candidato */}
                    <td style={{ ...td, paddingLeft: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(67,97,238,.25) 0%, rgba(58,12,163,.3) 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: 'var(--blue)',
                          flexShrink: 0, fontFamily: 'DM Sans',
                        }}>
                          {cand?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)', fontFamily: 'DM Sans' }}>
                            {cand?.name || 'Desconocido'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, fontFamily: 'DM Sans' }}>
                            {cand?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Fecha */}
                    <td style={{ ...td, fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {date}
                    </td>

                    {/* Score General */}
                    <td style={td}>
                      {overall != null
                        ? <ScoreBar value={overall} />
                        : <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>N/A</span>
                      }
                    </td>

                    {/* Excel / Math */}
                    <td style={td}>
                      {!sec.includes('math')
                        ? <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>N/A</span>
                        : <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: scoreColor(s.math_score_pct || 0), fontWeight: 700 }}>
                            {s.math_score_pct || 0}%
                          </span>
                      }
                    </td>

                    {/* Role Play */}
                    <td style={td}>
                      {!sec.includes('roleplay') ? (
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>N/A</span>
                      ) : s.roleplay_score != null ? (
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: scoreColor(s.roleplay_score), fontWeight: 700 }}>
                          {s.roleplay_score}%
                        </span>
                      ) : s.roleplay_completed ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 9px', borderRadius: 100,
                          fontSize: 10.5, fontFamily: 'Space Mono, monospace', fontWeight: 700,
                          color: 'var(--gold)',
                          background: 'rgba(245,158,11,.08)',
                          border: '1px solid rgba(245,158,11,.25)',
                          whiteSpace: 'nowrap',
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                          Pendiente
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>No</span>
                      )}
                    </td>

                    {/* Cultural Fit */}
                    <td style={td}>
                      {!sec.includes('cultural_fit') ? (
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>N/A</span>
                      ) : s.cultural_fit_score != null ? (() => {
                        const band = s.cultural_fit_band ?? ''
                        const bandCol =
                          band === 'TOP TALENT'    ? '#06d68a' :
                          band === 'STRONG FIT'    ? '#4361ee' :
                          band === 'POTENTIAL RISK' ? '#f59e0b' : '#e03554'
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: bandCol, fontWeight: 700 }}>
                              {s.cultural_fit_score}/100
                            </span>
                            {band && (
                              <span style={{ fontSize: 9.5, fontFamily: 'Space Mono, monospace', color: bandCol, opacity: 0.8, letterSpacing: '.3px' }}>
                                {band}
                              </span>
                            )}
                          </div>
                        )
                      })() : s.cultural_fit_completed ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 9px', borderRadius: 100,
                          fontSize: 10.5, fontFamily: 'Space Mono, monospace', fontWeight: 700,
                          color: '#a855f7', background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.25)',
                          whiteSpace: 'nowrap',
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#a855f7', flexShrink: 0 }} />
                          Pendiente
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>No</span>
                      )}
                    </td>

                    {/* Integridad */}
                    <td style={td}>
                      {fs && pr ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 100,
                          fontSize: 11, fontWeight: 700,
                          fontFamily: 'Space Mono, monospace',
                          color: fs.color,
                          background: fs.bg,
                          border: `1px solid ${fs.border}`,
                          whiteSpace: 'nowrap',
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: fs.dot, flexShrink: 0 }} />
                          {fraudShort(pr.fraud_level)}
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ ...td, paddingRight: 20, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {hasPendingEval(s) && !reEvalDone[s.id] && (
                          <button
                            onClick={e => { e.stopPropagation(); triggerReEval(s) }}
                            disabled={reEvalLoading[s.id]}
                            title="Disparar evaluaciones IA pendientes"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '6px 10px', borderRadius: 7,
                              fontSize: 11, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                              color: reEvalLoading[s.id] ? 'var(--muted)' : 'var(--gold)',
                              background: reEvalLoading[s.id] ? 'rgba(255,255,255,.04)' : 'rgba(245,158,11,.08)',
                              border: `1px solid ${reEvalLoading[s.id] ? 'var(--border)' : 'rgba(245,158,11,.25)'}`,
                              cursor: reEvalLoading[s.id] ? 'default' : 'pointer',
                              transition: 'all .15s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {reEvalLoading[s.id] ? '⏳' : '⚡'} Eval
                          </button>
                        )}
                        {reEvalDone[s.id] && (
                          <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--teal)' }}>✓ Lanzado</span>
                        )}
                        <Link
                          href={`/admin/candidates/${s.id}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 7,
                            fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                            color: 'var(--blue)',
                            background: 'rgba(67,97,238,.08)',
                            border: '1px solid rgba(67,97,238,.15)',
                            textDecoration: 'none',
                            transition: 'all .15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(67,97,238,.15)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(67,97,238,.08)' }}
                        >
                          Ver →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {/* Left: count + pagination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}{totalCount != null && totalCount > submissions.length ? ` (mostrando ${submissions.length} de ${totalCount})` : ''}
              </span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12,
                      background: page === 0 ? 'transparent' : 'var(--card)',
                      border: '1px solid var(--border)',
                      color: page === 0 ? 'var(--muted)' : 'var(--text)',
                      cursor: page === 0 ? 'default' : 'pointer',
                      fontFamily: 'Space Mono, monospace',
                    }}
                  >←</button>
                  <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', padding: '0 4px' }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12,
                      background: page >= totalPages - 1 ? 'transparent' : 'var(--card)',
                      border: '1px solid var(--border)',
                      color: page >= totalPages - 1 ? 'var(--muted)' : 'var(--text)',
                      cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                      fontFamily: 'Space Mono, monospace',
                    }}
                  >→</button>
                </div>
              )}
            </div>
            {/* Right: export */}
            <button
              onClick={() => exportCSV(submissions)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7,
                fontSize: 11.5, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                color: 'var(--teal)',
                background: 'rgba(0,196,158,.08)',
                border: '1px solid rgba(0,196,158,.2)',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,196,158,.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,196,158,.08)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v7M3 5.5L6 8.5 9 5.5M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Exportar CSV
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
