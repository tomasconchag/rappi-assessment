'use client'

import { fmtTime } from '@/lib/scoring'

interface Props {
  secondsLeft: number
  totalSeconds: number
  label: string
}

export function TimerBar({ secondsLeft, totalSeconds, label }: Props) {
  const pct = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0
  const danger = pct < 20
  const warn = pct < 40

  const timerColor = danger ? '#ff6070' : warn ? 'var(--gold)' : 'var(--text)'
  const barColor   = danger
    ? 'linear-gradient(90deg,#c42448,#ff6070)'
    : warn
    ? 'linear-gradient(90deg,#e89230,#f0b060)'
    : 'linear-gradient(90deg,#00a885,#00d68a)'

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(10,10,22,.92)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 24px',
      margin: '-40px -24px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      gap: 20,
    }}>
      {/* Label */}
      <div style={{
        fontSize: 10,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        fontFamily: 'JetBrains Mono, Space Mono, monospace',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>

      {/* Progress bar */}
      <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
        <div style={{
          height: '100%',
          borderRadius: 99,
          transition: 'width 1s linear',
          width: `${pct}%`,
          background: barColor,
        }} />
      </div>

      {/* Time */}
      <div style={{
        fontFamily: 'JetBrains Mono, Space Mono, monospace',
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '1px',
        color: timerColor,
        transition: 'color .5s ease',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}>

        {fmtTime(secondsLeft)}
      </div>
    </div>
  )
}
