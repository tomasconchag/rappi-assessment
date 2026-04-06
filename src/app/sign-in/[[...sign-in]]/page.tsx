import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
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
          Inicia sesión para continuar
        </div>
      </div>
      <SignIn
        fallbackRedirectUrl="/assessment"
        signUpFallbackRedirectUrl="/assessment"
      />
      <Link
        href="/admin"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: '8px',
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.08)',
          color: '#6b6b8a', fontSize: 11,
          fontFamily: 'JetBrains Mono, Space Mono, monospace',
          letterSpacing: '.5px', textDecoration: 'none',
          textTransform: 'uppercase',
        }}
      >
        <span>⚙</span> Panel Admin
      </Link>
    </div>
  )
}
