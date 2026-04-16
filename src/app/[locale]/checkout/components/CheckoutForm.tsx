"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { User, MapPin, Search, Phone, Home, MessageSquare } from "lucide-react"

import { useTranslations } from 'next-intl'
import { useAuth } from "@/contexts/AuthContext"

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
  const { user: _user, unifiedUser: _unifiedUser } = useAuth()
  void _user
  void _unifiedUser
  const phone2Ref = useRef<HTMLInputElement>(null)
  const phone3Ref = useRef<HTMLInputElement>(null)
  const [postcodeLoading, setPostcodeLoading] = useState(false)

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
        alert(t('checkout.addressLoadError'))
        return
      }
    }
    new window.daum!.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        setFormData((prev) => ({
          ...prev,
          zipCode: data.zonecode,
          address: data.roadAddress || data.jibunAddress,
        }))
      },
    }).open()
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
              readOnly
              onClick={openAddressSearch}
              placeholder={t('checkout.zipcode')}
              className="flex-1 min-w-0 px-3 py-3 rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-900 placeholder:text-slate-400 cursor-pointer font-medium text-sm"
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
            readOnly
            onClick={openAddressSearch}
            placeholder={t('checkout.addressSearchPlaceholder')}
            className="w-full px-3 py-3 rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-900 placeholder:text-slate-400 mb-2 cursor-pointer font-medium text-sm"
          />
          <input
            type="text"
            value={formData.addressDetail}
            onChange={(e) => handleChange("addressDetail", e.target.value)}
            placeholder={t('checkout.addressDetailPlaceholder')}
            autoComplete="address-line2"
            enterKeyHint="done"
            className="w-full px-3 py-3 rounded-xl border-2 border-slate-900 focus:border-[#F472B6] focus:ring-0 outline-none transition-all text-slate-900 placeholder:text-slate-400 bg-white hover:bg-slate-50 font-medium text-sm"
          />
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
