import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

interface RubricDimension {
  id: string
  name: string
  description: string
  weight: number
  scale: { score: number; label: string; description: string }[]
}

interface EvalRequest {
  submissionId: string
  force?: boolean  // re-evaluate even if already evaluated
}

export const maxDuration = 60

// GET: poll current eval status for a submission (used by admin auto-poll)
export async function GET(req: NextRequest) {
  const submissionId = req.nextUrl.searchParams.get('submissionId')
  if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ai_evaluations')
    .select('*')
    .eq('submission_id', submissionId)
    .eq('section', 'caso')
    .order('evaluated_at', { ascending: true })
  return NextResponse.json({ evals: data || [], count: (data || []).length })
}

export async function POST(req: NextRequest) {
  try {
    const { submissionId, force = false }: EvalRequest = await req.json()
    if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 })

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured on server' }, { status: 500 })
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const supabase = createAdminClient()

    // Check if already evaluated (skip unless forced) — filter by section='caso'
    if (!force) {
      const { data: existing } = await supabase
        .from('ai_evaluations')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('section', 'caso')
        .limit(1)
      if (existing && existing.length > 0) {
        return NextResponse.json({ skipped: true, message: 'Already evaluated. Use force=true to re-evaluate.' })
      }
    }

    // Pre-delete all existing caso evals for this submission (only if force)
    if (force) {
      await supabase.from('ai_evaluations')
        .delete()
        .eq('submission_id', submissionId)
        .eq('section', 'caso')
    }

    // Load rubric + submission in parallel
    const [{ data: rubric }, { data: sub }] = await Promise.all([
      supabase
        .from('evaluation_rubric')
        .select('*')
        .eq('active', true)
        .eq('section', 'caso')
        .order('position'),
      supabase
        .from('submissions')
        .select(`
          id,
          math_score_pct,
          candidates ( name ),
          answers (
            id, answer_text, section,
            assessment_questions ( id, content, section, position )
          )
        `)
        .eq('id', submissionId)
        .single(),
    ])

    if (!rubric || rubric.length === 0) {
      return NextResponse.json({ error: 'No active rubric dimensions found' }, { status: 400 })
    }

    if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    const casoAnswers = ((sub.answers || []) as any[])
      .filter((a: any) => a.section === 'caso')
      .sort((a: any, b: any) => (a.assessment_questions?.position || 0) - (b.assessment_questions?.position || 0))

    if (casoAnswers.length === 0) {
      return NextResponse.json({ error: 'No caso answers found' }, { status: 400 })
    }

    // Build rubric description for the prompt (shared across all questions)
    const rubricText = (rubric as RubricDimension[]).map(dim => {
      const scaleText = dim.scale
        .sort((a, b) => a.score - b.score)
        .map(s => `    ${s.score} (${s.label}): ${s.description}`)
        .join('\n')
      const maxScore = Math.max(...dim.scale.map(s => s.score))
      return `**${dim.name}** (peso: ${dim.weight}%, máx: ${maxScore} pts)
${dim.description}
Escala:
${scaleText}`
    }).join('\n\n')

    const systemPrompt = `Eres un evaluador experto de Rappi que califica respuestas de candidatos al puesto de Farmer (gestor de restaurantes). Evaluás respuestas del Caso Práctico de Heladería La Fiore, un restaurante en Rappi con 4+ años que tiene ventas estancadas.

Contexto del caso:
- La Fiore lleva +4 años en Rappi, tiene estrategias activas pero sus ventas no crecen
- Tiene competidores en su zona que SÍ usan publicidad y están creciendo
- Datos del caso: valor promedio pedido $32.000, 180 pedidos/mes
- Descuentos: tienen todos + PRO, retorno positivo
- ADS: tiene $X/semana de presupuesto pero solo gasta el 30% del mismo, ROI 3x
- Horario limitado que podría optimizarse

Rúbrica de evaluación:
${rubricText}

INSTRUCCIONES:
- Evaluá la respuesta del candidato en CADA dimensión de la rúbrica
- Asigná el puntaje correcto según la escala (número entero)
- Sé objetivo y riguroso — no inflés puntajes si la respuesta es pobre
- Devolvé ÚNICAMENTE un JSON válido, sin texto adicional`

    const dimIds = (rubric as RubricDimension[]).map(d => d.id)
    const responseSchema = `{
  "dimensions": [
    ${dimIds.map((id) => `{"rubric_id": "${id}", "score": <número>, "justification": "<max 80 chars>"}`).join(',\n    ')}
  ],
  "overall_feedback": "<feedback general de 1-2 oraciones sobre la respuesta>"
}`

    // ── Evaluate ALL questions in PARALLEL ────────────────────────────────────
    const results = await Promise.all(
      casoAnswers.map(async (answer) => {
        const question = answer.assessment_questions
        if (!question) return null

        const userMessage = `Pregunta: ${question.content}

Respuesta del candidato: ${answer.answer_text || '(Sin respuesta)'}`

        try {
          const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: `${userMessage}\n\nDevolvé exactamente este JSON (reemplazá los valores):\n${responseSchema}`,
              },
            ],
          })

          const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

          let parsed: any
          try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/)
            parsed = JSON.parse(jsonMatch?.[0] || rawText)
          } catch {
            console.error('Failed to parse Claude response for question', question.id, ':', rawText)
            // Record error in DB so admin can see it failed
            await supabase.from('ai_evaluations').insert({
              submission_id: submissionId,
              section: 'caso',
              eval_status: 'error',
              question_id: question.id,
              question_text: question.content,
              answer_text: answer.answer_text || '',
              model_used: 'claude-haiku-4-5',
              dimension_scores: [],
              weighted_score: 0,
              overall_feedback: `Error: no se pudo parsear la respuesta del modelo. Raw: ${rawText.slice(0, 200)}`,
              evaluated_at: new Date().toISOString(),
            })
            return null
          }

          // Build dimension scores with rubric context
          const dimensionScores = (rubric as RubricDimension[]).map(dim => {
            const dimResult = parsed.dimensions?.find((d: any) => d.rubric_id === dim.id)
            const maxScore = Math.max(...dim.scale.map(s => s.score))
            const score = dimResult?.score ?? 0
            const level = dim.scale.find(s => s.score === score)
            return {
              rubric_id: dim.id,
              name: dim.name,
              score,
              max_score: maxScore,
              weight: dim.weight,
              label: level?.label || '',
              justification: dimResult?.justification || '',
            }
          })

          // Weighted score: sum(score/maxScore * weight) — result is 0-100
          const weightedScore = dimensionScores.reduce((total, d) => {
            return total + (d.max_score > 0 ? (d.score / d.max_score) * d.weight : 0)
          }, 0)

          // Save to DB
          const { error: insertError } = await supabase.from('ai_evaluations').insert({
            submission_id: submissionId,
            section: 'caso',
            eval_status: 'completed',
            question_id: question.id,
            question_text: question.content,
            answer_text: answer.answer_text || '',
            model_used: 'claude-haiku-4-5',
            dimension_scores: dimensionScores,
            weighted_score: Math.round(weightedScore * 10) / 10,
            overall_feedback: parsed.overall_feedback || '',
            evaluated_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error('Insert error for question', question.id, ':', insertError)
            return null
          }

          return {
            question_id: question.id,
            weighted_score: Math.round(weightedScore * 10) / 10,
            dimension_scores: dimensionScores,
          }
        } catch (err: any) {
          console.error('Claude error for question', question.id, ':', err.message)
          // Record error in DB
          await supabase.from('ai_evaluations').insert({
            submission_id: submissionId,
            section: 'caso',
            eval_status: 'error',
            question_id: question.id,
            question_text: question.content,
            answer_text: answer.answer_text || '',
            model_used: 'claude-haiku-4-5',
            dimension_scores: [],
            weighted_score: 0,
            overall_feedback: `Error al evaluar: ${err.message?.slice(0, 200) || 'Error desconocido'}`,
            evaluated_at: new Date().toISOString(),
          })
          return null
        }
      })
    )
    // ──────────────────────────────────────────────────────────────────────────

    const validResults = results.filter(Boolean) as { question_id: string; weighted_score: number; dimension_scores: any[] }[]

    // Calculate overall caso AI score (average across questions)
    const avgScore = validResults.length > 0
      ? Math.round(validResults.reduce((s, r) => s + r.weighted_score, 0) / validResults.length)
      : 0

    // ── Update submission's caso_score_pct so admin table reflects AI score ──
    if (validResults.length > 0) {
      const mathPct = (sub as any).math_score_pct ?? 0
      // Recalculate overall: caso 40% + math 25% (sharktank 35% stays as-is for now)
      // We only update caso and let overall reflect math + caso for now
      const newOverall = Math.round(avgScore * 0.40 + mathPct * 0.25)
      await supabase
        .from('submissions')
        .update({
          caso_score_pct: avgScore,
          overall_score_pct: newOverall,
        })
        .eq('id', submissionId)
    }
    // ──────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      submission_id: submissionId,
      questions_evaluated: validResults.length,
      questions_failed: results.length - validResults.length,
      avg_caso_ai_score: avgScore,
      results: validResults,
    })

  } catch (err: any) {
    console.error('evaluate-caso error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
