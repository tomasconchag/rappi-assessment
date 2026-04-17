import { createAdminClient } from '@/lib/supabase/admin'
import { CulturalFitRubricEditor } from '../CulturalFitRubricEditor'

export default async function RubricCulturalFitPage() {
  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('evaluation_rubric')
    .select('*')
    .eq('section', 'cultural_fit')
    .order('position', { ascending: true })

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Evaluación IA · Rúbrica
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
          🎙 Cultural Fit — Entrevista con Simón
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', maxWidth: 600 }}>
          Framework de Evaluación Conductual v1.0 · 5 dimensiones × 20 pts = 100 pts totales. Edita los criterios y preguntas que usa la IA.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ padding: '11px 16px', background: 'rgba(168,85,247,.06)', border: '1px solid rgba(168,85,247,.18)', borderRadius: 9, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>🎙</span>
        <span style={{ fontSize: 13, color: '#a855f7', fontFamily: 'DM Sans' }}>
          Transcripción vía <strong>AssemblyAI</strong> (speaker diarization, español) · Evaluación estructurada por tiers con <strong>Claude Opus</strong> · 100 pts totales
        </span>
      </div>

      {/* Bands */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { label: 'TOP TALENT',     range: '90–100', color: '#06d68a', bg: 'rgba(6,214,138,.08)',   border: 'rgba(6,214,138,.2)'   },
          { label: 'STRONG FIT',     range: '75–89',  color: '#4361ee', bg: 'rgba(67,97,238,.08)',   border: 'rgba(67,97,238,.2)'   },
          { label: 'POTENTIAL RISK', range: '60–74',  color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)'  },
          { label: 'NOT A FIT',      range: '0–59',   color: '#e03554', bg: 'rgba(224,53,84,.08)',   border: 'rgba(224,53,84,.2)'   },
        ].map(b => (
          <div key={b.label} style={{ padding: '6px 14px', borderRadius: 100, background: b.bg, border: `1px solid ${b.border}`, display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color }} />
            <span style={{ fontFamily: 'Space Mono', fontSize: 10, fontWeight: 700, color: b.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans' }}>{b.range} pts</span>
          </div>
        ))}
      </div>

      {/* Scoring guide */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {[
          { tier: 'Tier 1 — Elite',    pts: '20 pts', color: '#06d68a', bg: 'rgba(6,214,138,.07)',  border: 'rgba(6,214,138,.2)'  },
          { tier: 'Tier 2 — Sólido',   pts: '10 pts', color: '#4361ee', bg: 'rgba(67,97,238,.07)',  border: 'rgba(67,97,238,.2)'  },
          { tier: 'Tier 3 — Crítico',  pts: '0 pts',  color: '#e03554', bg: 'rgba(224,53,84,.07)',  border: 'rgba(224,53,84,.2)'  },
        ].map(t => (
          <div key={t.tier} style={{ padding: '8px 16px', borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700, color: t.color }}>{t.tier}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans' }}>= {t.pts}</span>
          </div>
        ))}
      </div>

      <CulturalFitRubricEditor initialRows={(rows || []) as any} />
    </div>
  )
}
