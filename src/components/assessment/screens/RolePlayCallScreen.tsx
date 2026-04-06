'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { AnamClient } from '@anam-ai/js-sdk'

interface Props {
  onDone: () => void
  cameraStream: MediaStream | null
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

type AvatarStatus = 'loading' | 'connected' | 'error'

export function RolePlayCallScreen({ onDone, cameraStream }: Props) {
  const [secondsLeft,  setSecondsLeft]  = useState(TOTAL_SECONDS)
  const [confirmEnd,   setConfirmEnd]   = useState(false)
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>('loading')
  const [avatarError,  setAvatarError]  = useState<string | null>(null)
  const warned60Ref    = useRef(false)
  const endedRef       = useRef(false)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const anamClientRef  = useRef<AnamClient | null>(null)

  // Attach camera stream to PiP video element
  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  // Initialize anam.ai avatar via SDK (session token from server — no cookies needed)
  useEffect(() => {
    let cancelled = false

    async function startAvatar() {
      try {
        // 1. Get a short-lived session token from our backend
        const res = await fetch('/api/anam-session', { method: 'POST' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(err.error || `Session error ${res.status}`)
        }
        const { sessionToken } = await res.json() as { sessionToken: string }
        if (cancelled) return

        // 2. Initialize the anam client
        const { createClient, AnamEvent } = await import('@anam-ai/js-sdk')
        const client = createClient(sessionToken)
        anamClientRef.current = client

        // 3. Listen for events
        client.addListener(AnamEvent.VIDEO_PLAY_STARTED, () => {
          if (!cancelled) setAvatarStatus('connected')
        })
        client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
          if (!cancelled && !endedRef.current) setAvatarStatus('error')
        })

        // 4. Stream to video + audio elements
        await client.streamToVideoAndAudioElements(
          'roleplay-avatar-video',
          'roleplay-avatar-audio',
        )
      } catch (e) {
        if (!cancelled) {
          setAvatarStatus('error')
          setAvatarError(e instanceof Error ? e.message : String(e))
        }
      }
    }

    startAvatar()

    return () => {
      cancelled = true
      anamClientRef.current?.stopStreaming()
      anamClientRef.current = null
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const finalize = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true
    playBeep(440, 0.5, 1)
    setTimeout(() => onDone(), 1000)
  }, [onDone])

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

  const mins  = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs  = String(secondsLeft % 60).padStart(2, '0')
  const isRed = secondsLeft <= 60

  const maxBar = Math.max(...salesData)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg, #06060d)', zIndex: 100, overflow: 'hidden',
    }}>

      {/* Camera PiP overlay — visible in screen recording so admin sees the candidate */}
      {cameraStream && (
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
              transform: 'scaleX(-1)',
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

      {/* Timer bar — 3-column grid so center stays centered and right controls don't collide with ProctoringBadge */}
      <div style={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '12px 24px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        zIndex: 10,
      }}>

        {/* Left: REC indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#ff6b6b',
            animation: 'rec-pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 9,
            color: '#ff6b6b', letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            REC
          </span>
        </div>

        {/* Center: timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)',
          }}>
            Tiempo restante
          </span>
          <span style={{
            fontFamily: 'Space Mono, monospace', fontSize: 28, fontWeight: 700,
            letterSpacing: '2px', color: isRed ? '#ff6b6b' : 'var(--text)',
            transition: 'color .5s ease', lineHeight: 1,
          }}>
            ⏱ {mins}:{secs}
          </span>
          {isRed && (
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 10,
              color: '#ff6b6b', letterSpacing: '1px',
              animation: 'rec-pulse 1.5s ease-in-out infinite',
            }}>
              ¡ÚLTIMO MINUTO!
            </span>
          )}
        </div>

        {/* Right: end button — mr-[~160px] so it never overlaps the fixed ProctoringBadge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: 160 }}>
          {!confirmEnd ? (
            <button
              onClick={() => setConfirmEnd(true)}
              style={{
                padding: '6px 14px', borderRadius: 7,
                background: 'rgba(255,107,107,.1)',
                border: '1px solid rgba(255,107,107,.3)',
                color: '#ff6b6b',
                fontFamily: 'Space Mono, monospace', fontSize: 10,
                letterSpacing: '.5px', cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Terminar llamada
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: 10,
                color: 'var(--muted)', letterSpacing: '.3px',
              }}>
                ¿Confirmas?
              </span>
              <button
                onClick={finalize}
                style={{
                  padding: '6px 14px', borderRadius: 7,
                  background: 'rgba(255,107,107,.2)',
                  border: '1px solid rgba(255,107,107,.5)',
                  color: '#ff6b6b',
                  fontFamily: 'Space Mono, monospace', fontSize: 10,
                  letterSpacing: '.5px', cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Sí, terminar
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                style={{
                  padding: '6px 14px', borderRadius: 7,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                  fontFamily: 'Space Mono, monospace', fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main two-column layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left — Avatar (45%) — streamed via @anam-ai/js-sdk */}
        <div style={{
          width: '45%', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          padding: '16px', borderRight: '1px solid var(--border)',
          gap: 8, minHeight: 0,
        }}>
          {/* Avatar video container */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0a0a12' }}>
            {/* Hidden audio element for avatar voice */}
            <audio id="roleplay-avatar-audio" autoPlay />

            {/* Avatar video stream */}
            <video
              id="roleplay-avatar-video"
              autoPlay
              playsInline
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
                opacity: avatarStatus === 'connected' ? 1 : 0,
                transition: 'opacity .5s ease',
              }}
            />

            {/* Loading overlay */}
            {avatarStatus === 'loading' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 12, background: '#0a0a12',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '3px solid rgba(245,158,11,.15)',
                  borderTopColor: '#f59e0b',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 10,
                  color: 'var(--muted)', letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}>
                  Conectando avatar…
                </span>
              </div>
            )}

            {/* Error overlay */}
            {avatarStatus === 'error' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 10, background: '#0a0a12', padding: 24,
              }}>
                <span style={{ fontSize: 32 }}>⚠️</span>
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 10,
                  color: '#f07090', letterSpacing: '.5px',
                  textTransform: 'uppercase', textAlign: 'center',
                }}>
                  Avatar no disponible
                </span>
                {avatarError && (
                  <span style={{
                    fontFamily: 'Space Mono, monospace', fontSize: 9,
                    color: 'var(--muted)', textAlign: 'center',
                  }}>
                    {avatarError}
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{
            flexShrink: 0, textAlign: 'center',
            fontFamily: 'Space Mono, monospace', fontSize: 9,
            letterSpacing: '1px', color: 'var(--muted)',
            textTransform: 'uppercase', padding: '4px 0',
          }}>
            🤖 Avatar IA — Heladería La Fiore
          </div>
        </div>

        {/* Right — CRM Panel (55%) */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0,
        }}>

          {/* Client header */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', marginBottom: 10,
              borderBottom: '1px solid var(--border)', paddingBottom: 8,
            }}>
              Información del cliente
            </div>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 18,
              fontWeight: 700, color: 'var(--text)', marginBottom: 3,
            }}>
              Heladería La Fiore
            </div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
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

          {/* Stats 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { value: '$29.900',  label: 'Ticket prom.'  },
              { value: '~70–75',   label: 'Pedidos/sem'   },
              { value: '2+ meses', label: 'Sin cambios'   },
              { value: 'Cali',     label: 'Colombia'      },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 14px',
              }}>
                <div style={{
                  fontFamily: 'Fraunces, serif', fontSize: 20,
                  fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginBottom: 4,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)',
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Active strategies */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', marginBottom: 10,
            }}>
              Estrategias activas
            </div>
            {[
              { name: 'Descuentos 5% + PRO', roi: 'ROI: 22X', badge: '✅ ACTIVO',        badgeColor: 'rgba(0,214,138,.15)', badgeText: 'var(--green)' },
              { name: 'Ads $1.000.000/sem',  roi: 'ROI: 3.9X', badge: '⚠️ SUBUTILIZADO', badgeColor: 'rgba(245,158,11,.15)', badgeText: '#f59e0b'      },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
                gap: 8,
              }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                    {s.name}
                  </div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    {s.roi}
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px', borderRadius: 6,
                  background: s.badgeColor, color: s.badgeText,
                  fontFamily: 'Space Mono, monospace', fontSize: 9,
                  fontWeight: 700, letterSpacing: '.5px', flexShrink: 0,
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
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: '#f59e0b', marginBottom: 10,
            }}>
              Oportunidades detectadas
            </div>
            {[
              'Los Ads solo gastan el 46% del presupuesto disponible (co-inversión Rappi 70%)',
              'Campaña visible solo en Onces y Cena — horario ampliable',
              'Cerrado los martes — posible día de apertura',
              'Descuentos con 22X retorno — espacio para incrementar',
            ].map((opp, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '6px 0',
                borderBottom: i < 3 ? '1px solid rgba(245,158,11,.1)' : 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: 12.5,
                color: 'var(--dim)', lineHeight: 1.55,
              }}>
                <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>💡</span>
                {opp}
              </div>
            ))}
          </div>

          {/* Sales history */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '1.5px',
              color: 'var(--muted)', marginBottom: 12,
            }}>
              Historial de ventas — pedidos/semana
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 44 }}>
              {salesData.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.round((val / maxBar) * 36)}px`,
                    background: 'rgba(245,158,11,.55)',
                    borderRadius: '3px 3px 0 0', minHeight: 4,
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {salesLabels.map((label, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center',
                  fontFamily: 'Space Mono, monospace', fontSize: 7.5,
                  color: 'var(--muted)', letterSpacing: '.3px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
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

        </div>
      </div>
    </div>
  )
}
