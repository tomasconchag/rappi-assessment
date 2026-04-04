import { createAdminClient } from '@/lib/supabase/admin'
import { RubricEditor } from '../RubricEditor'

export default async function RubricCasoPage() {
  const supabase = createAdminClient()
  const { data: dims } = await supabase
    .from('evaluation_rubric')
    .select('*')
    .eq('section', 'caso')
    .order('position', { ascending: true })

  return (
    <div style={{ maxWidth: 920 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Evaluación IA · Rúbrica
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
          📊 Caso Práctico
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', maxWidth: 560 }}>
          Criterios con los que la IA evalúa las respuestas escritas del candidato al análisis del restaurante.
        </p>
      </div>

      <div style={{ padding: '10px 16px', background: 'rgba(67,97,238,.08)', border: '1px solid rgba(67,97,238,.2)', borderRadius: 9, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13 }}>📊</span>
        <span style={{ fontSize: 13, color: 'var(--blue)', fontFamily: 'DM Sans' }}>Evaluación de respuestas escritas al análisis del restaurante</span>
      </div>

      <RubricEditor
        initialDimensions={(dims || []) as any}
        section="caso"
      />
    </div>
  )
}
