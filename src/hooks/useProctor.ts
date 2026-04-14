'use client'

import { useRef, useCallback, useEffect } from 'react'
import type { ProctoringData, ProctoringEvent } from '@/types/proctoring'
import { fraudScore, fraudLevel } from '@/lib/scoring'

type ProctoringState = {
  tabOut: number
  tabTime: number
  tabLeft: number | null
  paste: number
  copy: number
  fsExit: number
  rclick: number
  kblock: number
  screenshot: number
  windowBlur: number
  windowBlurTime: number
  windowBlurLeft: number | null
  hpFail: number
  warnings: number
  events: ProctoringEvent[]
  snapshots: { ts: number; img: string }[]
  currentScreen: string
}

export type ProctoringRef = {
  getData: () => ProctoringData
  addHoneypotFail: () => void
  addSnapshot: (img: string) => void
  isActive: () => boolean
  fraudScore: () => number
}

// Screens where screen-sharing is required — fullscreen enforcement must be suspended
const RECORDING_SCREENS = new Set([
  'roleplay_prep', 'roleplay_call',
  'cultural_fit_prep', 'cultural_fit_call',
])

export function useProctor(options: {
  active: boolean
  currentScreen: string
  onWarning: (title: string, msg: string) => void
  onTabChange?: () => void
  goFullscreen: () => void
}) {
  const state = useRef<ProctoringState>({
    tabOut: 0, tabTime: 0, tabLeft: null,
    paste: 0, copy: 0, fsExit: 0, rclick: 0,
    kblock: 0, screenshot: 0,
    windowBlur: 0, windowBlurTime: 0, windowBlurLeft: null,
    hpFail: 0, warnings: 0,
    events: [], snapshots: [], currentScreen: ''
  })

  const { active, currentScreen, onWarning, goFullscreen } = options
  const activeRef = useRef(active)
  const screenRef = useRef(currentScreen)
  activeRef.current = active
  screenRef.current = currentScreen

  const logEv = useCallback((t: string, d = '') => {
    state.current.events.push({ t, d, ts: Date.now(), scr: screenRef.current })
  }, [])

  const warn = useCallback((title: string, msg: string) => {
    state.current.warnings++
    logEv('warning', msg)
    onWarning(title, msg)
  }, [logEv, onWarning])

  useEffect(() => {
    const onVisibility = () => {
      if (!activeRef.current) return
      if (document.hidden) {
        state.current.tabOut++
        state.current.tabLeft = Date.now()
        logEv('tab_out')
      } else {
        if (state.current.tabLeft) {
          state.current.tabTime += (Date.now() - state.current.tabLeft) / 1000
        }
        state.current.tabLeft = null
        logEv('tab_back')
        if (state.current.tabOut === 1) warn('⚠️ Cambio de pestaña detectado', 'Se detectó que saliste de esta pestaña. Esto queda registrado.')
        else if (state.current.tabOut === 3) warn('🚨 Múltiples cambios de pestaña', 'Has salido 3 veces. Esto afectará tu evaluación.')
      }
    }

    const onPaste = (e: ClipboardEvent) => {
      if (!activeRef.current) return
      state.current.paste++
      e.preventDefault()
      logEv('paste')
      warn('⚠️ Pegado bloqueado', 'Se detectó un intento de pegar texto. Las respuestas deben ser propias.')
    }

    const onCopy = (e: ClipboardEvent) => {
      if (!activeRef.current) return
      state.current.copy++
      e.preventDefault()
      logEv('copy')
    }

    const onCut = (e: ClipboardEvent) => {
      if (activeRef.current) e.preventDefault()
    }

    const onContextMenu = (e: MouseEvent) => {
      if (!activeRef.current) return
      e.preventDefault()
      state.current.rclick++
      logEv('rclick')
    }

    const onKeydown = (e: KeyboardEvent) => {
      if (!activeRef.current) return
      const k = e.key.toLowerCase()

      // Screenshot detection
      // PrintScreen (Windows) — key is 'printscreen'
      const isPrintScreen = k === 'printscreen'
      // Mac: Cmd+Shift+3 / Cmd+Shift+4 / Cmd+Shift+5
      const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(k)
      // Windows Snipping shortcut: Win+Shift+S — not detectable (OS-level), but Ctrl+Shift+S in some apps
      if (isPrintScreen || isMacScreenshot) {
        state.current.screenshot++
        logEv('screenshot', e.key)
        if (state.current.screenshot === 1) warn('📸 Captura de pantalla detectada', 'Se detectó un intento de captura de pantalla. Esto queda registrado y afecta tu evaluación.')
        else warn('🚨 Múltiples capturas de pantalla', `Se detectaron ${state.current.screenshot} capturas de pantalla. Esto afectará significativamente tu evaluación.`)
        return
      }

      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'p', 's', 'u', 'i'].includes(k)) {
        const target = e.target as HTMLElement
        if (['c', 'v'].includes(k) && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          e.preventDefault(); state.current.kblock++; logEv('key_block', 'Ctrl+' + k); return
        }
        e.preventDefault(); state.current.kblock++; logEv('key_block', 'Ctrl+' + k)
      }
      if (k === 'f12') { e.preventDefault(); state.current.kblock++; logEv('key_block', 'F12') }
    }

    const onFullscreen = () => {
      if (!activeRef.current) return
      const isFs = !!(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement)
      if (!isFs) {
        state.current.fsExit++
        logEv('fs_exit')
        // During recording screens the user must share their screen, which exits fullscreen —
        // don't warn or try to re-enter, it would fight with the getDisplayMedia dialog.
        if (RECORDING_SCREENS.has(screenRef.current)) return
        if (state.current.fsExit <= 2) warn('⚠️ Pantalla completa requerida', 'El assessment debe realizarse en pantalla completa.')
        setTimeout(() => goFullscreen(), 500)
      }
    }

    // Window blur: fires when the browser window loses focus (e.g. click on another monitor/app)
    // We defer 150ms so visibilitychange fires first — if the tab is hidden by then it was
    // a tab/app switch (already tracked), not a second-monitor focus change.
    const blurTs = { v: 0 }
    const onWindowBlur = () => {
      if (!activeRef.current) return
      blurTs.v = Date.now()
      setTimeout(() => {
        if (!activeRef.current) return
        if (document.hidden) return // tab switch — already handled by visibilitychange
        state.current.windowBlur++
        state.current.windowBlurLeft = blurTs.v
        logEv('window_blur')
        if (state.current.windowBlur === 1) warn('👀 Cambio de ventana detectado', 'Se detectó que cambiaste a otra ventana o monitor. Esto queda registrado.')
        else if (state.current.windowBlur === 3) warn('🚨 Múltiples cambios de ventana', 'Has cambiado de ventana 3 veces. Esto afectará significativamente tu evaluación.')
      }, 150)
    }

    const onWindowFocus = () => {
      if (!activeRef.current) return
      if (state.current.windowBlurLeft) {
        state.current.windowBlurTime += (Date.now() - state.current.windowBlurLeft) / 1000
        state.current.windowBlurLeft = null
      }
      logEv('window_focus')
    }

    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('paste', onPaste)
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('fullscreenchange', onFullscreen)
    document.addEventListener('webkitfullscreenchange', onFullscreen)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeydown)
      document.removeEventListener('fullscreenchange', onFullscreen)
      document.removeEventListener('webkitfullscreenchange', onFullscreen)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [logEv, warn, goFullscreen])

  const getData = useCallback((): ProctoringData => {
    const s = state.current
    const score = fraudScore({
      tab_out_count: s.tabOut, paste_attempts: s.paste, copy_attempts: s.copy,
      fs_exit_count: s.fsExit, honeypot_fails: s.hpFail, rclick_count: s.rclick,
      key_block_count: s.kblock, screenshot_attempts: s.screenshot,
      window_blur_count: s.windowBlur,
    })
    return {
      tab_out_count: s.tabOut,
      tab_time_s: Math.round(s.tabTime),
      paste_attempts: s.paste,
      copy_attempts: s.copy,
      fs_exit_count: s.fsExit,
      rclick_count: s.rclick,
      key_block_count: s.kblock,
      screenshot_attempts: s.screenshot,
      window_blur_count: s.windowBlur,
      window_blur_time_s: Math.round(s.windowBlurTime),
      honeypot_fails: s.hpFail,
      warning_count: s.warnings,
      fraud_score: score,
      fraud_level: fraudLevel(score),
      events: s.events,
      snapshots: s.snapshots,
    }
  }, [])

  const addHoneypotFail = useCallback(() => { state.current.hpFail++ }, [])
  const addSnapshot = useCallback((img: string) => {
    state.current.snapshots.push({ ts: Date.now(), img })
    logEv('snap', 'Snap ' + state.current.snapshots.length)
  }, [logEv])
  const isActive = useCallback(() => activeRef.current, [])
  const getFraudScore = useCallback(() => {
    const s = state.current
    return fraudScore({ tab_out_count: s.tabOut, paste_attempts: s.paste, copy_attempts: s.copy, fs_exit_count: s.fsExit, honeypot_fails: s.hpFail, rclick_count: s.rclick, key_block_count: s.kblock, screenshot_attempts: s.screenshot, window_blur_count: s.windowBlur })
  }, [])

  const ref: ProctoringRef = { getData, addHoneypotFail, addSnapshot, isActive, fraudScore: getFraudScore }
  return ref
}
