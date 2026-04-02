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

  // 로딩 중에는 children 렌더 (깜빡임 방지)
  if (loading) return <>{children}</>

  // 비활성 상품이면 안내 메시지 표시
  if (!isProductActive(productSlug)) {
    return (
      <div className="min-h-screen bg-[#FCD34D] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#000] p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            현재 이용할 수 없는 상품입니다
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            이 프로그램은 현재 준비 중이거나 일시적으로 중단되었습니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-[#FCD34D] text-slate-900 font-bold rounded-xl border-2 border-slate-900 hover:bg-yellow-300 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
