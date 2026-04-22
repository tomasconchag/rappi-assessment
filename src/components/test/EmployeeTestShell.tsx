'use client'

import { useState, useCallback } from 'react'
import { MathSpreadsheetScreen } from '@/components/assessment/screens/MathSpreadsheetScreen'
import { scoreMathSpreadsheet } from '@/lib/mathSpreadsheetTemplates'
import type { SpreadsheetVersion, SpreadsheetAnswer } from '@/lib/mathSpreadsheetTemplates'

type Stage = 'welcome' | 'test' | 'submitting' | 'done' | 'error'

interface Props {
  templateId:    string
  employeeEmail: string
  employeeName:  string | null
  batchName:     string
  template:      SpreadsheetVersion
  alreadyUsed:   boolean
}

export function EmployeeTestShell({
  templateId,
  employeeEmail,
  employeeName,
  batchName,
  template,
  alreadyUsed,
}: Props) {
  const [stage, setStage] = useState<Stage>(alreadyUsed ? 'done' : 'welcome')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [scoreResult, setScoreResult] = useState<{
    correct: number; total: number; accuracyPct: number; pct: number
  } | null>(null)

  const displayName = employeeName ?? employeeEmail.split('@')[0]

  // Called by MathSpreadsheetScreen when user submits (or time runs out)
  const handleDone = useCallback(async (answers: SpreadsheetAnswer[], secsLeft: number) => {
    setStage('submitting')

    const scored = scoreMathSpreadsheet(template, answers, secsLeft, 600)
    const mathDetails = scored.details.map((d, idx) => ({
      idx,
      correct: d.correct,
      pointsAwarded: d.correct ? 1 : 0,
      got: d.got,
    }))

    try {
      const res = await fetch('/api/test-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          mathDetails,
          mathScoreRaw:   scored.correct,
          mathScoreTotal: scored.total,
          mathScorePct:   scored.pct,
          mathTimeSecs:   600 - secsLeft,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`)
      }

      setScoreResult(scored)
      setStage('done')
    } catch (e) {
      console.error('[EmployeeTestShell] submission error:', e)
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setStage('error')
    }
  }, [template, templateId])

  // ── Screens ──────────────────────────────────────────────────────────────

  if (stage === 'welcome') {
    return (
      <main style={{
        minHeight: '100vh', background: 'var(--bg, #0a0a14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      }}>
        <div style={{ maxWidth: 540, width: '100%' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(140deg,#e03554,#c22448)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'Georgia, serif',
            }}>R</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text, #fff)', fontFamily: 'Fraunces, serif', lineHeight: 1 }}>
                Rappi
              </div>
              <div style={{ fontSize: 9, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted, rgba(255,255,255,.35))', marginTop: 3 }}>
                Evaluación Interna
              </div>
            </div>
          </div>

          {/* Greeting */}
          <p style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted, rgba(255,255,255,.4))', marginBottom: 10 }}>
            Hola, {displayName}
          </p>
          <h1 style={{
            fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 700,
            color: 'var(--text, #fff)', lineHeight: 1.15, marginBottom: 20,
          }}>
            Tu prueba de Excel<br />está lista
          </h1>
          <p style={{ fontSize: 15, color: 'var(--dim, rgba(255,255,255,.55))', lineHeight: 1.7, marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>
            Lote: <strong style={{ color: 'var(--text, #fff)' }}>{batchName}</strong>
          </p>
          <p style={{ fontSize: 14, color: 'var(--dim, rgba(255,255,255,.5))', lineHeight: 1.7, marginBottom: 32, fontFamily: 'DM Sans, sans-serif' }}>
            Completa el ejercicio de Excel trabajando con datos reales del negocio.
            Tienes <strong style={{ color: 'var(--text, #fff)' }}>10 minutos</strong> una vez que inicies.
          </p>

          {/* Info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
            <InfoCard icon="⏱" title="10 minutos" body="El temporizador arranca al presionar Iniciar. No puedes pausar." />
            <InfoCard icon="💻" title="Usa un computador" body="Esta prueba no está optimizada para celular. Usa laptop o escritorio." />
            <InfoCard icon="🔒" title="Enlace personal" body={`Registrado para ${employeeEmail}. No compartas este link.`} />
          </div>

          {/* Start button */}
          <button
            onClick={() => setStage('test')}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 12,
              background: 'linear-gradient(140deg,#e03554,#c22448)',
              border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', letterSpacing: '.3px',
              boxShadow: '0 4px 24px rgba(224,53,84,.35)',
            }}
          >
            Iniciar prueba →
          </button>
        </div>
      </main>
    )
  }

  if (stage === 'test') {
    return (
      <div style={{ background: 'var(--bg, #0a0a14)', minHeight: '100vh' }}>
        <MathSpreadsheetScreen
          template={template}
          onDone={handleDone}
          candidateEmail={employeeEmail}
        />
      </div>
    )
  }

  if (stage === 'submitting') {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg, #0a0a14)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 20, animation: 'spin 1s linear infinite' }}>⏳</div>
          <p style={{ fontSize: 15, color: 'var(--dim, rgba(255,255,255,.5))', fontFamily: 'DM Sans, sans-serif' }}>
            Enviando tus respuestas…
          </p>
        </div>
      </main>
    )
  }

  if (stage === 'error') {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg, #0a0a14)', padding: 40,
      }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text, #fff)', marginBottom: 14 }}>
            Error al enviar
          </h1>
          <p style={{ fontSize: 14, color: 'var(--dim, rgba(255,255,255,.5))', lineHeight: 1.7, marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>
            {errorMsg ?? 'Ocurrió un error inesperado.'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted, rgba(255,255,255,.35))', fontFamily: 'Space Mono, monospace' }}>
            Escríbele a tu coordinador de People e indica este error.
          </p>
        </div>
      </main>
    )
  }

  // stage === 'done'
  const pct = scoreResult?.pct ?? null
  const correct = scoreResult?.correct ?? null
  const total   = scoreResult?.total   ?? null
  const emoji   = pct === null ? '✅' : pct >= 80 ? '🏆' : pct >= 60 ? '✅' : '📝'

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg, #0a0a14)', padding: 40,
    }}>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 24 }}>{emoji}</div>
        <h1 style={{
          fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700,
          color: 'var(--text, #fff)', marginBottom: 14, lineHeight: 1.2,
        }}>
          {alreadyUsed ? '¡Ya completaste esta prueba!' : '¡Prueba completada!'}
        </h1>

        {!alreadyUsed && pct !== null && (
          <div style={{
            display: 'inline-block', padding: '20px 40px', borderRadius: 16, marginBottom: 24,
            background: 'rgba(0,214,138,.08)', border: '1px solid rgba(0,214,138,.2)',
          }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--green, #00d68a)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>
              {pct}%
            </div>
            {correct !== null && total !== null && (
              <div style={{ fontSize: 13, color: 'var(--muted, rgba(255,255,255,.4))', marginTop: 6, fontFamily: 'Space Mono, monospace' }}>
                {correct}/{total} correctas
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: 15, color: 'var(--dim, rgba(255,255,255,.55))', lineHeight: 1.7, fontFamily: 'DM Sans, sans-serif' }}>
          {alreadyUsed
            ? 'Tus respuestas ya fueron registradas. Si tienes alguna duda, contacta a tu coordinador de People.'
            : 'Tus respuestas fueron guardadas exitosamente. El equipo de People revisará los resultados.'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted, rgba(255,255,255,.3))', marginTop: 16, fontFamily: 'Space Mono, monospace' }}>
          Equipo People, Rappi
        </p>
      </div>
    </main>
  )
}

function InfoCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 18px', borderRadius: 10,
      background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #fff)', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted, rgba(255,255,255,.4))', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
          {body}
        </div>
      </div>
    </div>
  )
}
