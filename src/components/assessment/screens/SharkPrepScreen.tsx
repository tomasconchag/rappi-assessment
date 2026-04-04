'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { useTimer } from '@/hooks/useTimer'
import { fmtTime } from '@/lib/scoring'
import type { SharkScenario } from '@/types/assessment'

interface Props {
  scenario: SharkScenario
  onReady: () => void
}

export function SharkPrepScreen({ scenario, onReady }: Props) {
  const { secondsLeft, pct, start } = useTimer(scenario.prepTime, onReady)

  useEffect(() => { start(scenario.prepTime) }, []) // eslint-disable-line

  const danger = pct < 20
  const warn   = pct < 40

  const timerColor = danger ? '#ff6070' : warn ? 'var(--gold)' : 'var(--text)'
  const barColor   = danger
    ? 'linear-gradient(90deg,#c42448,#ff6070)'
    : warn
    ? 'linear-gradient(90deg,#e89230,#f0b060)'
    : 'linear-gradient(90deg,#00a885,#00d68a)'

  return (
    <>
      <div className="anim">
        <Tag color="red">SharkTank · Preparación</Tag>
      </div>

      {/* Scenario reminder */}
      <div className="anim1" style={{
        background: 'var(--card)',
        border: '1px solid rgba(224,53,84,.18)',
        borderLeft: '3px solid var(--red)',
        borderRadius: 'var(--r)',
        padding: '24px 28px',
        marginBottom: 20,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
      }}>
        <div style={{
          fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '1.5px',
          color: '#f07090', marginBottom: 12, fontWeight: 500,
        }}>
          📋 Escenario
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.8, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)' }}>
          <strong>{scenario.name}</strong>{' '}
          <span style={{ color: 'var(--dim)' }}>— {scenario.desc}</span>
        </p>
      </div>

      {/* Timer card */}
      <div className="anim2" style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '44px 40px',
        marginBottom: 32,
        textAlign: 'center',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)',
      }}>
        <div style={{
          fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '1.8px',
          color: 'var(--muted)', marginBottom: 16, fontWeight: 500,
        }}>
          Tiempo de preparación
        </div>

        <div style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 80, fontWeight: 700,
          lineHeight: 1, marginBottom: 20,
          color: timerColor,
          transition: 'color .5s ease',
          letterSpacing: '-2px',
        }}>
          {fmtTime(secondsLeft)}
        </div>

        {/* Progress bar */}
        <div style={{ width: '60%', height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', margin: '0 auto 28px' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            transition: 'width 1s linear',
            width: `${pct}%`,
            background: barColor,
          }} />
        </div>

        {danger ? (
          <div style={{
            marginBottom: 20,
            padding: '12px 20px',
            background: 'rgba(224,53,84,.12)',
            border: '1px solid rgba(224,53,84,.3)',
            borderRadius: 10,
            fontSize: 13, fontFamily: 'Inter, DM Sans, sans-serif',
            color: '#f07090', fontWeight: 600,
            animation: 'rec-pulse 1.5s ease-in-out infinite',
          }}>
            ⚠️ ¡Se acabará el tiempo! La grabación iniciará en {secondsLeft}s.
          </div>
        ) : (
          <p style={{ fontSize: 13.5, color: 'var(--dim)', marginBottom: 32, lineHeight: 1.6, fontFamily: 'Inter, DM Sans, sans-serif' }}>
            Prepara tu pitch mentalmente. Cuando estés listo, puedes pasar a grabar.
          </p>
        )}
        <Button variant="red" onClick={onReady} style={danger ? { boxShadow: '0 0 20px rgba(224,53,84,.5)', transform: 'scale(1.03)' } : {}}>
          Estoy listo — Grabar 🎬
        </Button>
      </div>
    </>
  )
}
