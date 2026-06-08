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
  LogOut,
  Database,
  BarChart3,
  Bot,
  Megaphone,
  ImageIcon,
  Package,
  MessageSquare,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '운영 현황',
    items: [
      {
        href: '/admin/dashboard',
        label: '대시보드',
        icon: LayoutDashboard,
        description: '통계 현황',
      },
      {
        href: '/admin/visitors',
        label: '방문자 분석',
        icon: BarChart3,
        description: '트래픽 & 유입 경로',
      },
      {
        href: '/admin/datacenter',
        label: '데이터센터',
        icon: Database,
        description: '향수 통계 & 키워드',
      },
      {
        href: '/admin/ai-chat',
        label: 'AI 분석봇',
        icon: Bot,
        description: 'DB 자연어 분석',
      },
    ],
  },
  {
    label: '분석/프로그램',
    items: [
      {
        href: '/admin/analysis',
        label: '분석 관리',
        icon: FileSearch,
        description: '분석 결과 조회',
      },
      {
        href: '/admin/programs',
        label: '프로그램 관리',
        icon: Sparkles,
        description: '분석 · 시그니처 흐름',
      },
      {
        href: '/admin/qr',
        label: 'QR 관리',
        icon: QrCode,
        description: 'QR 코드 생성',
      },
    ],
  },
  {
    label: '커머스',
    items: [
      {
        href: '/admin/orders',
        label: '주문 관리',
        icon: ShoppingCart,
        description: '주문 상태 관리',
      },
      {
        href: '/admin/products',
        label: '상품 관리',
        icon: Package,
        description: '일반 판매 상품',
      },
      {
        href: '/admin/promotions',
        label: '프로모션 관리',
        icon: Ticket,
        description: '배송비 무료 & 이벤트',
      },
      {
        href: '/admin/coupons',
        label: '쿠폰 발급',
        icon: QrCode,
        description: '실물 QR 쿠폰 출력',
      },
      {
        href: '/admin/reviews',
        label: '리뷰 관리',
        icon: MessageSquare,
        description: '상품 리뷰 & AI 생성',
      },
    ],
  },
  {
    label: '사이트 콘텐츠',
    items: [
      {
        href: '/admin/banners',
        label: '배너 관리',
        icon: ImageIcon,
        description: '히어로 슬라이드 관리',
      },
      {
        href: '/admin/popups',
        label: '팝업 관리',
        icon: Megaphone,
        description: '메인 페이지 팝업',
      },
      {
        href: '/admin/faqs',
        label: 'FAQ 관리',
        icon: HelpCircle,
        description: '자주 묻는 질문 게시판',
      },
    ],
  },
  {
    label: '고객',
    items: [
      {
        href: '/admin/members',
        label: '회원 관리',
        icon: Users,
        description: '회원 정보 조회',
      },
    ],
  },
]

interface AdminSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname()
  const { unifiedUser, signOut } = useAuth()
  const [hovered, setHovered] = useState(false)
  const activeItemRef = useRef<HTMLLIElement>(null)

  // 접힌 상태에서 호버하면 임시로 펼쳐 보임(오버레이). 펼침 시각 상태는 expanded로 통일.
  const expanded = !collapsed || hovered
  // 호버로 임시로 열렸을 때만 본문 위로 떠 있는 느낌의 그림자
  const overlayHovered = collapsed && hovered

  // 펼쳐질 때 현재 선택된 메뉴가 네비게이션 스크롤 영역 안에 보이도록 스크롤
  useEffect(() => {
    if (expanded) {
      activeItemRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [expanded, pathname])

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        fixed left-0 top-0 h-screen bg-slate-900 text-white
        transition-all duration-300 ease-in-out z-40 flex flex-col
        ${expanded ? 'w-64' : 'w-16'}
        ${overlayHovered ? 'shadow-2xl shadow-black/40' : ''}
      `}
    >
      {/* 로고 영역 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {expanded && (
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-sm">AC</span>
            </div>
            <span className="font-bold text-sm">ADMIN</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {expanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="p-2 flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {expanded ? (
                <div className="px-3 pt-3 pb-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {group.label}
                </div>
              ) : (
                <div className="mx-auto my-2 h-px w-8 bg-slate-800" aria-hidden />
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon

                  return (
                    <li key={item.href} ref={isActive ? activeItemRef : undefined}>
                      <Link
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                          ${isActive
                            ? 'bg-yellow-400 text-slate-900'
                            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                          }
                        `}
                        title={!expanded ? item.label : undefined}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {expanded && (
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
            </div>
          ))}
        </div>
      </nav>

      {/* 사용자 정보 */}
      <div className="p-2 border-t border-slate-800">
        {expanded ? (
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
          title={!expanded ? '로그아웃' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {expanded && <span className="text-sm">로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}
