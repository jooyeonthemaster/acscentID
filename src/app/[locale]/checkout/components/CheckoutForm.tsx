"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { User, MapPin, Search, Phone, Home, MessageSquare, Star, Check, Loader2 } from "lucide-react"

import { useTranslations } from 'next-intl'
import { useAuth } from "@/contexts/AuthContext"
import { splitPhone, joinPhone } from "@/lib/user/address"

// 다음 주소 검색 타입
declare global {
  interface Window {
    daum?: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeData) => void
      }) => { open: () => void }
    }
  }
}

interface DaumPostcodeData {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  buildingName: string
}

export interface CheckoutFormData {
  name: string
  phone1: string
  phone2: string
  phone3: string
  zipCode: string
  address: string
  addressDetail: string
  memo: string
}

interface CheckoutFormProps {
  formData: CheckoutFormData
  setFormData: React.Dispatch<React.SetStateAction<CheckoutFormData>>
}

export function CheckoutForm({ formData, setFormData }: CheckoutFormProps) {
  const t = useTranslations()
  const { user, unifiedUser } = useAuth()
  const userId = unifiedUser?.id || user?.id || null
  const phone2Ref = useRef<HTMLInputElement>(null)
  const phone3Ref = useRef<HTMLInputElement>(null)
  const [postcodeLoading, setPostcodeLoading] = useState(false)
  const [manualAddressMode, setManualAddressMode] = useState(false)
  const [postcodeNotice, setPostcodeNotice] = useState("")
  const [savingDefault, setSavingDefault] = useState(false)
  const [savedDefault, setSavedDefault] = useState(false)
  const [defaultNotice, setDefaultNotice] = useState("")

  // 저장된 기본 배송지 자동 불러오기 (빈 칸만 채움, 1회)
  // 가드(prefilledRef)는 fetch 시작 전이 아니라 "성공적으로 채운 뒤"에 설정한다.
  // (Strict Mode 이중 실행 시 첫 fetch가 취소돼도 재실행에서 다시 불러올 수 있도록)
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (prefilledRef.current || !userId) return
    let active = true
    fetch("/api/user/address")
      .then((r) => (r.ok ? r.json() : { address: null }))
      .then(({ address }) => {
        if (!active || !address || prefilledRef.current) return
        prefilledRef.current = true
        const [p1, p2, p3] = splitPhone(address.phone)
        setFormData((prev) => {
          const hasPhone = !!(prev.phone2 || prev.phone3)
          return {
            ...prev,
            name: prev.name || address.name || "",
            phone1: hasPhone ? prev.phone1 : p1 || prev.phone1,
            phone2: hasPhone ? prev.phone2 : p2,
            phone3: hasPhone ? prev.phone3 : p3,
            zipCode: prev.zipCode || address.zipCode || "",
            address: prev.address || address.address || "",
            addressDetail: prev.addressDetail || address.addressDetail || "",
          }
        })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [userId, setFormData])

  // 현재 입력한 주소를 기본 배송지로 저장
  const handleSaveDefault = async () => {
    const payload = {
      name: formData.name.trim(),
      phone: joinPhone(formData.phone1, formData.phone2, formData.phone3),
      zipCode: formData.zipCode.trim(),
      address: formData.address.trim(),
      addressDetail: formData.addressDetail.trim(),
    }
    if (!payload.name || !payload.zipCode || !payload.address || !formData.phone2 || !formData.phone3) {
      setDefaultNotice(t('checkout.defaultAddressIncomplete'))
      return
    }
    setSavingDefault(true)
    setDefaultNotice("")
    try {
      const res = await fetch("/api/user/address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSavedDefault(true)
        setTimeout(() => setSavedDefault(false), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        setDefaultNotice(data.error || t('checkout.defaultAddressSaveFailed'))
      }
    } catch {
      setDefaultNotice(t('checkout.defaultAddressSaveFailed'))
    } finally {
      setSavingDefault(false)
    }
  }

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 전화번호 입력 핸들러 - 숫자만 허용하고 자동 포커스 이동
  const handlePhoneChange = (
    field: "phone1" | "phone2" | "phone3",
    value: string,
    maxLength: number
  ) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, maxLength)
    handleChange(field, numericValue)

    // 최대 길이 도달 시 다음 필드로 포커스 이동
    // iOS Safari 키보드 깜빡임을 줄이기 위해 requestAnimationFrame으로 한 프레임 지연
    if (numericValue.length === maxLength) {
      const target =
        field === "phone1"
          ? phone2Ref.current
          : field === "phone2"
            ? phone3Ref.current
            : null
      if (target) {
        requestAnimationFrame(() => {
          try {
            target.focus({ preventScroll: true })
          } catch {
            target.focus()
          }
        })
      }
    }
  }

  // Daum Postcode 스크립트가 아직 로드되지 않은 경우를 대비한 재시도 로직
  const waitForDaumPostcode = (timeoutMs = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false)
      if (window.daum?.Postcode) return resolve(true)
      const start = Date.now()
      const interval = window.setInterval(() => {
        if (window.daum?.Postcode) {
          window.clearInterval(interval)
          resolve(true)
        } else if (Date.now() - start > timeoutMs) {
          window.clearInterval(interval)
          resolve(false)
        }
      }, 100)
    })
  }

  // 다음 주소 검색 열기 — 스크립트 비동기 로드를 대비한 안전장치 포함
  const openAddressSearch = async () => {
    if (typeof window === "undefined") return
    if (!window.daum?.Postcode) {
      setPostcodeLoading(true)
      const ready = await waitForDaumPostcode()
      setPostcodeLoading(false)
      if (!ready) {
        setManualAddressMode(true)
        setPostcodeNotice(t('checkout.addressManualFallback'))
        return
      }
    }
    try {
      new window.daum!.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          setManualAddressMode(false)
          setPostcodeNotice("")
          setFormData((prev) => ({
            ...prev,
            zipCode: data.zonecode,
            address: data.roadAddress || data.jibunAddress,
          }))
        },
      }).open()
    } catch {
      setManualAddressMode(true)
      setPostcodeNotice(t('checkout.addressManualFallback'))
    }
  }

  // 스크립트가 준비되면 버튼을 정상 상태로
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.daum?.Postcode) return
    const id = window.setInterval(() => {
      if (window.daum?.Postcode) {
        window.clearInterval(id)
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_#000] space-y-5"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#FEF9C3] border-2 border-slate-900 flex items-center justify-center">
          <MapPin size={16} className="text-slate-900" />
        </div>
        <h3 className="font-black text-lg text-slate-900">{t('checkout.shippingInfo')}</h3>
      </div>

      <div className="space-y-4">
        {/* 받는 분 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
            <User size={14} />
            {t('checkout.recipient')} <span className="text-[#F472B6]">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder={t('checkout.namePlaceholder')}
            autoComplete="name"
            enterKeyHint="next"
            className="w-full px-3 py-3 rounded-xl border-2 border-slate-900 focus:border-[#F472B6] focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white hover:bg-slate-50 font-medium text-sm"
          />
        </div>

        {/* 연락처 - 3개 필드 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
            <Phone size={14} />
            {t('checkout.phone')} <span className="text-[#F472B6]">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.phone1}
              onChange={(e) => handlePhoneChange("phone1", e.target.value, 3)}
              placeholder="010"
              maxLength={3}
              autoComplete="tel-area-code"
              enterKeyHint="next"
              className="flex-1 min-w-0 px-2 py-3 rounded-xl border-2 border-slate-900 focus:border-[#F472B6] focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-center font-bold bg-white hover:bg-slate-50"
            />
            <span className="text-slate-900 font-bold text-sm">-</span>
            <input
              ref={phone2Ref}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.phone2}
              onChange={(e) => handlePhoneChange("phone2", e.target.value, 4)}
              placeholder="0000"
              maxLength={4}
              autoComplete="tel-local-prefix"
              enterKeyHint="next"
              className="flex-1 min-w-0 px-2 py-3 rounded-xl border-2 border-slate-900 focus:border-[#F472B6] focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-center font-bold bg-white hover:bg-slate-50"
            />
            <span className="text-slate-900 font-bold text-sm">-</span>
            <input
              ref={phone3Ref}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.phone3}
              onChange={(e) => handlePhoneChange("phone3", e.target.value, 4)}
              placeholder="0000"
              maxLength={4}
              autoComplete="tel-local-suffix"
              enterKeyHint="done"
              className="flex-1 min-w-0 px-2 py-3 rounded-xl border-2 border-slate-900 focus:border-[#F472B6] focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-400 text-center font-bold bg-white hover:bg-slate-50"
            />
          </div>
        </div>

        {/* 우편번호 + 주소 검색 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
            <Home size={14} />
            {t('checkout.address')} <span className="text-[#F472B6]">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={formData.zipCode}
              readOnly={!manualAddressMode}
              onChange={(e) => handleChange("zipCode", e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              onClick={manualAddressMode ? undefined : openAddressSearch}
              inputMode="numeric"
              placeholder={manualAddressMode ? t('checkout.manualZipcodePlaceholder') : t('checkout.zipcode')}
              className={`flex-1 min-w-0 px-3 py-3 rounded-xl border-2 text-slate-900 placeholder:text-slate-400 font-medium text-sm ${
                manualAddressMode
                  ? "border-slate-900 bg-white"
                  : "border-slate-300 bg-slate-100 cursor-pointer"
              }`}
            />
            <button
              type="button"
              onClick={openAddressSearch}
              disabled={postcodeLoading}
              className="flex-shrink-0 bg-[#FEF9C3] text-slate-900 px-3 py-3 rounded-xl border-2 border-slate-900 font-bold flex items-center gap-1.5 hover:bg-[#FEF08A] transition-colors text-sm disabled:opacity-60"
            >
              <Search size={14} />
              {postcodeLoading ? "로딩..." : t('checkout.addressSearch')}
            </button>
          </div>
          <input
            type="text"
            value={formData.address}
            readOnly={!manualAddressMode}
            onChange={(e) => handleChange("address", e.target.value)}
            onClick={manualAddressMode ? undefined : openAddressSearch}
            placeholder={manualAddressMode ? t('checkout.manualAddressPlaceholder') : t('checkout.addressSearchPlaceholder')}
            className={`w-full px-3 py-3 rounded-xl border-2 text-slate-900 placeholder:text-slate-400 mb-2 font-medium text-sm ${
              manualAddressMode
                ? "border-slate-900 bg-white"
                : "border-slate-300 bg-slate-100 cursor-pointer"
            }`}
          />
          <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-start justify-between gap-3">
            <p className="text-[11px] leading-relaxed text-slate-500">
              {postcodeNotice || t('checkout.manualAddressHint')}
            </p>
            <button
              type="button"
              onClick={() => {
                setManualAddressMode((prev) => !prev)
                setPostcodeNotice("")
              }}
              className="shrink-0 text-[11px] font-black text-slate-900 underline underline-offset-2"
            >
              {manualAddressMode ? t('checkout.useAddressSearch') : t('checkout.enterAddressManually')}
            </button>
          </div>
          <input
            type="text"
            value={formData.addressDetail}
            onChange={(e) => handleChange("addressDetail", e.target.value)}
            placeholder={t('checkout.addressDetailPlaceholder')}
            autoComplete="address-line2"
            enterKeyHint="done"
            className="w-full px-3 py-3 rounded-xl border-2 border-slate-900 focus:border-[#F472B6] focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white hover:bg-slate-50 font-medium text-sm"
          />

          {/* 기본 배송지로 저장 (로그인 시) */}
          {userId && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleSaveDefault}
                disabled={savingDefault || savedDefault}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 font-bold text-sm transition-colors ${
                  savedDefault
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-slate-900 bg-white text-slate-900 hover:bg-[#FEF9C3]"
                } disabled:opacity-70`}
              >
                {savingDefault ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : savedDefault ? (
                  <Check size={15} />
                ) : (
                  <Star size={15} />
                )}
                {savedDefault ? t('checkout.savedAsDefault') : t('checkout.saveAsDefaultAddress')}
              </button>
              {defaultNotice && (
                <p className="mt-1 text-[11px] text-[#F472B6] font-bold">{defaultNotice}</p>
              )}
            </div>
          )}
        </div>

        {/* 배송 메모 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
            <MessageSquare size={14} />
            {t('checkout.shippingMemo')} <span className="text-slate-400 font-normal">{t('checkout.shippingMemoOptional')}</span>
          </label>
          <select
            value={formData.memo}
            onChange={(e) => handleChange("memo", e.target.value)}
            className="w-full px-3 py-3 rounded-xl border-2 border-slate-900 focus:border-[#F472B6] focus:ring-0 outline-none transition-all text-slate-900 bg-white hover:bg-slate-50 font-medium cursor-pointer appearance-none text-sm"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            <option value="">{t('checkout.memoPlaceholder')}</option>
            <option value={t('checkout.memoOption1')}>{t('checkout.memoOption1')}</option>
            <option value={t('checkout.memoOption2')}>{t('checkout.memoOption2')}</option>
            <option value={t('checkout.memoOption3')}>{t('checkout.memoOption3')}</option>
            <option value={t('checkout.memoOption4')}>{t('checkout.memoOption4')}</option>
          </select>
        </div>
      </div>
    </motion.div>
  )
}
