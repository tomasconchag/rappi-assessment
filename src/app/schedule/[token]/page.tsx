import { createAdminClient } from '@/lib/supabase/admin'
import { SchedulePicker } from './SchedulePicker'

// Colombia is UTC-5, no DST
function nowColombia() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000)
}

export default async function SchedulePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const supabase = createAdminClient()

  // Validate cohort
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, name, is_active, ends_at, starts_at, requires_scheduling')
    .eq('invite_token', token)
    .maybeSingle()

  if (!cohort || !cohort.is_active) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            Enlace no válido
          </h1>
          <p style={{ color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
            Este enlace de agendamiento no es válido o la convocatoria ya cerró.
          </p>
        </div>
      </main>
    )
  }

  // Compute available date range (Colombia time)
  const now = nowColombia()
  const todayStr = now.toISOString().substring(0, 10)

  // Start from today; end at cohort.ends_at or 14 days out
  let endStr: string
  if (cohort.ends_at) {
    const endCol = new Date(new Date(cohort.ends_at).getTime() - 5 * 60 * 60 * 1000)
    endStr = endCol.toISOString().substring(0, 10)
  } else {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() + 14)
    endStr = d.toISOString().substring(0, 10)
  }
  if (endStr < todayStr) endStr = todayStr

  // Fetch existing bookings (for capacity display)
  const { data: allBookings } = await supabase
    .from('slot_bookings')
    .select('slot_date, slot_hour')
    .eq('cohort_id', cohort.id)
    .gte('slot_date', todayStr)

  // Build booked counts map: "YYYY-MM-DD_HH" → count
  const bookedCounts: Record<string, number> = {}
  allBookings?.forEach(b => {
    const key = `${b.slot_date}_${b.slot_hour}`
    bookedCounts[key] = (bookedCounts[key] || 0) + 1
  })

  return (
    <SchedulePicker
      cohortToken={token}
      cohortId={cohort.id}
      cohortName={cohort.name}
      todayStr={todayStr}
      endStr={endStr}
      nowHour={now.getUTCHours()}
      bookedCounts={bookedCounts}
      assessmentUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'}/assessment?c=${token}`}
    />
  )
}
