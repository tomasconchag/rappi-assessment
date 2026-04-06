export type ProctoringEvent = {
  t: string
  d: string
  ts: number
  scr: string
}

export type ProctoringData = {
  tab_out_count: number
  tab_time_s: number
  paste_attempts: number
  copy_attempts: number
  fs_exit_count: number
  rclick_count: number
  key_block_count: number
  screenshot_attempts: number
  window_blur_count: number
  window_blur_time_s: number
  honeypot_fails: number
  warning_count: number
  fraud_score: number
  fraud_level: 'Confiable' | 'Riesgo Medio' | 'Alta Probabilidad de Fraude'
  events: ProctoringEvent[]
  snapshots: { ts: number; img: string }[]
}
