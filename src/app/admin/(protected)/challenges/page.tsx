import { createAdminClient } from '@/lib/supabase/admin'
import { ChallengesEditor } from './ChallengesEditor'
import { CHALLENGES } from '@/lib/challenges'
import type { SectionId } from '@/lib/challenges'

export default async function ChallengesPage() {
  const supabase = createAdminClient()
  const { data: config } = await supabase
    .from('assessment_configs')
    .select('id, enabled_sections')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const configId = config?.id ?? ''
  const enabled: SectionId[] = (config?.enabled_sections as SectionId[]) ?? ['sharktank', 'caso', 'math']

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Challenges
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans', marginTop: 6, marginBottom: 0 }}>
          Selecciona qué challenges estarán activos durante el assessment. Los pesos se normalizan automáticamente al 100%.
        </p>
      </div>
      <ChallengesEditor configId={configId} initialEnabled={enabled} challenges={CHALLENGES} />
    </div>
  )
}
