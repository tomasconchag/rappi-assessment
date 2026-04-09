import { describe, it, expect } from 'vitest'
import {
  scoreMathSpreadsheet,
  type SpreadsheetVersion,
  type SpreadsheetAnswer,
} from '../mathSpreadsheetTemplates'

// ── Minimal mock template with 5 numeric questions ─────────────────────────
const mockTemplate: SpreadsheetVersion = {
  version: 'A',
  cells: [],
  answerCells: [
    { r: 5,  c: 2, expected: 1000,  questionNum: 1, label: 'Ingresos totales',  format: 'currency' },
    { r: 8,  c: 2, expected: 250,   questionNum: 2, label: 'Costo total',       format: 'currency' },
    { r: 11, c: 2, expected: 0.25,  questionNum: 3, label: 'Margen %',          format: 'percent', tolerance: 0.01 },
    { r: 14, c: 2, expected: 750,   questionNum: 4, label: 'Ganancia',          format: 'currency' },
    { r: 17, c: 2, expected: 3,     questionNum: 5, label: 'Ratio',             format: 'number' },
  ],
}

// ── Text question template ──────────────────────────────────────────────────
const textTemplate: SpreadsheetVersion = {
  version: 'A',
  cells: [],
  answerCells: [
    { r: 5, c: 2, expected: 'iguales', questionNum: 1, label: 'Comparación', isText: true },
  ],
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function answersFor(template: SpreadsheetVersion, overrides: Record<number, number | string | null> = {}): SpreadsheetAnswer[] {
  return template.answerCells.map((ac, i) => ({
    r: ac.r,
    c: ac.c,
    value: i in overrides ? overrides[i] : ac.expected,
  }))
}

// ════════════════════════════════════════════════════════════════════════════
describe('scoreMathSpreadsheet', () => {

  // ── Accuracy ───────────────────────────────────────────────────────────────
  describe('accuracy scoring', () => {
    it('returns 100% accuracy when all answers are exactly correct', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate), 0)
      expect(result.correct).toBe(5)
      expect(result.total).toBe(5)
      expect(result.accuracyPct).toBe(100)
    })

    it('returns 0% accuracy when no answers are provided', () => {
      const result = scoreMathSpreadsheet(mockTemplate, [], 0)
      expect(result.correct).toBe(0)
      expect(result.accuracyPct).toBe(0)
    })

    it('returns 60% accuracy when 3 of 5 answers are correct', () => {
      const answers = answersFor(mockTemplate, { 3: 999, 4: 999 }) // last 2 wrong
      const result = scoreMathSpreadsheet(mockTemplate, answers, 0)
      expect(result.correct).toBe(3)
      expect(result.accuracyPct).toBe(60)
    })

    it('accepts answers within default tolerance of 1', () => {
      const answers = answersFor(mockTemplate, { 0: 1000.5 }) // within ±1
      const result = scoreMathSpreadsheet(mockTemplate, answers, 0)
      expect(result.details[0].correct).toBe(true)
    })

    it('rejects answers outside tolerance', () => {
      const answers = answersFor(mockTemplate, { 0: 1002 }) // outside ±1
      const result = scoreMathSpreadsheet(mockTemplate, answers, 0)
      expect(result.details[0].correct).toBe(false)
    })

    it('uses custom tolerance when specified', () => {
      // question 3 has tolerance: 0.01
      const answers = answersFor(mockTemplate, { 2: 0.255 }) // within ±0.01
      const result = scoreMathSpreadsheet(mockTemplate, answers, 0)
      expect(result.details[2].correct).toBe(true)
    })
  })

  // ── Text questions ─────────────────────────────────────────────────────────
  describe('text answer scoring', () => {
    it('matches text answers case-insensitively', () => {
      const answers: SpreadsheetAnswer[] = [{ r: 5, c: 2, value: 'IGUALES' }]
      const result = scoreMathSpreadsheet(textTemplate, answers, 0)
      expect(result.details[0].correct).toBe(true)
    })

    it('matches text answers with leading/trailing spaces', () => {
      const answers: SpreadsheetAnswer[] = [{ r: 5, c: 2, value: '  iguales  ' }]
      const result = scoreMathSpreadsheet(textTemplate, answers, 0)
      expect(result.details[0].correct).toBe(true)
    })

    it('rejects wrong text answers', () => {
      const answers: SpreadsheetAnswer[] = [{ r: 5, c: 2, value: 'diferentes' }]
      const result = scoreMathSpreadsheet(textTemplate, answers, 0)
      expect(result.details[0].correct).toBe(false)
    })

    it('rejects null text answers', () => {
      const answers: SpreadsheetAnswer[] = [{ r: 5, c: 2, value: null }]
      const result = scoreMathSpreadsheet(textTemplate, answers, 0)
      expect(result.details[0].correct).toBe(false)
    })
  })

  // ── Time bonus ────────────────────────────────────────────────────────────
  describe('time bonus (accuracy × 80 + time_remaining × 20)', () => {
    it('returns 80 when all correct but 0 seconds remaining', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate), 0, 600)
      expect(result.pct).toBe(80)
    })

    it('returns 98 when all correct with 90% time remaining (540s of 600)', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate), 540, 600)
      // 100% accuracy × 80 + 90% time × 20 = 80 + 18 = 98
      expect(result.pct).toBe(98)
    })

    it('returns 100 when all correct with full time remaining', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate), 600, 600)
      expect(result.pct).toBe(100)
    })

    it('returns 50 when half correct and half time remaining', () => {
      const answers = answersFor(mockTemplate, { 2: 999, 3: 999, 4: 999 }) // 2 of 5 correct
      const result = scoreMathSpreadsheet(mockTemplate, answers, 300, 600)
      // 40% accuracy × 80 + 50% time × 20 = 32 + 10 = 42
      expect(result.pct).toBe(42)
    })

    it('clamps time ratio to 0 when secsLeft is negative', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate), -100, 600)
      expect(result.pct).toBe(80) // no time bonus, only accuracy
    })

    it('clamps time ratio to 1 when secsLeft exceeds totalSecs', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate), 9999, 600)
      expect(result.pct).toBe(100)
    })

    it('returns 0 when no answers and no time', () => {
      const result = scoreMathSpreadsheet(mockTemplate, [], 0, 600)
      expect(result.pct).toBe(0)
    })

    it('returns 20 when no answers but full time remaining', () => {
      const result = scoreMathSpreadsheet(mockTemplate, [], 600, 600)
      // 0% accuracy × 80 + 100% time × 20 = 0 + 20 = 20
      expect(result.pct).toBe(20)
    })

    it('uses 600s as default totalSecs', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate))
      expect(result.pct).toBe(80) // secsLeft defaults to 0
    })
  })

  // ── Edge cases ────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('handles empty template gracefully', () => {
      const empty: SpreadsheetVersion = { version: 'A', cells: [], answerCells: [] }
      const result = scoreMathSpreadsheet(empty, [], 300, 600)
      expect(result.correct).toBe(0)
      expect(result.total).toBe(0)
      expect(result.accuracyPct).toBe(0)
      expect(result.pct).toBe(10) // 0 accuracy × 80 + 50% time × 20 = 10
    })

    it('handles numeric string answers as numbers', () => {
      const answers: SpreadsheetAnswer[] = answersFor(mockTemplate).map((a, i) =>
        i === 0 ? { ...a, value: '1000' } : a
      )
      const result = scoreMathSpreadsheet(mockTemplate, answers, 0)
      expect(result.details[0].correct).toBe(true)
    })

    it('includes label and expected in details', () => {
      const result = scoreMathSpreadsheet(mockTemplate, answersFor(mockTemplate), 0)
      expect(result.details[0].label).toBe('Ingresos totales')
      expect(result.details[0].expected).toBe('1000')
      expect(result.details[0].q).toBe(1)
    })
  })
})
