'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ScaleLevel {
  score: number
  label: string
  description: string
}

interface Dimension {
  id: string
  name: string
  description: string
  weight: number
  position: number
  scale: ScaleLevel[]
  active: boolean
  section?: string
}

const btn = (color: string, bg: string): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 7, border: `1px solid ${color}`,
  background: bg, color, fontSize: 12, fontFamily: 'DM Sans, sans-serif',
  fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
  display: 'inline-flex', alignItems: 'center', gap: 5,
})

export function RubricEditor({ initialDimensions, section = 'caso' }: { initialDimensions: Dimension[], section?: string }) {
  const [dims, setDims] = useState<Dimension[]>(initialDimensions)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(initialDimensions[0]?.id || null)

  const totalWeight = dims.filter(d => d.active).reduce((s, d) => s + Number(d.weight), 0)
  const weightOk = Math.abs(totalWeight - 100) < 0.1

  const updateDim = (id: string, patch: Partial<Dimension>) =>
    setDims(ds => ds.map(d => d.id === id ? { ...d, ...patch } : d))

  const updateScale = (dimId: string, idx: number, patch: Partial<ScaleLevel>) =>
    setDims(ds => ds.map(d => {
      if (d.id !== dimId) return d
      const scale = d.scale.map((s, i) => i === idx ? { ...s, ...patch } : s)
      return { ...d, scale }
    }))

  const addScaleLevel = (dimId: string) =>
    setDims(ds => ds.map(d => {
      if (d.id !== dimId) return d
      const maxScore = d.scale.length > 0 ? Math.max(...d.scale.map(s => s.score)) + 1 : 0
      return { ...d, scale: [...d.scale, { score: maxScore, label: 'Nuevo nivel', description: '' }] }
    }))

  const removeScaleLevel = (dimId: string, idx: number) =>
    setDims(ds => ds.map(d => {
      if (d.id !== dimId) return d
      return { ...d, scale: d.scale.filter((_, i) => i !== idx) }
    }))

  const addDimension = () => {
    const newDim: Dimension = {
      id: `new-${Date.now()}`,
      name: 'Nueva Dimensión',
      description: '',
      weight: 0,
      position: dims.length + 1,
      section,
      scale: [
        { score: 0, label: 'No abordado', description: '' },
        { score: 1, label: 'Superficial', description: '' },
        { score: 2, label: 'Parcial', description: '' },
        { score: 3, label: 'Bueno', description: '' },
        { score: 4, label: 'Excelente', description: '' },
      ],
      active: true,
    }
    setDims(ds => [...ds, newDim])
    setExpanded(newDim.id)
  }

  const removeDimension = (id: string) => {
    if (!confirm('¿Eliminar esta dimensión?')) return
    setDims(ds => ds.filter(d => d.id !== id))
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setDims(ds => {
      const next = [...ds]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next.map((d, i) => ({ ...d, position: i + 1 }))
    })
  }

  const moveDown = (idx: number) => {
    if (idx === dims.length - 1) return
    setDims(ds => {
      const next = [...ds]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next.map((d, i) => ({ ...d, position: i + 1 }))
    })
  }

  const distributeWeights = () => {
    const activeDims = dims.filter(d => d.active)
    const equalW = Math.floor(100 / activeDims.length)
    const remainder = 100 - equalW * activeDims.length
    let extra = remainder
    setDims(ds => ds.map(d => {
      if (!d.active) return { ...d, weight: 0 }
      const w = equalW + (extra-- > 0 ? 1 : 0)
      return { ...d, weight: w }
    }))
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      for (const d of dims) {
        const payload = {
          name: d.name,
          description: d.description,
          weight: Number(d.weight),
          position: d.position,
          scale: d.scale,
          active: d.active,
          updated_at: new Date().toISOString(),
        }
        if (d.id.startsWith('new-')) {
          await supabase.from('evaluation_rubric').insert({ ...payload, section: d.section || section })
        } else {
          await supabase.from('evaluation_rubric').update(payload).eq('id', d.id)
        }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 12, overflow: 'hidden', marginBottom: 10,
  }

  const input = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--input)', border: '1px solid var(--border)',
    borderRadius: 7, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif',
    fontSize: 13, padding: '8px 12px', outline: 'none', transition: 'border-color .2s',
    ...extra,
  })

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Weight gauge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: weightOk ? 'rgba(6,214,160,.08)' : 'rgba(233,69,96,.08)',
            border: `1px solid ${weightOk ? 'rgba(6,214,160,.2)' : 'rgba(233,69,96,.2)'}`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: weightOk ? 'var(--teal)' : '#ff6b6b' }} />
            <span style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', color: weightOk ? 'var(--teal)' : '#ff6b6b', fontWeight: 700 }}>
              {totalWeight.toFixed(0)}% / 100%
            </span>
          </div>
          {!weightOk && (
            <button style={btn('var(--gold)', 'rgba(244,162,97,.08)')} onClick={distributeWeights}>
              ⚖ Distribuir uniformemente
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn('var(--blue)', 'rgba(67,97,238,.08)')} onClick={addDimension}>
            + Agregar dimensión
          </button>
          <button
            style={{
              ...btn(saved ? 'var(--teal)' : '#fff', saved ? 'rgba(6,214,160,.12)' : 'var(--blue)'),
              border: saved ? '1px solid rgba(6,214,160,.3)' : 'none',
              boxShadow: saved ? 'none' : '0 2px 12px rgba(67,97,238,.25)',
              opacity: saving ? 0.7 : 1,
            }}
            onClick={saveAll}
            disabled={saving}
          >
            {saving ? '⏳ Guardando...' : saved ? '✓ Guardado' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>

      {!weightOk && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,162,97,.06)', border: '1px solid rgba(244,162,97,.2)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--gold)', fontFamily: 'DM Sans' }}>
          ⚠ Los pesos deben sumar exactamente 100%. Actualmente suman {totalWeight.toFixed(1)}%.
        </div>
      )}

      {/* Dimensions */}
      {dims.map((dim, idx) => {
        const isOpen = expanded === dim.id
        const maxScore = dim.scale.length > 0 ? Math.max(...dim.scale.map(s => s.score)) : 4
        return (
          <div key={dim.id} style={{ ...card, opacity: dim.active ? 1 : 0.55 }}>
            {/* Header row */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px', cursor: 'pointer',
                borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                background: isOpen ? 'rgba(255,255,255,.02)' : 'transparent',
              }}
              onClick={() => setExpanded(isOpen ? null : dim.id)}
            >
              {/* Drag indicator / order */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 10, padding: '1px 3px', lineHeight: 1 }} onClick={e => { e.stopPropagation(); moveUp(idx) }}>▲</button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 10, padding: '1px 3px', lineHeight: 1 }} onClick={e => { e.stopPropagation(); moveDown(idx) }}>▼</button>
              </div>
              {/* Position badge */}
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'Space Mono', color: 'var(--muted)', flexShrink: 0 }}>
                {idx + 1}
              </div>
              {/* Name + weight */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dim.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', marginTop: 2 }}>
                  {dim.scale.length} niveles · máx. {maxScore} pts
                </div>
              </div>
              {/* Weight badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <input
                  type="number"
                  value={dim.weight}
                  onChange={e => updateDim(dim.id, { weight: Number(e.target.value) })}
                  onClick={e => e.stopPropagation()}
                  min={0} max={100}
                  style={{ ...input({ width: 60, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontWeight: 700, color: 'var(--blue)' }) }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Space Mono' }}>%</span>
              </div>
              {/* Active toggle */}
              <div
                onClick={e => { e.stopPropagation(); updateDim(dim.id, { active: !dim.active }) }}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              >
                <div style={{
                  width: 32, height: 18, borderRadius: 100,
                  background: dim.active ? 'var(--blue)' : 'var(--border)',
                  position: 'relative', transition: 'background .2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: dim.active ? 16 : 2,
                    width: 14, height: 14, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s',
                  }} />
                </div>
              </div>
              {/* Expand chevron */}
              <span style={{ fontSize: 12, color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>▼</span>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: '20px 20px 16px' }}>
                {/* Name & description */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>Nombre</label>
                    <input
                      type="text"
                      value={dim.name}
                      onChange={e => updateDim(dim.id, { name: e.target.value })}
                      style={{ ...input({ width: '100%', boxSizing: 'border-box' }) }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>Descripción para la IA</label>
                    <input
                      type="text"
                      value={dim.description}
                      onChange={e => updateDim(dim.id, { description: e.target.value })}
                      placeholder="¿Qué debe evaluar la IA en esta dimensión?"
                      style={{ ...input({ width: '100%', boxSizing: 'border-box' }) }}
                    />
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)' }}>
                      Escala de evaluación ({dim.scale.length} niveles)
                    </label>
                    <button style={btn('var(--teal)', 'rgba(6,214,160,.06)')} onClick={() => addScaleLevel(dim.id)}>
                      + Nivel
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dim.scale.map((level, si) => (
                      <div key={si} style={{ display: 'grid', gridTemplateColumns: '60px 140px 1fr auto', gap: 8, alignItems: 'center' }}>
                        {/* Score */}
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            value={level.score}
                            onChange={e => updateScale(dim.id, si, { score: Number(e.target.value) })}
                            min={0}
                            style={{ ...input({ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontFamily: 'Space Mono', fontWeight: 700, color: 'var(--gold)' }) }}
                          />
                        </div>
                        {/* Label */}
                        <input
                          type="text"
                          value={level.label}
                          onChange={e => updateScale(dim.id, si, { label: e.target.value })}
                          placeholder="Etiqueta"
                          style={{ ...input({ width: '100%', boxSizing: 'border-box', fontWeight: 600 }) }}
                        />
                        {/* Description */}
                        <input
                          type="text"
                          value={level.description}
                          onChange={e => updateScale(dim.id, si, { description: e.target.value })}
                          placeholder="Describe qué debe ver la IA para asignar este puntaje..."
                          style={{ ...input({ width: '100%', boxSizing: 'border-box', fontSize: 12, color: 'var(--dim)' }) }}
                        />
                        {/* Remove */}
                        <button
                          onClick={() => removeScaleLevel(dim.id, si)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '4px 6px', borderRadius: 4, transition: 'color .15s', lineHeight: 1 }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete dimension */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button style={btn('#ff6b6b', 'rgba(233,69,96,.06)')} onClick={() => removeDimension(dim.id)}>
                    🗑 Eliminar dimensión
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Bottom save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          style={{
            ...btn('#fff', 'var(--blue)'),
            border: 'none', padding: '10px 24px', fontSize: 13,
            boxShadow: '0 2px 12px rgba(67,97,238,.25)',
            opacity: saving ? 0.7 : 1,
          }}
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? '⏳ Guardando...' : saved ? '✓ Todo guardado' : '💾 Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
