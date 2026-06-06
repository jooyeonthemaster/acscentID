import { AdminGuard } from './components/AdminGuard'
import { AdminShell } from './components/AdminShell'

export const metadata = {
  title: "AC'SCENT Admin",
  description: "AC'SCENT IDENTITY 관리자 페이지",
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  )
}
