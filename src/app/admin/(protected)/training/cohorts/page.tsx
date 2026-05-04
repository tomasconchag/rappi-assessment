import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { NewTrainingCohortForm } from './NewTrainingCohortForm'

export default async function TrainingCohortsPage() {
  const supabase = createAdminClient()

  const [{ data: cohorts }, { data: memberCounts }] = await Promise.all([
    supabase.from('training_cohorts').select('*').order('created_at', { ascending: false }),
    supabase.from('training_cohort_members').select('cohort_id'),
  ])

  const countMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    countMap[m.cohort_id] = (countMap[m.cohort_id] ?? 0) + 1
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <style>{`.tcohort-card:hover { border-color: rgba(6,214,160,.3) !important; box-shadow: 0 0 0 3px rgba(6,214,160,.05) !important; }`}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
            Cohortes Training
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            Grupos de farmers con su propio set de documentos de training.
          </p>
        </div>
      </div>

      <NewTrainingCohortForm />

      <div style={{ height: 1, background: 'var(--border)', margin: '32px 0' }} />

      {!cohorts || cohorts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏋️</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Sin cohortes de training aún</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans' }}>Crea tu primera cohorte arriba.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cohorts.map(c => {
            const count = countMap[c.id] ?? 0
            const now = new Date()
            const ended = c.ends_at && new Date(c.ends_at) < now
            const statusLabel = !c.is_active ? 'Inactiva' : ended ? 'Expirada' : 'Activa'
            const statusColor = !c.is_active || ended ? 'var(--muted)' : '#06d6a0'
            const statusBg = !c.is_active || ended ? 'rgba(255,255,255,.04)' : 'rgba(6,214,160,.1)'
            const docCount = (c.doc_ids ?? []).length

            return (
              <Link key={c.id} href={`/admin/training/cohorts/${c.id}`} style={{ textDecoration: 'none' }}>
                <div className="tcohort-card" style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '18px 22px',
                  display: 'flex', alignItems: 'center', gap: 20,
                  transition: 'border-color .15s, box-shadow .15s', cursor: 'pointer',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: statusColor !== 'var(--muted)' ? `0 0 6px ${statusColor}` : 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: 12.5, color: 'var(--dim)', fontFamily: 'DM Sans', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10.5, fontFamily: 'Space Mono, monospace', padding: '3px 9px', borderRadius: 100, background: statusBg, color: statusColor, border: `1px solid ${statusColor}30`, fontWeight: 600 }}>{statusLabel}</span>
                    <span style={{ fontSize: 10.5, fontFamily: 'Space Mono, monospace', padding: '3px 9px', borderRadius: 100, background: 'rgba(245,158,11,.07)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.15)' }}>
                      {docCount} doc{docCount !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 10.5, fontFamily: 'Space Mono, monospace', padding: '3px 9px', borderRadius: 100, background: 'rgba(67,97,238,.07)', color: '#8098f8', border: '1px solid rgba(67,97,238,.12)' }}>
                      {count} farmer{count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans' }}>Ver →</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
