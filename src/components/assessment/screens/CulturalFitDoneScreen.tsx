'use client'

interface Props {
  onNext: () => void
}

export function CulturalFitDoneScreen({ onNext }: Props) {
  return (
    <div className="anim" style={{ textAlign: 'center', padding: '48px 0' }}>
      {/* Icon */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        margin: '0 auto 20px',
        background: 'rgba(168,85,247,.1)',
        border: '1px solid rgba(168,85,247,.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
        boxShadow: '0 0 40px rgba(168,85,247,.15)',
      }}>
        🎙
      </div>

      {/* Label */}
      <div style={{
        fontSize: 10,
        fontFamily: 'Space Mono, monospace',
        textTransform: 'uppercase',
        letterSpacing: '1.8px',
        color: '#a855f7',
        marginBottom: 14,
        fontWeight: 500,
      }}>
        ✦ Cultural Fit — Completado
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
        ¡Entrevista finalizada!
      </h2>

      {/* Message */}
      <p style={{
        color: 'var(--dim)',
        fontSize: 14.5,
        marginBottom: 12,
        fontFamily: 'DM Sans, sans-serif',
        lineHeight: 1.7,
        maxWidth: 440,
        margin: '0 auto 12px',
      }}>
        Tu conversación con <strong style={{ color: 'var(--text)' }}>Simón</strong> ha concluido. El equipo de Rappi Brand Development revisará tu fit cultural con el equipo.
      </p>

      <p style={{
        color: 'var(--muted)',
        fontSize: 13,
        marginBottom: 36,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        Haz clic para enviar tu assessment completo.
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
          background: 'linear-gradient(140deg, #a855f7 0%, #7c3aed 100%)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '.3px',
          border: '1px solid rgba(168,85,247,.25)',
          cursor: 'pointer',
          boxShadow: '0 4px 22px rgba(168,85,247,.32), inset 0 1px 0 rgba(255,255,255,.12)',
          transition: 'transform .2s cubic-bezier(.16,1,.3,1), box-shadow .25s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.transform = 'translateY(-2px) scale(1.005)'
          el.style.boxShadow = '0 8px 28px rgba(168,85,247,.48), inset 0 1px 0 rgba(255,255,255,.12)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.transform = ''
          el.style.boxShadow = '0 4px 22px rgba(168,85,247,.32), inset 0 1px 0 rgba(255,255,255,.12)'
        }}
      >
        Enviar assessment →
      </button>
    </div>
  )
}
