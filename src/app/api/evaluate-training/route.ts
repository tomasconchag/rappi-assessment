import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY!

  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      speech_model: 'universal',
      speaker_labels: true,
      language_code: 'es',
    }),
  })

  if (!submitRes.ok) {
    const errText = await submitRes.text()
    if (submitRes.status === 401) throw new Error(`AssemblyAI: API key inválida (401).`)
    if (submitRes.status === 429) throw new Error(`AssemblyAI: rate limit alcanzado (429).`)
    throw new Error(`AssemblyAI submit failed (${submitRes.status}): ${errText}`)
  }

  const { id, error: submitError } = await submitRes.json()
  if (submitError) throw new Error(`AssemblyAI submit error: ${submitError}`)

  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    })
    const data = await pollRes.json()
    if (data.status === 'completed') {
      if (data.utterances?.length > 0) {
        const speakers = [...new Set(data.utterances.map((u: { speaker: string }) => u.speaker))] as string[]
        const firstSpeaker = data.utterances[0]?.speaker as string
        const speakerLabel = (sp: string): string => {
          if (speakers.length === 1) return 'FARMER'
          return sp === firstSpeaker ? 'AGENTE' : 'FARMER'
        }
        return data.utterances
          .map((u: { speaker: string; text: string }) => `[${speakerLabel(u.speaker)}]: ${u.text}`)
          .join('\n')
      }
      return data.text || ''
    }
    if (data.status === 'error') throw new Error(`AssemblyAI error: ${data.error}`)
  }
  throw new Error('AssemblyAI transcription timed out')
}

function buildSystemPrompt(rubricDimensions: RubricDimension[], documentContent: string): string {
  const dimSection = rubricDimensions.length > 0
    ? rubricDimensions
        .filter(d => d.active)
        .map((d, i) => {
          const levels = d.scale
            .sort((a: ScaleLevel, b: ScaleLevel) => b.score - a.score)
            .map((s: ScaleLevel) => `  - ${s.score} pts — ${s.label}: ${s.description}`)
            .join('\n')
          return `${i + 1}. ${d.name.toUpperCase()} (peso: ${d.weight}%, máx: ${Math.max(...d.scale.map((s: ScaleLevel) => s.score))} pts)\n${d.description ? `   Descripción: ${d.description}\n` : ''}${levels}`
        })
        .join('\n\n')
    : `1. CONOCIMIENTO DEL PROCESO (33%)\n  - 4 pts — Excelente: Demuestra dominio completo del proceso descrito en los documentos\n  - 3 pts — Bueno: Demuestra conocimiento sólido con algún detalle menor incorrecto\n  - 2 pts — Parcial: Conocimiento básico pero con errores o lagunas importantes\n  - 1 pts — Superficial: Solo menciones superficiales sin profundidad\n  - 0 pts — No abordado: No demuestra conocimiento del proceso\n\n2. HABILIDAD DE COMUNICACIÓN (33%)\n  - 4 pts — Excelente: Comunicación clara, estructurada y persuasiva\n  - 3 pts — Bueno: Comunicación clara con pequeñas mejoras posibles\n  - 2 pts — Parcial: Comunicación entendible pero desorganizada\n  - 1 pts — Superficial: Comunicación difícil de seguir\n  - 0 pts — No abordado: No logra comunicar efectivamente\n\n3. MANEJO DE OBJECIONES (34%)\n  - 4 pts — Excelente: Resuelve objeciones con argumentos sólidos del contexto\n  - 3 pts — Bueno: Maneja objeciones de forma profesional\n  - 2 pts — Parcial: Responde objeciones pero sin profundidad\n  - 1 pts — Superficial: Respuestas genéricas sin argumentos concretos\n  - 0 pts — No abordado: No maneja objeciones`

  return `Eres el Evaluador Oficial de Training de Rappi.
Tu rol es evaluar transcripciones de roleplay de entrenamiento de farmers con el agente de IA de Rappi.

${documentContent ? `CONTEXTO DE ENTRENAMIENTO — documentos de referencia:
─────────────────────────────────────────────────
${documentContent}
─────────────────────────────────────────────────

El farmer debió demostrar conocimiento y aplicación de este contenido durante el roleplay.

` : ''}INSTRUCCIONES:
1. Lee la transcripción COMPLETA antes de puntuar.
2. En la transcripción: AGENTE = el agente de IA de Rappi (no evaluar), FARMER = la persona evaluada.
3. Evalúa ÚNICAMENTE al FARMER.
4. Para cada dimensión, asigna el puntaje del nivel que mejor describe el desempeño.
5. Justifica con citas textuales de la transcripción.
6. Responde ÚNICAMENTE con JSON válido.

═══════════════════════════════════════════════════
DIMENSIONES DE EVALUACIÓN
═══════════════════════════════════════════════════

${dimSection}

═══════════════════════════════════════════════════
BANDAS DE RESULTADO
═══════════════════════════════════════════════════
El puntaje total se calcula como promedio ponderado de las dimensiones activas (0–100 escala normalizada).
- ELITE:             85–100 — Desempeño sobresaliente, listo para aplicar en campo
- SÓLIDO:            70–84  — Desempeño sólido, pequeñas áreas de mejora
- EN DESARROLLO:     50–69  — Base presente pero requiere práctica adicional
- REQUIERE COACHING: 0–49   — Necesita refuerzo significativo antes de aplicar

═══════════════════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════════════════
RESPONDE ÚNICAMENTE CON JSON VÁLIDO:
{
  "dimensions": {
    "<dimension_key>": {
      "score": <number>,
      "max": <number>,
      "label": "<tier label>",
      "evidence": "<cita textual>",
      "feedback": "<qué mejorar>"
    }
  },
  "total": <0-100 normalizado>,
  "band": "ELITE|SÓLIDO|EN DESARROLLO|REQUIERE COACHING",
  "summary": "<resumen ejecutivo 2-3 oraciones>",
  "key_strengths": ["fortaleza 1", "fortaleza 2"],
  "priority_actions": ["acción 1", "acción 2"]
}`
}

