export type SectionId = 'sharktank' | 'roleplay' | 'caso' | 'math' | 'cultural_fit'

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
    description: 'Llamada de 10 minutos con el dueño de Heladería La Fiore (avatar IA). El candidato actúa como Farmer y debe convencer al restaurante de implementar nuevas estrategias en Rappi.',
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
  {
    id: 'cultural_fit',
    label: 'Cultural Fit',
    icon: '🎙',
    description: 'Entrevista de 5 minutos con Simón, Team Lead de Brand Development. Evalúa fit cultural con el equipo Rappi BD. Se graba pantalla, cámara y micrófono.',
    color: '#a855f7',
    colorBg: 'rgba(168,85,247,.06)',
    colorBorder: 'rgba(168,85,247,.2)',
    weight: 0,
  },
]

/** Returns normalized weights for enabled sections (always sum to 100).
 *  Optionally pass customWeights (base values per section) to override defaults. */
export function normalizedWeights(
  enabled: SectionId[],
  customWeights?: Partial<Record<SectionId, number>>,
): Record<SectionId, number> {
  const result = { sharktank: 0, roleplay: 0, caso: 0, math: 0, cultural_fit: 0 }
  const baseWeight = (id: SectionId) => customWeights?.[id] ?? CHALLENGES.find(c => c.id === id)?.weight ?? 0
  const total = enabled.reduce((s, id) => s + baseWeight(id), 0)
  if (total === 0) return result
  enabled.forEach(id => {
    result[id] = Math.round((baseWeight(id) / total) * 100)
  })
  return result
}

/** Default base weights keyed by section id */
export const DEFAULT_WEIGHTS: Record<SectionId, number> = {
  sharktank:    35,
  roleplay:     35,
  caso:         40,
  math:         25,
  cultural_fit:  0,
}
