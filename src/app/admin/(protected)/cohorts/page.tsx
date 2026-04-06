import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { NewCohortForm } from './NewCohortForm'

export default async function CohortsPage() {
  const supabase = createAdminClient()

  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('*')
    .order('created_at', { ascending: false })

  // Member counts per cohort
  const { data: memberCounts } = await supabase
    .from('cohort_members')
    .select('cohort_id')

  const countMap: Record<string, number> = {}
  for (const m of memberCounts ?? []) {
    countMap[m.cohort_id] = (countMap[m.cohort_id] ?? 0) + 1
  }

  const modeLabel: Record<string, string> = {
    global: 'Config global',
    fixed: 'Caso fijo',
    random: 'Random',
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <style>{`
        .cohort-card:hover {
          border-color: rgba(61,85,232,.3) !important;
          box-shadow: 0 0 0 3px rgba(61,85,232,.06) !important;
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
            Cohortes
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            Grupos de candidatos con configuración propia de challenges y caso práctico.
          </p>
        </div>
      </div>

      {/* New cohort form */}
      <NewCohortForm />

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '32px 0' }} />

      {/* List */}
      {!cohorts || cohorts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
            Sin cohortes aún
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
            Crea tu primera cohorte arriba para empezar.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cohorts.map(c => {
            const count = countMap[c.id] ?? 0
            const isActive = c.is_active
            const now = new Date()
            const started = !c.starts_at || new Date(c.starts_at) <= now
            const ended = c.ends_at && new Date(c.ends_at) < now
            const statusLabel = !isActive ? 'Inactiva' : ended ? 'Expirada' : !started ? 'Pendiente' : 'Activa'
            const statusColor = !isActive || ended ? 'var(--muted)' : !started ? '#f59e0b' : '#00d68a'
            const statusBg = !isActive || ended ? 'rgba(255,255,255,.04)' : !started ? 'rgba(245,158,11,.1)' : 'rgba(0,214,138,.1)'

            return (
              <Link key={c.id} href={`/admin/cohorts/${c.id}`} style={{ textDecoration: 'none' }}>
                <div className="cohort-card" style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  transition: 'border-color .15s, box-shadow .15s',
                  cursor: 'pointer',
                }}>
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusColor, flexShrink: 0,
                    boxShadow: isActive && !ended && started ? `0 0 6px ${statusColor}` : 'none',
                  }} />

                  {/* Name + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                      {c.name}
                    </div>
                    {c.description && (
                      <div style={{ fontSize: 12.5, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10.5, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                      padding: '3px 9px', borderRadius: 100,
                      background: statusBg, color: statusColor,
                      border: `1px solid ${statusColor}30`,
                      fontWeight: 600, letterSpacing: '.4px',
                    }}>
                      {statusLabel}
                    </span>

                    <span style={{
                      fontSize: 10.5, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                      padding: '3px 9px', borderRadius: 100,
                      background: 'rgba(61,85,232,.07)', color: '#8098f8',
                      border: '1px solid rgba(61,85,232,.12)',
                      letterSpacing: '.3px',
                    }}>
                      {count} candidato{count !== 1 ? 's' : ''}
                    </span>

                    <span style={{
                      fontSize: 10.5, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                      padding: '3px 9px', borderRadius: 100,
                      background: 'rgba(255,255,255,.04)', color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      letterSpacing: '.3px',
                    }}>
                      {modeLabel[c.caso_mode] ?? c.caso_mode}
                      {c.difficulty_filter ? ` · ${c.difficulty_filter}` : ''}
                    </span>

                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Inter, DM Sans, sans-serif' }}>
                      Ver →
                    </span>
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
