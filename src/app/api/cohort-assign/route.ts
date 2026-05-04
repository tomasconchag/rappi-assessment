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
  let assignedRpBankId: string | null = (existingMember as any)?.assigned_roleplay_bank_id ?? null

  // Assign caso if not yet assigned
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

  // Assign roleplay bank case if not yet assigned
  const rpBankMode = cohort.roleplay_bank_mode ?? 'global'
  if (!assignedRpBankId && rpBankMode !== 'global') {
    if (rpBankMode === 'fixed' && cohort.fixed_roleplay_bank_id) {
      assignedRpBankId = cohort.fixed_roleplay_bank_id
    } else if (rpBankMode === 'random') {
      let query = supabase.from('roleplay_bank').select('id')
      if (cohort.roleplay_bank_difficulty_filter) {
        query = query.eq('difficulty', cohort.roleplay_bank_difficulty_filter)
      }
      const { data: pool } = await query
      if (pool && pool.length > 0) {
        assignedRpBankId = pool[Math.floor(Math.random() * pool.length)].id
      }
    }
  }

  // Upsert member row — with race-condition recovery (same email submitted twice concurrently)
  if (!existingMember) {
    const { error: insertErr } = await supabase.from('cohort_members').insert({
      cohort_id: cohort.id,
      email: normalizedEmail,
      assigned_caso_id: assignedCasoId,
      assigned_roleplay_bank_id: assignedRpBankId,
      join_method: 'link',
      first_accessed_at: new Date().toISOString(),
    })

    if (insertErr) {
      // Race condition: another concurrent request inserted the row first.
      // Retry SELECT to get the existing member and apply any pending assignments.
      console.warn('[cohort-assign] insert conflict — retrying SELECT:', insertErr.message)
      const { data: raceMember } = await supabase
        .from('cohort_members')
        .select('*')
        .eq('cohort_id', cohort.id)
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (!raceMember) {
        // Unable to recover — the insert failed for a non-race reason
        console.error('[cohort-assign] failed to insert or recover member:', insertErr.message)
        return Response.json({ error: 'Error al registrar en el cohort. Intenta de nuevo.' }, { status: 500 })
      }

      // Patch the recovered row with any assignments that the race winner may have missed
      const recoverUpdates: Record<string, unknown> = {}
      if (!raceMember.assigned_caso_id && assignedCasoId) recoverUpdates.assigned_caso_id = assignedCasoId
      if (!(raceMember as any).assigned_roleplay_bank_id && assignedRpBankId) recoverUpdates.assigned_roleplay_bank_id = assignedRpBankId
      if (Object.keys(recoverUpdates).length > 0) {
        await supabase.from('cohort_members').update(recoverUpdates).eq('id', raceMember.id)
      }
    }
  } else {
    const updates: Record<string, unknown> = {}
    if (!existingMember.assigned_caso_id && assignedCasoId) updates.assigned_caso_id = assignedCasoId
    if (!(existingMember as any).assigned_roleplay_bank_id && assignedRpBankId) updates.assigned_roleplay_bank_id = assignedRpBankId
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

  // Resolve roleplay bank case:
  // 1. Cohort-assigned (fixed or random from bank)
  // 2. Global fallback: active case from assessment_configs
  let roleplayBankCase: RoleplayBankEntry | null = null
  if (assignedRpBankId) {
    const { data: bankCase } = await supabase
      .from('roleplay_bank')
      .select('*')
      .eq('id', assignedRpBankId)
      .single()
    roleplayBankCase = bankCase ?? null
  } else {
    // Global: use the active case set in admin Role Play panel
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

  // Final safety fallback: if still null, pick the first available case in the bank
  // This prevents "No se pudo cargar el caso" errors when no global case is configured
  if (!roleplayBankCase) {
    const { data: fallbackCase } = await supabase
      .from('roleplay_bank')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    roleplayBankCase = fallbackCase ?? null
    if (roleplayBankCase) {
      console.warn('[cohort-assign] No active roleplay case configured — using fallback:', roleplayBankCase.restaurant_name)
    }
  }

  return Response.json({
    cohortId: cohort.id,
    enabledSections: cohort.enabled_sections ?? null,
    casoBankEntry,
    mathModeOverride: cohort.math_mode_override ?? null,
    voiceProviderOverride: cohort.voice_provider_override ?? null,
    roleplayBankCase,
    requiresScheduling: (cohort as Record<string, unknown>).requires_scheduling ?? false,
  })
}
