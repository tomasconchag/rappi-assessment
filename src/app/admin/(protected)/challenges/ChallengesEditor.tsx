'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { normalizedWeights, DEFAULT_WEIGHTS } from '@/lib/challenges'
import type { ChallengeDefinition, SectionId } from '@/lib/challenges'

interface Props {
  configId: string
  initialEnabled: SectionId[]
  challenges: ChallengeDefinition[]
  initialWeights: Partial<Record<SectionId, number>>
}

function buildInitialOrder(challenges: ChallengeDefinition[], initialEnabled: SectionId[]): ChallengeDefinition[] {
  const enabledItems = initialEnabled
    .map(id => challenges.find(c => c.id === id))
    .filter(Boolean) as ChallengeDefinition[]
  const disabledItems = challenges.filter(c => !initialEnabled.includes(c.id))
  return [...enabledItems, ...disabledItems]
}

export function ChallengesEditor({ configId, initialEnabled, challenges, initialWeights }: Props) {
  const [orderedChallenges, setOrderedChallenges] = useState<ChallengeDefinition[]>(
    () => buildInitialOrder(challenges, initialEnabled)
  )
  const [enabled, setEnabled]   = useState<SectionId[]>(initialEnabled)
  const [baseWeights, setBaseWeights] = useState<Record<SectionId, number>>({
    sharktank:    initialWeights.sharktank    ?? DEFAULT_WEIGHTS.sharktank,
    roleplay:     initialWeights.roleplay     ?? DEFAULT_WEIGHTS.roleplay,
    caso:         initialWeights.caso         ?? DEFAULT_WEIGHTS.caso,
    math:         initialWeights.math         ?? DEFAULT_WEIGHTS.math,
    cultural_fit: initialWeights.cultural_fit ?? DEFAULT_WEIGHTS.cultural_fit,
  })
  // Raw string values while the user is typing — avoids clamping on every keystroke
  const [weightDraft, setWeightDraft] = useState<Partial<Record<SectionId, string>>>({})
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Drag ───────────────────────────────────────────────────────────────────
  const dragIdx = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const handleDragStart = (i: number) => { dragIdx.current = i }
  const handleDragOver  = (e: React.DragEvent, i: number) => {
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
  }
  const handleDragEnd = () => { dragIdx.current = null; setDragOver(null) }
  // ──────────────────────────────────────────────────────────────────────────

  const toggle = (id: SectionId) => {
    setEnabled(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      // After toggling, redistribute evenly among the new active set
      if (next.length > 0) {
        const base = Math.floor(100 / next.length)
        const rem  = 100 - base * next.length
        const newW = { ...baseWeights }
        next.forEach((sid, i) => { newW[sid] = base + (i === 0 ? rem : 0) })
        setBaseWeights(newW)
        setWeightDraft({})
      }
      return next
    })
    setSaved(false)
    setError(null)
  }

  /** Redistribute weights so they always sum to 100.
   *  The changed challenge gets `newVal`; the others share the remainder
   *  proportionally to their current weights. */
  const redistribute = (changedId: SectionId, newVal: number) => {
    const others = enabled.filter(id => id !== changedId)
    if (others.length === 0) {
      // Only one active challenge — must be 100
      setBaseWeights(prev => ({ ...prev, [changedId]: 100 }))
      return
    }
    // Clamp so every other challenge keeps at least 1%
    const clamped = Math.max(1, Math.min(100 - others.length, newVal))
    const remaining = 100 - clamped
    const sumOthers = others.reduce((s, id) => s + (baseWeights[id] ?? 0), 0)

    // Distribute remaining proportionally; if all others are 0, distribute evenly
    let distributed: Record<string, number> = {}
    if (sumOthers === 0) {
      const base = Math.floor(remaining / others.length)
      others.forEach(id => { distributed[id] = base })
      distributed[others[0]] += remaining - base * others.length // remainder to first
    } else {
      let runningTotal = 0
      others.forEach((id, i) => {
        if (i === others.length - 1) {
          distributed[id] = remaining - runningTotal // last gets the leftover to hit exactly 100
        } else {
          const share = Math.round((baseWeights[id] ?? 0) / sumOthers * remaining)
          distributed[id] = Math.max(1, share)
          runningTotal += distributed[id]
        }
      })
    }

    setBaseWeights(prev => ({ ...prev, [changedId]: clamped, ...distributed }))
    setSaved(false)
  }

  const handleWeightChange = (id: SectionId, val: string) => {
    setWeightDraft(prev => ({ ...prev, [id]: val }))
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 1) redistribute(id, n)
  }

  const handleWeightBlur = (id: SectionId) => {
    const draft = weightDraft[id]
    const n = parseInt(draft ?? '', 10)
    if (!isNaN(n) && n >= 1) redistribute(id, n)
    setWeightDraft(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  const weights = normalizedWeights(enabled, baseWeights)
  const enabledInOrder = orderedChallenges.filter(c => enabled.includes(c.id))
  const enabledOrder   = enabledInOrder.map(c => c.id)
  const weightSum      = enabledInOrder.reduce((s, c) => s + (baseWeights[c.id] ?? 0), 0)
  const sumOk          = weightSum === 100

  const distributeEvenly = () => {
    if (enabledInOrder.length === 0) return
    const base = Math.floor(100 / enabledInOrder.length)
    const remainder = 100 - base * enabledInOrder.length
    const newWeights = { ...baseWeights }
    enabledInOrder.forEach((c, i) => { newWeights[c.id] = base + (i === 0 ? remainder : 0) })
    setBaseWeights(newWeights)
    setWeightDraft({})
    setSaved(false)
  }

  const handleSave = () => {
    if (enabled.length === 0) { setError('Debes tener al menos un challenge activo.'); return }
    if (!sumOk) { setError(`Los pesos deben sumar exactamente 100%. Actualmente suman ${weightSum}%.`); return }
    startTransition(async () => {
      const supabase = createClient()
      const sectionsToSave = enabledInOrder.map(c => c.id as SectionId)
      const { error: dbError } = await supabase
        .from('assessment_configs')
        .update({ enabled_sections: sectionsToSave, challenge_weights: baseWeights })
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
        Arrastra para cambiar el orden. Activa/desactiva challenges con el toggle. Ajusta el peso relativo de cada uno.
      </div>

      {/* Challenge cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {orderedChallenges.map((ch, i) => {
          const isEnabled   = enabled.includes(ch.id)
          const isDragTarget = dragOver === i
          const positionNum = isEnabled ? enabledOrder.indexOf(ch.id) + 1 : null

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

                {/* Position + drag handle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isEnabled ? ch.color : 'rgba(255,255,255,.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, fontFamily: 'Space Mono, monospace',
                    color: isEnabled ? '#fff' : 'var(--muted)', transition: 'all .2s',
                  }}>
                    {positionNum ?? '—'}
                  </div>
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
                    {isEnabled && (
                      <span style={{ fontSize: 10.5, fontFamily: 'Space Mono, monospace', color: ch.color, fontWeight: 700 }}>
                        {baseWeights[ch.id]}% del score general
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

                {/* Weight input — only when enabled */}
                {isEnabled && (
                  <div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 9, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Peso %</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={weightDraft[ch.id] ?? baseWeights[ch.id]}
                        onChange={e => handleWeightChange(ch.id, e.target.value)}
                        onBlur={() => handleWeightBlur(ch.id)}
                        onFocus={e => e.target.select()}
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        style={{
                          width: 54,
                          padding: '6px 8px',
                          borderRadius: 8,
                          background: 'var(--input, rgba(0,0,0,.3))',
                          border: `1px solid ${!sumOk ? 'rgba(233,69,96,.5)' : ch.colorBorder}`,
                          color: ch.color,
                          fontFamily: 'Space Mono, monospace',
                          fontSize: 14,
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'Space Mono' }}>%</span>
                    </div>
                  </div>
                )}

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

      {/* Distribution card */}
      {enabledInOrder.length > 0 && (
        <div style={{ ...card, marginBottom: 20, borderColor: !sumOk ? 'rgba(233,69,96,.3)' : 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 9.5, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)' }}>
              Distribución del score general
            </div>
            {/* Sum indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 8,
                background: sumOk ? 'rgba(6,214,160,.08)' : 'rgba(233,69,96,.08)',
                border: `1px solid ${sumOk ? 'rgba(6,214,160,.25)' : 'rgba(233,69,96,.3)'}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: sumOk ? 'var(--teal)' : '#ff6b6b', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: sumOk ? 'var(--teal)' : '#ff6b6b' }}>
                  {weightSum} / 100%
                </span>
              </div>
              {!sumOk && (
                <button
                  onClick={distributeEvenly}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: 'rgba(244,162,97,.08)', border: '1px solid rgba(244,162,97,.25)',
                    color: 'var(--gold)', fontFamily: 'DM Sans', cursor: 'pointer',
                  }}
                >
                  ⚖ Distribuir uniformemente
                </button>
              )}
            </div>
          </div>
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
                  <span style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: ch.color, fontWeight: 700 }}>{baseWeights[ch.id]}%</span>
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
          {isPending ? 'Guardando…' : 'Guardar cambios'}
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
