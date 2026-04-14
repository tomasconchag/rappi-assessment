import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

// Allowed video mime types → file extension
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'video/webm':  'webm',
  'video/mp4':   'mp4',
  'video/ogg':   'ogv',
  'video/quicktime': 'mov',
}

export async function POST(req: NextRequest) {
  try {
    const { candidateEmail, mimeType, section } = await req.json()

    // Validate mime type — reject anything that isn't a known video format
    const baseMime = (mimeType as string | undefined)?.split(';')[0]?.trim() ?? ''
    const ext = ALLOWED_MIME_TYPES[baseMime]
    if (!ext) {
      return Response.json(
        { error: `Tipo de archivo no permitido: "${baseMime}". Se esperaba un video.` },
        { status: 400 },
      )
    }

    const safeName  = (candidateEmail as string).replace('@', '_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
    const sectionTag = section ? `_${String(section).replace(/[^a-z0-9]/gi, '')}` : ''
    // crypto.randomUUID() avoids timestamp collisions under concurrent load
    const path = `${safeName}${sectionTag}_${Date.now()}_${crypto.randomUUID()}.${ext}`

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
