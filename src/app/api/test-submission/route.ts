/**
 * POST /api/test-submission
 *
 * Handles submission for employee internal Excel tests (/test?t=TOKEN).
 * Simpler than /api/submissions — only stores math results in the
 * personalized_templates row, keeping employee data separate from
 * candidate data.
 *
 * Body: {
 *   templateId:    string,
 *   mathDetails:   { idx: number; correct: boolean; pointsAwarded: number; got?: string }[],
 *   mathScoreRaw:  number,
 *   mathScoreTotal: number,
 *   mathScorePct:  number,
 *   mathTimeSecs?: number,
 * }
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = body as any
  const templateId    = b.templateId    as string | undefined
  const mathDetails   = b.mathDetails   as { idx: number; correct: boolean; pointsAwarded: number; got?: string }[] | undefined
  const mathScoreRaw  = b.mathScoreRaw  as number | undefined
  const mathScoreTotal = b.mathScoreTotal as number | undefined
  const mathScorePct  = b.mathScorePct  as number | undefined
  const mathTimeSecs  = b.mathTimeSecs  as number | undefined

  if (!templateId) {
    return Response.json({ error: 'templateId required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify template exists and hasn't been used
  const { data: tpl, error: fetchErr } = await supabase
    .from('personalized_templates')
    .select('id, used_at')
    .eq('id', templateId)
    .maybeSingle()

  if (fetchErr || !tpl) {
    return Response.json({ error: 'Template not found' }, { status: 404 })
  }

  if (tpl.used_at) {
    // Already submitted — return success idempotently
    return Response.json({ success: true, alreadySubmitted: true })
  }

  const resultsJson = {
    submittedAt:   new Date().toISOString(),
    mathScoreRaw:  mathScoreRaw  ?? 0,
    mathScoreTotal: mathScoreTotal ?? 0,
    mathScorePct:  mathScorePct  ?? 0,
    mathTimeSecs:  mathTimeSecs  ?? null,
    details:       mathDetails   ?? [],
  }

  const { error: updateErr } = await supabase
    .from('personalized_templates')
    .update({
      used_at:      new Date().toISOString(),
      results_json: resultsJson,
    })
    .eq('id', templateId)

  if (updateErr) {
    console.error('[test-submission] update error:', updateErr.message)
    return Response.json({ error: updateErr.message }, { status: 500 })
  }

  console.log(`[test-submission] templateId=${templateId} score=${mathScorePct}%`)
  return Response.json({ success: true })
}
