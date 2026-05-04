import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { TrainingShell } from './TrainingShell'

export default async function TrainingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()

  // Look up cohort by invite token
  const { data: cohort } = await supabase
    .from('training_cohorts')
    .select('id, name, description, is_active, ends_at, doc_ids')
    .eq('invite_token', token)
    .single()

  if (!cohort) notFound()

  // Check if expired
  const now = new Date()
  const expired = cohort.ends_at && new Date(cohort.ends_at) < now
  const inactive = !cohort.is_active || expired

  // Get document content for context
  let documentContent = ''
  let documentNames: string[] = []
  if (cohort.doc_ids?.length) {
    const { data: docs } = await supabase
      .from('training_documents')
      .select('name, content')
      .in('id', cohort.doc_ids)

    if (docs?.length) {
      documentContent = docs.map(d => `## ${d.name}\n\n${d.content}`).join('\n\n---\n\n')
      documentNames = docs.map(d => d.name)
    }
  }

  const VAPI_ASSISTANT_ID = '114c7d3a-e94c-452f-a4c3-f9800c3a949f'

  return (
    <TrainingShell
      cohortId={cohort.id}
      cohortName={cohort.name}
      cohortDescription={cohort.description}
      inactive={inactive}
      documentContent={documentContent}
      documentNames={documentNames}
      vapiAssistantId={VAPI_ASSISTANT_ID}
      endsAt={cohort.ends_at}
    />
  )
}
