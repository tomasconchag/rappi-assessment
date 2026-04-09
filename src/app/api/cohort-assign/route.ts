import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CasoBankEntry, RoleplayBankEntry } from '@/types/assessment'

export async function POST(req: NextRequest) {
  const { token, email } = await req.json() as { token: string; email: string }

  if (!token || !email) {
    return Response.json({ error: 'Missing token or email' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const normalizedEmail = email.toLowerCase().trim()

  // Find active cohort by token
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('*')
    .eq('invite_token', token)
    .eq('is_active', true)
    .maybeSingle()

  if (!cohort) {
    return Response.json({ error: 'Cohort not found or inactive' }, { status: 404 })
  }

  // Check date boundaries
  const now = new Date()
  if (cohort.starts_at && new Date(cohort.starts_at) > now) {
    return Response.json({ error: 'Cohort not yet open' }, { status: 403 })
  }
  if (cohort.ends_at && new Date(cohort.ends_at) < now) {
    return Response.json({ error: 'Cohort has expired' }, { status: 403 })
  }

  // Check if member already exists (may have been pre-added by admin)
  const { data: existingMember } = await supabase
    .from('cohort_members')
    .select('*')
    .eq('cohort_id', cohort.id)
    .eq('email', normalizedEmail)
    .maybeSingle()

  let assignedCasoId: string | null = existingMember?.assigned_caso_id ?? null

  // Assign case if not yet assigned
  if (!assignedCasoId && cohort.caso_mode !== 'global') {
    if (cohort.caso_mode === 'fixed' && cohort.fixed_caso_id) {
      assignedCasoId = cohort.fixed_caso_id
    } else if (cohort.caso_mode === 'random') {
      let query = supabase.from('caso_bank').select('id')
      if (cohort.difficulty_filter) {
        query = query.eq('difficulty', cohort.difficulty_filter)
      }
      const { data: pool } = await query
      if (pool && pool.length > 0) {
        assignedCasoId = pool[Math.floor(Math.random() * pool.length)].id
      }
    }
  }

  // Upsert member row
  if (!existingMember) {
    await supabase.from('cohort_members').insert({
      cohort_id: cohort.id,
      email: normalizedEmail,
      assigned_caso_id: assignedCasoId,
      join_method: 'link',
      first_accessed_at: new Date().toISOString(),
    })
  } else {
    const updates: Record<string, unknown> = {}
    if (!existingMember.assigned_caso_id && assignedCasoId) updates.assigned_caso_id = assignedCasoId
    if (!existingMember.first_accessed_at) updates.first_accessed_at = new Date().toISOString()
    if (existingMember.join_method === 'manual') updates.join_method = 'link'
    if (Object.keys(updates).length > 0) {
      await supabase.from('cohort_members').update(updates).eq('id', existingMember.id)
    }
  }

  // Fetch the assigned caso if any
  let casoBankEntry: CasoBankEntry | null = null
  if (assignedCasoId) {
    const { data: caso } = await supabase
      .from('caso_bank')
      .select('*')
      .eq('id', assignedCasoId)
      .single()
    casoBankEntry = caso ?? null
  }

  // Fetch active roleplay bank case from assessment config
  // Cohort's manual roleplay_case JSONB takes precedence; if absent, use active_roleplay_case_id
  let roleplayBankCase: RoleplayBankEntry | null = null
  if (!cohort.roleplay_case) {
    const { data: config } = await supabase
      .from('assessment_configs')
      .select('active_roleplay_case_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (config?.active_roleplay_case_id) {
      const { data: bankCase } = await supabase
        .from('roleplay_bank')
        .select('*')
        .eq('id', config.active_roleplay_case_id)
        .single()
      roleplayBankCase = bankCase ?? null
    }
  }

  return Response.json({
    cohortId: cohort.id,
    enabledSections: cohort.enabled_sections ?? null,
    casoBankEntry,
    mathModeOverride: cohort.math_mode_override ?? null,
    voiceProviderOverride: cohort.voice_provider_override ?? null,
    roleplayCase: cohort.roleplay_case ?? null,
    roleplayBankCase,
  })
}