interface ScaleLevel {
  score: number
  label: string
  description: string
}

interface RubricDimension {
  id: string
  name: string
  description: string
  weight: number
  scale: ScaleLevel[]
  active: boolean
  position: number
}

export async function POST(req: NextRequest) {
  let submissionId: string | undefined
  try {
    const body = await req.json()
    submissionId = body.submissionId
    const force: boolean = body.force ?? false
    if (!submissionId) return Response.json({ error: 'submissionId requerido' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: sub, error: subErr } = await supabase
      .from('training_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (subErr || !sub) return Response.json({ error: 'Submission not found' }, { status: 404 })

    // Idempotency
    if (!force && sub.score != null) {
      return Response.json({ skipped: true, score: sub.score })
    }

    // Mark as evaluating
    await supabase.from('training_submissions').update({ status: 'evaluating' }).eq('id', submissionId)

    // Get transcript — transcribe if not yet available
    let transcript: string = sub.transcript || ''
    if (!transcript) {
      const videoPath = sub.video_path as string | null
      if (!videoPath) {
        // No recording — try to get transcript from Vapi call via vapi_call_id
        // For now, mark as failed
        await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
        return Response.json({ error: 'No hay grabación ni transcripción disponible' }, { status: 400 })
      }

      const { data: urlData } = await supabase.storage
        .from('assessment-videos')
        .createSignedUrl(videoPath, 3600)
      if (!urlData?.signedUrl) {
        await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
        return Response.json({ error: 'No se pudo obtener URL del video' }, { status: 500 })
      }

      console.log('[evaluate-training] transcribing via AssemblyAI...')
      transcript = await transcribeWithAssemblyAI(urlData.signedUrl)
      if (!transcript) {
        await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
        return Response.json({ error: 'Transcripción vacía' }, { status: 422 })
      }

      await supabase.from('training_submissions').update({ transcript }).eq('id', submissionId)
    }

    // Get rubric dimensions for 'training' section
    const { data: rubricRows } = await supabase
      .from('evaluation_rubric')
      .select('*')
      .eq('section', 'training')
      .eq('active', true)
      .order('position', { ascending: true })

    const rubricDimensions: RubricDimension[] = (rubricRows || []) as RubricDimension[]

    // Get document content for the cohort
    const { data: cohort } = await supabase
      .from('training_cohorts')
      .select('doc_ids')
      .eq('id', sub.cohort_id)
      .single()

    let documentContent = ''
    if (cohort?.doc_ids?.length) {
      const { data: docs } = await supabase
        .from('training_documents')
        .select('name, content')
        .in('id', cohort.doc_ids)

      if (docs?.length) {
        documentContent = docs.map(d => `## ${d.name}\n\n${d.content}`).join('\n\n---\n\n')
      }
    }

    console.log('[evaluate-training] evaluating with Claude...')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const systemPrompt = buildSystemPrompt(rubricDimensions, documentContent)

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Evalúa el siguiente roleplay de training. Responde SOLO con el JSON estructurado.\n\nTRANSCRIPCIÓN:\n${transcript}`,
      }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
      return Response.json({ error: 'Claude no retornó JSON válido' }, { status: 500 })
    }

    let evaluation: Record<string, unknown>
    try {
      evaluation = JSON.parse(jsonMatch[0])
    } catch {
      await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
      return Response.json({ error: 'No se pudo parsear respuesta de Claude' }, { status: 500 })
    }

    if (typeof evaluation.total !== 'number') {
      await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
      return Response.json({ error: 'Respuesta de Claude incompleta: falta total' }, { status: 500 })
    }

    const { error: updateErr } = await supabase
      .from('training_submissions')
      .update({
        transcript,
        score: Math.round(evaluation.total as number),
        band: evaluation.band,
        evaluation,
        evaluated_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', submissionId)

    if (updateErr) {
      console.error('[evaluate-training] DB update error:', updateErr.message)
      return Response.json({ error: updateErr.message }, { status: 500 })
    }

    return Response.json({ evaluation, transcript })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[evaluate-training] error:', msg)

    // Try to mark as failed
    try {
      if (submissionId) {
        const supabase = createAdminClient()
        await supabase.from('training_submissions').update({ status: 'eval_failed' }).eq('id', submissionId)
      }
    } catch { /* ignore */ }

    return Response.json({ error: msg }, { status: 500 })
  }
}
