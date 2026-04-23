'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onDone: () => void
  cameraStream: MediaStream | null
}

const TOTAL_SECONDS = 5 * 60

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

export function CulturalFitCallScreen({ onDone, cameraStream }: Props) {
  const [secondsLeft,   setSecondsLeft]   = useState(TOTAL_SECONDS)
  const [callDuration,  setCallDuration]  = useState(0)
  const [confirmEnd,    setConfirmEnd]    = useState(false)
  const [callStatus,    setCallStatus]    = useState<CallStatus>('connecting')
  const [isMuted,       setIsMuted]       = useState(false)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [callError,     setCallError]     = useState<string | null>(null)
  const [timerStarted,  setTimerStarted]  = useState(false)
  const [retryKey,      setRetryKey]      = useState(0)   // increment to re-run Vapi effect

  const warned60Ref      = useRef(false)
  const timerStartedRef  = useRef(false)
  const timerFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endedRef         = useRef(false)
  const cameraVideoRef   = useRef<HTMLVideoElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef          = useRef<any>(null)
  const durationRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start the countdown — idempotent, safe to call multiple times
  const startTimer = useCallback(() => {
    if (timerStartedRef.current) return
    timerStartedRef.current = true
    if (timerFallbackRef.current) { clearTimeout(timerFallbackRef.current); timerFallbackRef.current = null }
    setTimerStarted(true)
  }, [])

  // Attach camera PiP
  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  // Duration timer
  useEffect(() => {
    if (callStatus !== 'active') return
    durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    return () => { if (durationRef.current) clearInterval(durationRef.current) }
  }, [callStatus])

  const finalize = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    setCallStatus('ended')
    if (vapiRef.current) {
      try { vapiRef.current.stop() } catch { /* ignore */ }
    }
    playBeep(440, 0.5, 1)
    setTimeout(() => onDone(), 1500)
  }, [onDone])

  // Vapi integration
  useEffect(() => {
    let cancelled = false

    async function startVapi() {
      try {
        const VapiModule = await import('@vapi-ai/web')
        const Vapi = VapiModule.default
        const publicKey   = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim()
        const assistantId = process.env.NEXT_PUBLIC_VAPI_CULTURAL_FIT_ASSISTANT_ID?.trim()
        if (!publicKey || !assistantId) throw new Error('Vapi Cultural Fit keys not configured')

        const vapi = new Vapi(publicKey)
        vapiRef.current = vapi

        vapi.on('call-start', () => {
          if (cancelled) return
          setCallStatus('active')
          // Fallback: start timer after 15s if speech-start hasn't fired yet
          timerFallbackRef.current = setTimeout(() => startTimer(), 15000)
        })
        vapi.on('call-end',     () => { if (!cancelled) finalize() })
        vapi.on('speech-start', () => {
          if (!cancelled) {
            setAgentSpeaking(true)
            startTimer()   // start countdown on agent's first word
          }
        })
        vapi.on('speech-end',   () => { if (!cancelled) setAgentSpeaking(false) })
        vapi.on('error', (e: unknown) => {
          console.error('[Vapi Cultural Fit] error:', e)
          if (!cancelled) {
            let msg = 'Error desconocido'
            if (e instanceof Error) msg = e.message
            else if (e && typeof e === 'object') {
              const obj = e as Record<string, unknown>
              const inner = obj.message ?? obj.error ?? obj.type
              msg = inner ? String(inner) : JSON.stringify(e)
            } else if (typeof e === 'string') msg = e
            const msgLower = msg.toLowerCase()
            const isCapacity = msgLower.includes('concurren') || msgLower.includes('concurrent')
              || msgLower.includes('limit') || msgLower.includes('capacity')
              || msgLower.includes('too many') || msgLower.includes('unavailable')
              || msgLower.includes('busy') || msgLower.includes('429')
            setCallError(isCapacity
              ? 'El servicio de entrevistas está ocupado en este momento. Espera 1–2 minutos e intenta de nuevo.'
              : `Error en la entrevista: ${msg}`)
            setCallStatus('ended')
            // Always finalize so the recording is stopped + saved even on error.
            // finalize() has an endedRef guard so calling it twice is safe.
            finalize()
          }
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await vapi.start(assistantId, {} as any)
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e)
          const msgLower = msg.toLowerCase()
          const isCapacity = msgLower.includes('concurren') || msgLower.includes('concurrent')
            || msgLower.includes('limit') || msgLower.includes('capacity')
            || msgLower.includes('too many') || msgLower.includes('unavailable')
            || msgLower.includes('busy') || msgLower.includes('429')
          setCallError(isCapacity
            ? 'El servicio de entrevistas está ocupado en este momento. Espera 1–2 minutos e intenta de nuevo.'
            : `No se pudo iniciar la entrevista: ${msg}`)
          setCallStatus('ended')
        }
      }
    }

    startVapi()
    return () => {
      cancelled = true
      if (timerFallbackRef.current) { clearTimeout(timerFallbackRef.current); timerFallbackRef.current = null }
      if (vapiRef.current) {
        try { vapiRef.current.stop() } catch { /* ignore */ }
        vapiRef.current = null
      }
    }
  }, [finalize, startTimer, retryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 5-minute countdown — starts only after agent's first word (or 15s fallback)
  useEffect(() => {
    if (!timerStarted) return
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1
        if (next === 60 && !warned60Ref.current) {
          warned60Ref.current = true
          playBeep(800, 0.15, 2)
        }
        if (next <= 0) { clearInterval(interval); finalize(); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerStarted, finalize])

  const handleMute = () => {
    setIsMuted(m => {
      const next = !m
      if (vapiRef.current) { try { vapiRef.current.setMuted(next) } catch { /* ignore */ } }
      return next
    })
  }

  const mins   = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs   = String(secondsLeft % 60).padStart(2, '0')
  const isRed  = secondsLeft <= 60
  const durMin = String(Math.floor(callDuration / 60)).padStart(2, '0')
  const durSec = String(callDuration % 60).padStart(2, '0')

  const statusLabel = callStatus === 'connecting' ? 'Conectando...' : callStatus === 'active' ? 'En entrevista' : 'Entrevista terminada'
  const statusColor = callStatus === 'connecting' ? '#a855f7' : callStatus === 'active' ? '#00d68a' : '#ff6b6b'

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg, #06060d)', zIndex: 100, overflow: 'hidden' }}>

      {/* Camera PiP */}
      {cameraStream && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 500, width: 160, height: 120, borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(168,85,247,.3)', boxShadow: '0 4px 24px rgba(0,0,0,.5)', background: '#000' }}>
          <video ref={cameraVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff6b6b', animation: 'rec-pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 7.5, color: 'rgba(255,255,255,.8)', letterSpacing: '1px', textTransform: 'uppercase' }}>En vivo</span>
          </div>
        </div>
      )}

      {/* Timer bar */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '12px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff6b6b', animation: 'rec-pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#ff6b6b', letterSpacing: '1px', textTransform: 'uppercase' }}>REC</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          {isRed && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: '#ff6b6b', letterSpacing: '1px', marginRight: 10, animation: 'rec-pulse 1.5s ease-in-out infinite' }}>¡ÚLTIMO MINUTO!</span>}
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 24, fontWeight: 700, letterSpacing: '2px', color: isRed ? '#ff6b6b' : '#a855f7', transition: 'color .3s ease' }}>
            {mins}:{secs}
          </span>
        </div>
        {/* End call button — top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: 170 }}>
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
              Terminar entrevista
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

      {/* Main layout */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '45% 55%', overflow: 'hidden' }}>

        {/* Left: Agent phone UI */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', borderRight: '1px solid var(--border)' }}>

          {/* Phone frame */}
          <div style={{
            width: 240, borderRadius: 40, padding: '32px 24px',
            background: 'linear-gradient(160deg, rgba(168,85,247,.08) 0%, rgba(124,58,237,.04) 100%)',
            border: '1px solid rgba(168,85,247,.2)',
            boxShadow: '0 8px 40px rgba(168,85,247,.12), inset 0 1px 0 rgba(255,255,255,.06)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          }}>
            {/* Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(140deg,#a855f7,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 20px rgba(168,85,247,.4)',
              position: 'relative',
            }}>
              S
              {/* Speaking indicator */}
              {agentSpeaking && (
                <div style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  border: '2px solid rgba(168,85,247,.6)',
                  animation: 'rec-pulse 1.2s ease-in-out infinite',
                }} />
              )}
            </div>

            {/* Name & status */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Simón</div>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: 'var(--muted)', marginBottom: 8 }}>Team Lead · Brand Development</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, animation: callStatus === 'active' ? 'rec-pulse 2s ease-in-out infinite' : 'none' }} />
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: statusColor, letterSpacing: '.5px' }}>{statusLabel}</span>
              </div>
            </div>

            {/* Duration */}
            {callStatus === 'active' && (
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 18, fontWeight: 700, letterSpacing: '2px', color: 'var(--text)' }}>
                {durMin}:{durSec}
              </div>
            )}

            {/* Sound wave */}
            {agentSpeaking && callStatus === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
                {[0.6, 1, 0.7, 1, 0.5, 0.9, 0.6].map((h, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2,
                    background: '#a855f7',
                    height: `${h * 24}px`,
                    animation: `sound-bar ${0.6 + i * 0.08}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.05}s`,
                  }} />
                ))}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
              {/* Mute */}
              <button
                onClick={handleMute}
                title={isMuted ? 'Activar micrófono' : 'Silenciar'}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: isMuted ? 'rgba(224,53,84,.15)' : 'rgba(255,255,255,.06)',
                  border: `1px solid ${isMuted ? 'rgba(224,53,84,.3)' : 'var(--border)'}`,
                  color: isMuted ? '#e03554' : 'var(--text)',
                  fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .2s ease',
                }}
              >
                {isMuted ? '🔇' : '🎙'}
              </button>

              {/* End call */}
              {confirmEnd ? (
                <button
                  onClick={finalize}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(224,53,84,.9)', border: 'none',
                    color: '#fff', fontSize: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(224,53,84,.5)',
                    animation: 'rec-pulse 1s ease-in-out infinite',
                  }}
                  title="Confirmar — terminar entrevista"
                >
                  ✓
                </button>
              ) : (
                <button
                  onClick={() => setConfirmEnd(true)}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(224,53,84,.15)', border: '1px solid rgba(224,53,84,.3)',
                    color: '#e03554', fontSize: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .2s ease',
                  }}
                  title="Terminar entrevista"
                >
                  📵
                </button>
              )}
            </div>

            {confirmEnd && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#e03554', fontFamily: 'DM Sans', textAlign: 'center' }}>
                  ¿Terminar la entrevista ahora?
                </span>
                <button onClick={() => setConfirmEnd(false)} style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Error + retry */}
          {callError && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '10px 14px', background: 'rgba(224,53,84,.08)', border: '1px solid rgba(224,53,84,.2)', borderRadius: 8, fontSize: 12, color: '#f07090', fontFamily: 'DM Sans', maxWidth: 280, textAlign: 'center' }}>
                {callError}
              </div>
              <button
                onClick={() => {
                  endedRef.current        = false
                  timerStartedRef.current = false
                  warned60Ref.current     = false
                  setCallError(null)
                  setCallStatus('connecting')
                  setSecondsLeft(TOTAL_SECONDS)
                  setCallDuration(0)
                  setTimerStarted(false)
                  setRetryKey(k => k + 1)
                }}
                style={{
                  padding: '7px 18px', borderRadius: 8,
                  background: 'rgba(168,85,247,.12)', border: '1px solid rgba(168,85,247,.3)',
                  color: '#a855f7', fontFamily: 'Space Mono, monospace', fontSize: 10,
                  letterSpacing: '.5px', cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                🔄 Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Right: interview context */}
        <div style={{ overflowY: 'auto', padding: '32px 36px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a855f7', marginBottom: 10, fontWeight: 600 }}>
              Cultural Fit Interview
            </div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
              Entrevista con Simón
            </h3>
            <p style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.7, fontFamily: 'DM Sans' }}>
              Simón te hará preguntas sobre tu experiencia, valores y forma de trabajar. Responde con naturalidad y ejemplos concretos.
            </p>
          </div>

          {/* Tips during call */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🎯', title: 'Sé específico', desc: 'Usa ejemplos reales de situaciones que hayas vivido en trabajos anteriores o en tu vida.' },
              { icon: '💬', title: 'Escucha activamente', desc: 'Si Simón hace una pregunta de seguimiento, es para profundizar — tómate el tiempo de responder bien.' },
              { icon: '🧠', title: 'Muestra tu forma de pensar', desc: 'No solo el resultado, sino cómo razonaste y qué aprendiste en el proceso.' },
              { icon: '⚡', title: 'Sé auténtico', desc: 'No hay respuestas perfectas. El equipo valora la honestidad y la autoconciencia.' },
            ].map(item => (
              <div key={item.title} style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(168,85,247,.04)', border: '1px solid rgba(168,85,247,.12)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans', marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', fontFamily: 'DM Sans', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Rappi values */}
          <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12, fontWeight: 600 }}>
              Valores Rappi BD
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Ownership', 'Data-driven', 'Hustle', 'Resiliencia', 'Colaboración', 'Impacto'].map(v => (
                <span key={v} style={{
                  padding: '4px 10px', borderRadius: 20,
                  background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.18)',
                  fontSize: 11.5, fontFamily: 'DM Sans', color: '#a855f7',
                }}>
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
