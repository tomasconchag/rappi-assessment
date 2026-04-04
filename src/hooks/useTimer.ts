'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer(initialSeconds: number, onEnd?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const startTimeRef = useRef<number | null>(null)
  const totalRef = useRef(initialSeconds)
  const onEndRef = useRef(onEnd)
  const activeRef = useRef(false)

  onEndRef.current = onEnd

  const start = useCallback((seconds?: number) => {
    const sec = seconds ?? totalRef.current
    totalRef.current = sec
    startTimeRef.current = Date.now()
    setSecondsLeft(sec)
    activeRef.current = true
  }, [])

  const stop = useCallback(() => {
    activeRef.current = false
    startTimeRef.current = null
  }, [])

  const reset = useCallback((seconds: number) => {
    stop()
    totalRef.current = seconds
    setSecondsLeft(seconds)
  }, [stop])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeRef.current || !startTimeRef.current) return
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = Math.max(0, totalRef.current - elapsed)
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        activeRef.current = false
        startTimeRef.current = null
        onEndRef.current?.()
        clearInterval(interval)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const pct = totalRef.current > 0 ? (secondsLeft / totalRef.current) * 100 : 0

  return { secondsLeft, pct, start, stop, reset }
}
