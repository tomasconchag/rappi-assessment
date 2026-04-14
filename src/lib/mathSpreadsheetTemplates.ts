/**
 * Math spreadsheet templates for Version A and B.
 * Row/col indexes are 0-based (Excel row 1 = r=0, column A = c=0).
 * Column mapping: A=0 B=1 C=2 D=3 E=4 F=5 G=6 H=7 I=8 J=9
 *
 * Answer cells are where candidates type their formulas.
 * Expected values are used for auto-grading.
 */

export type CellDef = {
  r: number
  c: number
  v: string | number
  formula?: string        // displayed formula (e.g. "=F5*3") — shown in cell, evaluated by FortuneSheet
  locked?: boolean
  bg?: string            // hex background color
  bold?: boolean
  italic?: boolean
  format?: 'currency' | 'percent' | 'number' | 'decimal'
  align?: 'left' | 'center' | 'right'
  color?: string
  tall?: boolean          // allow row to grow in height (used for question labels with long text)
}

export type AnswerCell = {
  r: number
  c: number
  expected: number | string
  tolerance?: number      // allowed numeric error (default 1)
  isText?: boolean
  questionNum: number
  label: string
  format?: 'currency' | 'percent' | 'number' | 'decimal' | 'text'
}

export type QuestionSummary = {
  num: number
  text: string            // the question wording
  expectedValue: number | string
  expectedDisplay: string // formatted: "$72,000", "25%", "15", "3.5", "Iguales"
  answerR: number
  answerC: number
  topic: string           // e.g. "Ingresos", "Descuento", "Ganancia"
}

export type SpreadsheetVersion = {
  version: 'A' | 'B'
  cells: CellDef[]
  answerCells: AnswerCell[]
}

// ─── Colour palette ────────────────────────────────────────────────────────
const BG = {
  header:   '#1e1e2e',   // section header rows
  data:     '#16213E',   // pre-filled data cells (locked)
  orange:   '#2d2010',   // helper / given data (orange tone)
  answer:   '#221500',   // answer cells (amber dark, editable)
  label:    '#12122a',   // question text rows
  subhead:  '#0d1117',   // sub-table headers
}

const COL = {
  muted:  '#8888aa',
  dim:    '#aaaacc',
  text:   '#e8e8ff',
  accent: '#f59e0b',   // answer cell accent — gold/amber
  orange: '#f0ac60',
  green:  '#00d68a',
  gold:   '#f59e0b',
}

// ─── Shared restaurant menu (same in both versions) ──────────────────────
function menuCells(): CellDef[] {
  return [
    // ── Section header ──
    { r: 0, c: 4, v: 'DATOS DEL RESTAURANTE', bold: true, color: COL.accent, bg: BG.header, align: 'left' },
    { r: 1, c: 4, v: 'Producto',              bold: true, color: COL.dim,    bg: BG.header, align: 'left' },
    { r: 1, c: 5, v: 'Precio de venta',       bold: true, color: COL.dim,    bg: BG.header, align: 'center' },
    { r: 1, c: 6, v: 'Costo de producción',   bold: true, color: COL.dim,    bg: BG.header, align: 'center' },
    { r: 1, c: 7, v: 'Nota: Ganancias = Ingresos − Costos', italic: true, color: COL.muted, bg: BG.header, align: 'left' },

    // ── Menu items ──
    { r: 2, c: 4, v: 'Hamburguesa',    bg: BG.data, color: COL.text, locked: true },
    { r: 2, c: 5, v: 18000,            bg: BG.data, color: COL.text, locked: true, format: 'currency' },
    { r: 2, c: 6, v: 5400,             bg: BG.data, color: COL.text, locked: true, format: 'currency' },

    { r: 3, c: 4, v: 'Perro caliente', bg: BG.data, color: COL.text, locked: true },
    { r: 3, c: 5, v: 15000,            bg: BG.data, color: COL.text, locked: true, format: 'currency' },
    { r: 3, c: 6, v: 4500,             bg: BG.data, color: COL.text, locked: true, format: 'currency' },

    { r: 4, c: 4, v: 'Porción Pizza',  bg: BG.data, color: COL.text, locked: true },
    { r: 4, c: 5, v: 8000,             bg: BG.data, color: COL.text, locked: true, format: 'currency' },
    { r: 4, c: 6, v: 2400,             bg: BG.data, color: COL.text, locked: true, format: 'currency' },

    { r: 5, c: 4, v: 'Lasaña',         bg: BG.data, color: COL.text, locked: true },
    { r: 5, c: 5, v: 20000,            bg: BG.data, color: COL.text, locked: true, format: 'currency' },
    { r: 5, c: 6, v: 6000,             bg: BG.data, color: COL.text, locked: true, format: 'currency' },
  ]
}

