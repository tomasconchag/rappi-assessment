'use client'

import { useState } from 'react'
import { RubricEditor } from './RubricEditor'

interface Dimension {
  id: string
  name: string
  description: string
  weight: number
  position: number
  scale: { score: number; label: string; description: string }[]
  active: boolean
  section: string
}

const SECTIONS = [
  {
    key: 'caso',
    label: 'Caso Práctico',
    icon: '📊',
    color: 'var(--blue)',
    colorBg: 'rgba(67,97,238,.1)',
    colorBorder: 'rgba(67,97,238,.25)',
    description: 'Evaluación de respuestas escritas al análisis del restaurante',
  },
  {
    key: 'sharktank',
    label: 'SharkTank',
    icon: '🦈',
    color: 'var(--red)',
    colorBg: 'rgba(233,69,96,.1)',
    colorBorder: 'rgba(233,69,96,.25)',
    description: 'Evaluación del pitch de video vía transcripción + IA',
  },
]

export function RubricPageClient({
  casoDims,
  sharkDims,
}: {
  casoDims: Dimension[]
  sharkDims: Dimension[]
}) {
  const [activeSection, setActiveSection] = useState<'caso' | 'sharktank'>('caso')

  const dims = activeSection === 'caso' ? casoDims : sharkDims
  const active = SECTIONS.find(s => s.key === activeSection)!
  const totalWeight = dims.filter(d => d.active).reduce((s, d) => s + Number(d.weight), 0)

  return (
    <div>
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {SECTIONS.map(section => {
          const isActive = activeSection === section.key
          const sectionDims = section.key === 'caso' ? casoDims : sharkDims
          const sectionWeight = sectionDims.filter(d => d.active).reduce((s, d) => s + Number(d.weight), 0)
          const weightOk = Math.abs(sectionWeight - 100) < 0.1

          return (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
                background: isActive ? section.colorBg : 'var(--card)',
                border: isActive ? `1.5px solid ${section.colorBorder}` : '1px solid var(--border)',
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{section.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans', color: isActive ? section.color : 'var(--text)' }}>
                  {section.label}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'Space Mono', color: isActive ? section.color : 'var(--muted)', opacity: 0.8 }}>
                  {sectionDims.filter(d => d.active).length} dims ·{' '}
                  <span style={{ color: weightOk ? (isActive ? section.color : 'var(--teal)') : '#ff6b6b', fontWeight: 700 }}>
                    {sectionWeight}%
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Section description */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: `${active.colorBg}`, border: `1px solid ${active.colorBorder}`, borderRadius: 9, marginBottom: 20 }}>
        <span style={{ fontSize: 13 }}>{active.icon}</span>
        <span style={{ fontSize: 13, color: active.color, fontFamily: 'DM Sans' }}>{active.description}</span>
      </div>

      <RubricEditor
        key={activeSection}
        initialDimensions={dims}
        section={activeSection}
      />
    </div>
  )
}
