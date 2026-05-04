import { createAdminClient } from '@/lib/supabase/admin'
import { DocumentsClient } from './DocumentsClient'

export default async function TrainingDocumentsPage() {
  const supabase = createAdminClient()
  const { data: docs } = await supabase
    .from('training_documents')
    .select('id, name, file_size, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>
          📄 Documentos
        </h1>
        <p style={{ fontSize: 14, color: 'var(--dim)' }}>
          Sube archivos .txt que alimentarán al agente Vapi en los roleplays de training.
          Máximo 3 documentos por cohorte.
        </p>
      </div>
      <DocumentsClient docs={docs ?? []} />
    </div>
  )
}
