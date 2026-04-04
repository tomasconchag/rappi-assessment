'use client'

interface Props {
  fraudScore: number
  visible: boolean
}

export function ProctoringBadge({ fraudScore, visible }: Props) {
  if (!visible) return null
  const level = fraudScore <= 2 ? 'ok' : fraudScore <= 5 ? 'warn' : 'bad'

  const styleMap = {
    ok:   { bg: 'rgba(0,214,138,.07)',  border: 'rgba(0,214,138,.16)',  color: '#40d8a0', dot: '#00d68a' },
    warn: { bg: 'rgba(232,146,48,.07)', border: 'rgba(232,146,48,.16)', color: '#f0ac60', dot: '#e89230' },
    bad:  { bg: 'rgba(224,53,84,.08)',  border: 'rgba(224,53,84,.18)',  color: '#f07090', dot: '#e03554' },
  }[level]

  return (
    <div style={{
      position: 'fixed',
      top: 14,
      right: 14,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '6px 12px 6px 10px',
      borderRadius: 100,
      fontSize: 10,
      fontFamily: 'JetBrains Mono, Space Mono, monospace',
      fontWeight: 500,
      letterSpacing: '.8px',
      textTransform: 'uppercase',
      background: styleMap.bg,
      border: `1px solid ${styleMap.border}`,
      color: styleMap.color,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: styleMap.dot,
        animation: 'dot-pulse 2.5s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span>{level === 'ok' ? 'Monitoreado' : `Alertas: ${fraudScore}`}</span>
    </div>
  )
}
