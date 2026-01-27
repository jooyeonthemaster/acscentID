'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileSidebar } from './components/ProfileSidebar'
import { SavedAnalysisList } from './components/SavedAnalysisList'
import { OrderHistory } from './components/OrderHistory'
import { CouponList } from './components/CouponList'
import { Sparkles, ShoppingBag, Ticket, ShoppingCart } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { ImageAnalysisResult } from '@/types/analysis'
import { CartList } from './components/CartList'
import { InviteFriendBanner } from './components/InviteFriendBanner'

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
  const [activeTab, setActiveTab] = useState<'analyses' | 'orders' | 'coupons' | 'cart'>(
    initialTab === 'orders' ? 'orders' : initialTab === 'coupons' ? 'coupons' : initialTab === 'cart' ? 'cart' : 'analyses'
  )
  const viewMode = 'grid' as const

  // URL 파라미터 변경 시 탭 상태 동기화
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'analyses' || tab === 'orders' || tab === 'coupons' || tab === 'cart') {
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
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* 왼쪽 사이드바 - 프로필 (데스크톱만) */}
            <aside className="hidden lg:block lg:w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-8">
                <ProfileSidebar user={user} unifiedUser={unifiedUser} />
              </div>
            </aside>

            {/* 중앙 메인 콘텐츠 */}
            <main className="flex-1 min-w-0">
              {/* 모바일 친구 초대 배너 */}
              <div className="lg:hidden mb-4">
                <InviteFriendBanner />
              </div>

              {/* 콘텐츠 헤더 */}
              <div className="bg-white border-2 border-black rounded-2xl p-3 sm:p-4 mb-6 shadow-[4px_4px_0_0_black]">
                {/* 상단: 탭 네비게이션 */}
                <div className="flex items-center justify-between gap-3">
                  {/* 메인 탭 (분석/장바구니) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('analyses')}
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full font-bold text-sm transition-all ${
                        activeTab === 'analyses'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>분석</span>
                      <span className="text-xs opacity-70">({analyses.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('cart')}
                      className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full font-bold text-sm transition-all ${
                        activeTab === 'cart'
                          ? 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0_0_black]'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      <ShoppingCart size={14} />
                      <span>장바구니</span>
                    </button>
                  </div>

                </div>

                {/* 하단: 서브 탭 (주문/쿠폰) */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeTab === 'orders'
                        ? 'bg-emerald-100 text-emerald-700 font-bold'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <ShoppingBag size={14} />
                    <span>주문</span>
                    <span className="text-xs opacity-70">({orders.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('coupons')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeTab === 'coupons'
                        ? 'bg-pink-100 text-pink-700 font-bold'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Ticket size={14} />
                    <span>쿠폰</span>
                  </button>
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
                {activeTab === 'cart' && (
                  <CartList viewMode={viewMode} />
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
