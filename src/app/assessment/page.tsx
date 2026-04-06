import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import type { AssessmentConfig, Question } from '@/types/assessment'
import type { SectionId } from '@/lib/challenges'

export default async function AssessmentPage() {
  const [clerkUser, supabase] = await Promise.all([currentUser(), createClient()])

  const { data: configData } = await supabase
    .from('assessment_configs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!configData) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10 min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--dim)' }}>Assessment no disponible. Contacta a RRHH.</p>
      </main>
    )
  }

  // Check if this Clerk user already submitted in the last 24h
  if (clerkUser) {
    const admin = createAdminClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await admin
      .from('submissions')
      .select('id, completed_at')
      .eq('clerk_user_id', clerkUser.id)
      .gte('completed_at', since)
      .maybeSingle()

    if (existing) {
      return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, marginBottom: 14 }}>
              Ya completaste el assessment
            </h1>
            <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.7, marginBottom: 8, fontFamily: 'DM Sans, sans-serif' }}>
              Tu evaluación fue enviada el{' '}
              {new Date(existing.completed_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'Space Mono, monospace' }}>
              El equipo de RRHH revisará tus resultados y se comunicará contigo.
            </p>
          </div>
        </main>
      )
    }
  }

  // If 'random', pick A or B at page load time (server-side, per candidate session)
  const rawVersion: string = configData.math_version || 'A'
  const mathVersion: string = rawVersion === 'random'
    ? (Math.random() < 0.5 ? 'A' : 'B')
    : rawVersion

  // Fetch non-math questions (caso) plus math questions filtered by version
  const [{ data: casoQuestionsData }, { data: mathQuestionsData }] = await Promise.all([
    supabase
      .from('assessment_questions')
      .select('*')
      .eq('config_id', configData.id)
      .eq('section', 'caso')
      .order('position', { ascending: true }),
    supabase
      .from('assessment_questions')
      .select('*')
      .eq('section', 'math')
      .eq('version', mathVersion)
      .order('position', { ascending: true }),
  ])

  // Fetch active banco de caso if set
  let casoBankEntry = null
  if (configData.active_caso_id) {
    const { data: bankCase } = await supabase
      .from('caso_bank')
      .select('*')
      .eq('id', configData.active_caso_id)
      .single()
    casoBankEntry = bankCase ?? null
  }

  // When a bank case is active, use its question instead of DB caso questions
  const casoQuestions: Question[] = casoBankEntry
    ? [{
        id: `bank-${casoBankEntry.id}`,
        section: 'caso',
        position: 0,
        content: casoBankEntry.question,
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
      } as Question]
    : (casoQuestionsData || []) as Question[]

  const config: AssessmentConfig = {
    id: configData.id,
    label: configData.label,
    shark_scenario: configData.shark_scenario,
    caso_context: configData.caso_context,
    questions: ([...casoQuestions, ...(mathQuestionsData || [])]) as Question[],
    math_version: mathVersion,
    math_context: configData.math_context || undefined,
    enabled_sections: (configData.enabled_sections as SectionId[]) ?? ['sharktank', 'caso', 'math'],
    caso_bank_entry: casoBankEntry,
    active_caso_id: configData.active_caso_id ?? null,
  }

  const clerkUserData = clerkUser ? {
    id: clerkUser.id,
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
    email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
    imageUrl: clerkUser.imageUrl,
  } : null

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px', minHeight: '100vh' }}>
      <ErrorBoundary>
        <AssessmentShell config={config} clerkUser={clerkUserData} />
      </ErrorBoundary>
    </main>
  )
}
