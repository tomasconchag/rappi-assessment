import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type AdminRole = 'super_admin' | 'admin'

/** Returns the authenticated admin user + role. Redirects to /admin/login if not logged in. */
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const role: AdminRole = (user.app_metadata?.role as AdminRole) ?? 'admin'
  return { user, role }
}

/**
 * Use in server components that require super_admin.
 * Regular admins are redirected to /admin with a toast-like param.
 */
export async function requireSuperAdmin() {
  const { user, role } = await getAdminUser()
  if (role !== 'super_admin') redirect('/admin?access=denied')
  return { user, role }
}
