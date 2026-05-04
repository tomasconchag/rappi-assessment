import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { RubricEditor } from '../../rubric/RubricEditor'

export default async function TrainingRubricPage() {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('evaluation_rubric')
    .select('*')
    .eq('section', 'training')
    .order('position', { ascending: true })

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Training Hour · Rúbrica
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8, color: 'var(--text)' }}>
          📋 Rúbrica de Training
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', maxWidth: 600, margin: 0 }}>
          Define los criterios con los que la IA evaluará el roleplay de training de los farmers.
          Los pesos deben sumar 100%.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ padding: '11px 16px', background: 'rgba(168,85,247,.06)', border: '1px solid rgba(168,85,247,.18)', borderRadius: 9, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ fontSize: 13, color: '#a855f7', fontFamily: 'DM Sans' }}>
          Transcripción vía <strong>AssemblyAI</strong> (speaker diarization, español) · Evaluación estructurada con <strong>Claude Opus</strong>
        </span>
      </div>

      {/* Bands reference */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { label: 'ELITE',             range: '85–100', color: '#06d6a0', bg: 'rgba(6,214,160,.08)', border: 'rgba(6,214,160,.2)' },
          { label: 'SÓLIDO',            range: '70–84',  color: '#4361ee', bg: 'rgba(67,97,238,.08)', border: 'rgba(67,97,238,.2)' },
          { label: 'EN DESARROLLO',     range: '50–69',  color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' },
          { label: 'REQUIERE COACHING', range: '0–49',   color: '#e03554', bg: 'rgba(224,53,84,.08)', border: 'rgba(224,53,84,.2)' },
        ].map(b => (
          <div key={b.label} style={{ padding: '6px 14px', borderRadius: 100, background: b.bg, border: `1px solid ${b.border}`, display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color }} />
            <span style={{ fontFamily: 'Space Mono', fontSize: 10, fontWeight: 700, color: b.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans' }}>{b.range} pts</span>
          </div>
        ))}
      </div>

      {(!rows || rows.length === 0) && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.18)', borderRadius: 9, marginBottom: 24, fontSize: 13, fontFamily: 'DM Sans', color: '#f59e0b' }}>
          ℹ No hay dimensiones de evaluación configuradas para training. Agrega dimensiones abajo — si no hay ninguna, la IA usará criterios por defecto.
        </div>
      )}

      <RubricEditor initialDimensions={(rows || []) as Parameters<typeof RubricEditor>[0]['initialDimensions']} section="training" />
    </div>
  )
}
