'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  configId: string
  currentProvider: 'vapi' | 'arbol'
}

const OPTIONS = [
  { value: 'vapi',  label: 'Vapi',     desc: 'Llamada de voz en el navegador (WebRTC)', icon: '🎙️' },
  { value: 'arbol', label: 'Arbol AI', desc: 'Llamada telefónica real al candidato',     icon: '📞' },
] as const

export function VoiceProviderToggle({ configId, currentProvider }: Props) {
  const [provider, setProvider] = useState<'vapi' | 'arbol'>(currentProvider)
  const [saving,   setSaving]   = useState(false)
  const [flash,    setFlash]    = useState<string | null>(null)

  const handleSelect = async (value: 'vapi' | 'arbol') => {
    if (value === provider) return
    setSaving(true)
    setProvider(value)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('assessment_configs')
        .update({ voice_provider: value })
        .eq('id', configId)
      if (error) throw error
      setFlash('Guardado')
      setTimeout(() => setFlash(null), 2500)
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Error al guardar')
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OPTIONS.map(opt => {
          const selected = provider === opt.value
          return (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 10,
                background: selected ? 'rgba(245,158,11,.07)' : 'rgba(255,255,255,.02)',
                border: `1.5px solid ${selected ? 'rgba(245,158,11,.35)' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all .2s',
              }}
              onClick={() => handleSelect(opt.value)}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: selected ? '#f59e0b' : 'var(--input)',
                border: `1.5px solid ${selected ? '#f59e0b' : 'var(--border-mid)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <span style={{ fontSize: 18 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: 'var(--text)' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--muted)', marginTop: 2 }}>
                  {opt.desc}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <div style={{ marginTop: 14, height: 20, display: 'flex', alignItems: 'center' }}>
        {saving && !flash && (
          <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
            Guardando...
          </span>
        )}
        {flash && (
          <span style={{
            fontSize: 12, fontFamily: 'DM Sans, sans-serif',
            color: flash === 'Guardado' ? '#00d68a' : 'var(--red)',
          }}>
            {flash === 'Guardado' ? '✓ ' : ''}{flash}
          </span>
        )}
      </div>
    </div>
  )
}
