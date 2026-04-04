'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ClerkUser {
  id: string
  name: string
  email: string
  imageUrl?: string
}

interface Props {
  onSubmit: (candidate: { name: string; email: string; cedula: string }) => void
  clerkUser?: ClerkUser | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function WelcomeScreen({ onSubmit, clerkUser }: Props) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [cedula,  setCedula]  = useState('')
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = (field: string, value: string): string => {
    if (field === 'name')   return value.trim() ? '' : 'Nombre requerido'
    if (field === 'email')  return EMAIL_RE.test(value.trim()) ? '' : 'Ingresa un email válido'
    if (field === 'cedula') return /^\d{5,12}$/.test(value.trim()) ? '' : 'Solo números, 5-12 dígitos'
    return ''
  }

  const handleBlur = (field: string, value: string) => {
    setTouched(t => ({ ...t, [field]: true }))
    const err = validateField(field, value)
    setErrors(e => ({ ...e, [field]: err }))
  }

  const handleChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value)
    if (touched[field]) {
      const err = validateField(field, value)
      setErrors(e => ({ ...e, [field]: err }))
    }
  }

  const validate = () => {
    if (clerkUser) {
      // Only validate cedula when logged in
      const err = validateField('cedula', cedula)
      if (err) {
        setErrors({ cedula: err })
        setTouched({ cedula: true })
        return false
      }
      return true
    }
    const fields = { name, email, cedula }
    const e: Record<string, string> = {}
    for (const [f, v] of Object.entries(fields)) {
      const err = validateField(f, v)
      if (err) e[f] = err
    }
    setErrors(e)
    setTouched({ name: true, email: true, cedula: true })
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (clerkUser) {
      onSubmit({ name: clerkUser.name, email: clerkUser.email, cedula: cedula.trim() })
    } else {
      onSubmit({ name: name.trim(), email: email.trim().toLowerCase(), cedula: cedula.trim() })
    }
  }

  const isValid = (field: string) => touched[field] && !errors[field] && (
    field === 'name'   ? name.trim().length > 0   :
    field === 'email'  ? EMAIL_RE.test(email.trim()) :
    /^\d{5,12}$/.test(cedula.trim())
  )

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '15px 44px 15px 20px',
    borderRadius: 'var(--rs)',
    fontSize: 15,
    fontFamily: 'Inter, DM Sans, sans-serif',
    background: 'var(--input)',
    border: `1px solid ${errors[field] && touched[field] ? 'rgba(224,53,84,.5)' : isValid(field) ? 'rgba(0,196,158,.4)' : 'var(--border-mid)'}`,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    boxShadow: errors[field] && touched[field]
      ? '0 0 0 3px rgba(224,53,84,.08)'
      : isValid(field) ? '0 0 0 3px rgba(0,196,158,.06)' : 'none',
    boxSizing: 'border-box',
  })

  const firstName = clerkUser?.name?.split(' ')[0] ?? ''

  return (
    <div style={{
      minHeight: 'calc(100vh - 40px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '60px 0',
    }} className="anim">

      {/* Eyebrow pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 16px 6px 12px', borderRadius: 100, marginBottom: 32,
        background: 'rgba(232,146,48,.08)', border: '1px solid rgba(232,146,48,.2)',
        color: '#f0ac60', fontSize: 11, fontWeight: 600,
        letterSpacing: '.5px', textTransform: 'uppercase',
        fontFamily: 'Inter, DM Sans, sans-serif',
      }}>
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#e89230', animation: 'dot-pulse 2.5s ease-in-out infinite' }} />
        Assessment Interactivo · Farmer
      </div>

      {/* Main title */}
      <h1 style={{
        fontFamily: 'Fraunces, serif',
        fontSize: 'clamp(2.8rem, 7vw, 5rem)',
        fontWeight: 700, lineHeight: 1.05,
        marginBottom: 22,
        letterSpacing: '-1.5px',
      }}>
        Bienvenido al<br />
        <span style={{
          background: 'linear-gradient(135deg, #f07090 0%, #e03554 40%, #c22448 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Assessment Center
        </span>
      </h1>

      {/* Subtitle */}
      <p style={{
        color: 'var(--dim)', fontSize: 16, maxWidth: 460,
        lineHeight: 1.75, marginBottom: 48,
        fontFamily: 'Inter, DM Sans, sans-serif',
      }}>
        Proceso de evaluación para el rol de{' '}
        <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Farmer</strong>{' '}
        en Rappi. Mide habilidades comerciales, analíticas y numéricas.
      </p>

      {/* Clerk user card or full form */}
      {clerkUser ? (
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          {/* User identity card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 20px', borderRadius: 'var(--rs)',
            background: 'rgba(0,196,158,.06)',
            border: '1px solid rgba(0,196,158,.2)',
            textAlign: 'left',
          }}>
            {clerkUser.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clerkUser.imageUrl}
                alt={clerkUser.name}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #e03554, #c22448)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 18, fontWeight: 700,
              }}>
                {clerkUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', fontFamily: 'Inter, DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clerkUser.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clerkUser.email}
              </div>
            </div>
            <div style={{ color: 'var(--teal)', fontSize: 16, flexShrink: 0 }}>✓</div>
          </div>

          {/* Only cedula input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Número de cédula"
              value={cedula}
              onChange={e => handleChange('cedula', e.target.value, setCedula)}
              onBlur={e => handleBlur('cedula', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle('cedula')}
            />
            {isValid('cedula') && (
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--teal)', fontSize: 14, pointerEvents: 'none' }}>
                ✓
              </div>
            )}
            {errors.cedula && touched.cedula && (
              <p style={{ color: '#f07090', fontSize: 11.5, marginTop: 5, textAlign: 'left', fontFamily: 'Inter, DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>⚠</span> {errors.cedula}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {[
            { id: 'name',   type: 'text',  value: name,   setter: setName,   placeholder: 'Nombre completo' },
            { id: 'email',  type: 'email', value: email,  setter: setEmail,  placeholder: 'Correo electrónico' },
            { id: 'cedula', type: 'text',  value: cedula, setter: setCedula, placeholder: 'Número de cédula' },
          ].map(f => (
            <div key={f.id} style={{ position: 'relative' }}>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={f.value}
                onChange={e => handleChange(f.id, e.target.value, f.setter)}
                onBlur={e => handleBlur(f.id, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={inputStyle(f.id)}
              />
              {isValid(f.id) && (
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--teal)', fontSize: 14, pointerEvents: 'none' }}>
                  ✓
                </div>
              )}
              {errors[f.id] && touched[f.id] && (
                <p style={{ color: '#f07090', fontSize: 11.5, marginTop: 5, textAlign: 'left', fontFamily: 'Inter, DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>⚠</span> {errors[f.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={handleSubmit}
        style={{
          padding: '16px 52px',
          borderRadius: 'var(--rs)',
          background: 'linear-gradient(140deg, #e03554 0%, #c22448 100%)',
          color: 'white', border: '1px solid rgba(224,53,84,.25)',
          fontFamily: 'Inter, DM Sans, sans-serif',
          fontSize: 14, fontWeight: 600,
          letterSpacing: '.3px',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(224,53,84,.38), inset 0 1px 0 rgba(255,255,255,.12)',
          transition: 'transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = '0 8px 32px rgba(224,53,84,.48), inset 0 1px 0 rgba(255,255,255,.12)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.transform = ''
          el.style.boxShadow = '0 4px 24px rgba(224,53,84,.38), inset 0 1px 0 rgba(255,255,255,.12)'
        }}
      >
        {clerkUser ? `Comenzar como ${firstName} →` : 'Comenzar evaluación →'}
      </button>

      {/* Section overview pills */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        marginTop: 40, marginBottom: 8,
      }}>
        {[
          { label: '🦈 SharkTank', color: 'rgba(224,53,84,.1)',  border: 'rgba(224,53,84,.18)',  text: '#f07090' },
          { label: '📊 Caso Práctico', color: 'rgba(61,85,232,.1)', border: 'rgba(61,85,232,.18)', text: '#8098f8' },
          { label: '🧮 Taller Math',  color: 'rgba(0,196,158,.1)', border: 'rgba(0,196,158,.18)', text: '#40d8be' },
        ].map(s => (
          <span key={s.label} style={{
            display: 'inline-flex', alignItems: 'center', padding: '5px 12px',
            borderRadius: 100, fontSize: 11, fontWeight: 500,
            fontFamily: 'Inter, DM Sans, sans-serif', letterSpacing: '.2px',
            background: s.color, border: `1px solid ${s.border}`, color: s.text,
          }}>
            {s.label}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, Space Mono, monospace', letterSpacing: '.5px' }}>
        ~25 min · monitoreo activo
      </p>

      {/* Admin link */}
      <Link
        href="/admin"
        style={{
          marginTop: 44,
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 16px', borderRadius: 'var(--rs)',
          background: 'rgba(255,255,255,.03)',
          border: '1px solid var(--border)',
          color: 'var(--muted)', fontSize: 11,
          fontFamily: 'JetBrains Mono, Space Mono, monospace',
          letterSpacing: '.5px', textDecoration: 'none',
          textTransform: 'uppercase', transition: 'all .2s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(255,255,255,.06)'
          el.style.color = 'var(--dim)'
          el.style.borderColor = 'var(--border-mid)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(255,255,255,.03)'
          el.style.color = 'var(--muted)'
          el.style.borderColor = 'var(--border)'
        }}
      >
        <span>⚙</span> Panel Admin
      </Link>
    </div>
  )
}
