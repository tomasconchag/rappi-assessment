'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Vapi from '@vapi-ai/web'

type Stage = 'form' | 'ready' | 'calling' | 'done' | 'error'

interface Props {
  cohortId: string
  cohortName: string
  cohortDescription: string | null
  inactive: boolean
  documentContent: string
  documentNames: string[]
  vapiAssistantId: string
  endsAt: string | null
}

export function TrainingShell({
  cohortId,
  cohortName,
  cohortDescription,
  inactive,
  documentContent,
  documentNames,
  vapiAssistantId,
  endsAt,
}: Props) {
  const [stage, setStage] = useState<Stage>(inactive ? 'error' : 'form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [callStatus, setCallStatus] = useState<string>('Iniciando…')
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0)
  const [callId, setCallId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop()
      }
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!name.trim()) { setFormError('Ingresa tu nombre'); return }
    if (!email.trim() || !email.includes('@')) { setFormError('Ingresa un email válido'); return }
    setStage('ready')
  }

  const startCall = useCallback(async () => {
    setStage('calling')
    setCallStatus('Conectando con el agente…')

    try {
      const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!)
      vapiRef.current = vapi

      // Wire up events
      vapi.on('call-start', () => setCallStatus('Llamada activa'))
      vapi.on('call-end', () => {
        setCallStatus('Llamada finalizada')
        // Get call ID before tearing down
        const cid = (vapi as unknown as { callId?: string }).callId ?? null
        handleCallEnd(cid)
      })
      vapi.on('speech-start', () => setCallStatus('Agente hablando…'))
      vapi.on('speech-end', () => setCallStatus('Tu turno…'))
      vapi.on('volume-level', (v: number) => setVolume(v))
      vapi.on('error', (err: Error) => {
        console.error('[TrainingShell] vapi error:', err)
        setCallStatus('Error: ' + (err?.message ?? 'unknown'))
      })

      // Build assistant overrides with document context
      const systemContent = documentContent
        ? `Eres el agente de training de Rappi para el ejercicio "${cohortName}".

DOCUMENTOS DE REFERENCIA:
─────────────────────────
${documentContent}
─────────────────────────

Tu rol es simular situaciones de trabajo reales basándote en los documentos anteriores.
Haz preguntas y plantea escenarios para evaluar si el farmer conoce y puede aplicar este contenido.
Sé desafiante pero justo. El ejercicio debe durar entre 10 y 15 minutos.`
        : `Eres el agente de training de Rappi para el ejercicio "${cohortName}".
Simula situaciones de trabajo reales relacionadas con el proceso de BD de Rappi.
Haz preguntas y plantea escenarios para evaluar el conocimiento del farmer.
Sé desafiante pero justo. El ejercicio debe durar entre 10 y 15 minutos.`

      const assistantOverrides = {
        firstMessage: `¡Hola ${name.split(' ')[0]}! Soy tu agente de training para el ejercicio ${cohortName}. ¿Estás listo para comenzar? Te haré algunas preguntas y te plantearé situaciones para practicar.`,
        model: {
          provider: 'openai' as const,
          model: 'gpt-4o',
          messages: [{ role: 'system' as const, content: systemContent }],
        },
        recordingEnabled: true,
      }

      const callRes = await vapi.start(vapiAssistantId, assistantOverrides as Parameters<typeof vapi.start>[1])
      const newCallId = (callRes as { id?: string })?.id ?? null
      setCallId(newCallId)
      setCallStatus('Llamada activa — habla cuando estés listo')

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[TrainingShell] start error:', msg)
      setCallStatus('Error al conectar: ' + msg)
      setStage('error')
    }
  }, [name, email, cohortId, cohortName, documentContent, vapiAssistantId])

  const handleCallEnd = useCallback(async (cid: string | null) => {
    if (animRef.current) clearInterval(animRef.current)
    setCallStatus('Guardando resultados…')

    try {
      const res = await fetch('/api/training/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          farmerEmail: email.trim().toLowerCase(),
          farmerName: name.trim(),
          vapiCallId: cid ?? 'unknown',
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        setSubmitError(d.error ?? 'Error al guardar')
      }
    } catch (e) {
      setSubmitError('Error de conexión al guardar')
    }

    setStage('done')
  }, [cohortId, email, name])

  const stopCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop()
    }
  }, [])

  const toggleMute = () => {
    if (vapiRef.current) {
      const next = !isMuted
      vapiRef.current.setMuted(next)
      setIsMuted(next)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (stage === 'error' && inactive) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, color: 'var(--text)', marginBottom: 8 }}>
            Training no disponible
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans' }}>
            Esta cohorte de training no está activa o ha expirado.
            Contacta a tu administrador de Rappi.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, background: 'rgba(6,214,160,.1)', border: '1px solid rgba(6,214,160,.2)', marginBottom: 16 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#06d6a0' }} />
          <span style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: '#06d6a0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Training Hour</span>
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
          {cohortName}
        </h1>
        {cohortDescription && (
          <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', margin: 0 }}>{cohortDescription}</p>
        )}
        {endsAt && (
          <p style={{ fontSize: 12, color: '#e03554', fontFamily: 'DM Sans', margin: '8px 0 0' }}>
            Disponible hasta: {new Date(endsAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Docs used */}
      {documentNames.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          {documentNames.map(n => (
            <span key={n} style={{ padding: '4px 12px', borderRadius: 100, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', fontSize: 11, fontFamily: 'Space Mono, monospace', color: '#f59e0b' }}>
              📄 {n}
            </span>
          ))}
        </div>
      )}

      {/* Stage: form */}
      {stage === 'form' && (
        <form onSubmit={handleFormSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 28px 24px' }}>
            <div style={{ fontSize: 9.5, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 20 }}>Tus datos</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', marginBottom: 5 }}>Nombre completo</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                style={{ width: '100%', padding: '10px 13px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans', marginBottom: 5 }}>Email corporativo</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@rappi.com"
                type="email"
                required
                style={{ width: '100%', padding: '10px 13px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {formError && (
              <div style={{ fontSize: 12, color: '#ff6b6b', fontFamily: 'DM Sans', marginBottom: 12 }}>⚠️ {formError}</div>
            )}

            <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: 9, background: 'rgba(6,214,160,.12)', border: '1px solid rgba(6,214,160,.3)', color: '#06d6a0', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Continuar →
            </button>
          </div>
        </form>
      )}

      {/* Stage: ready */}
      {stage === 'ready' && (
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 28px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎙️</div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: 'var(--text)', margin: '0 0 12px' }}>
              ¡Todo listo, {name.split(' ')[0]}!
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', fontFamily: 'DM Sans', lineHeight: 1.7, marginBottom: 24 }}>
              Vas a realizar un roleplay de voz con el agente de training.
              Asegúrate de estar en un lugar tranquilo con el micrófono habilitado.
              El ejercicio dura aproximadamente <strong style={{ color: 'var(--text)' }}>10–15 minutos</strong>.
            </p>

            <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', borderRadius: 9, marginBottom: 24, fontSize: 12.5, fontFamily: 'DM Sans', color: '#f59e0b', textAlign: 'left' }}>
              ⚠ Una vez que inicies, no podrás pausar la llamada.
            </div>

            <button
              onClick={startCall}
              style={{ width: '100%', padding: '14px', borderRadius: 9, background: 'linear-gradient(140deg, rgba(6,214,160,.2), rgba(6,214,160,.1))', border: '1px solid rgba(6,214,160,.4)', color: '#06d6a0', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              🎙 Iniciar llamada de training
            </button>
          </div>
        </div>
      )}

      {/* Stage: calling */}
      {stage === 'calling' && (
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '36px 28px' }}>
            {/* Volume visualizer */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 60, marginBottom: 24 }}>
              {Array.from({ length: 9 }).map((_, i) => {
                const center = 4
                const dist = Math.abs(i - center)
                const barVol = Math.max(0, volume - dist * 0.08)
                const h = 6 + barVol * 50
                return (
                  <div
                    key={i}
                    style={{
                      width: 6, borderRadius: 3,
                      height: h,
                      background: volume > 0.1 ? '#06d6a0' : 'rgba(255,255,255,.12)',
                      transition: 'height .1s ease',
                    }}
                  />
                )
              })}
            </div>

            <div style={{ fontSize: 13, fontFamily: 'DM Sans', color: 'var(--muted)', marginBottom: 24 }}>{callStatus}</div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={toggleMute}
                style={{ padding: '10px 20px', borderRadius: 8, background: isMuted ? 'rgba(233,69,96,.12)' : 'rgba(255,255,255,.06)', border: `1px solid ${isMuted ? 'rgba(233,69,96,.3)' : 'var(--border)'}`, color: isMuted ? '#ff6b6b' : 'var(--muted)', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer' }}
              >
                {isMuted ? '🔇 Unmute' : '🎙 Mute'}
              </button>
              <button
                onClick={stopCall}
                style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(233,69,96,.12)', border: '1px solid rgba(233,69,96,.3)', color: '#ff6b6b', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              >
                ⏹ Finalizar llamada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage: done */}
      {stage === 'done' && (
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 28px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, color: 'var(--text)', margin: '0 0 12px' }}>
              ¡Training completado!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', lineHeight: 1.7 }}>
              Tu sesión de training ha sido grabada y enviada para evaluación.
              El equipo de Rappi revisará tus resultados pronto.
            </p>
            {submitError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(233,69,96,.08)', border: '1px solid rgba(233,69,96,.2)', borderRadius: 8, fontSize: 12, color: '#ff6b6b', fontFamily: 'DM Sans' }}>
                ⚠ {submitError} — Contacta a tu administrador.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage: error (generic) */}
      {stage === 'error' && !inactive && (
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 28px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: 'var(--text)', margin: '0 0 12px' }}>
              Ocurrió un error
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', fontFamily: 'DM Sans', lineHeight: 1.7, marginBottom: 20 }}>
              {callStatus}
            </p>
            <button
              onClick={() => { setStage('ready'); setCallStatus('') }}
              style={{ padding: '10px 24px', borderRadius: 9, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'DM Sans', fontSize: 13, cursor: 'pointer' }}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: '40px 20px' }}>
      {/* Rappi logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(140deg, #06d6a0, #059669)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, fontFamily: 'Georgia, serif', color: '#fff' }}>R</div>
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'Georgia, serif', lineHeight: 1 }}>Rappi</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>Training Hour</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}
