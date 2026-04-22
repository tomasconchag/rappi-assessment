'use client'

import { useState, useRef } from 'react'

interface Template {
  id: string
  employee_email: string
  employee_name: string | null
  used_at: string | null
}

interface Batch {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string | null
  personalized_templates: Template[]
}

interface InviteLink {
  email: string
  name: string
  token: string
  url: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'

export function BatchesClient({ batches: initialBatches }: { batches: Batch[] }) {
  const [batches,       setBatches]       = useState<Batch[]>(initialBatches)
  const [importing,     setImporting]     = useState(false)
  const [importResult,  setImportResult]  = useState<{ batchId: string; batchName: string; count: number; inviteLinks: InviteLink[] } | null>(null)
  const [importError,   setImportError]   = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [adminSecret,   setAdminSecret]   = useState('')
  const [copiedAll,     setCopiedAll]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setImportError('Selecciona un archivo JSON primero.'); return }
    if (!adminSecret) { setImportError('Ingresa el Admin Secret.'); return }

    setImporting(true); setImportError(null); setImportResult(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res  = await fetch('/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify(json),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error ?? `Error ${res.status}`)
      } else {
        setImportResult(data)
        // Refresh batch list
        window.location.reload()
      }
    } catch (e) {
      setImportError(String(e))
    } finally {
      setImporting(false)
    }
  }

  function copyAllLinks(links: InviteLink[]) {
    const text = links.map(l => `${l.name}\t${l.email}\t${l.url}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2500)
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 13,
    background: 'var(--card)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', outline: 'none',
  }
  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: 'rgba(0,214,138,.12)', border: '1px solid rgba(0,214,138,.3)',
    color: 'var(--green)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  }
  const btnGhost: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 8, fontSize: 12,
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── IMPORT PANEL ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '28px 32px',
      }}>
        <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 16 }}>
          📤 Importar nuevo lote
        </div>

        {/* Expected format reminder */}
        <div style={{
          padding: '14px 18px', marginBottom: 20,
          background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)',
          borderRadius: 10, fontSize: 12, color: '#93c5fd',
          fontFamily: 'JetBrains Mono, Space Mono, monospace', lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11 }}>Formato JSON esperado (exporta esto desde tu macro):</div>
          {`{
  "batchName": "Excel Test Abril 2026",
  "configId":  "a5d91660-...",
  "createdBy": "tomas@rappi.com",
  "employees": [
    {
      "email": "ana.garcia@rappi.com",
      "name":  "Ana García",
      "cells": [ ...celdas pre-llenadas... ],
      "answerCells": [
        { "r": 9, "c": 4, "expected": 74000, "questionNum": 1,
          "label": "Pregunta 1", "format": "currency" }
      ]
    }
  ]
}`}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Archivo JSON
            </label>
            <input ref={fileRef} type="file" accept=".json" style={{ ...inputStyle, cursor: 'pointer' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Admin Secret
            </label>
            <input
              type="password" value={adminSecret}
              onChange={e => setAdminSecret(e.target.value)}
              placeholder="ADMIN_SECRET env var"
              style={inputStyle}
            />
          </div>
        </div>

        <button onClick={handleImport} disabled={importing} style={{ ...btnPrimary, opacity: importing ? .6 : 1 }}>
          {importing ? '⏳ Importando...' : '🚀 Importar lote y generar links'}
        </button>

        {importError && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, fontSize: 12, color: '#f87171', fontFamily: 'DM Sans, sans-serif' }}>
            ⚠ {importError}
          </div>
        )}

        {importResult && (
          <div style={{ marginTop: 20, padding: '18px 20px', background: 'rgba(0,214,138,.06)', border: '1px solid rgba(0,214,138,.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, marginBottom: 12 }}>
              ✅ Lote creado: {importResult.batchName} ({importResult.count} links)
            </div>
            <button onClick={() => copyAllLinks(importResult.inviteLinks)} style={{ ...btnGhost, color: copiedAll ? 'var(--green)' : 'var(--muted)', borderColor: copiedAll ? 'rgba(0,214,138,.3)' : 'var(--border)', marginBottom: 12 }}>
              {copiedAll ? '✓ Copiado!' : '📋 Copiar todos (Nombre / Email / URL)'}
            </button>
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {importResult.inviteLinks.map(l => (
                <div key={l.email} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontFamily: 'DM Sans, sans-serif', padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--text)', minWidth: 160 }}>{l.name}</span>
                  <span style={{ color: 'var(--muted)', minWidth: 220 }}>{l.email}</span>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', fontFamily: 'Space Mono, monospace', fontSize: 10, wordBreak: 'break-all' }}>
                    {l.url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── EXISTING BATCHES ──────────────────────────────────────────────── */}
      {batches.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 14 }}>
            📦 Lotes existentes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {batches.map(batch => {
              const total    = batch.personalized_templates?.length ?? 0
              const used     = batch.personalized_templates?.filter(t => t.used_at).length ?? 0
              const pending  = total - used
              const isOpen   = selectedBatch?.id === batch.id

              return (
                <div key={batch.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Batch header row */}
                  <div
                    onClick={() => setSelectedBatch(isOpen ? null : batch)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>
                        {batch.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono, monospace' }}>
                        {new Date(batch.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'Space Mono, monospace' }}>
                        ✓ {used}/{total} completados
                      </span>
                      {pending > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'Space Mono, monospace' }}>
                          ⏳ {pending} pendientes
                        </span>
                      )}
                      <span style={{ color: 'var(--muted)', fontSize: 14 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded list */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
                      {batch.personalized_templates?.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', borderRadius: 8, background: t.used_at ? 'rgba(0,214,138,.04)' : 'rgba(255,255,255,.02)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.used_at ? 'var(--green)' : 'rgba(255,255,255,.15)', flexShrink: 0 }} />
                          <span style={{ color: 'var(--text)', minWidth: 180 }}>{t.employee_name ?? '—'}</span>
                          <span style={{ color: 'var(--muted)', minWidth: 220 }}>{t.employee_email}</span>
                          <span style={{ color: t.used_at ? 'var(--green)' : 'var(--muted)', fontSize: 11 }}>
                            {t.used_at
                              ? `✓ ${new Date(t.used_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                              : 'Pendiente'}
                          </span>
                          <a
                            href={`${APP_URL}/assessment?t=`}
                            style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--blue)', fontFamily: 'Space Mono, monospace' }}
                            title="Ver en assessment (token no disponible en esta vista)"
                          >
                            /assessment?t=…
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {batches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
          No hay lotes aún. Importa tu primer archivo JSON arriba.
        </div>
      )}
    </div>
  )
}
