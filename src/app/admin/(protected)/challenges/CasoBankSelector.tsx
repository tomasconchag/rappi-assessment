'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CasoBankEntry } from '@/types/assessment'

interface Props {
  configId: string
  initialActiveCasoId: string | null
  cases: CasoBankEntry[]
}

const difficultyColor = (d: string) => {
  if (d === 'Baja') return { bg: 'rgba(0,214,138,.1)', border: 'rgba(0,214,138,.2)', color: '#00d68a' }
  if (d === 'Baja-Media') return { bg: 'rgba(6,214,160,.08)', border: 'rgba(6,214,160,.2)', color: 'var(--teal)' }
  if (d === 'Media') return { bg: 'rgba(232,146,48,.08)', border: 'rgba(232,146,48,.2)', color: 'var(--gold)' }
  if (d === 'Media-Alta') return { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', color: '#f59e0b' }
  if (d === 'Alta') return { bg: 'rgba(224,53,84,.08)', border: 'rgba(224,53,84,.2)', color: 'var(--red)' }
  return { bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.2)', color: '#8b5cf6' } // Muy Alta
}

export function CasoBankSelector({ configId, initialActiveCasoId, cases }: Props) {
  const [activeCasoId, setActiveCasoId] = useState<string | null>(initialActiveCasoId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const selectedCase = cases.find(c => c.id === selectedId) ?? null

  const handleCardClick = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id))
  }

  const handleActivate = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('assessment_configs')
        .update({ active_caso_id: selectedId })
        .eq('id', configId)
      if (error) throw error
      setActiveCasoId(selectedId)
      setFlash('Caso activado correctamente')
      setTimeout(() => setFlash(null), 3000)
    } catch {
      setFlash('Error al activar el caso')
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('assessment_configs')
        .update({ active_caso_id: null })
        .eq('id', configId)
      if (error) throw error
      setActiveCasoId(null)
      setFlash('Caso desactivado — se usará el caso por defecto')
      setTimeout(() => setFlash(null), 3000)
    } catch {
      setFlash('Error al desactivar')
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
          Banco de Casos Prácticos
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
          Selecciona el caso que verán los candidatos en la sección de Caso Práctico. El caso activo reemplaza el caso por defecto (Heladería La Fiore).
        </p>
      </div>

      {/* Active case banner */}
      {activeCasoId && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(61,85,232,.07)',
          border: '1px solid rgba(61,85,232,.2)',
          borderRadius: 10,
          padding: '12px 18px',
          marginBottom: 20,
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 13, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)', fontWeight: 500 }}>
              Caso activo:{' '}
              <strong>{cases.find(c => c.id === activeCasoId)?.title ?? activeCasoId}</strong>
            </span>
          </div>
          <button
            onClick={handleDeactivate}
            disabled={saving}
            style={{
              fontSize: 12, fontFamily: 'Inter, DM Sans, sans-serif',
              color: 'var(--muted)', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '5px 12px', cursor: 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            Usar caso por defecto
          </button>
        </div>
      )}

      {/* Flash message */}
      {flash && (
        <div style={{
          padding: '10px 16px',
          background: flash.includes('Error') ? 'rgba(224,53,84,.1)' : 'rgba(0,214,138,.1)',
          border: `1px solid ${flash.includes('Error') ? 'rgba(224,53,84,.2)' : 'rgba(0,214,138,.2)'}`,
          borderRadius: 8,
          fontSize: 13,
          fontFamily: 'Inter, DM Sans, sans-serif',
          color: flash.includes('Error') ? 'var(--red)' : '#00d68a',
          marginBottom: 16,
        }}>
          {flash}
        </div>
      )}

      {/* Cases grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 14,
        marginBottom: selectedCase ? 24 : 0,
      }}>
        {cases.map(c => {
          const dc = difficultyColor(c.difficulty)
          const isActive = c.id === activeCasoId
          const isSelected = c.id === selectedId
          return (
            <div
              key={c.id}
              onClick={() => handleCardClick(c.id)}
              style={{
                background: 'var(--card)',
                border: isSelected
                  ? '1.5px solid rgba(61,85,232,.5)'
                  : isActive
                  ? '1.5px solid rgba(0,214,138,.35)'
                  : '1px solid var(--border)',
                borderRadius: 12,
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'border-color .2s, box-shadow .2s',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(61,85,232,.1)'
                  : isActive
                  ? '0 0 0 2px rgba(0,214,138,.08)'
                  : 'none',
                position: 'relative',
              }}
            >
              {/* Top row: difficulty + active badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  fontSize: 10.5,
                  fontFamily: 'JetBrains Mono, Space Mono, monospace',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: 100,
                  background: dc.bg,
                  border: `1px solid ${dc.border}`,
                  color: dc.color,
                  letterSpacing: '.5px',
                }}>
                  {c.difficulty}
                </span>
                {isActive && (
                  <span style={{
                    fontSize: 10.5,
                    fontFamily: 'JetBrains Mono, Space Mono, monospace',
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 100,
                    background: 'rgba(0,214,138,.1)',
                    border: '1px solid rgba(0,214,138,.25)',
                    color: '#00d68a',
                    letterSpacing: '.5px',
                  }}>
                    ✓ Activo
                  </span>
                )}
              </div>

              {/* Title */}
              <div style={{
                fontFamily: 'Fraunces, serif',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 6,
                lineHeight: 1.3,
              }}>
                {c.title}
              </div>

              {/* Owner name */}
              <div style={{
                fontSize: 11.5,
                fontFamily: 'JetBrains Mono, Space Mono, monospace',
                color: '#8098f8',
                marginBottom: 10,
                letterSpacing: '.3px',
              }}>
                {c.owner_name}
              </div>

              {/* Context truncated */}
              <p style={{
                fontSize: 12.5,
                fontFamily: 'Inter, DM Sans, sans-serif',
                color: 'var(--dim)',
                lineHeight: 1.6,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {c.context}
              </p>

              {/* Ver detalles hint */}
              <div style={{
                marginTop: 12,
                fontSize: 11,
                fontFamily: 'JetBrains Mono, Space Mono, monospace',
                color: isSelected ? 'var(--blue)' : 'var(--muted)',
                letterSpacing: '.5px',
                transition: 'color .2s',
              }}>
                {isSelected ? '▲ Ocultar detalles' : '▼ Ver detalles'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview panel */}
      {selectedCase && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid rgba(61,85,232,.2)',
          borderRadius: 14,
          padding: '28px 32px',
          marginTop: 8,
        }}>
          {/* Preview header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
            <div>
              <div style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono, Space Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: 'var(--muted)',
                marginBottom: 6,
              }}>
                Vista previa del caso
              </div>
              <h3 style={{
                fontFamily: 'Fraunces, serif',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text)',
                margin: 0,
                marginBottom: 4,
              }}>
                {selectedCase.title}
              </h3>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: '#8098f8' }}>
                {selectedCase.owner_name}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {(() => { const dc = difficultyColor(selectedCase.difficulty); return (
                <span style={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, Space Mono, monospace',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 100,
                  background: dc.bg,
                  border: `1px solid ${dc.border}`,
                  color: dc.color,
                }}>
                  {selectedCase.difficulty}
                </span>
              )})()}
            </div>
          </div>

          {/* Owner profile */}
          <div style={{
            background: 'rgba(61,85,232,.04)',
            border: '1px solid rgba(61,85,232,.12)',
            borderLeft: '3px solid var(--blue)',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8098f8', marginBottom: 8, fontWeight: 500 }}>
              Perfil del dueño
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.75, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0 }}>
              {selectedCase.owner_profile}
            </p>
          </div>

          {/* Context */}
          <div style={{
            background: 'rgba(255,255,255,.02)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>
              Situación
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.75, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0 }}>
              {selectedCase.context}
            </p>
          </div>

          {/* Data */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: selectedCase.situation ? 14 : 14,
          }}>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>
              Datos
            </div>
            <pre style={{ fontSize: 12, lineHeight: 1.8, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {selectedCase.data_raw}
            </pre>
          </div>

          {/* Situation */}
          {selectedCase.situation && (
            <div style={{
              background: 'rgba(232,146,48,.04)',
              border: '1px solid rgba(232,146,48,.15)',
              borderLeft: '3px solid var(--gold)',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--gold)', marginBottom: 8, fontWeight: 500 }}>
                Situación actual
              </div>
              <pre style={{ fontSize: 12, lineHeight: 1.8, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedCase.situation}
              </pre>
            </div>
          )}

          {/* Question highlight */}
          <div style={{
            background: 'rgba(61,85,232,.07)',
            border: '1px solid rgba(61,85,232,.2)',
            borderRadius: 10,
            padding: '16px 18px',
            marginBottom: 22,
          }}>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--blue)', marginBottom: 8, fontWeight: 500 }}>
              Pregunta al candidato
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.75, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)', margin: 0, fontWeight: 500 }}>
              {selectedCase.question}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {activeCasoId !== selectedCase.id ? (
              <button
                onClick={handleActivate}
                disabled={saving}
                style={{
                  padding: '11px 24px',
                  background: 'linear-gradient(140deg, rgba(61,85,232,1), rgba(40,65,200,1))',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'Inter, DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  letterSpacing: '.2px',
                  boxShadow: '0 4px 16px rgba(61,85,232,.3)',
                  transition: 'opacity .2s',
                }}
              >
                {saving ? 'Activando...' : 'Activar este caso'}
              </button>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 20px',
                background: 'rgba(0,214,138,.1)',
                border: '1px solid rgba(0,214,138,.25)',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'Inter, DM Sans, sans-serif',
                fontWeight: 600,
                color: '#00d68a',
              }}>
                ✓ Este caso está activo
              </div>
            )}
            <button
              onClick={() => setSelectedId(null)}
              style={{
                padding: '11px 20px',
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontFamily: 'Inter, DM Sans, sans-serif',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
