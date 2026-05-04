import { getAdminUser } from '@/lib/admin-auth'
import { AdminSidebar } from './AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getAdminUser()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminSidebar email={user.email ?? ''} role={role} />
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
