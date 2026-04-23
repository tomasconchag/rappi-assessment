'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  onReady: (recorder: MediaRecorder, chunks: Blob[], mimeType: string, cameraStream: MediaStream | null, screenStream: MediaStream | null) => void
}

const PREP_SECONDS = 60 // 1 min to prepare before call starts automatically

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

export function CulturalFitPrepScreen({ onReady }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(PREP_SECONDS)
  const [recStatus,   setRecStatus]   = useState<'idle' | 'requesting' | 'recording' | 'error'>('idle')
  const [recError,    setRecError]    = useState('')
  const [hasCamPip,   setHasCamPip]   = useState(false)

  const recorderRef     = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const mimeRef         = useRef('video/webm')
  const warned10Ref     = useRef(false)
  const expiredRef      = useRef(false)
  const onReadyRef      = useRef(onReady)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const cameraVideoRef  = useRef<HTMLVideoElement | null>(null)
  onReadyRef.current    = onReady

  // Precarga el SDK de Vapi mientras el candidato está en prep.
  // Cuando llegue a CulturalFitCallScreen, el módulo ya está en caché → 0ms de descarga.
  useEffect(() => {
    import('@vapi-ai/web').catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop())
        cameraStreamRef.current = null
      }
    }
  }, [])

  // Countdown starts once recording is active
  useEffect(() => {
    if (recStatus !== 'recording') return
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1
        if (next === 10 && !warned10Ref.current) {
          warned10Ref.current = true
          playBeep(800, 0.15, 2)
        }
        if (next <= 0) {
          clearInterval(interval)
          if (!expiredRef.current && recorderRef.current) {
            expiredRef.current = true
            const cam = cameraStreamRef.current
            const scr = screenStreamRef.current
            cameraStreamRef.current = null
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
      // audio: true enables tab audio capture so the AI agent's voice is recorded too
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 8, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })

      let cameraStream: MediaStream | null = null
      let gotCamera = false
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
        })
        gotCamera = true
      } catch {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
          })
        } catch {
          setRecStatus('error')
          setRecError('Debes permitir el acceso al micrófono para continuar con la entrevista.')
          screenStream.getTracks().forEach(t => t.stop())
          return
        }
      }

      // Store screen stream so parent can stop it explicitly when the call ends
      screenStreamRef.current = screenStream

      cameraStreamRef.current = cameraStream
      setHasCamPip(gotCamera)
      if (cameraVideoRef.current && gotCamera) {
        cameraVideoRef.current.srcObject = cameraStream
      }

      const tracks = [
        ...screenStream.getVideoTracks(),
        ...screenStream.getAudioTracks(),   // tab audio — captures AI agent voice
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
      recorder.start(500)
      recorderRef.current = recorder
      setRecStatus('recording')

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
    expiredRef.current = true
    const cam = cameraStreamRef.current
    const scr = screenStreamRef.current
    cameraStreamRef.current = null
    screenStreamRef.current = null
    onReady(recorderRef.current, chunksRef.current, mimeRef.current, cam, scr)
  }, [onReady, recStatus])

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')
  const isRed = secondsLeft <= 10 && recStatus === 'recording'

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg, #06060d)', zIndex: 100, overflow: 'hidden',
    }}>

      {/* Camera PiP */}
      {recStatus === 'recording' && hasCamPip && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 500,
          width: 160, height: 120, borderRadius: 10, overflow: 'hidden',
          border: '2px solid rgba(168,85,247,.3)',
          boxShadow: '0 4px 24px rgba(0,0,0,.5)', background: '#000',
        }}>
          <video
            ref={cameraVideoRef}
            autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
          />
          <div style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff6b6b', animation: 'rec-pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 7.5, color: 'rgba(255,255,255,.8)', letterSpacing: '1px', textTransform: 'uppercase' }}>En vivo</span>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', paddingRight: 165,
        background: 'var(--card)', borderBottom: '1px solid var(--border)', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a855f7', fontWeight: 600 }}>
            🎙 Cultural Fit — Preparación
          </div>
          {recStatus === 'recording' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff6b6b', animation: 'rec-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#ff6b6b', letterSpacing: '1px', textTransform: 'uppercase' }}>REC</span>
            </div>
          )}
        </div>

        {recStatus === 'recording' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isRed && (
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9.5, color: '#ff6b6b', letterSpacing: '1px', animation: 'rec-pulse 1.5s ease-in-out infinite' }}>
                ¡INICIANDO!
              </span>
            )}
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 26, fontWeight: 700, letterSpacing: '2px',
              color: isRed ? '#ff6b6b' : '#a855f7',
              transition: 'color .3s ease',
            }}>
              {mins}:{secs}
            </span>
          </div>
        )}

        {recStatus === 'recording' && (
          <button
            onClick={handleReady}
            style={{
              padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
              border: 'none', color: '#fff', fontFamily: 'DM Sans', cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(168,85,247,.3)',
            }}
          >
            Comenzar entrevista →
          </button>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        {recStatus === 'idle' || recStatus === 'requesting' ? (
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
              background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
              boxShadow: '0 0 40px rgba(168,85,247,.15)',
            }}>
              🎙
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
              Configura tu entrevista
            </h2>
            <p style={{ fontSize: 14, color: 'var(--dim)', marginBottom: 32, lineHeight: 1.7, fontFamily: 'DM Sans' }}>
              Necesitamos acceso a tu <strong style={{ color: 'var(--text)' }}>pantalla</strong>, <strong style={{ color: 'var(--text)' }}>micrófono</strong> y <strong style={{ color: 'var(--text)' }}>cámara</strong> para grabar la entrevista.
            </p>
            {recError && (
              <div style={{ padding: '12px 16px', background: 'rgba(224,53,84,.08)', border: '1px solid rgba(224,53,84,.2)', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#f07090', fontFamily: 'DM Sans', textAlign: 'left' }}>
                ⚠ {recError}
              </div>
            )}
            <button
              onClick={startRecording}
              disabled={recStatus === 'requesting'}
              style={{
                padding: '14px 36px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: recStatus === 'requesting' ? 'rgba(168,85,247,.3)' : 'linear-gradient(140deg,#a855f7,#7c3aed)',
                border: 'none', color: '#fff', fontFamily: 'DM Sans', cursor: recStatus === 'requesting' ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(168,85,247,.3)',
              }}
            >
              {recStatus === 'requesting' ? 'Solicitando permisos...' : 'Activar grabación'}
            </button>
          </div>
        ) : recStatus === 'error' ? (
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, marginBottom: 12, color: '#f07090' }}>Error de grabación</h3>
            <p style={{ fontSize: 13.5, color: 'var(--dim)', marginBottom: 24, fontFamily: 'DM Sans', lineHeight: 1.7 }}>{recError}</p>
            <button
              onClick={() => { setRecStatus('idle'); setRecError('') }}
              style={{ padding: '11px 28px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(168,85,247,.12)', border: '1px solid rgba(168,85,247,.3)', color: '#a855f7', fontFamily: 'DM Sans', cursor: 'pointer' }}
            >
              Intentar de nuevo
            </button>
          </div>
        ) : (
          /* Recording — waiting for user to start */
          <div style={{ maxWidth: 560, textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
              background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
            }}>
              ✅
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
              Todo listo — grabación activa
            </h2>
            <p style={{ fontSize: 14, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.7, fontFamily: 'DM Sans' }}>
              La entrevista con <strong style={{ color: 'var(--text)' }}>Simón</strong> comenzará automáticamente cuando expire el temporizador, o puedes iniciarla ahora.
            </p>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
              {[
                { icon: '🎙', label: 'Micrófono', ok: true },
                { icon: '📹', label: 'Cámara', ok: hasCamPip },
                { icon: '🖥', label: 'Pantalla', ok: true },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 8,
                  background: item.ok ? 'rgba(0,214,138,.06)' : 'rgba(245,158,11,.06)',
                  border: `1px solid ${item.ok ? 'rgba(0,214,138,.2)' : 'rgba(245,158,11,.2)'}`,
                  fontSize: 12, fontFamily: 'DM Sans', color: item.ok ? 'var(--teal)' : '#f59e0b',
                }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  <span>{item.ok ? '✓' : '—'}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleReady}
              style={{
                marginTop: 32,
                padding: '14px 40px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
                border: 'none', color: '#fff', fontFamily: 'DM Sans', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(168,85,247,.35)',
              }}
            >
              Comenzar entrevista →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
