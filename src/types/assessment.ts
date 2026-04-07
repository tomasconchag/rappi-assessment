import type { SectionId } from '@/lib/challenges'

export type Screen =
  | 'welcome'
  | 'context'
  | 'shark_intro'
  | 'shark_prep'
  | 'shark_record'
  | 'shark_done'
  | 'roleplay_intro'
  | 'roleplay_prep'
  | 'roleplay_call'
  | 'roleplay_done'
  | 'caso_intro'
  | 'caso_question'
  | 'math_intro'
  | 'math_question'
  | 'completion'

export type SharkScenario = {
  name: string
  desc: string
  mission: string
  prepTime: number
  recTime: number
}

export type CasoContext = {
  name: string
  city: string
  category: string
  avgOrder: number
  schedule: string
  orders: { w: string; o: number; v: number }[]
  ads: { budget: number; consumed: number; pct: number; coinv: string; schedule: string; roi: number }
  discounts: { all: string; pro: string; returnAll: string; salesAll: number; salesPro: number }
}

export type CasoBankEntry = {
  id: string
  title: string
  difficulty: string
  owner_name: string
  owner_profile: string
  context: string
  data_raw: string
  situation: string
  question: string
  sort_order?: number
}

export type Question = {
  id: string
  section: 'caso' | 'math'
  position: number
  content: string
  sub_label: string | null
  placeholder: string | null
  time_seconds: number
  difficulty: 'easy' | 'medium' | 'hard' | 'check'
  points: number
  correct_answer: string | null
  is_honeypot: boolean
  is_flex_answer: boolean
  show_data: boolean
  version?: string
  question_type?: 'free_text' | 'multiple_choice'
  options?: { letter: string; text: string }[]
}

export type AssessmentConfig = {
  id: string
  label: string
  shark_scenario: SharkScenario
  caso_context: CasoContext
  questions: Question[]
  math_version?: string
  math_context?: string
  math_mode?: 'questions' | 'spreadsheet'
  enabled_sections?: SectionId[]
  caso_bank_entry?: CasoBankEntry | null
  active_caso_id?: string | null
}

export type CasoMode = 'global' | 'fixed' | 'random'

export type Cohort = {
  id: string
  name: string
  description: string
  invite_token: string
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  enabled_sections: string[] | null
  caso_mode: CasoMode
  fixed_caso_id: string | null
  difficulty_filter: string | null
  math_mode_override: 'questions' | 'spreadsheet' | null
  created_at: string
}

export type CohortMember = {
  id: string
  cohort_id: string
  email: string
  assigned_caso_id: string | null
  join_method: 'manual' | 'link'
  first_accessed_at: string | null
  created_at: string
  // joined via query
  caso_title?: string | null
  caso_difficulty?: string | null
}

export type CandidateInfo = {
  name: string
  email: string
  cedula: string
  celular: string
}

export type MathAnswers = Record<number, string>
export type CasoAnswers = Record<string, string>

export type AssessmentState = {
  screen: Screen
  candidate: CandidateInfo
  config: AssessmentConfig | null
  submissionId: string | null
  candidateId: string | null
  // Shark
  videoBlob: Blob | null
  videoMimeType: string
  videoRecorded: boolean
  // Caso
  casoIdx: number
  casoAnswers: CasoAnswers
  casoTimings: Record<number, number>
  // Math
  mathIdx: number
  mathAnswers: MathAnswers
  mathTimings: Record<number, number>
  // Roleplay
  roleplayCompleted: boolean
  roleplayVideoBlob: Blob | null
  roleplayVideoMimeType: string
  // Submission
  submitting: boolean
  submitted: boolean
  submitError: string | null
  confirmationCode: string | null
}

export type AssessmentAction =
  | { type: 'SET_CONFIG'; config: AssessmentConfig }
  | { type: 'SET_CANDIDATE'; candidate: CandidateInfo }
  | { type: 'SET_SUBMISSION_IDS'; submissionId: string; candidateId: string }
  | { type: 'GO_SCREEN'; screen: Screen }
  | { type: 'SET_VIDEO'; blob: Blob; mimeType: string }
  | { type: 'SET_CASO_ANSWER'; idx: number; questionId: string; value: string; timeSpent: number }
  | { type: 'NEXT_CASO' }
  | { type: 'SET_MATH_ANSWER'; idx: number; value: string }
  | { type: 'RECORD_MATH_TIMING'; idx: number; timeSpent: number }
  | { type: 'NEXT_MATH' }
  | { type: 'SET_ROLEPLAY_DONE'; videoBlob: Blob | null; mimeType: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_SUBMITTED'; code?: string }
  | { type: 'SET_SUBMIT_ERROR'; error: string }
