'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onReady: (recorder: MediaRecorder, chunks: Blob[], mimeType: string, cameraStream: MediaStream | null) => void
  voiceProvider?: 'vapi' | 'arbol'
  onPhoneCapture?: (phone: string) => void
}

const PREP_SECONDS = 5 * 60

const salesData   = [50, 77, 61, 52, 76, 74, 74]
const salesLabels = ['Oct W1', 'Oct W2', 'Oct W3', 'Nov W1', 'Nov W2', 'Nov W3', 'Nov W4']
const maxBar      = Math.max(...salesData)

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

export function RolePlayPrepScreen({ onReady, voiceProvider = 'vapi', onPhoneCapture }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(PREP_SECONDS)
  const [recStatus,   setRecStatus]   = useState<'idle' | 'requesting' | 'recording' | 'error'>('idle')
  const [recError,    setRecError]    = useState('')
  const [hasCamPip,   setHasCamPip]   = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('+57')

  const recorderRef    = useRef<MediaRecorder | null>(null)
  const chunksRef      = useRef<Blob[]>([])
  const mimeRef        = useRef('video/webm')
  const warned60Ref    = useRef(false)
  const expiredRef     = useRef(false)
  const onReadyRef     = useRef(onReady)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraVideoRef  = useRef<HTMLVideoElement | null>(null)
  onReadyRef.current   = onReady

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
            cameraStreamRef.current = null // hand off ownership to parent
            onReadyRef.current(recorderRef.current, chunksRef.current, mimeRef.current, cam)
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
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 8, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
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

      // Attach camera to PiP video element
      cameraStreamRef.current = cameraStream
      setHasCamPip(gotCamera)
      if (cameraVideoRef.current && gotCamera) {
        cameraVideoRef.current.srcObject = cameraStream
      }

      // Build combined stream: screen video + mic audio
      const tracks = [
        ...screenStream.getVideoTracks(),
        ...cameraStream.getAudioTracks(),
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
    cameraStreamRef.current = null // hand off ownership to parent
    onReady(recorderRef.current, chunksRef.current, mimeRef.current, cam)
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
              <p style={{
                fontSize: 14.5,
                color: 'var(--dim)',
                lineHeight: 1.75,
                margin: 0,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Tu sesión de preparación y la llamada quedan grabadas para que el equipo pueda evaluar tu desempeño.
                Cuando hagas clic, el browser te pedirá qué compartir — selecciona{' '}
                <strong style={{ color: 'var(--text)' }}>&quot;Esta pestaña&quot;</strong>.
                Luego se pedirá acceso a tu <strong style={{ color: 'var(--text)' }}>cámara y micrófono</strong>.
              </p>
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
                ['📞', '5 min de llamada en vivo con avatar IA'],
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
      {recStatus === 'recording' && (
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
                Heladería La Fiore
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 13.5,
                color: 'var(--dim)', lineHeight: 1.6,
              }}>
                Dueña · <strong style={{ color: 'var(--text)' }}>Valentina Ríos</strong>
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                color: 'var(--muted)', marginTop: 4,
              }}>
                Helados · Cali, Colombia &nbsp;|&nbsp; Mié–Lun · 3:00 pm – 9:30 pm
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
              Identificar oportunidades de crecimiento y convencer a Valentina de implementar nuevas estrategias con herramientas Rappi. Usa los datos para argumentar con cifras concretas.
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
                { value: '$29.900',        label: 'Ticket promedio',            color: 'var(--text)' },
                { value: '~70–75',         label: 'Pedidos/semana',             color: 'var(--text)' },
                { value: '2+ meses',       label: 'Sin cambios de estrategia',  color: '#f59e0b'     },
                { value: 'Cerrado martes', label: 'Posible día de apertura',    color: '#f59e0b'     },
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
            {[
              {
                name: 'Descuentos 5% + PRO', roi: 'ROI: 22X · Bien optimizado',
                badge: '✅ ACTIVO', badgeColor: 'rgba(0,214,138,.15)', badgeText: 'var(--green)',
              },
              {
                name: 'Ads $1.000.000/sem', roi: 'ROI: 3.9X · 46% consumido · co-inv Rappi 70%',
                badge: '⚠️ SUBUTILIZADO', badgeColor: 'rgba(245,158,11,.15)', badgeText: '#f59e0b',
              },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '11px 0',
                borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
                gap: 10,
              }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'var(--text)', fontWeight: 600, marginBottom: 3 }}>
                    {s.name}
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: 'var(--muted)' }}>
                    {s.roi}
                  </div>
                </div>
                <div style={{
                  padding: '4px 9px', borderRadius: 6,
                  background: s.badgeColor, color: s.badgeText,
                  fontFamily: 'Space Mono, monospace', fontSize: 8.5,
                  fontWeight: 700, letterSpacing: '.5px', flexShrink: 0, marginTop: 2,
                }}>
                  {s.badge}
                </div>
              </div>
            ))}
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
            {[
              'Ads consumen solo el 46% del presupuesto disponible. Rappi co-invierte el 70% — hay presupuesto sin usar.',
              'Campaña visible solo en Onces y Cena — horario ampliable a otras franjas.',
              'Cerrado los martes — potencial de apertura o campaña en ese horario.',
              'Descuentos generan 22X retorno — espacio para incrementar el porcentaje.',
            ].map((opp, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '7px 0',
                borderBottom: i < 3 ? '1px solid rgba(245,158,11,.1)' : 'none',
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
              {salesData.map((val, i) => (
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
              {salesLabels.map((label, i) => (
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
              {salesData.map((val, i) => (
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
