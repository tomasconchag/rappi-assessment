import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

// POST /api/training/cohorts/members — add farmers to a training cohort
export async function POST(req: NextRequest) {
  try {
    const { cohortId, emails } = await req.json() as { cohortId: string; emails: string[] }
    if (!cohortId || !emails?.length) {
      return Response.json({ error: 'cohortId and emails required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const normalized = emails.map(e => e.toLowerCase().trim()).filter(Boolean)

    // Insert all, ignoring duplicates (UNIQUE constraint on cohort_id+email)
    const rows = normalized.map(email => ({ cohort_id: cohortId, email }))
    const { error } = await supabase
      .from('training_cohort_members')
      .upsert(rows, { onConflict: 'cohort_id,email', ignoreDuplicates: true })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ added: normalized.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
