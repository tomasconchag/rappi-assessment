'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAssessmentState, clearSession } from '@/hooks/useAssessmentState'
import { useProctor } from '@/hooks/useProctor'
import { ProctoringBadge } from './ProctoringBadge'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { ContextScreen } from './screens/ContextScreen'
import { SharkIntroScreen } from './screens/SharkIntroScreen'
import { SharkPrepScreen } from './screens/SharkPrepScreen'
import { SharkRecordScreen } from './screens/SharkRecordScreen'
import { SharkDoneScreen } from './screens/SharkDoneScreen'
import { RolePlayIntroScreen } from './screens/RolePlayIntroScreen'
import { RolePlayPrepScreen } from './screens/RolePlayPrepScreen'
import { RolePlayCallScreen } from './screens/RolePlayCallScreen'
import { RolePlayDoneScreen } from './screens/RolePlayDoneScreen'
import { CulturalFitIntroScreen } from './screens/CulturalFitIntroScreen'
import { CulturalFitPrepScreen } from './screens/CulturalFitPrepScreen'
import { CulturalFitCallScreen } from './screens/CulturalFitCallScreen'
import { CulturalFitDoneScreen } from './screens/CulturalFitDoneScreen'
import { CasoIntroScreen } from './screens/CasoIntroScreen'
import { CasoQuestionScreen } from './screens/CasoQuestionScreen'
import { MathIntroScreen } from './screens/MathIntroScreen'
import { MathQuestionScreen } from './screens/MathQuestionScreen'
import { MathSpreadsheetScreen } from './screens/MathSpreadsheetScreen'
import { CompletionScreen } from './screens/CompletionScreen'
import type { AssessmentConfig, CandidateInfo, RoleplayCase } from '@/types/assessment'
import { scoreMath, scoreCaso, calcOverall, fraudScore, fraudLevel } from '@/lib/scoring'
import { getSpreadsheetVersion, randomVersion, scoreMathSpreadsheet } from '@/lib/mathSpreadsheetTemplates'
import type { SpreadsheetAnswer } from '@/lib/mathSpreadsheetTemplates'
import type { SectionId } from '@/lib/challenges'

// ── Atomic video upload helper ──────────────────────────────────────────────
// Uploads a single video with up to 3 attempts and exponential backoff
// (1s, 3s between attempts). Throws on final failure with a descriptive
// message. Callers should wrap in try/catch to preserve silent-failure
// semantics when a partial submission is acceptable.
async function uploadVideoAtomic(params: {
  blob: Blob
  mimeType: string
  section?: 'roleplay' | 'cultural_fit'  // omit for sharktank (default bucket path)
  candidateEmail: string
  label: string  // human-readable label for error messages (e.g. "SharkTank")
}): Promise<string> {
  const { blob, mimeType, section, candidateEmail, label } = params
  const MAX_ATTEMPTS = 3
  let lastErr: unknown = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(3, attempt - 1)))
    }
    try {
      const uploadRes = await fetch('/api/video-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateEmail,
          mimeType,
          ...(section ? { section } : {}),
        }),
      })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '')
        throw new Error(`signed URL ${uploadRes.status}: ${errText.slice(0, 120)}`)
      }
      const { signedUrl, path } = await uploadRes.json()
      if (!signedUrl || !path) throw new Error('signed URL response missing fields')

      // Supabase bucket accepts base mime only — strip codec params
      const baseMime = mimeType.split(';')[0] || 'video/webm'
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': baseMime },
      })
      if (!putRes.ok) {
        throw new Error(`PUT ${putRes.status}: ${putRes.statusText}`)
      }
      console.log(`[upload] ${label} success on attempt ${attempt + 1}`)
      return path
    } catch (err) {
      lastErr = err
      console.warn(`[upload] ${label} attempt ${attempt + 1} failed:`, err)
    }
  }
  const errMsg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  throw new Error(`${label}: ${errMsg}`)
}

interface ClerkUser {
  id: string
  name: string
  email: string
  imageUrl: string
}

interface PersonalizedTemplate {
  templateId: string
  batchId: string | null
  batchName: string | null
  configId: string | null
  employeeEmail: string
  employeeName: string | null
  template: { version: string; cells: unknown[]; answerCells: unknown[] }
}

interface Props {
  config: AssessmentConfig
  clerkUser?: ClerkUser | null
  cohortToken?: string | null
  cohortDeadline?: string | null
  personalizedTemplate?: PersonalizedTemplate
}

function buildScreenToStep(enabled: string[]): Record<string, number> {
  const map: Record<string, number> = { context: -1 }
  let step = 0
  if (enabled.includes('sharktank')) {
    ;['shark_intro', 'shark_prep', 'shark_record', 'shark_done'].forEach(s => { map[s] = step })
    step++
  }
  if (enabled.includes('roleplay')) {
    ;['roleplay_intro', 'roleplay_prep', 'roleplay_call', 'roleplay_done'].forEach(s => { map[s] = step })
    step++
  }
  if (enabled.includes('caso')) {
    ;['caso_intro', 'caso_question'].forEach(s => { map[s] = step })
    step++
  }
  if (enabled.includes('math')) {
    ;['math_intro', 'math_question'].forEach(s => { map[s] = step })
    step++
  }
  if (enabled.includes('cultural_fit')) {
    ;['cultural_fit_intro', 'cultural_fit_prep', 'cultural_fit_call', 'cultural_fit_done'].forEach(s => { map[s] = step })
    step++
  }
  map['completion'] = step
  return map
}

