import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export const maxDuration = 30

// POST /api/training/documents — upload a .txt file
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    if (!file.name.endsWith('.txt')) {
      return Response.json({ error: 'Solo se permiten archivos .txt' }, { status: 400 })
    }
    if (file.size > 500 * 1024) {
      return Response.json({ error: 'El archivo no puede superar 500 KB' }, { status: 400 })
    }

    const content = await file.text()
    const supabase = createAdminClient()

    // Upload file to Supabase Storage
    const filePath = `training-docs/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: storageErr } = await supabase.storage
      .from('assessment-videos')
      .upload(filePath, Buffer.from(content, 'utf-8'), {
        contentType: 'text/plain',
        upsert: false,
      })

    if (storageErr) {
      console.error('[training/documents] storage error:', storageErr.message)
      return Response.json({ error: storageErr.message }, { status: 500 })
    }

    // Save metadata + content in DB
    const { data, error: dbErr } = await supabase
      .from('training_documents')
      .insert({
        name: file.name.replace(/\.txt$/, ''),
        file_path: filePath,
        content,
        file_size: file.size,
      })
      .select('id, name, file_size, created_at')
      .single()

    if (dbErr) {
      console.error('[training/documents] db error:', dbErr.message)
      return Response.json({ error: dbErr.message }, { status: 500 })
    }

    return Response.json({ document: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[training/documents] error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/training/documents?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

    const supabase = createAdminClient()

    // Get the file_path first
    const { data: doc } = await supabase
      .from('training_documents')
      .select('file_path')
      .eq('id', id)
      .single()

    if (doc?.file_path) {
      await supabase.storage.from('assessment-videos').remove([doc.file_path])
    }

    const { error } = await supabase.from('training_documents').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