// ─── Question label helper ────────────────────────────────────────────────
function qLabel(r: number, text: string): CellDef {
  return { r, c: 4, v: text, bg: BG.label, color: COL.dim, locked: true, tall: true }
}

// ─── Answer cell helper ───────────────────────────────────────────────────
function answerCell(r: number, c: number): CellDef {
  return { r, c, v: '', bg: BG.answer, color: COL.accent, locked: false }
}

// ─── Q8 Weighted average (shared structure, different grades) ─────────────
// NOTE: starts at row 28 so it doesn't conflict with Q7's answer cell at row 27
function q8Cells(grades: number[]): CellDef[] {
  const courses = [
    'Tácticas de ventas',
    'Comercio electrónico',
    'Matemática financiera',
    'Marketing digital',
    'Trabajo de grado',
  ]
  const weights = [0.30, 0.20, 0.15, 0.20, 0.15]

  const cells: CellDef[] = [
    qLabel(28, '8. Estás cursando un diplomado en ventas. Para graduarte necesitas promedio mínimo de 3,5. ¿Pasaste?'),
    { r: 29, c: 4, v: 'Materia',            bold: true, bg: BG.subhead, color: COL.dim, locked: true },
    { r: 29, c: 5, v: 'Peso nota final',    bold: true, bg: BG.subhead, color: COL.dim, locked: true, align: 'center' },
    { r: 29, c: 6, v: 'Calificación',       bold: true, bg: BG.subhead, color: COL.dim, locked: true, align: 'center' },
    { r: 29, c: 7, v: 'Ponderado',          bold: true, bg: BG.subhead, color: COL.dim, locked: true, align: 'center' },
  ]

  courses.forEach((course, i) => {
    const row = 30 + i  // rows 30–34
    cells.push(
      { r: row, c: 4, v: course,      bg: BG.data,   color: COL.text,   locked: true },
      { r: row, c: 5, v: weights[i],  bg: BG.data,   color: COL.orange, locked: true, format: 'percent' },
      { r: row, c: 6, v: grades[i],   bg: BG.data,   color: COL.orange, locked: true, format: 'decimal' },
      answerCell(row, 7),  // candidate must calculate: Peso × Calificación
    )
  })

  // Answer row — candidate writes the final weighted average
  cells.push(
    { r: 35, c: 4, v: '→ Promedio ponderado (escribe tu resultado):', bold: true, bg: BG.label, color: COL.dim, locked: true },
    answerCell(35, 8),
  )
  return cells
}

// ─── Q9 Rentabilidad (shared structure) ───────────────────────────────────
// NOTE: starts at row 37 (Q8 ends at row 35, one blank gap)
function q9Cells(): CellDef[] {
  return [
    qLabel(37, '9. Las ventas del negocio A son $2.000.000/semana y del B $4.000.000. La rentabilidad de A es 20% y la de B 10%. ¿Cuál ganó más?'),
    { r: 38, c: 4, v: '',            bg: BG.data, locked: true },
    { r: 38, c: 5, v: 'Negocio A',   bold: true, bg: BG.subhead, color: COL.dim, locked: true, align: 'center' },
    { r: 38, c: 6, v: 'Negocio B',   bold: true, bg: BG.subhead, color: COL.dim, locked: true, align: 'center' },
    { r: 39, c: 4, v: 'Ventas semanales', bg: BG.data, color: COL.text, locked: true },
    { r: 39, c: 5, v: 2000000, bg: BG.data, color: COL.orange, locked: true, format: 'currency' },
    { r: 39, c: 6, v: 4000000, bg: BG.data, color: COL.orange, locked: true, format: 'currency' },
    { r: 40, c: 4, v: 'Rentabilidad', bg: BG.data, color: COL.text, locked: true },
    { r: 40, c: 5, v: 0.20, bg: BG.data, color: COL.orange, locked: true, format: 'percent' },
    { r: 40, c: 6, v: 0.10, bg: BG.data, color: COL.orange, locked: true, format: 'percent' },
    { r: 41, c: 4, v: 'Ganancia', bg: BG.data, color: COL.text, locked: true },
    answerCell(41, 5),  // candidate calculates: Ventas A × Rentabilidad A
    answerCell(41, 6),  // candidate calculates: Ventas B × Rentabilidad B
    { r: 42, c: 4, v: '→ ¿Cuál ganó más? Escribe: Iguales / Negocio A / Negocio B', bold: true, bg: BG.label, color: COL.dim, locked: true },
    answerCell(42, 5),
  ]
}

