'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { AdminMemberRecord } from '@/types/admin'
import * as XLSX from 'xlsx'

// Provider 라벨/색상
const PROVIDER_LABELS: Record<string, string> = { kakao: '카카오', google: '구글' }
const PROVIDER_COLORS: Record<string, string> = {
  kakao: 'bg-yellow-100 text-yellow-800',
  google: 'bg-blue-100 text-blue-800',
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  image_analysis: 'AI 이미지 분석',
  figure_diffuser: '피규어 디퓨저',
  personal_scent: '퍼스널 센트',
  graduation: '졸업 기념',
  etc: '기타',
}

// ========================
// 인사이트 타입
// ========================
interface InsightsData {
  funnel: {
    total: number
    analyzed: number
    ordered: number
    analyzedAndOrdered: number
    inactive: number
    signupToAnalysis: number
    analysisToOrder: number
    signupToOrder: number
  }
  segments: {
    loyal: number
    buyer: number
    explorer: number
    dormant: number
  }
  channelStats: Record<string, { total: number; analyzed: number; ordered: number; revenue: number }>
  referralEffect: {
    referredCount: number
    directCount: number
    referredAnalysisRate: number
    directAnalysisRate: number
    referredOrderRate: number
    directOrderRate: number
  }
  topReferrers: { code: string; name: string; count: number }[]
  monthlyTrend: { month: string; count: number }[]
  orderPatterns: {
    totalRevenue: number
    avgOrderValue: number
    repeatBuyers: number
    repeatRate: number
    avgAnalysisPerMember: number
    avgOrderPerBuyer: number
  }
  couponEffect: {
    totalIssued: number
    totalUsed: number
    usageRate: number
    couponOrderRate: number
  }
  reviewStats: {
    totalReviewers: number
    reviewRate: number
  }
  productTypeAnalysis: Record<string, number>
  timeToAction: {
    avgTimeToAnalysisHours: number
    avgTimeToOrderHours: number
  }
}

