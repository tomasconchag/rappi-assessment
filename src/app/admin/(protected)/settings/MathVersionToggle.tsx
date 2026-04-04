'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Option { letter: string; text: string }
interface Question {
  id: string
  position: number
  content: string
  difficulty: string
  points: number
  correct_answer: string
  is_honeypot: boolean
  options: Option[] | null
}

interface Props {
  configId: string
  currentVersion: string
  questionsA: Question[]
  questionsB: Question[]
}

const VERSIONS = [
  {
    id: 'A',
    label: 'Versión A',
    color: 'var(--blue)',
    bg: 'rgba(67,97,238,.08)',
    border: 'rgba(67,97,238,.3)',
    desc: '4 hamburguesas · 20% desc. perro · lasaña 30% · 20 días hábiles',
  },
  {
    id: 'B',
    label: 'Versión B',
    color: 'var(--teal)',
    bg: 'rgba(0,196,158,.08)',
    border: 'rgba(0,196,158,.3)',
    desc: '3 hamburguesas · 30% desc. perro · lasaña 20% · 25 días hábiles',
  },
  {
    id: 'random',
    label: 'Aleatoria',
    color: 'var(--gold)',
    bg: 'rgba(244,162,97,.08)',
    border: 'rgba(244,162,97,.3)',
    desc: 'Cada candidato recibe A o B al azar (50/50) al cargar el assessment',
  },
]

const diffColor = (d: string) =>
  d === 'easy' ? 'var(--teal)' : d === 'medium' ? 'var(--gold)' : '#ff6b6b'
const diffLabel = (d: string) =>
  d === 'easy' ? 'Fácil' : d === 'medium' ? 'Medio' : d === 'hard' ? 'Difícil' : d

