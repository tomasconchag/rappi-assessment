'use client'

import { useState } from 'react'
import { CulturalFitCallScreen } from '@/components/assessment/screens/CulturalFitCallScreen'

export function CulturalFitTestPanel() {
  const [testing, setTesting] = useState(false)

  if (testing) {
    return (
      <CulturalFitCallScreen
        onDone={() => setTesting(false)}
        cameraStream={null}
      />
    )
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderTop: '3px solid #a855f7', borderRadius: 14,
      padding: '24px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
    }}>
      <div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
          Probar entrevista con Simón
        </div>
        <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, margin: 0 }}>
          Inicia una sesión de Cultural Fit exactamente como la verá el candidato.
        </p>
      </div>
      <button
        onClick={() => setTesting(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '12px 24px',
          background: 'linear-gradient(140deg, #a855f7, #7c3aed)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 14,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(168,85,247,.35)',
        }}
      >
        <span style={{ fontSize: 18 }}>🎙</span>
        Iniciar entrevista ahora
      </button>
    </div>
  )
}
