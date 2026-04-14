'use client'

import { useState } from 'react'
import { RolePlayTestPanel } from './RolePlayTestPanel'
import { RolePlayBankSelector } from './RolePlayBankSelector'
import type { RoleplayBankEntry } from '@/types/assessment'

interface Props {
  voiceProvider: 'vapi' | 'arbol'
  configId: string
  initialActiveId: string | null
  cases: RoleplayBankEntry[]
}

export function RolePlayPageClient({ voiceProvider, configId, initialActiveId, cases }: Props) {
  const [activeCase, setActiveCase] = useState<RoleplayBankEntry | null>(
    cases.find(c => c.id === initialActiveId) ?? null
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Test panel — always reflects the currently active case */}
      <RolePlayTestPanel
        voiceProvider={voiceProvider}
        activeBankCase={activeCase}
      />

      {/* Case bank — notifies parent when activation changes */}
      <RolePlayBankSelector
        configId={configId}
        initialActiveId={initialActiveId}
        cases={cases}
        onActiveChange={setActiveCase}
      />
    </div>
  )
}
