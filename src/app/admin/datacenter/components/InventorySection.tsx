'use client'

import { useState, useEffect } from 'react'
import {
  Loader2,
  Package,
  AlertTriangle,
  Download,
  Upload,
  Search,
  Globe,
  Store,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  X,
  History,
} from 'lucide-react'

interface InventoryItem {
  id: string
  fragranceId: string
  fragranceName: string
  category: string
  onlineStockMl: number
  offlineStockMl: number
  totalStockMl: number
  minThresholdMl: number
  isLowStock: boolean
  updatedAt: string
}

interface InventoryAlert {
  fragranceId: string
  fragranceName: string
  currentStock: number
  threshold: number
}

interface InventoryLog {
  id: string
  changeType: string
  source: string
  changeAmountMl: number
  resultingStockMl: number
  referenceType?: string
  note?: string
  createdAt: string
  createdBy?: string
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  citrus: { label: '시트러스', icon: '🍋' },
  floral: { label: '플로럴', icon: '🌸' },
  woody: { label: '우디', icon: '🌳' },
  musky: { label: '머스크', icon: '✨' },
  fruity: { label: '프루티', icon: '🍎' },
  spicy: { label: '스파이시', icon: '🌶️' },
}

export default function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'online' | 'offline'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // 모달 상태
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/datacenter/inventory')
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')
      const json = await res.json()
      setItems(json.items || [])
      setAlerts(json.alerts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDownloadCSV = () => {
    const headers = ['향료 ID', '향료명', '카테고리', '온라인 재고(ml)', '오프라인 재고(ml)', '총 재고(ml)', '최소 임계값(ml)', '상태']
    const rows = items.map((item) => [
      item.fragranceId,
      item.fragranceName,
      CATEGORY_LABELS[item.category]?.label || item.category,
      item.onlineStockMl,
      item.offlineStockMl,
      item.totalStockMl,
      item.minThresholdMl,
      item.isLowStock ? '재고 부족' : '정상',
    ])

    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `향료재고_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 필터링 및 정렬
  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.fragranceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fragranceId.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesLowStock = !showLowStockOnly || item.isLowStock
      return matchesSearch && matchesLowStock
    })
    .sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name':
          cmp = a.fragranceName.localeCompare(b.fragranceName)
          break
        case 'total':
          cmp = a.totalStockMl - b.totalStockMl
          break
        case 'online':
          cmp = a.onlineStockMl - b.onlineStockMl
          break
        case 'offline':
          cmp = a.offlineStockMl - b.offlineStockMl
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
        <button
          onClick={fetchData}
          className="mt-4 block mx-auto px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 재고 부족 경고 */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-600 mb-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold">재고 부족 경고: {alerts.length}개 향료</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.fragranceId}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-700">{alert.fragranceName}</span>
                <span className="text-red-600 font-bold">
                  {alert.currentStock}ml / {alert.threshold}ml
                </span>
              </div>
            ))}
          </div>
          {alerts.length > 6 && (
            <p className="text-xs text-red-500 mt-2">
              외 {alerts.length - 6}개 더...
            </p>
          )}
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">총 향료 종류</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{items.length}종</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-bold">온라인 총 재고</span>
          </div>
          <div className="text-2xl font-black text-blue-700">
            {items.reduce((sum, i) => sum + i.onlineStockMl, 0).toLocaleString()}ml
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Store className="w-4 h-4" />
            <span className="text-xs font-bold">오프라인 총 재고</span>
          </div>
          <div className="text-2xl font-black text-green-700">
            {items.reduce((sum, i) => sum + i.offlineStockMl, 0).toLocaleString()}ml
          </div>
        </div>
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">전체 총 재고</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {items.reduce((sum, i) => sum + i.totalStockMl, 0).toLocaleString()}ml
          </div>
        </div>
      </div>

      {/* 도구 모음 */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="향료 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">재고 부족만</span>
          </label>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600"
          >
            <Upload className="w-4 h-4" />
            일괄 설정
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg"
          >
            <Download className="w-4 h-4" />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* 재고 테이블 */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-bold text-slate-700">향료</th>
                <th className="text-left py-3 px-4 font-bold text-slate-700">카테고리</th>
                <th
                  className="text-right py-3 px-4 font-bold text-blue-600 cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('online')}
                >
                  <div className="flex items-center justify-end gap-1">
                    온라인
                    <SortIcon col="online" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-bold text-green-600 cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('offline')}
                >
                  <div className="flex items-center justify-end gap-1">
                    오프라인
                    <SortIcon col="offline" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-bold text-slate-700 cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('total')}
                >
                  <div className="flex items-center justify-end gap-1">
                    총 재고
                    <SortIcon col="total" />
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-bold text-slate-500">임계값</th>
                <th className="text-center py-3 px-4 font-bold text-slate-500">상태</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const cat = CATEGORY_LABELS[item.category] || { label: item.category, icon: '🎯' }
                return (
                  <tr
                    key={item.fragranceId}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{item.fragranceName}</div>
                      <div className="text-xs text-slate-400">{item.fragranceId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span>{cat.icon}</span>
                        <span className="text-slate-600">{cat.label}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-blue-600 font-medium">
                      {item.onlineStockMl.toLocaleString()}ml
                    </td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">
                      {item.offlineStockMl.toLocaleString()}ml
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-slate-900">
                      {item.totalStockMl.toLocaleString()}ml
                    </td>
                    <td className="text-right py-3 px-4 text-slate-400">
                      {item.minThresholdMl}ml
                    </td>
                    <td className="text-center py-3 px-4">
                      {item.isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          부족
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          정상
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 재고 상세/수정 모달 */}
      {selectedItem && (
        <InventoryModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={() => {
            setSelectedItem(null)
            fetchData()
          }}
        />
      )}

      {/* 일괄 설정 모달 */}
      {showBulkModal && (
        <BulkInventoryModal
          items={items}
          onClose={() => setShowBulkModal(false)}
          onSave={() => {
            setShowBulkModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

// 재고 상세/수정 모달 컴포넌트
function InventoryModal({
  item,
  onClose,
  onSave,
}: {
  item: InventoryItem
  onClose: () => void
  onSave: () => void
}) {
  const [onlineStock, setOnlineStock] = useState(item.onlineStockMl.toString())
  const [offlineStock, setOfflineStock] = useState(item.offlineStockMl.toString())
  const [threshold, setThreshold] = useState(item.minThresholdMl.toString())
  const [adjustSource, setAdjustSource] = useState<'online' | 'offline'>('online')
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [mode, setMode] = useState<'view' | 'edit' | 'adjust'>('view')

  useEffect(() => {
    fetchLogs()
  }, [item.fragranceId])

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch(`/api/admin/datacenter/inventory/${encodeURIComponent(item.fragranceId)}`)
      if (res.ok) {
        const json = await res.json()
        setLogs(json.logs || [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/datacenter/inventory/${encodeURIComponent(item.fragranceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlineStockMl: parseFloat(onlineStock) || 0,
          offlineStockMl: parseFloat(offlineStock) || 0,
          minThresholdMl: parseFloat(threshold) || 50,
        }),
      })
      if (res.ok) {
        onSave()
      } else {
        alert('저장 실패')
      }
    } catch {
      alert('오류 발생')
    } finally {
      setSaving(false)
    }
  }

  const handleAdjust = async () => {
    if (!adjustAmount || parseFloat(adjustAmount) <= 0) {
      alert('수량을 입력하세요')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/datacenter/inventory/${encodeURIComponent(item.fragranceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: adjustSource,
          changeType: adjustType,
          amountMl: parseFloat(adjustAmount),
          note: adjustNote,
        }),
      })
      if (res.ok) {
        onSave()
      } else {
        alert('조정 실패')
      }
    } catch {
      alert('오류 발생')
    } finally {
      setSaving(false)
    }
  }

  const cat = CATEGORY_LABELS[item.category] || { label: item.category, icon: '🎯' }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{cat.icon}</span>
              <h2 className="text-lg font-bold text-slate-900">{item.fragranceName}</h2>
            </div>
            <p className="text-xs text-slate-400">{item.fragranceId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 현재 재고 상태 */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">온라인</div>
              <div className="text-xl font-bold text-blue-700">{item.onlineStockMl}ml</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xs text-green-600 font-medium">오프라인</div>
              <div className="text-xl font-bold text-green-700">{item.offlineStockMl}ml</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-600 font-medium">합계</div>
              <div className="text-xl font-bold text-slate-900">{item.totalStockMl}ml</div>
            </div>
          </div>
        </div>

        {/* 모드 탭 */}
        <div className="px-6 py-2 border-b border-slate-100 flex gap-2">
          {(['view', 'edit', 'adjust'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m === 'view' ? '이력 조회' : m === 'edit' ? '재고 수정' : '추가/차감'}
            </button>
          ))}
        </div>

        {/* 모드별 콘텐츠 */}
        <div className="px-6 py-4">
          {mode === 'view' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <History className="w-4 h-4" />
                <span>최근 변동 이력</span>
              </div>
              {loadingLogs ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-slate-400 py-4">이력이 없습니다</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${
                          log.changeType === 'add' ? 'text-green-600' :
                          log.changeType === 'deduct' ? 'text-red-600' :
                          'text-slate-600'
                        }`}>
                          {log.changeType === 'add' ? '+' : log.changeType === 'deduct' ? '-' : ''}
                          {Math.abs(log.changeAmountMl)}ml
                          <span className="text-slate-400 ml-1">
                            ({log.source === 'online' ? '온라인' : '오프라인'})
                          </span>
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      {log.note && (
                        <p className="text-xs text-slate-500">{log.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  온라인 재고 (ml)
                </label>
                <input
                  type="number"
                  value={onlineStock}
                  onChange={(e) => setOnlineStock(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  오프라인 재고 (ml)
                </label>
                <input
                  type="number"
                  value={offlineStock}
                  onChange={(e) => setOfflineStock(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  최소 임계값 (ml)
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}

          {mode === 'adjust' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustSource('online')}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    adjustSource === 'online'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  온라인
                </button>
                <button
                  onClick={() => setAdjustSource('offline')}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    adjustSource === 'offline'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  오프라인
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustType('add')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium ${
                    adjustType === 'add'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
                <button
                  onClick={() => setAdjustType('deduct')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium ${
                    adjustType === 'deduct'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  차감
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  수량 (ml)
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  사유 (선택)
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="예: 입고, 폐기 등"
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"
                />
              </div>
              <button
                onClick={handleAdjust}
                disabled={saving}
                className={`w-full py-2 font-medium rounded-lg disabled:opacity-50 ${
                  adjustType === 'add'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {saving ? '처리 중...' : adjustType === 'add' ? '재고 추가' : '재고 차감'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 일괄 설정 모달 컴포넌트
function BulkInventoryModal({
  items,
  onClose,
  onSave,
}: {
  items: InventoryItem[]
  onClose: () => void
  onSave: () => void
}) {
  const [editedItems, setEditedItems] = useState<
    Array<{ fragranceId: string; onlineStockMl: number; offlineStockMl: number; minThresholdMl: number }>
  >(
    items.map((i) => ({
      fragranceId: i.fragranceId,
      onlineStockMl: i.onlineStockMl,
      offlineStockMl: i.offlineStockMl,
      minThresholdMl: i.minThresholdMl,
    }))
  )
  const [saving, setSaving] = useState(false)

  const handleChange = (fragranceId: string, field: 'onlineStockMl' | 'offlineStockMl' | 'minThresholdMl', value: number) => {
    setEditedItems((prev) =>
      prev.map((item) =>
        item.fragranceId === fragranceId ? { ...item, [field]: value } : item
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/datacenter/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: editedItems }),
      })
      if (res.ok) {
        onSave()
      } else {
        alert('저장 실패')
      }
    } catch {
      alert('오류 발생')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">일괄 재고 설정</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-slate-700">향료</th>
                <th className="text-right py-3 px-4 font-bold text-blue-600 w-32">온라인 (ml)</th>
                <th className="text-right py-3 px-4 font-bold text-green-600 w-32">오프라인 (ml)</th>
                <th className="text-right py-3 px-4 font-bold text-slate-500 w-32">임계값 (ml)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const edited = editedItems.find((e) => e.fragranceId === item.fragranceId)!
                const cat = CATEGORY_LABELS[item.category] || { label: item.category, icon: '🎯' }
                return (
                  <tr key={item.fragranceId} className="border-b border-slate-100">
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span className="font-medium text-slate-900">{item.fragranceName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={edited.onlineStockMl}
                        onChange={(e) => handleChange(item.fragranceId, 'onlineStockMl', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-right"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={edited.offlineStockMl}
                        onChange={(e) => handleChange(item.fragranceId, 'offlineStockMl', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-green-200 rounded text-right"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={edited.minThresholdMl}
                        onChange={(e) => handleChange(item.fragranceId, 'minThresholdMl', parseFloat(e.target.value) || 50)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '일괄 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
