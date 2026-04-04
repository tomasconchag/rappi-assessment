'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  videoBlob: Blob | null
  onNext: () => void
}

export function SharkDoneScreen({ videoBlob, onNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && videoBlob) {
      videoRef.current.src = URL.createObjectURL(videoBlob)
    }
  }, [videoBlob])

  return (
    <div className="anim" style={{ textAlign: 'center', padding: '48px 0' }}>
      {/* Success icon */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
        background: 'rgba(0,214,138,.1)', border: '1px solid rgba(0,214,138,.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30,
        boxShadow: '0 0 40px rgba(0,214,138,.15)',
      }}>
        ✓
      </div>

      <h2 style={{
        fontFamily: 'Fraunces, serif', fontSize: 36,
        fontWeight: 700, marginBottom: 10, letterSpacing: '-.5px',
      }}>
        Pitch grabado
      </h2>
      <p style={{ color: 'var(--dim)', fontSize: 14.5, marginBottom: 32, fontFamily: 'Inter, DM Sans, sans-serif' }}>
        Tu video ha sido registrado exitosamente.
      </p>

      {videoBlob && (
        <div style={{ maxWidth: 520, margin: '0 auto 32px' }}>
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: '#000', aspectRatio: '16/9',
            borderRadius: 'var(--r)',
            border: '1px solid var(--border)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 8px 40px rgba(0,0,0,.5)',
          }}>
            <video ref={videoRef} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      )}

      <Button variant="blue" onClick={onNext}>
        Siguiente: Caso Práctico 📊
      </Button>
    </div>
  )
}
