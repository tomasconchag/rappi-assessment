import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TrainingCohortEditor } from './TrainingCohortEditor'
import { TrainingMembersPanel } from './TrainingMembersPanel'

export default async function TrainingCohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: cohort }, { data: docs }, { data: members }] = await Promise.all([
    supabase.from('training_cohorts').select('*').eq('id', id).single(),
    supabase.from('training_documents').select('id, name, file_size').order('created_at', { ascending: false }),
    supabase.from('training_cohort_members').select('*').eq('cohort_id', id).order('created_at', { ascending: false }),
  ])

  if (!cohort) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'
  const inviteUrl = `${baseUrl}/training?c=${cohort.invite_token}`

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 12.5, fontFamily: 'DM Sans', color: 'var(--muted)' }}>
        <Link href="/admin/training/cohorts" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Cohortes Training</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span style={{ color: 'var(--text)' }}>{cohort.name}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {cohort.name}
          </h1>
          <span style={{
            fontSize: 10.5, fontFamily: 'Space Mono, monospace', padding: '3px 9px', borderRadius: 100, fontWeight: 600,
            background: cohort.is_active ? 'rgba(6,214,160,.1)' : 'rgba(255,255,255,.04)',
            color: cohort.is_active ? '#06d6a0' : 'var(--muted)',
            border: `1px solid ${cohort.is_active ? 'rgba(6,214,160,.2)' : 'var(--border)'}`,
          }}>
            {cohort.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>

        {/* Invite URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: 'rgba(67,97,238,.06)', border: '1px solid rgba(67,97,238,.15)', borderRadius: 9 }}>
          <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: '#8098f8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteUrl}</span>
          <button
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, background: 'rgba(67,97,238,.15)', border: '1px solid rgba(67,97,238,.3)', color: '#8098f8', fontFamily: 'DM Sans', cursor: 'pointer', flexShrink: 0 }}
          >
            Copiar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: config + doc selection */}
        <TrainingCohortEditor cohort={cohort} allDocs={docs ?? []} />

        {/* Right: members + invite */}
        <TrainingMembersPanel cohortId={id} cohortName={cohort.name} members={members ?? []} inviteUrl={inviteUrl} />
      </div>
    </div>
  )
}
