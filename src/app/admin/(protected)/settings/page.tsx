import { createAdminClient } from '@/lib/supabase/admin'
import { MathVersionToggle } from './MathVersionToggle'
import { MathModeToggle } from './MathModeToggle'
import { VoiceProviderToggle } from './VoiceProviderToggle'
import { getQuestionList } from '@/lib/mathSpreadsheetTemplates'

export default async function SettingsPage() {
  const supabase = createAdminClient()

  const [{ data: configData }, { data: allMathQs }] = await Promise.all([
    supabase
      .from('assessment_configs')
      .select('id, label, math_version, math_mode, spreadsheet_q_overrides, voice_provider')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('assessment_questions')
      .select('id, version, position, content, difficulty, points, correct_answer, is_honeypot, options')
      .eq('section', 'math')
      .in('version', ['A', 'B'])
      .order('position', { ascending: true }),
  ])

  const questionsA = (allMathQs || []).filter(q => q.version === 'A')
  const questionsB = (allMathQs || []).filter(q => q.version === 'B')

  const spreadsheetQuestionsA = getQuestionList('A')
  const spreadsheetQuestionsB = getQuestionList('B')
  const spreadsheetOverrides = (configData?.spreadsheet_q_overrides ?? {}) as Record<string, string>

  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '28px 32px',
  }

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Configuración
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
          Ajustes del Assessment
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
          Controla la configuración activa del proceso de evaluación.
        </p>
      </div>

      {!configData ? (
        <div style={card}>
          <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
            No hay ningún assessment activo configurado en Supabase.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Active config info */}
          <div style={{ ...card, borderTop: '3px solid var(--blue)' }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 12 }}>
              Assessment activo
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>
              {configData.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Space Mono, monospace', marginTop: 4 }}>
              ID: {configData.id}
            </div>
          </div>

          {/* Voice Provider selector */}
          <div style={{ ...card, borderTop: '3px solid #f59e0b' }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>
              Role Play · Proveedor de Voz
            </div>
            <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, marginBottom: 20 }}>
              Elige cómo los candidatos realizarán la llamada del roleplay. Vapi funciona directo en el navegador; Arbol AI realiza una llamada telefónica real al candidato.
            </p>
            <VoiceProviderToggle
              configId={configData.id}
              currentProvider={(configData.voice_provider as 'vapi' | 'arbol') || 'vapi'}
            />
          </div>

          {/* Math mode selector */}
          <div style={{ ...card, borderTop: '3px solid var(--teal)' }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>
              Taller de Matemáticas · Tipo de prueba
            </div>
            <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, marginBottom: 20 }}>
              Elige si los candidatos responden preguntas una a una o trabajan directamente en una hoja de cálculo embebida.
            </p>
            <MathModeToggle
              configId={configData.id}
              currentMode={(configData.math_mode as 'questions' | 'spreadsheet') || 'questions'}
              currentVersion={configData.math_version || 'random'}
              questionsA={spreadsheetQuestionsA}
              questionsB={spreadsheetQuestionsB}
              initialOverrides={spreadsheetOverrides}
            />
          </div>

          {/* Math version selector (questions mode only) */}
          {(configData.math_mode ?? 'questions') === 'questions' && (
          <div style={{ ...card, borderTop: '3px solid var(--teal)' }}>
            <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 6 }}>
              Taller de Matemáticas · Versión (modo preguntas)
            </div>
            <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, marginBottom: 24 }}>
              Elige qué versión verán los candidatos. Ambas tienen el mismo contexto pero números distintos.
              En modo <strong style={{ color: 'var(--gold)' }}>Aleatoria</strong>, cada candidato recibe una versión diferente al azar.
            </p>
            <MathVersionToggle
              configId={configData.id}
              currentVersion={configData.math_version || 'A'}
              questionsA={questionsA}
              questionsB={questionsB}
            />
          </div>
          )}

        </div>
      )}
    </div>
  )
}
