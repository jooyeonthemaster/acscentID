'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileSidebar } from './components/ProfileSidebar'
import { StatsSidebar } from './components/StatsSidebar'
import { SavedAnalysisList } from './components/SavedAnalysisList'
import { OrderHistory } from './components/OrderHistory'
import { CouponList } from './components/CouponList'
import { Sparkles, LayoutGrid, List, ShoppingBag, Ticket } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { ImageAnalysisResult } from '@/types/analysis'

interface RecipeGranule {
  id: string
  name: string
  ratio: number
}

interface ConfirmedRecipe {
  granules: RecipeGranule[]
}

interface AnalysisResult {
  id: string
  created_at: string
  twitter_name: string
  idol_name: string | null
  perfume_name: string
  perfume_brand: string
  user_image_url: string | null
  analysis_data: object
  confirmed_recipe: ConfirmedRecipe | null
}

interface Order {
  id: string
  order_number: string
  perfume_name: string
  perfume_brand: string
  size: string
  price: number
  recipient_name: string
  phone: string
  address: string
  address_detail: string
  status: 'pending' | 'paid' | 'shipping' | 'delivered' | 'cancel_requested' | 'cancelled'
  created_at: string
  updated_at: string
  user_image_url?: string
  keywords?: string[]
  analysis_data?: ImageAnalysisResult
}

function MyPageContent() {
  const { user, unifiedUser } = useAuth()
  const searchParams = useSearchParams()
  const currentUser = unifiedUser || user
  const userId = unifiedUser?.id || user?.id
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const initialTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'analyses' | 'orders' | 'coupons'>(
    initialTab === 'orders' ? 'orders' : initialTab === 'coupons' ? 'coupons' : 'analyses'
  )
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // URL 파라미터 변경 시 탭 상태 동기화
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'analyses' || tab === 'orders' || tab === 'coupons') {
      setActiveTab(tab)
    }
  }, [searchParams])

  // 주문 내역 조회
  const fetchOrders = useCallback(async () => {
    if (!userId) return

    setOrdersLoading(true)
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()

      if (response.ok) {
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setOrdersLoading(false)
    }
  }, [userId])

  // API를 통해 데이터 조회
  const fetchData = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      const fingerprint = typeof window !== 'undefined'
        ? localStorage.getItem('user_fingerprint')
        : null
      const url = fingerprint
        ? `/api/user/data?fingerprint=${encodeURIComponent(fingerprint)}`
        : '/api/user/data'

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to fetch user data:', data.error)
        return
      }

      setAnalyses(data.analyses || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 페이지 로드 시 분석 결과 + 주문 내역 모두 로드
  useEffect(() => {
    fetchData()
    fetchOrders()
  }, [fetchData, fetchOrders])

  // 분석 결과 삭제
  const handleDeleteAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/user/analysis/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to delete analysis:', data.error)
        alert('삭제에 실패했습니다')
        return
      }

      setAnalyses((prev) => prev.filter((a) => a.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      alert('삭제 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8E7]">
      {/* 배경 데코레이션 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl" />
      </div>

      {/* 메인 레이아웃 */}
      <div className="relative z-10 px-4 lg:px-8 py-6 lg:py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* 왼쪽 사이드바 - 프로필 */}
            <aside className="lg:w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-8">
                <ProfileSidebar user={user} unifiedUser={unifiedUser} />
              </div>
            </aside>

            {/* 중앙 메인 콘텐츠 */}
            <main className="flex-1 min-w-0">
              {/* 콘텐츠 헤더 */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 mb-6 shadow-[4px_4px_0_0_black]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* 탭 버튼 */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveTab('analyses')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 border-black ${
                        activeTab === 'analyses'
                          ? 'bg-purple-400 text-white shadow-[2px_2px_0_0_black]'
                          : 'bg-white hover:bg-purple-100'
                      }`}
                    >
                      <Sparkles size={16} />
                      분석 결과 ({analyses.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 border-black ${
                        activeTab === 'orders'
                          ? 'bg-emerald-400 text-white shadow-[2px_2px_0_0_black]'
                          : 'bg-white hover:bg-emerald-100'
                      }`}
                    >
                      <ShoppingBag size={16} />
                      주문 내역 ({orders.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('coupons')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 border-black ${
                        activeTab === 'coupons'
                          ? 'bg-[#F472B6] text-white shadow-[2px_2px_0_0_black]'
                          : 'bg-white hover:bg-pink-100'
                      }`}
                    >
                      <Ticket size={16} />
                      쿠폰함
                    </button>
                  </div>

                  {/* 뷰 모드 토글 */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border-2 border-black">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      }`}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-colors ${
                        viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      }`}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 콘텐츠 영역 */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'analyses' && (
                  <SavedAnalysisList
                    analyses={analyses}
                    loading={loading}
                    onDelete={handleDeleteAnalysis}
                    viewMode={viewMode}
                  />
                )}
                {activeTab === 'orders' && (
                  <OrderHistory
                    orders={orders}
                    loading={ordersLoading}
                    viewMode={viewMode}
                    onOrderUpdate={fetchOrders}
                  />
                )}
                {activeTab === 'coupons' && (
                  <CouponList viewMode={viewMode} />
                )}
              </motion.div>
            </main>

            {/* 오른쪽 사이드바 - 통계 */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-8">
                <StatsSidebar
                  analyses={analyses}
                  loading={loading}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-black border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold">로딩 중...</p>
        </div>
      </div>
    }>
      <MyPageContent />
    </Suspense>
  )
}
