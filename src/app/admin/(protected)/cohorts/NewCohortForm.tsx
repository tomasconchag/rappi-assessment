'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function NewCohortForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('cohorts')
        .insert({ name: name.trim(), description: description.trim() })
        .select('id')
        .single()
      if (err) throw err
      router.push(`/admin/cohorts/${data.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear')
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '11px 22px',
          background: 'linear-gradient(140deg, rgba(61,85,232,1), rgba(40,65,200,1))',
          color: '#fff', border: 'none', borderRadius: 9,
          fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
          cursor: 'pointer', letterSpacing: '.2px',
          boxShadow: '0 4px 16px rgba(61,85,232,.3)',
        }}
      >
        + Nueva cohorte
      </button>
    )
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid rgba(61,85,232,.25)',
      borderRadius: 12,
      padding: '22px 24px',
      boxShadow: '0 0 0 3px rgba(61,85,232,.06)',
    }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
        Nueva cohorte
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: 6 }}>
            Nombre *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej. Farmers Batch Abril 2026"
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--input)', border: '1px solid var(--border-mid)',
              borderRadius: 8, color: 'var(--text)',
              fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: 6 }}>
            Descripción
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Opcional — ej. Proceso Q2 Medellín"
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--input)', border: '1px solid var(--border-mid)',
              borderRadius: 8, color: 'var(--text)',
              fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12, fontFamily: 'Inter, DM Sans, sans-serif' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleCreate}
          disabled={saving}
          style={{
            padding: '10px 22px',
            background: 'linear-gradient(140deg, rgba(61,85,232,1), rgba(40,65,200,1))',
            color: '#fff', border: 'none', borderRadius: 8,
            fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Creando...' : 'Crear cohorte'}
        </button>
        <button
          onClick={() => { setOpen(false); setName(''); setDescription(''); setError(null) }}
          style={{
            padding: '10px 18px', background: 'transparent',
            color: 'var(--muted)', border: '1px solid var(--border)',
            borderRadius: 8, fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