// ─────────────────────────────────────────────────────────────────────────
//  VERSION A
// ─────────────────────────────────────────────────────────────────────────
export const VERSION_A: SpreadsheetVersion = {
  version: 'A',
  cells: [
    ...menuCells(),

    // ── Section divider ──
    { r: 7, c: 4, v: 'PREGUNTAS — escribe tus respuestas en las celdas amarillas', bold: true, color: COL.accent, bg: BG.header, align: 'left' },

    // Q1
    qLabel(8,  '1. ¿Si vendieras 4 hamburguesas, de cuánto serían tus ingresos?'),
    answerCell(9, 4),

    // Q2
    qLabel(11, '2. ¿Cuál sería el valor de un perro caliente si hicieras un 20% de descuento?'),
    answerCell(12, 4),

    // Q3
    qLabel(14, '3. Si vendieras una hamburguesa, un perro caliente y una pizza, ¿de cuánto serían tus ingresos?'),
    answerCell(15, 4),

    // Q4
    qLabel(17, '4. Si hicieras un descuento del 30% en lasañas, ¿cuánto cobrarías si un cliente compra una lasaña y un perro caliente?'),
    answerCell(18, 4),

    // Q5 — given data + answer
    qLabel(20, '5. Si vendes 3 pizzas en $18.000 COP, ¿de cuánto es el descuento (%) que estás haciendo?'),
    { r: 21, c: 4, v: 'Cantidad vendida:',       bg: BG.data, color: COL.muted, locked: true },
    { r: 21, c: 5, v: 1,                          bg: BG.orange, color: COL.orange, locked: true },
    { r: 21, c: 6, v: 'Precio sin descuento (3 pizzas):', bg: BG.data, color: COL.muted, locked: true },
    { r: 21, c: 7, v: 24000, formula: '=F5*3',   bg: BG.orange, color: COL.orange, locked: true, format: 'currency' },
    { r: 22, c: 4, v: 'Precio con descuento (total 3 pizzas):', bg: BG.data, color: COL.muted, locked: true },
    { r: 22, c: 5, v: 18000,                      bg: BG.orange, color: COL.orange, locked: true, format: 'currency' },
    { r: 22, c: 6, v: '→ Descuento %:',           bold: true, bg: BG.label, color: COL.dim, locked: true },
    answerCell(22, 7),

    // Q6
    qLabel(24, '6. Si vendieras 3 perros calientes y 2 hamburguesas, ¿cuánto ganarías?'),
    answerCell(25, 4),

    // Q7
    qLabel(26, '7. Eres un Farmer con meta de llamar 300 restaurantes al mes. Trabajas 20 días hábiles. ¿Cuántos debes llamar diariamente?'),
    answerCell(27, 4),  // note: Q7 answer shares row with Q6 label — offset by 1

    // Q8
    ...q8Cells([3.5, 3.2, 3.3, 3.2, 4.5]),

    // Q9
    ...q9Cells(),
  ],
  answerCells: [
    { r: 9,  c: 4, expected: 72000,     questionNum: 1, label: 'Ingresos 4 hamburguesas',         format: 'currency' },
    { r: 12, c: 4, expected: 12000,     questionNum: 2, label: 'Precio con 20% descuento',        format: 'currency' },
    { r: 15, c: 4, expected: 41000,     questionNum: 3, label: 'Ingresos burger+perro+pizza',     format: 'currency' },
    { r: 18, c: 4, expected: 29000,     questionNum: 4, label: 'Lasaña 30% desc + perro caliente', format: 'currency' },
    { r: 22, c: 7, expected: 0.25,      questionNum: 5, label: 'Descuento % pizzas',              format: 'percent',  tolerance: 0.001 },
    { r: 25, c: 4, expected: 56700,     questionNum: 6, label: 'Ganancia 3 perros + 2 burgers',   format: 'currency' },
    { r: 27, c: 4, expected: 15,        questionNum: 7, label: 'Llamadas diarias',                format: 'number' },
    { r: 35, c: 8, expected: 3.5,       questionNum: 8, label: 'Promedio ponderado',              format: 'decimal',  tolerance: 0.05 },
    { r: 42, c: 5, expected: 'Iguales', questionNum: 9, label: '¿Cuál negocio ganó más?',        format: 'text',     isText: true },
  ],
}

