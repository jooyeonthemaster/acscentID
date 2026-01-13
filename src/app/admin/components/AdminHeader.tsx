'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

// 경로별 제목 매핑
const pathTitles: Record<string, string> = {
  '/admin': '관리자',
  '/admin/dashboard': '대시보드',
  '/admin/analysis': '분석 관리',
  '/admin/orders': '주문 관리',
  '/admin/members': '회원 관리',
  '/admin/qr': 'QR 관리',
  '/admin/coupons': '쿠폰 관리',
}

interface AdminHeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  // 브레드크럼 생성
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs: { href: string; label: string }[] = []

    let currentPath = ''
    for (const path of paths) {
      currentPath += `/${path}`
      const label = pathTitles[currentPath] || path
      breadcrumbs.push({ href: currentPath, label })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()
  const pageTitle = title || pathTitles[pathname] || '관리자'

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="px-6 py-4">
        {/* 브레드크럼 */}
        <nav className="flex items-center gap-1 text-sm text-slate-500 mb-2">
          <Link href="/admin" className="hover:text-slate-900 transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4" />
              {index === breadcrumbs.length - 1 ? (
                <span className="text-slate-900 font-medium">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-slate-900 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* 제목 및 액션 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.refresh()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
            {actions}
          </div>
        </div>
      </div>
    </header>
  )
}
