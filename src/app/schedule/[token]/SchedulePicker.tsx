'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const VALID_HOURS = [4, 5, 18, 19, 20, 21, 22]
const CAPACITY = 10

function fmtHour(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 === 0 ? 12 : h % 12
  return `${h12}:00 ${ampm}`
}

function fmtDate(dateStr: string): { weekday: string; dayMonth: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekday  = date.toLocaleDateString('es-CO', { weekday: 'long', timeZone: 'UTC' })
  const dayMonth = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    dayMonth,
  }
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + n)
  return date.toISOString().substring(0, 10)
}

function generateDates(todayStr: string, endStr: string): string[] {
  const dates: string[] = []
  let cur = todayStr
  while (cur <= endStr && dates.length < 14) {
    dates.push(cur)
    cur = addDays(cur, 1)
  }
  return dates
}

interface Props {
  cohortToken: string
  cohortId: string
  cohortName: string
  todayStr: string
  endStr: string
  nowHour: number
  bookedCounts: Record<string, number>  // "YYYY-MM-DD_HH" → count
  assessmentUrl: string
}

type Phase = 'pick' | 'confirmed'

export function SchedulePicker({
  cohortToken, cohortName, todayStr, endStr, nowHour, bookedCounts, assessmentUrl
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [email, setEmail]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [phase, setPhase]               = useState<Phase>('pick')
  const [confirmedSlot, setConfirmedSlot] = useState<{ date: string; hour: number; alreadyBooked: boolean } | null>(null)
  const [localCounts, setLocalCounts]   = useState<Record<string, number>>(bookedCounts)

  const dates = useMemo(() => generateDates(todayStr, endStr), [todayStr, endStr])

  function slotKey(date: string, hour: number) { return `${date}_${hour}` }
  function bookedFor(date: string, hour: number) { return localCounts[slotKey(date, hour)] ?? 0 }
  function isPast(date: string, hour: number) {
    if (date < todayStr) return true
    if (date === todayStr && hour <= nowHour) return true
    return false
  }
  function isFull(date: string, hour: number) { return bookedFor(date, hour) >= CAPACITY }

  const morningHours  = [4, 5]
  const eveningHours  = [18, 19, 20, 21, 22]

  async function handleBook() {
    if (!selectedDate || selectedHour === null || !email.trim()) {
      setError('Por favor selecciona fecha, hora e ingresa tu correo.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Ingresa un correo válido.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/schedule/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortToken,
          email: email.trim().toLowerCase(),
          slotDate: selectedDate,
          slotHour: selectedHour,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al reservar. Intenta de nuevo.')
        return
      }
      // Update local counts optimistically
      if (!data.alreadyBooked) {
        const k = slotKey(data.slotDate, data.slotHour)
        setLocalCounts(prev => ({ ...prev, [k]: (prev[k] ?? 0) + 1 }))
      }
      setConfirmedSlot({ date: data.slotDate, hour: data.slotHour, alreadyBooked: data.alreadyBooked ?? false })
      setPhase('confirmed')
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Confirmed screen ─── */
  if (phase === 'confirmed' && confirmedSlot) {
    const { date, hour, alreadyBooked } = confirmedSlot
    const { weekday, dayMonth } = fmtDate(date)
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🗓</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 10 }}>
            {alreadyBooked ? '¡Ya tienes un horario reservado!' : '¡Horario reservado!'}
          </h1>
          <p style={{ color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
            Tu lugar está confirmado para el assessment de <strong style={{ color: 'var(--text)' }}>{cohortName}</strong>.
          </p>

          {/* Slot card */}
          <div style={{ background: 'rgba(67,97,238,.08)', border: '1px solid rgba(67,97,238,.25)', borderRadius: 14, padding: '22px 28px', marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(67,97,238,.8)', marginBottom: 10 }}>
              Tu horario
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'Fraunces, serif', marginBottom: 4 }}>
              {weekday} · {dayMonth}
            </div>
            <div style={{ fontSize: 18, color: '#8098f8', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
              {fmtHour(hour)} – {fmtHour(hour + 1)}
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
              ⏰ Solo podrás acceder al assessment durante este horario.<br />
              Guarda esta información para no olvidarla.
            </div>
          </div>

          {/* CTA */}
          <a
            href={assessmentUrl}
            style={{
              display: 'inline-block', padding: '14px 36px',
              background: 'linear-gradient(140deg,#3d55e8,#2841c8)',
              color: '#fff', textDecoration: 'none',
              borderRadius: 10, fontSize: 15, fontWeight: 700,
              boxShadow: '0 4px 20px rgba(61,85,232,.4)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Ir al Assessment →
          </a>
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
            El botón funcionará solo durante tu horario reservado.
          </p>
        </div>
      </main>
    )
  }

  /* ─── Slot picker ─── */
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
            Rappi Assessment Center
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 10 }}>
            Reserva tu horario
          </h1>
          <p style={{ color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Selecciona el día y la hora en que realizarás el assessment <strong style={{ color: 'var(--text)' }}>{cohortName}</strong>.
            Cada bloque tiene máximo 10 cupos para garantizar la calidad de la experiencia.
          </p>
        </div>

        {/* Info banner */}
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.18)', borderLeft: '3px solid #f59e0b', borderRadius: 9, marginBottom: 32, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.6 }}>
          <strong style={{ color: '#f59e0b' }}>⚠ Importante:</strong> Solo podrás acceder al assessment durante el horario que reserves.
          Horarios disponibles: 4:00 AM – 6:00 AM y 6:00 PM – 11:00 PM (hora Colombia).
        </div>

        {/* Email input */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 12, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8 }}>
            Tu correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 9, fontSize: 14,
              fontFamily: 'DM Sans, sans-serif',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </div>

        {/* Date selection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12 }}>
            Selecciona un día
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dates.map(date => {
              const { weekday, dayMonth } = fmtDate(date)
              const allPast = VALID_HOURS.every(h => isPast(date, h))
              const allFull = VALID_HOURS.every(h => isFull(date, h))
              const disabled = allPast || allFull
              const active = selectedDate === date
              return (
                <button
                  key={date}
                  onClick={() => { if (!disabled) { setSelectedDate(date); setSelectedHour(null) } }}
                  disabled={disabled}
                  style={{
                    padding: '10px 14px', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
                    background: active ? 'rgba(67,97,238,.15)' : 'rgba(255,255,255,.04)',
                    border: active ? '1px solid rgba(67,97,238,.4)' : '1px solid rgba(255,255,255,.08)',
                    color: disabled ? 'var(--muted)' : active ? '#8098f8' : 'var(--dim)',
                    opacity: disabled ? 0.4 : 1,
                    textAlign: 'center', minWidth: 72,
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>
                    {weekday.slice(0, 3)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Fraunces, serif' }}>
                    {dayMonth}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div style={{ marginBottom: 32 }}>
            {/* Morning slots */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 10 }}>
                🌙 Madrugada
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {morningHours.map(hour => {
                  const booked  = bookedFor(selectedDate, hour)
                  const past    = isPast(selectedDate, hour)
                  const full    = booked >= CAPACITY
                  const disabled = past || full
                  const active  = selectedHour === hour
                  const spotsLeft = CAPACITY - booked
                  return (
                    <SlotButton
                      key={hour}
                      hour={hour}
                      booked={booked}
                      spotsLeft={spotsLeft}
                      past={past}
                      full={full}
                      disabled={disabled}
                      active={active}
                      onClick={() => { if (!disabled) setSelectedHour(hour) }}
                    />
                  )
                })}
              </div>
            </div>

            {/* Evening slots */}
            <div>
              <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 10 }}>
                🌆 Noche
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {eveningHours.map(hour => {
                  const booked  = bookedFor(selectedDate, hour)
                  const past    = isPast(selectedDate, hour)
                  const full    = booked >= CAPACITY
                  const disabled = past || full
                  const active  = selectedHour === hour
                  const spotsLeft = CAPACITY - booked
                  return (
                    <SlotButton
                      key={hour}
                      hour={hour}
                      booked={booked}
                      spotsLeft={spotsLeft}
                      past={past}
                      full={full}
                      disabled={disabled}
                      active={active}
                      onClick={() => { if (!disabled) setSelectedHour(hour) }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(233,69,96,.08)', border: '1px solid rgba(233,69,96,.25)', borderRadius: 8, marginBottom: 18, fontSize: 13, color: '#ff6b6b', fontFamily: 'DM Sans, sans-serif' }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleBook}
          disabled={loading || !selectedDate || selectedHour === null || !email.trim()}
          style={{
            width: '100%', padding: '15px 24px',
            background: (loading || !selectedDate || selectedHour === null || !email.trim())
              ? 'rgba(61,85,232,.3)' : 'linear-gradient(140deg,#3d55e8,#2841c8)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
            cursor: (loading || !selectedDate || selectedHour === null || !email.trim()) ? 'not-allowed' : 'pointer',
            boxShadow: (loading || !selectedDate || selectedHour === null || !email.trim()) ? 'none' : '0 4px 20px rgba(61,85,232,.4)',
            transition: 'all .2s',
          }}
        >
          {loading ? 'Reservando...' : selectedDate && selectedHour !== null
            ? `Reservar ${fmtDate(selectedDate).weekday} ${fmtHour(selectedHour)} →`
            : 'Selecciona día y horario para continuar'}
        </button>

        <p style={{ marginTop: 14, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', lineHeight: 1.6 }}>
          Al reservar, recibirás acceso al assessment únicamente durante el horario seleccionado.
          Si el botón no funciona durante tu horario, recarga la página.
        </p>
      </div>
    </main>
  )
}

/* ─── Slot Button ─── */
function SlotButton({
  hour, booked, spotsLeft, past, full, disabled, active, onClick
}: {
  hour: number; booked: number; spotsLeft: number; past: boolean; full: boolean
  disabled: boolean; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 16px', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'rgba(67,97,238,.15)' : 'rgba(255,255,255,.04)',
        border: active ? '1px solid rgba(67,97,238,.4)' : '1px solid rgba(255,255,255,.08)',
        color: disabled ? 'var(--muted)' : active ? '#8098f8' : 'var(--dim)',
        opacity: disabled ? 0.4 : 1, textAlign: 'center', minWidth: 130,
        transition: 'all .15s',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginBottom: 4 }}>
        {fmtHour(hour)} – {fmtHour(hour + 1)}
      </div>
      <div style={{
        fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px',
        color: full ? '#ff6b6b' : past ? 'var(--muted)' : spotsLeft <= 3 ? '#f59e0b' : '#06d6a0',
      }}>
        {past ? 'Pasado' : full ? 'LLENO' : `${spotsLeft}/${booked + spotsLeft} cupos`}
      </div>
    </button>
  )
}
