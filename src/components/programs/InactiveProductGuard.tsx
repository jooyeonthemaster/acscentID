'use client'

import { useActiveProducts } from '@/hooks/useAdminContent'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

interface InactiveProductGuardProps {
  productSlug: string
  children: React.ReactNode
}

export function InactiveProductGuard({ productSlug, children }: InactiveProductGuardProps) {
  const { isProductActive, loading } = useActiveProducts()
  const router = useRouter()
  const isAdminPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('adminPreview') === '1'

  // 로딩 중에는 children 렌더 (깜빡임 방지)
  if (loading) return <>{children}</>

  // 관리자 상품 편집 미리보기에서는 비활성 상품도 그대로 편집 가능해야 합니다.
  if (isAdminPreview) return <>{children}</>

  // 비활성 상품이면 안내 메시지 표시
  if (!isProductActive(productSlug)) {
    return (
      <div className="min-h-screen bg-[#D7D7D7] flex items-center justify-center p-4">
        <div className="bg-[#F5EFE2] rounded-[12px] border-2 border-[#D8CFBB] p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-[#EDE5D2] rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[#8B8578]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1610] mb-2">
            현재 이용할 수 없는 상품입니다
          </h2>
          <p className="text-sm lg:text-base text-[#8B8578] mb-6">
            이 프로그램은 현재 준비 중이거나 일시적으로 중단되었습니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-[#12141D] text-[#F5EFE2] font-bold rounded-[12px] border-2 border-[#D8CFBB] hover:bg-[#FFFDF5] transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
