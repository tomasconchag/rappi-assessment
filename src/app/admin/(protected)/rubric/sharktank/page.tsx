import { createAdminClient } from '@/lib/supabase/admin'
import { RubricEditor } from '../RubricEditor'

export default async function RubricSharkTankPage() {
  const supabase = createAdminClient()
  const { data: dims } = await supabase
    .from('evaluation_rubric')
    .select('*')
    .eq('section', 'sharktank')
    .order('position', { ascending: true })

  return (
    <div style={{ maxWidth: 920 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Evaluación IA · Rúbrica
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
          🦈 SharkTank Pitch
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', maxWidth: 560 }}>
          Criterios con los que la IA evalúa la transcripción del video pitch del candidato.
        </p>
      </div>

      <div style={{ padding: '10px 16px', background: 'rgba(233,69,96,.06)', border: '1px solid rgba(233,69,96,.2)', borderRadius: 9, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13 }}>🦈</span>
        <span style={{ fontSize: 13, color: 'var(--red)', fontFamily: 'DM Sans' }}>Evaluación del pitch de video vía transcripción + IA (AssemblyAI + Claude)</span>
      </div>

      <RubricEditor
        initialDimensions={(dims || []) as any}
        section="sharktank"
      />
    </div>
  )
}
