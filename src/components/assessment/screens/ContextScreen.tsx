'use client'

import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import type { SectionId } from '@/lib/challenges'

interface Props {
  name: string
  onStart: () => void
  enabledSections?: SectionId[]
}

const prohibitions = [
  {
    icon: '🚫',
    title: 'No copies ni pegues',
    text: 'Está <strong>totalmente prohibido</strong>. Registramos cada intento y afecta directamente tu puntaje de integridad.',
  },
  {
    icon: '📵',
    title: 'No cambies de pestaña ni abras otras apps',
    text: 'Cada vez que salgas de esta ventana queda registrado. <strong>Acumular cambios genera penalización.</strong>',
  },
  {
    icon: '📺',
    title: 'La pantalla completa es obligatoria',
    text: 'La prueba se realiza en pantalla completa. Si sales, <strong>el sistema lo detecta y lo anota.</strong>',
  },
]

const tips = [
  {
    icon: '📸',
    title: 'Tomaremos fotos con tu cámara',
    text: 'En momentos aleatorios tomaremos <strong>2 o 3 fotos</strong>. No te preocupes, solo necesitamos verificar que eres tú.',
  },
  {
    icon: '⏱',
    title: 'Cada sección tiene su propio tiempo',
    text: 'Una vez avances, <strong>no puedes volver atrás.</strong> Gestiona bien tu tiempo en cada parte.',
  },
  {
    icon: '🧮',
    title: 'Prepara papel y lápiz para el Taller de Math',
    text: '<strong>No puedes usar calculadora.</strong> Las operaciones son manejables a mano, pero tener papel ayuda.',
  },
  {
    icon: '🧠',
    title: 'Tu comportamiento también se evalúa',
    text: 'Además de tus respuestas, evaluamos <strong>cómo actúas durante la prueba.</strong> La honestidad también hace parte de tu perfil.',
  },
]

const ALL_SECTIONS: Record<string, { icon: string; title: string; desc: string; meta: string; color: string; glow: string; border: string }> = {
  sharktank: {
    icon: '🦈', title: 'SharkTank', desc: '2 min de preparación + pitch en video de hasta 90 seg.',
    meta: '~3.5 min · 35%', color: 'var(--red)', glow: 'rgba(224,53,84,.1)', border: 'rgba(224,53,84,.18)',
  },
  roleplay: {
    icon: '📞', title: 'Role Play — Llamada', desc: 'Llamada de 5 min con el dueño de un restaurante (avatar IA). Convéncelo de implementar estrategias Rappi.',
    meta: '~5 min · 35%', color: '#f59e0b', glow: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.18)',
  },
  caso: {
    icon: '📊', title: 'Caso Práctico', desc: 'Datos reales de un aliado Rappi. 4 preguntas con tiempo.',
    meta: '~15 min · 40%', color: 'var(--blue)', glow: 'rgba(61,85,232,.1)', border: 'rgba(61,85,232,.18)',
  },
  math: {
    icon: '🧮', title: 'Taller Math', desc: '9 preguntas numéricas progresivas. Sin calculadora.',
    meta: '~8 min · 25%', color: 'var(--teal)', glow: 'rgba(0,196,158,.1)', border: 'rgba(0,196,158,.18)',
  },
}

