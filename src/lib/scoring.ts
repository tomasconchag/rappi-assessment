import type { Question, MathAnswers } from '@/types/assessment'
import type { ProctoringData } from '@/types/proctoring'
import { normalizedWeights, type SectionId } from '@/lib/challenges'

export function scoreMath(questions: Question[], answers: MathAnswers): {
  correct: number
  total: number
  pct: number
  honeypotFails: number
  details: { idx: number; correct: boolean; pointsAwarded: number }[]
} {
  let correct = 0
  let total = 0
  let honeypotFails = 0
  const details: { idx: number; correct: boolean; pointsAwarded: number }[] = []

  questions
    .filter(q => q.section === 'math')
    .sort((a, b) => a.position - b.position)
    .forEach((q, i) => {
      const idx = i
      const raw = (answers[idx] || '').toString().replace(/[\s.$]/g, '').toLowerCase()

      if (q.is_honeypot) {
        const honeypotExpected = (q.correct_answer || '').replace(/[\s.]/g, '').toLowerCase()
        const honeypotCorrect = raw === honeypotExpected
        if (!honeypotCorrect) honeypotFails++
        // Honeypots never award points but is_correct reflects whether the answer matched
        details.push({ idx, correct: honeypotCorrect, pointsAwarded: 0 })
        return
      }

      total += q.points
      const expected = (q.correct_answer || '').replace(/[\s.]/g, '').toLowerCase()

      let isCorrect = false
      if (q.question_type === 'multiple_choice') {
        isCorrect = raw === expected
      } else if (q.is_flex_answer) {
        isCorrect = raw.includes('500') && raw.includes('300')
      } else if (raw === expected) {
        isCorrect = true
      } else {
        const nA = parseFloat(raw.replace(/[^0-9.-]/g, ''))
        const nE = parseFloat(expected.replace(/[^0-9.-]/g, ''))
        if (!isNaN(nA) && !isNaN(nE) && Math.abs(nA - nE) < 0.5) isCorrect = true
      }

      if (isCorrect) correct += q.points
      details.push({ idx, correct: isCorrect, pointsAwarded: isCorrect ? q.points : 0 })
    })

  return { correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0, honeypotFails, details }
}

export function scoreCaso(answers: Record<string, string>, total = 4): { answered: number; pct: number } {
  const answered = Object.values(answers).filter(v => v && v.length > 15).length
  return { answered, pct: Math.round((answered / total) * 100) }
}

export function calcOverall(
  hasVideo: boolean,
  casoS: number,
  mathS: number,
  enabledSections?: SectionId[]
): number {
  const enabled = enabledSections ?? ['sharktank', 'caso', 'math']
  const w = normalizedWeights(enabled)
  return Math.round(
    (w.sharktank / 100) * (hasVideo ? 100 : 0) +
    (w.caso / 100) * casoS +
    (w.math / 100) * mathS
  )
}

export function fraudScore(data: Pick<ProctoringData, 'tab_out_count' | 'paste_attempts' | 'copy_attempts' | 'fs_exit_count' | 'honeypot_fails' | 'rclick_count' | 'key_block_count' | 'screenshot_attempts'>): number {
  let s = 0
  if (data.tab_out_count >= 3) s += 2; else if (data.tab_out_count >= 1) s += 1
  if (data.paste_attempts >= 1) s += 3
  if (data.copy_attempts >= 1) s += 1
  if (data.fs_exit_count >= 3) s += 2; else if (data.fs_exit_count >= 1) s += 1
  if (data.honeypot_fails >= 1) s += 3
  if (data.rclick_count >= 3) s += 1
  if (data.key_block_count >= 5) s += 1
  if (data.screenshot_attempts >= 2) s += 2; else if (data.screenshot_attempts >= 1) s += 1
  return s
}

export function fraudLevel(score: number): 'Confiable' | 'Riesgo Medio' | 'Alta Probabilidad de Fraude' {
  if (score <= 2) return 'Confiable'
  if (score <= 5) return 'Riesgo Medio'
  return 'Alta Probabilidad de Fraude'
}

export function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('es-CO')
}

export function fmtTime(s: number): string {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}