// ─────────────────────────────────────────────────────────────────────────
//  VERSION B  (misma estructura, datos distintos)
// ─────────────────────────────────────────────────────────────────────────
export const VERSION_B: SpreadsheetVersion = {
  version: 'B',
  cells: [
    ...menuCells(),

    { r: 7, c: 4, v: 'PREGUNTAS — escribe tus respuestas en las celdas amarillas', bold: true, color: COL.accent, bg: BG.header, align: 'left' },

    // Q1 — 3 hamburguesas
    qLabel(8,  '1. ¿Si vendieras 3 hamburguesas, de cuánto serían tus ingresos?'),
    answerCell(9, 4),

    // Q2 — 30% descuento
    qLabel(11, '2. ¿Cuál sería el valor de un perro caliente si hicieras un 30% de descuento?'),
    answerCell(12, 4),

    // Q3 — igual
    qLabel(14, '3. Si vendieras una hamburguesa, un perro caliente y una pizza, ¿de cuánto serían tus ingresos?'),
    answerCell(15, 4),

    // Q4 — 20% lasaña
    qLabel(17, '4. Si hicieras un descuento del 20% en lasañas, ¿cuánto cobrarías si un cliente compra una lasaña y un perro caliente?'),
    answerCell(18, 4),

    // Q5 — $16.800
    qLabel(20, '5. Si vendes 3 pizzas en $16.800 COP, ¿de cuánto es el descuento (%) que estás haciendo?'),
    { r: 21, c: 4, v: 'Cantidad vendida:',       bg: BG.data, color: COL.muted, locked: true },
    { r: 21, c: 5, v: 1,                          bg: BG.orange, color: COL.orange, locked: true },
    { r: 21, c: 6, v: 'Precio sin descuento (3 pizzas):', bg: BG.data, color: COL.muted, locked: true },
    { r: 21, c: 7, v: 24000, formula: '=F5*3',   bg: BG.orange, color: COL.orange, locked: true, format: 'currency' },
    { r: 22, c: 4, v: 'Precio con descuento (total 3 pizzas):', bg: BG.data, color: COL.muted, locked: true },
    { r: 22, c: 5, v: 16800,                      bg: BG.orange, color: COL.orange, locked: true, format: 'currency' },
    { r: 22, c: 6, v: '→ Descuento %:',           bold: true, bg: BG.label, color: COL.dim, locked: true },
    answerCell(22, 7),

    // Q6 — 4 burgers
    qLabel(24, '6. Si vendieras 3 perros calientes y 4 hamburguesas, ¿cuánto ganarías?'),
    answerCell(25, 4),

    // Q7 — 25 días
    qLabel(26, '7. Eres un Farmer con meta de llamar 300 restaurantes al mes. Trabajas 25 días hábiles. ¿Cuántos debes llamar diariamente?'),
    answerCell(27, 4),

    // Q8 — different grades
    ...q8Cells([3.7, 3.0, 4.8, 2.9, 4.6]),

    // Q9 — igual
    ...q9Cells(),
  ],
  answerCells: [
    { r: 9,  c: 4, expected: 54000,     questionNum: 1, label: 'Ingresos 3 hamburguesas',         format: 'currency' },
    { r: 12, c: 4, expected: 10500,     questionNum: 2, label: 'Precio con 30% descuento',        format: 'currency' },
    { r: 15, c: 4, expected: 41000,     questionNum: 3, label: 'Ingresos burger+perro+pizza',     format: 'currency' },
    { r: 18, c: 4, expected: 31000,     questionNum: 4, label: 'Lasaña 20% desc + perro caliente', format: 'currency' },
    { r: 22, c: 7, expected: 0.30,      questionNum: 5, label: 'Descuento % pizzas',              format: 'percent',  tolerance: 0.001 },
    { r: 25, c: 4, expected: 81900,     questionNum: 6, label: 'Ganancia 3 perros + 4 burgers',   format: 'currency' },
    { r: 27, c: 4, expected: 12,        questionNum: 7, label: 'Llamadas diarias',                format: 'number' },
    { r: 35, c: 8, expected: 3.655,     questionNum: 8, label: 'Promedio ponderado',              format: 'decimal',  tolerance: 0.05 },
    { r: 42, c: 5, expected: 'Iguales', questionNum: 9, label: '¿Cuál negocio ganó más?',        format: 'text',     isText: true },
  ],
}

