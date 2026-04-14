'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RoleplayBankEntry } from '@/types/assessment'

interface Props {
  configId: string
  initialActiveId: string | null
  cases: RoleplayBankEntry[]
  onActiveChange?: (entry: RoleplayBankEntry | null) => void
}

const difficultyColor = (d: string) => {
  if (d === 'Básica')       return { bg: 'rgba(0,214,138,.1)',    border: 'rgba(0,214,138,.2)',    color: '#00d68a' }
  if (d === 'Básica-Media') return { bg: 'rgba(6,214,160,.08)',   border: 'rgba(6,214,160,.2)',    color: 'var(--teal)' }
  if (d === 'Media')        return { bg: 'rgba(232,146,48,.08)',  border: 'rgba(232,146,48,.2)',   color: 'var(--gold)' }
  if (d === 'Media-Alta')   return { bg: 'rgba(245,158,11,.1)',   border: 'rgba(245,158,11,.25)',  color: '#f59e0b' }
  if (d === 'Alta')         return { bg: 'rgba(224,53,84,.08)',   border: 'rgba(224,53,84,.2)',    color: 'var(--red)' }
  return                           { bg: 'rgba(139,92,246,.08)',  border: 'rgba(139,92,246,.2)',   color: '#8b5cf6' }
}

export function RolePlayBankSelector({ configId, initialActiveId, cases, onActiveChange }: Props) {
  const [activeId,    setActiveId]    = useState<string | null>(initialActiveId)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [flash,       setFlash]       = useState<string | null>(null)
  const [activeTab,   setActiveTab]   = useState<'briefing' | 'profile' | 'hidden' | 'eval'>('briefing')

  const selectedCase = cases.find(c => c.id === selectedId) ?? null

  const handleCardClick = (id: string) => setSelectedId(prev => prev === id ? null : id)

  const handleActivate = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('assessment_configs')
        .update({ active_roleplay_case_id: selectedId })
        .eq('id', configId)
      if (error) throw error
      setActiveId(selectedId)
      onActiveChange?.(cases.find(c => c.id === selectedId) ?? null)
      setFlash('Caso de roleplay activado correctamente')
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
        .update({ active_roleplay_case_id: null })
        .eq('id', configId)
      if (error) throw error
      setActiveId(null)
      onActiveChange?.(null)
      setFlash('Caso desactivado — se usará Heladería La Fiore por defecto')
      setTimeout(() => setFlash(null), 3000)
    } catch {
      setFlash('Error al desactivar')
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: typeof activeTab; label: string; icon: string }[] = [
    { key: 'briefing', label: 'Briefing del farmer', icon: '📋' },
    { key: 'profile',  label: 'Perfil del aliado',   icon: '🎭' },
    { key: 'hidden',   label: 'Brief oculto + objeciones', icon: '🔒' },
    { key: 'eval',     label: 'Evaluación',           icon: '🎯' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
          Banco de Casos · Role Play
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
          Selecciona el caso que verán los testers en el roleplay. Los casos se asignan de manera aleatoria dentro del nivel de dificultad configurado en el cohort.
        </p>
      </div>

      {/* Active case banner */}
      {activeId && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(245,158,11,.07)',
          border: '1px solid rgba(245,158,11,.2)',
          borderRadius: 10, padding: '12px 18px', marginBottom: 20, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>📞</span>
            <span style={{ fontSize: 13, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)', fontWeight: 500 }}>
              Caso activo:{' '}
              <strong>{cases.find(c => c.id === activeId)?.title ?? activeId}</strong>
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

      {/* Flash */}
      {flash && (
        <div style={{
          padding: '10px 16px',
          background: flash.includes('Error') ? 'rgba(224,53,84,.1)' : 'rgba(0,214,138,.1)',
          border: `1px solid ${flash.includes('Error') ? 'rgba(224,53,84,.2)' : 'rgba(0,214,138,.2)'}`,
          borderRadius: 8, fontSize: 13,
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
          const isActive   = c.id === activeId
          const isSelected = c.id === selectedId
          return (
            <div
              key={c.id}
              onClick={() => handleCardClick(c.id)}
              style={{
                background: 'var(--card)',
                border: isSelected
                  ? '1.5px solid rgba(245,158,11,.5)'
                  : isActive
                  ? '1.5px solid rgba(245,158,11,.35)'
                  : '1px solid var(--border)',
                borderRadius: 12, padding: '18px 20px',
                cursor: 'pointer',
                transition: 'border-color .2s, box-shadow .2s',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(245,158,11,.1)'
                  : isActive
                  ? '0 0 0 2px rgba(245,158,11,.07)'
                  : 'none',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  fontSize: 10.5,
                  fontFamily: 'JetBrains Mono, Space Mono, monospace', fontWeight: 600,
                  padding: '3px 9px', borderRadius: 100,
                  background: dc.bg, border: `1px solid ${dc.border}`, color: dc.color,
                  letterSpacing: '.5px',
                }}>
                  {c.difficulty}
                </span>
                {isActive && (
                  <span style={{
                    fontSize: 10.5,
                    fontFamily: 'JetBrains Mono, Space Mono, monospace', fontWeight: 600,
                    padding: '3px 9px', borderRadius: 100,
                    background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
                    color: '#f59e0b', letterSpacing: '.5px',
                  }}>
                    ✓ Activo
                  </span>
                )}
              </div>

              {/* Title */}
              <div style={{
                fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700,
                color: 'var(--text)', marginBottom: 5, lineHeight: 1.3,
              }}>
                {c.restaurant_name}
              </div>

              {/* Subtitle line */}
              <div style={{
                fontSize: 11.5, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                color: '#f59e0b', marginBottom: 10, letterSpacing: '.3px',
              }}>
                {c.owner_name} · {c.city} · {c.category}
              </div>

              {/* Briefing preview */}
              <p style={{
                fontSize: 12.5, fontFamily: 'Inter, DM Sans, sans-serif',
                color: 'var(--dim)', lineHeight: 1.6, margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {c.farmer_briefing.split('\n')[0]}
              </p>

              {/* Ver detalles hint */}
              <div style={{
                marginTop: 12, fontSize: 11,
                fontFamily: 'JetBrains Mono, Space Mono, monospace',
                color: isSelected ? '#f59e0b' : 'var(--muted)',
                letterSpacing: '.5px', transition: 'color .2s',
              }}>
                {isSelected ? '▲ Ocultar detalles' : '▼ Ver detalles'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selectedCase && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid rgba(245,158,11,.2)',
          borderRadius: 14, padding: '28px 32px', marginTop: 8,
        }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 16 }}>
            <div>
              <div style={{
                fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6,
              }}>
                Vista previa del caso
              </div>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>
                {selectedCase.title}
              </h3>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: '#f59e0b' }}>
                {selectedCase.owner_name} · {selectedCase.city} · {selectedCase.category}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              {(() => { const dc = difficultyColor(selectedCase.difficulty); return (
                <span style={{
                  fontSize: 11, fontFamily: 'JetBrains Mono, Space Mono, monospace', fontWeight: 600,
                  padding: '4px 12px', borderRadius: 100,
                  background: dc.bg, border: `1px solid ${dc.border}`, color: dc.color,
                }}>
                  {selectedCase.difficulty}
                </span>
              )})()}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '8px 16px',
                  background: 'none', border: 'none',
                  borderBottom: activeTab === t.key ? '2px solid #f59e0b' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 12.5, fontFamily: 'Inter, DM Sans, sans-serif',
                  color: activeTab === t.key ? '#f59e0b' : 'var(--muted)',
                  fontWeight: activeTab === t.key ? 600 : 400,
                  transition: 'color .15s',
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'briefing' && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderLeft: '3px solid #f59e0b', borderRadius: 10, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#f59e0b', marginBottom: 10, fontWeight: 500 }}>
                Lo que ve el tester antes de la llamada
              </div>
              <pre style={{ fontSize: 12.5, lineHeight: 1.85, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedCase.farmer_briefing}
              </pre>
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{
              background: 'rgba(61,85,232,.04)', border: '1px solid rgba(61,85,232,.12)',
              borderLeft: '3px solid var(--blue)', borderRadius: 10, padding: '16px 20px',
            }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8098f8', marginBottom: 10, fontWeight: 500 }}>
                Personalidad e instrucciones para el avatar IA
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.8, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0 }}>
                {selectedCase.owner_profile}
              </p>
            </div>
          )}

          {activeTab === 'hidden' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'rgba(139,92,246,.05)', border: '1px solid rgba(139,92,246,.15)',
                borderLeft: '3px solid #8b5cf6', borderRadius: 10, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8b5cf6', marginBottom: 10, fontWeight: 500 }}>
                  Brief oculto del personaje (solo para la IA)
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.8, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0 }}>
                  {selectedCase.character_brief}
                </p>
              </div>
              <div style={{
                background: 'rgba(224,53,84,.04)', border: '1px solid rgba(224,53,84,.15)',
                borderLeft: '3px solid var(--red)', borderRadius: 10, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--red)', marginBottom: 10, fontWeight: 500 }}>
                  Objeciones que debe lanzar el aliado
                </div>
                <pre style={{ fontSize: 12.5, lineHeight: 1.85, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedCase.key_objections}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'eval' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'rgba(224,53,84,.04)', border: '1px solid rgba(224,53,84,.15)',
                borderLeft: '3px solid var(--red)', borderRadius: 10, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--red)', marginBottom: 10, fontWeight: 500 }}>
                  Trampa — error del candidato no preparado
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.8, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0 }}>
                  {selectedCase.trap}
                </p>
              </div>
              <div style={{
                background: 'rgba(0,214,138,.04)', border: '1px solid rgba(0,214,138,.15)',
                borderLeft: '3px solid #00d68a', borderRadius: 10, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#00d68a', marginBottom: 10, fontWeight: 500 }}>
                  Camino correcto — criterio de éxito
                </div>
                <pre style={{ fontSize: 12.5, lineHeight: 1.85, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedCase.success_path}
                </pre>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 24 }}>
            {activeId !== selectedCase.id ? (
              <button
                onClick={handleActivate}
                disabled={saving}
                style={{
                  padding: '11px 24px',
                  background: 'linear-gradient(140deg, #f59e0b, #d97706)',
                  color: '#000', border: 'none', borderRadius: 8,
                  fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 700, fontSize: 13,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  letterSpacing: '.2px',
                  boxShadow: '0 4px 16px rgba(245,158,11,.3)',
                  transition: 'opacity .2s',
                }}
              >
                {saving ? 'Activando...' : '📞 Activar este caso'}
              </button>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 20px',
                background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
                borderRadius: 8, fontSize: 13,
                fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 600, color: '#f59e0b',
              }}>
                ✓ Este caso está activo
              </div>
            )}
            <button
              onClick={() => setSelectedId(null)}
              style={{
                padding: '11px 20px', background: 'transparent',
                color: 'var(--muted)', border: '1px solid var(--border)',
                borderRadius: 8, fontFamily: 'Inter, DM Sans, sans-serif',
                fontSize: 13, cursor: 'pointer',
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
