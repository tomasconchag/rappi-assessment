'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member { id: string; email: string; name: string | null; created_at: string }

export function TrainingMembersPanel({ cohortId, cohortName, members, inviteUrl }: {
  cohortId: string; cohortName: string; members: Member[]; inviteUrl: string
}) {
  const router = useRouter()
  const [emailInput, setEmailInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    const emails = emailInput.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
    if (!emails.length) return
    setAdding(true); setError(null)
    try {
      const res = await fetch('/api/training/cohorts/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId, emails }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setEmailInput(''); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setAdding(false)
    }
  }

  const handleSendInvites = async () => {
    const emails = members.map(m => m.email)
    if (!emails.length) return
    setSending(true); setSendResult(null)
    try {
      const res = await fetch('/api/training/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId, emails }),
      })
      const data = await res.json()
      setSendResult(`✅ ${data.sent} enviados${data.failed > 0 ? ` · ⚠️ ${data.failed} fallaron` : ''}`)
    } catch {
      setSendResult('Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Add members */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 14 }}>Agregar Farmers</div>
        <textarea
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          placeholder="correo1@rappi.com, correo2@rappi.com..."
          rows={3}
          style={{ width: '100%', padding: '9px 11px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
        />
        {error && <div style={{ fontSize: 12, color: '#ff6b6b', fontFamily: 'DM Sans', marginBottom: 8 }}>⚠️ {error}</div>}
        <button onClick={handleAdd} disabled={adding || !emailInput.trim()} style={{ width: '100%', marginTop: 8, padding: '9px', borderRadius: 8, background: 'rgba(6,214,160,.1)', border: '1px solid rgba(6,214,160,.25)', color: '#06d6a0', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: adding ? 'default' : 'pointer' }}>
          {adding ? 'Agregando…' : '+ Agregar farmers'}
        </button>
      </div>

      {/* Send invites */}
      {members.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 14 }}>Enviar Invitaciones</div>
          <p style={{ fontSize: 12.5, color: 'var(--dim)', fontFamily: 'DM Sans', marginBottom: 12 }}>
            Enviar training invite a los {members.length} farmer{members.length !== 1 ? 's' : ''} de esta cohorte.
          </p>
          <button onClick={handleSendInvites} disabled={sending} style={{ width: '100%', padding: '9px', borderRadius: 8, background: 'rgba(67,97,238,.1)', border: '1px solid rgba(67,97,238,.25)', color: '#8098f8', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: sending ? 'default' : 'pointer' }}>
            {sending ? '📤 Enviando…' : '📧 Enviar invitaciones'}
          </button>
          {sendResult && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--dim)', fontFamily: 'DM Sans' }}>{sendResult}</div>}
        </div>
      )}

      {/* Member list */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 14 }}>
          {members.length} farmer{members.length !== 1 ? 's' : ''}
        </div>
        {members.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', fontFamily: 'DM Sans' }}>Sin farmers aún.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, background: 'rgba(255,255,255,.02)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(6,214,160,.25), rgba(67,97,238,.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#06d6a0', flexShrink: 0, fontFamily: 'DM Sans' }}>
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {m.name && <div style={{ fontSize: 12.5, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>}
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
