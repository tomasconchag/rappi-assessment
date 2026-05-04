import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/admin-auth'

export default async function RubricPage() {
  await requireSuperAdmin()
  redirect('/admin/rubric/caso')
}
