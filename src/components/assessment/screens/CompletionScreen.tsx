'use client'

interface Props {
  name: string
  submitting: boolean
  error: string | null
  confirmationCode: string | null
}

export function CompletionScreen({ name, submitting, error, confirmationCode }: Props) {
  return (
    <div className="anim" style={{ textAlign: 'center', padding: '72px 0' }}>
      {submitting ? (
        <>
          {/* Spinner */}
          <div style={{
            width: 68, height: 68, borderRadius: '50%', margin: '0 auto 28px',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--red)',
            animation: 'spin .8s linear infinite',
          }} />
          <h2 style={{
            fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700,
            marginBottom: 12, letterSpacing: '-.5px',
          }}>
            Guardando tu assessment...
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6 }}>
            Subiendo video y guardando respuestas.{' '}
            <strong style={{ color: 'var(--text)' }}>No cierres esta ventana.</strong>
          </p>
        </>
      ) : error ? (
        <>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
            background: 'rgba(224,53,84,.1)', border: '1px solid rgba(224,53,84,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30,
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700,
            marginBottom: 12, letterSpacing: '-.5px', color: '#f07090',
          }}>
            Error al guardar
          </h2>
          <p style={{ fontSize: 14.5, color: '#f07090', marginBottom: 16, fontFamily: 'Inter, DM Sans, sans-serif' }}>
            {error}
          </p>
          <p style={{ fontSize: 14, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif' }}>
            Contacta al equipo de Recursos Humanos.
          </p>
        </>
      ) : (
        <>
          {/* Success ring */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%', margin: '0 auto 28px',
            background: 'rgba(0,214,138,.1)',
            border: '1px solid rgba(0,214,138,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            boxShadow: '0 0 60px rgba(0,214,138,.2)',
          }}>
            ✓
          </div>

          <h2 style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700, marginBottom: 14,
            letterSpacing: '-1px', lineHeight: 1.1,
          }}>
            {name}, completaste<br />el assessment
          </h2>
          <p style={{
            fontSize: 15, color: 'var(--dim)',
            maxWidth: 460, margin: '0 auto 40px',
            lineHeight: 1.75, fontFamily: 'Inter, DM Sans, sans-serif',
          }}>
            Tus respuestas, video y datos han sido guardados exitosamente.
            El equipo de Rappi revisará tu evaluación y se pondrá en contacto contigo.
          </p>

          {/* Confirmation code + message stacked */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            {confirmationCode && (
              <div style={{
                padding: '16px 32px',
                background: 'var(--card)',
                border: '1px solid rgba(0,214,138,.2)',
                borderRadius: 'var(--r)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)',
                minWidth: 240,
              }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8 }}>
                  Código de confirmación
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, Space Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--green)', letterSpacing: '1px' }}>
                  {confirmationCode.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontFamily: 'Inter, DM Sans, sans-serif' }}>
                  Guarda este código — es tu comprobante de envío.
                </div>
              </div>
            )}

            <div style={{
              padding: '16px 36px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)',
            }}>
              <p style={{
                fontSize: 14, color: 'var(--dim)',
                fontFamily: 'Inter, DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', gap: 8,
                margin: 0,
              }}>
                <span style={{ fontSize: 18 }}>🚀</span>
                ¡Mucho éxito en el proceso!
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
