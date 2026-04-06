'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { CohortMember } from '@/types/assessment'

type CaseSummary = { id: string; title: string; difficulty: string }

const difficultyColor = (d: string | null) => {
  if (!d) return 'var(--muted)'
  if (d === 'Baja')       return '#00d68a'
  if (d === 'Baja-Media') return 'var(--teal)'
  if (d === 'Media')      return 'var(--gold)'
  if (d === 'Media-Alta') return '#f59e0b'
  if (d === 'Alta')       return 'var(--red)'
  return '#8b5cf6'
}

export function MembersPanel({
  cohortId,
  members,
  cases,
}: {
  cohortId: string
  members: (CohortMember & { caso_title?: string | null; caso_difficulty?: string | null })[]
  cases: CaseSummary[]
}) {
  const [list, setList] = useState(members)
  const [singleEmail, setSingleEmail] = useState('')
  const [bulkEmails, setBulkEmails]   = useState('')
  const [mode, setMode]               = useState<'single' | 'bulk' | null>(null)
  const [saving, setSaving]           = useState(false)
  const [flash, setFlash]             = useState<string | null>(null)
  const [sending, setSending]         = useState<string | null>(null) // email being sent, or 'all'
  const router = useRouter()

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }

  const addSingle = async () => {
    const email = singleEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { showFlash('Email inválido'); return }
    if (list.some(m => m.email === email)) { showFlash('Ya existe en la cohorte'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('cohort_members')
        .insert({ cohort_id: cohortId, email, join_method: 'manual' })
        .select('*')
        .single()
      if (error) throw error
      setList(prev => [{ ...data, caso_title: null, caso_difficulty: null }, ...prev])
      setSingleEmail('')
      setMode(null)
      showFlash('Candidato agregado')
    } catch (e) {
      showFlash(e instanceof Error ? e.message : 'Error al agregar')
    } finally {
      setSaving(false)
    }
  }

  const addBulk = async () => {
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'))
    if (emails.length === 0) { showFlash('No se encontraron emails válidos'); return }
    const newEmails = emails.filter(e => !list.some(m => m.email === e))
    if (newEmails.length === 0) { showFlash('Todos los emails ya están en la cohorte'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const rows = newEmails.map(email => ({ cohort_id: cohortId, email, join_method: 'manual' }))
      const { data, error } = await supabase
        .from('cohort_members')
        .insert(rows)
        .select('*')
      if (error) throw error
      const enriched = (data ?? []).map(m => ({ ...m, caso_title: null, caso_difficulty: null }))
      setList(prev => [...enriched, ...prev])
      setBulkEmails('')
      setMode(null)
      showFlash(`${newEmails.length} candidato${newEmails.length !== 1 ? 's' : ''} agregado${newEmails.length !== 1 ? 's' : ''}`)
    } catch (e) {
      showFlash(e instanceof Error ? e.message : 'Error al agregar')
    } finally {
      setSaving(false)
    }
  }

  const sendInvite = async (emails: string[]) => {
    const key = emails.length === 1 ? emails[0] : 'all'
    setSending(key)
    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId, emails }),
      })
      const data = await res.json() as { sent: number; failed: number }
      if (!res.ok) throw new Error('Error del servidor')
      showFlash(
        data.failed === 0
          ? `✓ ${data.sent} invitación${data.sent !== 1 ? 'es' : ''} enviada${data.sent !== 1 ? 's' : ''}`
          : `${data.sent} enviadas, ${data.failed} fallaron`
      )
    } catch (e) {
      showFlash(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setSending(null)
    }
  }

  const removeMember = async (memberId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('cohort_members').delete().eq('id', memberId)
      if (error) throw error
      setList(prev => prev.filter(m => m.id !== memberId))
    } catch {
      showFlash('Error al eliminar')
    }
  }

  const reassignCase = async (memberId: string, casoId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('cohort_members')
        .update({ assigned_caso_id: casoId || null })
        .eq('id', memberId)
      if (error) throw error
      const caseData = cases.find(c => c.id === casoId)
      setList(prev => prev.map(m => m.id === memberId
        ? { ...m, assigned_caso_id: casoId || null, caso_title: caseData?.title ?? null, caso_difficulty: caseData?.difficulty ?? null }
        : m
      ))
    } catch {
      showFlash('Error al reasignar')
    }
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
          Candidatos
          <span style={{
            marginLeft: 8, fontSize: 11, fontFamily: 'JetBrains Mono, Space Mono, monospace',
            padding: '2px 8px', borderRadius: 100,
            background: 'rgba(61,85,232,.1)', color: '#8098f8',
            border: '1px solid rgba(61,85,232,.15)',
          }}>
            {list.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {list.length > 0 && (
            <button
              onClick={() => sendInvite(list.map(m => m.email))}
              disabled={sending === 'all'}
              title="Enviar invitación a todos"
              style={{
                padding: '5px 12px', fontSize: 11.5,
                fontFamily: 'Inter, DM Sans, sans-serif',
                background: 'rgba(0,214,138,.08)',
                border: '1px solid rgba(0,214,138,.2)',
                color: '#00d68a',
                borderRadius: 7, cursor: sending === 'all' ? 'not-allowed' : 'pointer',
                opacity: sending === 'all' ? 0.6 : 1,
              }}
            >
              {sending === 'all' ? 'Enviando...' : '✉ Todos'}
            </button>
          )}
          <button
            onClick={() => setMode(mode === 'single' ? null : 'single')}
            style={{
              padding: '5px 12px', fontSize: 11.5,
              fontFamily: 'Inter, DM Sans, sans-serif',
              background: mode === 'single' ? 'rgba(61,85,232,.1)' : 'transparent',
              border: `1px solid ${mode === 'single' ? 'rgba(61,85,232,.3)' : 'var(--border)'}`,
              color: mode === 'single' ? '#8098f8' : 'var(--dim)',
              borderRadius: 7, cursor: 'pointer',
            }}
          >
            + Email
          </button>
          <button
            onClick={() => setMode(mode === 'bulk' ? null : 'bulk')}
            style={{
              padding: '5px 12px', fontSize: 11.5,
              fontFamily: 'Inter, DM Sans, sans-serif',
              background: mode === 'bulk' ? 'rgba(61,85,232,.1)' : 'transparent',
              border: `1px solid ${mode === 'bulk' ? 'rgba(61,85,232,.3)' : 'var(--border)'}`,
              color: mode === 'bulk' ? '#8098f8' : 'var(--dim)',
              borderRadius: 7, cursor: 'pointer',
            }}
          >
            + Bulk
          </button>
        </div>
      </div>

      {/* Add single */}
      {mode === 'single' && (
        <div style={{ marginBottom: 14, display: 'flex', gap: 8 }}>
          <input
            value={singleEmail}
            onChange={e => setSingleEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            onKeyDown={e => e.key === 'Enter' && addSingle()}
            style={{
              flex: 1, padding: '8px 12px',
              background: 'var(--input)', border: '1px solid var(--border-mid)',
              borderRadius: 7, color: 'var(--text)',
              fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={addSingle} disabled={saving}
            style={{
              padding: '8px 14px', background: 'var(--blue)',
              color: '#fff', border: 'none', borderRadius: 7,
              fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 12.5,
              cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
            }}
          >
            {saving ? '...' : 'Agregar'}
          </button>
        </div>
      )}

      {/* Bulk add */}
      {mode === 'bulk' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Inter, DM Sans, sans-serif', marginBottom: 6 }}>
            Pega emails separados por coma, punto y coma o salto de línea
          </div>
          <textarea
            value={bulkEmails}
            onChange={e => setBulkEmails(e.target.value)}
            placeholder={'email1@r.com\nemail2@r.com\nemail3@r.com'}
            style={{
              width: '100%', height: 80, padding: '8px 12px',
              background: 'var(--input)', border: '1px solid var(--border-mid)',
              borderRadius: 7, color: 'var(--text)',
              fontFamily: 'JetBrains Mono, Space Mono, monospace', fontSize: 12,
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={addBulk} disabled={saving}
            style={{
              marginTop: 7, padding: '8px 14px', background: 'var(--blue)',
              color: '#fff', border: 'none', borderRadius: 7,
              fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 12.5,
              cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
            }}
          >
            {saving ? 'Agregando...' : 'Agregar todos'}
          </button>
        </div>
      )}

      {/* Flash */}
      {flash && (
        <div style={{
          fontSize: 12, padding: '7px 12px', borderRadius: 7, marginBottom: 10,
          background: flash.includes('Error') || flash.includes('inválid') || flash.includes('Ya existe')
            ? 'rgba(224,53,84,.08)' : 'rgba(0,214,138,.08)',
          color: flash.includes('Error') || flash.includes('inválid') || flash.includes('Ya existe')
            ? 'var(--red)' : '#00d68a',
          border: `1px solid ${flash.includes('Error') || flash.includes('inválid') || flash.includes('Ya existe') ? 'rgba(224,53,84,.2)' : 'rgba(0,214,138,.2)'}`,
          fontFamily: 'Inter, DM Sans, sans-serif',
        }}>
          {flash}
        </div>
      )}

      {/* Empty state */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--muted)', fontSize: 13, fontFamily: 'Inter, DM Sans, sans-serif' }}>
          Sin candidatos. Agrega emails o comparte el link de invitación.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto auto',
            gap: 8, padding: '6px 4px',
            fontSize: 9.5, fontFamily: 'JetBrains Mono, Space Mono, monospace',
            textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)',
            borderBottom: '1px solid var(--border)', marginBottom: 4,
          }}>
            <span>Email</span>
            <span style={{ textAlign: 'center', minWidth: 90 }}>Caso</span>
            <span style={{ minWidth: 36 }}></span>
            <span style={{ minWidth: 24 }}></span>
          </div>
          {list.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                gap: 8, padding: '9px 4px', alignItems: 'center',
                borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
              }}
            >
              {/* Email + meta */}
              <div>
                <div style={{ fontSize: 12.5, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)', marginBottom: 2 }}>
                  {m.email}
                </div>
                <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--muted)' }}>
                  {m.join_method === 'link' ? '🔗 link' : '✋ manual'}
                  {m.first_accessed_at ? ` · ${new Date(m.first_accessed_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : ' · sin acceso'}
                </div>
              </div>

              {/* Case selector */}
              <div style={{ minWidth: 90 }}>
                {m.assigned_caso_id ? (
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                      color: difficultyColor(m.caso_difficulty ?? null),
                      display: 'block', maxWidth: 130, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      cursor: 'default',
                    }}
                    title={m.caso_title ?? m.assigned_caso_id}
                    >
                      {m.caso_title ?? '—'}
                    </span>
                    <select
                      value={m.assigned_caso_id}
                      onChange={e => reassignCase(m.id, e.target.value)}
                      style={{
                        position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%',
                      }}
                    >
                      <option value="">— Sin caso —</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={e => reassignCase(m.id, e.target.value)}
                    style={{
                      padding: '3px 7px', fontSize: 10.5,
                      background: 'var(--input)', border: '1px solid var(--border)',
                      borderRadius: 6, color: 'var(--muted)',
                      fontFamily: 'Inter, DM Sans, sans-serif', cursor: 'pointer',
                    }}
                  >
                    <option value="">Sin asignar</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Send invite */}
              <button
                onClick={() => sendInvite([m.email])}
                disabled={sending === m.email}
                title="Enviar invitación"
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'transparent', border: '1px solid transparent',
                  color: 'var(--muted)', cursor: sending === m.email ? 'not-allowed' : 'pointer',
                  fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s', opacity: sending === m.email ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (sending !== m.email) {
                    (e.currentTarget).style.color = '#8098f8'
                    ;(e.currentTarget).style.borderColor = 'rgba(61,85,232,.3)'
                    ;(e.currentTarget).style.background = 'rgba(61,85,232,.08)'
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget).style.color = 'var(--muted)'
                  ;(e.currentTarget).style.borderColor = 'transparent'
                  ;(e.currentTarget).style.background = 'transparent'
                }}
              >
                {sending === m.email ? '…' : '✉'}
              </button>

              {/* Remove */}
              <button
                onClick={() => removeMember(m.id)}
                title="Eliminar"
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'transparent', border: '1px solid transparent',
                  color: 'var(--muted)', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget).style.color = 'var(--red)'
                  ;(e.currentTarget).style.borderColor = 'rgba(224,53,84,.3)'
                  ;(e.currentTarget).style.background = 'rgba(224,53,84,.08)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget).style.color = 'var(--muted)'
                  ;(e.currentTarget).style.borderColor = 'transparent'
                  ;(e.currentTarget).style.background = 'transparent'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
