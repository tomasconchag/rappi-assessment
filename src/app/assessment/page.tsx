import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import type { AssessmentConfig, Question, CasoBankEntry } from '@/types/assessment'
import type { SectionId } from '@/lib/challenges'

// Assign (or retrieve) a cohort case for the given email, returns the CasoBankEntry or null
async function resolveCohortCase(
  cohort: Record<string, unknown>,
  email: string,
): Promise<{ casoBankEntry: CasoBankEntry | null; enabledSections: string[] | null }> {
  const supabase = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  const { data: existingMember } = await supabase
    .from('cohort_members')
    .select('*')
    .eq('cohort_id', cohort.id as string)
    .eq('email', normalizedEmail)
    .maybeSingle()

  let assignedCasoId: string | null = existingMember?.assigned_caso_id ?? null

  if (!assignedCasoId && cohort.caso_mode !== 'global') {
    if (cohort.caso_mode === 'fixed' && cohort.fixed_caso_id) {
      assignedCasoId = cohort.fixed_caso_id as string
    } else if (cohort.caso_mode === 'random') {
      let query = supabase.from('caso_bank').select('id')
      if (cohort.difficulty_filter) query = query.eq('difficulty', cohort.difficulty_filter as string)
      const { data: pool } = await query
      if (pool && pool.length > 0) {
        assignedCasoId = pool[Math.floor(Math.random() * pool.length)].id as string
      }
    }
  }

  if (!existingMember) {
    const { error: insertErr } = await supabase.from('cohort_members').insert({
      cohort_id: cohort.id,
      email: normalizedEmail,
      assigned_caso_id: assignedCasoId,
      join_method: 'link',
      first_accessed_at: new Date().toISOString(),
    })
    if (insertErr) {
      // Race condition recovery — retry SELECT then patch
      console.warn('[resolveCohortCase] insert conflict, retrying SELECT:', insertErr.message)
      const { data: raceMember } = await supabase
        .from('cohort_members').select('*')
        .eq('cohort_id', cohort.id).eq('email', normalizedEmail).maybeSingle()
      if (raceMember && !raceMember.assigned_caso_id && assignedCasoId) {
        await supabase.from('cohort_members').update({ assigned_caso_id: assignedCasoId }).eq('id', raceMember.id)
      }
    }
  } else {
    const updates: Record<string, unknown> = {}
    if (!existingMember.assigned_caso_id && assignedCasoId) updates.assigned_caso_id = assignedCasoId
    if (!existingMember.first_accessed_at) updates.first_accessed_at = new Date().toISOString()
    if (Object.keys(updates).length > 0) {
      await supabase.from('cohort_members').update(updates).eq('id', existingMember.id)
    }
  }

  let casoBankEntry: CasoBankEntry | null = null
  if (assignedCasoId) {
    const { data: caso } = await supabase.from('caso_bank').select('*').eq('id', assignedCasoId).single()
    casoBankEntry = caso ?? null
  }

  return { casoBankEntry, enabledSections: (cohort.enabled_sections as string[] | null) ?? null }
}

export default async function AssessmentPage(props: {
  searchParams: Promise<{ c?: string; t?: string }>
}) {
  const searchParams = await props.searchParams
  const cohortToken    = searchParams.c ?? null
  const templateToken  = searchParams.t ?? null   // personalized-template invite token

  const [clerkUser, supabase] = await Promise.all([currentUser(), createClient()])

  // ── Personalized template (employee ?t=TOKEN links) ──────────────────────
  let personalizedTemplate: {
    templateId: string
    batchId: string | null
    batchName: string | null
    configId: string | null
    employeeEmail: string
    employeeName: string | null
    template: { version: string; cells: unknown[]; answerCells: unknown[] }
  } | null = null

  if (templateToken) {
    const admin = createAdminClient()
    const { data: pt } = await admin
      .from('personalized_templates')
      .select(`
        id, employee_email, employee_name, template_json,
        template_batches ( id, name, config_id )
      `)
      .eq('invite_token', templateToken)
      .maybeSingle()

    if (pt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batch = Array.isArray(pt.template_batches) ? pt.template_batches[0] : pt.template_batches as any
      personalizedTemplate = {
        templateId:    pt.id,
        batchId:       batch?.id       ?? null,
        batchName:     batch?.name     ?? null,
        configId:      batch?.config_id ?? null,
        employeeEmail: pt.employee_email,
        employeeName:  pt.employee_name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        template:      pt.template_json as any,
      }
    }
  }

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

  const rawVersion: string = configData.math_version || 'A'
  const mathVersion: string = rawVersion === 'random'
    ? (Math.random() < 0.5 ? 'A' : 'B')
    : rawVersion

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

  // Resolve case: cohort overrides global active_caso_id
  let casoBankEntry: CasoBankEntry | null = null
  let cohortEnabledSections: string[] | null = null
  let cohortDeadline: string | null = null

  if (cohortToken) {
    // Fetch cohort config
    const { data: cohortData } = await supabase
      .from('cohorts')
      .select('*')
      .eq('invite_token', cohortToken)
      .eq('is_active', true)
      .maybeSingle()

    if (cohortData) {
      cohortDeadline = cohortData.ends_at ?? null
      if (clerkUser) {
        // Clerk user: do full server-side assignment now
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
        const result = await resolveCohortCase(cohortData, email)
        casoBankEntry = result.casoBankEntry
        cohortEnabledSections = result.enabledSections
      } else {
        // No Clerk user yet: just pass the token to the shell, assignment deferred to after email submit
        cohortEnabledSections = (cohortData.enabled_sections as string[] | null) ?? null
        // casoBankEntry stays null — shell will call /api/cohort-assign after email
      }
    }
  } else if (configData.active_caso_id) {
    // No cohort — use global active caso
    const { data: bankCase } = await supabase
      .from('caso_bank')
      .select('*')
      .eq('id', configData.active_caso_id)
      .single()
    casoBankEntry = bankCase ?? null
  }

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

  // Sections: personalized template → cohort override → global config → default
  // Employee Excel tests only show the math/spreadsheet section (no video, no roleplay)
  const globalSections = (configData.enabled_sections as SectionId[]) ?? ['sharktank', 'caso', 'math']
  const effectiveSections: SectionId[] = personalizedTemplate
    ? ['math']
    : (cohortEnabledSections as SectionId[] | null) ?? globalSections

  const config: AssessmentConfig = {
    id: configData.id,
    label: configData.label,
    shark_scenario: configData.shark_scenario,
    caso_context: configData.caso_context,
    questions: ([...casoQuestions, ...(mathQuestionsData || [])]) as Question[],
    math_version: mathVersion,
    math_context: configData.math_context || undefined,
    math_mode: (configData.math_mode as 'questions' | 'spreadsheet') ?? 'questions',
    enabled_sections: effectiveSections,
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
        <AssessmentShell
          config={config}
          clerkUser={clerkUserData}
          cohortToken={cohortToken}
          cohortDeadline={cohortDeadline}
          personalizedTemplate={personalizedTemplate ?? undefined}
        />
      </ErrorBoundary>
    </main>
  )
}
