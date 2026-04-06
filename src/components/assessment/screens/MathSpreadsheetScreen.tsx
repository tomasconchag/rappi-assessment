'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/Tag'
import type { SpreadsheetVersion, SpreadsheetAnswer, CellDef } from '@/lib/mathSpreadsheetTemplates'

interface Props {
  template: SpreadsheetVersion
  onDone: (answers: SpreadsheetAnswer[]) => void
}

// ─── Column / row config ──────────────────────────────────────────────────
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const NUM_ROWS = 45
const COL_WIDTHS: Record<number, number> = { 0: 28, 1: 28, 2: 28, 3: 48, 4: 340, 5: 140, 6: 180, 7: 140, 8: 120, 9: 60 }
const ROW_HEIGHT = 26

// ─── Format helpers ───────────────────────────────────────────────────────
function fmtCell(v: string | number, format?: CellDef['format']): string {
  if (v === '' || v === null || v === undefined) return ''
  if (format === 'currency') return `$ ${Number(v).toLocaleString('es-CO')}`
  if (format === 'percent')  return `${(Number(v) * 100).toFixed(0)}%`
  if (format === 'decimal')  return Number(v).toFixed(2)
  if (typeof v === 'number') return v.toLocaleString('es-CO')
  return String(v)
}

function cellKey(r: number, c: number) { return `${r}_${c}` }

