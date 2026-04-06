import { createAdminClient } from '@/lib/supabase/admin'
import { ChallengesEditor } from './ChallengesEditor'
import { CasoBankSelector } from './CasoBankSelector'
import { CHALLENGES, DEFAULT_WEIGHTS } from '@/lib/challenges'
import type { SectionId } from '@/lib/challenges'
import type { CasoBankEntry } from '@/types/assessment'

export default async function ChallengesPage() {
  const supabase = createAdminClient()
  const [{ data: config }, { data: casesData }] = await Promise.all([
    supabase
      .from('assessment_configs')
      .select('id, enabled_sections, challenge_weights, active_caso_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('caso_bank')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

  const configId = config?.id ?? ''
  const enabled: SectionId[] = (config?.enabled_sections as SectionId[]) ?? ['sharktank', 'caso', 'math']
  const savedWeights = (config?.challenge_weights as Partial<Record<SectionId, number>>) ?? DEFAULT_WEIGHTS
  const activeCasoId: string | null = (config as { active_caso_id?: string | null } | null)?.active_caso_id ?? null
  const cases: CasoBankEntry[] = (casesData as CasoBankEntry[]) ?? []

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Challenges
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans', marginTop: 6, marginBottom: 0 }}>
          Selecciona qué challenges estarán activos y ajusta su peso sobre el score general.
        </p>
      </div>
      <ChallengesEditor configId={configId} initialEnabled={enabled} challenges={CHALLENGES} initialWeights={savedWeights} />

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '40px 0' }} />

      <CasoBankSelector
        configId={configId}
        initialActiveCasoId={activeCasoId}
        cases={cases}
      />
    </div>
  )
}
