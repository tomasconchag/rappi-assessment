'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { TimerBar } from '@/components/assessment/TimerBar'
import { useTimer } from '@/hooks/useTimer'
import { MATH_PRODUCTS } from '@/constants/math-data'
import type { Question } from '@/types/assessment'

interface Props {
  question: Question
  idx: number
  total: number
  initialValue: string
  mathContext?: string
  onNext: (value: string, timeSpent: number) => void
}

const difficultyConfig = {
  easy:   { color: 'var(--green)', bg: 'rgba(0,214,138,.1)',   border: 'rgba(0,214,138,.2)',  dots: 1, label: 'Nivel 1 — 1 punto'     },
  medium: { color: 'var(--gold)',  bg: 'rgba(232,146,48,.1)',  border: 'rgba(232,146,48,.2)', dots: 2, label: 'Nivel 2 — 2 puntos'    },
  hard:   { color: '#ff6070',     bg: 'rgba(224,53,84,.1)',    border: 'rgba(224,53,84,.2)',  dots: 3, label: 'Nivel 3 — 3 puntos'    },
  check:  { color: 'var(--blue)', bg: 'rgba(61,85,232,.1)',    border: 'rgba(61,85,232,.2)',  dots: 1, label: 'Verificación'          },
}

function ContextBox({ mathContext }: { mathContext: string }) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{
      background: 'rgba(0,196,158,.05)',
      border: '1px solid rgba(0,196,158,.18)',
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '11px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--teal)',
          fontFamily: 'JetBrains Mono, Space Mono, monospace',
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 500,
        }}
      >
        <span>📋 Tabla de referencia</span>
        <span style={{ fontSize: 11, opacity: .65 }}>{open ? '▾ ocultar' : '▸ mostrar'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          <p style={{ fontSize: 12.5, color: 'var(--dim)', marginBottom: 10, fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.55 }}>
            Eres el dueño de un restaurante de comidas rápidas. Con la siguiente información, resuelve:
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Producto', 'Precio', 'Costo de producción'].map(h => (
                  <th key={h} style={{
                    padding: '6px 10px', borderBottom: '1px solid rgba(0,196,158,.2)',
                    color: 'var(--teal)', textAlign: 'left', fontWeight: 600,
                    fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', letterSpacing: '.5px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATH_PRODUCTS.map((p, i) => (
                <tr key={p.name} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
                  <td style={{ padding: '8px 10px', color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: 'Inter, DM Sans, sans-serif' }}>{p.name}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--teal)', fontFamily: 'JetBrains Mono, Space Mono, monospace', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{p.price}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--dim)', fontFamily: 'JetBrains Mono, Space Mono, monospace', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{p.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: 'var(--teal)', marginTop: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', opacity: .8 }}>
            Ganancias = Ingresos − Costos
          </p>
        </div>
      )}
    </div>
  )
}

export function MathQuestionScreen({ question, idx, total, initialValue, mathContext, onNext }: Props) {
  const [value,       setValue]       = useState(initialValue)
  const [btnDisabled, setBtnDisabled] = useState(true)
  const startRef = useRef(Date.now())
  const { secondsLeft, start } = useTimer(question.time_seconds, () => handleNext())
  const cfg = difficultyConfig[question.difficulty as keyof typeof difficultyConfig] || difficultyConfig.easy
  const isMultipleChoice = question.question_type === 'multiple_choice'

  useEffect(() => {
    startRef.current = Date.now()
    start(question.time_seconds)
    setValue(initialValue)
    setBtnDisabled(true)
    const t = setTimeout(() => setBtnDisabled(false), 1000 + Math.random() * 1500)
    return () => clearTimeout(t)
  }, [question.id]) // eslint-disable-line

  const handleNext = () => {
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000)
    onNext(value, timeSpent)
  }

  return (
    <>
      <TimerBar secondsLeft={secondsLeft} totalSeconds={question.time_seconds} label={`Pregunta ${idx + 1} de ${total}`} />

      {mathContext && <ContextBox mathContext={mathContext} />}

      <div className="anim" style={{
        background: 'var(--card)',
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--r)',
        padding: '28px 32px',
        marginBottom: 20,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.055), 0 0 30px ${cfg.bg}`,
      }}>
        {/* Difficulty badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 12px 5px 10px',
            borderRadius: 100, background: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: cfg.dots }).map((_, j) => (
                <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
              ))}
            </div>
            <span style={{
              fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
              textTransform: 'uppercase', letterSpacing: '1px',
              color: cfg.color, fontWeight: 600, marginLeft: 4,
            }}>
              {cfg.label}
            </span>
          </div>
          <span style={{
            fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
            color: 'var(--muted)', letterSpacing: '.5px',
          }}>
            #{idx + 1}
          </span>
        </div>

        {/* Question text */}
        <p style={{ fontSize: 15, lineHeight: 1.65, marginBottom: 20, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)' }}>
          {question.content}
        </p>

        {isMultipleChoice && question.options ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {question.options.map(opt => {
              const isSelected = value === opt.letter
              return (
                <button
                  key={opt.letter}
                  onClick={() => setValue(opt.letter)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '13px 16px',
                    background: isSelected ? 'rgba(0,196,158,.1)' : 'rgba(255,255,255,.02)',
                    border: isSelected ? '1px solid rgba(0,196,158,.45)' : '1px solid var(--border)',
                    borderRadius: 10,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s ease',
                    width: '100%',
                    boxShadow: isSelected ? '0 0 20px rgba(0,196,158,.1)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.02)' }}
                >
                  <span style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, Space Mono, monospace',
                    fontSize: 11, fontWeight: 700,
                    background: isSelected ? 'var(--teal)' : 'rgba(255,255,255,.07)',
                    color: isSelected ? '#06060d' : 'var(--dim)',
                    transition: 'all .15s',
                  }}>
                    {opt.letter}
                  </span>
                  <span style={{
                    fontSize: 13.5, color: isSelected ? 'var(--text)' : 'var(--dim)',
                    fontFamily: 'Inter, DM Sans, sans-serif',
                    lineHeight: 1.45, transition: 'color .15s',
                  }}>
                    {opt.text}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div>
            <input
              type="text"
              id="mathAns"
              autoFocus
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !btnDisabled && handleNext()}
              placeholder="Tu respuesta..."
              style={{
                width: '100%', padding: '13px 18px',
                background: 'var(--input)',
                border: '1px solid var(--border-mid)',
                borderRadius: 10,
                color: 'var(--text)',
                fontFamily: 'JetBrains Mono, Space Mono, monospace',
                fontSize: 15, outline: 'none',
                transition: 'border-color .2s, box-shadow .2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(0,196,158,.5)'
                e.target.style.boxShadow = '0 0 0 3px rgba(0,196,158,.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border-mid)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="teal"
          onClick={handleNext}
          disabled={btnDisabled || (isMultipleChoice && !value)}
        >
          Siguiente 🔒
        </Button>
      </div>
    </>
  )
}