export function ContextScreen({ name, onStart, enabledSections }: Props) {
  const enabled = enabledSections ?? ['sharktank', 'caso', 'math']
  const sections = enabled.map(id => ALL_SECTIONS[id]).filter(Boolean)

  return (
    <>
      {/* Header */}
      <div className="anim" style={{ textAlign: 'center', paddingTop: 10, marginBottom: 40 }}>
        <Tag color="gold">Antes de empezar</Tag>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: 700, marginBottom: 14,
          lineHeight: 1.1, letterSpacing: '-1px',
        }}>
          {name}, aquí va lo<br />que necesitas saber
        </h2>
        <p style={{ color: 'var(--dim)', fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: '0 auto', fontFamily: 'Inter, DM Sans, sans-serif' }}>
          La evaluación tiene {sections.length} {sections.length === 1 ? 'etapa' : 'etapas'} en secuencia. Lee con cuidado antes de comenzar.
        </p>
      </div>

      {/* Section cards */}
      <div className="anim1" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(sections.length, 3)}, 1fr)`, gap: 14, marginBottom: 28 }}>
        {sections.map((s, i) => (
          <div
            key={s.title}
            className={`anim${i > 0 ? i : ''}`}
            style={{
              background: 'var(--card)',
              border: `1px solid ${s.border}`,
              borderRadius: 'var(--r)',
              padding: '26px 22px',
              textAlign: 'left',
              transition: 'transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.05), 0 0 30px ${s.glow}`,
              cursor: 'default',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.transform = 'translateY(-3px)'
              el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.07), 0 12px 40px ${s.glow}`
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.transform = ''
              el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.05), 0 0 30px ${s.glow}`
            }}
          >
            {/* Number watermark */}
            <div style={{
              position: 'absolute', top: -8, right: 14,
              fontFamily: 'Fraunces, serif', fontSize: 64, fontWeight: 700,
              color: s.color, opacity: .06, lineHeight: 1, pointerEvents: 'none',
            }}>{String(i + 1).padStart(2, '0')}</div>

            <div style={{
              width: 42, height: 42, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, marginBottom: 16,
              background: s.glow, border: `1px solid ${s.border}`,
            }}>
              {s.icon}
            </div>
            <h3 style={{
              fontSize: 14, fontWeight: 700, marginBottom: 7,
              fontFamily: 'Inter, DM Sans, sans-serif', letterSpacing: '-.1px',
            }}>{s.title}</h3>
            <p style={{
              fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.55,
              fontFamily: 'Inter, DM Sans, sans-serif',
            }}>{s.desc}</p>
            <div style={{
              marginTop: 16, fontSize: 10,
              fontFamily: 'JetBrains Mono, Space Mono, monospace',
              color: s.color, opacity: .85, letterSpacing: '.5px',
            }}>
              ⏱ {s.meta}
            </div>
          </div>
        ))}
      </div>

      {/* Rules card */}
      <div className="anim2" style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Prohibitions block */}
        <div style={{
          background: 'rgba(224,53,84,.04)',
          border: '1px solid rgba(224,53,84,.18)',
          borderRadius: 'var(--r)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 24px',
            borderBottom: '1px solid rgba(224,53,84,.12)',
            background: 'rgba(224,53,84,.06)',
          }}>
            <span style={{ fontSize: 14 }}>🚨</span>
            <span style={{
              fontFamily: 'JetBrains Mono, Space Mono, monospace',
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px',
              color: '#f07090', fontWeight: 600,
            }}>
              Está prohibido — generan penalización
            </span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {prohibitions.map((r, i) => (
              <div key={i} style={{
                padding: '14px 24px',
                borderBottom: i < prohibitions.length - 1 ? '1px solid rgba(224,53,84,.08)' : 'none',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <span style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, background: 'rgba(224,53,84,.1)',
                  border: '1px solid rgba(224,53,84,.15)', marginTop: 1,
                }}>
                  {r.icon}
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'Inter, DM Sans, sans-serif', marginBottom: 3 }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.55 }}
                    dangerouslySetInnerHTML={{ __html: r.text }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips block */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,.02)',
          }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <span style={{
              fontFamily: 'JetBrains Mono, Space Mono, monospace',
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', fontWeight: 500,
            }}>
              Ten esto presente durante la evaluación
            </span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {tips.map((r, i) => (
              <div key={i} style={{
                padding: '14px 24px',
                borderBottom: i < tips.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <span style={{
                  flexShrink: 0, width: 30, height: 30, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, background: 'rgba(255,255,255,.05)',
                  border: '1px solid var(--border)', marginTop: 1,
                }}>
                  {r.icon}
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'Inter, DM Sans, sans-serif', marginBottom: 3 }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.55 }}
                    dangerouslySetInnerHTML={{ __html: r.text }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CTA */}
      <div className="anim3" style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="red" onClick={onStart}>
          Ya entendí — Comenzar evaluación 🔒
        </Button>
      </div>
    </>
  )
}
