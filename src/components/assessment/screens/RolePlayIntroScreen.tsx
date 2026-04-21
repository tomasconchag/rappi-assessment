'use client'

import type { RoleplayBankEntry } from '@/types/assessment'

interface Props {
  onStart: () => void
  roleplayBankCase?: RoleplayBankEntry | null
}

const tips = [
  { emoji: '📊', text: 'Usa los datos — estudia bien el restaurante antes de iniciar la llamada.' },
  { emoji: '💬', text: 'Sé directo — tienes 5 minutos. Ve al punto rápido.' },
  { emoji: '🎯', text: 'Propón acciones concretas — no generalices, habla de estrategias específicas de Rappi.' },
  { emoji: '🔊', text: 'Habla en voz alta — el avatar escucha y responde en tiempo real.' },
]

export function RolePlayIntroScreen({ onStart, roleplayBankCase }: Props) {
  const ownerName = roleplayBankCase?.owner_name ?? null
  const restaurantName = roleplayBankCase?.restaurant_name ?? null
  const ownerLabel = (roleplayBankCase?.owner_gender ?? 'f') === 'f' ? 'dueña' : 'dueño'
  const avatarLabel = (roleplayBankCase?.owner_gender ?? 'f') === 'f' ? 'la dueña' : 'el dueño'

  const whatItems = [
    `Habla en voz alta — como en una llamada de teléfono real. La IA escucha tu voz y te responde con voz. No tienes que escribir nada.`,
    ownerName
      ? `Vas a hablar con ${ownerName}, ${ownerLabel} de ${restaurantName ?? 'el restaurante'} — un avatar IA que simula ser el cliente real.`
      : `Vas a hablar con ${avatarLabel} del restaurante — un avatar IA que simula ser el cliente real.`,
    'Mientras hablas, todos los datos del restaurante estarán visibles en tu pantalla — no tienes que memorizar nada.',
    'Tu misión: identificar los problemas y proponer soluciones concretas con herramientas Rappi.',
  ]
  return (
    <div className="anim">
      {/* Header label */}
      <div style={{
        fontSize: 10,
        fontFamily: 'Space Mono, monospace',
        textTransform: 'uppercase',
        letterSpacing: '1.8px',
        color: '#f59e0b',
        marginBottom: 18,
        fontWeight: 500,
      }}>
        ✦ Challenge 2 — Role Play
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
          marginBottom: 14,
          letterSpacing: '-.5px',
          color: 'var(--text)',
        }}>
          Llamada con el dueño del restaurante
        </h2>
        <p style={{
          fontSize: 14.5,
          color: 'var(--dim)',
          lineHeight: 1.8,
          marginBottom: 0,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          Tienes 5 minutos para convencer{ownerName && restaurantName
            ? <> a <strong style={{ color: 'var(--text)' }}>{ownerName}</strong>, {ownerLabel} de <strong style={{ color: 'var(--text)' }}>{restaurantName}</strong>,</>
            : ` al ${ownerLabel} del restaurante`
          } de implementar nuevas estrategias en Rappi.
        </p>
      </div>

      {/* What it consists of */}
      <div className="anim1" style={{
        background: 'var(--card)',
        border: '1px solid rgba(245,158,11,.2)',
        borderLeft: '3px solid #f59e0b',
        borderRadius: 'var(--r)',
        padding: '28px 32px',
        marginBottom: 20,
        boxShadow: '0 0 30px rgba(245,158,11,.06), inset 0 1px 0 rgba(255,255,255,.04)',
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'Space Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#f59e0b',
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
                background: 'rgba(245,158,11,.14)',
                color: '#f59e0b',
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

      {/* "Talk out loud" callout */}
      <div className="anim2" style={{
        background: 'rgba(245,158,11,.07)',
        border: '1px solid rgba(245,158,11,.25)',
        borderLeft: '3px solid #f59e0b',
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>📞</span>
        <div style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 3 }}>
            Habla en voz alta durante toda la llamada
          </div>
          <div style={{ fontSize: 13, color: 'var(--dim)' }}>
            Igual que una llamada de teléfono: la IA te escucha y te responde con voz. No hay nada que escribir.
          </div>
        </div>
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
          Tips para la llamada
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

      {/* Flow hint */}
      <div className="anim3" style={{
        background: 'rgba(245,158,11,.06)',
        border: '1px solid rgba(245,158,11,.2)',
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 32,
        fontSize: 13,
        fontFamily: 'DM Sans, sans-serif',
        color: '#f59e0b',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
        <span>
          <strong>Primero tendrás 5 minutos para revisar los datos del restaurante.</strong> El tiempo de la llamada empieza solo cuando tú lo indiques.
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
            background: 'linear-gradient(140deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 700,
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
          Ver datos del restaurante →
        </button>
      </div>
    </div>
  )
}