export function MathVersionToggle({ configId, currentVersion, questionsA, questionsB }: Props) {
  const [version, setVersion]       = useState(currentVersion || 'A')
  const [preview, setPreview]       = useState<'A' | 'B' | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)

  const handleSelect = (v: string) => {
    if (v === version || isPending) return
    setError(null); setSuccess(false)
    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('assessment_configs')
        .update({ math_version: v })
        .eq('id', configId)
      if (err) setError('Error al actualizar: ' + err.message)
      else { setVersion(v); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    })
  }

  const previewQuestions = preview === 'A' ? questionsA : preview === 'B' ? questionsB : []

  return (
    <div>
      {/* ── Mode cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {VERSIONS.map(v => {
          const isActive = version === v.id
          return (
            <button
              key={v.id}
              onClick={() => handleSelect(v.id)}
              disabled={isPending}
              style={{
                position: 'relative',
                padding: '18px 16px',
                borderRadius: 12,
                border: `2px solid ${isActive ? v.border : 'var(--border)'}`,
                background: isActive ? v.bg : 'rgba(255,255,255,.02)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all .2s cubic-bezier(.16,1,.3,1)',
                opacity: isPending ? 0.7 : 1,
                boxShadow: isActive ? `0 0 0 1px ${v.border}, 0 4px 20px ${v.bg}` : 'none',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = v.border.replace('.3', '.15') }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              {/* Active badge */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  padding: '2px 8px', borderRadius: 100,
                  background: v.color, color: '#000',
                  fontSize: 9, fontFamily: 'Space Mono, monospace',
                  fontWeight: 700, letterSpacing: '1px',
                }}>ACTIVA</div>
              )}

              {/* Radio dot */}
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: `2px solid ${isActive ? v.color : 'var(--border)'}`,
                background: isActive ? v.color : 'transparent',
                marginBottom: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />}
              </div>

              <div style={{
                fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700,
                color: isActive ? v.color : 'var(--text)', marginBottom: 5,
              }}>
                {v.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                {v.desc}
              </div>
            </button>
          )
        })}
      </div>

      {/* Status */}
      {isPending && <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans', marginBottom: 12 }}>Guardando...</p>}
      {success && <p style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'DM Sans', marginBottom: 12 }}>✓ Configuración guardada. Los nuevos candidatos verán la versión seleccionada.</p>}
      {error  && <p style={{ fontSize: 12, color: '#ff6b6b',    fontFamily: 'DM Sans', marginBottom: 12 }}>{error}</p>}

      {/* ── Question preview tabs ───────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,.025)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {/* Tab headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {(['A', 'B'] as const).map(v => (
            <button
              key={v}
              onClick={() => setPreview(preview === v ? null : v)}
              style={{
                flex: 1, padding: '11px 16px',
                background: preview === v ? 'rgba(255,255,255,.04)' : 'transparent',
                border: 'none', borderBottom: preview === v ? `2px solid ${v === 'A' ? 'var(--blue)' : 'var(--teal)'}` : '2px solid transparent',
                color: preview === v ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'Space Mono, monospace', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '1.5px',
                cursor: 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ color: v === 'A' ? 'var(--blue)' : 'var(--teal)', fontWeight: 700 }}>Versión {v}</span>
              <span style={{
                padding: '1px 6px', borderRadius: 100, fontSize: 9,
                background: v === 'A' ? 'rgba(67,97,238,.15)' : 'rgba(0,196,158,.15)',
                color: v === 'A' ? 'var(--blue)' : 'var(--teal)',
              }}>
                {v === 'A' ? questionsA.length : questionsB.length} preguntas
              </span>
              <span style={{ fontSize: 10, transition: 'transform .2s', transform: preview === v ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--muted)' }}>▾</span>
            </button>
          ))}
        </div>

        {/* Questions list */}
        {preview && (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
            {previewQuestions.filter(q => !q.is_honeypot).map((q, i) => (
              <div key={q.id} style={{
                padding: '14px 16px',
                borderRadius: 9,
                background: 'rgba(255,255,255,.02)',
                border: '1px solid var(--border)',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: preview === 'A' ? 'rgba(67,97,238,.15)' : 'rgba(0,196,158,.15)',
                    color: preview === 'A' ? 'var(--blue)' : 'var(--teal)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{
                    padding: '2px 7px', borderRadius: 100, fontSize: 9.5,
                    background: `${diffColor(q.difficulty)}15`,
                    color: diffColor(q.difficulty),
                    fontFamily: 'Space Mono, monospace', fontWeight: 700,
                  }}>{diffLabel(q.difficulty)}</span>
                  <span style={{
                    padding: '2px 7px', borderRadius: 100, fontSize: 9.5,
                    background: 'rgba(255,255,255,.06)', color: 'var(--muted)',
                    fontFamily: 'Space Mono, monospace',
                  }}>{q.points} {q.points === 1 ? 'pt' : 'pts'}</span>
                </div>

                {/* Question text */}
                <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.55, marginBottom: q.options ? 10 : 0 }}>
                  {q.content}
                </p>

                {/* Options */}
                {q.options && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {q.options.map(opt => {
                      const isCorrect = opt.letter === q.correct_answer
                      return (
                        <div key={opt.letter} style={{
                          padding: '6px 10px', borderRadius: 7, fontSize: 12,
                          fontFamily: 'DM Sans, sans-serif',
                          background: isCorrect ? 'rgba(0,196,158,.08)' : 'rgba(255,255,255,.02)',
                          border: `1px solid ${isCorrect ? 'rgba(0,196,158,.3)' : 'var(--border)'}`,
                          color: isCorrect ? 'var(--teal)' : 'var(--dim)',
                          display: 'flex', gap: 7, alignItems: 'center',
                        }}>
                          <span style={{
                            fontFamily: 'Space Mono, monospace', fontSize: 9.5, fontWeight: 700,
                            color: isCorrect ? 'var(--teal)' : 'var(--muted)',
                            minWidth: 12,
                          }}>{opt.letter.toUpperCase()}.</span>
                          {opt.text}
                          {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!preview && (
          <div style={{ padding: '16px 20px', fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans', textAlign: 'center' }}>
            Haz click en una versión para ver sus preguntas
          </div>
        )}
      </div>
    </div>
  )
}
