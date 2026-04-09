import { createAdminClient } from '@/lib/supabase/admin'
import { VoiceProviderToggle } from '../settings/VoiceProviderToggle'
import { RolePlayTestPanel } from './RolePlayTestPanel'
import { RolePlayBankSelector } from './RolePlayBankSelector'
import type { RoleplayBankEntry } from '@/types/assessment'

export default async function RolePlayPage() {
  const supabase = createAdminClient()

  const [{ data: configData }, { data: roleplayCases }] = await Promise.all([
    supabase
      .from('assessment_configs')
      .select('id, voice_provider, active_roleplay_case_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('roleplay_bank')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])

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
          Configura el agente de voz y prueba llamadas con cualquier caso.
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

          {/* Test panel — call button + case editor */}
          <RolePlayTestPanel
            voiceProvider={(configData.voice_provider as 'vapi' | 'arbol') || 'vapi'}
            activeBankCase={(roleplayCases as RoleplayBankEntry[])?.find(
              c => c.id === (configData as { active_roleplay_case_id?: string | null }).active_roleplay_case_id
            ) ?? null}
          />

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

          {/* Roleplay case bank */}
          {roleplayCases && roleplayCases.length > 0 && (
            <div style={{ ...card, borderTop: '3px solid #f59e0b' }}>
              <RolePlayBankSelector
                configId={configData.id}
                initialActiveId={(configData as { active_roleplay_case_id?: string | null }).active_roleplay_case_id ?? null}
                cases={roleplayCases as RoleplayBankEntry[]}
              />
            </div>
          )}

        </div>
      )}
    </div>
  )
}
