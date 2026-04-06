'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  configId: string
  currentMode: 'questions' | 'spreadsheet'
}

export function MathModeToggle({ configId, currentMode }: Props) {
  const [mode, setMode] = useState<'questions' | 'spreadsheet'>(currentMode)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async (newMode: 'questions' | 'spreadsheet') => {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()
    await supabase.from('assessment_configs').update({ math_mode: newMode }).eq('id', configId)
    setMode(newMode)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const options: { value: 'questions' | 'spreadsheet'; label: string; desc: string; icon: string }[] = [
    {
      value: 'questions',
      label: 'Preguntas (modo actual)',
      desc: 'El candidato responde 9 preguntas una a la vez con opciones de texto. Flujo actual.',
      icon: '📝',
    },
    {
      value: 'spreadsheet',
      label: 'Hoja de Cálculo Excel',
      desc: 'El candidato trabaja en una hoja de cálculo embebida, escribiendo fórmulas reales (=F3*4, =SUM…). Se evalúa el resultado automáticamente.',
      icon: '📊',
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {options.map(opt => {
          const isSelected = mode === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => save(opt.value)}
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
                  <span style={{
                    fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                    color: isSelected ? 'var(--teal)' : 'var(--text)',
                  }}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span style={{
                      fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      padding: '2px 8px', borderRadius: 100,
                      background: 'rgba(0,196,158,.12)', color: 'var(--teal)',
                      border: '1px solid rgba(0,196,158,.2)',
                      letterSpacing: '.5px',
                    }}>
                      ACTIVO
                    </span>
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
                marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a0a14' }} />}
              </div>
            </button>
          )
        })}
      </div>

      {saving && (
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>Guardando…</p>
      )}
      {saved && (
        <p style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace' }}>✓ Guardado</p>
      )}
    </div>
  )
}
