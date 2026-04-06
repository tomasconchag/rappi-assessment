'use client'

import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'

interface Props {
  onStart: () => void
  casoBankEntry?: { title: string; question: string } | null
}

export function CasoIntroScreen({ onStart, casoBankEntry }: Props) {
  const questionCount = casoBankEntry ? 1 : 4
  const questionLabel = casoBankEntry ? '1 pregunta' : '4 preguntas'
  const questionSub = casoBankEntry ? 'análisis abierto' : 'caso práctico'

  return (
    <>
      <div className="anim">
        <Tag color="blue">Ejercicio 2 de 3 · Caso Práctico</Tag>
      </div>

      <div className="anim1" style={{
        background: 'var(--card)',
        border: '1px solid rgba(61,85,232,.2)',
        borderLeft: '3px solid var(--blue)',
        borderRadius: 'var(--r)',
        padding: '36px 40px',
        marginBottom: 32,
        boxShadow: '0 0 30px rgba(61,85,232,.08), inset 0 1px 0 rgba(255,255,255,.055)',
      }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700,
          marginBottom: 18, letterSpacing: '-.5px',
        }}>
          Caso Práctico
        </h2>
        <p style={{ fontSize: 16, color: 'var(--dim)', marginBottom: 6, fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 600 }}>
          {casoBankEntry?.title ?? 'Heladería La Fiore'}
        </p>
        <p style={{ fontSize: 14.5, color: 'var(--dim)', lineHeight: 1.8, fontFamily: 'Inter, DM Sans, sans-serif' }}>
          Analizarás datos reales de un aliado Rappi. {questionCount === 1 ? '1 pregunta de análisis abierto' : '4 preguntas con tiempo individual'}.{' '}
          <strong style={{ color: 'var(--text)' }}>No puedes volver a preguntas anteriores.</strong>
        </p>

        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: '❓', label: questionLabel, sub: questionSub },
            { icon: '⏱', label: '~15 minutos', sub: 'tiempo total' },
            { icon: '📊', label: '40% del score', sub: 'peso en evaluación' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '14px 16px',
              background: 'rgba(61,85,232,.07)',
              border: '1px solid rgba(61,85,232,.15)',
              borderRadius: 12, textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'Inter, DM Sans, sans-serif' }}>{s.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'JetBrains Mono, Space Mono, monospace', letterSpacing: '.5px', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="anim2" style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="blue" onClick={onStart}>Empezar ⏱</Button>
      </div>
    </>
  )
}
