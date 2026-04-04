'use client'

import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import type { SharkScenario } from '@/types/assessment'

interface Props {
  scenario: SharkScenario
  onStart: () => void
}

const steps = [
  { n: '1', text: '<strong>Lee el escenario:</strong> Entiende el problema del restaurante, sus números y su frustración.' },
  { n: '2', text: '<strong>Preparación (2 minutos):</strong> Tienes 2 minutos cronometrados para preparar tu pitch mentalmente.' },
  { n: '3', text: '<strong>Grabación (máx. 90 seg):</strong> Grabarás tu pitch en video. Habla a la cámara como si el dueño del restaurante estuviera frente a ti.' },
]

const criteria = [
  { text: '<strong>Propuesta de valor:</strong> ¿Le das una razón clara para actuar?' },
  { text: '<strong>Manejo de objeciones:</strong> ¿Anticipas sus dudas y las resuelves?' },
  { text: '<strong>Creatividad:</strong> ¿Tu propuesta es original y viable?' },
  { text: '<strong>Comunicación:</strong> ¿Eres claro, seguro y persuasivo?' },
]

export function SharkIntroScreen({ scenario, onStart }: Props) {
  return (
    <div className="anim">
      <Tag color="red">Ejercicio 1 de 3 · SharkTank</Tag>

      {/* Intro card */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '36px 40px', marginBottom: 20,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)',
      }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700,
          marginBottom: 16, letterSpacing: '-.5px',
        }}>
          SharkTank Pitch
        </h2>
        <p style={{ fontSize: 14.5, color: 'var(--dim)', lineHeight: 1.8, marginBottom: 24, fontFamily: 'Inter, DM Sans, sans-serif' }}>
          Simulas ser un Farmer de Rappi. Recibirás un caso real: un restaurante aliado con un problema específico.
          Tu trabajo es <strong style={{ color: 'var(--text)' }}>convencerlo de tomar acción</strong>.
        </p>

        <p style={{ fontSize: 12, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: 14, fontWeight: 500 }}>¿Cómo funciona?</p>
        <ul style={{ listStyle: 'none', marginBottom: 28 }}>
          {steps.map((s, i) => (
            <li key={i} style={{
              padding: '11px 0',
              borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
              fontSize: 13.5, display: 'flex', gap: 13, alignItems: 'flex-start',
              color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6,
            }}>
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                background: 'rgba(224,53,84,.14)', color: '#f07090',
                fontFamily: 'JetBrains Mono, Space Mono, monospace',
              }}>{s.n}</span>
              <span dangerouslySetInnerHTML={{ __html: s.text }} />
            </li>
          ))}
        </ul>

        <p style={{ fontSize: 12, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: 14, fontWeight: 500 }}>¿Qué se evalúa?</p>
        <ul style={{ listStyle: 'none' }}>
          {criteria.map((c, i) => (
            <li key={i} style={{
              padding: '11px 0',
              borderBottom: i < criteria.length - 1 ? '1px solid var(--border)' : 'none',
              fontSize: 13.5, display: 'flex', gap: 13, alignItems: 'flex-start',
              color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6,
            }}>
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11,
                background: 'rgba(232,146,48,.12)', color: '#f0ac60',
              }}>→</span>
              <span dangerouslySetInnerHTML={{ __html: c.text }} />
            </li>
          ))}
        </ul>
      </div>

      {/* Scenario card */}
      <div className="anim1" style={{
        background: 'var(--card)',
        border: '1px solid rgba(224,53,84,.2)',
        borderLeft: '3px solid var(--red)',
        borderRadius: 'var(--r)',
        padding: '28px 32px',
        marginBottom: 16,
        boxShadow: '0 0 30px rgba(224,53,84,.08), inset 0 1px 0 rgba(255,255,255,.05)',
      }}>
        <div style={{
          fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '1.5px',
          color: '#f07090', marginBottom: 14, fontWeight: 500,
        }}>
          📋 Tu escenario
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.8, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)' }}>
          <strong>{scenario.name}</strong>{' '}
          <span style={{ color: 'var(--dim)' }}>— {scenario.desc}</span>
        </p>
      </div>

      {/* Mission card */}
      <div className="anim2" style={{
        background: 'rgba(224,53,84,.05)',
        border: '1px solid rgba(224,53,84,.15)',
        borderLeft: '3px solid var(--red)',
        borderRadius: 'var(--r)',
        padding: '28px 32px',
        marginBottom: 36,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
      }}>
        <div style={{
          fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '1.5px',
          color: '#f07090', marginBottom: 14, fontWeight: 500,
        }}>
          🎯 Tu misión
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.8, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--text)' }}>
          {scenario.mission}
        </p>
      </div>

      <div className="anim3" style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="red" onClick={onStart}>
          Entendido — Empezar preparación ⏱
        </Button>
      </div>
    </div>
  )
}
