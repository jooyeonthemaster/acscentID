import { AdminGuard } from './components/AdminGuard'
import { AdminSidebar } from './components/AdminSidebar'

export const metadata = {
  title: "AC'SCENT Admin",
  description: "AC'SCENT IDENTITY 관리자 페이지",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      {/* fixed position으로 부모의 455px 제한을 벗어남 */}
      <div className="fixed inset-0 min-h-screen bg-slate-50 overflow-auto z-[9999]">
        <AdminSidebar />
        <main className="ml-64 min-h-screen transition-all duration-300">
          {children}
        </main>
      </div>
    </AdminGuard>
  )
}
