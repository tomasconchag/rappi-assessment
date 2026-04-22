/**
 * POST /api/batch-import
 *
 * Receives a JSON export from the Google Apps Script macro and creates:
 *   1. A `template_batches` record
 *   2. One `personalized_templates` record per employee (with unique invite tokens)
 *
 * Expected body shape (macro must export this format):
 * {
 *   batchName: string,          // e.g. "Excel Test Abril 2026"
 *   configId:  string,          // assessment_configs.id (Farmer Assessment v1)
 *   createdBy: string,          // admin email
 *   employees: Array<{
 *     email: string,
 *     name:  string,
 *     cells: CellDef[],         // pre-filled spreadsheet cells (data + locked)
 *     answerCells: AnswerCell[], // cells to grade, each with an `expected` value
 *   }>
 * }
 *
 * Returns:
 * {
 *   batchId: string,
 *   inviteLinks: Array<{ email, name, token, url }>
 * }
 *
 * Security: requires X-Admin-Secret header matching ADMIN_SECRET env var.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest }       from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = req.headers.get('x-admin-secret')
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { batchName, configId, createdBy, employees } = body as {
    batchName: string
    configId:  string
    createdBy: string
    employees: Array<{
      email: string
      name:  string
      cells: unknown[]
      answerCells: unknown[]
    }>
  }

  if (!batchName || !configId || !Array.isArray(employees) || employees.length === 0) {
    return Response.json({ error: 'Missing required fields: batchName, configId, employees[]' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ── 1. Create the batch ───────────────────────────────────────────────────
  const { data: batch, error: batchErr } = await supabase
    .from('template_batches')
    .insert({ name: batchName, config_id: configId, created_by: createdBy ?? null })
    .select('id')
    .single()

  if (batchErr || !batch) {
    console.error('[batch-import] batch insert failed:', batchErr)
    return Response.json({ error: 'Failed to create batch', detail: batchErr?.message }, { status: 500 })
  }

  // ── 2. Insert one personalized_template per employee ─────────────────────
  // Chunk into groups of 50 to avoid hitting Supabase row limits per request
  const CHUNK = 50
  const allInserted: { id: string; employee_email: string; employee_name: string | null; invite_token: string }[] = []

  for (let i = 0; i < employees.length; i += CHUNK) {
    const chunk = employees.slice(i, i + CHUNK).map(emp => ({
      batch_id:       batch.id,
      employee_email: emp.email.toLowerCase().trim(),
      employee_name:  emp.name ?? null,
      template_json:  {
        version:     'custom',
        cells:       emp.cells       ?? [],
        answerCells: emp.answerCells ?? [],
      },
    }))

    const { data, error } = await supabase
      .from('personalized_templates')
      .insert(chunk)
      .select('id, employee_email, employee_name, invite_token')

    if (error) {
      console.error('[batch-import] template insert chunk failed:', error)
      return Response.json({
        error:       'Failed to insert templates',
        detail:      error.message,
        batchId:     batch.id,
        insertedSoFar: allInserted.length,
      }, { status: 500 })
    }

    allInserted.push(...(data ?? []))
  }

  // ── 3. Build invite URLs ──────────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'
  const inviteLinks = allInserted.map(t => ({
    email: t.employee_email,
    name:  t.employee_name ?? t.employee_email,
    token: t.invite_token,
    url:   `${baseUrl}/assessment?t=${t.invite_token}`,
  }))

  console.log(`[batch-import] created batch ${batch.id} with ${allInserted.length} templates`)

  return Response.json({
    batchId:     batch.id,
    batchName,
    count:       allInserted.length,
    inviteLinks,
  })
}
