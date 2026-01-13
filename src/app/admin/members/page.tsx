'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { AdminMemberRecord } from '@/types/admin'

// Provider 라벨
const PROVIDER_LABELS: Record<string, string> = {
  kakao: '카카오',
  google: '구글',
}

// Provider 색상
const PROVIDER_COLORS: Record<string, string> = {
  kakao: 'bg-yellow-100 text-yellow-800',
  google: 'bg-blue-100 text-blue-800',
}

interface MemberDetailModalProps {
  member: AdminMemberRecord | null
  isOpen: boolean
  onClose: () => void
}

function MemberDetailModal({ member, isOpen, onClose }: MemberDetailModalProps) {
  if (!isOpen || !member) return null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">회원 상세 정보</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
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
              <div className="flex justify-between">
                <span className="text-slate-500">이름</span>
                <span className="font-medium">{member.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">이메일</span>
                <span className="font-medium">{member.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">가입 방법</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${PROVIDER_COLORS[member.provider] || 'bg-slate-100'}`}>
                  {PROVIDER_LABELS[member.provider] || member.provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">가입일</span>
                <span className="font-medium">{formatDate(member.created_at)}</span>
              </div>
            </div>
          </div>

          {/* 추천 정보 */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-medium text-slate-900 mb-3">추천 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">내 추천 코드</span>
                <span className="font-mono font-medium text-purple-600">{member.referral_code || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">피추천인 수</span>
                <span className="font-medium">{member.referred_count || 0}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">추천인</span>
                <span className="font-medium">
                  {member.referrer
                    ? `${member.referrer.name || member.referrer.email}`
                    : '-'}
                </span>
              </div>
              {member.referred_by && (
                <div className="flex justify-between">
                  <span className="text-slate-500">사용한 추천 코드</span>
                  <span className="font-mono text-slate-600">{member.referred_by}</span>
                </div>
              )}
            </div>
          </div>

          {/* 활동 정보 */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-medium text-slate-900 mb-3">활동 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{member.analysis_count || 0}</p>
                <p className="text-xs text-slate-500">분석 횟수</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{member.order_count || 0}</p>
                <p className="text-xs text-slate-500">주문 횟수</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMemberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 페이지네이션
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 필터
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // 모달
  const [selectedMember, setSelectedMember] = useState<AdminMemberRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (search) params.append('search', search)
      if (provider !== 'all') params.append('provider', provider)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const res = await fetch(`/api/admin/members?${params}`)
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
  }, [page, search, provider, dateFrom, dateTo])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchMembers()
  }

  const resetFilters = () => {
    setSearch('')
    setProvider('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const openDetail = (member: AdminMemberRecord) => {
    setSelectedMember(member)
    setIsDetailOpen(true)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="p-6">
      <AdminHeader
        title="회원 관리"
        actions={
          <button
            onClick={fetchMembers}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        }
      />

      {/* 필터 영역 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
          {/* 검색 */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 이메일, 추천코드"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* 가입 방법 */}
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1">가입 방법</label>
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="all">전체</option>
              <option value="kakao">카카오</option>
              <option value="google">구글</option>
            </select>
          </div>

          {/* 날짜 범위 */}
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1">가입일 (시작)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 mb-1">가입일 (종료)</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors"
            >
              검색
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              초기화
            </button>
          </div>
        </form>
      </div>

      {/* 통계 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          총 <span className="font-bold text-slate-900">{total}</span>명의 회원
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">회원</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">가입 방법</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">추천 코드</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">피추천</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">분석</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">주문</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">가입일</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">상세</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      로딩 중...
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    회원이 없습니다
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{member.name || '(이름 없음)'}</p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${PROVIDER_COLORS[member.provider] || 'bg-slate-100'}`}>
                        {PROVIDER_LABELS[member.provider] || member.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {member.referral_code ? (
                        <span className="font-mono text-sm text-purple-600">{member.referral_code}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${(member.referred_count || 0) > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {member.referred_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${(member.analysis_count || 0) > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {member.analysis_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${(member.order_count || 0) > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {member.order_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(member.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetail(member)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="상세 보기"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    page === pageNum
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-100'
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

      {/* 상세 모달 */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  )
}
