import { createAdminClient } from '@/lib/supabase/admin'
import { TrainingResultsTable } from './TrainingResultsTable'

export default async function TrainingResultsPage() {
  const supabase = createAdminClient()

  const [{ data: submissions }, { data: cohorts }] = await Promise.all([
    supabase
      .from('training_submissions')
      .select('*')
      .order('completed_at', { ascending: false }),
    supabase
      .from('training_cohorts')
      .select('id, name, is_active')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
          Resultados Farmers
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
          Resultados del training por roleplay de los farmers de Rappi.
        </p>
      </div>

      <TrainingResultsTable
        submissions={(submissions ?? []) as Parameters<typeof TrainingResultsTable>[0]['submissions']}
        cohorts={(cohorts ?? []) as Parameters<typeof TrainingResultsTable>[0]['cohorts']}
      />
    </div>
  )
}
