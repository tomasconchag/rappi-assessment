import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const RUBRIC_SYSTEM_PROMPT = `Eres el Agente Evaluador Oficial de Rappi Brand Development. Tu único rol es evaluar transcripciones de llamadas de roleplay de candidatos a Farmer usando el framework de Criterios de Evidencia Observable v2.0.

INSTRUCCIONES GLOBALES:
1. Identifica la etapa del ciclo primero (Descubrimiento, Propuesta o Cierre)
2. Lee la transcripción completa antes de puntuar
3. Para cada métrica, cita el fragmento exacto que justifica la puntuación
4. Calcula el puntaje bruto primero, luego aplica penalizaciones (puntaje neto mínimo 0)
5. Aplica las dependencias entre métricas: si M2 < 8pts, M3 y M4 no pueden ser altas; si M1 = 0, M5 máximo = 8pts
6. Incluye feedback accionable para cada métrica con puntaje < 10pts

SCORECARD COMPLETO:
- M1: Stakeholder Validation (14 pts) — Variables: Identifica decisor antes del pitch (5), Mapea proceso de decisión (5), Adapta plan ante múltiples decisores (4). Penalización: -3 si pitch completo sin validar stakeholder.
- M2: Business & Performance Discovery (14 pts) — Variables: Diagnóstico de catálogo (3), Diagnóstico de operaciones (3), % de Markdown y calidad (4), Historial de desempeño en plataforma (4). Penalizaciones: -3 propone ADS con operaciones críticas, -2 datos inventados.
- M3: Problem Framing & Opportunity Sizing (14 pts) — Variables: Identifica palanca prioritaria según diagnóstico (5), Cuantifica costo de inacción (5), El aliado verbaliza el problema (4). Penalización: -3 solución antes que problema.
- M4: Solution Proposal — Ads & Markdowns (14 pts) — Variables: Palanca correcta según diagnóstico (4), Propuesta personalizada con datos del aliado (4), Lógica de ROI explicada (3), Estándar MD High Quality ≥25% (3). Penalizaciones: -3 garantiza resultados específicos, -2 propone co-inversión como primer argumento, -2 propone ADS sin Markdown activo.
- M5: Performance Ownership & Follow-Up (14 pts) — Variables: Compromiso concreto con fecha/monto/próximo paso (6), Define responsabilidades de ambas partes (4), Establece métrica de éxito (4). Penalización: -2 cierre sin resumen.
- M6: Objection Handling (6 pts) — Variables: Objeción precio/presupuesto (2), Objeción cómo funciona (2), Objeción ya lo intenté (2). Secuencia obligatoria: Validar → Reformular → Responder → Confirmar.
- M7: Active Listening & Adaptability (6 pts) — Variables: Adapta pitch en tiempo real (3), No usa guión rígido (3). Regla 40/60: aliado debe hablar ≥40% del tiempo.
- M8: Product & Platform Knowledge (6 pts) — Variables: Dominio técnico ADS (3), Dominio técnico Markdown (3). Penalización: -2 datos técnicos inventados.
- M9: Legitimate Urgency Generation (6 pts) — Variables: Urgencia basada en palanca real (3), Urgencia específica para este aliado (3). Penalización: -3 urgencia artificial.
- M10: Presence & Conversation Control (6 pts) — Variables: Mantiene hilo de conversación (3), Usa silencios estratégicamente (3).

ESCALAS POR VARIABLE:
- COMPLETO = puntos completos
- PARCIAL = 50% de los puntos
- NO EJECUTADO = 0 puntos

BANDAS DE DESEMPEÑO:
- ELITE: 90-100 pts
- SÓLIDO: 75-89 pts
- EN DESARROLLO: 60-74 pts
- REQUIERE COACHING: 40-59 pts
- CRÍTICO: 0-39 pts

RESPONDE ÚNICAMENTE CON JSON VÁLIDO con esta estructura exacta:
{
  "stage": "Descubrimiento|Propuesta|Cierre",
  "metrics": {
    "M1": { "score": 0, "max": 14, "variables": {"identifica_decisor": 0, "mapea_decision": 0, "adapta_multiple": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M2": { "score": 0, "max": 14, "variables": {"catalogo": 0, "operaciones": 0, "markdown_calidad": 0, "historial": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M3": { "score": 0, "max": 14, "variables": {"palanca_prioritaria": 0, "costo_inaccion": 0, "aliado_verbaliza": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M4": { "score": 0, "max": 14, "variables": {"palanca_correcta": 0, "propuesta_personalizada": 0, "logica_roi": 0, "md_hq": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M5": { "score": 0, "max": 14, "variables": {"compromiso_concreto": 0, "responsabilidades": 0, "metrica_exito": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M6": { "score": 0, "max": 6, "variables": {"precio": 0, "como_funciona": 0, "ya_lo_intente": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M7": { "score": 0, "max": 6, "variables": {"adapta_pitch": 0, "no_guion": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M8": { "score": 0, "max": 6, "variables": {"dominio_ads": 0, "dominio_markdown": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M9": { "score": 0, "max": 6, "variables": {"urgencia_real": 0, "urgencia_especifica": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" },
    "M10": { "score": 0, "max": 6, "variables": {"mantiene_hilo": 0, "silencios": 0}, "penalties": 0, "evidence": "cita textual", "feedback": "qué faltó y cómo mejorar" }
  },
  "total": 0,
  "band": "CRÍTICO|REQUIERE COACHING|EN DESARROLLO|SÓLIDO|ELITE",
  "summary": "resumen ejecutivo de 2-3 oraciones",
  "key_strengths": ["fortaleza 1", "fortaleza 2"],
  "priority_actions": ["acción prioritaria 1", "acción prioritaria 2", "acción prioritaria 3"]
}`

