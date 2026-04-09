import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// DELETE /api/admin/submissions/[id]
// Deletes only the submission so the candidate can retake the assessment
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
