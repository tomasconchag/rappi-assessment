'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { RoleplayCase, RoleplayBankEntry } from '@/types/assessment'

interface Props {
  onReady: (recorder: MediaRecorder, chunks: Blob[], mimeType: string, cameraStream: MediaStream | null, screenStream: MediaStream | null) => void
  voiceProvider?: 'vapi' | 'arbol'
  onPhoneCapture?: (phone: string) => void
  roleplayCase?: RoleplayCase | null
  roleplayBankCase?: RoleplayBankEntry | null
}

const PREP_SECONDS = 5 * 60

// No default case — the prep screen only runs when a bank case is confirmed.

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

export function RolePlayPrepScreen({ onReady, voiceProvider = 'vapi', onPhoneCapture, roleplayCase, roleplayBankCase }: Props) {
  // rc is a null-safe fallback for legacy UI blocks — only rendered when !roleplayBankCase
  const rc = roleplayCase ?? {
    restaurant_name: '—', owner_name: '—', owner_gender: 'f' as const, city: '—',
    category: '—', schedule: '—', ticket_avg: '—', orders_per_week: '—', inactive_time: '—',
    strategies: [], opportunities: [], sales_data: [0], sales_labels: [''],
  }
  const maxBar = Math.max(...rc.sales_data)
  const ownerTitle = rc.owner_gender === 'f' ? 'Dueña' : 'Dueño'
  const [secondsLeft, setSecondsLeft] = useState(PREP_SECONDS)
  const [recStatus,   setRecStatus]   = useState<'idle' | 'requesting' | 'recording' | 'error'>('idle')
  const [recError,    setRecError]    = useState('')
  const [hasCamPip,   setHasCamPip]   = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('+57')

  const recorderRef     = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const mimeRef         = useRef('video/webm')
  const warned60Ref     = useRef(false)
  const expiredRef      = useRef(false)
  const onReadyRef      = useRef(onReady)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraVideoRef  = useRef<HTMLVideoElement | null>(null)
  onReadyRef.current    = onReady

  // Precarga el SDK de Vapi mientras el candidato lee el briefing.
  // Cuando llegue a RolePlayCallScreen, el módulo ya está en caché → 0ms de descarga.
  useEffect(() => {
    if (voiceProvider === 'vapi') {
      import('@vapi-ai/web').catch(() => {})
    }
  }, [voiceProvider])

  // Stop camera stream on unmount ONLY if we haven't handed it off to the parent
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop())
        cameraStreamRef.current = null
      }
    }
  }, [])

  // Countdown only starts after recording is active
  useEffect(() => {
    if (recStatus !== 'recording') return
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1
        if (next === 60 && !warned60Ref.current) {
          warned60Ref.current = true
          playBeep(800, 0.15, 2)
        }
        if (next <= 0) {
          clearInterval(interval)
          if (!expiredRef.current && recorderRef.current) {
            expiredRef.current = true
            const cam = cameraStreamRef.current
            const scr = screenStreamRef.current
            cameraStreamRef.current = null // hand off ownership to parent
            screenStreamRef.current = null
            onReadyRef.current(recorderRef.current, chunksRef.current, mimeRef.current, cam, scr)
          }
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [recStatus])

  const startRecording = async () => {
    setRecStatus('requesting')
    setRecError('')
    try {
      // Screen capture (tab) — low framerate + resolution to keep file size under 50MB
      // audio: true enables tab audio capture so the AI agent's voice is recorded too
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 8, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })

      // Camera + mic — required for evaluation
      // Try to get camera + audio together first; fall back to audio-only if camera unavailable
      let cameraStream: MediaStream | null = null
      let gotCamera = false
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
        })
        gotCamera = true
      } catch {
        // Camera unavailable (e.g. no webcam) — try mic only
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
          })
        } catch {
          // Mic also denied — cannot proceed without audio
          setRecStatus('error')
          setRecError('Debes permitir el acceso al micrófono para continuar con el RolePlay. El audio es necesario para la evaluación.')
          screenStream.getTracks().forEach(t => t.stop())
          return
        }
      }

      // Store screen stream so parent can stop it explicitly when the call ends
      screenStreamRef.current = screenStream

      // Attach camera to PiP video element
      cameraStreamRef.current = cameraStream
      setHasCamPip(gotCamera)
      if (cameraVideoRef.current && gotCamera) {
        cameraVideoRef.current.srcObject = cameraStream
      }

      // Build combined stream: screen video + tab audio (AI voice) + mic audio (candidate voice)
      const tracks = [
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),   // tab audio — captures Vapi AI voice
        ...cameraStream.getAudioTracks(),   // mic audio — captures candidate voice
      ]
      const combined = new MediaStream(tracks)

      const codecs = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/mp4',
        'video/webm',
        '',
      ]
      let mime = ''
      for (const c of codecs) {
        if (!c || MediaRecorder.isTypeSupported(c)) { mime = c; break }
      }
      mimeRef.current  = mime || 'video/webm'
      chunksRef.current = []

      const recorder = new MediaRecorder(combined, mime ? { mimeType: mime } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(500) // collect chunks every 500ms for better coverage
      recorderRef.current = recorder
      setRecStatus('recording')

      // If user stops sharing via browser UI — stop recorder cleanly so final chunks are flushed
      screenStream.getVideoTracks()[0].onended = () => {
        setRecStatus('error')
        setRecError('Dejaste de compartir la pantalla. Vuelve a iniciar para continuar.')
        try { recorder.requestData() } catch { /* ignore */ }
        setTimeout(() => { try { recorder.stop() } catch { /* ignore */ } }, 200)
      }
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name
      setRecStatus('error')
      setRecError(
        name === 'NotAllowedError'
          ? 'Permiso denegado. Debes compartir esta pestaña para continuar.'
          : 'No se pudo iniciar la grabación. Intenta de nuevo.',
      )
    }
  }

  const handleReady = useCallback(() => {
    if (!recorderRef.current || expiredRef.current || recStatus !== 'recording') return
    if (voiceProvider === 'arbol' && phoneNumber.trim().length < 8) return
    expiredRef.current = true
    if (voiceProvider === 'arbol' && onPhoneCapture) {
      onPhoneCapture(phoneNumber.trim())
    }
    const cam = cameraStreamRef.current
    const scr = screenStreamRef.current
    cameraStreamRef.current = null // hand off ownership to parent
    screenStreamRef.current = null
    onReady(recorderRef.current, chunksRef.current, mimeRef.current, cam, scr)
  }, [onReady, recStatus, voiceProvider, phoneNumber, onPhoneCapture])

  const mins  = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs  = String(secondsLeft % 60).padStart(2, '0')
  const isRed = secondsLeft <= 60 && recStatus === 'recording'
  const pct   = (secondsLeft / PREP_SECONDS) * 100

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg, #06060d)',
      zIndex: 100,
      overflow: 'hidden',
    }}>

      {/* ── Camera PiP overlay (captured by screen recording) ── */}
      {recStatus === 'recording' && hasCamPip && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 500,
          width: 160,
          height: 120,
          borderRadius: 10,
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,.5)',
          background: '#000',
        }}>
          <video
            ref={cameraVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // mirror — feels natural for self-view
              display: 'block',
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: 6,
            left: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#ff6b6b',
              animation: 'rec-pulse 1.5s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 7.5,
              color: 'rgba(255,255,255,.8)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              En vivo
            </span>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      {/* paddingRight: 165px leaves room for the fixed ProctoringBadge (top:14, right:14) */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        paddingRight: 165,
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        gap: 20,
      }}>
        {/* Left label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#f59e0b',
            fontWeight: 600,
          }}>
            📋 Preparación — estudia al cliente
          </div>
          {recStatus === 'recording' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#ff6b6b',
                animation: 'rec-pulse 1.5s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: 9,
                color: '#ff6b6b',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                REC
              </span>
            </div>
          )}
        </div>

        {/* Timer (only shown when recording) */}
        {recStatus === 'recording' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isRed && (
              <span style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: 9.5,
                color: '#ff6b6b',
                letterSpacing: '1px',
                animation: 'rec-pulse 1.5s ease-in-out infinite',
              }}>
                ¡ÚLTIMO MINUTO!
              </span>
            )}
            <span style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '2px',
              color: isRed ? '#ff6b6b' : '#f59e0b',
              transition: 'color .5s ease',
              lineHeight: 1,
            }}>
              ⏱ {mins}:{secs}
            </span>
          </div>
        )}

        {/* Right: CTA */}
        {recStatus === 'idle' && (
          <button
            onClick={startRecording}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9,
              background: 'linear-gradient(140deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff', fontFamily: 'DM Sans, sans-serif',
              fontSize: 13, fontWeight: 700, letterSpacing: '.3px',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(245,158,11,.35)',
              whiteSpace: 'nowrap',
            }}
          >
            📹 Compartir pantalla y comenzar
          </button>
        )}

        {recStatus === 'requesting' && (
          <div style={{
            fontFamily: 'Space Mono, monospace', fontSize: 11,
            color: 'var(--muted)', letterSpacing: '.5px',
          }}>
            ⏳ Esperando permiso...
          </div>
        )}

        {recStatus === 'error' && (
          <button
            onClick={startRecording}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9,
              background: 'rgba(233,69,96,.12)',
              border: '1px solid rgba(233,69,96,.3)',
              color: '#ff6b6b', fontFamily: 'DM Sans, sans-serif',
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            🔄 Reintentar
          </button>
        )}

        {recStatus === 'recording' && voiceProvider === 'arbol' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '1px',
              color: 'var(--muted)', whiteSpace: 'nowrap',
            }}>
              Tu número:
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="+57 300 000 0000"
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--input, rgba(255,255,255,.05))',
                border: '1px solid var(--border)',
                color: 'var(--text)', fontFamily: 'Space Mono, monospace',
                fontSize: 12, outline: 'none', width: 160,
              }}
            />
          </div>
        )}

        {recStatus === 'recording' && (
          <button
            onClick={handleReady}
            disabled={voiceProvider === 'arbol' && phoneNumber.trim().length < 8}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9,
              background: 'linear-gradient(140deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff', fontFamily: 'DM Sans, sans-serif',
              fontSize: 13, fontWeight: 700, letterSpacing: '.3px',
              border: 'none',
              cursor: (voiceProvider === 'arbol' && phoneNumber.trim().length < 8) ? 'not-allowed' : 'pointer',
              opacity: (voiceProvider === 'arbol' && phoneNumber.trim().length < 8) ? 0.5 : 1,
              boxShadow: '0 4px 16px rgba(245,158,11,.35)',
              whiteSpace: 'nowrap',
            }}
          >
            Listo — Iniciar llamada →
          </button>
        )}
      </div>

      {/* Progress bar */}
      {recStatus === 'recording' && (
        <div style={{ height: 3, background: 'rgba(255,255,255,.06)', flexShrink: 0 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: isRed
              ? 'linear-gradient(90deg, #ff6b6b, #ff4040)'
              : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            transition: 'width 1s linear, background .5s ease',
          }} />
        </div>
      )}

      {/* ── Gate: share screen prompt ── */}
      {(recStatus === 'idle' || recStatus === 'requesting' || recStatus === 'error') && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}>
          <div style={{
            maxWidth: 480,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}>
            <div style={{ fontSize: 48 }}>📹</div>
            <h2 style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.2,
            }}>
              Comparte tu pantalla para comenzar
            </h2>

            {recStatus === 'error' ? (
              <div style={{
                background: 'rgba(233,69,96,.08)',
                border: '1px solid rgba(233,69,96,.25)',
                borderRadius: 12,
                padding: '14px 20px',
                fontSize: 13.5,
                color: '#ff6b6b',
                lineHeight: 1.6,
                width: '100%',
              }}>
                {recError}
              </div>
            ) : (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{
                  fontSize: 13.5,
                  color: 'var(--dim)',
                  lineHeight: 1.7,
                  margin: 0,
                  fontFamily: 'DM Sans, sans-serif',
                  textAlign: 'center',
                }}>
                  Al hacer clic el browser abrirá un diálogo. Sigue estos 3 pasos:
                </p>
                {/* Step-by-step visual guide */}
                {[
                  { step: '1', label: 'Clic en "Compartir pantalla"', sub: 'Se abre el diálogo del navegador', icon: '🖥️' },
                  { step: '2', label: 'Selecciona "Esta pestaña"', sub: 'Es la opción de la derecha — busca la pestaña con el logo de Rappi', icon: '📌', highlight: true },
                  { step: '3', label: 'Clic en el botón "Compartir"', sub: 'Luego te pedirá cámara y micrófono — acepta los dos', icon: '✅' },
                ].map(({ step, label, sub, icon, highlight }) => (
                  <div key={step} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px',
                    background: highlight ? 'rgba(245,158,11,.08)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${highlight ? 'rgba(245,158,11,.25)' : 'var(--border)'}`,
                    borderRadius: 10,
                  }}>
                    <div style={{
                      flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                      background: highlight ? '#f59e0b' : 'rgba(255,255,255,.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
                      color: highlight ? '#000' : 'var(--dim)',
                    }}>
                      {step}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 15 }}>{icon}</span>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 600, color: highlight ? '#f59e0b' : 'var(--text)' }}>
                          {label}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
                        {sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              width: '100%',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 20px',
              textAlign: 'left',
            }}>
              {[
                ['📋', '5 min para revisar los datos del cliente'],
                ['📞', '10 min de llamada en vivo con avatar IA'],
                ['🎬', 'Pantalla, cámara y audio quedan grabados'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif' }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {text}
                </div>
              ))}
            </div>

            {recStatus !== 'requesting' && (
              <button
                onClick={startRecording}
                style={{
                  padding: '14px 36px', borderRadius: 10,
                  background: 'linear-gradient(140deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none', color: '#fff',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
                  fontSize: 15, cursor: 'pointer', letterSpacing: '.3px',
                  boxShadow: '0 4px 20px rgba(245,158,11,.4)',
                  width: '100%',
                }}
              >
                {recStatus === 'error' ? '🔄 Intentar de nuevo' : '📹 Compartir pantalla y comenzar preparación'}
              </button>
            )}

            {recStatus === 'requesting' && (
              <div style={{
                padding: '14px 36px', borderRadius: 10,
                background: 'rgba(245,158,11,.08)',
                border: '1px solid rgba(245,158,11,.2)',
                color: '#f59e0b', fontFamily: 'Space Mono, monospace',
                fontSize: 12, letterSpacing: '.5px', width: '100%',
                textAlign: 'center',
              }}>
                ⏳ Esperando selección de pantalla...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CRM Content (only visible when recording) ── */}
      {recStatus === 'recording' && roleplayBankCase && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Client header */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid rgba(245,158,11,.25)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 12,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: 9,
                textTransform: 'uppercase', letterSpacing: '1.5px',
                color: '#f59e0b', marginBottom: 8,
              }}>
                Cliente asignado
              </div>
              <div style={{
                fontFamily: 'Fraunces, serif', fontSize: 22,
                fontWeight: 700, color: 'var(--text)', marginBottom: 4,
              }}>
                {roleplayBankCase.restaurant_name}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 13.5,
                color: 'var(--dim)', lineHeight: 1.6,
              }}>
                Dueño · <strong style={{ color: 'var(--text)' }}>{roleplayBankCase.owner_name}</strong>
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                color: 'var(--muted)', marginTop: 4,
              }}>
                {roleplayBankCase.category} · {roleplayBankCase.city}, Colombia
              </div>
            </div>
            <div style={{
              background: 'rgba(245,158,11,.08)',
              border: '1px solid rgba(245,158,11,.2)',
              borderRadius: 10, padding: '10px 16px',
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              color: '#f59e0b', letterSpacing: '.5px',
              textTransform: 'uppercase',
            }}>
              Dificultad: {roleplayBankCase.difficulty}
            </div>
          </div>

          {/* "Data stays visible" reassurance banner */}
          <div style={{
            background: 'rgba(0,214,138,.07)',
            border: '1px solid rgba(0,214,138,.2)',
            borderLeft: '3px solid var(--green)',
            borderRadius: 10,
            padding: '12px 18px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>✅</span>
            <div style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>
                Tranquilo — todos estos datos estarán en tu pantalla durante la llamada
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--dim)' }}>
                No necesitas memorizar nada ni tomar notas. El briefing completo seguirá visible en el lado derecho mientras hablas.
              </div>
            </div>
          </div>

          {/* Farmer briefing — the core content */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '22px 26px',
            flex: 1,
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', marginBottom: 16,
            }}>
              📋 Tu briefing — lo que sabes antes de llamar
            </div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              color: 'var(--text)', lineHeight: 1.8,
              whiteSpace: 'pre-line',
            }}>
              {roleplayBankCase.farmer_briefing}
            </div>
          </div>

          {/* Reminder banner */}
          <div style={{
            background: 'rgba(245,158,11,.06)',
            border: '1px solid rgba(245,158,11,.18)',
            borderRadius: 10, padding: '14px 20px',
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 13,
              color: '#f59e0b', lineHeight: 1.65,
            }}>
              <strong>Recuerda:</strong>{' '}
              Tienes 5 minutos de preparación y luego comenzará la llamada en vivo de 10 minutos con el dueño. Usa los datos del briefing para argumentar con cifras y cerrar con un siguiente paso concreto.
            </div>
          </div>
        </div>
      )}

      {/* ── CRM Content legacy (only visible when recording, no bank case) ── */}
      {recStatus === 'recording' && !roleplayBankCase && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          alignContent: 'start',
        }}>

          {/* Client header — full width */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'var(--card)',
            border: '1px solid rgba(245,158,11,.25)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 12,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
          }}>
            <div>
              <div style={{
                fontFamily: 'Space Mono, monospace', fontSize: 9,
                textTransform: 'uppercase', letterSpacing: '1.5px',
                color: '#f59e0b', marginBottom: 8,
              }}>
                Cliente asignado
              </div>
              <div style={{
                fontFamily: 'Fraunces, serif', fontSize: 22,
                fontWeight: 700, color: 'var(--text)', marginBottom: 4,
              }}>
                {rc.restaurant_name}
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 13.5,
                color: 'var(--dim)', lineHeight: 1.6,
              }}>
                {ownerTitle} · <strong style={{ color: 'var(--text)' }}>{rc.owner_name}</strong>
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                color: 'var(--muted)', marginTop: 4,
              }}>
                {rc.category} · {rc.city}, Colombia &nbsp;|&nbsp; {rc.schedule}
              </div>
            </div>
            <div style={{
              background: 'rgba(245,158,11,.08)',
              border: '1px solid rgba(245,158,11,.2)',
              borderRadius: 10, padding: '12px 18px',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13,
              color: 'var(--dim)', lineHeight: 1.65, maxWidth: 340,
            }}>
              <strong style={{
                color: '#f59e0b', display: 'block', marginBottom: 4,
                fontSize: 11, fontFamily: 'Space Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '1px',
              }}>
                Tu misión
              </strong>
              Identificar oportunidades de crecimiento y convencer a {rc.owner_name} de implementar nuevas estrategias con herramientas Rappi. Usa los datos para argumentar con cifras concretas.
            </div>
          </div>

          {/* Stats grid */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', marginBottom: 14,
            }}>
              Métricas clave
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { value: rc.ticket_avg,      label: 'Ticket promedio',           color: 'var(--text)' },
                { value: rc.orders_per_week, label: 'Pedidos/semana',            color: 'var(--text)' },
                { value: rc.inactive_time,   label: 'Sin cambios de estrategia', color: '#f59e0b'     },
                { value: rc.city,            label: 'Ciudad',                    color: 'var(--text)' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, padding: '12px 14px',
                }}>
                  <div style={{
                    fontFamily: 'Fraunces, serif', fontSize: 18,
                    fontWeight: 700, color: stat.color, lineHeight: 1.1, marginBottom: 4,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: 'Space Mono, monospace', fontSize: 8.5,
                    textTransform: 'uppercase', letterSpacing: '1px',
                    color: 'var(--muted)', lineHeight: 1.4,
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active strategies */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', marginBottom: 14,
            }}>
              Estrategias activas
            </div>
            {rc.strategies.map((s, i) => {
              const badgeConfig =
                s.status === 'active'    ? { badge: '✅ ACTIVO',        badgeColor: 'rgba(0,214,138,.15)', badgeText: 'var(--green)' } :
                s.status === 'underused' ? { badge: '⚠️ SUBUTILIZADO', badgeColor: 'rgba(245,158,11,.15)', badgeText: '#f59e0b' } :
                                           { badge: '❌ INACTIVO',       badgeColor: 'rgba(255,107,107,.15)', badgeText: '#ff6b6b' }
              const roiLine = s.note ? `ROI: ${s.roi} · ${s.note}` : `ROI: ${s.roi}`
              return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '11px 0',
                borderBottom: i < rc.strategies.length - 1 ? '1px solid var(--border)' : 'none',
                gap: 10,
              }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'var(--text)', fontWeight: 600, marginBottom: 3 }}>
                    {s.name}
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: 'var(--muted)' }}>
                    {roiLine}
                  </div>
                </div>
                <div style={{
                  padding: '4px 9px', borderRadius: 6,
                  background: badgeConfig.badgeColor, color: badgeConfig.badgeText,
                  fontFamily: 'Space Mono, monospace', fontSize: 8.5,
                  fontWeight: 700, letterSpacing: '.5px', flexShrink: 0, marginTop: 2,
                }}>
                  {badgeConfig.badge}
                </div>
              </div>
              )
            })}
          </div>

          {/* Opportunities */}
          <div style={{
            background: 'rgba(245,158,11,.04)',
            border: '1px solid rgba(245,158,11,.2)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: '#f59e0b', marginBottom: 14,
            }}>
              💡 Oportunidades detectadas
            </div>
            {rc.opportunities.map((opp, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '7px 0',
                borderBottom: i < rc.opportunities.length - 1 ? '1px solid rgba(245,158,11,.1)' : 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
                color: i === 0 ? 'var(--text)' : 'var(--dim)', lineHeight: 1.55,
              }}>
                <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>→</span>
                {opp}
              </div>
            ))}
          </div>

          {/* Sales history */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', marginBottom: 14,
            }}>
              Historial de ventas — pedidos/semana
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
              {rc.sales_data.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.round((val / maxBar) * 52)}px`,
                    background: 'rgba(245,158,11,.55)',
                    borderRadius: '3px 3px 0 0', minHeight: 4,
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {rc.sales_labels.map((label, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center',
                  fontFamily: 'Space Mono, monospace', fontSize: 7,
                  color: 'var(--muted)', letterSpacing: '.3px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
              {rc.sales_data.map((val, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center',
                  fontFamily: 'Space Mono, monospace', fontSize: 9,
                  color: 'var(--dim)', fontWeight: 600,
                }}>
                  {val}
                </div>
              ))}
            </div>
          </div>

          {/* Tips banner — full width */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'rgba(245,158,11,.06)',
            border: '1px solid rgba(245,158,11,.18)',
            borderRadius: 10, padding: '14px 20px',
            display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 13,
              color: '#f59e0b', lineHeight: 1.65,
            }}>
              <strong>Recuerda durante la llamada:</strong>{' '}
              Menciona los Ads subutilizados con cifras exactas · Propón ampliar horario de campaña · Sugiere subir el descuento dado el ROI de 22X · Cierra con un siguiente paso concreto.
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
