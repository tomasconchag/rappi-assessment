'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewTrainingCohortForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/training/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear')
      setName(''); setDescription(''); setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 9,
        background: 'rgba(6,214,160,.1)', border: '1px solid rgba(6,214,160,.3)',
        color: '#06d6a0', fontFamily: 'DM Sans', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
      }}
    >
      + Nueva cohorte training
    </button>
  )

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 16 }}>Nueva cohorte training</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Nombre (ej: Comunicación Efectiva — Mayo 2026)"
          required
          style={{ flex: 2, minWidth: 200, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
        />
        <input
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          style={{ flex: 3, minWidth: 200, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none' }}
        />
      </div>
      {error && <div style={{ fontSize: 12, color: '#ff6b6b', fontFamily: 'DM Sans', marginBottom: 10 }}>⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={loading || !name.trim()} style={{ padding: '9px 20px', borderRadius: 8, background: 'rgba(6,214,160,.12)', border: '1px solid rgba(6,214,160,.3)', color: '#06d6a0', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'Creando…' : 'Crear cohorte'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: '9px 16px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
