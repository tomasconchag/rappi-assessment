/**
 * /test?t=TOKEN
 *
 * Employee internal Excel test page.
 * Completely separate from /assessment — different branding,
 * no video, no roleplay. Just the spreadsheet + submit.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { EmployeeTestShell } from '@/components/test/EmployeeTestShell'
import type { SpreadsheetVersion } from '@/lib/mathSpreadsheetTemplates'

export default async function TestPage(props: {
  searchParams: Promise<{ t?: string }>
}) {
  const searchParams = await props.searchParams
  const token = searchParams.t ?? null

  if (!token) {
    return <InvalidLink reason="No se proporcionó un enlace válido." />
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('personalized_templates')
    .select(`
      id, employee_email, employee_name, template_json, used_at,
      template_batches ( id, name )
    `)
    .eq('invite_token', token)
    .maybeSingle()

  if (error) {
    console.error('[test] DB error:', error)
    return <InvalidLink reason="Error interno. Intenta de nuevo en unos minutos." />
  }

  if (!data) {
    return <InvalidLink reason="Enlace no encontrado o expirado." />
  }

  // Record first open (non-blocking, best-effort)
  if (!data.used_at) {
    supabase
      .from('personalized_templates')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', data.id)
      .is('opened_at', null)
      .then(({ error: e }) => {
        if (e) console.warn('[test] could not set opened_at:', e.message)
      })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batch = Array.isArray(data.template_batches) ? data.template_batches[0] : data.template_batches as any

  return (
    <EmployeeTestShell
      templateId={data.id}
      employeeEmail={data.employee_email}
      employeeName={data.employee_name ?? null}
      batchName={batch?.name ?? 'Evaluación Interna'}
      template={data.template_json as unknown as SpreadsheetVersion}
      alreadyUsed={!!data.used_at}
    />
  )
}

function InvalidLink({ reason }: { reason: string }) {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg, #0a0a14)', padding: 40,
    }}>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🔗</div>
        <h1 style={{
          fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700,
          color: 'var(--text, #fff)', marginBottom: 14, lineHeight: 1.2,
        }}>
          Enlace inválido
        </h1>
        <p style={{ fontSize: 15, color: 'var(--dim, rgba(255,255,255,.5))', lineHeight: 1.7, fontFamily: 'DM Sans, sans-serif' }}>
          {reason}
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted, rgba(255,255,255,.3))', marginTop: 16, fontFamily: 'Space Mono, monospace' }}>
          Si crees que es un error, escríbele a tu coordinador de People.
        </p>
      </div>
    </main>
  )
}
