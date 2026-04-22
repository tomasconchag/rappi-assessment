import { createAdminClient } from '@/lib/supabase/admin'
import { BatchesClient }     from './BatchesClient'

export default async function BatchesPage() {
  const supabase = createAdminClient()

  // Load all batches with counts
  const { data: batches } = await supabase
    .from('template_batches')
    .select(`
      id, name, description, created_at, created_by,
      personalized_templates ( id, employee_email, employee_name, used_at )
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>
          Pruebas por lote
        </h1>
        <p style={{ fontSize: 15, color: 'var(--dim)' }}>
          Importa un JSON generado por tu macro y obtén links únicos para cada empleado.
        </p>
      </div>

      <BatchesClient batches={(batches || []) as any} />
    </div>
  )
}