// ─── Main component ───────────────────────────────────────────────────────
export function MathSpreadsheetScreen({ template, onDone }: Props) {
  // Build a lookup map of all template cells
  const cellMap = useRef<Map<string, CellDef>>(new Map())
  useEffect(() => {
    const m = new Map<string, CellDef>()
    template.cells.forEach(c => m.set(cellKey(c.r, c.c), c))
    cellMap.current = m
  }, [template])

  // State: values typed into editable cells
  const [values, setValues] = useState<Map<string, string>>(new Map())
  // Active cell
  const [active, setActive] = useState<{ r: number; c: number } | null>(null)
  // Editing mode (typing in formula bar or directly)
  const [editing, setEditing] = useState(false)
  const [formulaBarValue, setFormulaBarValue] = useState('')
  // Confirm done dialog
  const [confirming, setConfirming] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const gridRef  = useRef<HTMLDivElement>(null)

  const answerKeys = new Set(template.answerCells.map(a => cellKey(a.r, a.c)))

  // ── Activate a cell ───────────────────────────────────────────────────
  const activateCell = useCallback((r: number, c: number) => {
    setActive({ r, c })
    setEditing(false)
    const key = cellKey(r, c)
    const cur = values.get(key) ?? ''
    const def = cellMap.current.get(key)
    setFormulaBarValue(cur || (def?.formula ?? '') || String(def?.v ?? ''))
  }, [values])

  // ── Start editing ─────────────────────────────────────────────────────
  const startEditing = useCallback((r: number, c: number) => {
    if (!answerKeys.has(cellKey(r, c))) return
    setActive({ r, c })
    setEditing(true)
    const cur = values.get(cellKey(r, c)) ?? ''
    setFormulaBarValue(cur)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [answerKeys, values])

  // ── Commit edit ───────────────────────────────────────────────────────
  const commitEdit = useCallback(() => {
    if (!active) return
    const key = cellKey(active.r, active.c)
    setValues(prev => {
      const m = new Map(prev)
      m.set(key, formulaBarValue)
      return m
    })
    setEditing(false)
    gridRef.current?.focus()
  }, [active, formulaBarValue])

  // ── Keyboard navigation ───────────────────────────────────────────────
  const handleGridKey = useCallback((e: React.KeyboardEvent) => {
    if (!active) return
    const { r, c } = active

    if (editing) {
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit() }
      if (e.key === 'Escape') { setEditing(false); setFormulaBarValue(values.get(cellKey(r, c)) ?? '') }
      return
    }

    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEditing(r, c) }
    if (e.key === 'ArrowDown')  { e.preventDefault(); activateCell(Math.min(r + 1, NUM_ROWS - 1), c) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); activateCell(Math.max(r - 1, 0), c) }
    if (e.key === 'ArrowRight') { e.preventDefault(); activateCell(r, Math.min(c + 1, COLS.length - 1)) }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); activateCell(r, Math.max(c - 1, 0)) }
    if (e.key === 'Tab')        { e.preventDefault(); activateCell(r, Math.min(c + 1, COLS.length - 1)) }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (answerKeys.has(cellKey(r, c))) {
        setValues(prev => { const m = new Map(prev); m.set(cellKey(r, c), ''); return m })
      }
    }
    // Start typing directly into cell
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      if (answerKeys.has(cellKey(r, c))) {
        setFormulaBarValue(e.key)
        setEditing(true)
        setTimeout(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(1, 1) }, 0)
      }
    }
  }, [active, editing, commitEdit, startEditing, activateCell, values, answerKeys])

  // ── Evaluate a formula string (simple eval with cell references) ──────
  // We resolve F3, G4, etc. → values from the template before evaluating
  const evaluateFormula = useCallback((formula: string): string => {
    if (!formula.startsWith('=')) return formula
    try {
      let expr = formula.slice(1).toUpperCase()
      // Replace cell references like F3, G4, H30, etc. with their values
      expr = expr.replace(/([A-J])(\d+)/g, (_match, col, row) => {
        const c = COLS.indexOf(col)
        const r = parseInt(row) - 1
        const key = cellKey(r, c)
        const userVal = values.get(key)
        if (userVal && userVal !== '') return userVal.startsWith('=') ? '0' : userVal
        const def = cellMap.current.get(key)
        if (def) return String(def.v ?? 0)
        return '0'
      })
      // Replace SUM(A:B) with + chain (simple implementation)
      expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, range) => {
        const parts = range.split(':')
        if (parts.length === 2) {
          const [startRef, endRef] = parts
          const sc = COLS.indexOf(startRef[0]); const sr = parseInt(startRef.slice(1)) - 1
          const ec = COLS.indexOf(endRef[0]);   const er = parseInt(endRef.slice(1)) - 1
          let sum = 0
          for (let row = sr; row <= er; row++) {
            const key = cellKey(row, sc + (ec - sc > 0 ? 0 : 0))
            // For column sums
            for (let col = sc; col <= (sc === ec ? sc : ec); col++) {
              const v = parseFloat(cellMap.current.get(cellKey(row, col))?.v?.toString() ?? '0')
              if (!isNaN(v)) sum += v
            }
          }
          return String(sum)
        }
        return '0'
      })
      // Replace % literals
      expr = expr.replace(/(\d+)%/g, (_, n) => String(Number(n) / 100))
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${expr})`)()
      if (typeof result === 'number') {
        if (Number.isInteger(result)) return result.toLocaleString('es-CO')
        return result.toFixed(4).replace(/\.?0+$/, '')
      }
      return String(result)
    } catch {
      return '#ERROR'
    }
  }, [values])

  // ── Render a cell's display value ────────────────────────────────────
  const getCellDisplay = useCallback((r: number, c: number): string => {
    const key = cellKey(r, c)
    const def = cellMap.current.get(key)
    const userVal = values.get(key)

    if (answerKeys.has(key)) {
      if (userVal !== undefined && userVal !== '') {
        return evaluateFormula(userVal)
      }
      return ''
    }

    if (!def) return ''
    if (def.formula) return evaluateFormula(def.formula)
    return fmtCell(def.v, def.format)
  }, [values, answerKeys, evaluateFormula])

  // ── Active cell ref display ────────────────────────────────────────────
  const activeRef = active ? `${COLS[active.c]}${active.r + 1}` : ''

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const answers: SpreadsheetAnswer[] = template.answerCells.map(ac => {
      const key = cellKey(ac.r, ac.c)
      const raw = values.get(key) ?? ''
      let value: number | string | null = null
      if (raw !== '') {
        const evaluated = evaluateFormula(raw)
        const n = parseFloat(evaluated.replace(/[.,\s]/g, match => match === '.' ? '.' : ''))
        value = isNaN(n) ? evaluated : n
      }
      return { r: ac.r, c: ac.c, value }
    })
    onDone(answers)
  }, [template.answerCells, values, evaluateFormula, onDone])

  const answeredCount = template.answerCells.filter(ac => {
    const v = values.get(cellKey(ac.r, ac.c)) ?? ''
    return v.trim() !== ''
  }).length
  const totalQ = template.answerCells.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      <div className="anim">
        <Tag color="blue">Taller de Matemáticas · Hoja de Cálculo · Versión {template.version}</Tag>
        <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 8, fontFamily: 'Inter, DM Sans, sans-serif', lineHeight: 1.6 }}>
          Usa fórmulas de Excel (<code style={{ background: 'rgba(255,255,255,.06)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>=F3*4</code>, <code style={{ background: 'rgba(255,255,255,.06)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>=SUM(H30:H34)</code>).
          Haz clic en una celda <span style={{ color: '#c084fc', fontWeight: 600 }}>azul</span> para editarla.
          Respuestas: <strong style={{ color: answeredCount === totalQ ? 'var(--green)' : 'var(--text)' }}>{answeredCount}/{totalQ}</strong>
        </p>
      </div>

      {/* Formula bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: '#0d0d1a', border: '1px solid var(--border)',
        borderBottom: 'none', borderRadius: '8px 8px 0 0', flexShrink: 0,
      }}>
        {/* Cell ref box */}
        <div style={{
          width: 72, padding: '4px 10px', borderRight: '1px solid var(--border)',
          fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--muted)', textAlign: 'center', flexShrink: 0,
        }}>
          {activeRef}
        </div>
        {/* fx label */}
        <div style={{
          padding: '4px 10px', borderRight: '1px solid var(--border)',
          fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          color: '#c084fc', flexShrink: 0, fontStyle: 'italic',
        }}>
          fx
        </div>
        {/* Input */}
        <input
          ref={inputRef}
          value={formulaBarValue}
          onChange={e => { setFormulaBarValue(e.target.value); setEditing(true) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            if (e.key === 'Escape') { setEditing(false); setFormulaBarValue('') }
          }}
          onFocus={() => {
            if (active && answerKeys.has(cellKey(active.r, active.c))) setEditing(true)
          }}
          placeholder={active && answerKeys.has(cellKey(active.r, active.c)) ? 'Escribe tu fórmula aquí (ej: =F3*4)' : ''}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '4px 10px', fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text)',
          }}
        />
      </div>

      {/* Spreadsheet grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleGridKey}
        style={{
          flex: 1, overflow: 'auto',
          border: '1px solid var(--border)',
          borderRadius: '0 0 8px 8px',
          outline: 'none',
          maxHeight: '55vh',
          background: '#0a0a14',
        }}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '100%' }}>
          {/* Column headers */}
          <thead>
            <tr>
              <th style={{ width: 40, minWidth: 40, background: '#111122', borderRight: '1px solid #1e1e3a', borderBottom: '1px solid #1e1e3a', fontSize: 10, color: '#555577', fontFamily: 'JetBrains Mono, monospace', position: 'sticky', top: 0, zIndex: 2 }} />
              {COLS.map((col, ci) => (
                <th key={col} style={{
                  width: COL_WIDTHS[ci], minWidth: COL_WIDTHS[ci],
                  background: '#111122', borderRight: '1px solid #1e1e3a',
                  borderBottom: '2px solid #2a2a4a',
                  fontSize: 10, color: '#6677aa',
                  fontFamily: 'JetBrains Mono, monospace',
                  textAlign: 'center', padding: '3px 0',
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
                {/* Row number */}
                <td style={{
                  background: '#111122', borderRight: '2px solid #2a2a4a',
                  borderBottom: '1px solid #1a1a2e',
                  fontSize: 10, color: '#555577',
                  fontFamily: 'JetBrains Mono, monospace',
                  textAlign: 'center', padding: '0 4px',
                  position: 'sticky', left: 0, zIndex: 1,
                  height: ROW_HEIGHT, verticalAlign: 'middle',
                }}>
                  {r + 1}
                </td>
                {COLS.map((_, c) => {
                  const key = cellKey(r, c)
                  const def = cellMap.current.get(key)
                  const isActive = active?.r === r && active?.c === c
                  const isAnswer = answerKeys.has(key)
                  const display = getCellDisplay(r, c)
                  const userVal = values.get(key) ?? ''
                  const isEditing = isActive && editing

                  const bg = isActive ? '#2a1a4a' : (def?.bg ?? 'transparent')
                  const color = isAnswer ? '#c084fc' : (def?.color ?? '#555577')
                  const fw = def?.bold ? 700 : 400
                  const fs = def?.italic ? 'italic' : 'normal'
                  const ta = def?.align ?? 'left'

                  return (
                    <td
                      key={c}
                      onClick={() => activateCell(r, c)}
                      onDoubleClick={() => startEditing(r, c)}
                      style={{
                        background: bg,
                        borderRight: '1px solid #1a1a2e',
                        borderBottom: '1px solid #1a1a2e',
                        outline: isActive ? '2px solid #7c3aed' : 'none',
                        outlineOffset: -2,
                        height: ROW_HEIGHT,
                        maxWidth: COL_WIDTHS[c],
                        overflow: 'hidden',
                        verticalAlign: 'middle',
                        cursor: isAnswer ? 'cell' : 'default',
                        position: 'relative',
                      }}
                    >
                      {isEditing && isAnswer ? (
                        <input
                          autoFocus
                          value={formulaBarValue}
                          onChange={e => setFormulaBarValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit() }
                            if (e.key === 'Escape') { setEditing(false) }
                          }}
                          onBlur={commitEdit}
                          style={{
                            position: 'absolute', inset: 0,
                            background: '#1a0a3a', border: 'none', outline: 'none',
                            padding: '0 6px',
                            fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                            color: '#c084fc', width: '100%', zIndex: 10,
                          }}
                        />
                      ) : (
                        <span style={{
                          display: 'block', padding: '0 6px',
                          fontSize: 11, fontFamily: isAnswer ? 'JetBrains Mono, monospace' : 'Inter, DM Sans, sans-serif',
                          fontWeight: fw, fontStyle: fs, textAlign: ta as 'left' | 'center' | 'right',
                          color: userVal && isAnswer ? '#c084fc' : color,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          lineHeight: `${ROW_HEIGHT}px`,
                        }}>
                          {display}
                          {isAnswer && !display && (
                            <span style={{ color: '#3a2a6a', fontSize: 10 }}>▸</span>
                          )}
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

      {/* Footer controls */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 16, flexShrink: 0,
      }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Inter, DM Sans, sans-serif', margin: 0 }}>
          {answeredCount < totalQ
            ? `Faltan ${totalQ - answeredCount} respuestas. Puedes enviar de todas formas.`
            : `✓ Todas las respuestas completadas.`}
        </p>
        {!confirming ? (
          <Button variant="blue" onClick={() => setConfirming(true)}>
            Enviar respuestas →
          </Button>
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
    </div>
  )
}
