'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ScaleEntry {
  score: number
  label: string
  description: string
}

interface RubricRow {
  id: string
  name: string
  description: string // D1, D2, D3, D4, D5
  weight: number
  position: number
  // scale[0]=ELITE, scale[1]=SÓLIDO, scale[2]=CRÍTICO, scale[3]=PREGUNTA, scale[4]=GREEN_FLAG
  scale: ScaleEntry[]
  active: boolean
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

const TIER_CONFIG = [
  { index: 0, label: 'ELITE',    pts: '20 pts', color: '#06d68a', bg: 'rgba(6,214,138,.04)',  border: 'rgba(6,214,138,.15)'  },
  { index: 1, label: 'SÓLIDO',   pts: '10 pts', color: '#4361ee', bg: 'rgba(67,97,238,.04)',  border: 'rgba(67,97,238,.12)'  },
  { index: 2, label: 'CRÍTICO',  pts: '0 pts',  color: '#e03554', bg: 'rgba(224,53,84,.04)',  border: 'rgba(224,53,84,.12)'  },
]

export function CulturalFitRubricEditor({ initialRows }: { initialRows: RubricRow[] }) {
  const [rows,     setRows]     = useState<RubricRow[]>(() =>
    [...initialRows].sort((a, b) => a.position - b.position)
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const updateName = (id: string, value: string) =>
    setRows(rs => rs.map(r => r.id === id ? { ...r, name: value } : r))

  const updateScale = (id: string, idx: number, desc: string) =>
    setRows(rs => rs.map(r => {
      if (r.id !== id) return r
      const scale = r.scale.map((s, i) => i === idx ? { ...s, description: desc } : s)
      return { ...r, scale }
    }))

  const saveAll = async () => {
    setSaving(true); setError(null)
    try {
      const supabase = createClient()
      for (const row of rows) {
        const { error: updErr } = await supabase
          .from('evaluation_rubric')
          .update({
            name:       row.name,
            scale:      row.scale,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        if (updErr) throw new Error(updErr.message)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const saveBtn = (full = false) => (
    <button
      onClick={saveAll}
      disabled={saving}
      style={{
        padding: full ? '10px 28px' : '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: saved ? 'rgba(6,214,160,.12)' : 'linear-gradient(135deg,#a855f7,#9333ea)',
        border: saved ? '1px solid rgba(6,214,160,.3)' : 'none',
        color: saved ? '#06d68a' : '#fff', fontFamily: 'DM Sans',
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        boxShadow: saved ? 'none' : '0 2px 12px rgba(168,85,247,.3)',
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
          {rows.length} dimensiones · 100 pts totales
        </div>
        {saveBtn()}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(224,53,84,.06)', border: '1px solid rgba(224,53,84,.2)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#f07090', fontFamily: 'DM Sans' }}>
          ⚠ {error}
        </div>
      )}

      {/* Dimensions */}
      {rows.map((row, idx) => {
        const isOpen = expanded === row.id
        const question  = row.scale[3]?.description ?? ''
        const greenFlag = row.scale[4]?.description ?? ''

        return (
          <div key={row.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>

            {/* Header */}
            <div
              onClick={() => setExpanded(isOpen ? null : row.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                cursor: 'pointer', userSelect: 'none',
                borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                background: isOpen ? 'rgba(168,85,247,.03)' : 'transparent',
              }}
            >
              {/* Badge */}
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#a855f7',
                background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)',
                borderRadius: 7, padding: '4px 10px', minWidth: 36, textAlign: 'center', flexShrink: 0,
              }}>
                D{idx + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: 'DM Sans', color: 'var(--text)' }}>{row.name}</div>
                {!isOpen && question && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'DM Sans', marginTop: 2, fontStyle: 'italic' }}>
                    "{question.length > 80 ? question.slice(0, 80) + '…' : question}"
                  </div>
                )}
              </div>

              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: '#a855f7', flexShrink: 0 }}>
                20 pts
              </div>

              <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
            </div>

            {/* Body */}
            {isOpen && (
              <div style={{ padding: '20px 20px 16px' }}>

                {/* Name */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>
                    Nombre de la dimensión
                  </div>
                  <input
                    type="text"
                    value={row.name}
                    onChange={e => updateName(row.id, e.target.value)}
                    style={inputStyle({ fontWeight: 600, fontSize: 14 })}
                    onFocus={e => (e.currentTarget.style.borderColor = '#a855f7')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>

                {/* Question */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>
                    Pregunta de entrevista
                  </div>
                  <textarea
                    value={question}
                    onChange={e => updateScale(row.id, 3, e.target.value)}
                    rows={2}
                    style={inputStyle({ lineHeight: '1.6', resize: 'vertical', fontStyle: 'italic', fontSize: 13 })}
                    onFocus={e => (e.currentTarget.style.borderColor = '#a855f7')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    placeholder="¿Cuál es la pregunta conductual para esta dimensión?"
                  />
                </div>

                {/* Tier columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
                  {TIER_CONFIG.map((tier, ti) => (
                    <div key={tier.label} style={{ padding: '14px 14px', background: tier.bg, borderRight: ti < 2 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1px', color: tier.color, fontWeight: 700 }}>
                          {tier.label}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'var(--muted)', marginLeft: 'auto' }}>{tier.pts}</span>
                      </div>
                      <textarea
                        value={row.scale[tier.index]?.description ?? ''}
                        onChange={e => updateScale(row.id, tier.index, e.target.value)}
                        rows={5}
                        style={inputStyle({ fontSize: 12, lineHeight: '1.6', resize: 'vertical', color: 'var(--dim)', padding: '8px 10px', background: 'rgba(0,0,0,.15)' })}
                        onFocus={e => (e.currentTarget.style.borderColor = tier.color)}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        placeholder={`Describe evidencia para ${tier.label}...`}
                      />
                    </div>
                  ))}
                </div>

                {/* Green flag */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(6,214,138,.03)', border: '1px solid rgba(6,214,138,.15)', borderRadius: 9 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>🟢</span>
                  <textarea
                    value={greenFlag}
                    onChange={e => updateScale(row.id, 4, e.target.value)}
                    rows={2}
                    style={inputStyle({ fontSize: 12.5, lineHeight: '1.6', resize: 'vertical', fontStyle: 'italic', color: 'var(--dim)', background: 'transparent', border: '1px solid transparent', padding: '0' })}
                    onFocus={e => (e.currentTarget.style.borderColor = '#06d68a')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
                    placeholder="¿Qué señal positiva confirmaría un ELITE en esta dimensión?"
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Bottom save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingBottom: 40 }}>
        {saveBtn(true)}
      </div>
    </div>
  )
}