// ========================
// 상세 모달
// ========================
function MemberDetailModal({
  member,
  isOpen,
  onClose,
}: {
  member: AdminMemberRecord | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !member) return null

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const formatCurrency = (n: number) => n.toLocaleString('ko-KR') + '원'

  // 가입→첫분석 시간
  const getTimeDiff = (from: string, to: string | null) => {
    if (!to) return '-'
    const diff = new Date(to).getTime() - new Date(from).getTime()
    const hours = Math.round(diff / (1000 * 60 * 60))
    if (hours < 1) return '1시간 이내'
    if (hours < 24) return `${hours}시간`
    return `${Math.round(hours / 24)}일`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">회원 상세 정보</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-medium text-slate-900 mb-3">기본 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">이름</span><span className="font-medium">{member.name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">이메일</span><span className="font-medium">{member.email || '-'}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">가입 방법</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${PROVIDER_COLORS[member.provider] || 'bg-slate-100'}`}>
                  {PROVIDER_LABELS[member.provider] || member.provider}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">가입일</span><span className="font-medium">{formatDate(member.created_at)}</span></div>
            </div>
          </div>

          {/* 추천 정보 */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-medium text-slate-900 mb-3">추천 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">내 추천 코드</span><span className="font-mono font-medium text-purple-600">{member.referral_code || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">피추천인 수</span><span className="font-medium">{member.referred_count}명</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">추천인</span>
                <span className="font-medium">{member.referrer ? `${member.referrer.name || member.referrer.email}` : '-'}</span>
              </div>
            </div>
          </div>

          {/* 활동 & 소비 */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-medium text-slate-900 mb-3">활동 & 소비</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{member.analysis_count}</p>
                <p className="text-xs text-slate-500">분석</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{member.order_count}</p>
                <p className="text-xs text-slate-500">주문</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(member.order_total)}</p>
                <p className="text-xs text-slate-500">총 결제</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{member.review_count}</p>
                <p className="text-xs text-slate-500">리뷰</p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">쿠폰</span><span className="font-medium">{member.coupon_used}/{member.coupon_total} 사용</span></div>
              <div className="flex justify-between"><span className="text-slate-500">가입→첫분석</span><span className="font-medium">{getTimeDiff(member.created_at, member.first_analysis_at)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">가입→첫주문</span><span className="font-medium">{getTimeDiff(member.created_at, member.first_order_at)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================
// 인사이트 대시보드
// ========================
function InsightsDashboard({ data }: { data: InsightsData }) {
  const formatCurrency = (n: number) => n.toLocaleString('ko-KR') + '원'
  const formatHours = (h: number) => {
    if (h < 1) return '1시간 미만'
    if (h < 24) return `${Math.round(h)}시간`
    return `${Math.round(h / 24)}일 ${Math.round(h % 24)}시간`
  }

  const maxMonthly = Math.max(...data.monthlyTrend.map(m => m.count), 1)

  return (
    <div className="space-y-6">
      {/* 전환 퍼널 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-1">전환 퍼널</h3>
        <p className="text-sm text-slate-500 mb-5">가입 → 분석 → 구매 전환 흐름</p>
        <div className="flex items-end gap-2 mb-6">
          {[
            { label: '전체 가입', value: data.funnel.total, color: 'bg-slate-200', pct: 100 },
            { label: '분석 완료', value: data.funnel.analyzed, color: 'bg-blue-400', pct: data.funnel.signupToAnalysis },
            { label: '구매 전환', value: data.funnel.ordered, color: 'bg-green-500', pct: data.funnel.signupToOrder },
          ].map((step, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="relative mx-auto mb-2" style={{ width: `${Math.max(step.pct, 20)}%`, minWidth: '60px' }}>
                <div className={`${step.color} rounded-lg transition-all`} style={{ height: `${Math.max(step.pct * 1.5, 30)}px` }} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{step.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{step.label}</p>
              <p className="text-xs font-medium text-slate-700">{step.pct}%</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{data.funnel.signupToAnalysis}%</p>
            <p className="text-xs text-blue-600">가입→분석 전환율</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{data.funnel.analysisToOrder}%</p>
            <p className="text-xs text-green-600">분석→구매 전환율</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-purple-700">{data.funnel.signupToOrder}%</p>
            <p className="text-xs text-purple-600">가입→구매 전환율</p>
          </div>
        </div>
      </div>

      {/* 회원 세그먼트 + 행동 지표 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">회원 세그먼트</h3>
          <p className="text-sm text-slate-500 mb-4">활동 수준별 회원 분류</p>
          <div className="space-y-3">
            {[
              { label: '충성 고객', desc: '재구매 2회+', value: data.segments.loyal, color: 'bg-green-500', textColor: 'text-green-700' },
              { label: '첫 구매', desc: '구매 1회', value: data.segments.buyer, color: 'bg-blue-500', textColor: 'text-blue-700' },
              { label: '탐색 중', desc: '분석만, 미구매', value: data.segments.explorer, color: 'bg-amber-500', textColor: 'text-amber-700' },
              { label: '비활동', desc: '가입 후 활동 없음', value: data.segments.dormant, color: 'bg-slate-300', textColor: 'text-slate-600' },
            ].map((seg, i) => {
              const pct = data.funnel.total > 0 ? Math.round((seg.value / data.funnel.total) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className={`font-medium ${seg.textColor}`}>{seg.label}</span>
                      <span className="text-xs text-slate-400 ml-1">{seg.desc}</span>
                    </div>
                    <span className="font-bold text-slate-900">{seg.value}명 <span className="text-xs font-normal text-slate-500">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${seg.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">핵심 행동 지표</h3>
          <p className="text-sm text-slate-500 mb-4">회원 평균 활동 패턴</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{data.orderPatterns.avgAnalysisPerMember}</p>
              <p className="text-xs text-blue-600 mt-1">인당 평균 분석</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{data.orderPatterns.avgOrderPerBuyer}</p>
              <p className="text-xs text-green-600 mt-1">인당 평균 주문</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(data.orderPatterns.avgOrderValue)}</p>
              <p className="text-xs text-amber-600 mt-1">평균 주문 금액</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">{data.orderPatterns.repeatRate}%</p>
              <p className="text-xs text-purple-600 mt-1">재구매율</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">가입→첫 분석 평균</span>
              <span className="font-medium">{formatHours(data.timeToAction.avgTimeToAnalysisHours)}</span>
            </div>
            <div className="flex justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-500">가입→첫 구매 평균</span>
              <span className="font-medium">{formatHours(data.timeToAction.avgTimeToOrderHours)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 가입 채널별 성과 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-1">가입 채널별 성과 비교</h3>
        <p className="text-sm text-slate-500 mb-4">채널별 전환율과 매출 기여도</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left font-medium text-slate-700">채널</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">가입</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">분석</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">분석 전환율</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">구매</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">구매 전환율</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">매출</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">인당 매출</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.channelStats).sort(([, a], [, b]) => b.total - a.total).map(([ch, stats]) => (
                <tr key={ch} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${PROVIDER_COLORS[ch] || 'bg-slate-100'}`}>
                      {PROVIDER_LABELS[ch] || ch}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{stats.total}</td>
                  <td className="px-4 py-2 text-right">{stats.analyzed}</td>
                  <td className="px-4 py-2 text-right font-medium text-blue-600">{stats.total > 0 ? Math.round((stats.analyzed / stats.total) * 100) : 0}%</td>
                  <td className="px-4 py-2 text-right">{stats.ordered}</td>
                  <td className="px-4 py-2 text-right font-medium text-green-600">{stats.total > 0 ? Math.round((stats.ordered / stats.total) * 100) : 0}%</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(stats.revenue)}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{stats.ordered > 0 ? formatCurrency(Math.round(stats.revenue / stats.ordered)) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 추천 효과 + 쿠폰/리뷰 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">추천 효과 분석</h3>
          <p className="text-sm text-slate-500 mb-4">추천 가입 vs 직접 가입 비교</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xl font-bold text-purple-700">{data.referralEffect.referredCount}</p>
                <p className="text-xs text-purple-600">추천 가입</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xl font-bold text-slate-700">{data.referralEffect.directCount}</p>
                <p className="text-xs text-slate-600">직접 가입</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-slate-600">지표</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-purple-600">추천</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-slate-600">직접</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-1.5">분석 전환율</td>
                  <td className="px-3 py-1.5 text-right font-medium text-purple-600">{data.referralEffect.referredAnalysisRate}%</td>
                  <td className="px-3 py-1.5 text-right">{data.referralEffect.directAnalysisRate}%</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-1.5">구매 전환율</td>
                  <td className="px-3 py-1.5 text-right font-medium text-purple-600">{data.referralEffect.referredOrderRate}%</td>
                  <td className="px-3 py-1.5 text-right">{data.referralEffect.directOrderRate}%</td>
                </tr>
              </tbody>
            </table>
            {data.topReferrers.length > 0 && (
              <>
                <p className="text-xs font-medium text-slate-700 mt-3">Top 추천인</p>
                <div className="space-y-1">
                  {data.topReferrers.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex justify-between text-sm bg-slate-50 rounded px-3 py-1.5">
                      <span className="text-slate-600">{i + 1}. {r.name}</span>
                      <span className="font-medium text-purple-600">{r.count}명</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">쿠폰 & 리뷰</h3>
          <p className="text-sm text-slate-500 mb-4">프로모션 효과와 고객 참여</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-amber-700">{data.couponEffect.usageRate}%</p>
                <p className="text-xs text-amber-600">쿠폰 사용률</p>
                <p className="text-[10px] text-amber-500">{data.couponEffect.totalUsed}/{data.couponEffect.totalIssued}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-700">{data.couponEffect.couponOrderRate}%</p>
                <p className="text-xs text-green-600">쿠폰 사용자 구매율</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-blue-700">{data.reviewStats.totalReviewers}</p>
                <p className="text-xs text-blue-600">리뷰 작성자</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-slate-700">{data.reviewStats.reviewRate}%</p>
                <p className="text-xs text-slate-600">구매자 리뷰율</p>
              </div>
            </div>

            {/* 상품 타입별 분석 */}
            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">상품 타입별 분석 분포</p>
              <div className="space-y-1.5">
                {Object.entries(data.productTypeAnalysis)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const total = Object.values(data.productTypeAnalysis).reduce((a, b) => a + b, 0)
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-slate-600">{PRODUCT_TYPE_LABELS[type] || type}</span>
                          <span className="font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 월별 가입 추이 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-1">월별 가입자 추이</h3>
        <p className="text-sm text-slate-500 mb-4">
          합계: {data.monthlyTrend.reduce((a, b) => a + b.count, 0).toLocaleString()}명
          {data.monthlyTrend.length > 0 && ` · 월 평균: ${Math.round(data.monthlyTrend.reduce((a, b) => a + b.count, 0) / data.monthlyTrend.length)}명`}
        </p>
        <div className="flex items-end gap-1" style={{ height: '160px' }}>
          {data.monthlyTrend.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
              <div className="absolute -top-6 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded z-10 whitespace-nowrap">
                {m.month}: {m.count}명
              </div>
              <div
                className="w-full bg-blue-400 hover:bg-blue-500 rounded-t transition-all cursor-default min-h-[2px]"
                style={{ height: `${(m.count / maxMonthly) * 140}px` }}
              />
              <p className="text-[9px] text-slate-400 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                {m.month.slice(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ========================
// 메인 페이지
// ========================
export default function AdminMembersPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'insights'>('list')

  // 목록 상태
  const [members, setMembers] = useState<AdminMemberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 필터
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hasAnalysis, setHasAnalysis] = useState('all')
  const [hasOrder, setHasOrder] = useState('all')
  const [sortBy, setSortBy] = useState('created_at_desc')

  // 모달
  const [selectedMember, setSelectedMember] = useState<AdminMemberRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // 인사이트
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  // 엑셀 다운로드
  const [exporting, setExporting] = useState(false)

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.append('search', search)
    if (provider !== 'all') params.append('provider', provider)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    if (hasAnalysis !== 'all') params.append('has_analysis', hasAnalysis)
    if (hasOrder !== 'all') params.append('has_order', hasOrder)
    if (sortBy !== 'created_at_desc') params.append('sort_by', sortBy)
    return params
  }, [page, search, provider, dateFrom, dateTo, hasAnalysis, hasOrder, sortBy])

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/members?${buildParams()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(data.data)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  const fetchInsights = useCallback(async () => {
    try {
      setInsightsLoading(true)
      const res = await fetch('/api/admin/members?type=insights')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInsights(data)
    } catch (err) {
      console.error('Insights error:', err)
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'list') fetchMembers()
  }, [activeTab, fetchMembers])

  useEffect(() => {
    if (activeTab === 'insights' && !insights) fetchInsights()
  }, [activeTab, insights, fetchInsights])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setProvider('all')
    setDateFrom('')
    setDateTo('')
    setHasAnalysis('all')
    setHasOrder('all')
    setSortBy('created_at_desc')
    setPage(1)
  }

  const downloadExcel = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams(buildParams())
      params.set('export', 'true')
      params.delete('page')
      params.delete('limit')

      const res = await fetch(`/api/admin/members?${params}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      const excelData = (data.data as AdminMemberRecord[]).map((m, i) => ({
        '번호': i + 1,
        '이름': m.name || '-',
        '이메일': m.email || '-',
        '가입 방법': PROVIDER_LABELS[m.provider] || m.provider,
        '추천 코드': m.referral_code || '-',
        '피추천인 수': m.referred_count,
        '추천인': m.referrer ? (m.referrer.name || m.referrer.email || '-') : '-',
        '분석 횟수': m.analysis_count,
        '주문 횟수': m.order_count,
        '총 결제금액': m.order_total,
        '리뷰 수': m.review_count,
        '쿠폰 사용': `${m.coupon_used}/${m.coupon_total}`,
        '가입일': new Date(m.created_at).toLocaleDateString('ko-KR'),
        '첫 분석일': m.first_analysis_at ? new Date(m.first_analysis_at).toLocaleDateString('ko-KR') : '-',
        '첫 주문일': m.first_order_at ? new Date(m.first_order_at).toLocaleDateString('ko-KR') : '-',
      }))

      const worksheet = XLSX.utils.json_to_sheet(excelData)
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 12 },
        { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
        { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '회원목록')

      const today = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `회원목록_${today}.xlsx`)
    } catch (err) {
      alert('엑셀 다운로드에 실패했습니다: ' + (err instanceof Error ? err.message : ''))
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })

  const formatCurrency = (n: number) => n.toLocaleString('ko-KR')

  return (
    <div className="p-6">
      <AdminHeader
        title="회원 관리"
        subtitle="회원 정보 조회 및 마케팅 인사이트"
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'list' && (
              <>
                <button
                  onClick={downloadExcel}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? '다운로드 중...' : '엑셀'}
                </button>
              </>
            )}
            <button
              onClick={activeTab === 'list' ? fetchMembers : fetchInsights}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="새로고침"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        }
      />

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          회원 목록
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'insights' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          인사이트
        </button>
      </div>

      {activeTab === 'insights' ? (
        insightsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-slate-500">인사이트 분석 중...</span>
          </div>
        ) : insights ? (
          <InsightsDashboard data={insights} />
        ) : (
          <div className="text-center py-20 text-slate-500">인사이트 데이터를 불러올 수 없습니다</div>
        )
      ) : (
        <>
          {/* 필터 영역 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-slate-600 mb-1">검색</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="이름, 이메일, 추천코드"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-slate-600 mb-1">가입 방법</label>
                  <select
                    value={provider}
                    onChange={(e) => { setProvider(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">전체</option>
                    <option value="kakao">카카오</option>
                    <option value="google">구글</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-slate-600 mb-1">분석 여부</label>
                  <select
                    value={hasAnalysis}
                    onChange={(e) => { setHasAnalysis(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">전체</option>
                    <option value="yes">분석 함</option>
                    <option value="no">분석 안 함</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-slate-600 mb-1">주문 여부</label>
                  <select
                    value={hasOrder}
                    onChange={(e) => { setHasOrder(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">전체</option>
                    <option value="yes">주문 함</option>
                    <option value="no">주문 안 함</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <label className="block text-xs font-medium text-slate-600 mb-1">가입일 (시작)</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-medium text-slate-600 mb-1">가입일 (종료)</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-xs font-medium text-slate-600 mb-1">정렬</label>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="created_at_desc">최근 가입순</option>
                    <option value="created_at_asc">오래된 가입순</option>
                    <option value="analysis_desc">분석 많은순</option>
                    <option value="order_desc">주문 많은순</option>
                    <option value="order_total_desc">결제금액 높은순</option>
                    <option value="referred_desc">추천 많은순</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-yellow-400 text-slate-900 text-sm font-medium rounded-lg hover:bg-yellow-500 transition-colors"
                  >
                    검색
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    초기화
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* 통계 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              총 <span className="font-bold text-slate-900">{total.toLocaleString()}</span>명의 회원
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          {/* 테이블 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">회원</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">가입 방법</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">추천 코드</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-slate-600">피추천</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-slate-600">분석</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-slate-600">주문</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-slate-600">결제금액</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-slate-600">리뷰</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-slate-600">가입일</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-slate-600">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          로딩 중...
                        </div>
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-500">회원이 없습니다</td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 text-sm">{member.name || '(이름 없음)'}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${PROVIDER_COLORS[member.provider] || 'bg-slate-100'}`}>
                            {PROVIDER_LABELS[member.provider] || member.provider}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {member.referral_code ? (
                            <span className="font-mono text-xs text-purple-600">{member.referral_code}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-medium ${member.referred_count > 0 ? 'text-purple-600' : 'text-slate-300'}`}>
                            {member.referred_count}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-medium ${member.analysis_count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                            {member.analysis_count}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-medium ${member.order_count > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                            {member.order_count}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`text-sm ${member.order_total > 0 ? 'font-medium text-slate-900' : 'text-slate-300'}`}>
                            {member.order_total > 0 ? `${formatCurrency(member.order_total)}원` : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm ${member.review_count > 0 ? 'text-amber-600 font-medium' : 'text-slate-300'}`}>
                            {member.review_count}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">{formatDate(member.created_at)}</td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => { setSelectedMember(member); setIsDetailOpen(true) }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-slate-200">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const pageNum = startPage + i
                  if (pageNum > totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                        page === pageNum ? 'bg-yellow-400 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <MemberDetailModal
        member={selectedMember}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  )
}
