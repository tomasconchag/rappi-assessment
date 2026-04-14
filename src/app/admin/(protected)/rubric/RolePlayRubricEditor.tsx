'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ScaleEntry {
  score: number
  label: string
  description: string
}

interface RubricRow {
  id: string
  name: string
  description: string // M1, M2, M1_PENALTY, etc.
  weight: number
  position: number
  scale: ScaleEntry[]
  active: boolean
  isNew?: boolean
}

interface MetricMeta {
  id: string
  label: string
  color: string
  isNew?: boolean
}

// Known C1-C6 labels (v4.0 — totals: C1=14, C2=18, C3=20, C4=15, C5=10, C6=10 = 87 pts)
const KNOWN_METRICS: Record<string, { label: string; color: string }> = {
  C1: { label: 'Diagnóstico y Venta Consultiva',  color: '#4361ee' },
  C2: { label: 'Propuesta de Solución',            color: '#4361ee' },
  C3: { label: 'Manejo de Objeciones',             color: '#f59e0b' },
  C4: { label: 'Escucha Activa y Empatía',         color: '#f59e0b' },
  C5: { label: 'Cierre y Seguimiento',             color: '#06d6a0' },
  C6: { label: 'Componentes Conductuales',         color: '#a855f7' },
}

const PALETTE = ['#4361ee', '#f59e0b', '#06d6a0', '#e03554', '#a855f7', '#06b6d4', '#f97316']

const LEVEL_COLORS = {
  COMPLETO:       { color: '#06d6a0', bg: 'rgba(6,214,160,.06)',   border: 'rgba(6,214,160,.2)'   },
  PARCIAL:        { color: '#f59e0b', bg: 'rgba(245,158,11,.06)',  border: 'rgba(245,158,11,.2)'  },
  'NO EJECUTADO': { color: '#ff6b6b', bg: 'rgba(255,107,107,.06)', border: 'rgba(255,107,107,.2)' },
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
    borderRadius: 7, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif',
    fontSize: 13, padding: '8px 12px', outline: 'none', width: '100%',
    boxSizing: 'border-box', transition: 'border-color .2s',
    ...extra,
  }
}

