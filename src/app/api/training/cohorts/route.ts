import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

// POST /api/training/cohorts — create a new training cohort
export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json() as { name: string; description?: string }
    if (!name?.trim()) return Response.json({ error: 'Name is required' }, { status: 400 })

    const supabase = createAdminClient()
    const invite_token = randomUUID().replace(/-/g, '').slice(0, 24)

    const { data, error } = await supabase
      .from('training_cohorts')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        invite_token,
        is_active: true,
      })
      .select('id, name, description, is_active, invite_token, created_at')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ cohort: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
