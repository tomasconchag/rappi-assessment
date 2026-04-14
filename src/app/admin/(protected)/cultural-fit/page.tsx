import { CulturalFitTestPanel } from './CulturalFitTestPanel'

export default function CulturalFitPage() {
  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '28px 32px',
  }

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Configuración
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
          Cultural Fit
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
          Prueba la entrevista con Simón y verifica exactamente lo que ven los candidatos.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Test panel */}
        <CulturalFitTestPanel />

        {/* Info card */}
        <div style={{ ...card, borderTop: '3px solid rgba(168,85,247,.4)' }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a855f7', marginBottom: 12 }}>
            Cultural Fit · Simón
          </div>
          <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.7, margin: '0 0 16px' }}>
            Entrevista de 5 minutos con Simón, Team Lead de Brand Development. El agente hace preguntas sobre gestión de conflictos, fit cultural, adaptabilidad, dinámica de equipo y gestión de feedback.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              'Gestión de conflictos',
              'Fit cultural',
              'Adaptabilidad',
              'Dinámica de equipo',
              'Gestión de feedback',
            ].map(dim => (
              <span key={dim} style={{
                fontSize: 11.5, fontFamily: 'Inter, DM Sans, sans-serif',
                padding: '4px 12px', borderRadius: 100,
                background: 'rgba(168,85,247,.08)',
                border: '1px solid rgba(168,85,247,.2)',
                color: '#a855f7',
              }}>
                {dim}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