export function AssessmentShell({ config, clerkUser, cohortToken, cohortDeadline, personalizedTemplate }: Props) {
  // liveConfig allows cohort case assignment to update config after email submit
  const [liveConfig, setLiveConfig] = useState<AssessmentConfig>(config)
  const [state, dispatch] = useAssessmentState()
  const [warnModal,    setWarnModal]    = useState<{ title: string; msg: string } | null>(null)
  const [proctorScore, setProctorScore] = useState(0)
  const [savedFlash,   setSavedFlash]   = useState(false)   // "✓ Guardado" indicator
  const [elapsedSecs,  setElapsedSecs]  = useState(0)       // Global elapsed timer
  const proctorRef      = useRef<ReturnType<typeof useProctor> | null>(null)
  const snapTimersRef   = useRef<ReturnType<typeof setTimeout>[]>([])
  const snapStreamRef   = useRef<MediaStream | null>(null)
  const snapVideoRef    = useRef<HTMLVideoElement | null>(null)
  const startTimeRef    = useRef<number | null>(null)
  // Roleplay screen recording — started on prep screen, stopped when call ends
  const roleRecorderRef      = useRef<MediaRecorder | null>(null)
  const roleChunksRef        = useRef<Blob[]>([])
  const roleMimeRef          = useRef('video/webm')
  const roleCameraStreamRef  = useRef<MediaStream | null>(null)
  const roleScreenStreamRef  = useRef<MediaStream | null>(null)
  const vapiCallIdRef        = useRef<string | null>(null)  // set by RolePlayCallScreen
  // Pre-uploaded video paths — set immediately when each section ends, used in submitAll
  const roleplayVideoPathRef   = useRef<string | null>(null)
  const culturalFitVideoPathRef = useRef<string | null>(null)
  // Stable ref for candidate email so async handlers don't capture stale state
  const candidateEmailRef = useRef<string>('')
  useEffect(() => { candidateEmailRef.current = state.candidate?.email ?? '' }, [state.candidate?.email])
  // Cultural Fit screen recording
  const cfRecorderRef      = useRef<MediaRecorder | null>(null)
  const cfChunksRef        = useRef<Blob[]>([])
  const cfMimeRef          = useRef('video/webm')
  const cfCameraStreamRef  = useRef<MediaStream | null>(null)
  const cfScreenStreamRef  = useRef<MediaStream | null>(null)
  // Voice provider state
  const [candidatePhone, setCandidatePhone] = useState<string>('')
  // Roleplay case (injected from cohort)
  const [roleplayCase, setRoleplayCase] = useState<RoleplayCase | null>(null)
  const [roleplayBankCase, setRoleplayBankCase] = useState<import('@/types/assessment').RoleplayBankEntry | null>(null)

  // Spreadsheet math mode
  const spreadsheetVersion = useRef<'A' | 'B'>(
    (liveConfig.math_version === 'A' || liveConfig.math_version === 'B')
      ? liveConfig.math_version
      : randomVersion()
  )
  const spreadsheetAnswersRef  = useRef<SpreadsheetAnswer[]>([])
  const spreadsheetSecsLeftRef = useRef<number>(0)

  const enabled = liveConfig?.enabled_sections ?? ['sharktank', 'caso', 'math'] as SectionId[]
  const stepLabels = [
    ...(enabled.includes('sharktank') ? ['SharkTank'] : []),
    ...(enabled.includes('roleplay') ? ['Role Play'] : []),
    ...(enabled.includes('caso') ? ['Caso'] : []),
    ...(enabled.includes('math') ? ['Math'] : []),
    ...(enabled.includes('cultural_fit') ? ['Cultural Fit'] : []),
    'Listo',
  ]
  const stepColors = [
    ...(enabled.includes('sharktank') ? ['var(--red)'] : []),
    ...(enabled.includes('roleplay') ? ['#f59e0b'] : []),
    ...(enabled.includes('caso') ? ['var(--blue)'] : []),
    ...(enabled.includes('math') ? ['var(--teal)'] : []),
    ...(enabled.includes('cultural_fit') ? ['#a855f7'] : []),
    'var(--green)',
  ]
  const screenToStep = buildScreenToStep(enabled)

  const goFullscreen = useCallback(() => {
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    else if ((el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
      (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.()
    }
  }, [])

  const onWarning = useCallback((title: string, msg: string) => setWarnModal({ title, msg }), [])

  const proctor = useProctor({
    active: state.screen !== 'welcome' && state.screen !== 'context' && state.screen !== 'completion',
    currentScreen: state.screen,
    onWarning,
    goFullscreen,
  })
  proctorRef.current = proctor

  useEffect(() => {
    dispatch({ type: 'SET_CONFIG', config })
  }, [config, dispatch])

  useEffect(() => {
    if (state.screen === 'welcome' || state.screen === 'context') return
    const interval = setInterval(() => {
      setProctorScore(proctor.fraudScore())
    }, 3000)
    return () => clearInterval(interval)
  }, [state.screen, proctor])

  // ── Safeguard: force-stop screen recording when leaving roleplay/cultural-fit screens ──
  // This fires on every screen change. If the primary stop mechanism already ran, the refs
  // are null and this is a no-op. If it didn't (any failure path), this cleans up.
  useEffect(() => {
    const screen = state.screen
    const isRoleplayScreen = screen === 'roleplay_prep' || screen === 'roleplay_call'
    const isCfScreen       = screen === 'cultural_fit_prep' || screen === 'cultural_fit_call'

    if (!isRoleplayScreen) {
      roleScreenStreamRef.current?.getTracks().forEach(t => t.stop())
      roleScreenStreamRef.current = null
      if (roleRecorderRef.current && roleRecorderRef.current.state !== 'inactive') {
        try { roleRecorderRef.current.stop() } catch { /* ignore */ }
      }
    }

    if (!isCfScreen) {
      cfScreenStreamRef.current?.getTracks().forEach(t => t.stop())
      cfScreenStreamRef.current = null
      if (cfRecorderRef.current && cfRecorderRef.current.state !== 'inactive') {
        try { cfRecorderRef.current.stop() } catch { /* ignore */ }
      }
    }
  }, [state.screen])

  // Start elapsed timer when assessment begins (shark_intro onwards)
  useEffect(() => {
    if (state.screen === 'welcome' || state.screen === 'context' || state.screen === 'completion') return
    if (!startTimeRef.current) startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [state.screen])

  // Re-hydrate roleplayBankCase on mount if session was restored from localStorage.
  // roleplayBankCase is React state (not persisted), so a page reload loses it.
  // We call cohort-assign again using the restored candidate email to get it back.
  useEffect(() => {
    if (!cohortToken || !state.candidate?.email || state.screen === 'welcome') return
    fetch('/api/cohort-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cohortToken, email: state.candidate.email }),
    })
      .then(res => res.ok ? res.json() : null)
      .then((data: {
        roleplayBankCase?: import('@/types/assessment').RoleplayBankEntry | null
        roleplayCase?: RoleplayCase | null
      } | null) => {
        if (data?.roleplayBankCase) setRoleplayBankCase(data.roleplayBankCase)
        if (data?.roleplayCase) setRoleplayCase(data.roleplayCase)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount only

  // Flash "Guardado" for 2s whenever state changes (screen/answers)
  useEffect(() => {
    if (state.screen === 'welcome' || state.screen === 'completion') return
    setSavedFlash(true)
    const t = setTimeout(() => setSavedFlash(false), 2000)
    return () => clearTimeout(t)
  }, [state.screen, state.casoAnswers, state.mathAnswers]) // eslint-disable-line

  const takeSnap = useCallback(() => {
    const video = snapVideoRef.current
    if (!video || video.readyState < 2) return // not loaded yet
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 320; canvas.height = 240
      canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 240)
      const img = canvas.toDataURL('image/jpeg', 0.5)
      proctorRef.current?.addSnapshot(img)
    } catch {}
  }, [])

  const initSnapshots = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      snapStreamRef.current = stream

      // Create a persistent video element that stays playing for the duration
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      snapVideoRef.current = video
      await video.play()

      // Schedule snapshots every ~30s (with small random jitter ±5s)
      const totalDuration = 25 * 60 * 1000
      const baseInterval  = 30 * 1000
      let elapsed = baseInterval // first snap at ~30s
      while (elapsed < totalDuration) {
        const d = elapsed + (Math.random() * 10000 - 5000) // ±5s jitter
        const t = setTimeout(() => takeSnap(), Math.max(d, 5000))
        snapTimersRef.current.push(t)
        elapsed += baseInterval
      }
    } catch {}
  }, [takeSnap])

  const beginAssessment = useCallback(() => {
    goFullscreen()
    initSnapshots()
    const enabledSections = liveConfig.enabled_sections ?? ['sharktank', 'caso', 'math']
    if (enabledSections.includes('sharktank')) dispatch({ type: 'GO_SCREEN', screen: 'shark_intro' })
    else if (enabledSections.includes('roleplay')) dispatch({ type: 'GO_SCREEN', screen: 'roleplay_intro' })
    else if (enabledSections.includes('caso')) dispatch({ type: 'GO_SCREEN', screen: 'caso_intro' })
    else if (enabledSections.includes('math')) dispatch({ type: 'GO_SCREEN', screen: 'math_intro' })
    else if (enabledSections.includes('cultural_fit')) dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_intro' })
    else dispatch({ type: 'GO_SCREEN', screen: 'completion' })
  }, [goFullscreen, initSnapshots, dispatch, config])

  const handleCandidateSubmit = useCallback(async (candidate: CandidateInfo) => {
    dispatch({ type: 'SET_CANDIDATE', candidate })

    // Always call cohort-assign when a token is present — it returns roleplayBankCase,
    // casoBankEntry, and enabledSections. This is idempotent (upserts the member row).
    if (cohortToken) {
      try {
        const res = await fetch('/api/cohort-assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: cohortToken, email: candidate.email }),
        })
        if (res.ok) {
          const data = await res.json() as {
            casoBankEntry: import('@/types/assessment').CasoBankEntry | null
            enabledSections: string[] | null
            mathModeOverride: 'questions' | 'spreadsheet' | null
            voiceProviderOverride: 'vapi' | 'arbol' | null
            roleplayCase: RoleplayCase | null
            roleplayBankCase: import('@/types/assessment').RoleplayBankEntry | null
          }
          if (data.roleplayCase) setRoleplayCase(data.roleplayCase)
          if (data.roleplayBankCase) setRoleplayBankCase(data.roleplayBankCase)
          if (data.casoBankEntry || data.enabledSections || data.mathModeOverride || data.voiceProviderOverride) {
            const bankEntry = data.casoBankEntry
            const newSections = (data.enabledSections as import('@/lib/challenges').SectionId[] | null)
              ?? liveConfig.enabled_sections
            const syntheticQ: import('@/types/assessment').Question | null = bankEntry ? {
              id: `bank-${bankEntry.id}`,
              section: 'caso',
              position: 0,
              content: bankEntry.question,
              sub_label: null,
              placeholder: 'Desarrolla tu respuesta con datos, análisis y plan de acción concreto...',
              time_seconds: 900,
              difficulty: 'hard',
              points: 100,
              correct_answer: null,
              is_honeypot: false,
              is_flex_answer: false,
              show_data: true,
              question_type: 'free_text',
            } : null
            const mathQs = liveConfig.questions.filter(q => q.section === 'math')
            const casoQs = bankEntry && syntheticQ
              ? [syntheticQ]
              : liveConfig.questions.filter(q => q.section === 'caso')
            setLiveConfig(prev => ({
              ...prev,
              enabled_sections: newSections ?? prev.enabled_sections,
              caso_bank_entry: bankEntry ?? prev.caso_bank_entry,
              questions: [...casoQs, ...mathQs],
              ...(data.mathModeOverride ? { math_mode: data.mathModeOverride } : {}),
              ...(data.voiceProviderOverride ? { voice_provider: data.voiceProviderOverride } : {}),
            }))
          }
        }
      } catch {
        // Cohort assign failed silently — continue with current config
      }
    }

    dispatch({ type: 'GO_SCREEN', screen: 'context' })
  }, [dispatch, cohortToken, liveConfig])

  const submitAll = useCallback(async (inlineSpreadsheetAnswers?: SpreadsheetAnswer[]) => {
    dispatch({ type: 'SET_SUBMITTING', value: true })
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    snapTimersRef.current.forEach(t => clearTimeout(t))
    snapStreamRef.current?.getTracks().forEach(t => t.stop())
    if (snapVideoRef.current) { snapVideoRef.current.pause(); snapVideoRef.current.srcObject = null }

    const proctoringData = proctor.getData()
    const isSpreadsheetMode = liveConfig.math_mode === 'spreadsheet'
    let correct: number, total: number, mathPct: number, honeypotFails: number, details: ReturnType<typeof scoreMath>['details'], mathTimeSecs: number | null
    if (isSpreadsheetMode) {
      // Personalized template (employee test) takes precedence over the default A/B version
      const tmpl = personalizedTemplate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (personalizedTemplate.template as any)
        : getSpreadsheetVersion(spreadsheetVersion.current)
      const secsLeft  = spreadsheetSecsLeftRef.current
      const ssResult  = scoreMathSpreadsheet(tmpl, inlineSpreadsheetAnswers ?? spreadsheetAnswersRef.current, secsLeft, 600)
      correct = ssResult.correct; total = ssResult.total; mathPct = ssResult.pct
      mathTimeSecs  = 600 - secsLeft   // seconds used
      honeypotFails = 0
      details = ssResult.details.map((d, i) => ({ idx: i, correct: d.correct, pointsAwarded: d.correct ? 1 : 0, got: d.got }))
    } else {
      const mathQs = liveConfig.questions.filter(q => q.section === 'math').sort((a, b) => a.position - b.position)
      const r = scoreMath(mathQs, state.mathAnswers)
      correct = r.correct; total = r.total; mathPct = r.pct; honeypotFails = r.honeypotFails; details = r.details
      mathTimeSecs = null
    }
    const { answered, pct: casoPct } = scoreCaso(state.casoAnswers, casoQuestions.length || 4)
    const overall = calcOverall(state.videoRecorded, casoPct, mathPct, liveConfig.enabled_sections)

    proctoringData.honeypot_fails = honeypotFails
    const fs = fraudScore(proctoringData)
    const fl = fraudLevel(fs)

    try {
      // Video uploads — each is independent; a failure in one is logged and the submission
      // proceeds with null path for that section (preserving prior silent-failure semantics
      // but with stronger retry via uploadVideoAtomic: 3 attempts + exponential backoff).
      let videoPath: string | null = null
      if (state.videoBlob) {
        try {
          videoPath = await uploadVideoAtomic({
            blob: state.videoBlob,
            mimeType: state.videoMimeType,
            candidateEmail: state.candidate.email,
            label: 'SharkTank',
          })
        } catch (uploadErr) {
          console.error('[upload] SharkTank final failure:', uploadErr)
        }
      }

      // Prefer the pre-uploaded path (set immediately when roleplay ended).
      // Fall back to uploading from blob if the early upload failed or was skipped.
      let roleplayVideoPath: string | null = roleplayVideoPathRef.current
      if (!roleplayVideoPath && state.roleplayVideoBlob) {
        try {
          roleplayVideoPath = await uploadVideoAtomic({
            blob: state.roleplayVideoBlob,
            mimeType: state.roleplayVideoMimeType,
            section: 'roleplay',
            candidateEmail: state.candidate.email,
            label: 'RolePlay (fallback)',
          })
          console.log('[submitAll] RolePlay fallback upload success')
        } catch (uploadErr) {
          console.error('[upload] RolePlay final failure (both early + fallback failed):', uploadErr)
        }
      } else if (roleplayVideoPath) {
        console.log('[submitAll] using pre-uploaded roleplay path:', roleplayVideoPath)
      }

      let culturalFitVideoPath: string | null = culturalFitVideoPathRef.current
      if (!culturalFitVideoPath && state.culturalFitVideoBlob) {
        try {
          culturalFitVideoPath = await uploadVideoAtomic({
            blob: state.culturalFitVideoBlob,
            mimeType: state.culturalFitVideoMimeType,
            section: 'cultural_fit',
            candidateEmail: state.candidate.email,
            label: 'CulturalFit (fallback)',
          })
          console.log('[submitAll] CulturalFit fallback upload success')
        } catch (uploadErr) {
          console.error('[upload] CulturalFit final failure (both early + fallback failed):', uploadErr)
        }
      } else if (culturalFitVideoPath) {
        console.log('[submitAll] using pre-uploaded cultural_fit path:', culturalFitVideoPath)
      }

      const snapshotResults = await Promise.all(
        proctoringData.snapshots.map(async (snap, i) => {
          try {
            const snapRes = await fetch('/api/snapshot-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ candidateEmail: state.candidate.email, index: i + 1 }),
            })
            if (!snapRes.ok) return null
            const { signedUrl, path } = await snapRes.json()
            if (!snap?.img) return null
            const blob = await (await fetch(snap.img)).blob()
            await fetch(signedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } })
            return path as string
          } catch {
            return null // never let a snapshot failure break the submission
          }
        })
      )
      const snapshotPaths = snapshotResults.filter((p): p is string => p !== null)

      const submissionBody = JSON.stringify({
        candidate: state.candidate, configId: liveConfig.id,
        clerkUserId: clerkUser?.id ?? null,
        videoPath, videoMimeType: state.videoMimeType, videoRecorded: state.videoRecorded,
        roleplayCompleted: state.roleplayCompleted, roleplayVideoPath, roleplayTranscript: state.roleplayTranscript,
        roleplayBankCaseId: roleplayBankCase?.id ?? null,
        culturalFitCompleted: state.culturalFitCompleted, culturalFitVideoPath,
        mathScoreRaw: correct, mathScoreTotal: total, mathScorePct: mathPct,
        mathTimeSecs,
        casoAnsweredCount: answered, casoScorePct: casoPct, overallScorePct: overall,
        casoAnswers: state.casoAnswers, casoTimings: state.casoTimings,
        mathAnswers: state.mathAnswers, mathTimings: state.mathTimings, mathDetails: details,
        mathMode: liveConfig.math_mode ?? 'questions',
        mathSpreadsheetVersion: isSpreadsheetMode ? spreadsheetVersion.current : null,
        personalizedTemplateId: personalizedTemplate?.templateId ?? null,
        proctoring: (({ snapshots: _s, ...rest }) => ({ ...rest, fraud_score: fs, fraud_level: fl }))(proctoringData),
        snapshotPaths,
      })

      // Retry up to 3 attempts on network error or 5xx (dedup guard on server makes retries safe)
      let submitRes: Response | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt)) // 0s, 2s, 4s backoff
        try {
          submitRes = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: submissionBody,
          })
          if (submitRes.ok || submitRes.status < 500) break // success or 4xx (no retry on 4xx)
          console.warn(`Submission attempt ${attempt + 1} failed with ${submitRes.status}, retrying…`)
        } catch (fetchErr) {
          console.warn(`Submission attempt ${attempt + 1} network error:`, fetchErr)
          if (attempt === 2) throw fetchErr // exhausted retries
        }
      }

      if (!submitRes || !submitRes.ok) {
        const errBody = await submitRes?.json().catch(() => ({})) ?? {}
        console.error('Submission API error:', submitRes?.status, errBody)
        throw new Error(errBody?.error || 'Error al guardar')
      }

      const submitData = await submitRes.json()
      if (submitData?.submissionId) {
        const id = submitData.submissionId
        fetch('/api/evaluate-caso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: id }),
        }).catch(() => {})
        // Auto-trigger SharkTank transcription + poll to completion
        if (state.videoRecorded) {
          fetch('/api/evaluate-sharktank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId: id }),
          }).then(async r => {
            if (!r.ok) return
            const data = await r.json()
            if (!data.pending || !data.evalId) return
            // Poll every 5s for up to 5 minutes to drive transcription → eval to completion
            let attempts = 0
            const poll = setInterval(async () => {
              attempts++
              if (attempts > 60) { clearInterval(poll); return }
              try {
                const gr = await fetch(`/api/evaluate-sharktank?evalId=${data.evalId}`)
                const gd = await gr.json()
                if (gd.eval_status === 'completed' || gd.eval_status === 'error') {
                  clearInterval(poll)
                }
              } catch { /* ignore */ }
            }, 5000)
          }).catch(() => {})
        }
      }

      clearSession()
      dispatch({ type: 'SET_SUBMITTED', code: submitData?.submissionId || undefined })
    } catch {
      dispatch({ type: 'SET_SUBMIT_ERROR', error: 'Hubo un error guardando tus respuestas. Contacta a RRHH.' })
    }
  }, [state, config, proctor, dispatch])

  const handleCulturalFitStart = useCallback(() => {
    dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_prep' })
  }, [dispatch])

  const handleCulturalFitCallStart = useCallback((
    recorder: MediaRecorder,
    chunks: Blob[],
    mimeType: string,
    cameraStream: MediaStream | null,
    screenStream: MediaStream | null,
  ) => {
    cfRecorderRef.current      = recorder
    cfChunksRef.current        = chunks
    cfMimeRef.current          = mimeType
    cfCameraStreamRef.current  = cameraStream
    cfScreenStreamRef.current  = screenStream
    dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_call' })
  }, [dispatch])

  const handleCulturalFitDone = useCallback(() => {
    const recorder = cfRecorderRef.current

    const collectAndFinish = async () => {
      const blob = cfChunksRef.current.length > 0
        ? new Blob(cfChunksRef.current, { type: cfMimeRef.current })
        : null

      // Upload immediately so the path is safe before submitAll runs
      if (blob && candidateEmailRef.current) {
        try {
          const path = await uploadVideoAtomic({
            blob,
            mimeType: cfMimeRef.current,
            section: 'cultural_fit',
            candidateEmail: candidateEmailRef.current,
            label: 'CulturalFit (early upload)',
          })
          culturalFitVideoPathRef.current = path
          console.log('[cultural_fit] early upload success:', path)
        } catch (uploadErr) {
          console.error('[cultural_fit] early upload failed — will retry in submitAll:', uploadErr)
        }
      }

      dispatch({ type: 'SET_CULTURAL_FIT_DONE', videoBlob: blob, mimeType: cfMimeRef.current })
      dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_done' })
    }

    const stopAllTracks = () => {
      // Stop camera/mic tracks
      cfCameraStreamRef.current?.getTracks().forEach(t => t.stop())
      cfCameraStreamRef.current = null
      // Stop screen capture directly via stored ref (most reliable cross-browser)
      cfScreenStreamRef.current?.getTracks().forEach(t => t.stop())
      cfScreenStreamRef.current = null
      // Also stop via recorder.stream as belt-and-suspenders
      recorder?.stream?.getTracks().forEach(t => t.stop())
    }

    if (recorder && recorder.state !== 'inactive') {
      let finished = false
      recorder.onstop = () => {
        if (finished) return
        finished = true
        stopAllTracks()
        collectAndFinish()
      }
      setTimeout(() => {
        if (!finished) { finished = true; stopAllTracks(); collectAndFinish() }
      }, 3000)
      try { recorder.stop() } catch { if (!finished) { finished = true; stopAllTracks(); collectAndFinish() } }
    } else {
      stopAllTracks()
      collectAndFinish()
    }
  }, [dispatch])

  const handleCulturalFitNext = useCallback(() => {
    dispatch({ type: 'GO_SCREEN', screen: 'completion' })
    submitAll()
  }, [dispatch, submitAll])

  const handleRolePlayStart = useCallback(() => {
    dispatch({ type: 'GO_SCREEN', screen: 'roleplay_prep' })
  }, [dispatch])

  // Called by RolePlayPrepScreen once screen recording is active
  const handleRolePlayCallStart = useCallback((
    recorder: MediaRecorder,
    chunks: Blob[],
    mimeType: string,
    cameraStream: MediaStream | null,
    screenStream: MediaStream | null,
  ) => {
    roleRecorderRef.current      = recorder
    roleChunksRef.current        = chunks   // same array reference — new chunks keep accumulating
    roleMimeRef.current          = mimeType
    roleCameraStreamRef.current  = cameraStream
    roleScreenStreamRef.current  = screenStream
    dispatch({ type: 'GO_SCREEN', screen: 'roleplay_call' })
  }, [dispatch])

  // Called by RolePlayCallScreen when the 5-min call timer ends
  const handleRolePlayDone = useCallback((vapiCallId?: string | null) => {
    const recorder = roleRecorderRef.current
    // Store callId so we can fetch transcript
    if (vapiCallId) vapiCallIdRef.current = vapiCallId

    const collectAndFinish = async () => {
      // Always collect whatever chunks we have, even if recorder stopped early
      const blob = roleChunksRef.current.length > 0
        ? new Blob(roleChunksRef.current, { type: roleMimeRef.current })
        : null

      // ── Upload video immediately — don't wait until final submitAll ──────
      // Uploading here means the video is safe even if the page reloads or the
      // network is flaky later during math/cultural-fit sections.
      if (blob && candidateEmailRef.current) {
        try {
          const path = await uploadVideoAtomic({
            blob,
            mimeType: roleMimeRef.current,
            section: 'roleplay',
            candidateEmail: candidateEmailRef.current,
            label: 'RolePlay (early upload)',
          })
          roleplayVideoPathRef.current = path
          console.log('[roleplay] early upload success:', path)
        } catch (uploadErr) {
          console.error('[roleplay] early upload failed — will retry in submitAll:', uploadErr)
          // Don't abort — keep blob in state for fallback upload in submitAll
        }
      }

      // Fetch Vapi transcript (both sides) — poll up to 3 attempts with 5s delay.
      // Vapi may need a few seconds to finalize the transcript after call-end.
      let vapiTranscript: string | null = null
      if (vapiCallIdRef.current) {
        const callIdForTranscript = vapiCallIdRef.current
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 5000))
            const res = await fetch(`/api/vapi-transcript?callId=${callIdForTranscript}`)
            if (res.ok) {
              const data = await res.json()
              if (data.transcript) {
                vapiTranscript = data.transcript
                break // got it — stop polling
              }
            }
          } catch {
            // Non-fatal — transcript will be generated later via AssemblyAI
          }
        }
      }

      dispatch({ type: 'SET_ROLEPLAY_DONE', videoBlob: blob, mimeType: roleMimeRef.current, transcript: vapiTranscript })
      dispatch({ type: 'GO_SCREEN', screen: 'roleplay_done' })
    }

    // Stop ALL tracks: camera/mic + screen capture (releases "sharing screen" indicator)
    const stopAllTracks = () => {
      roleCameraStreamRef.current?.getTracks().forEach(t => t.stop())
      roleCameraStreamRef.current = null
      // Stop screen capture directly via stored ref (most reliable cross-browser)
      roleScreenStreamRef.current?.getTracks().forEach(t => t.stop())
      roleScreenStreamRef.current = null
      // Also stop via recorder.stream as belt-and-suspenders
      recorder?.stream?.getTracks().forEach(t => t.stop())
    }

    if (recorder && recorder.state !== 'inactive') {
      let finished = false
      recorder.onstop = () => {
        if (finished) return
        finished = true
        stopAllTracks()
        collectAndFinish()
      }
      // Safety fallback: if onstop never fires within 3s, collect anyway
      setTimeout(() => {
        if (!finished) { finished = true; stopAllTracks(); collectAndFinish() }
      }, 3000)
      try { recorder.stop() } catch { if (!finished) { finished = true; stopAllTracks(); collectAndFinish() } }
    } else {
      // Recorder already stopped (e.g. user stopped screen share mid-call)
      stopAllTracks()
      collectAndFinish()
    }
  }, [dispatch])

  const handleRolePlayNext = useCallback(() => {
    const enabledSections = liveConfig.enabled_sections ?? ['sharktank', 'caso', 'math', 'roleplay']
    if (enabledSections.includes('caso')) dispatch({ type: 'GO_SCREEN', screen: 'caso_intro' })
    else if (enabledSections.includes('math')) dispatch({ type: 'GO_SCREEN', screen: 'math_intro' })
    else if (enabledSections.includes('cultural_fit')) dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_intro' })
    else { dispatch({ type: 'GO_SCREEN', screen: 'completion' }); submitAll() }
  }, [config, dispatch, submitAll])

  const casoQuestions = liveConfig.questions.filter(q => q.section === 'caso').sort((a, b) => a.position - b.position)
  const mathQuestions = liveConfig.questions.filter(q => q.section === 'math').sort((a, b) => a.position - b.position)

  const handleCasoNext = useCallback((value: string, timeSpent: number) => {
    const q = casoQuestions[state.casoIdx]
    if (q) dispatch({ type: 'SET_CASO_ANSWER', idx: state.casoIdx, questionId: q.id, value, timeSpent })
    if (state.casoIdx + 1 >= casoQuestions.length) {
      const enabledSections = liveConfig.enabled_sections ?? ['sharktank', 'caso', 'math']
      if (enabledSections.includes('math')) {
        dispatch({ type: 'GO_SCREEN', screen: 'math_intro' })
      } else if (enabledSections.includes('cultural_fit')) {
        dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_intro' })
      } else {
        dispatch({ type: 'GO_SCREEN', screen: 'completion' })
        submitAll()
      }
    } else {
      dispatch({ type: 'NEXT_CASO' })
    }
  }, [state.casoIdx, casoQuestions, dispatch, config, submitAll])

  const handleMathNext = useCallback((value: string, timeSpent: number) => {
    dispatch({ type: 'SET_MATH_ANSWER', idx: state.mathIdx, value })
    dispatch({ type: 'RECORD_MATH_TIMING', idx: state.mathIdx, timeSpent })
    if (state.mathIdx + 1 >= mathQuestions.length) {
      const enabledSections = liveConfig.enabled_sections ?? ['sharktank', 'caso', 'math']
      if (enabledSections.includes('cultural_fit')) {
        dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_intro' })
      } else {
        dispatch({ type: 'GO_SCREEN', screen: 'completion' })
        submitAll()
      }
    } else {
      dispatch({ type: 'NEXT_MATH' })
    }
  }, [state.mathIdx, mathQuestions.length, dispatch, submitAll])

  const isAssessmentActive = !['welcome', 'context', 'completion'].includes(state.screen)
  const currentStep = screenToStep[state.screen] ?? -1

  return (
    <>
      {/* ── Atmospheric background layers ── */}
      {/* Noise grain */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
        opacity: 1,
      }} />
      {/* Ambient glow orbs */}
      <div style={{ position: 'fixed', width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none', zIndex: 0, filter: 'blur(140px)', background: 'rgba(224,53,84,.07)', top: -200, right: -180, animation: 'orb-drift 18s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', width: 700, height: 700, borderRadius: '50%', pointerEvents: 'none', zIndex: 0, filter: 'blur(140px)', background: 'rgba(61,85,232,.05)', bottom: -250, left: -200, animation: 'orb-drift 22s ease-in-out infinite reverse' }} />
      <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none', zIndex: 0, filter: 'blur(100px)', background: 'rgba(0,196,158,.04)', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'orb-drift 26s ease-in-out infinite 4s' }} />

      <ProctoringBadge fraudScore={proctorScore} visible={isAssessmentActive} />

      {/* ── Warning modal ── */}
      {warnModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 40px',
          background: 'rgba(6,6,13,.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
          <div style={{
            maxWidth: 480, padding: '48px 40px',
            background: 'var(--card)', border: '1px solid rgba(224,53,84,.3)',
            borderRadius: 24,
            boxShadow: '0 0 60px rgba(224,53,84,.18), inset 0 1px 0 rgba(255,255,255,.06)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, marginBottom: 14, color: '#f07090' }}>
              {warnModal.title}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--dim)', marginBottom: 28, lineHeight: 1.7 }}>{warnModal.msg}</p>
            <button
              onClick={() => { setWarnModal(null); goFullscreen() }}
              style={{
                padding: '13px 32px',
                background: 'linear-gradient(140deg,#e03554,#c22448)',
                color: '#fff', borderRadius: 'var(--rs)',
                fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
                letterSpacing: '.3px', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(224,53,84,.35)',
              }}
            >
              Entendido — Continuar
            </button>
          </div>
        </div>
      )}

      {/* ── Header (hidden on welcome) ── */}
      {state.screen !== 'welcome' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: 28, marginBottom: 52,
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(140deg,#e03554,#c22448)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 12px rgba(224,53,84,.35)',
              fontSize: 14, fontWeight: 900, color: '#fff',
              fontFamily: 'Fraunces, serif',
            }}>R</div>
            <div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.3px', lineHeight: 1 }}>
                Rappi
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'JetBrains Mono, Space Mono, monospace', letterSpacing: '.5px', lineHeight: 1, marginTop: 2 }}>
                Assessment Center
              </div>
            </div>
          </div>

          {/* Right side: elapsed time + saved indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Elapsed timer */}
            {elapsedSecs > 0 && (
              <div style={{
                fontFamily: 'JetBrains Mono, Space Mono, monospace',
                fontSize: 11, color: 'var(--muted)', letterSpacing: '.5px',
              }}>
                {String(Math.floor(elapsedSecs / 60)).padStart(2, '0')}:
                {String(elapsedSecs % 60).padStart(2, '0')}
              </div>
            )}
            {/* Session saved flash */}
            <div style={{
              fontSize: 10.5,
              fontFamily: 'JetBrains Mono, Space Mono, monospace',
              letterSpacing: '.5px',
              color: 'var(--teal)',
              opacity: savedFlash ? 1 : 0,
              transition: 'opacity .4s ease',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>✓</span> Guardado
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {/* "Sección X de Y" text — only when assessment is active */}
            {currentStep >= 0 && currentStep < stepLabels.length - 1 && (
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '.3px',
              }}>
                Sección <strong style={{ color: 'var(--text)' }}>{currentStep + 1}</strong> de{' '}
                <strong style={{ color: 'var(--text)' }}>{stepLabels.length - 1}</strong>
              </div>
            )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {stepLabels.map((label, i) => {
              const isActive   = i === currentStep
              const isComplete = i < currentStep
              const isHidden   = currentStep < 0
              if (isHidden && i > 0) return null
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px 5px 7px',
                    borderRadius: 100,
                    background: isActive
                      ? `${stepColors[i]}18`
                      : isComplete ? 'rgba(0,214,138,.1)' : 'transparent',
                    border: `1px solid ${isActive ? `${stepColors[i]}30` : isComplete ? 'rgba(0,214,138,.2)' : 'var(--border)'}`,
                    transition: 'all .4s ease',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: isActive ? stepColors[i] : isComplete ? 'var(--green)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700,
                      color: isActive || isComplete ? '#fff' : 'var(--muted)',
                      transition: 'all .4s ease',
                      fontFamily: 'JetBrains Mono, Space Mono, monospace',
                    }}>
                      {isComplete ? '✓' : i + 1}
                    </div>
                    <span style={{
                      fontSize: 10.5, fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 500,
                      color: isActive ? 'var(--text)' : isComplete ? 'var(--green)' : 'var(--muted)',
                      letterSpacing: '.2px',
                      transition: 'color .4s ease',
                    }}>
                      {label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div style={{ width: 12, height: 1, background: 'var(--border)' }} />
                  )}
                </div>
              )
            })}
          </div>
          </div>
        </div>
      )}

      {/* ── Screen router ── */}
      {state.screen === 'welcome' && <WelcomeScreen onSubmit={handleCandidateSubmit} clerkUser={clerkUser} cohortDeadline={cohortDeadline} />}
      {state.screen === 'context' && <ContextScreen name={state.candidate.name} onStart={beginAssessment} enabledSections={liveConfig.enabled_sections} />}
      {state.screen === 'shark_intro' && <SharkIntroScreen onStart={() => dispatch({ type: 'GO_SCREEN', screen: 'shark_prep' })} />}
      {state.screen === 'shark_prep' && <SharkPrepScreen scenario={liveConfig.shark_scenario} onReady={() => dispatch({ type: 'GO_SCREEN', screen: 'shark_record' })} />}
      {state.screen === 'shark_record' && (
        <SharkRecordScreen
          scenario={liveConfig.shark_scenario}
          onDone={(blob, mimeType) => {
            dispatch({ type: 'SET_VIDEO', blob, mimeType })
            dispatch({ type: 'GO_SCREEN', screen: 'shark_done' })
          }}
        />
      )}
      {state.screen === 'shark_done' && (
        <SharkDoneScreen videoBlob={state.videoBlob} onNext={() => {
        const enabledSections = liveConfig.enabled_sections ?? ['sharktank', 'caso', 'math']
        if (enabledSections.includes('roleplay')) dispatch({ type: 'GO_SCREEN', screen: 'roleplay_intro' })
        else if (enabledSections.includes('caso')) dispatch({ type: 'GO_SCREEN', screen: 'caso_intro' })
        else if (enabledSections.includes('math')) dispatch({ type: 'GO_SCREEN', screen: 'math_intro' })
        else if (enabledSections.includes('cultural_fit')) dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_intro' })
        else { dispatch({ type: 'GO_SCREEN', screen: 'completion' }); submitAll() }
      }} />
      )}
      {state.screen === 'roleplay_intro' && <RolePlayIntroScreen onStart={handleRolePlayStart} roleplayBankCase={roleplayBankCase} />}
      {state.screen === 'roleplay_prep' && <RolePlayPrepScreen onReady={handleRolePlayCallStart} voiceProvider={liveConfig.voice_provider ?? 'vapi'} onPhoneCapture={setCandidatePhone} roleplayCase={roleplayCase} roleplayBankCase={roleplayBankCase} />}
      {state.screen === 'roleplay_call' && <RolePlayCallScreen onDone={handleRolePlayDone} cameraStream={roleCameraStreamRef.current} voiceProvider={liveConfig.voice_provider ?? 'vapi'} candidatePhone={candidatePhone || undefined} roleplayCase={roleplayCase} roleplayBankCase={roleplayBankCase} />}
      {state.screen === 'roleplay_done' && <RolePlayDoneScreen onNext={handleRolePlayNext} />}
      {state.screen === 'caso_intro' && (
        <CasoIntroScreen
          onStart={() => dispatch({ type: 'GO_SCREEN', screen: 'caso_question' })}
          casoBankEntry={liveConfig.caso_bank_entry ?? null}
        />
      )}
      {state.screen === 'caso_question' && casoQuestions[state.casoIdx] && (
        <CasoQuestionScreen
          key={state.casoIdx}
          question={casoQuestions[state.casoIdx]}
          idx={state.casoIdx}
          total={casoQuestions.length}
          casoContext={liveConfig.caso_context}
          casoBankEntry={liveConfig.caso_bank_entry ?? null}
          initialValue={state.casoAnswers[casoQuestions[state.casoIdx].id] || ''}
          onNext={handleCasoNext}
        />
      )}
      {state.screen === 'math_intro' && (
        liveConfig.math_mode === 'spreadsheet'
          ? <MathIntroScreen mathContext={liveConfig.math_context} isSpreadsheet onStart={() => dispatch({ type: 'GO_SCREEN', screen: 'math_question' })} />
          : <MathIntroScreen mathContext={liveConfig.math_context} onStart={() => dispatch({ type: 'GO_SCREEN', screen: 'math_question' })} />
      )}
      {state.screen === 'math_question' && liveConfig.math_mode === 'spreadsheet' && (
        <MathSpreadsheetScreen
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          template={personalizedTemplate ? (personalizedTemplate.template as any) : getSpreadsheetVersion(spreadsheetVersion.current)}
          candidateEmail={state.candidate.email}
          onDone={(answers, secsLeft) => {
            spreadsheetAnswersRef.current  = answers
            spreadsheetSecsLeftRef.current = secsLeft
            const enabledSections = liveConfig.enabled_sections ?? ['sharktank', 'caso', 'math']
            if (enabledSections.includes('cultural_fit')) {
              dispatch({ type: 'GO_SCREEN', screen: 'cultural_fit_intro' })
            } else {
              dispatch({ type: 'GO_SCREEN', screen: 'completion' })
              submitAll(answers)
            }
          }}
        />
      )}
      {state.screen === 'math_question' && liveConfig.math_mode !== 'spreadsheet' && mathQuestions[state.mathIdx] && (
        <MathQuestionScreen
          key={state.mathIdx}
          question={mathQuestions[state.mathIdx]}
          idx={state.mathIdx}
          total={mathQuestions.length}
          initialValue={state.mathAnswers[state.mathIdx] || ''}
          mathContext={liveConfig.math_context}
          onNext={handleMathNext}
        />
      )}
      {state.screen === 'cultural_fit_intro' && <CulturalFitIntroScreen onStart={handleCulturalFitStart} />}
      {state.screen === 'cultural_fit_prep' && <CulturalFitPrepScreen onReady={handleCulturalFitCallStart} />}
      {state.screen === 'cultural_fit_call' && <CulturalFitCallScreen onDone={handleCulturalFitDone} cameraStream={cfCameraStreamRef.current} />}
      {state.screen === 'cultural_fit_done' && <CulturalFitDoneScreen onNext={handleCulturalFitNext} />}
      {state.screen === 'completion' && (
        <CompletionScreen name={state.candidate.name} submitting={state.submitting} error={state.submitError} confirmationCode={state.confirmationCode} />
      )}

      {/* ── Support contact footer — shown only on informational / prep screens ── */}
      {[
        'context',
        'shark_intro', 'shark_prep', 'shark_done',
        'roleplay_intro', 'roleplay_prep', 'roleplay_done',
        'caso_intro',
        'math_intro',
        'cultural_fit_intro', 'cultural_fit_prep', 'cultural_fit_done',
        'completion',
      ].includes(state.screen) && (
        <div style={{
          marginTop: 48, paddingTop: 16,
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 11.5,
            fontFamily: 'Inter, DM Sans, sans-serif',
            color: 'var(--muted)',
            margin: 0,
            lineHeight: 1.6,
          }}>
            ¿Tienes problemas técnicos? Escríbenos a{' '}
            <a
              href="mailto:tomas.giraldo@rappi.com"
              style={{ color: 'var(--dim)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
            >
              tomas.giraldo@rappi.com
            </a>
          </p>
        </div>
      )}
    </>
  )
}
