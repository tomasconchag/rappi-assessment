import { describe, it, expect } from 'vitest'
import { scoreMath, scoreCaso, calcOverall, fraudScore, fraudLevel } from '../scoring'
import { normalizedWeights } from '@/lib/challenges'
import type { Question } from '@/types/assessment'

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeQ(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    section: 'math',
    position: 0,
    content: '2 + 2 = ?',
    sub_label: null,
    placeholder: null,
    time_seconds: 60,
    difficulty: 'easy',
    points: 10,
    correct_answer: '4',
    is_honeypot: false,
    is_flex_answer: false,
    show_data: false,
    question_type: 'free_text',
    ...overrides,
  }
}

// ════════════════════════════════════════════════════════════════════════════
describe('scoreMath', () => {

  describe('basic scoring', () => {
    it('awards full points for a correct answer', () => {
      const questions = [makeQ({ position: 0, points: 10, correct_answer: '4' })]
      const result = scoreMath(questions, { 0: '4' })
      expect(result.correct).toBe(10)
      expect(result.total).toBe(10)
      expect(result.pct).toBe(100)
    })

    it('awards 0 for a wrong answer', () => {
      const questions = [makeQ({ position: 0, points: 10, correct_answer: '4' })]
      const result = scoreMath(questions, { 0: '5' })
      expect(result.correct).toBe(0)
      expect(result.pct).toBe(0)
    })

    it('returns 0% when no answers provided', () => {
      const questions = [makeQ({ position: 0, points: 10, correct_answer: '4' })]
      const result = scoreMath(questions, {})
      expect(result.correct).toBe(0)
      expect(result.pct).toBe(0)
    })

    it('scores multiple questions independently', () => {
      const questions = [
        makeQ({ position: 0, points: 10, correct_answer: '4' }),
        makeQ({ id: 'q2', position: 1, points: 20, correct_answer: '8' }),
        makeQ({ id: 'q3', position: 2, points: 15, correct_answer: '16' }),
      ]
      const result = scoreMath(questions, { 0: '4', 1: '9', 2: '16' })
      expect(result.correct).toBe(25) // q1 + q3
      expect(result.total).toBe(45)
      expect(result.pct).toBe(56) // round(25/45*100)
    })

    it('handles empty question list', () => {
      const result = scoreMath([], {})
      expect(result.correct).toBe(0)
      expect(result.total).toBe(0)
      expect(result.pct).toBe(0)
    })
  })

  describe('answer normalization', () => {
    it('strips whitespace from answers', () => {
      const questions = [makeQ({ correct_answer: '1000' })]
      const result = scoreMath(questions, { 0: ' 1000 ' })
      expect(result.details[0].correct).toBe(true)
    })

    it('strips $ and . separators from answers', () => {
      const questions = [makeQ({ correct_answer: '1000' })]
      const result = scoreMath(questions, { 0: '$1.000' })
      expect(result.details[0].correct).toBe(true)
    })

    it('is case-insensitive', () => {
      const questions = [makeQ({ correct_answer: 'verdadero' })]
      const result = scoreMath(questions, { 0: 'VERDADERO' })
      expect(result.details[0].correct).toBe(true)
    })

    it('note: period is stripped from answers, so 100.4 becomes 1004 (not within ±0.5 of 100)', () => {
      // The normalizer strips '.', so "100.4" → "1004", which fails
      const questions = [makeQ({ correct_answer: '100' })]
      const result = scoreMath(questions, { 0: '100.4' })
      expect(result.details[0].correct).toBe(false)
    })

    it('rejects answers outside tolerance of ±0.5 (e.g. off by 1)', () => {
      const questions = [makeQ({ correct_answer: '100' })]
      const result = scoreMath(questions, { 0: '101' })
      expect(result.details[0].correct).toBe(false)
    })
  })

  describe('multiple_choice questions', () => {
    it('accepts exact match for multiple_choice', () => {
      const questions = [makeQ({ correct_answer: 'b', question_type: 'multiple_choice' })]
      const result = scoreMath(questions, { 0: 'b' })
      expect(result.details[0].correct).toBe(true)
    })

    it('rejects near-match for multiple_choice (no numeric tolerance)', () => {
      const questions = [makeQ({ correct_answer: 'b', question_type: 'multiple_choice' })]
      const result = scoreMath(questions, { 0: 'c' })
      expect(result.details[0].correct).toBe(false)
    })
  })

  describe('honeypot questions', () => {
    it('does NOT award points for a correct honeypot answer', () => {
      const questions = [makeQ({ is_honeypot: true, correct_answer: '99', points: 10 })]
      const result = scoreMath(questions, { 0: '99' })
      expect(result.details[0].correct).toBe(true)
      expect(result.details[0].pointsAwarded).toBe(0)
      expect(result.total).toBe(0) // honeypot not counted in total
      expect(result.correct).toBe(0)
    })

    it('increments honeypotFails when answer is wrong', () => {
      const questions = [makeQ({ is_honeypot: true, correct_answer: '99' })]
      const result = scoreMath(questions, { 0: '0' })
      expect(result.honeypotFails).toBe(1)
    })

    it('does not increment honeypotFails when answer is correct', () => {
      const questions = [makeQ({ is_honeypot: true, correct_answer: '99' })]
      const result = scoreMath(questions, { 0: '99' })
      expect(result.honeypotFails).toBe(0)
    })
  })

  describe('flex answer questions', () => {
    it('accepts answer containing both 500 and 300', () => {
      const questions = [makeQ({ is_flex_answer: true, correct_answer: '500 y 300' })]
      const result = scoreMath(questions, { 0: 'el valor es 500 y también 300' })
      expect(result.details[0].correct).toBe(true)
    })

    it('rejects answer missing 300', () => {
      const questions = [makeQ({ is_flex_answer: true, correct_answer: '500 y 300' })]
      const result = scoreMath(questions, { 0: '500' })
      expect(result.details[0].correct).toBe(false)
    })
  })

  describe('only scores math section questions', () => {
    it('ignores caso section questions', () => {
      const questions = [
        makeQ({ section: 'caso', position: 0, points: 50, correct_answer: 'cualquier cosa' }),
        makeQ({ section: 'math', position: 0, points: 10, correct_answer: '4' }),
      ]
      const result = scoreMath(questions, { 0: '4' })
      expect(result.total).toBe(10) // only the math question
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
describe('scoreCaso', () => {
  it('returns 100% when all answers have >15 chars', () => {
    const answers = {
      q1: 'Esta es una respuesta larga',
      q2: 'Otra respuesta detallada aqui',
      q3: 'Tercer respuesta con contenido',
      q4: 'Cuarta respuesta con suficiente texto',
    }
    const result = scoreCaso(answers)
    expect(result.answered).toBe(4)
    expect(result.pct).toBe(100)
  })

  it('returns 0% when all answers are empty', () => {
    const result = scoreCaso({ q1: '', q2: '', q3: '', q4: '' })
    expect(result.answered).toBe(0)
    expect(result.pct).toBe(0)
  })

  it('returns 50% when 2 of 4 answers have >15 chars', () => {
    const result = scoreCaso({
      q1: 'Esta es una respuesta larga',
      q2: 'Otra respuesta detallada',
      q3: 'corto',
      q4: '',
    })
    expect(result.answered).toBe(2)
    expect(result.pct).toBe(50)
  })

  it('excludes answers with exactly 15 chars (needs >15)', () => {
    const result = scoreCaso({ q1: '123456789012345' }) // exactly 15 chars
    expect(result.answered).toBe(0)
  })

  it('accepts answers with 16 chars', () => {
    const result = scoreCaso({ q1: '1234567890123456' }) // 16 chars
    expect(result.answered).toBe(1)
  })

  it('uses custom total when specified', () => {
    const result = scoreCaso({ q1: 'Esta es una respuesta larga' }, 2)
    expect(result.pct).toBe(50)
  })
})

// ════════════════════════════════════════════════════════════════════════════
describe('calcOverall', () => {
  it('returns weighted average for all 3 sections (sharktank=35, caso=40, math=25 → normalized)', () => {
    // Default enabled: sharktank, caso, math → weights 35,40,25 → total=100
    // hasVideo=true(100), casoS=80, mathS=60
    // = 35*1 + 40*0.80 + 25*0.60 = 35 + 32 + 15 = 82
    const result = calcOverall(true, 80, 60)
    expect(result).toBe(82)
  })

  it('returns 0 for sharktank when hasVideo=false', () => {
    const result = calcOverall(false, 0, 0)
    expect(result).toBe(0)
  })

  it('gives 100 when all sections are perfect', () => {
    const result = calcOverall(true, 100, 100)
    expect(result).toBe(100)
  })

  it('respects custom enabled sections', () => {
    // Only caso and math → weights 40,25 → total=65 → normalized: caso=62, math=38
    const result = calcOverall(false, 100, 100, ['caso', 'math'])
    expect(result).toBe(100)
  })

  it('handles solo math section', () => {
    const result = calcOverall(false, 0, 80, ['math'])
    expect(result).toBe(80)
  })
})

// ════════════════════════════════════════════════════════════════════════════
describe('fraudScore', () => {
  const clean = {
    tab_out_count: 0,
    paste_attempts: 0,
    copy_attempts: 0,
    fs_exit_count: 0,
    honeypot_fails: 0,
    rclick_count: 0,
    key_block_count: 0,
    screenshot_attempts: 0,
    window_blur_count: 0,
  }

  it('returns 0 for a clean session', () => {
    expect(fraudScore(clean)).toBe(0)
  })

  it('adds 3 for a paste attempt', () => {
    expect(fraudScore({ ...clean, paste_attempts: 1 })).toBe(3)
  })

  it('adds 3 for honeypot_fails >= 1', () => {
    expect(fraudScore({ ...clean, honeypot_fails: 1 })).toBe(3)
  })

  it('adds 1 for tab_out_count = 1', () => {
    expect(fraudScore({ ...clean, tab_out_count: 1 })).toBe(1)
  })

  it('adds 2 for tab_out_count >= 3', () => {
    expect(fraudScore({ ...clean, tab_out_count: 3 })).toBe(2)
  })

  it('adds 1 for fs_exit_count = 1', () => {
    expect(fraudScore({ ...clean, fs_exit_count: 1 })).toBe(1)
  })

  it('adds 2 for fs_exit_count >= 3', () => {
    expect(fraudScore({ ...clean, fs_exit_count: 3 })).toBe(2)
  })

  it('adds 1 for copy_attempts >= 1', () => {
    expect(fraudScore({ ...clean, copy_attempts: 1 })).toBe(1)
  })

  it('adds 1 for window_blur_count = 1', () => {
    expect(fraudScore({ ...clean, window_blur_count: 1 })).toBe(1)
  })

  it('adds 2 for window_blur_count >= 3', () => {
    expect(fraudScore({ ...clean, window_blur_count: 3 })).toBe(2)
  })

  it('adds 2 for screenshot_attempts >= 2', () => {
    expect(fraudScore({ ...clean, screenshot_attempts: 2 })).toBe(2)
  })

  it('adds 1 for screenshot_attempts = 1', () => {
    expect(fraudScore({ ...clean, screenshot_attempts: 1 })).toBe(1)
  })

  it('adds 1 for rclick_count >= 3', () => {
    expect(fraudScore({ ...clean, rclick_count: 3 })).toBe(1)
  })

  it('accumulates score across multiple signals', () => {
    const result = fraudScore({
      ...clean,
      paste_attempts: 1,   // +3
      honeypot_fails: 1,   // +3
      tab_out_count: 3,    // +2
    })
    expect(result).toBe(8)
  })
})

// ════════════════════════════════════════════════════════════════════════════
describe('fraudLevel', () => {
  it('returns Confiable for score 0', () => {
    expect(fraudLevel(0)).toBe('Confiable')
  })

  it('returns Confiable for score 2', () => {
    expect(fraudLevel(2)).toBe('Confiable')
  })

  it('returns Riesgo Medio for score 3', () => {
    expect(fraudLevel(3)).toBe('Riesgo Medio')
  })

  it('returns Riesgo Medio for score 5', () => {
    expect(fraudLevel(5)).toBe('Riesgo Medio')
  })

  it('returns Alta Probabilidad de Fraude for score 6', () => {
    expect(fraudLevel(6)).toBe('Alta Probabilidad de Fraude')
  })

  it('returns Alta Probabilidad de Fraude for high score', () => {
    expect(fraudLevel(20)).toBe('Alta Probabilidad de Fraude')
  })
})

// ════════════════════════════════════════════════════════════════════════════
describe('normalizedWeights', () => {
  it('all 4 sections sum to ~100 (within ±1 due to rounding)', () => {
    const w = normalizedWeights(['sharktank', 'roleplay', 'caso', 'math'])
    const sum = w.sharktank + w.roleplay + w.caso + w.math
    expect(sum).toBeGreaterThanOrEqual(99)
    expect(sum).toBeLessThanOrEqual(101)
  })

  it('disabled sections get weight 0', () => {
    const w = normalizedWeights(['caso', 'math'])
    expect(w.sharktank).toBe(0)
    expect(w.roleplay).toBe(0)
  })

  it('solo section gets weight 100', () => {
    const w = normalizedWeights(['caso'])
    expect(w.caso).toBe(100)
  })

  it('returns all zeros for empty enabled list', () => {
    const w = normalizedWeights([])
    expect(w.sharktank + w.roleplay + w.caso + w.math).toBe(0)
  })

  it('respects custom weights', () => {
    const w = normalizedWeights(['caso', 'math'], { caso: 50, math: 50 })
    expect(w.caso).toBe(50)
    expect(w.math).toBe(50)
  })

  it('normalizes unequal custom weights', () => {
    const w = normalizedWeights(['caso', 'math'], { caso: 75, math: 25 })
    expect(w.caso).toBe(75)
    expect(w.math).toBe(25)
  })
})
