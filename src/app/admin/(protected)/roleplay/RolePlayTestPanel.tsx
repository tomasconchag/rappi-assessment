'use client'

import { useState } from 'react'
import { RolePlayCallScreen } from '@/components/assessment/screens/RolePlayCallScreen'
import type { RoleplayBankEntry } from '@/types/assessment'

interface Props {
  voiceProvider: 'vapi' | 'arbol'
  activeBankCase?: RoleplayBankEntry | null
}

export function RolePlayTestPanel({ voiceProvider, activeBankCase }: Props) {
  const [testing, setTesting] = useState(false)

  if (testing) {
    return (
      <RolePlayCallScreen
        onDone={() => setTesting(false)}
        cameraStream={null}
        voiceProvider={voiceProvider}
        roleplayCase={null}
        roleplayBankCase={activeBankCase ?? null}
      />
    )
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderTop: '3px solid #f59e0b', borderRadius: 14,
      padding: '24px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
    }}>
      <div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
          Probar llamada
        </div>
        <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, margin: 0 }}>
          {activeBankCase
            ? `Caso activo: ${activeBankCase.restaurant_name} · ${activeBankCase.difficulty}`
            : 'Selecciona un caso del banco para probar la llamada.'}
        </p>
      </div>
      <button
        onClick={() => setTesting(true)}
        disabled={!activeBankCase}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '12px 24px',
          background: activeBankCase
            ? 'linear-gradient(140deg, #f59e0b, #d97706)'
            : 'rgba(255,255,255,.06)',
          color: activeBankCase ? '#000' : 'var(--muted)',
          border: activeBankCase ? 'none' : '1px solid var(--border)',
          borderRadius: 10,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 14,
          cursor: activeBankCase ? 'pointer' : 'not-allowed',
          boxShadow: activeBankCase ? '0 4px 20px rgba(245,158,11,.3)' : 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>📞</span>
        Probar llamada ahora
      </button>
    </div>
  )
}
