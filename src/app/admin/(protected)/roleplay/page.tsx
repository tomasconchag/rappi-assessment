import { createAdminClient } from '@/lib/supabase/admin'
import { VoiceProviderToggle } from '../settings/VoiceProviderToggle'
import { RolePlayTestButton } from './RolePlayTestButton'

export default async function RolePlayPage() {
  const supabase = createAdminClient()

  const { data: configData } = await supabase
    .from('assessment_configs')
    .select('id, voice_provider')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

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
          Role Play
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
          Configura el agente de voz para el roleplay.
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

          {/* Test call */}
          <div style={{ ...card, borderTop: '3px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                Probar llamada
              </div>
              <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, margin: 0 }}>
                Inicia una llamada de prueba como candidato — sin crear usuarios ni pasar por el flujo completo.
              </p>
            </div>
            <RolePlayTestButton
              voiceProvider={(configData.voice_provider as 'vapi' | 'arbol') || 'vapi'}
              roleplayCase={null}
            />
          </div>

          {/* Voice Provider selector */}
          <div style={{ ...card, borderTop: '3px solid var(--border)' }}>
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

        </div>
      )}
    </div>
  )
}
