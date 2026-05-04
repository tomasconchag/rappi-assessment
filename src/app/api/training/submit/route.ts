import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import { after } from 'next/server'

export const maxDuration = 60

// POST /api/training/submit — save a completed training roleplay submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      cohortId: string
      farmerEmail: string
      farmerName?: string
      vapiCallId: string
      videoPath?: string
    }

    const { cohortId, farmerEmail, farmerName, vapiCallId, videoPath } = body
    if (!cohortId || !farmerEmail || !vapiCallId) {
      return Response.json({ error: 'cohortId, farmerEmail, vapiCallId required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if cohort exists and is active
    const { data: cohort } = await supabase
      .from('training_cohorts')
      .select('id, is_active, ends_at')
      .eq('id', cohortId)
      .single()

    if (!cohort) return Response.json({ error: 'Cohort not found' }, { status: 404 })
    if (!cohort.is_active) return Response.json({ error: 'Esta cohorte no está activa' }, { status: 403 })
    if (cohort.ends_at && new Date(cohort.ends_at) < new Date()) {
      return Response.json({ error: 'Esta cohorte ha expirado' }, { status: 403 })
    }

    const normalizedEmail = farmerEmail.toLowerCase().trim()

    // Upsert submission (idempotent — one per farmer per cohort)
    const { data: submission, error: upsertErr } = await supabase
      .from('training_submissions')
      .upsert({
        cohort_id: cohortId,
        farmer_email: normalizedEmail,
        farmer_name: farmerName?.trim() || null,
        vapi_call_id: vapiCallId,
        video_path: videoPath || null,
        status: 'pending',
        completed_at: new Date().toISOString(),
      }, { onConflict: 'cohort_id,farmer_email', ignoreDuplicates: false })
      .select('id')
      .single()

    if (upsertErr || !submission) {
      console.error('[training/submit] upsert error:', upsertErr?.message)
      return Response.json({ error: upsertErr?.message ?? 'Submit failed' }, { status: 500 })
    }

    const submissionId = submission.id

    // Fire-and-forget evaluation with retries
    after(async () => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'
      const maxRetries = 3

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const jitter = Math.random() * 2000 * attempt
          if (attempt > 1) await new Promise(r => setTimeout(r, 5000 * attempt + jitter))

          const res = await fetch(`${baseUrl}/api/evaluate-training`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId }),
          })

          if (res.ok) {
            console.log(`[training/submit] evaluation triggered for ${submissionId}`)
            break
          }

          const data = await res.json()
          console.warn(`[training/submit] eval attempt ${attempt} failed:`, data.error)
          if (attempt === maxRetries) {
            await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
          }
        } catch (e) {
          console.warn(`[training/submit] eval attempt ${attempt} error:`, e)
        }
      }
    })

    return Response.json({ submissionId, ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[training/submit] error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
