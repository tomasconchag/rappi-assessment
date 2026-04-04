import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY || ''
const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function submitTranscription(audioUrl: string): Promise<string> {
  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: { authorization: ASSEMBLYAI_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: audioUrl, speech_models: ['universal-2'] }),
  })
  if (!res.ok) throw new Error(`AssemblyAI submit failed: ${await res.text()}`)
  const data = await res.json()
  return data.id as string
}

async function pollTranscription(jobId: string, maxWaitMs = 55000): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${jobId}`, {
      headers: { authorization: ASSEMBLYAI_KEY },
    })
    const data = await res.json()
    if (data.status === 'completed') return data.text as string
    if (data.status === 'error') throw new Error(`AssemblyAI error: ${data.error}`)
  }
  throw new Error('Transcription timeout — retry later')
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured on server')
  return new Anthropic({ apiKey: key })
}

async function evaluateWithClaude(
  transcript: string,
  scenario: { name: string; desc: string; mission: string },
  rubric: any[],
): Promise<{ dimensions: any[]; overall_feedback: string }> {
  const anthropic = getAnthropic()

  const rubricText = rubric.map(dim => {
    const maxScore = Math.max(...dim.scale.map((s: any) => s.score))
    const scaleText = [...dim.scale]
      .sort((a: any, b: any) => a.score - b.score)
      .map((s: any) => `    ${s.score} (${s.label}): ${s.description}`)
      .join('\n')
    return `**${dim.name}** (peso: ${dim.weight}%, máx: ${maxScore} pts)\n${dim.description}\nEscala:\n${scaleText}`
  }).join('\n\n')

  const systemPrompt = `Eres un evaluador experto de Rappi que califica video-pitches de candidatos al puesto de Farmer.
Estás evaluando la TRANSCRIPCIÓN de un pitch de 60 segundos donde el candidato simula una conversación con el dueño de un restaurante.

Escenario del pitch:
- Restaurante: ${scenario.name}
- Situación: ${scenario.desc}
- Misión del candidato: ${scenario.mission}

Rúbrica de evaluación:
${rubricText}

