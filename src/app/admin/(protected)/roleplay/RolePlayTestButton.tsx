'use client'

import { useState } from 'react'
import { RolePlayCallScreen } from '@/components/assessment/screens/RolePlayCallScreen'
import type { RoleplayCase } from '@/types/assessment'

interface Props {
  voiceProvider: 'vapi' | 'arbol'
  roleplayCase?: RoleplayCase | null
}

export function RolePlayTestButton({ voiceProvider, roleplayCase }: Props) {
  const [testing, setTesting] = useState(false)

  if (testing) {
    return (
      <RolePlayCallScreen
        onDone={() => setTesting(false)}
        cameraStream={null}
        voiceProvider={voiceProvider}
        roleplayCase={roleplayCase}
      />
    )
  }

  return (
    <button
      onClick={() => setTesting(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '12px 24px',
        background: 'linear-gradient(140deg, #f59e0b, #d97706)',
        color: '#000', border: 'none', borderRadius: 10,
        fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 14,
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(245,158,11,.3)',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(245,158,11,.4)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = ''
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(245,158,11,.3)'
      }}
    >
      <span style={{ fontSize: 18 }}>📞</span>
      Probar llamada ahora
    </button>
  )
}
