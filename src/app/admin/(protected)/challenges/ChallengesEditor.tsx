'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizedWeights } from '@/lib/challenges'
import type { ChallengeDefinition, SectionId } from '@/lib/challenges'

interface Props {
  configId: string
  initialEnabled: SectionId[]
  challenges: ChallengeDefinition[]
}

/** Build initial display order: enabled ones first (in saved order), then disabled ones */
function buildInitialOrder(challenges: ChallengeDefinition[], initialEnabled: SectionId[]): ChallengeDefinition[] {
  const enabledItems = initialEnabled
    .map(id => challenges.find(c => c.id === id))
    .filter(Boolean) as ChallengeDefinition[]
  const disabledItems = challenges.filter(c => !initialEnabled.includes(c.id))
  return [...enabledItems, ...disabledItems]
}

export function ChallengesEditor({ configId, initialEnabled, challenges }: Props) {
  const [orderedChallenges, setOrderedChallenges] = useState<ChallengeDefinition[]>(
    () => buildInitialOrder(challenges, initialEnabled)
  )
  const [enabled, setEnabled]     = useState<SectionId[]>(initialEnabled)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Drag state ─────────────────────────────────────────────────────────────
  const dragIdx    = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const handleDragStart = (i: number) => { dragIdx.current = i }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx.current !== null && dragIdx.current !== i) setDragOver(i)
  }

  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    const from = dragIdx.current
    if (from === null || from === i) { setDragOver(null); return }
    const next = [...orderedChallenges]
    const [item] = next.splice(from, 1)
    next.splice(i, 0, item)
    setOrderedChallenges(next)
    setDragOver(null)
    dragIdx.current = null
    setSaved(false)
    setError(null)
  }

  const handleDragEnd = () => { dragIdx.current = null; setDragOver(null) }
  // ──────────────────────────────────────────────────────────────────────────

  const toggle = (id: SectionId) => {
    setEnabled(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
    setSaved(false)
    setError(null)
  }

  const weights = normalizedWeights(enabled)

  // Enabled challenges in display order (for the bar + save)
  const enabledInOrder = orderedChallenges.filter(c => enabled.includes(c.id))

  const handleSave = () => {
    if (enabled.length === 0) { setError('Debes tener al menos un challenge activo.'); return }
    startTransition(async () => {
      const supabase = createClient()
      const sectionsToSave = enabledInOrder.map(c => c.id as SectionId)
      const { error: dbError } = await supabase
        .from('assessment_configs')
        .update({ enabled_sections: sectionsToSave })
        .eq('id', configId)
      if (dbError) {
        setError('Error al guardar: ' + dbError.message)
      } else {
        setSaved(true)
        setError(null)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '24px 28px',
    maxWidth: 780,
  }

  // Position label for enabled challenges
  const enabledOrder = enabledInOrder.map(c => c.id)

  return (
    <div style={{ maxWidth: 780 }}>

      {/* Order hint */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 9, marginBottom: 18,
        background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
        fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--muted)',
      }}>
        <span style={{ fontSize: 14 }}>⠿</span>
        Arrastra las tarjetas para cambiar el orden en que aparecen en el assessment. Solo los challenges activos se incluyen en el flujo.
      </div>

      {/* Challenge cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {orderedChallenges.map((ch, i) => {
          const isEnabled    = enabled.includes(ch.id)
          const effectiveWeight = weights[ch.id]
          const positionNum  = isEnabled ? enabledOrder.indexOf(ch.id) + 1 : null
          const isDragTarget = dragOver === i

          return (
            <div
              key={ch.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={e => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              style={{
                background: isEnabled ? ch.colorBg : 'var(--card)',
                border: `1px solid ${isDragTarget ? ch.color : isEnabled ? ch.colorBorder : 'var(--border)'}`,
                borderRadius: 14,
                padding: '18px 22px',
                transition: 'border-color .15s, box-shadow .15s, opacity .15s',
                boxShadow: isDragTarget
                  ? `0 0 0 2px ${ch.color}40, 0 8px 32px ${ch.colorBg}`
                  : isEnabled ? `0 0 20px ${ch.colorBg}` : 'none',
                cursor: 'grab',
                opacity: dragIdx.current === i ? 0.45 : 1,
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

                {/* Drag handle + position number */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {/* Step number badge */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isEnabled ? ch.color : 'rgba(255,255,255,.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, fontFamily: 'Space Mono, monospace',
                    color: isEnabled ? '#fff' : 'var(--muted)',
                    transition: 'all .2s',
                  }}>
                    {positionNum ?? '—'}
                  </div>
                  {/* Drag dots */}
                  <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1, opacity: .5, letterSpacing: -1 }}>⠿</div>
                </div>

                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: isEnabled ? ch.colorBg : 'rgba(255,255,255,.04)',
                  border: `1px solid ${isEnabled ? ch.colorBorder : 'rgba(255,255,255,.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, transition: 'all .2s',
                }}>
                  {ch.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14.5, color: isEnabled ? ch.color : 'var(--dim)', transition: 'color .2s' }}>
                      {ch.label}
                    </span>
                    <span style={{
                      fontSize: 9.5, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase',
                      letterSpacing: '1.5px', padding: '2px 7px', borderRadius: 100,
                      background: isEnabled ? ch.colorBg : 'rgba(255,255,255,.05)',
                      border: `1px solid ${isEnabled ? ch.colorBorder : 'rgba(255,255,255,.1)'}`,
                      color: isEnabled ? ch.color : 'var(--muted)', transition: 'all .2s',
                    }}>
                      {isEnabled ? 'Activo' : 'Inactivo'}
                    </span>
                    {isEnabled && effectiveWeight > 0 && (
                      <span style={{ fontSize: 10.5, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
                        Peso: <strong style={{ color: ch.color }}>{effectiveWeight}%</strong>
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 12, fontFamily: 'DM Sans, sans-serif', margin: 0,
                    color: isEnabled ? 'var(--dim)' : 'var(--muted)',
                    lineHeight: 1.5, transition: 'color .2s',
                  }}>
                    {ch.description}
                  </p>
                </div>

                {/* Toggle */}
                <div
                  onClick={e => { e.stopPropagation(); toggle(ch.id) }}
                  style={{
                    width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                    background: isEnabled ? ch.color : 'rgba(255,255,255,.1)',
                    position: 'relative', transition: 'background .2s', cursor: 'pointer',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3,
                    left: isEnabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', transition: 'left .2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,.3)',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Breakdown bar — shows enabled order */}
      {enabledInOrder.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 9.5, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12 }}>
            Orden y distribución del assessment
          </div>
          {/* Step sequence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {enabledInOrder.map((ch, i) => (
              <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 8,
                  background: ch.colorBg, border: `1px solid ${ch.colorBorder}`,
                }}>
                  <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', fontWeight: 700, color: ch.color }}>{i + 1}</span>
                  <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--text)' }}>{ch.icon} {ch.label}</span>
                  <span style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: ch.color }}>{weights[ch.id]}%</span>
                </div>
                {i < enabledInOrder.length - 1 && (
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
                )}
              </div>
            ))}
          </div>
          {/* Weight bar */}
          <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,.05)', overflow: 'hidden', display: 'flex' }}>
            {enabledInOrder.map((ch, i, arr) => (
              <div key={ch.id} style={{
                width: `${weights[ch.id]}%`,
                background: ch.color,
                borderRadius: i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : 0,
                transition: 'width .3s',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {enabled.length === 0 && (
        <div style={{ ...card, borderColor: 'rgba(233,69,96,.3)', background: 'rgba(233,69,96,.05)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)' }}>
            Debes tener al menos un challenge activo para poder guardar.
          </p>
        </div>
      )}
      {error && (
        <div style={{ ...card, borderColor: 'rgba(233,69,96,.3)', background: 'rgba(233,69,96,.05)', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#f07090' }}>{error}</p>
        </div>
      )}

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={handleSave}
          disabled={isPending || enabled.length === 0}
          style={{
            padding: '11px 28px',
            background: enabled.length === 0 ? 'rgba(255,255,255,.06)' : 'linear-gradient(140deg,#e03554,#c22448)',
            color: enabled.length === 0 ? 'var(--muted)' : '#fff',
            borderRadius: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
            fontSize: 13.5, letterSpacing: '.3px', border: 'none',
            cursor: enabled.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all .2s', opacity: isPending ? 0.7 : 1,
            boxShadow: enabled.length > 0 ? '0 4px 20px rgba(224,53,84,.3)' : 'none',
          }}
        >
          {isPending ? 'Guardando…' : 'Guardar orden y cambios'}
        </button>
        {saved && (
          <span style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', color: 'var(--teal)', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 5 }}>
            ✓ Guardado
          </span>
        )}
      </div>
    </div>
  )
}