export function getQuestionList(version: 'A' | 'B'): QuestionSummary[] {
  const tmpl = version === 'A' ? VERSION_A : VERSION_B

  const topics = [
    'Ingresos',
    'Descuento',
    'Suma de ingresos',
    'Descuento + suma',
    '% Descuento',
    'Ganancia',
    'Regla de 3',
    'Prom. ponderado',
    'Rentabilidad',
  ]

  return tmpl.answerCells.map((ac, i) => {
    // Find the question label cell — locked cell in col 4 near this row
    const labelCell = tmpl.cells.find(c =>
      c.c === 4 && c.locked && typeof c.v === 'string' &&
      (c.v as string).startsWith(`${ac.questionNum}.`)
    )

    const text = labelCell ? String(labelCell.v) : `Pregunta ${ac.questionNum}`

    // Format expected value
    let expectedDisplay = String(ac.expected)
    if (ac.format === 'currency') {
      expectedDisplay = `$${Number(ac.expected).toLocaleString('es-CO')}`
    } else if (ac.format === 'percent') {
      expectedDisplay = `${Math.round(Number(ac.expected) * 100)}%`
    } else if (ac.format === 'decimal') {
      expectedDisplay = Number(ac.expected).toFixed(2)
    } else if (ac.format === 'number') {
      expectedDisplay = String(ac.expected)
    }

    return {
      num: ac.questionNum,
      text: text.replace(/^\d+\.\s*/, ''), // strip "1. " prefix
      expectedValue: ac.expected,
      expectedDisplay,
      answerR: ac.r,
      answerC: ac.c,
      topic: topics[i] ?? `Q${ac.questionNum}`,
    }
  })
}

export function getSpreadsheetVersion(version: 'A' | 'B'): SpreadsheetVersion {
  return version === 'A' ? VERSION_A : VERSION_B
}

export function randomVersion(): 'A' | 'B' {
  return Math.random() < 0.5 ? 'A' : 'B'
}

// ─── Scoring ──────────────────────────────────────────────────────────────
export type SpreadsheetAnswer = { r: number; c: number; value: number | string | null }

/**
 * Score the spreadsheet with time bonus.
 *
 * Formula:  final = accuracy * 0.80 + time_remaining_ratio * 0.20
 *
 * - accuracy         = correct / total  (0–1)
 * - time_remaining   = secsLeft / totalSecs  (0–1, higher = faster)
 *
 * Examples (8 questions, 10 min total):
 *   All correct, 9 min left  → 80 + 18 = 98%
 *   All correct, 5 min left  → 80 + 10 = 90%
 *   All correct, 0 min left  → 80 +  0 = 80%
 *   Half correct, 5 min left → 40 + 10 = 50%
 */
export function scoreMathSpreadsheet(
  template: SpreadsheetVersion,
  answers: SpreadsheetAnswer[],
  secsLeft = 0,
  totalSecs = 600,
): {
  correct: number; total: number
  accuracyPct: number   // raw % correct (no time factor)
  pct: number           // final time-adjusted score
  details: { q: number; label: string; expected: string; got: string; correct: boolean }[]
} {
  const total = template.answerCells.length
  const details = template.answerCells.map(ac => {
    const ans = answers.find(a => a.r === ac.r && a.c === ac.c)
    const got = ans?.value ?? null

    let correct = false
    if (ac.isText) {
      const gotStr = String(got ?? '').trim().toLowerCase()
      const expStr = String(ac.expected).trim().toLowerCase()
      correct = gotStr === expStr
    } else {
      const gotNum = typeof got === 'number' ? got : parseFloat(String(got ?? ''))
      const expNum = typeof ac.expected === 'number' ? ac.expected : parseFloat(String(ac.expected))
      const tol = ac.tolerance ?? 1
      correct = !isNaN(gotNum) && Math.abs(gotNum - expNum) <= tol
    }

    return {
      q: ac.questionNum,
      label: ac.label,
      expected: String(ac.expected),
      got: String(got ?? ''),
      correct,
    }
  })

  const correct = details.filter(d => d.correct).length
  const accuracyRatio      = total > 0 ? correct / total : 0
  const timeRemainingRatio = totalSecs > 0 ? Math.max(0, Math.min(1, secsLeft / totalSecs)) : 0
  const pct = Math.round(accuracyRatio * 80 + timeRemainingRatio * 20)

  return {
    correct,
    total,
    accuracyPct: Math.round(accuracyRatio * 100),
    pct,
    details,
  }
}
