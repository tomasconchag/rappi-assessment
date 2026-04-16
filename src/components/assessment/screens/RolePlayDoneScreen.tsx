'use client'

interface Props {
  onNext: () => void
}

export function RolePlayDoneScreen({ onNext }: Props) {
  return (
    <div className="anim" style={{ textAlign: 'center', padding: '48px 0' }}>
      {/* Icon */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        margin: '0 auto 20px',
        background: 'rgba(245,158,11,.1)',
        border: '1px solid rgba(245,158,11,.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
        boxShadow: '0 0 40px rgba(245,158,11,.15)',
      }}>
        📞
      </div>

      {/* Label */}
      <div style={{
        fontSize: 10,
        fontFamily: 'Space Mono, monospace',
        textTransform: 'uppercase',
        letterSpacing: '1.8px',
        color: '#f59e0b',
        marginBottom: 14,
        fontWeight: 500,
      }}>
        ✦ Role Play — Completado
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'Fraunces, serif',
        fontSize: 36,
        fontWeight: 700,
        marginBottom: 12,
        letterSpacing: '-.5px',
        color: 'var(--text)',
      }}>
        ¡Llamada finalizada!
      </h2>

      {/* Message */}
      <p style={{
        color: 'var(--dim)',
        fontSize: 14.5,
        marginBottom: 12,
        fontFamily: 'DM Sans, sans-serif',
        lineHeight: 1.7,
        maxWidth: 420,
        margin: '0 auto 12px',
      }}>
        Tu llamada de roleplay ha concluido. El equipo de Rappi revisará tu desempeño en la conversación con el restaurante.
      </p>

      <p style={{
        color: 'var(--muted)',
        fontSize: 13,
        marginBottom: 36,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Continúa con el resto del assessment.
      </p>

      {/* Button */}
      <button
        onClick={onNext}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '15px 36px',
          borderRadius: 'var(--rs)',
          background: 'linear-gradient(140deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '.3px',
          border: '1px solid rgba(245,158,11,.25)',
          cursor: 'pointer',
          boxShadow: '0 4px 22px rgba(245,158,11,.32), inset 0 1px 0 rgba(255,255,255,.12)',
          transition: 'transform .2s cubic-bezier(.16,1,.3,1), box-shadow .25s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.transform = 'translateY(-2px) scale(1.005)'
          el.style.boxShadow = '0 8px 28px rgba(245,158,11,.48), inset 0 1px 0 rgba(255,255,255,.12)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.transform = ''
          el.style.boxShadow = '0 4px 22px rgba(245,158,11,.32), inset 0 1px 0 rgba(255,255,255,.12)'
        }}
      >
        Continuar →
      </button>
    </div>
  )
}
