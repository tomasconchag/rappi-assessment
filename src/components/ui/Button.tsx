import { ButtonHTMLAttributes } from 'react'

type Variant = 'red' | 'blue' | 'green' | 'ghost' | 'teal'

const variantStyles: Record<Variant, React.CSSProperties> = {
  red: {
    background: 'linear-gradient(140deg, #e03554 0%, #c22448 100%)',
    color: 'white',
    boxShadow: '0 4px 22px rgba(224,53,84,.32), inset 0 1px 0 rgba(255,255,255,.12)',
    border: '1px solid rgba(224,53,84,.25)',
  },
  blue: {
    background: 'linear-gradient(140deg, #3d55e8 0%, #2d44d8 100%)',
    color: 'white',
    boxShadow: '0 4px 22px rgba(61,85,232,.32), inset 0 1px 0 rgba(255,255,255,.12)',
    border: '1px solid rgba(61,85,232,.25)',
  },
  green: {
    background: 'linear-gradient(140deg, #00d68a 0%, #00b874 100%)',
    color: '#06060d',
    boxShadow: '0 4px 22px rgba(0,214,138,.3), inset 0 1px 0 rgba(255,255,255,.18)',
    border: '1px solid rgba(0,214,138,.2)',
  },
  teal: {
    background: 'linear-gradient(140deg, #00c49e 0%, #00a885 100%)',
    color: '#06060d',
    boxShadow: '0 4px 22px rgba(0,196,158,.3), inset 0 1px 0 rgba(255,255,255,.18)',
    border: '1px solid rgba(0,196,158,.2)',
  },
  ghost: {
    background: 'rgba(255,255,255,.04)',
    color: 'var(--dim)',
    border: '1px solid var(--border-mid)',
    boxShadow: 'none',
  },
}

const hoverGlow: Record<Variant, string> = {
  red:   '0 8px 28px rgba(224,53,84,.48), inset 0 1px 0 rgba(255,255,255,.12)',
  blue:  '0 8px 28px rgba(61,85,232,.44), inset 0 1px 0 rgba(255,255,255,.12)',
  green: '0 8px 28px rgba(0,214,138,.4),  inset 0 1px 0 rgba(255,255,255,.18)',
  teal:  '0 8px 28px rgba(0,196,158,.4),  inset 0 1px 0 rgba(255,255,255,.18)',
  ghost: '0 4px 14px rgba(255,255,255,.06)',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'red', style, children, disabled, onClick, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '15px 36px',
        borderRadius: 'var(--rs)',
        fontFamily: 'Inter, DM Sans, sans-serif',
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform .2s cubic-bezier(.16,1,.3,1), box-shadow .25s ease',
        letterSpacing: '.3px',
        opacity: disabled ? 0.4 : 1,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(-2px) scale(1.005)'
          el.style.boxShadow = hoverGlow[variant]
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = ''
        el.style.boxShadow = (variantStyles[variant].boxShadow as string) || ''
      }}
    >
      {children}
    </button>
  )
}
