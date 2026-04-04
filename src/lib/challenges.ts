export type SectionId = 'sharktank' | 'roleplay' | 'caso' | 'math'

export interface ChallengeDefinition {
  id: SectionId
  label: string
  icon: string
  description: string
  color: string
  colorBg: string
  colorBorder: string
  weight: number  // base weight (sum of all = 100)
}

export const CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'sharktank',
    label: 'SharkTank Pitch',
    icon: '🦈',
    description: 'Video de 60s simulando conversación con dueño de restaurante. Evalúa comunicación, persuasión y presencia verbal.',
    color: 'var(--red)',
    colorBg: 'rgba(233,69,96,.06)',
    colorBorder: 'rgba(233,69,96,.2)',
    weight: 35,
  },
  {
    id: 'roleplay',
    label: 'Role Play — Llamada con restaurante',
    icon: '📞',
    description: 'Llamada de 5 minutos con el dueño de Heladería La Fiore (avatar IA). El candidato actúa como Farmer y debe convencer al restaurante de implementar nuevas estrategias en Rappi.',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,.06)',
    colorBorder: 'rgba(245,158,11,.2)',
    weight: 35,
  },
  {
    id: 'caso',
    label: 'Caso Práctico',
    icon: '📊',
    description: '4 preguntas escritas sobre Heladería La Fiore. Evalúa diagnóstico, uso de herramientas Rappi, análisis de datos y orientación a resultados.',
    color: 'var(--blue)',
    colorBg: 'rgba(67,97,238,.06)',
    colorBorder: 'rgba(67,97,238,.2)',
    weight: 40,
  },
  {
    id: 'math',
    label: 'Taller de Math',
    icon: '🧮',
    description: '9 preguntas de matemáticas con contexto Rappi. Evalúa razonamiento numérico y cálculo bajo presión de tiempo.',
    color: 'var(--teal)',
    colorBg: 'rgba(6,214,160,.06)',
    colorBorder: 'rgba(6,214,160,.2)',
    weight: 25,
  },
]

/** Returns normalized weights for enabled sections (always sum to 100) */
export function normalizedWeights(enabled: SectionId[]): Record<SectionId, number> {
  const total = CHALLENGES.filter(c => enabled.includes(c.id)).reduce((s, c) => s + c.weight, 0)
  const result = { sharktank: 0, roleplay: 0, caso: 0, math: 0 }
  if (total === 0) return result
  CHALLENGES.forEach(c => {
    if (enabled.includes(c.id)) result[c.id] = Math.round((c.weight / total) * 100)
  })
  return result
}
