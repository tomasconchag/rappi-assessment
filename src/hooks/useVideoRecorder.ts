'use client'

import { useState, useRef, useCallback } from 'react'

type RecorderState = 'idle' | 'countdown' | 'recording' | 'done'

export function useVideoRecorder(maxSeconds: number) {
  const [state, setState] = useState<RecorderState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [mimeType, setMimeType] = useState('video/webm')
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setError(null)
      return stream
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      return null
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const getMimeType = useCallback((): string => {
    // Prefer VP8+opus — best cross-browser audio+video support in WebM.
    // VP9 without explicit opus falls back to video-only on many browsers.
    const types = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/mp4;codecs=h264,aac', // Safari fallback
      'video/webm',                 // last resort — browser picks codecs
    ]
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return ''
  }, [])

  const startCountdown = useCallback(() => {
    setState('countdown')
    let count = 3
    setCountdown(count)
    const ci = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(ci)
        startRecording()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }, [])  // eslint-disable-line

  const startRecording = useCallback(() => {
    if (!streamRef.current) return

    // Verify stream has audio tracks — warn if missing
    const audioTracks = streamRef.current.getAudioTracks()
    if (audioTracks.length === 0) {
      setError('No se detectó micrófono. Verifica que el micrófono esté habilitado y recarga la página.')
      return
    }

    const mime = getMimeType()
    setMimeType(mime)
    chunksRef.current = []

    // Force audio encoding explicitly
    const recorderOptions: MediaRecorderOptions = mime ? {
      mimeType: mime,
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
    } : { audioBitsPerSecond: 128000 }

    const recorder = new MediaRecorder(streamRef.current, recorderOptions)
    recorderRef.current = recorder
    // Use 500ms timeslice so data is flushed regularly (avoids data loss on crash)
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const recorded = new Blob(chunksRef.current, { type: mime || 'video/webm' })
      setBlob(recorded)
      setState('done')
      stopCamera()
    }
    recorder.start(500) // collect chunks every 500ms
    setState('recording')
    startTimeRef.current = Date.now()
    setSecondsLeft(maxSeconds)

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const remaining = Math.max(0, maxSeconds - elapsed)
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current!)
        recorder.stop()
      }
    }, 500)
  }, [getMimeType, maxSeconds, stopCamera])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }, [])

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (el && streamRef.current) el.srcObject = streamRef.current
  }, [])

  return {
    state, countdown, secondsLeft, blob, mimeType, error,
    initCamera, stopCamera, startCountdown, stopRecording, setVideoRef,
    stream: streamRef.current,
  }
}
