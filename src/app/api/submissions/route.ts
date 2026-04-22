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
    const candidate    = b.candidate    as { name: string; email: string; cedula: string; celular: string } | undefined
    const configId     = b.configId     as string
    const clerkUserId  = b.clerkUserId  as string | null
    const videoPath    = b.videoPath    as string | null
    const videoMimeType = b.videoMimeType as string
    const videoRecorded = b.videoRecorded as boolean
    const roleplayCompleted    = b.roleplayCompleted as boolean
    const roleplayVideoPath    = b.roleplayVideoPath as string | null
    const roleplayTranscript   = b.roleplayTranscript as string | undefined
    const roleplayBankCaseId   = b.roleplayBankCaseId as string | null | undefined
    const culturalFitCompleted = b.culturalFitCompleted as boolean
    const culturalFitVideoPath = b.culturalFitVideoPath as string | null
    const mathScoreRaw  = b.mathScoreRaw  as number
    const mathScoreTotal = b.mathScoreTotal as number
    const mathScorePct  = b.mathScorePct  as number
    const mathTimeSecs  = b.mathTimeSecs  as number | null | undefined
    const casoAnsweredCount = b.casoAnsweredCount as number
    const casoScorePct  = b.casoScorePct  as number
    const overallScorePct = b.overallScorePct as number
    const casoAnswers  = (b.casoAnswers  as Record<string, string>)  ?? {}
    const casoTimings  = (b.casoTimings  as Record<number, number>) ?? {}
    const mathAnswers  = (b.mathAnswers  as Record<number, string>) ?? {}
    const mathTimings  = (b.mathTimings  as Record<number, number>) ?? {}
    const mathDetails  = (b.mathDetails  as { idx: number; correct: boolean; pointsAwarded: number; got?: string }[]) ?? []
    const mathSpreadsheetVersion    = b.mathSpreadsheetVersion    as string | null | undefined
    const personalizedTemplateId    = b.personalizedTemplateId    as string | null | undefined
    const proctoring   = (b.proctoring   as Record<string, unknown>) ?? {}
    const snapshotPaths = (b.snapshotPaths as string[]) ?? []

    // ── Validate required fields ──────────────────────────────────────────────
    if (!candidate || !candidate.email || !configId) {
      console.error('[submissions] Missing required fields: candidate or configId', { hasCandidate: !!candidate, email: candidate?.email, configId })
      return Response.json({ error: 'Datos de candidato o configuración inválidos' }, { status: 400 })
    }

    console.log(`[submissions] parsed ok — email=${candidate.email} configId=${configId}`)
    const supabase = createAdminClient()

    // ── Dedup guard ──────────────────────────────────────────────────────────
    const email = candidate.email.toLowerCase()
    const dedupeKey = `${email}::${configId}`
    const existing  = recentSubmissions.get(dedupeKey)
    if (existing && Date.now() - existing.ts < DEDUP_WINDOW_MS) {
      console.log('[submissions] dedup hit (memory)', dedupeKey)
      return Response.json({ success: true, submissionId: existing.id, deduplicated: true })
    }
    // Also check Supabase: find candidate by email → check for recent submission
    // Wrapped in try/catch so a transient DB error here doesn't abort the whole submission
    try {
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
    } catch (dedupErr) {
      // Dedup check failed — log and proceed with insertion (better to allow a duplicate than to fail entirely)
      console.warn('[submissions] dedup check failed (continuing):', String(dedupErr))
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Resolve candidate: SELECT first (avoids unique-constraint races), INSERT only if truly new.
    // Two lookups: by email (primary) then by cedula (handles same person, different email).
    let cand: { id: string } | null = null

    const { data: byEmail } = await supabase
      .from('candidates').select('id').eq('email', email).maybeSingle()

    if (byEmail) {
      cand = byEmail
      console.log(`[submissions] candidate found by email id=${cand.id}`)
    } else if (candidate.cedula) {
      const { data: byCedula } = await supabase
        .from('candidates').select('id').eq('cedula', candidate.cedula).maybeSingle()
      if (byCedula) {
        cand = byCedula
        console.log(`[submissions] candidate found by cedula id=${cand.id}`)
      }
    }

    if (!cand) {
      // Truly new candidate — insert
      const { data: newCand, error: insertErr } = await supabase
        .from('candidates')
        .insert({ name: candidate.name, email: candidate.email, cedula: candidate.cedula, celular: candidate.celular })
        .select('id').single()

      if (insertErr) {
        // Race condition: another request inserted first — retry SELECT
        console.warn('[submissions] candidate insert conflict, retrying SELECT:', insertErr.message)
        const { data: raceByEmail } = await supabase.from('candidates').select('id').eq('email', email).maybeSingle()
        const { data: raceByCedula } = !raceByEmail && candidate.cedula
          ? await supabase.from('candidates').select('id').eq('cedula', candidate.cedula).maybeSingle()
          : { data: null }
        cand = raceByEmail ?? raceByCedula ?? null
      } else {
        cand = newCand
        console.log(`[submissions] candidate inserted id=${cand?.id}`)
      }
    }

    if (!cand) return Response.json({ error: 'No se pudo resolver el candidato' }, { status: 500 })
    console.log(`[submissions] candidate id=${cand.id}`)

    // Fetch enabled_sections + challenge_weights from config so we store them with the submission
    const { data: configData } = await supabase
      .from('assessment_configs')
      .select('enabled_sections, challenge_weights')
      .eq('id', configId as string)
      .maybeSingle()
    const enabledSections   = (configData?.enabled_sections as string[]) ?? ['sharktank', 'caso', 'math']
    const challengeWeights  = (configData?.challenge_weights as Record<string, number>) ?? null

    // Fetch questions to map answers
    const { data: questions } = await supabase
      .from('assessment_questions')
      .select('id, section, position')
      .eq('config_id', configId)

    const casoQs = (questions || []).filter(q => q.section === 'caso').sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    const mathQs = (questions || []).filter(q => q.section === 'math').sort((a: { position: number }, b: { position: number }) => a.position - b.position)

    const casoRows = casoQs.map((q: { id: string; section: string }, i: number) => ({
      question_id: q.id,
      section: 'caso',
      answer_text: casoAnswers[q.id] || '',
      time_spent_s: casoTimings[i] || 0,
    }))

    // Spreadsheet mode: build one row per answer cell (using mathDetails), mapped to the
    // corresponding question_id by position index. Ignore any extra DB questions beyond
    // the number of spreadsheet cells to avoid null/ungraded phantom rows.
    const mathRows = mathSpreadsheetVersion
      ? mathDetails.map((d, i) => ({
          question_id: mathQs[i]?.id ?? null,
          section: 'math',
          answer_text: d.got ?? '',
          time_spent_s: 0,
          is_correct: d.correct,
          points_awarded: d.pointsAwarded ?? 0,
        })).filter((r) => r.question_id !== null)
      : mathQs.map((q: { id: string; section: string }, i: number) => {
          const detail = mathDetails?.find((d: { idx: number }) => d.idx === i)
          return {
            question_id: q.id,
            section: 'math',
            answer_text: mathAnswers[i] || '',
            time_spent_s: mathTimings[i] || 0,
            is_correct: detail?.correct ?? null,
            points_awarded: detail?.pointsAwarded ?? 0,
          }
        })

    const snapshotRows = snapshotPaths.map((path: string, i: number) => ({
      storage_path: path,
      taken_at: new Date().toISOString(),
      snap_index: i + 1,
    }))

    // ── Atomic insert: submission + answers + proctoring + snapshots ──────────
    // Uses a Postgres RPC so all writes succeed or none do.
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_submission_atomic', {
      p_candidate_id: cand.id,
      p_submission: {
        config_id: configId,
        clerk_user_id: clerkUserId ?? null,
        status: 'completed',
        completed_at: new Date().toISOString(),
        video_storage_path: videoPath ?? null,
        video_mime_type: videoMimeType ?? null,
        video_recorded: videoRecorded ?? false,
        roleplay_completed: roleplayCompleted ?? false,
        roleplay_video_path: roleplayVideoPath ?? null,
        roleplay_transcript: roleplayTranscript ?? null,
        enabled_sections: enabledSections,
        challenge_weights: challengeWeights,
        math_score_raw: mathScoreRaw ?? 0,
        math_score_total: mathScoreTotal ?? 0,
        math_score_pct: mathScorePct ?? 0,
        math_time_secs: mathTimeSecs ?? null,
        caso_answered_count: casoAnsweredCount ?? 0,
        caso_score_pct: casoScorePct ?? 0,
        overall_score_pct: overallScorePct ?? 0,
        template_id: personalizedTemplateId ?? null,
      },
      p_answers: [...casoRows, ...mathRows],
      p_proctoring: proctoring,
      p_snapshots: snapshotRows,
    })

    if (rpcErr) {
      console.error('[submissions] atomic insert error:', rpcErr.message, rpcErr.code)
      return Response.json({ error: rpcErr.message }, { status: 500 })
    }

    const submissionId = (rpcResult as { id: string }).id
    console.log(`[submissions] atomic insert done id=${submissionId} (${Date.now()-t0}ms)`)

    // Mark personalized template as used (non-blocking, best-effort)
    if (personalizedTemplateId) {
      supabase
        .from('personalized_templates')
        .update({ used_at: new Date().toISOString() })
        .eq('id', personalizedTemplateId)
        .then(({ error }) => {
          if (error) console.warn('[submissions] could not mark template as used:', error.message)
        })
    }

    // ── Auto-trigger AI evaluations after response is sent ───────────────────
    const evalBase = process.env.NEXT_PUBLIC_APP_URL || 'https://rappi-assessment.vercel.app'

    // Helper: call an evaluation endpoint with up to 2 retries on failure
    async function evalWithRetry(url: string, body: Record<string, unknown>, label: string) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 5000 * attempt))
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (res.ok) return
          const errText = await res.text().catch(() => res.status.toString())
          console.error(`${label} attempt ${attempt + 1} failed (${res.status}):`, errText)
        } catch (err) {
          console.error(`${label} attempt ${attempt + 1} threw:`, err)
        }
      }
    }

    // Jitter helper: random delay 0–maxMs to distribute concurrent eval calls.
    // At 200 simultaneous submissions the 4 after() blocks would otherwise fire
    // 800 Claude/AssemblyAI requests within seconds and saturate rate limits.
    const jitter = (maxMs: number) => new Promise(r => setTimeout(r, Math.random() * maxMs))

    // Caso Práctico: always evaluate. Spread over 20s.
    after(async () => {
      await jitter(20_000)
      await evalWithRetry(`${evalBase}/api/evaluate-caso`, { submissionId }, 'Auto caso eval')
    })
    // RolePlay: if completed and either video uploaded or transcript provided
    if (roleplayCompleted && (roleplayVideoPath || roleplayTranscript)) {
      // Capture values for closure — email and roleplayBankCaseId resolved above
      const rpCandEmail = email   // already lowercased above
      const rpBankCaseId = roleplayBankCaseId ?? null
      after(async () => {
        await jitter(30_000)   // spread over 30s — AssemblyAI + Claude, slowest path
        try {
          // Build case context so the evaluator knows which restaurant was assigned
          let caseContext: string | null = null
          try {
            const adminDb = createAdminClient()
            // Prefer the case ID sent from the client; fall back to cohort_members lookup by email
            let resolvedBankId = rpBankCaseId
            if (!resolvedBankId) {
              const { data: cm } = await adminDb
                .from('cohort_members')
                .select('assigned_roleplay_bank_id')
                .eq('email', rpCandEmail)
                .maybeSingle()
              resolvedBankId = (cm as { assigned_roleplay_bank_id?: string | null } | null)?.assigned_roleplay_bank_id ?? null
            }
            if (resolvedBankId) {
              const { data: rpCase } = await adminDb
                .from('roleplay_bank')
                .select('restaurant_name,category,city,owner_name,owner_profile,character_brief,key_objections,farmer_briefing')
                .eq('id', resolvedBankId)
                .single()
              if (rpCase) {
                caseContext = `Restaurante: ${rpCase.restaurant_name} (${rpCase.category}, ${rpCase.city})\nDueño: ${rpCase.owner_name}\nPerfil: ${rpCase.owner_profile}\nObjeciones clave: ${rpCase.key_objections}\nBriefing: ${rpCase.farmer_briefing ?? ''}`
              }
            }
          } catch (ctxErr) {
            console.warn('Auto roleplay: could not fetch caseContext:', String(ctxErr))
          }

          await evalWithRetry(`${evalBase}/api/evaluate-roleplay`, { submissionId, caseContext }, 'Auto roleplay eval')
        } catch (err) { console.error('Auto roleplay eval error:', err) }
      })
    }

    // Cultural Fit: update columns + trigger evaluation. Spread over 25s.
    if (culturalFitCompleted) {
      after(async () => {
        await jitter(25_000)
        try {
          // Update cultural_fit columns (not in atomic RPC)
          await supabase.from('submissions').update({
            cultural_fit_completed: true,
            cultural_fit_video_path: culturalFitVideoPath ?? null,
          }).eq('id', submissionId)
          if (culturalFitVideoPath) {
            await evalWithRetry(`${evalBase}/api/evaluate-cultural-fit`, { submissionId }, 'Auto cultural fit eval')
          }
        } catch (err) { console.error('Auto cultural fit eval error:', err) }
      })
    }
    // SharkTank: only if video was recorded (starts AssemblyAI transcription job). Spread over 20s.
    if (videoRecorded) {
      after(async () => {
        await jitter(20_000)
        await evalWithRetry(`${evalBase}/api/evaluate-sharktank`, { submissionId }, 'Auto sharktank eval')
      })
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Store in dedup map
    recentSubmissions.set(dedupeKey, { id: submissionId, ts: Date.now() })
    // Clean up old entries
    for (const [k, v] of recentSubmissions) {
      if (Date.now() - v.ts > DEDUP_WINDOW_MS * 10) recentSubmissions.delete(k)
    }

    console.log(`[submissions] done in ${Date.now()-t0}ms → ${submissionId}`)
    // ── Return success BEFORE any fire-and-forget work ──────────────────────
    // This ensures the client gets 200 even if email notification fails.
    const response = Response.json({ success: true, submissionId })

    // ── Email notification to admin (fire-and-forget via after) ────────────
    after(() => {
      try {
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
              subject: `${scoreEmoji} Nuevo candidato: ${candidate?.name ?? 'Desconocido'} — ${overallScorePct}%`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
                  <h2 style="margin-bottom:4px">Nuevo Assessment Completado</h2>
                  <p style="color:#666;margin-top:0">${new Date().toLocaleString('es-CO')}</p>
                  <table style="width:100%;border-collapse:collapse;margin:20px 0">
                    <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Candidato</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #eee">${candidate?.name ?? ''}</td></tr>
                    <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee">${candidate?.email ?? ''}</td></tr>
                    <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Score General</td><td style="padding:8px 0;font-weight:700;font-size:18px;border-bottom:1px solid #eee">${scoreEmoji} ${overallScorePct}%</td></tr>
                    <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Math</td><td style="padding:8px 0;border-bottom:1px solid #eee">${mathScorePct}%</td></tr>
                    <tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Caso</td><td style="padding:8px 0;border-bottom:1px solid #eee">${casoScorePct}%</td></tr>
                    <tr><td style="padding:8px 0;color:#666">Video grabado</td><td style="padding:8px 0">${videoRecorded ? '✅ Sí' : '❌ No'}</td></tr>
                  </table>
                  <a href="${appUrl}/admin/candidates/${submissionId}" style="display:inline-block;padding:12px 24px;background:#e03554;color:white;border-radius:8px;text-decoration:none;font-weight:600">Ver candidato →</a>
                </div>
              `,
            }),
          }).catch((err) => console.error('[submissions] email error:', err))
        }
      } catch (emailErr) {
        console.error('[submissions] email build error:', emailErr)
      }
    })
    // ─────────────────────────────────────────────────────────────────────────

    return response
  } catch (e) {
    const errMsg  = e instanceof Error ? e.message : String(e)
    const errType = e instanceof Error ? e.constructor.name : typeof e
    const stack   = e instanceof Error ? (e.stack ?? '') : ''
    console.error(`[submissions] FATAL ${errType}: ${errMsg}`, stack)
    return Response.json({ error: errMsg || 'Error interno del servidor' }, { status: 500 })
  }
}
