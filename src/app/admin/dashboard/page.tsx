'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import {
  FileSearch,
  ShoppingCart,
  Users,
  QrCode,
  TrendingUp,
  Clock,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { AdminDashboardStats, PRODUCT_TYPE_LABELS, SERVICE_MODE_LABELS, ORDER_STATUS_LABELS } from '@/types/admin'

// 통계 카드 컴포넌트
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'slate',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subValue?: string
  color?: 'slate' | 'yellow' | 'emerald' | 'blue' | 'purple' | 'orange'
}) {
  const colorClasses = {
    slate: 'bg-slate-100 text-slate-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subValue && (
            <p className="text-sm text-slate-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// 주문 상태 바 컴포넌트
function OrderStatusBar({ stats }: { stats: AdminDashboardStats['ordersByStatus'] }) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const segments = [
    { key: 'pending', label: '입금대기', color: 'bg-amber-400', count: stats.pending },
    { key: 'paid', label: '입금완료', color: 'bg-blue-400', count: stats.paid },
    { key: 'shipping', label: '배송중', color: 'bg-purple-400', count: stats.shipping },
    { key: 'delivered', label: '배송완료', color: 'bg-emerald-400', count: stats.delivered },
  ]

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
      <h3 className="text-sm font-medium text-slate-700 mb-4">주문 현황</h3>
      <div className="h-4 rounded-full overflow-hidden bg-slate-100 flex">
        {segments.map(seg => (
          seg.count > 0 && (
            <div
              key={seg.key}
              className={`${seg.color} h-full transition-all`}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${seg.label}: ${seg.count}건`}
            />
          )
        ))}
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        {segments.map(seg => (
          <div key={seg.key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${seg.color}`} />
            <span className="text-sm text-slate-600">{seg.label}</span>
            <span className="text-sm font-medium text-slate-900">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error('통계를 불러오는데 실패했습니다')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div>
      <AdminHeader
        title="대시보드"
        subtitle="AC'SCENT IDENTITY 운영 현황"
      />

      <div className="p-6 space-y-6">
        {/* 주요 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FileSearch}
            label="총 분석"
            value={stats.totalAnalysis.toLocaleString()}
            subValue={`오늘 +${stats.analysisToday}`}
            color="blue"
          />
          <StatCard
            icon={ShoppingCart}
            label="총 주문"
            value={stats.totalOrders.toLocaleString()}
            subValue={`오늘 +${stats.ordersToday}`}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="총 매출"
            value={`₩${stats.totalRevenue.toLocaleString()}`}
            subValue={`오늘 +₩${stats.revenueToday.toLocaleString()}`}
            color="emerald"
          />
          <StatCard
            icon={Users}
            label="총 회원"
            value={stats.totalMembers.toLocaleString()}
            subValue={`오늘 +${stats.newMembersToday}`}
            color="orange"
          />
        </div>

        {/* 주문 현황 바 */}
        <OrderStatusBar stats={stats.ordersByStatus} />

        {/* 상세 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 상품별 분석 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-sm font-medium text-slate-700 mb-4">상품별 분석</h3>
            <div className="space-y-3">
              {Object.entries(stats.analysisByProduct).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-600">
                    {PRODUCT_TYPE_LABELS[key as keyof typeof PRODUCT_TYPE_LABELS]}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${(value / Math.max(stats.totalAnalysis, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-12 text-right">
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 서비스 모드별 분석 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-sm font-medium text-slate-700 mb-4">서비스 모드별 분석</h3>
            <div className="space-y-3">
              {Object.entries(stats.analysisByMode).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-600">
                    {SERVICE_MODE_LABELS[key as keyof typeof SERVICE_MODE_LABELS]}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${(value / Math.max(stats.totalAnalysis, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-12 text-right">
                      {value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* QR 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            icon={QrCode}
            label="총 QR 코드"
            value={stats.totalQRCodes}
            color="slate"
          />
          <StatCard
            icon={QrCode}
            label="총 QR 스캔"
            value={stats.totalQRScans.toLocaleString()}
            color="slate"
          />
        </div>
      </div>
    </div>
  )
}
