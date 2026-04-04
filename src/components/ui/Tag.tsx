type Color = 'red' | 'blue' | 'teal' | 'gold' | 'green'

const colorStyles: Record<Color, React.CSSProperties> = {
  red:   { background: 'rgba(224,53,84,.1)',  color: '#f07090', border: '1px solid rgba(224,53,84,.22)' },
  blue:  { background: 'rgba(61,85,232,.1)',  color: '#8098f8', border: '1px solid rgba(61,85,232,.22)' },
  teal:  { background: 'rgba(0,196,158,.1)',  color: '#40d8be', border: '1px solid rgba(0,196,158,.22)' },
  gold:  { background: 'rgba(232,146,48,.1)', color: '#f0ac60', border: '1px solid rgba(232,146,48,.22)' },
  green: { background: 'rgba(0,214,138,.1)',  color: '#30e89a', border: '1px solid rgba(0,214,138,.22)' },
}

const dotColors: Record<Color, string> = {
  red: '#f07090', blue: '#8098f8', teal: '#40d8be', gold: '#f0ac60', green: '#30e89a',
}

export function Tag({ color = 'red', children }: { color?: Color; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '5px 13px',
      borderRadius: 100,
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '.8px',
      textTransform: 'uppercase',
      marginBottom: 18,
      fontFamily: 'Inter, DM Sans, sans-serif',
      ...colorStyles[color],
    }}>
      <span style={{
        display: 'inline-block',
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: dotColors[color],
        flexShrink: 0,
        animation: 'dot-pulse 2.5s ease-in-out infinite',
      }} />
      {children}
    </span>
  )
}
