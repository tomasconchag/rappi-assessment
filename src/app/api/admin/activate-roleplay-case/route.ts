import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/activate-roleplay-case
// Sets assessment_configs.active_roleplay_case_id using the service role (bypasses RLS).
// The client-side anon key cannot update this table (requires authenticated role).
export async function POST(req: NextRequest) {
  const { configId, caseId } = await req.json() as { configId: string; caseId: string | null }

  if (!configId) {
    return Response.json({ error: 'Missing configId' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('assessment_configs')
    .update({ active_roleplay_case_id: caseId })
    .eq('id', configId)

  if (error) {
    console.error('[activate-roleplay-case] update error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
