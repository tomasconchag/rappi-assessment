type AccentColor = 'red' | 'blue' | 'teal' | 'gold' | 'green'

const accentValues: Record<AccentColor, { solid: string; glow: string; border: string }> = {
  red:   { solid: 'linear-gradient(180deg,#e03554,#c22448)', glow: 'rgba(224,53,84,.14)',  border: 'rgba(224,53,84,.18)' },
  blue:  { solid: 'linear-gradient(180deg,#3d55e8,#2d44d8)', glow: 'rgba(61,85,232,.12)', border: 'rgba(61,85,232,.18)' },
  teal:  { solid: 'linear-gradient(180deg,#00c49e,#00a885)', glow: 'rgba(0,196,158,.12)', border: 'rgba(0,196,158,.18)' },
  gold:  { solid: 'linear-gradient(180deg,#e89230,#cc7820)', glow: 'rgba(232,146,48,.12)', border: 'rgba(232,146,48,.18)' },
  green: { solid: 'linear-gradient(180deg,#00d68a,#00b874)', glow: 'rgba(0,214,138,.12)', border: 'rgba(0,214,138,.18)' },
}

interface Props {
  children: React.ReactNode
  accent?: AccentColor
  className?: string
  style?: React.CSSProperties
}

export function Card({ children, accent, style }: Props) {
  const a = accent ? accentValues[accent] : null

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${a ? a.border : 'var(--border)'}`,
      borderRadius: 'var(--r)',
      padding: 40,
      marginBottom: 32,
      position: 'relative',
      overflow: 'hidden',
      /* Top highlight — creates subtle 3-D lift feel */
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 1px 3px rgba(0,0,0,.4)${a ? `, 0 0 40px ${a.glow}` : ''}`,
      ...style,
    }}>
      {accent && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 3,
          height: '100%',
          background: a!.solid,
          borderRadius: '0 0 0 0',
        }} />
      )}
      {children}
    </div>
  )
}
