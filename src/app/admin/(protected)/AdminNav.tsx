'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function AdminNav({ email }: { email: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <nav style={{
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 60,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(19,19,26,.96)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.5px', textDecoration: 'none' }}>RAPPI</Link>
        <span style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', padding: '3px 8px', background: 'rgba(255,255,255,.04)', borderRadius: 4 }}>Admin</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { href: '/admin', label: 'Dashboard' },
            { href: '/admin/candidates', label: 'Candidatos' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{ fontSize: 13, color: 'var(--dim)', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', transition: 'all .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--dim)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>{email}</div>
        <button
          onClick={handleLogout}
          style={{
            fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)',
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
            transition: 'all .2s',
          }}
          onMouseEnter={e => { (e.currentTarget).style.color = '#ff6b6b'; (e.currentTarget).style.borderColor = 'rgba(233,69,96,.4)' }}
          onMouseLeave={e => { (e.currentTarget).style.color = 'var(--muted)'; (e.currentTarget).style.borderColor = 'var(--border)' }}
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