async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY!

  // Submit transcription job
  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: 'es',
      speaker_labels: true,
    }),
  })
  const { id, error: submitError } = await submitRes.json()
  if (submitError) throw new Error(`AssemblyAI submit error: ${submitError}`)

  // Poll until done
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    })
    const data = await pollRes.json()
    if (data.status === 'completed') {
      // Format with speaker labels if available
      if (data.utterances?.length > 0) {
        return data.utterances
          .map((u: { speaker: string; text: string }) => `[${u.speaker === 'A' ? 'CANDIDATO' : 'ALIADO'}]: ${u.text}`)
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
    const { submissionId } = await req.json()
    if (!submissionId) return Response.json({ error: 'submissionId requerido' }, { status: 400 })

    const supabase = createAdminClient()

    // Get submission
    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .select('id, roleplay_video_path, roleplay_completed, roleplay_transcript')
      .eq('id', submissionId)
      .single()

    if (subErr || !sub) return Response.json({ error: 'Submission no encontrada' }, { status: 404 })

    // If transcript already set (from Vapi/Arbol), skip AssemblyAI
    let transcript = sub.roleplay_transcript || ''
    if (!transcript) {
      // Need video to transcribe via AssemblyAI
      if (!sub.roleplay_video_path) return Response.json({ error: 'No hay grabación ni transcripción de roleplay para este candidato' }, { status: 400 })

      // Get signed URL for the video
      const { data: urlData } = await supabase.storage
        .from('assessment-videos')
        .createSignedUrl(sub.roleplay_video_path, 3600)
      if (!urlData?.signedUrl) return Response.json({ error: 'No se pudo obtener la URL del video' }, { status: 500 })

      console.log('[evaluate-roleplay] transcribing via AssemblyAI...')
      transcript = await transcribeWithAssemblyAI(urlData.signedUrl)
      if (!transcript) return Response.json({ error: 'La transcripción está vacía' }, { status: 422 })
    } else {
      console.log('[evaluate-roleplay] using existing transcript (Vapi/Arbol)')
    }

    // Evaluate with Claude
    console.log('[evaluate-roleplay] evaluating with Claude...')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: RUBRIC_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Evalúa la siguiente transcripción de roleplay usando el framework completo M1-M10. Responde SOLO con el JSON estructurado.\n\nTRANSCRIPCIÓN:\n${transcript}`,
      }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return Response.json({ error: 'Claude no retornó JSON válido' }, { status: 500 })

    const evaluation = JSON.parse(jsonMatch[0])

    // Save to DB
    const { error: updateErr } = await supabase
      .from('submissions')
      .update({
        roleplay_transcript:   transcript,
        roleplay_score:        evaluation.total,
        roleplay_band:         evaluation.band,
        roleplay_evaluation:   evaluation,
        roleplay_evaluated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateErr) {
      console.error('[evaluate-roleplay] DB update error:', updateErr.message)
      return Response.json({ error: updateErr.message }, { status: 500 })
    }

    return Response.json({ evaluation, transcript })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[evaluate-roleplay] error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
