import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

// PATCH /api/training/cohorts/[id] — update a training cohort
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json() as {
      name?: string
      description?: string
      is_active?: boolean
      ends_at?: string | null
      doc_ids?: string[]
    }

    const supabase = createAdminClient()
    const patch: Record<string, unknown> = {}
    if (body.name !== undefined) patch.name = body.name.trim()
    if (body.description !== undefined) patch.description = body.description?.trim() || null
    if (body.is_active !== undefined) patch.is_active = body.is_active
    if (body.ends_at !== undefined) patch.ends_at = body.ends_at || null
    if (body.doc_ids !== undefined) patch.doc_ids = body.doc_ids

    const { data, error } = await supabase
      .from('training_cohorts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ cohort: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
