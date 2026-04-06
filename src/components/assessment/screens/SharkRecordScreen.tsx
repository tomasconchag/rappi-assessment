'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import { useVideoRecorder } from '@/hooks/useVideoRecorder'
import { fmtTime } from '@/lib/scoring'
import { SharkCriteria } from './SharkCriteria'
import type { SharkScenario } from '@/types/assessment'

interface Props {
  scenario: SharkScenario
  onDone: (blob: Blob, mimeType: string) => void
}

export function SharkRecordScreen({ scenario, onDone }: Props) {
  const { state, countdown, secondsLeft, blob, mimeType, error, initCamera, startCountdown, stopRecording, setVideoRef } = useVideoRecorder(scenario.recTime)
  const [deviceCheckDone, setDeviceCheckDone] = useState(false)

  useEffect(() => { initCamera() }, []) // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(() => setDeviceCheckDone(true), 1200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (state === 'done' && blob) onDone(blob, mimeType)
  }, [state, blob, mimeType, onDone])

  const pct    = (secondsLeft / scenario.recTime) * 100
  const danger = pct < 20
  const warn   = pct < 40

  return (
    <>
      <div className="anim">
        <Tag color="red">SharkTank · Grabando</Tag>
        <p style={{ fontSize: 13.5, color: 'var(--dim)', marginBottom: 12, fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6 }}>
          Habla como si el dueño del restaurante estuviera frente a ti. Máximo {scenario.recTime} segundos.
        </p>

        {/* Device check indicators */}
        {state === 'idle' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[{ label: 'Cámara', icon: '📷' }, { label: 'Micrófono', icon: '🎤' }].map(d => {
              const ok = deviceCheckDone && !error
              const checking = !deviceCheckDone
              return (
                <div key={d.label} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', borderRadius: 100,
                  background: checking ? 'rgba(255,255,255,.04)' : ok ? 'rgba(0,214,138,.08)' : 'rgba(224,53,84,.08)',
                  border: `1px solid ${checking ? 'var(--border)' : ok ? 'rgba(0,214,138,.25)' : 'rgba(224,53,84,.3)'}`,
                  fontSize: 12, fontFamily: 'JetBrains Mono, Space Mono, monospace',
                  color: checking ? 'var(--muted)' : ok ? 'var(--green)' : '#f07090',
                  transition: 'all .4s ease',
                }}>
                  <span>{d.icon}</span>
                  <span>{d.label}</span>
                  <span style={{ fontWeight: 700 }}>{checking ? '···' : ok ? '✓' : '✗'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Evaluation criteria */}
      <SharkCriteria />

      {/* Video container */}
      <div className="anim1" style={{
        position: 'relative', overflow: 'hidden',
        background: '#000', aspectRatio: '16/9',
        marginBottom: 14,
        borderRadius: 'var(--r)',
        border: `2px solid ${state === 'recording' ? 'rgba(224,53,84,.4)' : 'var(--border)'}`,
        boxShadow: state === 'recording' ? '0 0 40px rgba(224,53,84,.15)' : 'none',
        transition: 'border-color .3s, box-shadow .3s',
      }}>
        <video ref={setVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* REC badge */}
        {state === 'recording' && (
          <div style={{
            position: 'absolute', top: 14, left: 14,
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 14px', borderRadius: 100,
            background: 'rgba(224,53,84,.92)',
            backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: 11, fontWeight: 700,
            fontFamily: 'JetBrains Mono, Space Mono, monospace',
            letterSpacing: '1px',
            animation: 'rec-pulse 1.5s ease-in-out infinite',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
            REC
          </div>
        )}

        {/* Timer overlay */}
        {state === 'recording' && (
          <div style={{
            position: 'absolute', top: 14, right: 14,
            padding: '6px 14px', borderRadius: 100,
            background: 'rgba(6,6,13,.75)',
            backdropFilter: 'blur(12px)',
            color: danger ? '#ff6070' : warn ? 'var(--gold)' : '#fff',
            fontFamily: 'JetBrains Mono, Space Mono, monospace',
            fontSize: 17, fontWeight: 700,
            transition: 'color .5s',
          }}>
            {fmtTime(secondsLeft)}
          </div>
        )}

        {/* Countdown */}
        {state === 'countdown' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6,6,13,.75)', backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              fontFamily: 'Fraunces, serif', fontSize: 130, fontWeight: 700,
              color: 'var(--red)', lineHeight: 1,
              textShadow: '0 0 60px rgba(224,53,84,.6)',
              animation: 'scaleIn .3s cubic-bezier(.16,1,.3,1)',
            }}>
              {countdown}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#ff6070', fontSize: 13, marginBottom: 16, fontFamily: 'Inter, DM Sans, sans-serif' }}>
          ⚠ {error}
        </p>
      )}

      {/* Controls */}
      <div className="anim2" style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
        {state === 'idle' && (
          <Button variant="red" onClick={startCountdown} disabled={!!error}>
            ● Iniciar Grabación
          </Button>
        )}
        {state === 'countdown' && (
          <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--dim)', letterSpacing: '.5px' }}>
            Prepárate...
          </span>
        )}
        {state === 'recording' && (
          <>
            <Button variant="ghost" onClick={stopRecording} style={{ borderColor: 'rgba(224,53,84,.3)', color: '#f07090' }}>
              ■ Detener
            </Button>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, Space Mono, monospace', color: 'var(--muted)', letterSpacing: '.5px' }}>
              Grabando...
            </span>
          </>
        )}
        {state === 'done' && (
          <span style={{ fontSize: 13, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 7 }}>
            ✓ Guardando tu pitch...
          </span>
        )}
      </div>
    </>
  )
}