INSTRUCCIONES:
- Evaluá basándote ÚNICAMENTE en el contenido del transcript
- Sé objetivo — un transcript corto o con pocas ideas merece puntaje bajo
- Para "Confianza y Presencia Verbal": evaluá el lenguaje usado (condicionales vs afirmaciones, vocabulario, entusiasmo textual)
- Devolvé ÚNICAMENTE JSON válido, sin texto adicional`

  const dimIds = rubric.map((d: any) => d.id)
  const schema = `{
  "dimensions": [${dimIds.map((id: string) => `{"rubric_id":"${id}","score":<número>,"justification":"<max 90 chars>"}`).join(',')}],
  "overall_feedback": "<resumen ejecutivo de 2-3 oraciones sobre el pitch>"
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `TRANSCRIPT DEL PITCH:\n"${transcript}"\n\nDevolvé exactamente este JSON:\n${schema}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch?.[0] || raw)
}

// ─── POST: Start evaluation ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { submissionId, force = false } = await req.json()
    if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 })

    const supabase = createAdminClient()

    // Check existing
    if (!force) {
      const { data: existing } = await supabase
        .from('ai_evaluations')
        .select('id, eval_status')
        .eq('submission_id', submissionId)
        .eq('section', 'sharktank')
        .limit(1)
      if (existing?.length) {
        const ev = existing[0]
        if (ev.eval_status === 'completed') {
          return NextResponse.json({ skipped: true, message: 'Already evaluated. Use force=true to re-evaluate.' })
        }
        // If stuck in transcribing/evaluating, allow re-trigger
      }
    }

    // Load submission + video + scenario
    const { data: sub } = await supabase
      .from('submissions')
      .select('id, video_storage_path, video_mime_type, candidates(name), assessment_configs(shark_scenario)')
      .eq('id', submissionId)
      .single()

    if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    if (!sub.video_storage_path) return NextResponse.json({ error: 'No video recorded for this submission' }, { status: 400 })

    // Get signed URL for the video
    const { data: signedData } = await supabase.storage
      .from('assessment-videos')
      .createSignedUrl(sub.video_storage_path, 3600)

    if (!signedData?.signedUrl) return NextResponse.json({ error: 'Could not get video URL' }, { status: 500 })

    // Load SharkTank rubric
    const { data: rubric } = await supabase
      .from('evaluation_rubric')
      .select('*')
      .eq('section', 'sharktank')
      .eq('active', true)
      .order('position')

    if (!rubric?.length) return NextResponse.json({ error: 'No SharkTank rubric found' }, { status: 400 })

    // Clear old eval if force
    if (force) {
      await supabase.from('ai_evaluations').delete()
        .eq('submission_id', submissionId).eq('section', 'sharktank')
    }

    // Create pending record
    const { data: evalRecord } = await supabase.from('ai_evaluations').insert({
      submission_id: submissionId,
      section: 'sharktank',
      eval_status: 'transcribing',
      model_used: 'assemblyai+claude-haiku-4-5',
    }).select('id').single()

    if (!evalRecord) return NextResponse.json({ error: 'Failed to create eval record' }, { status: 500 })

    // Submit to AssemblyAI and return immediately — GET endpoint handles polling + Claude eval
    let jobId: string
    try {
      jobId = await submitTranscription(signedData.signedUrl)
    } catch (err: any) {
      await supabase.from('ai_evaluations').update({ eval_status: 'error' }).eq('id', evalRecord.id)
      return NextResponse.json({ error: `Transcription submit failed: ${err.message}` }, { status: 500 })
    }

    // Store job ID and return pending immediately — no polling in POST
    await supabase.from('ai_evaluations').update({ assemblyai_job_id: jobId }).eq('id', evalRecord.id)

    return NextResponse.json({
      pending: true,
      evalId: evalRecord.id,
      jobId,
      message: 'Transcription started — poll GET /api/evaluate-sharktank?evalId=' + evalRecord.id,
    })

  } catch (err: any) {
    console.error('evaluate-sharktank POST error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

// Allow up to 60s on Vercel Pro (falls back to plan limit on Hobby)
export const maxDuration = 60

// ─── GET: Poll + complete evaluation ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const evalId = searchParams.get('evalId')
  if (!evalId) return NextResponse.json({ error: 'evalId required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: ev } = await supabase
    .from('ai_evaluations')
    .select('*')
    .eq('id', evalId)
    .single()

  if (!ev) return NextResponse.json({ error: 'Eval not found' }, { status: 404 })

  // Already terminal — return as-is
  if (ev.eval_status === 'completed' || ev.eval_status === 'error') {
    return NextResponse.json({ eval_status: ev.eval_status, weighted_score: ev.weighted_score })
  }

  // Phase 1: If transcribing, check AssemblyAI
  if (ev.eval_status === 'transcribing' && ev.assemblyai_job_id) {
    const transcriptRes = await fetch(`${ASSEMBLYAI_BASE}/transcript/${ev.assemblyai_job_id}`, {
      headers: { authorization: ASSEMBLYAI_KEY },
    })
    const transcriptData = await transcriptRes.json()

    if (transcriptData.status === 'error') {
      const errMsg = transcriptData.error || 'AssemblyAI job failed'
      await supabase.from('ai_evaluations').update({ eval_status: 'error', overall_feedback: `AssemblyAI error: ${errMsg}` }).eq('id', evalId)
      return NextResponse.json({ eval_status: 'error', assemblyai_error: errMsg })
    }

    if (transcriptData.status !== 'completed') {
      // Still processing — return current status so client keeps polling
      return NextResponse.json({ eval_status: 'transcribing' })
    }

    // Transcript ready — save it and advance to evaluating phase
    const transcript = transcriptData.text as string
    await supabase.from('ai_evaluations')
      .update({ eval_status: 'evaluating', transcript_text: transcript })
      .eq('id', evalId)
    ev.eval_status = 'evaluating'
    ev.transcript_text = transcript
  }

  // Phase 2: Evaluate with Claude (handles 'evaluating' state, retries if interrupted)
  if (ev.eval_status === 'evaluating' && ev.transcript_text) {
    const { data: rubric } = await supabase
      .from('evaluation_rubric')
      .select('*')
      .eq('section', 'sharktank')
      .eq('active', true)
      .order('position')

    if (!rubric?.length) {
      await supabase.from('ai_evaluations').update({ eval_status: 'error' }).eq('id', evalId)
      return NextResponse.json({ eval_status: 'error', error: 'No SharkTank rubric found' })
    }

    const { data: sub } = await supabase
      .from('submissions')
      .select('assessment_configs(shark_scenario)')
      .eq('id', ev.submission_id)
      .single()

    const config = (sub as any)?.assessment_configs
    const scenario = Array.isArray(config) ? config[0]?.shark_scenario : config?.shark_scenario
    const scenarioData = {
      name: scenario?.name || 'Restaurante en Rappi',
      desc: scenario?.desc || 'Restaurante con ventas estancadas',
      mission: scenario?.mission || 'Convencer al dueño de implementar nuevas estrategias',
    }

    try {
      const parsed = await evaluateWithClaude(ev.transcript_text, scenarioData, rubric)
      const dimensionScores = rubric.map((dim: any) => {
        const dimResult = parsed.dimensions?.find((d: any) => d.rubric_id === dim.id)
        const maxScore = Math.max(...dim.scale.map((s: any) => s.score))
        const score = dimResult?.score ?? 0
        const level = dim.scale.find((s: any) => s.score === score)
        return { rubric_id: dim.id, name: dim.name, score, max_score: maxScore, weight: dim.weight, label: level?.label || '', justification: dimResult?.justification || '' }
      })
      const weightedScore = dimensionScores.reduce((t: number, d: any) => t + (d.max_score > 0 ? (d.score / d.max_score) * d.weight : 0), 0)
      const sharkScore = Math.round(weightedScore * 10) / 10
      await supabase.from('ai_evaluations').update({
        eval_status: 'completed',
        dimension_scores: dimensionScores,
        weighted_score: sharkScore,
        overall_feedback: parsed.overall_feedback || '',
        evaluated_at: new Date().toISOString(),
      }).eq('id', evalId)

      // Update submission's overall_score_pct to include shark score
      const { data: subData } = await supabase
        .from('submissions')
        .select('math_score_pct, caso_score_pct')
        .eq('id', ev.submission_id)
        .single()
      if (subData) {
        const newOverall = Math.round(
          sharkScore * 0.35 +
          (subData.caso_score_pct ?? 0) * 0.40 +
          (subData.math_score_pct ?? 0) * 0.25
        )
        await supabase.from('submissions')
          .update({ overall_score_pct: newOverall })
          .eq('id', ev.submission_id)
      }

      return NextResponse.json({ eval_status: 'completed', weighted_score: sharkScore })
    } catch (err: any) {
      await supabase.from('ai_evaluations').update({ eval_status: 'error' }).eq('id', evalId)
      return NextResponse.json({ eval_status: 'error', error: err.message })
    }
  }

  return NextResponse.json({ eval_status: ev.eval_status, weighted_score: ev.weighted_score })
}
