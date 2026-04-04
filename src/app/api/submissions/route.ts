import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, after } from 'next/server'

export const maxDuration = 60

// In-memory idempotency guard (per cold start). Prevents double-submit on retry.
const recentSubmissions = new Map<string, { id: string; ts: number }>()
const DEDUP_WINDOW_MS = 60_000 // 60 s

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  console.log('[submissions] POST start')
  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch (parseErr) {
      console.error('[submissions] JSON parse failed:', parseErr)
      return Response.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = body as any
    const candidate    = b.candidate    as { name: string; email: string; cedula: string }
    const configId     = b.configId     as string
    const clerkUserId  = b.clerkUserId  as string | null
    const videoPath    = b.videoPath    as string | null
    const videoMimeType = b.videoMimeType as string
    const videoRecorded = b.videoRecorded as boolean
    const roleplayCompleted = b.roleplayCompleted as boolean
    const roleplayVideoPath = b.roleplayVideoPath as string | null
    const mathScoreRaw  = b.mathScoreRaw  as number
    const mathScoreTotal = b.mathScoreTotal as number
    const mathScorePct  = b.mathScorePct  as number
    const casoAnsweredCount = b.casoAnsweredCount as number
    const casoScorePct  = b.casoScorePct  as number
    const overallScorePct = b.overallScorePct as number
    const casoAnswers  = b.casoAnswers  as Record<string, string>
    const casoTimings  = b.casoTimings  as Record<number, number>
    const mathAnswers  = b.mathAnswers  as Record<number, string>
    const mathTimings  = b.mathTimings  as Record<number, number>
    const mathDetails  = b.mathDetails  as { idx: number; correct: boolean; pointsAwarded: number }[]
    const proctoring   = b.proctoring   as Record<string, unknown>
    const snapshotPaths = b.snapshotPaths as string[]

    console.log(`[submissions] parsed body for ${candidate?.email}, configId=${configId}`)
    const supabase = createAdminClient()

    // ── Dedup guard ──────────────────────────────────────────────────────────
    const email = candidate?.email?.toLowerCase() ?? ''
    const dedupeKey = `${email}::${configId}`
    const existing  = recentSubmissions.get(dedupeKey)
    if (existing && Date.now() - existing.ts < DEDUP_WINDOW_MS) {
      console.log('[submissions] dedup hit (memory)', dedupeKey)
      return Response.json({ success: true, submissionId: existing.id, deduplicated: true })
    }
    // Also check Supabase: find candidate by email → check for recent submission
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: existingCand } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingCand?.id) {
      const { data: existingSub } = await supabase
        .from('submissions')
        .select('id')
        .eq('candidate_id', existingCand.id)
        .eq('config_id', configId)
        .gte('completed_at', tenMinAgo)
        .maybeSingle()

      if (existingSub) {
        console.log('[submissions] dedup hit (db)', dedupeKey)
        return Response.json({ success: true, submissionId: existingSub.id, deduplicated: true })
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Upsert candidate
    const { data: cand, error: candErr } = await supabase
      .from('candidates')
      .upsert(
        { name: candidate.name, email: candidate.email, cedula: candidate.cedula },
        { onConflict: 'email' }
      )
      .select('id')
      .single()

    if (candErr) {
      console.error('[submissions] candidate upsert error:', candErr.message)
      return Response.json({ error: candErr.message }, { status: 500 })
    }
    console.log(`[submissions] candidate upserted id=${cand.id}`)

    // Fetch enabled_sections from config so we store them with the submission
    const { data: configData } = await supabase
      .from('assessment_configs')
      .select('enabled_sections')
      .eq('id', configId as string)
      .maybeSingle()
    const enabledSections = (configData?.enabled_sections as string[]) ?? ['sharktank', 'caso', 'math']

    // Create submission
    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .insert({
        candidate_id: cand.id,
        config_id: configId,
        clerk_user_id: clerkUserId ?? null,
        status: 'completed',
        completed_at: new Date().toISOString(),
        video_storage_path: videoPath as string ?? null,
        video_mime_type: videoMimeType as string ?? null,
        video_recorded: videoRecorded as boolean ?? false,
        roleplay_completed: roleplayCompleted as boolean ?? false,
        roleplay_video_path: roleplayVideoPath as string ?? null,
        enabled_sections: enabledSections,
        math_score_raw: mathScoreRaw as number ?? 0,
        math_score_total: mathScoreTotal as number ?? 0,
        math_score_pct: mathScorePct as number ?? 0,
        caso_answered_count: casoAnsweredCount as number ?? 0,
        caso_score_pct: casoScorePct as number ?? 0,
        overall_score_pct: overallScorePct as number ?? 0,
      })
      .select('id')
      .single()

    if (subErr) {
      console.error('[submissions] insert error:', subErr.message, subErr.code)
      return Response.json({ error: subErr.message }, { status: 500 })
    }
    console.log(`[submissions] submission inserted id=${sub.id} (${Date.now()-t0}ms)`)
    const submissionId = sub.id

    // Fetch questions to map answers
    const { data: questions } = await supabase
      .from('assessment_questions')
      .select('id, section, position')
      .eq('config_id', configId)

    const casoQs = (questions || []).filter(q => q.section === 'caso').sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    const mathQs = (questions || []).filter(q => q.section === 'math').sort((a: { position: number }, b: { position: number }) => a.position - b.position)

    // Insert caso answers
    const casoRows = casoQs.map((q: { id: string; section: string }, i: number) => ({
      submission_id: submissionId,
      question_id: q.id,
      section: 'caso',
      answer_text: casoAnswers[q.id] || '',
      time_spent_s: casoTimings[i] || 0,
    }))

    // Insert math answers
    const mathRows = mathQs.map((q: { id: string; section: string }, i: number) => {
      const detail = mathDetails?.find((d: { idx: number }) => d.idx === i)
      return {
        submission_id: submissionId,
        question_id: q.id,
        section: 'math',
        answer_text: mathAnswers[i] || '',
        time_spent_s: mathTimings[i] || 0,
        is_correct: detail?.correct ?? null,
        points_awarded: detail?.pointsAwarded ?? 0,
      }
    })

    const allAnswers = [...casoRows, ...mathRows]
    if (allAnswers.length > 0) {
      const { error: ansErr } = await supabase.from('answers').insert(allAnswers)
      if (ansErr) console.error('Answers error:', ansErr)
    }

    // Insert proctoring report
    const { error: procErr } = await supabase.from('proctoring_reports').insert({
      submission_id: submissionId,
      tab_out_count: proctoring.tab_out_count,
      tab_time_s: proctoring.tab_time_s,
      paste_attempts: proctoring.paste_attempts,
      copy_attempts: proctoring.copy_attempts,
      fs_exit_count: proctoring.fs_exit_count,
      rclick_count: proctoring.rclick_count,
      key_block_count: proctoring.key_block_count,
      honeypot_fails: proctoring.honeypot_fails,
      warning_count: proctoring.warning_count,
      fraud_score: proctoring.fraud_score,
      fraud_level: proctoring.fraud_level,
      events: proctoring.events,
    })
    if (procErr) console.error('Proctoring error:', procErr)

    // Insert snapshots
    if (snapshotPaths?.length > 0) {
      const snapRows = snapshotPaths.map((path: string, i: number) => ({
        submission_id: submissionId,
        storage_path: path,
        taken_at: new Date().toISOString(),
        snap_index: i + 1,
      }))
      const { error: snapErr } = await supabase.from('webcam_snapshots').insert(snapRows)
      if (snapErr) console.error('Snapshots error:', snapErr)
    }

    // ── Auto-trigger AI evaluations after response is sent ───────────────────
    const evalBase = process.env.NEXT_PUBLIC_APP_URL || 'https://rappi-assessment.vercel.app'
    // Caso Práctico: always evaluate (runs in parallel for all 4 questions ~6s)
    after(async () => {
      try {
        await fetch(`${evalBase}/api/evaluate-caso`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId }),
        })
      } catch (err) { console.error('Auto caso eval error:', err) }
    })
    // RolePlay: only if completed and video uploaded
    // TODO: trigger roleplay evaluation once rubric is defined
    // if (roleplayCompleted && roleplayVideoPath) {
    //   after(async () => { await fetch(`${evalBase}/api/evaluate-roleplay`, { method: 'POST', ... }) })
    // }

    // SharkTank: only if video was recorded (starts AssemblyAI transcription job)
    if (videoRecorded) {
      after(async () => {
        try {
          await fetch(`${evalBase}/api/evaluate-sharktank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId }),
          })
        } catch (err) { console.error('Auto sharktank eval error:', err) }
      })
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Store in dedup map
    recentSubmissions.set(dedupeKey, { id: submissionId, ts: Date.now() })
    // Clean up old entries
    for (const [k, v] of recentSubmissions) {
      if (Date.now() - v.ts > DEDUP_WINDOW_MS * 10) recentSubmissions.delete(k)
    }

    // ── Email notification to admin (fire-and-forget) ───────────────────────
    const adminEmail  = process.env.ADMIN_NOTIFY_EMAIL
    const resendKey   = process.env.RESEND_API_KEY
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://rappi-assessment.vercel.app'
    if (adminEmail && resendKey) {
      const scoreEmoji = overallScorePct >= 70 ? '🟢' : overallScorePct >= 40 ? '🟡' : '🔴'
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Assessment Center <noreply@rappi.com>',
          to:   adminEmail,
          subject: `${scoreEmoji} Nuevo candidato: ${candidate.name} — ${overallScorePct}%`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
              <h2 style="margin-bottom:4px">Nuevo Assessment Completado</h2>
              <p style="color:#666;margin-top:0">${new Date().toLocaleString('es-CO')}</p>
              <table style="width:100%;border-collapse:collapse;margin:20px 0">
                <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Candidato</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #eee">${candidate.name}</td></tr>
                <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee">${candidate.email}</td></tr>
                <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Score General</td><td style="padding:8px 0;font-weight:700;font-size:18px;border-bottom:1px solid #eee">${scoreEmoji} ${overallScorePct}%</td></tr>
                <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Math</td><td style="padding:8px 0;border-bottom:1px solid #eee">${mathScorePct}%</td></tr>
                <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Caso</td><td style="padding:8px 0;border-bottom:1px solid #eee">${casoScorePct}%</td></tr>
                <tr><td style="padding:8px 0;color:#666">Video grabado</td><td style="padding:8px 0">${videoRecorded ? '✅ Sí' : '❌ No'}</td></tr>
              </table>
              <a href="${appUrl}/admin/candidates/${submissionId}" style="display:inline-block;padding:12px 24px;background:#e03554;color:white;border-radius:8px;text-decoration:none;font-weight:600">Ver candidato →</a>
            </div>
          `,
        }),
      }).catch(() => {}) // fire-and-forget
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[submissions] done in ${Date.now()-t0}ms → ${submissionId}`)
    return Response.json({ success: true, submissionId })
  } catch (e) {
    console.error('[submissions] FATAL error:', String(e), e instanceof Error ? e.stack : '')
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
