import { createAdminClient } from '@/lib/supabase/admin'
import { RolePlayRubricEditor } from '../RolePlayRubricEditor'

export default async function RubricRolePlayPage() {
  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('evaluation_rubric')
    .select('*')
    .eq('section', 'roleplay')
    .order('position', { ascending: true })

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Evaluación IA · Rúbrica
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
          📞 RolePlay — Farmer Call
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', maxWidth: 600 }}>
          Framework de Criterios de Evidencia Observable v2.0. Edita los criterios y puntuaciones que usa la IA para evaluar la llamada.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ padding: '11px 16px', background: 'rgba(6,214,160,.06)', border: '1px solid rgba(6,214,160,.18)', borderRadius: 9, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>📞</span>
        <span style={{ fontSize: 13, color: 'var(--teal)', fontFamily: 'DM Sans' }}>
          Transcripción vía <strong>AssemblyAI</strong> (speaker diarization, español) · Evaluación estructurada <strong>C1–C6</strong> con Claude Opus · 87 pts totales
        </span>
      </div>

      {/* Bands reference */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { label: 'ELITE',             range: '78–87', color: '#06d68a', bg: 'rgba(6,214,138,.08)',  border: 'rgba(6,214,138,.2)' },
          { label: 'SÓLIDO',            range: '65–77', color: '#4361ee', bg: 'rgba(67,97,238,.08)', border: 'rgba(67,97,238,.2)' },
          { label: 'EN DESARROLLO',     range: '52–64', color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' },
          { label: 'REQUIERE COACHING', range: '35–51', color: '#e03554', bg: 'rgba(224,53,84,.08)', border: 'rgba(224,53,84,.2)' },
          { label: 'CRÍTICO',           range: '0–34',  color: '#ff6b6b', bg: 'rgba(255,107,107,.08)', border: 'rgba(255,107,107,.2)' },
        ].map(b => (
          <div key={b.label} style={{ padding: '6px 14px', borderRadius: 100, background: b.bg, border: `1px solid ${b.border}`, display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color }} />
            <span style={{ fontFamily: 'Space Mono', fontSize: 10, fontWeight: 700, color: b.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans' }}>{b.range} pts</span>
          </div>
        ))}
      </div>

      {/* Dependency note */}
      <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.18)', borderRadius: 9, marginBottom: 28, fontSize: 12.5, fontFamily: 'DM Sans', color: 'var(--dim)', lineHeight: 1.7 }}>
        <strong style={{ color: '#f59e0b', fontFamily: 'Space Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>⚠ Dependencias entre métricas</strong>
        Si M2 &lt; 8 pts → M3 y M4 no pueden ser altas · Si M1 = 0 → M5 máximo = 8 pts · Si llamada es Descubrimiento → M5 máximo = 10 pts
      </div>

      <RolePlayRubricEditor initialRows={(rows || []) as any} />
    </div>
  )
}