function SmallBtn({ children, onClick, color = 'var(--muted)', bg = 'rgba(255,255,255,.04)' }: {
  children: React.ReactNode; onClick: () => void; color?: string; bg?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
        background: bg, border: `1px solid ${color}30`, color,
        fontFamily: 'DM Sans', cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', gap: 5, transition: 'all .15s', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// Derive ordered unique metric IDs from rows (strips _PENALTY suffix)
function deriveMetricIds(rows: RubricRow[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const r of rows.sort((a, b) => a.position - b.position)) {
    const base = r.description.replace(/_PENALTY$/, '')
    if (!seen.has(base)) { seen.add(base); order.push(base) }
  }
  return order
}

export function RolePlayRubricEditor({ initialRows }: { initialRows: RubricRow[] }) {
  const [rows,       setRows]       = useState<RubricRow[]>(initialRows)
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [metrics,    setMetrics]    = useState<MetricMeta[]>(() => {
    const ids = deriveMetricIds(initialRows)
    return ids.map(id => ({
      id,
      label: KNOWN_METRICS[id]?.label ?? `Nueva Métrica ${id}`,
      color: KNOWN_METRICS[id]?.color ?? '#4361ee',
    }))
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Total pts from all variables (positive weight only)
  const totalPts = useMemo(() =>
    rows.filter(r => r.weight > 0 && !deletedIds.includes(r.id))
        .reduce((s, r) => s + Number(r.weight), 0),
    [rows, deletedIds]
  )

  // ── row helpers ───────────────────────────────────────────────────────────
  const getVars      = (mId: string) => rows.filter(r => r.description === mId          && !deletedIds.includes(r.id)).sort((a, b) => a.position - b.position)
  const getPenalties = (mId: string) => rows.filter(r => r.description === mId + '_PENALTY' && !deletedIds.includes(r.id)).sort((a, b) => a.position - b.position)

  const updateRow   = (id: string, patch: Partial<RubricRow>) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))
  const updateScale = (rowId: string, li: number, desc: string)  =>
    setRows(rs => rs.map(r => {
      if (r.id !== rowId) return r
      const scale = r.scale.map((s, i) => i === li ? { ...s, description: desc } : s)
      return { ...r, scale }
    }))

  const maxPosition = () => Math.max(0, ...rows.map(r => r.position))

  const addVariable = (metricId: string) => {
    const id = `new-${Date.now()}`
    setRows(rs => [...rs, {
      id, isNew: true,
      name: 'Nueva variable',
      description: metricId,
      weight: 2,
      position: maxPosition() + 1,
      active: true,
      scale: [
        { score: 2, label: 'COMPLETO',       description: '' },
        { score: 1, label: 'PARCIAL',        description: '' },
        { score: 0, label: 'NO EJECUTADO',   description: '' },
      ],
    }])
  }

  const addPenalty = (metricId: string) => {
    const id = `new-${Date.now()}`
    setRows(rs => [...rs, {
      id, isNew: true,
      name: 'Nueva penalización',
      description: metricId + '_PENALTY',
      weight: -2,
      position: maxPosition() + 1,
      active: true,
      scale: [{ score: -2, label: 'Penalización', description: '' }],
    }])
  }

  const deleteRow = (id: string) => {
    if (!id.startsWith('new-')) setDeletedIds(d => [...d, id])
    setRows(rs => rs.filter(r => r.id !== id))
  }

  // ── metric helpers ────────────────────────────────────────────────────────
  const updateMetric = (id: string, patch: Partial<MetricMeta>) =>
    setMetrics(ms => ms.map(m => m.id === id ? { ...m, ...patch } : m))

  const addMetric = () => {
    // Find next unused MXX id
    const existingNums = metrics
      .map(m => parseInt(m.id.replace('M', ''), 10))
      .filter(n => !isNaN(n))
    const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 11
    const newId = `M${next}`
    const newMetric: MetricMeta = { id: newId, label: 'Nueva Métrica', color: '#4361ee', isNew: true }
    setMetrics(ms => [...ms, newMetric])
    // Add one default variable so accordion has content
    addVariableForMetric(newId)
    setExpanded(newId)
  }

  const addVariableForMetric = (metricId: string) => {
    const id = `new-${Date.now()}-${Math.random()}`
    setRows(rs => [...rs, {
      id, isNew: true,
      name: 'Nueva variable',
      description: metricId,
      weight: 2,
      position: maxPosition() + 1,
      active: true,
      scale: [
        { score: 2, label: 'COMPLETO',     description: '' },
        { score: 1, label: 'PARCIAL',      description: '' },
        { score: 0, label: 'NO EJECUTADO', description: '' },
      ],
    }])
  }

  const deleteMetric = (metricId: string) => {
    if (!confirm(`¿Eliminar la métrica ${metricId} y todas sus variables/penalizaciones?`)) return
    const toDelete = rows.filter(r => r.description === metricId || r.description === metricId + '_PENALTY')
    const existingIds = toDelete.filter(r => !r.isNew).map(r => r.id)
    setDeletedIds(d => [...d, ...existingIds])
    setRows(rs => rs.filter(r => r.description !== metricId && r.description !== metricId + '_PENALTY'))
    setMetrics(ms => ms.filter(m => m.id !== metricId))
    if (expanded === metricId) setExpanded(null)
  }

  // ── save ──────────────────────────────────────────────────────────────────
  const saveAll = async () => {
    setSaving(true); setError(null)
    try {
      const supabase = createClient()

      // DELETE removed rows
      if (deletedIds.length > 0) {
        const { error: delErr } = await supabase
          .from('evaluation_rubric')
          .delete()
          .in('id', deletedIds)
        if (delErr) throw new Error(delErr.message)
      }

      // UPDATE or INSERT each row
      for (const row of rows) {
        const payload = {
          name:        row.name,
          description: row.description,
          weight:      row.weight,
          position:    row.position,
          scale:       row.scale,
          active:      row.active,
          section:     'roleplay',
          updated_at:  new Date().toISOString(),
        }
        if (row.isNew || row.id.startsWith('new-')) {
          const { data, error: insErr } = await supabase
            .from('evaluation_rubric')
            .insert(payload)
            .select('id')
            .single()
          if (insErr) throw new Error(insErr.message)
          // Swap temp id with real id
          setRows(rs => rs.map(r => r.id === row.id ? { ...r, id: data.id, isNew: false } : r))
        } else {
          const { error: updErr } = await supabase
            .from('evaluation_rubric')
            .update(payload)
            .eq('id', row.id)
          if (updErr) throw new Error(updErr.message)
        }
      }

      setDeletedIds([])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  const saveBtn = (full = false) => (
    <button
      onClick={saveAll}
      disabled={saving}
      style={{
        padding: full ? '10px 28px' : '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: saved ? 'rgba(6,214,160,.12)' : 'linear-gradient(135deg,#4361ee,#3a51d4)',
        border: saved ? '1px solid rgba(6,214,160,.3)' : 'none',
        color: saved ? 'var(--teal)' : '#fff', fontFamily: 'DM Sans',
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        boxShadow: saved ? 'none' : '0 2px 12px rgba(67,97,238,.3)',
      }}
    >
      {saving ? '⏳ Guardando...' : saved ? '✓ Guardado' : '💾 Guardar cambios'}
    </button>
  )

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: 'var(--muted)' }}>
          {metrics.length} métricas · {rows.filter(r => r.weight > 0 && !deletedIds.includes(r.id)).length} variables · {totalPts} pts totales
        </div>
        {saveBtn()}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(224,53,84,.06)', border: '1px solid rgba(224,53,84,.2)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#f07090', fontFamily: 'DM Sans' }}>
          ⚠ {error}
        </div>
      )}

      {/* Metrics */}
      {metrics.map(metric => {
        const vars      = getVars(metric.id)
        const penalties = getPenalties(metric.id)
        const isOpen    = expanded === metric.id
        const actualMax = vars.reduce((s, v) => s + Number(v.weight), 0)

        return (
          <div key={metric.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>

            {/* Header */}
            <div
              onClick={() => setExpanded(isOpen ? null : metric.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                cursor: 'pointer', userSelect: 'none',
                borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                background: isOpen ? 'rgba(255,255,255,.02)' : 'transparent',
              }}
            >
              {/* Badge */}
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700,
                color: metric.color, flexShrink: 0,
                background: `${metric.color}18`, border: `1px solid ${metric.color}35`,
                borderRadius: 7, padding: '4px 10px', minWidth: 44, textAlign: 'center',
              }}>
                {metric.id}
              </div>

              {/* Label — editable inline for new metrics */}
              {metric.isNew ? (
                <input
                  type="text"
                  value={metric.label}
                  onClick={e => e.stopPropagation()}
                  onChange={e => updateMetric(metric.id, { label: e.target.value })}
                  style={{ ...inputStyle({ flex: 1, fontWeight: 600, fontSize: 14, background: 'transparent', borderColor: `${metric.color}40` }) }}
                  placeholder="Nombre de la métrica..."
                />
              ) : (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: 'DM Sans', color: 'var(--text)' }}>{metric.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', marginTop: 2 }}>
                    {vars.length} variables · {penalties.length} penalizaciones
                  </div>
                </div>
              )}

              {/* Pts */}
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: metric.color, flexShrink: 0 }}>
                {actualMax} pts
              </div>

              {/* Delete (new metrics only, in header) */}
              {metric.isNew && (
                <button
                  onClick={e => { e.stopPropagation(); deleteMetric(metric.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '2px 6px', borderRadius: 4, transition: 'color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  title="Eliminar métrica"
                >×</button>
              )}

              <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
            </div>

            {/* Body */}
            {isOpen && (
              <div style={{ padding: '20px 20px 16px' }}>

                {/* Color picker for new metrics */}
                {metric.isNew && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <span style={{ fontSize: 11, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)' }}>Color</span>
                    {PALETTE.map(c => (
                      <div
                        key={c}
                        onClick={() => updateMetric(metric.id, { color: c })}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer',
                          border: metric.color === c ? `2px solid #fff` : '2px solid transparent',
                          boxShadow: metric.color === c ? `0 0 0 2px ${c}` : 'none',
                          transition: 'all .15s',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Section: variables */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)' }}>
                    Variables de evaluación
                  </div>
                  <SmallBtn onClick={() => addVariable(metric.id)} color={metric.color} bg={`${metric.color}10`}>
                    + Variable
                  </SmallBtn>
                </div>

                {vars.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans', borderRadius: 8, border: '1px dashed var(--border)', marginBottom: 20 }}>
                    Sin variables — añade la primera con el botón de arriba
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  {vars.map(row => (
                    <div key={row.id} style={{ borderRadius: 10, border: `1px solid ${row.isNew ? metric.color + '40' : 'var(--border)'}`, background: 'rgba(255,255,255,.01)', overflow: 'hidden' }}>

                      {/* Variable header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                        <input
                          type="text"
                          value={row.name}
                          onChange={e => updateRow(row.id, { name: e.target.value })}
                          style={{ ...inputStyle({ flex: 1, fontWeight: 600, fontSize: 13.5, background: 'transparent', border: 'none', padding: '0', borderRadius: 0, borderBottom: '1px solid transparent' }) }}
                          onFocus={e => (e.target.style.borderBottomColor = metric.color)}
                          onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <input
                            type="number" min={0} max={20}
                            value={row.weight}
                            onChange={e => updateRow(row.id, { weight: Number(e.target.value) })}
                            style={{ ...inputStyle({ width: 56, textAlign: 'center', fontFamily: 'Space Mono', fontWeight: 700, color: metric.color, padding: '6px 8px' }) }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono' }}>pts</span>
                        </div>
                        <button
                          onClick={() => deleteRow(row.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '2px 6px', borderRadius: 4, transition: 'color .15s', flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                        >×</button>
                      </div>

                      {/* Three columns */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        {(['COMPLETO', 'PARCIAL', 'NO EJECUTADO'] as const).map((level, li) => {
                          const lc    = LEVEL_COLORS[level]
                          const entry = row.scale[li] ?? { score: 0, label: level, description: '' }
                          return (
                            <div key={level} style={{ padding: '12px 14px', borderRight: li < 2 ? '1px solid rgba(255,255,255,.05)' : 'none', background: lc.bg }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: lc.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1px', color: lc.color, fontWeight: 700 }}>{level}</span>
                                <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'var(--muted)', marginLeft: 'auto' }}>
                                  {level === 'COMPLETO' ? row.weight : level === 'PARCIAL' ? Math.round(Number(row.weight) / 2) : 0} pts
                                </span>
                              </div>
                              <textarea
                                value={entry.description}
                                onChange={e => updateScale(row.id, li, e.target.value)}
                                rows={4}
                                style={{ ...inputStyle({ fontSize: 12, lineHeight: '1.6', resize: 'vertical', fontFamily: 'DM Sans', color: 'var(--dim)', padding: '8px 10px', background: 'rgba(0,0,0,.15)' }) }}
                                placeholder={`Describe evidencia para ${level}...`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section: penalties */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚠</span> Penalizaciones
                  </div>
                  <SmallBtn onClick={() => addPenalty(metric.id)} color="#ff6b6b" bg="rgba(255,107,107,.06)">
                    + Penalización
                  </SmallBtn>
                </div>

                {penalties.length === 0 && (
                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontFamily: 'DM Sans', borderRadius: 8, border: '1px dashed rgba(255,107,107,.2)', marginBottom: 16 }}>
                    Sin penalizaciones
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                  {penalties.map(pen => (
                    <div key={pen.id} style={{ borderRadius: 9, border: `1px solid ${pen.isNew ? '#ff6b6b60' : 'rgba(255,107,107,.2)'}`, background: 'rgba(255,107,107,.03)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid rgba(255,107,107,.1)' }}>
                        <input
                          type="text"
                          value={pen.name}
                          onChange={e => updateRow(pen.id, { name: e.target.value })}
                          style={{ ...inputStyle({ flex: 1, fontWeight: 600, fontSize: 13, background: 'transparent', border: 'none', padding: '0', borderRadius: 0, color: '#f07090' }) }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, color: '#ff6b6b', fontFamily: 'Space Mono', fontWeight: 700 }}>−</span>
                          <input
                            type="number" min={0} max={10}
                            value={Math.abs(pen.weight)}
                            onChange={e => updateRow(pen.id, { weight: -Math.abs(Number(e.target.value)) })}
                            style={{ ...inputStyle({ width: 50, textAlign: 'center', fontFamily: 'Space Mono', fontWeight: 700, color: '#ff6b6b', padding: '5px 8px' }) }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono' }}>pts</span>
                        </div>
                        <button
                          onClick={() => deleteRow(pen.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '2px 6px', borderRadius: 4, transition: 'color .15s', flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                        >×</button>
                      </div>
                      <div style={{ padding: '10px 14px' }}>
                        <textarea
                          value={pen.scale[0]?.description ?? ''}
                          onChange={e => updateScale(pen.id, 0, e.target.value)}
                          rows={2}
                          style={{ ...inputStyle({ fontSize: 12, lineHeight: '1.6', resize: 'vertical', fontFamily: 'DM Sans', color: 'var(--dim)', padding: '8px 10px', background: 'rgba(0,0,0,.1)' }) }}
                          placeholder="Describe cuándo aplica esta penalización..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        )
      })}

      {/* Add metric button */}
      <button
        onClick={addMetric}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, marginTop: 4,
          background: 'transparent', border: '1px dashed rgba(255,255,255,.15)',
          color: 'var(--muted)', fontFamily: 'DM Sans', fontSize: 13,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, transition: 'all .2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#4361ee80'
          e.currentTarget.style.color = '#4361ee'
          e.currentTarget.style.background = 'rgba(67,97,238,.05)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,.15)'
          e.currentTarget.style.color = 'var(--muted)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        <span>Nueva Métrica</span>
      </button>

      {/* Bottom save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingBottom: 40 }}>
        {saveBtn(true)}
      </div>
    </div>
  )
}
