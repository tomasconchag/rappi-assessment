'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
      </svg>
    ),
    children: null,
  },
  {
    href: '/admin/candidates',
    label: 'Candidatos',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" fill="currentColor" opacity=".8"/>
        <path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
        <path d="M11 7.5c1.4.5 2.5 1.8 2.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
        <circle cx="12" cy="4.5" r="2" fill="currentColor" opacity=".4"/>
      </svg>
    ),
    children: null,
  },
  {
    href: '/admin/cohorts',
    label: 'Cohortes',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="4" cy="5" r="2" fill="currentColor" opacity=".8"/>
        <circle cx="12" cy="5" r="2" fill="currentColor" opacity=".5"/>
        <circle cx="8" cy="5" r="2" fill="currentColor" opacity=".65"/>
        <path d="M1 13c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".8"/>
        <path d="M9 13c0-1.7 1.3-3 3-3s3 1.3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
    children: null,
  },
  {
    href: '/admin/challenges',
    label: 'Challenges',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="4" height="12" rx="1" fill="currentColor" opacity=".4"/>
        <rect x="6" y="5" width="4" height="9" rx="1" fill="currentColor" opacity=".7"/>
        <rect x="11" y="8" width="4" height="6" rx="1" fill="currentColor" opacity=".9"/>
      </svg>
    ),
    children: null,
  },
  {
    href: '/admin/rubric',
    label: 'Rúbrica IA',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
        <circle cx="13" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3" opacity=".8"/>
        <path d="M14.8 13.8l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".6"/>
      </svg>
    ),
    children: [
      { href: '/admin/rubric/caso', label: 'Caso Práctico', icon: '📊', color: 'var(--blue)', colorBg: 'rgba(67,97,238,.12)', colorBorder: 'rgba(67,97,238,.25)' },
      { href: '/admin/rubric/sharktank', label: 'SharkTank', icon: '🦈', color: 'var(--red)', colorBg: 'rgba(233,69,96,.1)', colorBorder: 'rgba(233,69,96,.25)' },
      { href: '/admin/rubric/roleplay', label: 'RolePlay', icon: '📞', color: 'var(--teal)', colorBg: 'rgba(6,214,160,.1)', colorBorder: 'rgba(6,214,160,.25)' },
    ],
  },
  {
    href: '/admin/roleplay',
    label: 'Role Play',
    exact: true,
    icon: <span style={{ fontSize: 16, lineHeight: 1 }}>📞</span>,
    children: null,
  },
  {
    href: '/admin/settings',
    label: 'Taller de Math',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
        <path d="M11 9l1.5 1.5L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".9"/>
      </svg>
    ),
    children: null,
  },
]

export function AdminSidebar({ email }: { email: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const initial = email ? email.charAt(0).toUpperCase() : 'A'
  const displayEmail = email.length > 24 ? email.slice(0, 22) + '…' : email

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'rgba(15,15,22,0.98)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 50,
    }}>

      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.5px', lineHeight: 1 }}>RAPPI</div>
          <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginTop: 5 }}>
            Assessment Admin
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px' }}>
        <div style={{
          fontSize: 9, fontFamily: 'Space Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '2px',
          color: 'var(--muted)', padding: '4px 10px 10px',
          opacity: 0.6,
        }}>
          General
        </div>
        {navItems.map(item => {
          const isParentActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const showChildren = item.children && isParentActive

          return (
            <div key={item.href}>
              <Link
                href={item.children ? item.children[0].href : item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: isParentActive ? 600 : 400,
                  color: isParentActive ? 'var(--text)' : 'var(--dim)',
                  background: isParentActive && !item.children ? 'rgba(255,255,255,.07)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all .15s',
                  marginBottom: showChildren ? 4 : 2,
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isParentActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)'
                  if (!isParentActive) (e.currentTarget as HTMLElement).style.color = 'var(--text)'
                }}
                onMouseLeave={e => {
                  if (!isParentActive || item.children) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  if (!isParentActive) (e.currentTarget as HTMLElement).style.color = 'var(--dim)'
                }}
              >
                {isParentActive && !item.children && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 16, borderRadius: 3,
                    background: 'var(--red)',
                  }} />
                )}
                <span style={{ color: isParentActive ? 'var(--text)' : 'var(--muted)', display: 'flex' }}>
                  {item.icon}
                </span>
                {item.label}
                {item.children && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>
                    {isParentActive ? '▾' : '▸'}
                  </span>
                )}
              </Link>

              {/* Sub-items */}
              {showChildren && item.children && (
                <div style={{ marginLeft: 12, marginBottom: 6, paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,.07)' }}>
                  {item.children.map(child => {
                    const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '7px 10px',
                          borderRadius: 7,
                          fontSize: 12.5,
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: childActive ? 600 : 400,
                          color: childActive ? child.color : 'var(--dim)',
                          background: childActive ? child.colorBg : 'transparent',
                          border: childActive ? `1px solid ${child.colorBorder}` : '1px solid transparent',
                          textDecoration: 'none',
                          transition: 'all .15s',
                          marginBottom: 3,
                        }}
                        onMouseEnter={e => {
                          if (!childActive) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!childActive) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--dim)'
                          }
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{child.icon}</span>
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--red), #c23152)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {initial}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 11.5, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}>
              {displayEmail}
            </div>
            <div style={{ fontSize: 9, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginTop: 2 }}>
              Admin
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '7px 10px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 7, fontSize: 12,
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--muted)', cursor: 'pointer',
            transition: 'all .15s', textAlign: 'center',
          }}
          onMouseEnter={e => {
            (e.currentTarget).style.color = '#ff6b6b'
            ;(e.currentTarget).style.borderColor = 'rgba(233,69,96,.35)'
            ;(e.currentTarget).style.background = 'rgba(233,69,96,.05)'
          }}
          onMouseLeave={e => {
            (e.currentTarget).style.color = 'var(--muted)'
            ;(e.currentTarget).style.borderColor = 'rgba(255,255,255,.08)'
            ;(e.currentTarget).style.background = 'transparent'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
