'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
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
      {/* 메인 레이아웃 */}
      <div className="px-4 py-4">
        {/* 친구 초대 배너 */}
        <div className="mb-4">
          <InviteFriendBanner />
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white border-2 border-black rounded-2xl p-2 mb-4 shadow-[4px_4px_0_0_black]">
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab('analyses')}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'analyses'
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles size={18} />
              <span>분석</span>
              <span className="text-[10px] opacity-70">{analyses.length}개</span>
            </button>
            <button
              onClick={() => setActiveTab('cart')}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'cart'
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingCart size={18} />
              <span>장바구니</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'orders'
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShoppingBag size={18} />
              <span>주문</span>
              <span className="text-[10px] opacity-70">{orders.length}개</span>
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'coupons'
                  ? 'bg-black text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Ticket size={18} />
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
