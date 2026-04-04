import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createAdminClient()

  const [{ count: total }, { data: submissions }, { count: totalAll }, { data: evalsDone }] = await Promise.all([
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('submissions').select('overall_score_pct, math_score_pct, caso_score_pct').eq('status', 'completed'),
    supabase.from('submissions').select('*', { count: 'exact', head: true }),
    supabase.from('ai_evaluations').select('submission_id').eq('eval_status', 'completed'),
  ])

  const { data: proctoring } = await supabase.from('proctoring_reports').select('fraud_level, fraud_score')

  // Unique submissions that have at least one completed eval
  const evaluatedIds = new Set((evalsDone || []).map(e => e.submission_id))
  const pendingEval = Math.max(0, (total || 0) - evaluatedIds.size)
  const inProgress = Math.max(0, (totalAll || 0) - (total || 0))

  const n = submissions?.length || 0
  const avgOverall = n ? Math.round(submissions!.reduce((s, r) => s + (r.overall_score_pct || 0), 0) / n) : 0
  const avgMath    = n ? Math.round(submissions!.reduce((s, r) => s + (r.math_score_pct  || 0), 0) / n) : 0
  const avgCaso    = n ? Math.round(submissions!.reduce((s, r) => s + (r.caso_score_pct  || 0), 0) / n) : 0

  const confiable = proctoring?.filter(p => p.fraud_level === 'Confiable').length || 0
  const medio     = proctoring?.filter(p => p.fraud_level === 'Riesgo Medio').length || 0
  const alto      = proctoring?.filter(p => p.fraud_level === 'Alta Probabilidad de Fraude').length || 0
  const totalPr   = proctoring?.length || 0

  const fraudItems = [
    { label: 'Confiable',               count: confiable, color: 'var(--teal)', pct: totalPr ? Math.round(confiable / totalPr * 100) : 0 },
    { label: 'Riesgo Medio',            count: medio,     color: 'var(--gold)', pct: totalPr ? Math.round(medio / totalPr * 100)     : 0 },
    { label: 'Alta Prob. de Fraude',    count: alto,      color: '#ff6b6b',     pct: totalPr ? Math.round(alto / totalPr * 100)      : 0 },
  ]

  const scoreColor = (v: number) => v >= 70 ? 'var(--teal)' : v >= 40 ? 'var(--gold)' : '#ff6b6b'

  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1)

  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '24px 28px',
    position: 'relative',
    overflow: 'hidden',
  }

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 44 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
            Overview
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>{todayCap}</p>
        </div>
        <Link
          href="/admin/candidates"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            background: 'var(--blue)', color: '#fff',
            borderRadius: 9, fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 2px 16px rgba(67,97,238,.25)',
            transition: 'opacity .2s',
          }}
        >
          Ver candidatos
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* Pipeline funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'En Progreso',      value: inProgress,    color: 'var(--gold)',  desc: 'no completados aún' },
          { label: 'Completados',      value: total || 0,    color: 'var(--blue)',  desc: 'assessment finalizado' },
          { label: 'Pendiente de Eval',value: pendingEval,   color: pendingEval > 0 ? '#ff6b6b' : 'var(--teal)', desc: 'sin evaluación IA' },
          { label: 'Evaluados',        value: evaluatedIds.size, color: 'var(--teal)', desc: 'con evaluación IA' },
        ].map(item => (
          <div key={item.label} style={{ ...card, padding: '16px 20px' }}>
            <div style={{ fontSize: 9.5, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: 4 }}>
              {item.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Primary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Total */}
        <div style={{ ...card, borderTop: '3px solid var(--blue)' }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 16 }}>
            Total Completados
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 52, fontWeight: 700, color: 'var(--blue)', lineHeight: 1, marginBottom: 8 }}>
            {total || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
            assessments finalizados
          </div>
        </div>

        {/* Score promedio */}
        <div style={{ ...card, borderTop: `3px solid ${scoreColor(avgOverall)}` }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 16 }}>
            Score Promedio
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 52, fontWeight: 700, color: scoreColor(avgOverall), lineHeight: 1, marginBottom: 8 }}>
            {avgOverall}%
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${avgOverall}%`, background: scoreColor(avgOverall), borderRadius: 2, transition: 'width 1s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>/100</span>
          </div>
        </div>

        {/* Integridad */}
        <div style={{ ...card, borderTop: '3px solid var(--muted)' }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 16 }}>
            Integridad
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 700, color: 'var(--teal)', lineHeight: 1 }}>{confiable}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans' }}>confiables</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'rgba(244,162,97,.1)', color: 'var(--gold)', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>
              {medio} medio
            </span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: 'rgba(233,69,96,.1)', color: '#ff6b6b', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>
              {alto} alto
            </span>
          </div>
        </div>
      </div>

      {/* Secondary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>

        {/* Math & Caso avg */}
        <div style={card}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 20 }}>
            Desglose de Scores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Matemáticas', value: avgMath, color: 'var(--teal)' },
              { label: 'Caso Práctico', value: avgCaso, color: 'var(--blue)' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif' }}>{m.label}</span>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.value}%`, background: m.color, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud distribution */}
        <div style={card}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 20 }}>
            Distribución de Integridad
          </div>
          {totalPr === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans', padding: '16px 0' }}>
              Sin datos aún.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fraudItems.map(fi => (
                <div key={fi.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans' }}>{fi.label}</span>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: fi.color }}>
                      {fi.count} · {fi.pct}%
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fi.pct}%`, background: fi.color, borderRadius: 3, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
