import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_HOURS = [4, 5, 18, 19, 20, 21, 22]
const CAPACITY = 10

// Colombia is UTC-5 (no DST)
function nowColombia() {
  const ms = Date.now() - 5 * 60 * 60 * 1000
  return new Date(ms)
}
function toColombia(d: Date) {
  return new Date(d.getTime() - 5 * 60 * 60 * 1000)
}

// POST /api/schedule/book
export async function POST(req: NextRequest) {
  try {
    const { cohortToken, email, slotDate, slotHour } = await req.json() as {
      cohortToken: string
      email: string
      slotDate: string   // 'YYYY-MM-DD'
      slotHour: number   // Colombia hour
    }

    if (!cohortToken || !email || !slotDate || slotHour === undefined) {
      return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    if (!VALID_HOURS.includes(slotHour)) {
      return Response.json({ error: 'Horario no válido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const normalizedEmail = email.toLowerCase().trim()

    // Validate cohort
    const { data: cohort } = await supabase
      .from('cohorts')
      .select('id, name, is_active, ends_at, requires_scheduling')
      .eq('invite_token', cohortToken)
      .maybeSingle()

    if (!cohort) return Response.json({ error: 'Cohorte no encontrada' }, { status: 404 })
    if (!cohort.is_active) return Response.json({ error: 'Esta cohorte no está activa' }, { status: 403 })
    if (cohort.ends_at && toColombia(new Date(cohort.ends_at)) < nowColombia()) {
      return Response.json({ error: 'Esta cohorte ha expirado' }, { status: 403 })
    }

    // Validate slot is in the future (Colombia time)
    const now = nowColombia()
    const nowDate = now.toISOString().substring(0, 10)
    const nowHour = now.getUTCHours()
    if (slotDate < nowDate || (slotDate === nowDate && slotHour <= nowHour)) {
      return Response.json({ error: 'Este horario ya pasó' }, { status: 400 })
    }

    // Check if email already has a booking for this cohort
    const { data: existing } = await supabase
      .from('slot_bookings')
      .select('id, slot_date, slot_hour')
      .eq('cohort_id', cohort.id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      // Return their existing booking (idempotent)
      return Response.json({
        ok: true,
        alreadyBooked: true,
        slotDate: existing.slot_date,
        slotHour: existing.slot_hour,
        cohortName: cohort.name,
      })
    }

    // Check slot capacity
    const { count } = await supabase
      .from('slot_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('cohort_id', cohort.id)
      .eq('slot_date', slotDate)
      .eq('slot_hour', slotHour)

    if ((count ?? 0) >= CAPACITY) {
      return Response.json({ error: 'Este horario está lleno. Elige otro.' }, { status: 409 })
    }

    // Create booking
    const { error: insertErr } = await supabase.from('slot_bookings').insert({
      cohort_id: cohort.id,
      email: normalizedEmail,
      slot_date: slotDate,
      slot_hour: slotHour,
    })

    if (insertErr) {
      // Could be a race-condition duplicate
      if (insertErr.code === '23505') {
        const { data: raceBooking } = await supabase
          .from('slot_bookings')
          .select('slot_date, slot_hour')
          .eq('cohort_id', cohort.id)
          .eq('email', normalizedEmail)
          .single()
        return Response.json({
          ok: true, alreadyBooked: true,
          slotDate: raceBooking?.slot_date ?? slotDate,
          slotHour: raceBooking?.slot_hour ?? slotHour,
          cohortName: cohort.name,
        })
      }
      return Response.json({ error: insertErr.message }, { status: 500 })
    }

    return Response.json({ ok: true, alreadyBooked: false, slotDate, slotHour, cohortName: cohort.name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
