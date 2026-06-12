'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    // fixed position으로 부모의 455px 제한을 벗어남
    <div className="admin-shell fixed inset-0 min-h-screen bg-slate-50 overflow-auto z-[9999]">
      {/* 모바일 상단바 (lg 미만에서만 노출) */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-slate-900 text-white">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center">
            <span className="text-slate-900 font-bold text-xs">AC</span>
          </div>
          <span className="font-bold text-sm">ADMIN</span>
        </div>
      </div>

      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className={`admin-shell-main min-h-screen transition-all duration-300 ml-0 ${
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
