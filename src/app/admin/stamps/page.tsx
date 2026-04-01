'use client'

import { useState, useEffect } from 'react'
import { AdminGuard } from '../components/AdminGuard'
import { AdminHeader } from '../components/AdminHeader'
import { AdminSidebar } from '../components/AdminSidebar'
import { Search, Plus, Stamp, History, Award, User, Loader2, Check, AlertCircle, MapPin, RefreshCw } from 'lucide-react'

interface StampUser {
  user_id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  total_stamps: number
  updated_at: string | null
}

interface OfflineCustomer {
  user_id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  total_stamps: number
  offline_analysis_count: number
  latest_analysis: {
    twitter_name: string
    perfume_name: string
    image_url: string | null
    created_at: string
  }
}

interface StampHistoryItem {
  id: string
  stamps_added: number
  source: string
  order_id: string | null
  admin_note: string | null
  created_at: string
}

interface StampRewardItem {
  id: string
  milestone: number
  reward_type: string
  is_claimed: boolean
  claimed_at: string | null
}

export default function AdminStampsPage() {
  const [tab, setTab] = useState<'offline' | 'search'>('offline')
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [stampUsers, setStampUsers] = useState<StampUser[]>([])
  const [offlineCustomers, setOfflineCustomers] = useState<OfflineCustomer[]>([])
  const [history, setHistory] = useState<StampHistoryItem[]>([])
  const [rewards, setRewards] = useState<StampRewardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [offlineLoading, setOfflineLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [addStamps, setAddStamps] = useState(1)
  const [addNote, setAddNote] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 페이지 로드 시 오프라인 고객 목록 자동 로드
  useEffect(() => {
    fetchOfflineCustomers()
  }, [])

  const fetchOfflineCustomers = async () => {
    setOfflineLoading(true)
    try {
      const res = await fetch('/api/admin/stamps?mode=offline')
      const data = await res.json()
      if (data.success) {
        setOfflineCustomers(data.customers || [])
      }
    } catch (e) {
      console.error('Failed to load offline customers:', e)
    }
    setOfflineLoading(false)
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stamps?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      if (data.success) {
        setStampUsers(data.stamps || [])
      }
    } catch (e) {
      console.error('Search failed:', e)
    }
    setLoading(false)
  }

  const handleSelectUser = async (userId: string, userName?: string) => {
    setSelectedUserId(userId)
    setSelectedUserName(userName || '')
    setDetailLoading(true)
    setMessage(null)
    try {
      const [historyRes, rewardsRes] = await Promise.all([
        fetch(`/api/admin/stamps/history?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/admin/stamps/rewards?userId=${encodeURIComponent(userId)}`),
      ])
      const historyData = await historyRes.json()
      const rewardsData = await rewardsRes.json()
      setHistory(historyData.history || [])
      setRewards(rewardsData.rewards || [])
    } catch (e) {
      console.error('Failed to load details:', e)
    }
    setDetailLoading(false)
  }

  const handleAddStamps = async () => {
    if (!selectedUserId || addStamps < 1) return
    setAddLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/stamps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          stamps: addStamps,
          note: addNote || `오프라인 매장 - ${addStamps}개 스탬프`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `✅ ${selectedUserName || '회원'}님에게 ${addStamps}개 스탬프 추가 완료! (총 ${data.newTotal}개)` })
        setAddStamps(1)
        setAddNote('')
        handleSelectUser(selectedUserId, selectedUserName)
        fetchOfflineCustomers() // 오프라인 목록도 새로고침
      } else {
        setMessage({ type: 'error', text: data.error || '스탬프 추가 실패' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: '서버 오류' })
    }
    setAddLoading(false)
  }

  // 원클릭 스탬프 (오프라인 고객용)
  const handleQuickStamp = async (customer: OfflineCustomer) => {
    handleSelectUser(customer.user_id, customer.name || customer.latest_analysis.twitter_name || '')
  }

  const sourceLabels: Record<string, string> = {
    online_order: '🛒 온라인 주문',
    offline_admin: '🏪 오프라인 (관리자)',
    manual_adjustment: '✏️ 수동 조정',
  }

  const rewardLabels: Record<string, string> = {
    stamp_10: '10% 할인 쿠폰',
    stamp_20: '20% 할인 쿠폰',
    stamp_free: '무료 상품 쿠폰',
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="flex-1">
          <AdminHeader title="스탬프 관리" />
          <div className="p-6 max-w-6xl mx-auto">

            {/* 탭 전환 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTab('offline')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                  tab === 'offline'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MapPin size={16} />
                오프라인 고객
              </button>
              <button
                onClick={() => setTab('search')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                  tab === 'search'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Search size={16} />
                회원 검색
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel */}
              <div>
                {tab === 'offline' ? (
                  /* 오프라인 분석 고객 목록 */
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <MapPin size={20} className="text-amber-500" />
                        최근 오프라인 분석 고객
                      </h3>
                      <button
                        onClick={fetchOfflineCustomers}
                        disabled={offlineLoading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <RefreshCw size={16} className={offlineLoading ? 'animate-spin text-gray-400' : 'text-gray-500'} />
                      </button>
                    </div>

                    {offlineLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-amber-500" />
                      </div>
                    ) : offlineCustomers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8 text-sm">최근 7일간 오프라인 분석 고객이 없습니다</p>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {offlineCustomers.map((customer) => (
                          <button
                            key={customer.user_id}
                            onClick={() => handleQuickStamp(customer)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:border-amber-300 hover:bg-amber-50 ${
                              selectedUserId === customer.user_id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* 프로필 이미지 */}
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                {customer.avatar_url || customer.latest_analysis.image_url ? (
                                  <img
                                    src={customer.avatar_url || customer.latest_analysis.image_url || ''}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User size={18} className="text-gray-400" />
                                  </div>
                                )}
                              </div>

                              {/* 정보 */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">
                                  {customer.name || customer.latest_analysis.twitter_name || '이름 없음'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {customer.latest_analysis.perfume_name} · {formatTime(customer.latest_analysis.created_at)}
                                </p>
                              </div>

                              {/* 스탬프 수 + 분석 횟수 */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                  분석 {customer.offline_analysis_count}회
                                </span>
                                <div className="flex items-center gap-1">
                                  <Stamp size={14} className="text-amber-500" />
                                  <span className="font-black text-amber-600">{customer.total_stamps}</span>
                                  <span className="text-xs text-gray-400">/6</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 회원 검색 */
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Search size={20} />
                      회원 검색
                    </h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="이름, 이메일로 검색..."
                        className="flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </button>
                    </div>

                    {stampUsers.length === 0 ? (
                      <p className="text-gray-500 text-center py-8 text-sm">
                        {search ? '검색 결과가 없습니다' : '이름 또는 이메일로 검색해주세요'}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {stampUsers.map((su) => (
                          <button
                            key={su.user_id}
                            onClick={() => handleSelectUser(su.user_id, su.name || su.email || '')}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:border-amber-300 ${
                              selectedUserId === su.user_id ? 'border-amber-500 bg-amber-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-sm">{su.name || '이름 없음'}</p>
                                <p className="text-xs text-gray-400">{su.email || su.user_id.slice(0, 16) + '...'}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Stamp size={14} className="text-amber-500" />
                                <span className="font-black text-amber-600">{su.total_stamps}</span>
                                <span className="text-xs text-gray-400">/6</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Panel - Detail & Actions */}
              <div className="space-y-6">
                {!selectedUserId ? (
                  <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
                    <Stamp size={48} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">왼쪽에서 고객을 선택해주세요</p>
                    <p className="text-gray-400 text-sm mt-1">스탬프를 추가하거나 이력을 확인할 수 있어요</p>
                  </div>
                ) : (
                  <>
                    {/* 스탬프 찍기 */}
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Stamp size={20} className="text-amber-600" />
                        도장 찍기
                        {selectedUserName && (
                          <span className="text-sm font-normal text-gray-500">· {selectedUserName}</span>
                        )}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-bold text-gray-700 w-14">수량</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map(n => (
                              <button
                                key={n}
                                onClick={() => setAddStamps(n)}
                                className={`w-10 h-10 rounded-lg font-black text-lg transition-all ${
                                  addStamps === n
                                    ? 'bg-amber-500 text-white shadow-md scale-105'
                                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-amber-300'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-bold text-gray-700 w-14">메모</label>
                          <input
                            type="text"
                            value={addNote}
                            onChange={(e) => setAddNote(e.target.value)}
                            placeholder="오프라인 매장 구매..."
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <button
                          onClick={handleAddStamps}
                          disabled={addLoading}
                          className="w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                        >
                          {addLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Stamp size={18} />
                          )}
                          도장 {addStamps}개 찍기
                        </button>
                        {message && (
                          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-bold ${
                            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 리워드 현황 */}
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <Award size={18} />
                        리워드 현황
                      </h3>
                      {detailLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 size={20} className="animate-spin text-amber-500" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {[
                            { milestone: 2, type: 'stamp_10' },
                            { milestone: 4, type: 'stamp_20' },
                            { milestone: 6, type: 'stamp_free' },
                          ].map(({ milestone, type }) => {
                            const reward = rewards.find(r => r.milestone === milestone)
                            return (
                              <div key={milestone} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="font-bold text-sm">{milestone}회 달성</p>
                                  <p className="text-xs text-gray-500">{rewardLabels[type]}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  reward?.is_claimed ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'
                                }`}>
                                  {reward?.is_claimed ? '✅ 발급완료' : '미달성'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* 스탬프 이력 */}
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <History size={18} />
                        스탬프 이력
                      </h3>
                      {detailLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 size={20} className="animate-spin text-amber-500" />
                        </div>
                      ) : history.length === 0 ? (
                        <p className="text-gray-400 text-center py-4 text-sm">아직 스탬프 이력이 없습니다</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {history.map((h) => (
                            <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-bold text-sm text-amber-600">+{h.stamps_added}개</p>
                                <p className="text-xs text-gray-500">
                                  {sourceLabels[h.source] || h.source}
                                  {h.admin_note && <span className="text-gray-400"> · {h.admin_note}</span>}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400">
                                {new Date(h.created_at).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
