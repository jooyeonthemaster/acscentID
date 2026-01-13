'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileSearch,
  ShoppingCart,
  Users,
  Ticket,
  QrCode,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navItems: NavItem[] = [
  {
    href: '/admin/dashboard',
    label: '대시보드',
    icon: LayoutDashboard,
    description: '통계 현황',
  },
  {
    href: '/admin/analysis',
    label: '분석 관리',
    icon: FileSearch,
    description: '분석 결과 조회',
  },
  {
    href: '/admin/orders',
    label: '주문 관리',
    icon: ShoppingCart,
    description: '주문 상태 관리',
  },
  {
    href: '/admin/members',
    label: '회원 관리',
    icon: Users,
    description: '회원 정보 조회',
  },
  {
    href: '/admin/qr',
    label: 'QR 관리',
    icon: QrCode,
    description: 'QR 코드 생성',
  },
  {
    href: '/admin/coupons',
    label: '쿠폰 관리',
    icon: Ticket,
    description: '쿠폰 현황',
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { unifiedUser, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-slate-900 text-white
        transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* 로고 영역 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-sm">AC</span>
            </div>
            <span className="font-bold text-sm">ADMIN</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="p-2 flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                    ${isActive
                      ? 'bg-yellow-400 text-slate-900'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    }
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className={`text-xs truncate ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 사용자 정보 */}
      <div className="p-2 border-t border-slate-800">
        {!collapsed ? (
          <div className="px-3 py-2">
            <div className="text-xs text-slate-500 mb-1">로그인 계정</div>
            <div className="text-sm font-medium truncate">{unifiedUser?.name || '관리자'}</div>
            <div className="text-xs text-slate-400 truncate">{unifiedUser?.email}</div>
          </div>
        ) : null}
        <button
          onClick={handleLogout}
          className={`
            flex items-center gap-3 px-3 py-3 rounded-lg transition-all w-full
            hover:bg-red-500/20 text-red-400 hover:text-red-300
          `}
          title={collapsed ? '로그아웃' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}
