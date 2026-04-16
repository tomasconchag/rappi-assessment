import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 360  // 300s AssemblyAI polling + 60s headroom for Claude

const CULTURAL_FIT_SYSTEM_PROMPT = `Eres el Agente Evaluador Oficial de Rappi Brand Development para entrevistas de Cultural Fit.
Tu rol es evaluar transcripciones de entrevistas de candidatos con Simón (Team Lead de Brand Development).

CONTEXTO:
- CANDIDATO es la persona evaluada.
- SIMÓN es el entrevistador (Team Lead de BD Rappi). No evalúes a Simón.
- Cada dimensión se puntúa según los tiers descritos abajo. Cita fragmento textual exacto de la transcripción para justificar cada puntaje.

INSTRUCCIONES GLOBALES:
1. Lee la transcripción COMPLETA antes de puntuar.
2. Para cada dimensión, asigna el tier que mejor describe la respuesta del candidato y aplica los puntos correspondientes.
3. Calcula el puntaje bruto primero, luego aplica penalizaciones. El total neto no puede ser negativo.
4. Incluye feedback accionable para cada dimensión con puntaje por debajo del 70% de su máximo.
5. Responde ÚNICAMENTE con JSON válido.

═══════════════════════════════════════════════════════
ESCALA DE PUNTUACIÓN POR DIMENSIÓN
═══════════════════════════════════════════════════════
Cada dimensión vale 20 pts. Tres niveles posibles:
- Tier 1 — Elite (Excellence): 20 pts (100%)
- Tier 2 — Solid (Average): 10 pts (50%)
- Tier 3 — Critical (Risk): 0 pts (0%)

═══════════════════════════════════════════════════════
DIMENSIONES DE EVALUACIÓN (5 × 20 pts = 100 pts)
═══════════════════════════════════════════════════════

1. GESTIÓN DE CONFLICTOS (20 pts)
Pregunta: "Cuéntame de una situación en la que tuviste un conflicto con un compañero de equipo. ¿Cómo lo manejaste?"
- Tier 1 — Elite (20 pts): Resolución basada en hechos y empatía. Enfoque en el objetivo común. Locus de control interno (asume responsabilidad propia). Verde: ¿describe una mejora en la relación o proceso tras el conflicto?
- Tier 2 — Solid (10 pts): Maneja el conflicto de forma profesional pero superficial. Evita la confrontación o delega la solución a un tercero.
- Tier 3 — Critical (0 pts): Atribuye la culpa totalmente al otro (locus externo). Muestra resentimiento o falta de cierre profesional.

2. FIT CULTURAL (20 pts)
Pregunta: "¿Qué tipo de ambiente de trabajo te hace rendir mejor? ¿Y en cuál sientes que no encajas tanto?"
- Tier 1 — Elite (20 pts): Identifica con precisión entornos de alta presión vs. soporte. Muestra autoconocimiento profundo y alineación con valores de la empresa. Verde: ¿menciona cómo su rendimiento impacta KPIs en su ambiente ideal?
- Tier 2 — Solid (10 pts): Describe preferencias genéricas (ej: "buen clima"). Identifica ambientes que no le gustan pero de forma reactiva.
- Tier 3 — Critical (0 pts): No sabe identificar qué lo motiva. Muestra rigidez o intolerancia a la diversidad de ritmos de trabajo.

3. ADAPTABILIDAD (20 pts)
Pregunta: "Háblame de una vez en la que tuviste que adaptarte a un cambio importante en el trabajo. ¿Cómo lo viviste?"
- Tier 1 — Elite (20 pts): Resiliencia extrema. Describe el cambio como oportunidad. Agilidad de aprendizaje y ajuste de procesos rápido. Verde: ¿muestra una acción concreta que tomó para acelerar su curva de aprendizaje?
- Tier 2 — Solid (10 pts): Se adapta con el tiempo pero muestra resistencia inicial. Necesita guía constante para procesar el cambio.
- Tier 3 — Critical (0 pts): Se paraliza ante la incertidumbre. Habla del cambio desde la pérdida o la queja constante.

4. DINÁMICA DE EQUIPO (20 pts)
Pregunta: "Cuando trabajas en equipo, ¿qué rol sueles tomar naturalmente? ¿Por qué?"
- Tier 1 — Elite (20 pts): Liderazgo situacional. Entiende su rol (ej: implementador vs. creativo) y cómo este complementa los gaps del equipo. Verde: ¿menciona cómo ayuda a otros miembros del equipo a brillar?
- Tier 2 — Solid (10 pts): Identifica un rol fijo (ej: "soy el que hace") pero no analiza cómo interactúa con otros perfiles.
- Tier 3 — Critical (0 pts): No tiene claridad de su impacto en el grupo. Se describe como un ente aislado o dominante sin escucha.

5. GESTIÓN DE FEEDBACK (20 pts)
Pregunta: "Cuéntame de una situación donde recibiste feedback difícil. ¿Cómo reaccionaste y qué hiciste después?"
- Tier 1 — Elite (20 pts): Escucha activa y ausencia de defensividad. Demuestra cambio conductual verificable posterior al feedback. Verde: ¿cita la acción específica y el resultado de la mejora 3 meses después?
- Tier 2 — Solid (10 pts): Acepta el feedback pero no muestra un plan de acción para corregir. Se justifica ligeramente durante la respuesta.
- Tier 3 — Critical (0 pts): Reacción defensiva o negación. Considera el feedback como un ataque personal. No hubo cambios tras la sesión.

═══════════════════════════════════════════════════════
RED FLAGS — PENALIZACIONES DIRECTAS
═══════════════════════════════════════════════════════
Aplica estas penalizaciones al total si se observan las siguientes conductas:
- Falta de Honestidad (-10 pts): Inconsistencias en el relato o falta de detalles específicos (historias genéricas sin nombre, fecha, contexto real).
- Defensividad Extrema (-5 pts): Culpar sistemáticamente a otros por errores propios a lo largo de toda la entrevista.
- Falta de Autocrítica (-5 pts): Incapacidad de identificar un área de mejora real cuando se le solicita.

═══════════════════════════════════════════════════════
BANDAS DE CONTRATACIÓN
═══════════════════════════════════════════════════════
- TOP TALENT: 90–100 pts — Contratación inmediata. Potencial de liderazgo a corto plazo.
- STRONG FIT: 75–89 pts — Candidato sólido. Requiere onboarding enfocado en cultura.
- POTENTIAL RISK: 60–74 pts — Dudas en resiliencia o EQ. Requiere segunda entrevista técnica.
- NOT A FIT: 0–59 pts — No cumple con los estándares de madurez conductual requeridos.

═══════════════════════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════════════════════
RESPONDE ÚNICAMENTE CON JSON VÁLIDO con esta estructura exacta:
{
  "dimensions": {
    "gestion_conflictos": {
      "score": 0, "max": 20, "tier": "Elite|Solid|Critical",
      "evidence": "cita textual de la transcripción",
      "feedback": "qué faltó y cómo mejorar"
    },
    "fit_cultural": {
      "score": 0, "max": 20, "tier": "Elite|Solid|Critical",
      "evidence": "cita textual de la transcripción",
      "feedback": "qué faltó y cómo mejorar"
    },
    "adaptabilidad": {
      "score": 0, "max": 20, "tier": "Elite|Solid|Critical",
      "evidence": "cita textual de la transcripción",
      "feedback": "qué faltó y cómo mejorar"
    },
    "dinamica_equipo": {
      "score": 0, "max": 20, "tier": "Elite|Solid|Critical",
      "evidence": "cita textual de la transcripción",
      "feedback": "qué faltó y cómo mejorar"
    },
    "gestion_feedback": {
      "score": 0, "max": 20, "tier": "Elite|Solid|Critical",
      "evidence": "cita textual de la transcripción",
      "feedback": "qué faltó y cómo mejorar"
    }
  },
  "penalties": {
    "falta_honestidad": 0,
    "defensividad_extrema": 0,
    "falta_autocritica": 0
  },
  "total": 0,
  "band": "NOT A FIT|POTENTIAL RISK|STRONG FIT|TOP TALENT",
  "summary": "resumen ejecutivo de 2-3 oraciones sobre el candidato",
  "key_strengths": ["fortaleza 1", "fortaleza 2"],
  "priority_actions": ["acción prioritaria 1", "acción prioritaria 2"]
}`

