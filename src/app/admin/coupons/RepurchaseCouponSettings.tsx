'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Repeat,
  Users,
  X,
} from 'lucide-react'
import type { CouponDiscountType } from '@/types/coupon'

interface RepurchaseSettings {
  id: string | null
  isActive: boolean
  discountType: CouponDiscountType
  discountPercent: number
  discountAmount: number
  title: string
  description: string | null
  validUntil: string | null
}

function discountLabel(type: CouponDiscountType, value: number): string {
  return type === 'fixed_amount' ? `${value.toLocaleString('ko-KR')}원` : `${value}%`
}

export function RepurchaseCouponSettings() {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [isActive, setIsActive] = useState(true)
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percent')
  const [discountValue, setDiscountValue] = useState('10')

  // 저장 시 "변경 여부"를 판단하기 위한 직전 저장값
  const [savedType, setSavedType] = useState<CouponDiscountType>('percent')
  const [savedValue, setSavedValue] = useState(10)
  const [unusedCount, setUnusedCount] = useState(0)

  // 소급 여부 선택 모달
  const [scopeModalOpen, setScopeModalOpen] = useState(false)

  const applySettings = useCallback((settings: RepurchaseSettings, count: number) => {
    const value = settings.discountType === 'fixed_amount'
      ? settings.discountAmount || 0
      : settings.discountPercent || 0
    setIsActive(settings.isActive)
    setDiscountType(settings.discountType)
    setDiscountValue(String(value))
    setSavedType(settings.discountType)
    setSavedValue(value)
    setUnusedCount(count)
  }, [])

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/repurchase-coupon', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '재구매 할인 설정을 불러오지 못했습니다')
      }
      applySettings(data.settings, data.unusedCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '재구매 할인 설정을 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [applySettings])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const handleDiscountTypeChange = (type: CouponDiscountType) => {
    setDiscountType(type)
    setDiscountValue(type === 'percent' ? '10' : '5000')
  }

  const discountChanged =
    discountType !== savedType || Number(discountValue) !== savedValue

  const doSave = async (applyToExisting: boolean) => {
    setScopeModalOpen(false)
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/repurchase-coupon', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive,
          discountType,
          discountValue: Number(discountValue),
          applyToExisting,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다')
      }
      // 잠금/소급 처리로 미사용 수가 달라질 수 있으니 서버 기준으로 재조회
      await fetchSettings()
      setMessage(
        discountChanged
          ? applyToExisting
            ? '저장했습니다. 기존 미사용 쿠폰에도 새 할인이 적용됩니다.'
            : '저장했습니다. 기존 보유분은 기존 할인을 유지하고, 신규 발급분부터 적용됩니다.'
          : '재구매 할인 설정이 저장되었습니다.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveClick = () => {
    setError('')
    setMessage('')
    // 할인값이 바뀌었고 영향받을 미사용 쿠폰이 있으면 소급 여부를 묻는다.
    if (discountChanged && unusedCount > 0) {
      setScopeModalOpen(true)
      return
    }
    void doSave(false)
  }

  const summaryText = loading
    ? '설정 불러오는 중'
    : error
      ? '설정 확인 필요'
      : `${isActive ? '자동 발급 켜짐' : '자동 발급 꺼짐'} · ${discountLabel(discountType, Number(discountValue) || 0)} · 미사용 ${unusedCount.toLocaleString('ko-KR')}장`

  return (
    <section className="admin-no-print rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_#0f172a]">
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${expanded ? 'mb-5' : ''}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-900 bg-pink-300">
            <Repeat className="h-5 w-5 text-slate-950" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950">재구매 할인 설정</h2>
            <p className="text-sm font-semibold text-slate-500">
              구매 완료 고객에게 자동 발급되는 재구매 쿠폰
            </p>
            <p className="mt-1 truncate text-xs font-black text-slate-400">{summaryText}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 self-end sm:self-auto">
          {expanded && (
            <button
              type="button"
              onClick={() => void fetchSettings()}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="repurchase-coupon-settings-panel"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5"
          >
            {expanded ? '접기' : '펼치기'}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div id="repurchase-coupon-settings-panel">
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
          {/* 활성화 토글 */}
          <div className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-sm font-black text-slate-900">자동 발급 사용</div>
              <p className="text-xs font-semibold text-slate-500">
                {isActive
                  ? '구매 완료 시 재구매 쿠폰이 발급되고 결제 시 사용할 수 있어요'
                  : '신규 발급이 중단되고, 발급된 재구매 쿠폰도 사용할 수 없어요'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative h-7 w-12 flex-shrink-0 rounded-full border-2 border-slate-900 transition ${
                isActive ? 'bg-emerald-400' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  isActive ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">할인 방식</label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border-2 border-slate-200 bg-slate-100 p-1">
                {[
                  { value: 'percent' as const, label: '정률' },
                  { value: 'fixed_amount' as const, label: '정액' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDiscountTypeChange(option.value)}
                    className={`rounded-lg px-3 py-3 text-sm font-black transition ${
                      discountType === option.value
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-500 hover:bg-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                {discountType === 'fixed_amount' ? '할인 금액' : '할인율'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={discountType === 'fixed_amount' ? '100' : '1'}
                  max={discountType === 'fixed_amount' ? '1000000' : '100'}
                  step={discountType === 'fixed_amount' ? '100' : '1'}
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 pr-9 font-black text-slate-900 outline-none transition focus:border-slate-900"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                  {discountType === 'fixed_amount' ? '원' : '%'}
                </span>
              </div>
            </div>
          </div>

          {/* 현재 보유 현황 */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500">
            <Users className="h-3.5 w-3.5" />
            현재 미사용 재구매 쿠폰 {unusedCount.toLocaleString('ko-KR')}장 보유 — 할인율 변경 시 소급 여부를 선택할 수 있어요
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-pink-300 px-4 py-3 font-black text-slate-950 shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            설정 저장
          </button>
            </div>
          )}
        </div>
      )}

      {/* 소급 여부 선택 모달 */}
      {scopeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-[6px_6px_0_#0f172a]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">할인 변경 적용 범위</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  할인을 <span className="font-black text-slate-900">{discountLabel(savedType, savedValue)}</span>
                  {' → '}
                  <span className="font-black text-pink-600">{discountLabel(discountType, Number(discountValue))}</span>
                  (으)로 변경합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScopeModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              이미 발급된 <span className="font-black">미사용 쿠폰 {unusedCount.toLocaleString('ko-KR')}장</span>에도 적용할까요?
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void doSave(false)}
                className="w-full rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <div className="text-sm font-black text-slate-950">신규 발급분부터만 적용</div>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  기존 보유 {unusedCount.toLocaleString('ko-KR')}장은 받을 당시 할인({discountLabel(savedType, savedValue)})을 유지합니다.
                </p>
              </button>

              <button
                type="button"
                onClick={() => void doSave(true)}
                className="w-full rounded-xl border-2 border-pink-500 bg-pink-50 px-4 py-3 text-left transition hover:bg-pink-100"
              >
                <div className="text-sm font-black text-pink-700">기존 미사용분에도 소급 적용</div>
                <p className="mt-0.5 text-xs font-semibold text-pink-600/80">
                  보유 {unusedCount.toLocaleString('ko-KR')}장 모두 새 할인({discountLabel(discountType, Number(discountValue))})으로 변경됩니다.
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setScopeModalOpen(false)}
              className="mt-3 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
