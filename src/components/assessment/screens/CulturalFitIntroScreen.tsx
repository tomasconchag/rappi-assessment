'use client'

interface Props {
  onStart: () => void
}

const whatItems = [
  'Habla en voz alta — Simón te escucha y te responde con voz. Es igual que una llamada de teléfono, no hay nada que escribir.',
  'Simón es un avatar de IA (no es una persona real). Simula ser el Team Lead de Brand Development y te hará preguntas sobre tu forma de trabajar y tus valores.',
  'La entrevista dura 5 minutos — responde con honestidad y naturalidad, como lo harías con un entrevistador real.',
]

const tips = [
  { emoji: '🎯', text: 'Sé concreto — da ejemplos reales de situaciones que hayas vivido.' },
  { emoji: '💬', text: 'Habla en voz alta y claro — Simón escucha y responde en tiempo real.' },
  { emoji: '🧠', text: 'No hay respuestas correctas o incorrectas — buscamos autenticidad.' },
  { emoji: '⏱', text: 'Gestiona tu tiempo — tienes 5 minutos para la entrevista completa.' },
]

export function CulturalFitIntroScreen({ onStart }: Props) {
  return (
    <div className="anim">
      {/* Header label */}
      <div style={{
        fontSize: 10,
        fontFamily: 'Space Mono, monospace',
        textTransform: 'uppercase',
        letterSpacing: '1.8px',
        color: '#a855f7',
        marginBottom: 18,
        fontWeight: 500,
      }}>
        ✦ Último Challenge — Cultural Fit
      </div>

      {/* Main intro card */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '36px 40px',
        marginBottom: 20,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)',
      }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 34,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: '-.5px',
          color: 'var(--text)',
        }}>
          Entrevista con Simón
        </h2>
        {/* AI badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 100, marginBottom: 14,
          background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)',
          fontSize: 11, fontFamily: 'Space Mono, monospace',
          color: '#a855f7', fontWeight: 600, letterSpacing: '.5px',
          textTransform: 'uppercase',
        }}>
          <span>🤖</span> Avatar de Inteligencia Artificial
        </div>
        <p style={{
          fontSize: 14.5,
          color: 'var(--dim)',
          lineHeight: 1.8,
          marginBottom: 0,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          Esta es la última etapa del proceso. Vas a tener una conversación de voz con <strong style={{ color: 'var(--text)' }}>Simón</strong>, un avatar de IA que simula ser el Team Lead de Brand Development. <strong style={{ color: 'var(--text)' }}>No hay una persona real al otro lado</strong> — habla con normalidad, como si fuera una llamada.
        </p>
      </div>

      {/* What it consists of */}
      <div className="anim1" style={{
        background: 'var(--card)',
        border: '1px solid rgba(168,85,247,.2)',
        borderLeft: '3px solid #a855f7',
        borderRadius: 'var(--r)',
        padding: '28px 32px',
        marginBottom: 20,
        boxShadow: '0 0 30px rgba(168,85,247,.06), inset 0 1px 0 rgba(255,255,255,.04)',
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'Space Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#a855f7',
          marginBottom: 16,
          fontWeight: 500,
        }}>
          ¿En qué consiste?
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {whatItems.map((item, i) => (
            <li key={i} style={{
              display: 'flex',
              gap: 13,
              alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < whatItems.length - 1 ? '1px solid var(--border)' : 'none',
              fontSize: 13.5,
              color: 'var(--dim)',
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.65,
            }}>
              <span style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(168,85,247,.14)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'Space Mono, monospace',
                marginTop: 1,
              }}>
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Tips */}
      <div className="anim2" style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '28px 32px',
        marginBottom: 20,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)',
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'Space Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: 'var(--muted)',
          marginBottom: 16,
          fontWeight: 500,
        }}>
          Tips para la entrevista
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {tips.map((tip, i) => (
            <li key={i} style={{
              display: 'flex',
              gap: 13,
              alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < tips.length - 1 ? '1px solid var(--border)' : 'none',
              fontSize: 13.5,
              color: 'var(--dim)',
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.65,
            }}>
              <span style={{ flexShrink: 0, fontSize: 16, marginTop: 1 }}>{tip.emoji}</span>
              {tip.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Info note */}
      <div className="anim3" style={{
        background: 'rgba(168,85,247,.06)',
        border: '1px solid rgba(168,85,247,.2)',
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 32,
        fontSize: 13,
        fontFamily: 'DM Sans, sans-serif',
        color: '#a855f7',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🎙</span>
        <span>
          <strong>Se grabará tu cámara, micrófono y pantalla</strong> durante toda la entrevista para el proceso de evaluación.
        </span>
      </div>

      {/* CTA button */}
      <div className="anim3" style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onStart}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 40px',
            borderRadius: 'var(--rs)',
            background: 'linear-gradient(140deg, #a855f7 0%, #7c3aed 100%)',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 700,
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
          Iniciar entrevista →
        </button>
      </div>
    </div>
  )
}
