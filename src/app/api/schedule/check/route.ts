import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Colombia is UTC-5, no DST
function nowColombia() {
  const ms = Date.now() - 5 * 60 * 60 * 1000
  return new Date(ms)
}

function slotLabel(slotDate: string, slotHour: number): string {
  // Format like "lunes 5 de mayo, 6:00 PM – 7:00 PM"
  const [year, month, day] = slotDate.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const dayName = d.toLocaleDateString('es-CO', { weekday: 'long', timeZone: 'UTC' })
  const dayNum  = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  const fmtHour = (h: number) => {
    const ampm = h < 12 ? 'AM' : 'PM'
    const h12  = h % 12 === 0 ? 12 : h % 12
    return `${h12}:00 ${ampm}`
  }
  return `${dayName}, ${dayNum} · ${fmtHour(slotHour)} – ${fmtHour(slotHour + 1)}`
}

// GET /api/schedule/check?cohortId=X&email=Y
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cohortId = searchParams.get('cohortId')
  const email    = searchParams.get('email')

  if (!cohortId || !email) {
    return Response.json({ error: 'cohortId and email required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  const { data: booking } = await supabase
    .from('slot_bookings')
    .select('slot_date, slot_hour')
    .eq('cohort_id', cohortId)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (!booking) {
    return Response.json({ hasBooking: false })
  }

  const now = nowColombia()
  const todayStr  = now.toISOString().substring(0, 10)
  const nowHour   = now.getUTCHours()
  const isActiveNow = booking.slot_date === todayStr && booking.slot_hour === nowHour

  return Response.json({
    hasBooking: true,
    isActiveNow,
    slotDate: booking.slot_date,
    slotHour: booking.slot_hour,
    slotLabel: slotLabel(booking.slot_date, booking.slot_hour),
  })
}
