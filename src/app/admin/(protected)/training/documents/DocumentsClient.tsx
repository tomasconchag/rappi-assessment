'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface TrainingDoc {
  id: string
  name: string
  file_size: number | null
  created_at: string
}

export function DocumentsClient({ docs }: { docs: TrainingDoc[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.txt')) { setError('Solo se permiten archivos .txt'); return }
    if (file.size > 500_000) { setError('El archivo no puede superar 500 KB'); return }

    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/training/documents', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al subir')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/training/documents?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  const fmtSize = (b: number | null) => {
    if (!b) return '—'
    if (b < 1024) return `${b} B`
    return `${(b / 1024).toFixed(1)} KB`
  }

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Upload card */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '24px 28px', marginBottom: 28,
      }}>
        <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 14 }}>
          Subir nuevo documento
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 9, cursor: uploading ? 'default' : 'pointer',
            background: uploading ? 'rgba(255,255,255,.04)' : 'rgba(245,158,11,.1)',
            border: `1px solid ${uploading ? 'var(--border)' : 'rgba(245,158,11,.3)'}`,
            color: uploading ? 'var(--muted)' : '#f59e0b',
            fontFamily: 'DM Sans', fontSize: 13.5, fontWeight: 600,
            transition: 'all .15s',
          }}>
            {uploading ? '⏳ Subiendo…' : '📤 Elegir archivo .txt'}
            <input
              ref={fileRef}
              type="file"
              accept=".txt"
              style={{ display: 'none' }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans' }}>
            Máx. 500 KB · solo .txt
          </span>
        </div>
        {error && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: '#ff6b6b', fontFamily: 'DM Sans' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
            Sin documentos aún
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans' }}>
            Sube tu primer .txt para alimentar al agente de training.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)' }}>
              {docs.length} documento{docs.length !== 1 ? 's' : ''}
            </span>
          </div>
          {docs.map((doc, i) => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 20px',
              borderBottom: i < docs.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono, monospace', marginTop: 2 }}>
                  {fmtSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('es-CO')}
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id, doc.name)}
                disabled={deleting === doc.id}
                style={{
                  padding: '6px 12px', borderRadius: 7, fontSize: 11.5,
                  background: 'transparent', border: '1px solid rgba(255,107,107,.2)',
                  color: deleting === doc.id ? 'var(--muted)' : '#ff6b6b',
                  fontFamily: 'DM Sans', cursor: deleting === doc.id ? 'default' : 'pointer',
                  transition: 'all .15s',
                }}
              >
                {deleting === doc.id ? '⏳' : '🗑 Eliminar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
