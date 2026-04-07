'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import type { SpreadsheetVersion, SpreadsheetAnswer, CellDef } from '@/lib/mathSpreadsheetTemplates'

interface Props {
  template: SpreadsheetVersion
  onDone: (answers: SpreadsheetAnswer[]) => void
}

const TIMER_SECONDS = 10 * 60  // 10 minutes

// Play N short beeps using Web Audio API (no external files needed)
function playBeeps(freq: number, count: number, gapMs: number) {
  try {
    const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    for (let i = 0; i < count; i++) {
      const t0   = ctx.currentTime + i * (gapMs / 1000)
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.35, t0)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18)
      osc.start(t0); osc.stop(t0 + 0.18)
    }
    setTimeout(() => ctx.close().catch(() => {}), count * gapMs + 600)
  } catch { /* silently ignore if AudioContext unavailable */ }
}
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const NUM_ROWS = 45
const COL_WIDTHS: Record<number, number> = {
  0: 28, 1: 28, 2: 28, 3: 48, 4: 340, 5: 140, 6: 180, 7: 140, 8: 120, 9: 60,
}
const ROW_HEIGHT = 26
const REF_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']

function fmtCell(v: string | number, format?: CellDef['format']): string {
  if (v === '' || v === null || v === undefined) return ''
  if (format === 'currency') return `$ ${Number(v).toLocaleString('es-CO')}`
  if (format === 'percent')  return `${(Number(v) * 100).toFixed(0)}%`
  if (format === 'decimal')  return Number(v).toFixed(2)
  if (typeof v === 'number') return v.toLocaleString('es-CO')
  return String(v)
}

function cellKey(r: number, c: number) { return `${r}_${c}` }
function isFormulaInput(val: string)   { return val.startsWith('=') || val.startsWith('+') }

/** All unique cell refs in a formula → Map<key, colorIdx> */
function parseRefs(formula: string): Map<string, number> {
  const result = new Map<string, number>()
  if (!isFormulaInput(formula)) return result
  let colorIdx = 0
  for (const m of formula.matchAll(/([A-Ja-j])(\d+)/g)) {
    const c = COLS.indexOf(m[1].toUpperCase())
    const r = parseInt(m[2]) - 1
    if (c < 0 || r < 0 || r >= NUM_ROWS) continue
    const key = cellKey(r, c)
    if (!result.has(key)) { result.set(key, colorIdx % REF_COLORS.length); colorIdx++ }
  }
  return result
}

