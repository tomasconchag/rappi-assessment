import { createAdminClient } from '@/lib/supabase/admin'
import { CandidatesTable } from './CandidatesTable'

export default async function CandidatesPage() {
  const supabase = createAdminClient()

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id, completed_at, overall_score_pct, math_score_pct, caso_score_pct,
      video_recorded, roleplay_completed, roleplay_score,
      cultural_fit_completed, cultural_fit_score, cultural_fit_band,
      enabled_sections, challenge_weights, status,
      candidates ( name, email, cedula ),
      proctoring_reports ( fraud_score, fraud_level )
    `)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>Candidatos</h1>
        <p style={{ fontSize: 15, color: 'var(--dim)' }}>{submissions?.length || 0} assessments completados</p>
      </div>

      <CandidatesTable submissions={(submissions || []) as any} />
    </div>
  )
}
