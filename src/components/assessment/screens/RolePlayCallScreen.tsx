'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onDone: () => void
  cameraStream: MediaStream | null
  voiceProvider: 'vapi' | 'arbol'
  candidatePhone?: string
}

const TOTAL_SECONDS = 5 * 60

const salesData   = [50, 77, 61, 52, 76, 74, 74]
const salesLabels = ['Oct W1', 'Oct W2', 'Oct W3', 'Nov W1', 'Nov W2', 'Nov W3', 'Nov W4']

function playBeep(frequency: number, duration: number, times = 1) {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < times; i++) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = frequency
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.4)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.4 + duration)
      osc.start(ctx.currentTime + i * 0.4)
      osc.stop(ctx.currentTime + i * 0.4 + duration)
    }
  } catch { /* ignore */ }
}

type CallStatus = 'connecting' | 'active' | 'ended'

export function RolePlayCallScreen({ onDone, cameraStream, voiceProvider, candidatePhone }: Props) {
  const [secondsLeft,  setSecondsLeft]  = useState(TOTAL_SECONDS)
  const [callDuration, setCallDuration] = useState(0)
  const [confirmEnd,   setConfirmEnd]   = useState(false)
  const [callStatus,   setCallStatus]   = useState<CallStatus>('connecting')
  const [isMuted,      setIsMuted]      = useState(false)
  const [isSpeakerOn,  setIsSpeakerOn]  = useState(true)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [callError,    setCallError]    = useState<string | null>(null)

  const warned60Ref    = useRef(false)
  const endedRef       = useRef(false)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef        = useRef<any>(null)
  const vapiCallIdRef  = useRef<string | null>(null)
  const arbolConvIdRef = useRef<string | null>(null)
  const arbolPollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Attach camera stream to PiP video element
  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  // Duration timer — starts when call becomes active
  useEffect(() => {
    if (callStatus !== 'active') return
    durationRef.current = setInterval(() => {
      setCallDuration(d => d + 1)
    }, 1000)
    return () => {
      if (durationRef.current) clearInterval(durationRef.current)
    }
  }, [callStatus])

  // ── Vapi integration ──────────────────────────────────────────────────────
  useEffect(() => {
    if (voiceProvider !== 'vapi') return
    let cancelled = false

    async function startVapi() {
      try {
        const VapiModule = await import('@vapi-ai/web')
        const Vapi = VapiModule.default
        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
        const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID
        if (!publicKey || !assistantId) throw new Error('Vapi keys not configured')

        const vapi = new Vapi(publicKey)
        vapiRef.current = vapi

        vapi.on('call-start', () => {
          if (cancelled) return
          setCallStatus('active')
        })

        vapi.on('call-start-success', (event: { callId?: string }) => {
          if (cancelled) return
          if (event?.callId) vapiCallIdRef.current = event.callId
        })

        vapi.on('call-end', () => {
          if (cancelled) return
          setCallStatus('ended')
          finalize()
        })

        vapi.on('speech-start', () => {
          if (!cancelled) setAgentSpeaking(true)
        })

        vapi.on('speech-end', () => {
          if (!cancelled) setAgentSpeaking(false)
        })

        vapi.on('error', (e: unknown) => {
          if (!cancelled) {
            const msg = e instanceof Error ? e.message : String(e)
            setCallError(`Vapi error: ${msg}`)
            setCallStatus('ended')
          }
        })

        await vapi.start(assistantId)
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e)
          setCallError(`No se pudo iniciar la llamada: ${msg}`)
          setCallStatus('ended')
        }
      }
    }

    startVapi()

    return () => {
      cancelled = true
      if (vapiRef.current) {
        try { vapiRef.current.stop() } catch { /* ignore */ }
        vapiRef.current = null
      }
    }
  }, [voiceProvider]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Arbol integration ─────────────────────────────────────────────────────
  useEffect(() => {
    if (voiceProvider !== 'arbol') return
    let cancelled = false

    async function startArbol() {
      try {
        const res = await fetch('/api/arbol-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: 'rappi-ventas-restaurante',
            phone: candidatePhone,
            variables: { restaurant: 'Heladería La Fiore', contact: 'Valentina Ríos' },
          }),
        })
        if (!res.ok) throw new Error(`Arbol API error ${res.status}`)
        const { conversationId, error } = await res.json()
        if (error) throw new Error(error)
        if (cancelled) return

        arbolConvIdRef.current = conversationId
        setCallStatus('active')

        // Poll every 3s for status
        arbolPollRef.current = setInterval(async () => {
          try {
            const poll = await fetch(`/api/arbol-call?conversationId=${conversationId}`)
            if (!poll.ok) return
            const data = await poll.json() as { status: string; transcript: string; duration: number | null }
            if (data.status === 'completed' || data.status === 'failed') {
              if (arbolPollRef.current) clearInterval(arbolPollRef.current)
              if (!cancelled) finalize()
            }
            // Simulate speaking indicator based on status
            if (data.status === 'in-progress') {
              if (!cancelled) setAgentSpeaking(prev => !prev) // toggle for visual feedback
            }
          } catch { /* ignore */ }
        }, 3000)
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e)
          setCallError(`No se pudo iniciar la llamada: ${msg}`)
          setCallStatus('ended')
        }
      }
    }

    startArbol()

    return () => {
      cancelled = true
      if (arbolPollRef.current) clearInterval(arbolPollRef.current)
    }
  }, [voiceProvider, candidatePhone]) // eslint-disable-line react-hooks/exhaustive-deps

  const finalize = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    setCallStatus('ended')
    if (arbolPollRef.current) clearInterval(arbolPollRef.current)
    if (vapiRef.current) {
      try { vapiRef.current.stop() } catch { /* ignore */ }
    }
    playBeep(440, 0.5, 1)
    setTimeout(() => onDone(), 1500)
  }, [onDone])

  // 5-minute countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1
        if (next === 60 && !warned60Ref.current) {
          warned60Ref.current = true
          playBeep(800, 0.15, 2)
        }
        if (next <= 0) {
          clearInterval(interval)
          finalize()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [finalize])

  const handleMute = () => {
    setIsMuted(m => {
      const next = !m
      if (vapiRef.current) {
        try { vapiRef.current.setMuted(next) } catch { /* ignore */ }
      }
      return next
    })
  }

  const handleSpeaker = () => {
    setIsSpeakerOn(s => !s)
  }

  const mins  = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs  = String(secondsLeft % 60).padStart(2, '0')
  const isRed = secondsLeft <= 60

  const durMins = String(Math.floor(callDuration / 60)).padStart(2, '0')
  const durSecs = String(callDuration % 60).padStart(2, '0')

  const maxBar = Math.max(...salesData)

  const callStatusLabel =
    callStatus === 'connecting' ? 'Llamando...' :
    callStatus === 'active'     ? 'En llamada'  :
    'Llamada terminada'

  const callStatusColor =
    callStatus === 'connecting' ? '#f59e0b' :
    callStatus === 'active'     ? '#00d68a' :
    '#ff6b6b'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg, #06060d)', zIndex: 100, overflow: 'hidden',
    }}>

      {/* Camera PiP overlay */}
      {cameraStream && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 500,
          width: 160, height: 120, borderRadius: 10, overflow: 'hidden',
          border: '2px solid rgba(255,255,255,.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,.5)', background: '#000',
        }}>
          <video
            ref={cameraVideoRef}
            autoPlay muted playsInline
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', transform: 'scaleX(-1)', display: 'block',
            }}
          />
          <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff6b6b', animation: 'rec-pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 7.5, color: 'rgba(255,255,255,.8)', letterSpacing: '1px', textTransform: 'uppercase' }}>En vivo</span>
          </div>
        </div>
      )}

      {/* Timer bar */}
      <div style={{
        flexShrink: 0,
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '12px 24px',
        background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10,
      }}>
        {/* Left: REC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff6b6b', animation: 'rec-pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#ff6b6b', letterSpacing: '1px', textTransform: 'uppercase' }}>REC</span>
        </div>

        {/* Center: countdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)' }}>
            Tiempo restante
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 28, fontWeight: 700,
            letterSpacing: '2px', color: isRed ? '#ff6b6b' : 'var(--text)',
            transition: 'color .5s ease', lineHeight: 1,
          }}>
            {mins}:{secs}
          </span>
          {isRed && (
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#ff6b6b', letterSpacing: '1px', animation: 'rec-pulse 1.5s ease-in-out infinite' }}>
              ¡ÚLTIMO MINUTO!
            </span>
          )}
        </div>

        {/* Right: end button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: 160 }}>
          {!confirmEnd ? (
            <button
              onClick={() => setConfirmEnd(true)}
              style={{
                padding: '6px 14px', borderRadius: 7,
                background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.3)',
                color: '#ff6b6b', fontFamily: 'Space Mono, monospace', fontSize: 10,
                letterSpacing: '.5px', cursor: 'pointer', textTransform: 'uppercase',
              }}
            >
              Terminar llamada
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--muted)', letterSpacing: '.3px' }}>¿Confirmas?</span>
              <button onClick={finalize} style={{ padding: '6px 14px', borderRadius: 7, background: 'rgba(255,107,107,.2)', border: '1px solid rgba(255,107,107,.5)', color: '#ff6b6b', fontFamily: 'Space Mono, monospace', fontSize: 10, letterSpacing: '.5px', cursor: 'pointer', fontWeight: 700 }}>
                Sí, terminar
              </button>
              <button onClick={() => setConfirmEnd(false)} style={{ padding: '6px 14px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'Space Mono, monospace', fontSize: 10, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main two-column layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left 45% — Phone UI */}
        <div style={{
          width: '45%', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px', borderRight: '1px solid var(--border)',
          gap: 16,
        }}>

          {/* Smartphone frame */}
          <div style={{
            width: 280, height: 520,
            background: '#0a0a0a',
            borderRadius: 36,
            border: '1.5px solid rgba(255,255,255,.12)',
            boxShadow: '0 8px 48px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}>

            {/* Speaker grille (decorative) */}
            <div style={{
              marginTop: 18, width: 50, height: 5, borderRadius: 3,
              background: 'rgba(255,255,255,.12)',
              flexShrink: 0,
            }} />

            {/* Contact area */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 14, padding: '0 20px',
            }}>
              {/* Avatar */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(140deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700, color: '#fff',
                fontFamily: 'Fraunces, serif',
                boxShadow: '0 0 0 4px rgba(245,158,11,.15)',
              }}>
                V
              </div>

              {/* Contact name */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 20,
                  fontWeight: 700, color: '#fff', lineHeight: 1.2,
                }}>
                  Valentina Ríos
                </div>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                  color: 'rgba(255,255,255,.5)', marginTop: 4,
                }}>
                  Heladería La Fiore · Cali
                </div>
              </div>

              {/* Call status */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 11,
                  color: callStatusColor, letterSpacing: '.5px',
                  textTransform: 'uppercase',
                }}>
                  {callStatusLabel}
                </div>

                {/* Duration timer */}
                {callStatus === 'active' && (
                  <div style={{
                    fontFamily: 'Space Mono, monospace', fontSize: 14,
                    color: 'rgba(255,255,255,.7)', letterSpacing: '2px',
                  }}>
                    {durMins}:{durSecs}
                  </div>
                )}

                {/* Error message */}
                {callError && (
                  <div style={{
                    fontSize: 10, fontFamily: 'DM Sans, sans-serif',
                    color: '#ff6b6b', textAlign: 'center', padding: '0 8px',
                    lineHeight: 1.4,
                  }}>
                    {callError}
                  </div>
                )}
              </div>

              {/* Sound wave animation when agent is speaking */}
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 4, height: 32,
                opacity: agentSpeaking && callStatus === 'active' ? 1 : 0.1,
                transition: 'opacity .3s ease',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 4, borderRadius: 2,
                    background: '#00d68a',
                    height: agentSpeaking ? `${[18, 28, 14][i]}px` : '6px',
                    animation: agentSpeaking ? `sound-bar-${i} 0.6s ease-in-out infinite alternate` : 'none',
                    transition: 'height .2s ease',
                  }} />
                ))}
              </div>
            </div>

            {/* Bottom buttons */}
            <div style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 24, paddingBottom: 36, paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,.07)', width: '100%',
            }}>
              {/* Mute button */}
              <button
                onClick={handleMute}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: isMuted ? 'rgba(255,107,107,.2)' : 'rgba(255,255,255,.1)',
                  border: `1.5px solid ${isMuted ? 'rgba(255,107,107,.4)' : 'rgba(255,255,255,.15)'}`,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                  transition: 'all .2s',
                }}
                title={isMuted ? 'Activar micrófono' : 'Silenciar'}
              >
                {isMuted ? '🔇' : '🎙️'}
              </button>

              {/* End call button */}
              <button
                onClick={finalize}
                style={{
                  width: 68, height: 68, borderRadius: '50%',
                  background: 'linear-gradient(140deg, #e03554, #c22448)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                  boxShadow: '0 4px 20px rgba(224,53,84,.5)',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                }}
                title="Terminar llamada"
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
              >
                📵
              </button>

              {/* Speaker button (Vapi only, disabled for Arbol) */}
              <button
                onClick={voiceProvider === 'vapi' ? handleSpeaker : undefined}
                disabled={voiceProvider === 'arbol'}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: isSpeakerOn ? 'rgba(0,214,138,.15)' : 'rgba(255,255,255,.1)',
                  border: `1.5px solid ${isSpeakerOn ? 'rgba(0,214,138,.3)' : 'rgba(255,255,255,.15)'}`,
                  cursor: voiceProvider === 'arbol' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, opacity: voiceProvider === 'arbol' ? 0.4 : 1,
                  transition: 'all .2s',
                }}
                title="Altavoz"
              >
                {isSpeakerOn ? '🔊' : '🔈'}
              </button>
            </div>
          </div>

          {/* Provider label */}
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: 9,
            letterSpacing: '1px', color: 'var(--muted)',
            textTransform: 'uppercase', textAlign: 'center',
          }}>
            {voiceProvider === 'vapi' ? '🎙️ Vapi · Llamada de voz IA' : '📞 Arbol AI · Llamada real'}
          </div>
        </div>

        {/* Right 55% — CRM Panel */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0,
        }}>

          {/* Client header */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              Información del cliente
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
              Heladería La Fiore
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.6 }}>
              Dueña · <strong style={{ color: 'var(--text)' }}>Valentina Ríos</strong>
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Helados · Cali, Colombia &nbsp;|&nbsp; Mié–Lun · 3:00 pm – 9:30 pm
            </div>
          </div>

          {/* Stats 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { value: '$29.900',  label: 'Ticket prom.'  },
              { value: '~70–75',   label: 'Pedidos/sem'   },
              { value: '2+ meses', label: 'Sin cambios'   },
              { value: 'Cali',     label: 'Colombia'      },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginBottom: 4 }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Active strategies */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 10 }}>
              Estrategias activas
            </div>
            {[
              { name: 'Descuentos 5% + PRO', roi: 'ROI: 22X', badge: '✅ ACTIVO',        badgeColor: 'rgba(0,214,138,.15)', badgeText: 'var(--green)' },
              { name: 'Ads $1.000.000/sem',  roi: 'ROI: 3.9X', badge: '⚠️ SUBUTILIZADO', badgeColor: 'rgba(245,158,11,.15)', badgeText: '#f59e0b'      },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i === 0 ? '1px solid var(--border)' : 'none', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.roi}</div>
                </div>
                <div style={{ padding: '4px 8px', borderRadius: 6, background: s.badgeColor, color: s.badgeText, fontFamily: 'Space Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '.5px', flexShrink: 0 }}>
                  {s.badge}
                </div>
              </div>
            ))}
          </div>

          {/* Opportunities */}
          <div style={{ background: 'rgba(245,158,11,.04)', border: '1px solid rgba(245,158,11,.2)', borderLeft: '3px solid #f59e0b', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#f59e0b', marginBottom: 10 }}>
              Oportunidades detectadas
            </div>
            {[
              'Los Ads solo gastan el 46% del presupuesto disponible (co-inversión Rappi 70%)',
              'Campaña visible solo en Onces y Cena — horario ampliable',
              'Cerrado los martes — posible día de apertura',
              'Descuentos con 22X retorno — espacio para incrementar',
            ].map((opp, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(245,158,11,.1)' : 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.55 }}>
                <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>💡</span>
                {opp}
              </div>
            ))}
          </div>

          {/* Sales history */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12 }}>
              Historial de ventas — pedidos/semana
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 44 }}>
              {salesData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${Math.round((val / maxBar) * 36)}px`, background: 'rgba(245,158,11,.55)', borderRadius: '3px 3px 0 0', minHeight: 4 }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {salesLabels.map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 7.5, color: 'var(--muted)', letterSpacing: '.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              {salesData.map((val, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'var(--dim)', fontWeight: 600 }}>
                  {val}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes sound-bar-0 { from { height: 8px } to { height: 20px } }
        @keyframes sound-bar-1 { from { height: 14px } to { height: 28px } }
        @keyframes sound-bar-2 { from { height: 6px } to { height: 16px } }
      `}</style>
    </div>
  )
}
