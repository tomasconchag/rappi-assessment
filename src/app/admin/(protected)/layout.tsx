import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminSidebar email={user.email ?? ''} />
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
