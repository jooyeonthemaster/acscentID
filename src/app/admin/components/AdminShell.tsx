'use client'

import { useState } from 'react'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    // fixed position으로 부모의 455px 제한을 벗어남
    <div className="admin-shell fixed inset-0 min-h-screen bg-slate-50 overflow-auto z-[9999]">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <main
        className={`admin-shell-main min-h-screen transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
