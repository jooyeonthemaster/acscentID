'use client'

import { useState, useEffect, use } from 'react'
import { AdminHeader } from '../../components/AdminHeader'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  User,
  Calendar,
  QrCode,
  Package,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { PRODUCT_TYPE_LABELS, SERVICE_MODE_LABELS, ProductType, ServiceMode } from '@/types/admin'

interface AnalysisDetailData {
  analysis: any
  user_profile: any
  feedback: any
  orders: any[]
}

export default function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<AnalysisDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/admin/analysis/${id}`)
      if (!res.ok) throw new Error('분석 상세를 불러오는데 실패했습니다')
      const data = await res.json()
      setData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-slate-600">{error || '데이터를 불러올 수 없습니다'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:underline"
        >
          뒤로 가기
        </button>
      </div>
    )
  }

  const { analysis, user_profile, feedback, orders } = data
  const analysisData = analysis.analysis_data

  return (
    <div>
      <AdminHeader
        title="분석 상세"
        subtitle={analysis.twitter_name || analysis.idol_name}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/admin/analysis/${id}/print`}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_#1e293b] hover:shadow-[1px_1px_0px_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Printer className="w-5 h-5" />
              보고서 출력
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
          목록으로
        </button>

        {/* 기본 정보 카드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 분석 정보 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              분석 정보
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500">아이돌명</span>
                <span className="font-medium text-slate-900">{analysis.idol_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">트위터 이름</span>
                <span className="font-medium text-slate-900">{analysis.twitter_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">추천 향수</span>
                <span className="font-medium text-slate-900">{analysis.perfume_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">브랜드</span>
                <span className="font-medium text-slate-900">{analysis.perfume_brand}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">상품 타입</span>
                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                  {PRODUCT_TYPE_LABELS[analysis.product_type as ProductType] || '최애 이미지 분석'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">서비스 모드</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  analysis.service_mode === 'offline'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {SERVICE_MODE_LABELS[analysis.service_mode as ServiceMode] || '온라인'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">분석일</span>
                <span className="text-slate-900">{formatDate(analysis.created_at)}</span>
              </div>
              {analysis.qr_code_id && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">QR 코드</span>
                  <span className="flex items-center gap-1 text-slate-900">
                    <QrCode className="w-4 h-4" />
                    {analysis.qr_code_id}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 사용자 정보 */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              사용자 정보
            </h3>
            {user_profile ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">이름</span>
                  <span className="font-medium text-slate-900">{user_profile.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">이메일</span>
                  <span className="text-slate-900">{user_profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">로그인 방식</span>
                  <span className="text-slate-900">{user_profile.provider || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">추천인 코드</span>
                  <span className="text-slate-900">{user_profile.referral_code || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">가입일</span>
                  <span className="text-slate-900">{formatDate(user_profile.created_at)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                익명 사용자
                <p className="text-sm mt-2">Fingerprint: {analysis.user_fingerprint?.slice(0, 16)}...</p>
              </div>
            )}
          </div>
        </div>

        {/* 키워드 */}
        {analysis.matching_keywords && analysis.matching_keywords.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">매칭 키워드</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.matching_keywords.map((keyword: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 피드백 정보 (오프라인 모드) */}
        {feedback && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              피드백 & 커스텀 레시피
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-slate-500">원본 향수</span>
                  <p className="font-medium text-slate-900">{feedback.perfume_name}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">잔향률</span>
                  <p className="font-medium text-slate-900">{feedback.retention_percentage}%</p>
                </div>
                <div>
                  <span className="text-sm text-slate-500">피드백 날짜</span>
                  <p className="font-medium text-slate-900">{formatDate(feedback.created_at)}</p>
                </div>
              </div>

              {/* 커스텀 레시피 */}
              {feedback.generated_recipe && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-3">확정 레시피</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {feedback.generated_recipe.granules?.map((granule: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="font-medium text-slate-900">{granule.name}</p>
                        <p className="text-sm text-slate-500">{granule.drops}방울</p>
                        <p className="text-xs text-slate-400">{granule.ratio}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 관련 주문 */}
        {orders && orders.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-[3px_3px_0px_#e2e8f0]">
            <h3 className="text-lg font-bold text-slate-900 mb-4">관련 주문</h3>
            <div className="space-y-2">
              {orders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/admin/orders?order=${order.id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <span className="font-mono text-sm text-slate-900">{order.order_number}</span>
                    <span className="ml-3 text-sm text-slate-500">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900">₩{order.final_price?.toLocaleString()}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'shipping' ? 'bg-purple-100 text-purple-700' :
                      order.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 분석 ID */}
        <div className="text-center text-sm text-slate-400">
          ID: {analysis.id}
        </div>
      </div>
    </div>
  )
}
