'use client'

import { useState, useRef, useCallback } from 'react'

interface Template {
  id: string
  employee_email: string
  employee_name: string | null
  used_at: string | null
  email_sent_at: string | null
  opened_at: string | null
  results_json: {
    mathScorePct?: number
    mathScoreRaw?: number
    mathScoreTotal?: number
    mathTimeSecs?: number
    details?: { idx: number; correct: boolean; got?: string }[]
  } | null
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

// ── Style helpers ─────────────────────────────────────────────────────────────
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
const btnRed: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6, fontSize: 11,
  background: 'rgba(233,69,96,.1)', border: '1px solid rgba(233,69,96,.25)',
  color: 'var(--red)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ t }: { t: Template }) {
  if (t.used_at) {
    const pct = t.results_json?.mathScorePct
    const color = pct === undefined ? 'var(--green)' : pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
    return (
      <span style={{ fontSize: 11, color, fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
        ✓ Completó{pct !== undefined ? ` · ${pct}%` : ''}
      </span>
    )
  }
  if (t.opened_at) {
    return <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>👁 Abrió</span>
  }
  if (t.email_sent_at) {
    return <span style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>✉ Enviado</span>
  }
  return <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>— Pendiente</span>
}

// ── Per-batch send state ──────────────────────────────────────────────────────
type SendState = 'idle' | 'sending' | 'done' | 'error'

export function BatchesClient({ batches: initialBatches }: { batches: Batch[] }) {
  const [batches]                         = useState<Batch[]>(initialBatches)
  const [importing, setImporting]         = useState(false)
  const [importResult, setImportResult]   = useState<{ batchId: string; batchName: string; count: number; inviteLinks: InviteLink[] } | null>(null)
  const [importError, setImportError]     = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [adminSecret, setAdminSecret]     = useState('')
  const [copiedAll, setCopiedAll]         = useState(false)

  // Send email state per batch
  const [sendState, setSendState]   = useState<Record<string, SendState>>({})
  const [sendResult, setSendResult] = useState<Record<string, { sent: number; failed: number }>>({})
  // Resend state per template row
  const [resending, setResending]   = useState<Record<string, boolean>>({})

  const fileRef = useRef<HTMLInputElement>(null)

  // ── Import ────────────────────────────────────────────────────────────────
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

  // ── Send emails for a full batch ─────────────────────────────────────────
  const handleSendBatch = useCallback(async (batchId: string) => {
    if (!adminSecret) {
      alert('Ingresa tu Admin Secret primero (en el panel de importación arriba).')
      return
    }
    setSendState(s => ({ ...s, [batchId]: 'sending' }))
    try {
      const res = await fetch('/api/batch-send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ batchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setSendResult(s => ({ ...s, [batchId]: { sent: data.sent, failed: data.failed } }))
      setSendState(s => ({ ...s, [batchId]: 'done' }))
      // Reload so email_sent_at columns refresh
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      console.error('[BatchesClient] sendBatch error:', e)
      setSendState(s => ({ ...s, [batchId]: 'error' }))
    }
  }, [adminSecret])

  // ── Resend to a single employee ───────────────────────────────────────────
  const handleResend = useCallback(async (templateId: string) => {
    if (!adminSecret) {
      alert('Ingresa tu Admin Secret primero.')
      return
    }
    setResending(s => ({ ...s, [templateId]: true }))
    try {
      const res = await fetch('/api/batch-send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ templateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      alert(`Email reenviado ✓ (${data.sent === 1 ? 'exitoso' : 'falló'})`)
    } catch (e) {
      alert(`Error al reenviar: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setResending(s => ({ ...s, [templateId]: false }))
    }
  }, [adminSecret])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── IMPORT PANEL ────────────────────────────────────────────────────── */}
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

      {/* ── EXISTING BATCHES ────────────────────────────────────────────────── */}
      {batches.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 14 }}>
            📦 Lotes existentes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {batches.map(batch => {
              const total     = batch.personalized_templates?.length ?? 0
              const completed = batch.personalized_templates?.filter(t => t.used_at).length ?? 0
              const sent      = batch.personalized_templates?.filter(t => t.email_sent_at).length ?? 0
              const opened    = batch.personalized_templates?.filter(t => t.opened_at && !t.used_at).length ?? 0
              const isOpen    = selectedBatch?.id === batch.id
              const bSend     = sendState[batch.id] ?? 'idle'
              const bResult   = sendResult[batch.id]

              // Average score of completed rows
              const completedRows = batch.personalized_templates?.filter(t => t.used_at && t.results_json?.mathScorePct !== undefined) ?? []
              const avgScore = completedRows.length > 0
                ? Math.round(completedRows.reduce((s, t) => s + (t.results_json?.mathScorePct ?? 0), 0) / completedRows.length)
                : null

              return (
                <div key={batch.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>

                  {/* Batch header */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 14, flexWrap: 'wrap' }}>
                    {/* Left: name + date — clickable to expand */}
                    <div
                      onClick={() => setSelectedBatch(isOpen ? null : batch)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', minWidth: 200 }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>
                        {batch.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono, monospace' }}>
                        {new Date(batch.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
                        ✓ {completed}/{total} completos
                      </span>
                      {avgScore !== null && (
                        <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
                          ⌀ {avgScore}%
                        </span>
                      )}
                      {sent > 0 && sent < total && (
                        <span style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
                          ✉ {sent}/{total} enviados
                        </span>
                      )}
                      {sent === total && total > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
                          ✉ todos enviados
                        </span>
                      )}
                      {opened > 0 && (
                        <span style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
                          👁 {opened} abrieron
                        </span>
                      )}
                    </div>

                    {/* Send emails button + expand toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {bSend === 'done' && bResult && (
                        <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
                          ✓ {bResult.sent} enviados
                          {bResult.failed > 0 && <span style={{ color: 'var(--red)' }}> · {bResult.failed} fallaron</span>}
                        </span>
                      )}
                      {bSend === 'error' && (
                        <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'Space Mono, monospace' }}>Error al enviar</span>
                      )}
                      <button
                        disabled={bSend === 'sending'}
                        onClick={() => handleSendBatch(batch.id)}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: bSend === 'done' ? 'rgba(0,214,138,.08)' : 'rgba(61,85,232,.12)',
                          border: bSend === 'done' ? '1px solid rgba(0,214,138,.2)' : '1px solid rgba(61,85,232,.3)',
                          color: bSend === 'done' ? 'var(--green)' : 'var(--blue)',
                          cursor: bSend === 'sending' ? 'wait' : 'pointer',
                          fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
                          opacity: bSend === 'sending' ? .6 : 1,
                        }}
                      >
                        {bSend === 'sending' ? '⏳ Enviando...' : bSend === 'done' ? '✓ Emails enviados' : '✉ Enviar emails'}
                      </button>

                      <button
                        onClick={() => setSelectedBatch(isOpen ? null : batch)}
                        style={{ ...btnGhost, padding: '7px 10px', fontSize: 13 }}
                      >
                        {isOpen ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded employee list + results */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 600, overflowY: 'auto' }}>

                      {/* Column header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 10px 8px', fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,.05)', marginBottom: 4 }}>
                        <span style={{ width: 12 }} />
                        <span style={{ minWidth: 180 }}>Nombre</span>
                        <span style={{ minWidth: 220 }}>Email</span>
                        <span style={{ minWidth: 130 }}>Estado</span>
                        <span style={{ marginLeft: 'auto' }}>Acción</span>
                      </div>

                      {batch.personalized_templates?.map(t => (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '7px 10px', borderRadius: 8,
                            background: t.used_at
                              ? 'rgba(0,214,138,.04)'
                              : t.opened_at ? 'rgba(245,158,11,.04)' : 'rgba(255,255,255,.02)',
                            fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {/* Status dot */}
                          <span style={{
                            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                            background: t.used_at ? 'var(--green)'
                              : t.opened_at ? '#f59e0b'
                              : t.email_sent_at ? 'var(--blue)'
                              : 'rgba(255,255,255,.15)',
                          }} />
                          <span style={{ color: 'var(--text)', minWidth: 180 }}>{t.employee_name ?? '—'}</span>
                          <span style={{ color: 'var(--muted)', minWidth: 220, fontSize: 11 }}>{t.employee_email}</span>
                          <span style={{ minWidth: 130 }}><StatusBadge t={t} /></span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                            {!t.used_at && (
                              <button
                                disabled={!!resending[t.id]}
                                onClick={() => handleResend(t.id)}
                                style={{ ...btnRed, opacity: resending[t.id] ? .5 : 1 }}
                              >
                                {resending[t.id] ? '⏳' : '↩ Reenviar'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Results breakdown table */}
                      {completed > 0 && (
                        <ResultsTable templates={batch.personalized_templates} />
                      )}
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

// ── Results table shown at the bottom of an expanded batch ───────────────────
function ResultsTable({ templates }: { templates: Template[] }) {
  const completed = templates.filter(t => t.used_at && t.results_json)
  if (completed.length === 0) return null

  const numQuestions = completed[0]?.results_json?.details?.length ?? 0
  const qLabels = Array.from({ length: numQuestions }, (_, i) => `Q${i + 1}`)

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12 }}>
        📊 Resultados por pregunta
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                Empleado
              </th>
              <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                Score
              </th>
              {qLabels.map(q => (
                <th key={q} style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', minWidth: 36 }}>
                  {q}
                </th>
              ))}
              <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                Tiempo
              </th>
            </tr>
          </thead>
          <tbody>
            {completed
              .sort((a, b) => (b.results_json?.mathScorePct ?? 0) - (a.results_json?.mathScorePct ?? 0))
              .map(t => {
                const pct      = t.results_json?.mathScorePct ?? 0
                const details  = t.results_json?.details ?? []
                const timeSecs = t.results_json?.mathTimeSecs
                const scoreColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'

                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <td style={{ padding: '7px 8px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {t.employee_name ?? t.employee_email.split('@')[0]}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: scoreColor, fontFamily: 'Space Mono, monospace' }}>
                      {pct}%
                    </td>
                    {qLabels.map((_, i) => {
                      const d = details[i]
                      return (
                        <td key={i} style={{ padding: '7px 8px', textAlign: 'center' }}>
                          {d === undefined
                            ? <span style={{ color: 'var(--muted)' }}>—</span>
                            : d.correct
                              ? <span style={{ color: '#22c55e', fontSize: 13 }}>✓</span>
                              : <span style={{ color: '#ef4444', fontSize: 13 }}>✗</span>
                          }
                        </td>
                      )
                    })}
                    <td style={{ padding: '7px 8px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'Space Mono, monospace', whiteSpace: 'nowrap' }}>
                      {timeSecs !== undefined && timeSecs !== null
                        ? `${Math.floor(timeSecs / 60)}:${String(timeSecs % 60).padStart(2, '0')}`
                        : '—'}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
