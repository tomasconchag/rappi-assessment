'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { TimerBar } from '@/components/assessment/TimerBar'
import { useTimer } from '@/hooks/useTimer'
import { fmtMoney } from '@/lib/scoring'
import type { Question, CasoContext, CasoBankEntry } from '@/types/assessment'

const dataCellStyle: React.CSSProperties = {
  padding: '11px 16px',
  fontFamily: 'JetBrains Mono, Space Mono, monospace',
  fontSize: 12.5,
  whiteSpace: 'nowrap',
}

interface Props {
  question: Question
  idx: number
  total: number
  casoContext: CasoContext
  casoBankEntry?: CasoBankEntry | null
  initialValue: string
  onNext: (value: string, timeSpent: number) => void
}

export function CasoQuestionScreen({ question, idx, total, casoContext, casoBankEntry, initialValue, onNext }: Props) {
  const [value, setValue] = useState(initialValue)
  const startRef = useRef(Date.now())
  const { secondsLeft, start } = useTimer(question.time_seconds, () => handleNext())

  useEffect(() => {
    startRef.current = Date.now()
    start(question.time_seconds)
  }, [question.id]) // eslint-disable-line

  const handleNext = () => {
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000)
    onNext(value, timeSpent)
  }

  return (
    <>
      <TimerBar secondsLeft={secondsLeft} totalSeconds={question.time_seconds} label={`Caso — Pregunta ${idx + 1} de ${total}`} />

      <div className="anim">
        <Tag color="blue">Pregunta {idx + 1} de {total}</Tag>
      </div>

      {question.show_data && (
        <>
          {casoBankEntry ? (
            <>
              {/* Owner profile */}
              <div className="anim1" style={{
                background: 'var(--card)',
                border: '1px solid rgba(61,85,232,.18)',
                borderLeft: '3px solid var(--blue)',
                borderRadius: 'var(--r)',
                padding: '20px 26px',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8098f8', marginBottom: 8, fontWeight: 500 }}>
                  👤 Perfil del dueño — {casoBankEntry.owner_name}
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.75, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0 }}>
                  {casoBankEntry.owner_profile}
                </p>
              </div>

              {/* Context */}
              <div className="anim1" style={{
                background: 'rgba(255,255,255,.02)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                padding: '16px 22px',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>
                  📋 Situación
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.75, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)', margin: 0 }}>
                  {casoBankEntry.context}
                </p>
              </div>

              {/* Data */}
              <div className="anim2" style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                padding: '16px 22px',
                marginBottom: casoBankEntry.situation ? 12 : 16,
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>
                  📊 Datos
                </div>
                <pre style={{ fontSize: 12.5, lineHeight: 1.8, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {casoBankEntry.data_raw}
                </pre>
              </div>

              {/* Situation (if present) */}
              {casoBankEntry.situation && (
                <div className="anim2" style={{
                  background: 'rgba(232,146,48,.04)',
                  border: '1px solid rgba(232,146,48,.15)',
                  borderLeft: '3px solid var(--gold)',
                  borderRadius: 'var(--r)',
                  padding: '16px 22px',
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--gold)', marginBottom: 8, fontWeight: 500 }}>
                    ⚡ Situación actual
                  </div>
                  <pre style={{ fontSize: 12.5, lineHeight: 1.8, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {casoBankEntry.situation}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Context header */}
              <div className="anim1" style={{
                background: 'var(--card)',
                border: '1px solid rgba(61,85,232,.18)',
                borderLeft: '3px solid var(--blue)',
                borderRadius: 'var(--r)',
                padding: '20px 26px',
                marginBottom: 16,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
              }}>
                <div style={{
                  fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                  textTransform: 'uppercase', letterSpacing: '1.5px',
                  color: '#8098f8', marginBottom: 10, fontWeight: 500,
                }}>
                  📋 Heladería La Fiore
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.75, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)' }}>
                  Lleva +4 años en Rappi. Tiene estrategias activas pero{' '}
                  <span style={{ color: '#ff6070', fontWeight: 600 }}>sus ventas no crecen</span>.
                </p>
              </div>

              {/* Stats grid */}
              <div className="anim1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Categoría',          value: `🍦 ${casoContext.category}`,  color: 'var(--red)',  glow: 'rgba(224,53,84,.08)'  },
                  { label: 'Ciudad',             value: casoContext.city,               color: 'var(--blue)', glow: 'rgba(61,85,232,.08)'  },
                  { label: 'Pedido promedio',    value: fmtMoney(casoContext.avgOrder), color: 'var(--teal)', glow: 'rgba(0,196,158,.08)'  },
                  { label: 'Horario',            value: casoContext.schedule,           color: 'var(--gold)', glow: 'rgba(232,146,48,.08)' },
                ].map(d => (
                  <div key={d.label} style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '14px 12px', textAlign: 'center',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,.04), 0 0 20px ${d.glow}`,
                  }}>
                    <div style={{
                      fontSize: 9.5, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                      textTransform: 'uppercase', letterSpacing: '1px',
                      color: 'var(--muted)', marginBottom: 7,
                    }}>
                      {d.label}
                    </div>
                    <div style={{
                      fontFamily: 'Fraunces, serif', fontSize: 18,
                      fontWeight: 700, color: d.color,
                    }}>
                      {d.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Orders table */}
              <div className="anim2" style={{
                overflowX: 'auto', marginBottom: 14,
                borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--card)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Semana', 'Pedidos', 'Ventas'].map(h => (
                        <th key={h} style={{
                          background: 'rgba(255,255,255,.03)',
                          padding: '11px 16px', textAlign: 'left',
                          fontFamily: 'JetBrains Mono, Space Mono, monospace',
                          fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px',
                          color: 'var(--muted)', borderBottom: '1px solid var(--border)',
                          whiteSpace: 'nowrap', fontWeight: 500,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {casoContext.orders.map((o, i) => (
                      <tr key={i} style={{ transition: 'background .15s' }}>
                        <td style={{ ...dataCellStyle, borderBottom: i < casoContext.orders.length - 1 ? '1px solid var(--border)' : 'none' }}>{o.w}</td>
                        <td style={{ ...dataCellStyle, borderBottom: i < casoContext.orders.length - 1 ? '1px solid var(--border)' : 'none' }}>{o.o}</td>
                        <td style={{ ...dataCellStyle, borderBottom: i < casoContext.orders.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--teal)' }}>{fmtMoney(o.v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Descuentos + ADS */}
              <div className="anim2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 18px',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
                }}>
                  <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, fontFamily: 'Inter, DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🏷️ Descuentos
                  </h4>
                  <p style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.7, fontFamily: 'Inter, DM Sans, sans-serif' }}>
                    {casoContext.discounts.all} todos + {casoContext.discounts.pro}.{' '}
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>Retorno: {casoContext.discounts.returnAll}.</span>{' '}
                    Ventas: {fmtMoney(casoContext.discounts.salesAll)} (todos) + {fmtMoney(casoContext.discounts.salesPro)} (PRO).
                  </p>
                </div>
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 18px',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
                }}>
                  <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, fontFamily: 'Inter, DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📢 Publicidad (ADS)
                  </h4>
                  <p style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.7, fontFamily: 'Inter, DM Sans, sans-serif' }}>
                    {fmtMoney(casoContext.ads.budget)}/semana.{' '}
                    <span style={{ color: '#ff6070', fontWeight: 600 }}>Solo gasta {casoContext.ads.pct}%.</span>{' '}
                    Solo visible {casoContext.ads.schedule}. Retorno {casoContext.ads.roi}x. Co-inversión Rappi: {casoContext.ads.coinv}.
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Answer textarea */}
      <div className="anim3" style={{ marginTop: question.show_data ? 20 : 0, marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 15, fontWeight: 600, marginBottom: 8,
          fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.5, color: 'var(--text)',
        }}>
          {question.content}
        </label>
        {question.sub_label && (
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--dim)', marginBottom: 12, fontFamily: 'Inter, DM Sans, sans-serif' }}>
            {question.sub_label}
          </span>
        )}
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={question.placeholder || 'Escribe tu respuesta aquí...'}
          style={{
            width: '100%',
            minHeight: question.show_data ? 160 : 140,
            padding: '16px 20px',
            background: 'var(--input)',
            border: '1px solid var(--border-mid)',
            borderRadius: 12,
            color: 'var(--text)',
            fontFamily: 'Inter, DM Sans, sans-serif',
            fontSize: 14,
            lineHeight: 1.75,
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color .2s, box-shadow .2s',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'rgba(61,85,232,.5)'
            e.target.style.boxShadow = '0 0 0 3px rgba(61,85,232,.1)'
          }}
          onBlur={e => {
            e.target.style.borderColor = 'var(--border-mid)'
            e.target.style.boxShadow = 'none'
          }}
        />
      </div>

      <div className="anim3" style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="blue" onClick={handleNext}>
          Siguiente pregunta 🔒
        </Button>
      </div>
    </>
  )
}
