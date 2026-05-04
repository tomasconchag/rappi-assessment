'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Doc { id: string; name: string; file_size: number | null }
interface Cohort { id: string; name: string; description: string | null; is_active: boolean; ends_at: string | null; doc_ids: string[] | null }

export function TrainingCohortEditor({ cohort, allDocs }: { cohort: Cohort; allDocs: Doc[] }) {
  const router = useRouter()
  const [name, setName] = useState(cohort.name)
  const [description, setDescription] = useState(cohort.description ?? '')
  const [isActive, setIsActive] = useState(cohort.is_active)
  const [endsAt, setEndsAt] = useState(cohort.ends_at ? cohort.ends_at.slice(0, 16) : '')
  const [selectedDocs, setSelectedDocs] = useState<string[]>(cohort.doc_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev  // max 3
      return [...prev, id]
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/training/cohorts/${cohort.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, is_active: isActive, ends_at: endsAt || null, doc_ids: selectedDocs }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Config */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 16 }}>Configuración</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', display: 'block', marginBottom: 5 }}>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px 11px', borderRadius: 7, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', display: 'block', marginBottom: 5 }}>Descripción</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '8px 11px', borderRadius: 7, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', display: 'block', marginBottom: 5 }}>Fecha límite (opcional)</label>
          <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={{ width: '100%', padding: '8px 11px', borderRadius: 7, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
          <div onClick={() => setIsActive(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: isActive ? 'rgba(6,214,160,.4)' : 'rgba(255,255,255,.1)', border: `1px solid ${isActive ? 'rgba(6,214,160,.6)' : 'var(--border)'}`, position: 'relative', transition: 'all .2s', cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 2, left: isActive ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: isActive ? '#06d6a0' : 'var(--muted)', transition: 'left .2s' }} />
          </div>
          <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--dim)' }}>Cohorte activa</span>
        </label>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '9px', borderRadius: 8, background: saved ? 'rgba(6,214,160,.15)' : 'rgba(67,97,238,.12)', border: `1px solid ${saved ? 'rgba(6,214,160,.3)' : 'rgba(67,97,238,.3)'}`, color: saved ? '#06d6a0' : '#8098f8', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 13, cursor: saving ? 'default' : 'pointer' }}>
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>

      {/* Document selector */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)' }}>Documentos</div>
          <span style={{ fontSize: 10.5, fontFamily: 'Space Mono, monospace', color: selectedDocs.length >= 3 ? '#f59e0b' : 'var(--muted)' }}>{selectedDocs.length}/3</span>
        </div>

        {allDocs.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', fontFamily: 'DM Sans' }}>No hay documentos. <a href="/admin/training/documents" style={{ color: '#f59e0b', textDecoration: 'none' }}>Subir →</a></p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allDocs.map(doc => {
              const checked = selectedDocs.includes(doc.id)
              const disabled = !checked && selectedDocs.length >= 3
              return (
                <button key={doc.id} onClick={() => !disabled && toggleDoc(doc.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
                  background: checked ? 'rgba(245,158,11,.08)' : 'rgba(255,255,255,.02)',
                  border: `1px solid ${checked ? 'rgba(245,158,11,.3)' : 'var(--border)'}`,
                  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, textAlign: 'left',
                }}>
                  <span style={{ width: 15, height: 15, borderRadius: 3, border: `1.5px solid ${checked ? '#f59e0b' : 'var(--border)'}`, background: checked ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>
                    {checked ? '✓' : ''}
                  </span>
                  <span style={{ fontFamily: 'DM Sans', fontSize: 13, color: checked ? '#f59e0b' : 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{doc.name}</span>
                </button>
              )
            })}
            {selectedDocs.length > 0 && (
              <button onClick={handleSave} disabled={saving} style={{ marginTop: 4, padding: '8px', borderRadius: 8, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', color: '#f59e0b', fontFamily: 'DM Sans', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
                {saving ? 'Guardando…' : '💾 Guardar selección'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
