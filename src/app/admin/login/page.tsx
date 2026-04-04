'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.')
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Left — brand panel */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(160deg, #0f0f1a 0%, #13131e 60%, #16101e 100%)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', filter: 'blur(100px)', background: 'rgba(233,69,96,.12)', top: -80, right: -60, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', filter: 'blur(100px)', background: 'rgba(67,97,238,.08)', bottom: 60, left: -60, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.5px' }}>RAPPI</div>
          </Link>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '3px', color: 'rgba(255,255,255,.3)', marginBottom: 20 }}>
            Assessment Center
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 44, fontWeight: 700, lineHeight: 1.1, marginBottom: 20, color: '#f0f0ff' }}>
            Panel de<br />
            Administración
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.4)', lineHeight: 1.7, maxWidth: 320, fontFamily: 'DM Sans' }}>
            Accede al panel de control del Assessment Farmer para revisar los resultados de los candidatos.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Dashboard con métricas en tiempo real',
              'Resultados detallados por candidato',
              'Análisis de integridad y proctoring',
              'Grabaciones de video y snapshots',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(6,214,160,.15)', border: '1px solid rgba(6,214,160,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2L6.5 2" stroke="var(--teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', fontFamily: 'DM Sans' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'rgba(255,255,255,.2)', letterSpacing: '1px' }}>
            © 2026 Rappi — Acceso Restringido
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Form header */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, lineHeight: 1.1, marginBottom: 8 }}>
              Iniciar sesión
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans' }}>
              Ingresá tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 11, fontFamily: 'Space Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '1.5px',
                color: 'var(--muted)', marginBottom: 8,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@rappi.com"
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  color: 'var(--text)', fontSize: 14,
                  fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color .2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(67,97,238,.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block',
                fontSize: 11, fontFamily: 'Space Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '1.5px',
                color: 'var(--muted)', marginBottom: 8,
              }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  color: 'var(--text)', fontSize: 14,
                  fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color .2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(67,97,238,.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(233,69,96,.07)',
                border: '1px solid rgba(233,69,96,.2)',
                borderRadius: 9, padding: '10px 14px',
                marginBottom: 20,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6" stroke="#ff6b6b" strokeWidth="1.5"/>
                  <path d="M7 4v4" stroke="#ff6b6b" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="7" cy="10" r="0.75" fill="#ff6b6b"/>
                </svg>
                <span style={{ fontSize: 13, color: '#ff6b6b', fontFamily: 'DM Sans' }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px 24px',
                background: loading ? 'rgba(67,97,238,.5)' : 'var(--blue)',
                color: '#fff', border: 'none', borderRadius: 9,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 2px 20px rgba(67,97,238,.3)',
                transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
                    <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
