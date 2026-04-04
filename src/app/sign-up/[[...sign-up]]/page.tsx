import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      background: 'var(--bg, #06060d)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text, #f0f0f8)',
          marginBottom: 6,
        }}>
          Rappi Assessment Center
        </div>
        <div style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 11,
          color: 'var(--muted, #6b6b8a)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}>
          Crea tu cuenta para comenzar
        </div>
      </div>
      <SignUp
        fallbackRedirectUrl="/assessment"
        signInFallbackRedirectUrl="/assessment"
      />
    </div>
  )
}
