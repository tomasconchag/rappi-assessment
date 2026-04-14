import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CohortEditor } from './CohortEditor'
import type { CasoBankEntry } from '@/types/assessment'
import { MembersPanel } from './MembersPanel'
import { CopyButton } from './CopyButton'

export default async function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: cohort }, { data: cases }, { data: rpCases }, { data: members }] = await Promise.all([
    supabase.from('cohorts').select('*').eq('id', id).single(),
    supabase.from('caso_bank').select('id, title, difficulty').order('sort_order', { ascending: true }),
    supabase.from('roleplay_bank').select('id, restaurant_name, difficulty').order('created_at', { ascending: true }),
    supabase
      .from('cohort_members')
      .select('*')
      .eq('cohort_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!cohort) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'
  const inviteUrl = `${baseUrl}/assessment?c=${cohort.invite_token}`

  const enrichedMembers = members ?? []

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 12.5, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--muted)' }}>
        <Link href="/admin/cohorts" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
          Cohortes
        </Link>
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
            fontSize: 10.5, fontFamily: 'JetBrains Mono, Space Mono, monospace',
            padding: '3px 9px', borderRadius: 100, fontWeight: 600, letterSpacing: '.4px',
            background: cohort.is_active ? 'rgba(0,214,138,.1)' : 'rgba(255,255,255,.04)',
            color: cohort.is_active ? '#00d68a' : 'var(--muted)',
            border: `1px solid ${cohort.is_active ? 'rgba(0,214,138,.2)' : 'var(--border)'}`,
          }}>
            {cohort.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        {cohort.description && (
          <p style={{ fontSize: 13.5, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', margin: 0 }}>
            {cohort.description}
          </p>
        )}
      </div>

      {/* Invite link */}
      <div style={{
        background: 'rgba(61,85,232,.06)',
        border: '1px solid rgba(61,85,232,.18)',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px', color: '#8098f8', flexShrink: 0 }}>
          Link de invitación
        </span>
        <code style={{ flex: 1, fontSize: 12.5, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--text)', wordBreak: 'break-all' }}>
          {inviteUrl}
        </code>
        <CopyButton text={inviteUrl} />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <CohortEditor
          cohort={cohort}
          cases={(cases ?? []) as Pick<CasoBankEntry, 'id' | 'title' | 'difficulty'>[]}
          rpCases={(rpCases ?? []) as { id: string; restaurant_name: string; difficulty: string }[]}
        />
        <MembersPanel
          cohortId={id}
          members={enrichedMembers}
        />
      </div>
    </div>
  )
}