export function MathSpreadsheetScreen({ template, onDone }: Props) {
  const cellMap = useRef<Map<string, CellDef>>(new Map())
  useEffect(() => {
    const m = new Map<string, CellDef>()
    template.cells.forEach(c => m.set(cellKey(c.r, c.c), c))
    cellMap.current = m
  }, [template])

  // ── Core state ─────────────────────────────────────────────────────────
  const [values, setValues]             = useState<Map<string, string>>(new Map())
  const [active, setActive]             = useState<{ r: number; c: number } | null>(null)
  const [editMode, setEditMode]         = useState(false)
  const [formulaVal, setFormulaVal]     = useState('')
  const [pointHover, setPointHover]     = useState<{ r: number; c: number } | null>(null)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [confirming, setConfirming]     = useState(false)
  const [secsLeft, setSecsLeft]         = useState(TIMER_SECONDS)
  const [timeUp, setTimeUp]             = useState(false)
  // Arrow-key reference navigation (Bug 3)
  const [arrowNavCell, setArrowNavCell] = useState<{ r: number; c: number } | null>(null)
  const arrowNavBase = useRef<string>('') // formula snapshot before arrow nav started

  // Beep milestones: 5 min, 3 min, 1 min
  const beepedRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    // 5 min left → 2 soft beeps | 3 min left → 3 beeps | 1 min left → 4 rapid beeps
    const config: Record<number, [number, number, number]> = {
      300: [880,  2, 300],
      180: [1047, 3, 250],
      60:  [1319, 4, 180],
    }
    const c = config[secsLeft]
    if (c && !beepedRef.current.has(secsLeft)) {
      beepedRef.current.add(secsLeft)
      playBeeps(c[0], c[1], c[2])
    }
  }, [secsLeft])

  // Ref so handleSubmit always sees latest values even when called from timer
  const valuesRef = useRef<Map<string, string>>(new Map())
  useEffect(() => { valuesRef.current = values }, [values])

  // When editMode=true we keep focus inside the cell via inlineCellRef,
  // or inside the formula bar via formulaBarRef. Both sync formulaVal.
  const inlineCellRef  = useRef<HTMLInputElement>(null)
  const formulaBarRef  = useRef<HTMLInputElement>(null)
  const gridRef        = useRef<HTMLDivElement>(null)

  const answerKeys = new Set(template.answerCells.map(a => cellKey(a.r, a.c)))

  // ── Countdown timer ────────────────────────────────────────────────────
  const handleSubmitRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    const interval = setInterval(() => {
      setSecsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimeUp(true)
          setConfirming(false)
          // Auto-submit after a brief moment so the "time up" UI flashes
          setTimeout(() => handleSubmitRef.current?.(), 1500)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Evaluate a formula string ──────────────────────────────────────────
  const evaluate = useCallback((raw: string): string => {
    const s = raw.startsWith('+') ? '=' + raw.slice(1) : raw
    if (!s.startsWith('=')) return raw
    try {
      let expr = s.slice(1).toUpperCase()
      expr = expr.replace(/([A-J])(\d+)/g, (_m, col, row) => {
        const c = COLS.indexOf(col), r = parseInt(row) - 1
        const uv = values.get(cellKey(r, c))
        if (uv && uv !== '') return isFormulaInput(uv) ? '0' : uv
        return String(cellMap.current.get(cellKey(r, c))?.v ?? 0)
      })
      expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, range) => {
        const [sR, eR] = range.split(':')
        if (!eR) return '0'
        const sc = COLS.indexOf(sR[0]), sr = parseInt(sR.slice(1)) - 1
        const ec = COLS.indexOf(eR[0]), er = parseInt(eR.slice(1)) - 1
        let sum = 0
        for (let row = sr; row <= er; row++)
          for (let col = sc; col <= ec; col++) {
            const v = parseFloat(cellMap.current.get(cellKey(row, col))?.v?.toString() ?? '0')
            if (!isNaN(v)) sum += v
          }
        return String(sum)
      })
      expr = expr.replace(/(\d+(?:\.\d+)?)%/g, (_, n) => String(Number(n) / 100))
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${expr})`)()
      if (typeof result === 'number')
        return Number.isInteger(result) ? result.toLocaleString('es-CO') : result.toFixed(4).replace(/\.?0+$/, '')
      return String(result)
    } catch { return '#ERROR' }
  }, [values])

  // ── Display value for any cell ─────────────────────────────────────────
  const getDisplay = useCallback((r: number, c: number): string => {
    const key = cellKey(r, c)
    const uv  = values.get(key)
    if (answerKeys.has(key)) {
      return (uv !== undefined && uv !== '') ? evaluate(uv) : ''
    }
    const def = cellMap.current.get(key)
    if (!def) return ''
    return def.formula ? evaluate(def.formula) : fmtCell(def.v, def.format)
  }, [values, answerKeys, evaluate])

  // ── Commit whatever is in formulaVal into the active cell ──────────────
  const commit = useCallback((moveDir?: 'down' | 'right') => {
    if (!active) return
    const val = formulaVal.trim()
    setValues(prev => { const m = new Map(prev); m.set(cellKey(active.r, active.c), val); return m })
    setEditMode(false)
    setPointHover(null)
    setArrowNavCell(null)

    // Move selection
    const nextR = Math.min(active.r + 1, NUM_ROWS - 1)
    const nextC = Math.min(active.c + 1, COLS.length - 1)
    if (moveDir === 'down') {
      setActive({ r: nextR, c: active.c })
      setFormulaVal(values.get(cellKey(nextR, active.c)) ?? '')
    } else if (moveDir === 'right') {
      setActive({ r: active.r, c: nextC })
      setFormulaVal(values.get(cellKey(active.r, nextC)) ?? '')
    } else {
      gridRef.current?.focus()
    }
  }, [active, formulaVal, values])

  const cancel = useCallback(() => {
    if (!active) return
    setFormulaVal(values.get(cellKey(active.r, active.c)) ?? '')
    setEditMode(false)
    setPointHover(null)
    setArrowNavCell(null)
    gridRef.current?.focus()
  }, [active, values])

  // ── Enter edit mode on an answer cell ─────────────────────────────────
  const enterEdit = useCallback((r: number, c: number, initial?: string, focusBar?: boolean) => {
    setActive({ r, c })
    const cur = initial ?? values.get(cellKey(r, c)) ?? ''
    setFormulaVal(cur)
    setEditMode(true)
    setPointHover(null)
    setTimeout(() => {
      const target = focusBar ? formulaBarRef.current : inlineCellRef.current
      if (target) { target.focus(); target.setSelectionRange(target.value.length, target.value.length) }
    }, 0)
  }, [values])

  // ── Insert cell ref at cursor in whichever input is active ────────────
  const insertRef = useCallback((ref: string) => {
    // Try inline input first, then formula bar
    const inp = (document.activeElement === formulaBarRef.current)
      ? formulaBarRef.current
      : inlineCellRef.current ?? formulaBarRef.current
    if (!inp) return

    const start = inp.selectionStart ?? formulaVal.length
    const end   = inp.selectionEnd   ?? formulaVal.length
    const next  = formulaVal.slice(0, start) + ref + formulaVal.slice(end)
    setFormulaVal(next)
    setTimeout(() => {
      inp.focus()
      const pos = start + ref.length
      inp.setSelectionRange(pos, pos)
    }, 0)
  }, [formulaVal])

  // ── Cell mousedown — the heart of Excel-like interaction ──────────────
  const handleCellMouseDown = useCallback((e: React.MouseEvent, r: number, c: number) => {
    const key      = cellKey(r, c)
    const isAnswer = answerKeys.has(key)
    const isSame   = active?.r === r && active?.c === c
    const inPoint  = editMode && isFormulaInput(formulaVal)

    // ── POINT MODE: typing a formula → click inserts cell reference ──────
    if (inPoint) {
      if (isSame) return  // clicking the cell being edited → let browser position cursor
      e.preventDefault()  // prevents focus from leaving the inline input
      insertRef(`${COLS[c]}${r + 1}`)
      setPointHover(null)
      return
    }

    // ── Clicking the same answer cell that's already in edit mode → do nothing (let browser handle cursor) ──
    if (editMode && isSame && isAnswer) return

    // ── Clicking while editing → commit first ────────────────────────────
    if (editMode && !isSame) commit()

    // ── Single click: SELECT only (no edit mode) — exactly like Excel ────
    if (isAnswer) {
      setActive({ r, c })
      setEditMode(false)
      setFormulaVal(values.get(key) ?? '')
      setTimeout(() => gridRef.current?.focus(), 0)
    } else {
      setActive({ r, c })
      setEditMode(false)
      const def = cellMap.current.get(key)
      setFormulaVal(def?.formula ?? String(def?.v ?? ''))
      setTimeout(() => gridRef.current?.focus(), 0)
    }
  }, [active, editMode, formulaVal, answerKeys, values, insertRef, commit])

  // ── Grid keyboard (when focus is on the grid div, not an input) ────────
  const handleGridKey = useCallback((e: React.KeyboardEvent) => {
    if (!active) return
    const { r, c } = active

    if (editMode) {
      // In edit mode the inline input captures keys; grid keys only reach here
      // if somehow focus is on the grid itself
      if (e.key === 'Escape') { e.preventDefault(); cancel(); return }
    }

    switch (e.key) {
      case 'ArrowDown':  e.preventDefault(); setActive({ r: Math.min(r+1, NUM_ROWS-1), c }); setEditMode(false); break
      case 'ArrowUp':    e.preventDefault(); setActive({ r: Math.max(r-1, 0), c }); setEditMode(false); break
      case 'ArrowRight': e.preventDefault(); setActive({ r, c: Math.min(c+1, COLS.length-1) }); setEditMode(false); break
      case 'ArrowLeft':  e.preventDefault(); setActive({ r, c: Math.max(c-1, 0) }); setEditMode(false); break
      case 'Tab':        e.preventDefault(); setActive({ r, c: Math.min(c+1, COLS.length-1) }); setEditMode(false); break
      case 'Enter': case 'F2':
        if (answerKeys.has(cellKey(r, c))) { e.preventDefault(); enterEdit(r, c) }
        break
      case 'Delete': case 'Backspace':
        if (answerKeys.has(cellKey(r, c))) {
          setValues(prev => { const m = new Map(prev); m.set(cellKey(r, c), ''); return m })
          setFormulaVal('')
        }
        break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && answerKeys.has(cellKey(r, c))) {
          e.preventDefault() // Bug 1 fix: prevents keypress from re-typing char into newly-focused input
          if (editMode) {
            // Bug 2 fix: already editing (focus somehow slipped to grid) — insert char into formula
            const inp = inlineCellRef.current ?? formulaBarRef.current
            if (inp) {
              const pos    = inp.selectionStart ?? formulaVal.length
              const newVal = formulaVal.slice(0, pos) + e.key + formulaVal.slice(pos)
              setFormulaVal(newVal)
              setArrowNavCell(null)
              setTimeout(() => { inp.focus(); inp.setSelectionRange(pos + 1, pos + 1) }, 0)
            }
          } else {
            enterEdit(r, c, e.key)
          }
        }
    }
  }, [active, editMode, formulaVal, answerKeys, cancel, enterEdit])

  // ── Shared key handler for BOTH inline input and formula bar ───────────
  const handleEditKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit('down'); return }
    if (e.key === 'Tab')    { e.preventDefault(); commit('right'); return }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); return }
    // Arrow keys: in formula mode they move cursor (default browser); otherwise commit + navigate
    if (!isFormulaInput(formulaVal)) {
      if (e.key === 'ArrowDown')  { e.preventDefault(); commit('down') }
      if (e.key === 'ArrowUp')    { e.preventDefault(); commit() }
      if (e.key === 'ArrowRight') { e.preventDefault(); commit('right') }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); commit() }
    }
  }, [commit, cancel, formulaVal])

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    // Use valuesRef so timer-triggered auto-submit always has the latest values
    const snapshot = valuesRef.current
    const answers: SpreadsheetAnswer[] = template.answerCells.map(ac => {
      const key  = cellKey(ac.r, ac.c)
      // If currently editing this cell, grab the live formulaVal
      const raw  = (active && editMode && active.r === ac.r && active.c === ac.c)
        ? formulaVal.trim()
        : (snapshot.get(key) ?? '')
      let value: number | string | null = null
      if (raw !== '') {
        const ev = evaluate(raw)
        const n  = parseFloat(ev.replace(/\./g, '').replace(/,/g, '.'))
        value = isNaN(n) ? ev : n
      }
      return { r: ac.r, c: ac.c, value }
    })
    onDone(answers)
  }, [active, editMode, formulaVal, template.answerCells, evaluate, onDone])

  // Keep ref in sync so the timer can call it
  useEffect(() => { handleSubmitRef.current = handleSubmit }, [handleSubmit])

  const handleScroll = useCallback(() => {
    const el = gridRef.current
    if (el) setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  const answeredCount = template.answerCells.filter(ac => (values.get(cellKey(ac.r, ac.c)) ?? '').trim() !== '').length
  const totalQ        = template.answerCells.length
  const activeRef     = active ? `${COLS[active.c]}${active.r + 1}` : ''
  const activeIsAns   = active ? answerKeys.has(cellKey(active.r, active.c)) : false
  const inPointMode   = editMode && isFormulaInput(formulaVal)
  const refsMap       = inPointMode ? parseRefs(formulaVal) : new Map<string, number>()

  const mins    = Math.floor(secsLeft / 60)
  const secs    = secsLeft % 60
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`
  const timerCritical = secsLeft <= 60   // last minute → red
  const timerWarning  = secsLeft <= 180  // last 3 min → yellow

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Time-up overlay */}
      {timeUp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(10,10,20,.92)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16,
        }}>
          <div style={{ fontSize: 56 }}>⏰</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 }}>
            ¡Tiempo terminado!
          </h2>
          <p style={{ fontSize: 15, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
            Enviando tus respuestas automáticamente…
          </p>
        </div>
      )}

      {/* Header */}
      <div className="anim">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Tag color="blue">Taller de Matemáticas · Hoja de Cálculo · Versión {template.version}</Tag>

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 14px',
            borderRadius: 100,
            background: timerCritical
              ? 'rgba(239,68,68,.15)'
              : timerWarning
                ? 'rgba(245,158,11,.12)'
                : 'rgba(255,255,255,.05)',
            border: `1px solid ${timerCritical ? 'rgba(239,68,68,.4)' : timerWarning ? 'rgba(245,158,11,.35)' : 'rgba(255,255,255,.1)'}`,
            transition: 'all .3s',
          }}>
            <span style={{ fontSize: 13 }}>
              {timerCritical ? '🔴' : timerWarning ? '🟡' : '⏱'}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 15,
              fontWeight: 700,
              color: timerCritical ? '#f87171' : timerWarning ? '#fbbf24' : 'var(--text)',
              letterSpacing: '1px',
              ...(timerCritical ? { animation: 'timer-pulse 1s ease-in-out infinite' } : {}),
            }}>
              {timeStr}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Space Mono, monospace', letterSpacing: '.5px' }}>
              restante
            </span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 8, fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6 }}>
          Haz clic en una celda <span style={{ color: '#c084fc', fontWeight: 600 }}>morada</span> y escribe tu fórmula directamente (ej:{' '}
          <code style={{ background: 'rgba(255,255,255,.06)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>=F3*4</code>,{' '}
          <code style={{ background: 'rgba(255,255,255,.06)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>=SUM(H30:H34)</code>).
          {' '}Respuestas: <strong style={{ color: answeredCount === totalQ ? 'var(--green)' : 'var(--text)' }}>{answeredCount}/{totalQ}</strong>
        </p>
      </div>

      {/* Point-mode banner */}
      {inPointMode && (
        <div style={{
          padding: '6px 14px', marginBottom: 4,
          background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.3)',
          borderRadius: 8, fontSize: 12, color: '#93c5fd',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          <span style={{ fontSize: 14 }}>👆</span>
          <strong style={{ color: '#60a5fa' }}>Modo referencia</strong> — haz clic en cualquier celda para insertar su referencia en la fórmula
        </div>
      )}

      {/* Formula bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#0d0d1a',
        border: `1px solid ${inPointMode ? 'rgba(59,130,246,.5)' : 'var(--border)'}`,
        borderBottom: 'none', borderRadius: '8px 8px 0 0', flexShrink: 0,
        transition: 'border-color .15s',
      }}>
        <div style={{
          width: 68, padding: '5px 10px', borderRight: '1px solid var(--border)',
          fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--muted)', textAlign: 'center', flexShrink: 0, userSelect: 'none',
        }}>
          {activeRef}
        </div>
        <div style={{
          padding: '5px 12px', borderRight: '1px solid var(--border)',
          fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
          color: activeIsAns ? '#c084fc' : '#444466',
          flexShrink: 0, fontStyle: 'italic', userSelect: 'none',
        }}>
          fx
        </div>
        <input
          ref={formulaBarRef}
          value={formulaVal}
          readOnly={!activeIsAns}
          onChange={e => { if (activeIsAns) { setFormulaVal(e.target.value); setEditMode(true) } }}
          onKeyDown={handleEditKey}
          onFocus={() => { if (active && activeIsAns) { setEditMode(true) } }}
          onClick={() => { if (active && activeIsAns && !editMode) enterEdit(active.r, active.c, undefined, true) }}
          placeholder={activeIsAns ? 'Barra de fórmulas — escribe aquí o directamente en la celda' : 'Selecciona una celda morada'}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '5px 12px', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
            color: activeIsAns
              ? (isFormulaInput(formulaVal) ? '#86efac' : '#c084fc')
              : '#444466',
            cursor: activeIsAns ? 'text' : 'default',
          }}
        />
        {activeIsAns && (
          <div style={{
            padding: '3px 12px', flexShrink: 0, fontSize: 10,
            fontFamily: 'Space Mono, monospace', letterSpacing: '.5px',
            color: inPointMode ? '#60a5fa' : editMode ? '#86efac' : '#c084fc',
            borderLeft: '1px solid var(--border)',
          }}>
            {inPointMode ? '⊕ REFERENCIA' : editMode ? '✎ EDITANDO' : '● LISTA'}
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ position: 'relative', flex: 1 }}>
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={handleGridKey}
          onScroll={handleScroll}
          style={{
            overflow: 'auto', outline: 'none',
            border: '1px solid var(--border)',
            borderRadius: '0 0 8px 8px',
            maxHeight: '52vh', background: '#0a0a14',
            cursor: inPointMode ? 'crosshair' : 'default',
          }}
        >
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{
                  width: 40, minWidth: 40, background: '#111122',
                  borderRight: '1px solid #1e1e3a', borderBottom: '2px solid #2a2a4a',
                  fontSize: 10, color: '#555577', fontFamily: 'JetBrains Mono, monospace',
                  position: 'sticky', top: 0, left: 0, zIndex: 3,
                }} />
                {COLS.map((col, ci) => (
                  <th key={col} style={{
                    width: COL_WIDTHS[ci], minWidth: COL_WIDTHS[ci],
                    background: '#111122', borderRight: '1px solid #1e1e3a',
                    borderBottom: '2px solid #2a2a4a',
                    fontSize: 10, color: '#6677aa',
                    fontFamily: 'JetBrains Mono, monospace',
                    textAlign: 'center', padding: '4px 0',
                    position: 'sticky', top: 0, zIndex: 2,
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: NUM_ROWS }, (_, r) => (
                <tr key={r}>
                  <td style={{
                    background: '#111122', borderRight: '2px solid #2a2a4a',
                    borderBottom: '1px solid #1a1a2e',
                    fontSize: 10, color: '#555577', fontFamily: 'JetBrains Mono, monospace',
                    textAlign: 'center', padding: '0 4px',
                    position: 'sticky', left: 0, zIndex: 1,
                    height: ROW_HEIGHT, verticalAlign: 'middle', userSelect: 'none',
                  }}>
                    {r + 1}
                  </td>

                  {COLS.map((_, c) => {
                    const key       = cellKey(r, c)
                    const def       = cellMap.current.get(key)
                    const isActive  = active?.r === r && active?.c === c
                    const isAnswer  = answerKeys.has(key)
                    const isEditing = isActive && isAnswer && editMode
                    const display   = getDisplay(r, c)
                    const userVal   = values.get(key) ?? ''
                    const hasValue  = userVal.trim() !== ''
                    const refColor  = refsMap.get(key)
                    const refHex    = refColor !== undefined ? REF_COLORS[refColor] : null
                    const isHovered = inPointMode && pointHover?.r === r && pointHover?.c === c

                    // Background
                    let bg = def?.bg ?? 'transparent'
                    if (isAnswer && !isActive) bg = hasValue ? 'rgba(34,197,94,.15)' : 'rgba(251,191,36,.15)'
                    if (isActive) bg = isAnswer ? '#1a2d1a' : '#1a1a32'
                    if (isHovered) bg = 'rgba(59,130,246,.15)'

                    // Outline / border accent
                    let outline = 'none'
                    if (isAnswer && !isActive && !isHovered) outline = hasValue
                      ? '1px solid rgba(34,197,94,.45)'
                      : '1px solid rgba(251,191,36,.5)'
                    if (isActive && !inPointMode) outline = `2px solid ${isAnswer ? '#22c55e' : '#3b3b6a'}`
                    if (refHex)  outline = `2px solid ${refHex}`
                    if (isHovered) outline = '2px solid #60a5fa'

                    const textColor = isAnswer
                      ? (hasValue ? '#86efac' : '#fcd34d')
                      : (def?.color ?? '#555577')

                    return (
                      <td
                        key={c}
                        onMouseDown={e => handleCellMouseDown(e, r, c)}
                        onDoubleClick={() => { if (answerKeys.has(key)) enterEdit(r, c) }}
                        onMouseEnter={() => { if (inPointMode) setPointHover({ r, c }) }}
                        onMouseLeave={() => { if (inPointMode) setPointHover(null) }}
                        style={{
                          background: bg,
                          borderRight: '1px solid #1a1a2e', borderBottom: '1px solid #1a1a2e',
                          outline, outlineOffset: -2,
                          height: ROW_HEIGHT, maxWidth: COL_WIDTHS[c],
                          overflow: 'hidden', verticalAlign: 'middle',
                          cursor: inPointMode ? 'crosshair' : isAnswer ? 'cell' : 'default',
                          position: 'relative',
                        }}
                      >
                        {/* ── Inline editable input — visible when this answer cell is active ── */}
                        {isEditing && (
                          <input
                            ref={inlineCellRef}
                            value={formulaVal}
                            onChange={e => setFormulaVal(e.target.value)}
                            onKeyDown={handleEditKey}
                            onBlur={e => {
                              // Only commit if focus moved outside both inputs
                              const next = e.relatedTarget as HTMLElement | null
                              if (
                                next === formulaBarRef.current ||
                                next === inlineCellRef.current
                              ) return
                              // Blur to a cell → handleCellMouseDown commits
                              // Blur to anywhere else → commit
                              if (!next || !next.closest('td')) commit()
                            }}
                            style={{
                              position: 'absolute', inset: 0,
                              background: '#0f2318',
                              border: 'none', outline: 'none',
                              padding: '0 6px',
                              fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                              color: isFormulaInput(formulaVal) ? '#86efac' : '#fde68a',
                              width: '100%', zIndex: 10,
                            }}
                          />
                        )}

                        {/* ── Static display span ─────────────────────────────────────────── */}
                        {!isEditing && (
                          <span style={{
                            display: 'block', padding: '0 6px',
                            fontSize: 11,
                            fontFamily: isAnswer ? 'JetBrains Mono, monospace' : 'Inter, DM Sans, sans-serif',
                            fontWeight: def?.bold ? 700 : 400,
                            fontStyle: def?.italic ? 'italic' : 'normal',
                            textAlign: (def?.align ?? 'left') as 'left' | 'center' | 'right',
                            color: refHex ?? textColor,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            lineHeight: `${ROW_HEIGHT}px`,
                          }}>
                            {display || (isAnswer && (
                              <span style={{ color: '#fbbf24', fontSize: 10, fontWeight: 600, letterSpacing: '0.3px' }}>
                                ✏️ respuesta
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right scroll fade */}
        {canScrollRight && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 48,
            background: 'linear-gradient(to right, transparent, rgba(10,10,20,.85))',
            borderRadius: '0 0 8px 0', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
          }}>
            <span className="scroll-arrow" style={{ fontSize: 16, color: 'rgba(150,120,220,.6)' }}>›</span>
          </div>
        )}
      </div>

      {/* Scroll / usage hint banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 16px',
        padding: '7px 12px',
        background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.15)',
        borderTop: 'none', borderRadius: '0 0 8px 8px',
        marginBottom: 6, flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: '#8b5cf6', fontFamily: 'Space Mono, monospace' }}>
          ← Desliza para ver más →
        </span>
        <span style={{ color: 'rgba(139,92,246,.3)' }}>·</span>
        <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans, sans-serif' }}>
          Celdas <span style={{ color: '#c084fc', fontWeight: 600 }}>moradas</span> = tus respuestas
        </span>
        <span style={{ color: 'rgba(139,92,246,.3)' }}>·</span>
        <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'DM Sans, sans-serif' }}>
          Escribe <code style={{ background: 'rgba(255,255,255,.06)', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>=</code> y haz clic en celdas para referenciarlas
        </span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexShrink: 0 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Inter, DM Sans, sans-serif', margin: 0 }}>
          {answeredCount < totalQ
            ? `Faltan ${totalQ - answeredCount} respuestas. Puedes enviar de todas formas.`
            : `✓ Todas las respuestas completadas.`}
        </p>
        {!confirming ? (
          <Button variant="blue" onClick={() => setConfirming(true)}>Enviar respuestas →</Button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Inter, DM Sans, sans-serif' }}>
              ¿Confirmar envío? No podrás cambiar tus respuestas.
            </span>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button variant="blue" onClick={handleSubmit}>Confirmar ✓</Button>
          </div>
        )}
      </div>

      <style>{`
        .scroll-arrow { animation: pulse-arrow 1.5s ease-in-out infinite; }
        @keyframes pulse-arrow {
          0%, 100% { opacity: .4; transform: translateX(0); }
          50%       { opacity: 1; transform: translateX(3px); }
        }
        @keyframes timer-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .4; }
        }
      `}</style>
    </div>
  )
}
