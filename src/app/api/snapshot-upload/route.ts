import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { candidateEmail, index } = await req.json()
    const safeName = candidateEmail.replace('@', '_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
    const path = `${safeName}_snap${index}_${Date.now()}.jpg`

    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from('assessment-snapshots')
      .createSignedUploadUrl(path)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ signedUrl: data.signedUrl, path })
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
