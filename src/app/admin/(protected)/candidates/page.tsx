import { createAdminClient } from '@/lib/supabase/admin'
import { CandidatesTable } from './CandidatesTable'

export default async function CandidatesPage() {
  const supabase = createAdminClient()

  const [{ data: submissions, count }, { data: configs }] = await Promise.all([
    supabase
      .from('submissions')
      .select(`
        id, completed_at, overall_score_pct, math_score_pct, caso_score_pct,
        video_recorded, roleplay_completed, roleplay_score,
        cultural_fit_completed, cultural_fit_score, cultural_fit_band,
        enabled_sections, challenge_weights, status, config_id,
        candidates ( name, email, cedula ),
        proctoring_reports ( fraud_score, fraud_level )
      `, { count: 'exact' })
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(500),

    supabase
      .from('assessment_configs')
      .select('id, label, is_active')
      .order('is_active', { ascending: false }),
  ])

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>Candidatos</h1>
        <p style={{ fontSize: 15, color: 'var(--dim)' }}>{submissions?.length || 0} assessments completados</p>
      </div>

      <CandidatesTable
        submissions={(submissions || []) as any}
        totalCount={count ?? (submissions?.length || 0)}
        configs={(configs || []) as { id: string; label: string; is_active: boolean }[]}
      />
    </div>
  )
}