async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY!

  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      speech_models: ['universal-2'],
      speaker_labels: true,
    }),
  })

  // Distinguish HTTP errors: 401 = bad key (no point retrying), 429 = rate limit
  if (!submitRes.ok) {
    const errText = await submitRes.text()
    if (submitRes.status === 401) throw new Error(`AssemblyAI: API key inválida (401). Verificar ASSEMBLYAI_API_KEY.`)
    if (submitRes.status === 429) throw new Error(`AssemblyAI: rate limit alcanzado (429). Reintentar en unos minutos.`)
    throw new Error(`AssemblyAI submit failed (${submitRes.status}): ${errText}`)
  }

  const { id, error: submitError } = await submitRes.json()
  if (submitError) throw new Error(`AssemblyAI submit error: ${submitError}`)

  for (let i = 0; i < 100; i++) {  // 100 × 3s = 300s max (was 180s — increased for 200 concurrent users)
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    })
    const data = await pollRes.json()
    if (data.status === 'completed') {
      // In a Vapi cultural-fit call, the AI interviewer (Simón) always speaks first.
      // AssemblyAI assigns Speaker A = first speaker = SIMÓN, Speaker B = CANDIDATO.
      // Single-speaker recordings (mic-only capture) are labeled as CANDIDATO throughout.
      if (data.utterances?.length > 0) {
        const speakers = [...new Set(data.utterances.map((u: { speaker: string }) => u.speaker))] as string[]
        const firstSpeaker = data.utterances[0]?.speaker as string
        const speakerLabel = (sp: string): string => {
          if (speakers.length === 1) return 'CANDIDATO'
          return sp === firstSpeaker ? 'SIMÓN' : 'CANDIDATO'
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

export async function POST(req: NextRequest) {
  try {
    const { submissionId, force = false } = await req.json()
    if (!submissionId) return Response.json({ error: 'submissionId requerido' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .select('id, cultural_fit_video_path, cultural_fit_completed, cultural_fit_transcript, cultural_fit_score, roleplay_score, math_score_pct, caso_score_pct, enabled_sections, challenge_weights')
      .eq('id', submissionId)
      .single()

    if (subErr || !sub) return Response.json({ error: 'Submission no encontrada' }, { status: 404 })

    // Idempotency: skip if already evaluated (unless force=true)
    const existingScore = (sub as Record<string, unknown>).cultural_fit_score
    if (!force && existingScore != null) {
      console.log('[evaluate-cultural-fit] already evaluated, skipping (use force=true to re-evaluate)')
      return Response.json({ skipped: true, cultural_fit_score: existingScore })
    }

    let transcript = (sub as Record<string, unknown>).cultural_fit_transcript as string || ''
    if (!transcript) {
      const videoPath = (sub as Record<string, unknown>).cultural_fit_video_path as string | null
      if (!videoPath) return Response.json({ error: 'No hay grabación ni transcripción de cultural fit para este candidato' }, { status: 400 })

      const { data: urlData } = await supabase.storage
        .from('assessment-videos')
        .createSignedUrl(videoPath, 3600)
      if (!urlData?.signedUrl) return Response.json({ error: 'No se pudo obtener la URL del video' }, { status: 500 })

      console.log('[evaluate-cultural-fit] transcribing via AssemblyAI...')
      transcript = await transcribeWithAssemblyAI(urlData.signedUrl)
      if (!transcript) return Response.json({ error: 'La transcripción está vacía' }, { status: 422 })

      // Save transcript immediately — so retries can skip AssemblyAI even if Claude fails later
      await supabase.from('submissions').update({ cultural_fit_transcript: transcript }).eq('id', submissionId)
      console.log('[evaluate-cultural-fit] transcript saved to DB')
    } else {
      console.log('[evaluate-cultural-fit] using existing transcript')
    }

    console.log('[evaluate-cultural-fit] evaluating with Claude...')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: CULTURAL_FIT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Evalúa la siguiente transcripción de entrevista de Cultural Fit. Responde SOLO con el JSON estructurado.\n\nTRANSCRIPCIÓN:\n${transcript}`,
      }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[evaluate-cultural-fit] No JSON in Claude response:', rawContent.slice(0, 300))
      return Response.json({ error: 'Claude no retornó JSON válido' }, { status: 500 })
    }

    let evaluation: Record<string, unknown>
    try {
      evaluation = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('[evaluate-cultural-fit] JSON parse failed:', parseErr, 'raw:', rawContent.slice(0, 300))
      return Response.json({ error: 'No se pudo parsear la respuesta de Claude' }, { status: 500 })
    }

    // Schema validation — ensure required fields exist before writing to DB
    if (typeof evaluation.total !== 'number') {
      console.error('[evaluate-cultural-fit] Schema invalid — missing total:', JSON.stringify(evaluation).slice(0, 300))
      return Response.json({ error: 'Respuesta de Claude incompleta: falta campo "total"' }, { status: 500 })
    }
    if (!evaluation.band || typeof evaluation.band !== 'string') {
      console.error('[evaluate-cultural-fit] Schema invalid — missing band')
      return Response.json({ error: 'Respuesta de Claude incompleta: falta campo "band"' }, { status: 500 })
    }
    if (!evaluation.dimensions || typeof evaluation.dimensions !== 'object') {
      console.error('[evaluate-cultural-fit] Schema invalid — missing dimensions')
      return Response.json({ error: 'Respuesta de Claude incompleta: falta campo "dimensions"' }, { status: 500 })
    }

    const { error: updateErr } = await supabase
      .from('submissions')
      .update({
        cultural_fit_transcript:   transcript,
        cultural_fit_score:        evaluation.total,
        cultural_fit_band:         evaluation.band,
        cultural_fit_evaluation:   evaluation,
        cultural_fit_evaluated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateErr) {
      console.error('[evaluate-cultural-fit] DB update error:', updateErr.message)
      return Response.json({ error: updateErr.message }, { status: 500 })
    }

    // Recalculate and persist overall_score_pct including the new cultural_fit score.
    // cultural_fit has weight 0 by default but cohorts can override — normalizedWeights handles it.
    try {
      const { normalizedWeights } = await import('@/lib/challenges')
      const enabled = ((sub as Record<string, unknown>).enabled_sections as string[] | null) ?? ['caso', 'math']
      const weights = normalizedWeights(enabled as import('@/lib/challenges').SectionId[], ((sub as Record<string, unknown>).challenge_weights as Record<string, number> | null) ?? undefined)
      const scores: Record<string, number> = {
        cultural_fit: evaluation.total as number,
        roleplay:     ((sub as Record<string, unknown>).roleplay_score   as number | null) ?? 0,
        caso:         ((sub as Record<string, unknown>).caso_score_pct   as number | null) ?? 0,
        math:         ((sub as Record<string, unknown>).math_score_pct   as number | null) ?? 0,
      }
      const newOverall = Math.round(
        enabled.reduce((sum, sec) => {
          const w = weights[sec as import('@/lib/challenges').SectionId] ?? 0
          return sum + (scores[sec] ?? 0) * (w / 100)
        }, 0)
      )
      await supabase.from('submissions').update({ overall_score_pct: newOverall }).eq('id', submissionId)
      console.log(`[evaluate-cultural-fit] overall_score_pct updated to ${newOverall}`)
    } catch (overallErr) {
      console.warn('[evaluate-cultural-fit] could not update overall_score_pct:', overallErr)
    }

    return Response.json({ evaluation, transcript })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[evaluate-cultural-fit] error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
