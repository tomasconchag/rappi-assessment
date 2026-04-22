/**
 * GET /api/template/[token]
 *
 * Loads a personalized spreadsheet template by invite token.
 * Called by the assessment when the URL contains ?t=TOKEN.
 *
 * Returns:
 * {
 *   templateId:    string,
 *   batchId:       string,
 *   batchName:     string,
 *   configId:      string,
 *   employeeEmail: string,
 *   employeeName:  string | null,
 *   template:      { version, cells, answerCells }   ← SpreadsheetVersion shape
 * }
 *
 * 404 if token not found.
 * 410 Gone if already used (prevents sharing links).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest }       from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!token || token.length < 10) {
    return Response.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('personalized_templates')
    .select(`
      id, employee_email, employee_name, template_json, used_at,
      template_batches ( id, name, config_id )
    `)
    .eq('invite_token', token)
    .maybeSingle()

  if (error) {
    console.error('[template] DB error:', error)
    return Response.json({ error: 'Database error' }, { status: 500 })
  }

  if (!data) {
    return Response.json({ error: 'Token not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batch = Array.isArray(data.template_batches) ? data.template_batches[0] : data.template_batches as any

  return Response.json({
    templateId:    data.id,
    batchId:       batch?.id     ?? null,
    batchName:     batch?.name   ?? null,
    configId:      batch?.config_id ?? null,
    employeeEmail: data.employee_email,
    employeeName:  data.employee_name ?? null,
    template:      data.template_json,
    alreadyUsed:   !!data.used_at,
  })
}
