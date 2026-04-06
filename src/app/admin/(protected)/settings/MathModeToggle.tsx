'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SpreadsheetQuestionsPanel } from './SpreadsheetQuestionsPanel'
import type { QuestionSummary } from '@/lib/mathSpreadsheetTemplates'

interface Props {
  configId: string
  currentMode: 'questions' | 'spreadsheet'
  currentVersion: string  // 'A' | 'B' | 'random'
  questionsA: QuestionSummary[]
  questionsB: QuestionSummary[]
  initialOverrides: Record<string, string>
}

const SHEET_VERSIONS = [
  { value: 'random', label: 'Aleatoria', desc: 'Cada candidato recibe A o B al azar — ideal para grupos grandes.', badge: '🎲' },
  { value: 'A',      label: 'Versión A',  desc: '4 hamburguesas, 20% descuento, 20 días hábiles…',               badge: 'A' },
  { value: 'B',      label: 'Versión B',  desc: '3 hamburguesas, 30% descuento, 25 días hábiles…',               badge: 'B' },
]

export function MathModeToggle({ configId, currentMode, currentVersion, questionsA, questionsB, initialOverrides }: Props) {
  const [mode, setMode]       = useState<'questions' | 'spreadsheet'>(currentMode)
  const [version, setVersion] = useState(currentVersion || 'random')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const save = async (newMode: 'questions' | 'spreadsheet', newVersion?: string) => {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()
    const update: Record<string, string> = { math_mode: newMode }
    if (newVersion) update.math_version = newVersion
    await supabase.from('assessment_configs').update(update).eq('id', configId)
    setMode(newMode)
    if (newVersion) setVersion(newVersion)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const modeOptions: { value: 'questions' | 'spreadsheet'; label: string; desc: string; icon: string }[] = [
    {
      value: 'questions',
      label: 'Preguntas (modo actual)',
      desc: 'El candidato responde 9 preguntas una a la vez con opciones de texto.',
      icon: '📝',
    },
    {
      value: 'spreadsheet',
      label: 'Hoja de Cálculo Excel',
      desc: 'El candidato trabaja en una hoja de cálculo embebida escribiendo fórmulas reales (=F3*4, =SUM…).',
      icon: '📊',
    },
  ]

  return (
    <div>
      {/* Mode selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: mode === 'spreadsheet' ? 24 : 16 }}>
        {modeOptions.map(opt => {
          const isSelected = mode === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => save(opt.value, opt.value === 'spreadsheet' ? version : undefined)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '16px 20px',
                background: isSelected ? 'rgba(0,196,158,.07)' : 'rgba(255,255,255,.02)',
                border: `2px solid ${isSelected ? 'rgba(0,196,158,.4)' : 'var(--border)'}`,
                borderRadius: 12,
                cursor: saving ? 'wait' : 'pointer',
                textAlign: 'left',
                transition: 'all .15s',
                width: '100%',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', color: isSelected ? 'var(--teal)' : 'var(--text)' }}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span style={{
                      fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      padding: '2px 8px', borderRadius: 100,
                      background: 'rgba(0,196,158,.12)', color: 'var(--teal)',
                      border: '1px solid rgba(0,196,158,.2)', letterSpacing: '.5px',
                    }}>ACTIVO</span>
                  )}
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, margin: 0 }}>
                  {opt.desc}
                </p>
              </div>
              <div style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${isSelected ? 'var(--teal)' : 'var(--border)'}`,
                background: isSelected ? 'var(--teal)' : 'transparent',
                marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a0a14' }} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Version selector — only visible in spreadsheet mode */}
      {mode === 'spreadsheet' && (
        <div style={{
          padding: '18px 20px',
          background: 'rgba(0,196,158,.04)',
          border: '1px solid rgba(0,196,158,.15)',
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <p style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
            textTransform: 'uppercase', letterSpacing: '1.2px',
            color: 'var(--teal)', marginBottom: 14, fontWeight: 500,
          }}>
            Versión de la hoja de cálculo
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {SHEET_VERSIONS.map(v => {
              const isSelected = version === v.value
              return (
                <button
                  key={v.value}
                  onClick={() => save('spreadsheet', v.value)}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '12px 14px',
                    background: isSelected ? 'rgba(0,196,158,.1)' : 'rgba(255,255,255,.02)',
                    border: `2px solid ${isSelected ? 'rgba(0,196,158,.5)' : 'var(--border)'}`,
                    borderRadius: 10, cursor: saving ? 'wait' : 'pointer',
                    textAlign: 'left', transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: isSelected ? 'rgba(0,196,158,.2)' : 'rgba(255,255,255,.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                      color: isSelected ? 'var(--teal)' : 'var(--muted)',
                    }}>
                      {v.badge}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', color: isSelected ? 'var(--teal)' : 'var(--text)' }}>
                      {v.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, margin: 0 }}>
                    {v.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Questions preview + edit panel — only visible in spreadsheet mode */}
      {mode === 'spreadsheet' && (
        <SpreadsheetQuestionsPanel
          configId={configId}
          questionsA={questionsA}
          questionsB={questionsB}
          initialOverrides={initialOverrides}
        />
      )}

      {saving && <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>Guardando…</p>}
      {saved  && <p style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>✓ Guardado</p>}
    </div>
  )
}
