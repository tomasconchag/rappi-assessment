import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { candidateEmail, mimeType } = await req.json()
    const ext = mimeType?.includes('mp4') ? 'mp4' : 'webm'
    const safeName = candidateEmail.replace('@', '_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
    const path = `${safeName}_${Date.now()}.${ext}`

    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from('assessment-videos')
      .createSignedUploadUrl(path)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ signedUrl: data.signedUrl, path })
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}
