'use client'

import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { MATH_PRODUCTS } from '@/constants/math-data'

interface Props {
  onStart: () => void
  mathContext?: string
  isSpreadsheet?: boolean
}

const levels = [
  { dot: 1, color: 'var(--green)', bg: 'rgba(0,214,138,.1)',  border: 'rgba(0,214,138,.2)',  label: 'Nivel 1', desc: 'Operaciones básicas — 1 punto' },
  { dot: 2, color: 'var(--gold)',  bg: 'rgba(232,146,48,.1)', border: 'rgba(232,146,48,.2)', label: 'Nivel 2', desc: 'Porcentajes — 2 puntos' },
  { dot: 3, color: '#ff6070',     bg: 'rgba(224,53,84,.1)',   border: 'rgba(224,53,84,.2)',  label: 'Nivel 3', desc: 'Razonamiento — 3 puntos' },
]

export function MathIntroScreen({ onStart, mathContext, isSpreadsheet }: Props) {
  if (isSpreadsheet) {
    return (
      <>
        <div className="anim">
          <Tag color="teal">Ejercicio 3 de 3 · Matemáticas</Tag>
        </div>
        <div className="anim1" style={{
          background: 'var(--card)',
          border: '1px solid rgba(0,196,158,.2)',
          borderLeft: '3px solid var(--teal)',
          borderRadius: 'var(--r)',
          padding: '36px 40px',
          marginBottom: 32,
          boxShadow: '0 0 30px rgba(0,196,158,.07), inset 0 1px 0 rgba(255,255,255,.055)',
        }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, marginBottom: 16, letterSpacing: '-.5px' }}>
            Taller de Matemáticas
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--dim)', lineHeight: 1.8, marginBottom: 24, fontFamily: 'Inter, DM Sans, sans-serif' }}>
            En esta sección trabajarás directamente en una <strong style={{ color: 'var(--text)' }}>hoja de cálculo embebida</strong>, igual a Excel. Debes resolver 9 preguntas usando fórmulas.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '📊', text: 'Verás los datos del restaurante en celdas pre-llenadas (bloqueadas).' },
              { icon: '✏️', text: 'Las celdas de color azul son tuyas — haz clic y escribe tu fórmula.' },
              { icon: '⌨️', text: 'Usa referencias de celda reales: =F3*4, =F4*(1-20%), =SUM(H30:H34)' },
              { icon: '✅', text: 'El sistema evalúa el resultado de tu fórmula automáticamente.' },
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(0,196,158,.05)', border: '1px solid rgba(0,196,158,.12)', borderRadius: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{tip.icon}</span>
                <span style={{ fontSize: 13.5, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6 }}>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="anim2" style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="teal" onClick={onStart}>Abrir hoja de cálculo →</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="anim">
        <Tag color="teal">Ejercicio 3 de 3 · Matemáticas</Tag>
      </div>

      <div className="anim1" style={{
        background: 'var(--card)',
        border: '1px solid rgba(0,196,158,.2)',
        borderLeft: '3px solid var(--teal)',
        borderRadius: 'var(--r)',
        padding: '36px 40px',
        marginBottom: 32,
        boxShadow: '0 0 30px rgba(0,196,158,.07), inset 0 1px 0 rgba(255,255,255,.055)',
      }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700,
          marginBottom: 16, letterSpacing: '-.5px',
        }}>
          Taller de Matemáticas
        </h2>
        <p style={{ fontSize: 14.5, color: 'var(--dim)', lineHeight: 1.8, marginBottom: 28, fontFamily: 'Inter, DM Sans, sans-serif' }}>
          9 preguntas progresivas. Sin calculadora.{' '}
          <strong style={{ color: 'var(--text)' }}>Una a la vez. No puedes volver atrás.</strong>
        </p>

        {/* Level legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: mathContext ? 28 : 0 }}>
          {levels.map(l => (
            <div key={l.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 16px',
              background: l.bg, border: `1px solid ${l.border}`,
              borderRadius: 12,
            }}>
              <div style={{
                display: 'flex', gap: 3, flexShrink: 0,
              }}>
                {Array.from({ length: l.dot }).map((_, j) => (
                  <div key={j} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: l.color,
                  }} />
                ))}
              </div>
              <div>
                <span style={{ fontWeight: 700, color: l.color, fontSize: 13, fontFamily: 'Inter, DM Sans, sans-serif' }}>
                  {l.label}
                </span>
                <span style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif' }}>
                  {' '}— {l.desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Reference table */}
        {mathContext && (
          <div style={{
            marginTop: 8, padding: '18px 20px',
            background: 'rgba(0,196,158,.05)',
            border: '1px solid rgba(0,196,158,.18)',
            borderRadius: 12,
          }}>
            <div style={{
              fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--teal)', marginBottom: 14, fontWeight: 500,
            }}>
              📋 Tabla de referencia — disponible en cada pregunta
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--dim)', marginBottom: 12, fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6 }}>
              Eres el dueño de un restaurante de comidas rápidas. Con la siguiente información, resuelve:
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Producto', 'Precio', 'Costo de producción'].map(h => (
                    <th key={h} style={{
                      padding: '7px 10px', borderBottom: '1px solid rgba(0,196,158,.2)',
                      color: 'var(--teal)', textAlign: 'left',
                      fontWeight: 600, fontSize: 11,
                      fontFamily: 'JetBrains Mono, Space Mono, monospace',
                      letterSpacing: '.5px',
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
            <p style={{ fontSize: 11, color: 'var(--teal)', marginTop: 12, fontFamily: 'JetBrains Mono, Space Mono, monospace', opacity: .8 }}>
              Ganancias = Ingresos − Costos
            </p>
          </div>
        )}
      </div>

      <div className="anim2" style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="teal" onClick={onStart}>Empezar ⏱</Button>
      </div>
    </>
  )
}
