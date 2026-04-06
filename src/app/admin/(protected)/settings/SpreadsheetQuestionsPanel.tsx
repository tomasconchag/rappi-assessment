'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { QuestionSummary } from '@/lib/mathSpreadsheetTemplates'

interface Props {
  configId: string
  questionsA: QuestionSummary[]
  questionsB: QuestionSummary[]
  initialOverrides: Record<string, string>
}

export function SpreadsheetQuestionsPanel({ configId, questionsA, questionsB, initialOverrides }: Props) {
  const [preview, setPreview] = useState<'A' | 'B'>('A')
  const [overrides, setOverrides] = useState<Record<string, string>>(initialOverrides)
  const [editing, setEditing] = useState<string | null>(null)   // key like "A_1"
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const questions = preview === 'A' ? questionsA : questionsB
  const color = preview === 'A' ? 'var(--blue)' : 'var(--teal)'
  const colorAlpha = preview === 'A' ? 'rgba(67,97,238,.15)' : 'rgba(0,196,158,.15)'

  const overrideKey = (v: 'A' | 'B', num: number) => `${v}_${num}`

  const startEdit = (v: 'A' | 'B', q: QuestionSummary) => {
    const key = overrideKey(v, q.num)
    setEditing(key)
    setEditText(overrides[key] ?? q.text)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditText('')
  }

  const saveEdit = async (key: string) => {
    setSaving(true)
    const supabase = createClient()
    const newOverrides = { ...overrides, [key]: editText }
    const { error } = await supabase
      .from('assessment_configs')
      .update({ spreadsheet_q_overrides: newOverrides })
      .eq('id', configId)

    if (!error) {
      setOverrides(newOverrides)
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 2000)
    }
    setEditing(null)
    setEditText('')
    setSaving(false)
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,.025)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 16,
    }}>
      {/* Tab header */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['A', 'B'] as const).map(v => (
          <button
            key={v}
            onClick={() => setPreview(v)}
            style={{
              flex: 1,
              padding: '11px 16px',
              background: preview === v ? 'rgba(255,255,255,.04)' : 'transparent',
              border: 'none',
              borderBottom: preview === v
                ? `2px solid ${v === 'A' ? 'var(--blue)' : 'var(--teal)'}`
                : '2px solid transparent',
              color: preview === v ? 'var(--text)' : 'var(--muted)',
              fontFamily: 'Space Mono, monospace',
              fontSize: 11,
              textTransform: 'uppercase' as const,
              letterSpacing: '1.5px',
              cursor: 'pointer',
              transition: 'all .15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: v === 'A' ? 'var(--blue)' : 'var(--teal)', fontWeight: 700 }}>
              Versión {v}
            </span>
            <span style={{
              padding: '1px 6px',
              borderRadius: 100,
              fontSize: 9,
              background: v === 'A' ? 'rgba(67,97,238,.15)' : 'rgba(0,196,158,.15)',
              color: v === 'A' ? 'var(--blue)' : 'var(--teal)',
            }}>
              9 preguntas
            </span>
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto' }}>
        {questions.map(q => {
          const key = overrideKey(preview, q.num)
          const displayText = overrides[key] ?? q.text
          const isEditing = editing === key
          const justSaved = savedKey === key

          return (
            <div
              key={q.num}
              style={{
                padding: '14px 16px',
                borderRadius: 9,
                background: 'rgba(255,255,255,.02)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {/* Number badge */}
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: colorAlpha,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {q.num}
                </span>

                {/* Topic pill */}
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 100,
                  fontSize: 9.5,
                  background: 'rgba(255,255,255,.06)',
                  color: 'var(--muted)',
                  fontFamily: 'Space Mono, monospace',
                  fontWeight: 600,
                  letterSpacing: '.3px',
                }}>
                  {q.topic}
                </span>

                {/* Edit icon — pushes to right */}
                <button
                  onClick={() => isEditing ? cancelEdit() : startEdit(preview, q)}
                  disabled={saving}
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isEditing ? 'var(--muted)' : 'var(--dim)',
                    fontSize: 13,
                    padding: '2px 4px',
                    lineHeight: 1,
                    opacity: saving ? 0.5 : 1,
                  }}
                  title={isEditing ? 'Cancelar' : 'Editar pregunta'}
                >
                  {isEditing ? '✕' : '✏'}
                </button>

                {justSaved && (
                  <span style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'Space Mono, monospace' }}>✓</span>
                )}
              </div>

              {/* Question text or textarea */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid var(--border)',
                      borderRadius: 7,
                      color: 'var(--text)',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      lineHeight: 1.55,
                      padding: '8px 10px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => saveEdit(key)}
                      disabled={saving || editText.trim() === ''}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 7,
                        border: 'none',
                        background: 'var(--teal)',
                        color: '#0a0a14',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: saving ? 'wait' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 7,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--muted)',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    {overrides[key] && (
                      <button
                        onClick={async () => {
                          setSaving(true)
                          const supabase = createClient()
                          const newOverrides = { ...overrides }
                          delete newOverrides[key]
                          await supabase
                            .from('assessment_configs')
                            .update({ spreadsheet_q_overrides: newOverrides })
                            .eq('id', configId)
                          setOverrides(newOverrides)
                          setEditing(null)
                          setEditText('')
                          setSaving(false)
                        }}
                        disabled={saving}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 7,
                          border: '1px solid rgba(255,107,107,.3)',
                          background: 'transparent',
                          color: '#ff6b6b',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 11,
                          cursor: 'pointer',
                          marginLeft: 'auto',
                        }}
                        title="Restablecer texto original"
                      >
                        Restablecer
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{
                  fontSize: 13,
                  color: overrides[key] ? 'var(--text)' : 'var(--dim)',
                  fontFamily: 'DM Sans, sans-serif',
                  lineHeight: 1.55,
                  marginBottom: 10,
                }}>
                  {displayText}
                  {overrides[key] && (
                    <span style={{
                      marginLeft: 6,
                      fontSize: 9,
                      fontFamily: 'Space Mono, monospace',
                      color: 'var(--muted)',
                      background: 'rgba(255,255,255,.05)',
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}>
                      editado
                    </span>
                  )}
                </p>
              )}

              {/* Answer badge */}
              {!isEditing && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 100,
                  background: 'rgba(0,196,158,.08)',
                  border: '1px solid rgba(0,196,158,.2)',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--teal)' }}>✓</span>
                  <span style={{
                    fontSize: 11,
                    fontFamily: 'Space Mono, monospace',
                    color: 'var(--teal)',
                    letterSpacing: '.2px',
                  }}>
                    Respuesta auto-calculada: {q.expectedDisplay}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
