'use client'

import { useReducer, useEffect } from 'react'
import type { AssessmentState, AssessmentAction } from '@/types/assessment'

const SESSION_KEY = 'rappi_assessment_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

type PersistedState = Pick<AssessmentState,
  'screen' | 'candidate' | 'videoRecorded' | 'videoMimeType' |
  'roleplayCompleted' |
  'casoIdx' | 'casoAnswers' | 'casoTimings' |
  'mathIdx' | 'mathAnswers' | 'mathTimings'
>

function saveSession(state: AssessmentState) {
  if (typeof window === 'undefined') return
  if (state.screen === 'welcome' || state.submitted) return
  try {
    const persisted: PersistedState & { savedAt: number } = {
      screen: state.screen,
      candidate: state.candidate,
      videoRecorded: state.videoRecorded,
      videoMimeType: state.videoMimeType,
      roleplayCompleted: state.roleplayCompleted,
      casoIdx: state.casoIdx,
      casoAnswers: state.casoAnswers,
      casoTimings: state.casoTimings,
      mathIdx: state.mathIdx,
      mathAnswers: state.mathAnswers,
      mathTimings: state.mathTimings,
      savedAt: Date.now(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(persisted))
  } catch {}
}

function loadSession(): Partial<PersistedState> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.savedAt || Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY)
}

const initialState: AssessmentState = {
  screen: 'welcome',
  candidate: { name: '', email: '', cedula: '' },
  config: null,
  submissionId: null,
  candidateId: null,
  videoBlob: null,
  videoMimeType: 'video/webm',
  videoRecorded: false,
  roleplayCompleted: false,
  roleplayVideoBlob: null,
  roleplayVideoMimeType: 'video/webm',
  casoIdx: 0,
  casoAnswers: {},
  casoTimings: {},
  mathIdx: 0,
  mathAnswers: {},
  mathTimings: {},
  submitting: false,
  submitted: false,
  submitError: null,
  confirmationCode: null,
}

function reducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.config }
    case 'SET_CANDIDATE':
      return { ...state, candidate: action.candidate }
    case 'SET_SUBMISSION_IDS':
      return { ...state, submissionId: action.submissionId, candidateId: action.candidateId }
    case 'GO_SCREEN':
      return { ...state, screen: action.screen }
    case 'SET_VIDEO':
      return { ...state, videoBlob: action.blob, videoMimeType: action.mimeType, videoRecorded: true }
    case 'SET_ROLEPLAY_DONE':
      return { ...state, roleplayCompleted: true, roleplayVideoBlob: action.videoBlob, roleplayVideoMimeType: action.mimeType }
    case 'SET_CASO_ANSWER':
      return {
        ...state,
        casoAnswers: { ...state.casoAnswers, [action.questionId]: action.value },
        casoTimings: { ...state.casoTimings, [action.idx]: action.timeSpent },
      }
    case 'NEXT_CASO':
      return { ...state, casoIdx: state.casoIdx + 1 }
    case 'SET_MATH_ANSWER':
      return { ...state, mathAnswers: { ...state.mathAnswers, [action.idx]: action.value } }
    case 'RECORD_MATH_TIMING':
      return { ...state, mathTimings: { ...state.mathTimings, [action.idx]: action.timeSpent } }
    case 'NEXT_MATH':
      return { ...state, mathIdx: state.mathIdx + 1 }
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.value }
    case 'SET_SUBMITTED':
      return { ...state, submitted: true, submitting: false, confirmationCode: action.code ?? null }
    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.error, submitting: false }
    default:
      return state
  }
}

function getInitialState(): AssessmentState {
  const saved = loadSession()
  if (!saved || !saved.candidate?.email) return initialState
  // Restore persisted fields — video blob is gone, but answers are preserved
  return {
    ...initialState,
    screen: saved.screen ?? 'welcome',
    candidate: saved.candidate ?? initialState.candidate,
    videoRecorded: false, // blob is gone after reload — will need to re-record
    videoMimeType: saved.videoMimeType ?? 'video/webm',
    roleplayCompleted: saved.roleplayCompleted ?? false,
    casoIdx: saved.casoIdx ?? 0,
    casoAnswers: saved.casoAnswers ?? {},
    casoTimings: saved.casoTimings ?? {},
    mathIdx: saved.mathIdx ?? 0,
    mathAnswers: saved.mathAnswers ?? {},
    mathTimings: saved.mathTimings ?? {},
  }
}

export function useAssessmentState() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)

  useEffect(() => {
    saveSession(state)
  }, [state])

  return [state, dispatch] as const
}
