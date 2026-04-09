'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  submissionId: string
  candidateId: string
  candidateName: string
}

export function CandidateActions({ submissionId, candidateId, candidateName }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/candidates/${candidateId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al borrar')
      setLoading(false)
      return
    }
    router.push('/admin/candidates')
    router.refresh()
  }

  const handleReset = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/submissions/${submissionId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Error al resetear')
      setLoading(false)
      return
    }
    router.push('/admin/candidates')
    router.refresh()
  }

  return (
    <>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setConfirm('reset')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 16px',
            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 8, color: '#f59e0b',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔄 Resetear assessment
        </button>
        <button
          onClick={() => setConfirm('delete')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 16px',
            background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.3)',
            borderRadius: 8, color: '#ff6b6b',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🗑 Borrar candidato
        </button>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '32px 36px', maxWidth: 420, width: '90%',
          }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
              {confirm === 'delete' ? '🗑 Borrar candidato' : '🔄 Resetear assessment'}
            </div>
            <p style={{ fontSize: 14, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, marginBottom: 24 }}>
              {confirm === 'delete'
                ? <>¿Seguro que quieres borrar a <strong style={{ color: 'var(--text)' }}>{candidateName}</strong> y todo su historial? Esta acción no se puede deshacer.</>
                : <>¿Seguro que quieres resetear el assessment de <strong style={{ color: 'var(--text)' }}>{candidateName}</strong>? Se borrarán sus respuestas y podrá volver a hacerlo.</>
              }
            </p>

            {error && (
              <div style={{ fontSize: 12, color: '#ff6b6b', fontFamily: 'DM Sans, sans-serif', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setConfirm(null); setError(null) }}
                disabled={loading}
                style={{
                  padding: '9px 20px', background: 'var(--input)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirm === 'delete' ? handleDelete : handleReset}
                disabled={loading}
                style={{
                  padding: '9px 20px',
                  background: confirm === 'delete' ? 'rgba(255,107,107,.2)' : 'rgba(245,158,11,.2)',
                  border: `1px solid ${confirm === 'delete' ? 'rgba(255,107,107,.5)' : 'rgba(245,158,11,.5)'}`,
                  borderRadius: 8,
                  color: confirm === 'delete' ? '#ff6b6b' : '#f59e0b',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Procesando...' : confirm === 'delete' ? 'Sí, borrar' : 'Sí, resetear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
