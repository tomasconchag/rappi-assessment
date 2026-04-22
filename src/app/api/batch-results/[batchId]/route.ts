/**
 * GET /api/batch-results/[batchId]
 *
 * Returns per-employee results for a batch, for the admin results view.
 * Auth: x-admin-secret header required.
 *
 * Returns: {
 *   batchId:   string,
 *   batchName: string,
 *   rows: [{
 *     id:            string,
 *     employeeEmail: string,
 *     employeeName:  string | null,
 *     emailSentAt:   string | null,
 *     openedAt:      string | null,
 *     usedAt:        string | null,
 *     score:         number | null,   // 0–100
 *     details:       { idx: number; correct: boolean; got?: string }[] | null,
 *   }]
 * }
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { batchId } = await params

  const supabase = createAdminClient()

  const { data: batch, error: batchErr } = await supabase
    .from('template_batches')
    .select('id, name')
    .eq('id', batchId)
    .maybeSingle()

  if (batchErr || !batch) {
    return Response.json({ error: 'Batch not found' }, { status: 404 })
  }

  const { data: rows, error: rowsErr } = await supabase
    .from('personalized_templates')
    .select('id, employee_email, employee_name, email_sent_at, opened_at, used_at, results_json')
    .eq('batch_id', batchId)
    .order('employee_name', { ascending: true })

  if (rowsErr) {
    return Response.json({ error: rowsErr.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (rows ?? []).map((r: any) => ({
    id:            r.id,
    employeeEmail: r.employee_email,
    employeeName:  r.employee_name ?? null,
    emailSentAt:   r.email_sent_at ?? null,
    openedAt:      r.opened_at     ?? null,
    usedAt:        r.used_at       ?? null,
    score:         r.results_json?.mathScorePct ?? null,
    scoreRaw:      r.results_json?.mathScoreRaw ?? null,
    scoreTotal:    r.results_json?.mathScoreTotal ?? null,
    timeSecs:      r.results_json?.mathTimeSecs ?? null,
    details:       r.results_json?.details ?? null,
  }))

  return Response.json({ batchId: batch.id, batchName: batch.name, rows: mapped })
}
