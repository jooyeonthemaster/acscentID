'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react'
import { PRODUCT_TYPE_BADGES, type ProductType, formatPrice } from '@/types/cart'
import { uploadPricingImage } from '@/lib/admin/uploadPricingImage'

export interface AddPricingPayload {
  product_type: ProductType
  size: string
  label: string
  price: number
  original_price: number | null
  is_active: boolean
  image_url: string | null
}

export function AddPricingOptionModal({
  productType,
  existingSizes,
  onSave,
  onClose,
}: {
  productType: ProductType
  existingSizes: string[]
  onSave: (payload: AddPricingPayload) => Promise<void>
  onClose: () => void
}) {
  const [size, setSize] = useState('')
  const [label, setLabel] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErr('이미지 파일만 업로드 가능합니다')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr('파일 크기는 10MB 이하만 가능합니다')
      return
    }
    setUploading(true)
    setErr('')
    try {
      const url = await uploadPricingImage(file, productType)
      setImageUrl(url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '이미지 업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  const numericPrice = parseInt(price, 10)
  const numericOriginal = originalPrice.trim() === '' ? null : parseInt(originalPrice, 10)

  const validation = useMemo(() => {
    if (!size.trim()) return '옵션 코드를 입력하세요 (예: 30ml)'
    if (existingSizes.includes(size.trim())) return `"${size.trim()}" 옵션이 이미 존재합니다`
    if (!label.trim()) return '라벨을 입력하세요 (예: 30ml 향수)'
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return '판매가는 0 이상의 숫자여야 합니다'
    if (numericOriginal !== null) {
      if (!Number.isFinite(numericOriginal) || numericOriginal < 0) {
        return '정가는 0 이상의 숫자 또는 비워두기여야 합니다'
      }
      if (numericOriginal < numericPrice) return '정가는 판매가보다 크거나 같아야 합니다'
    }
    return null
  }, [size, label, numericPrice, numericOriginal, existingSizes])

  const handleSubmit = async () => {
    if (validation) {
      setErr(validation)
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave({
        product_type: productType,
        size: size.trim(),
        label: label.trim(),
        price: numericPrice,
        original_price: numericOriginal,
        is_active: isActive,
        image_url: imageUrl,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : '추가 실패')
    } finally {
      setSaving(false)
    }
  }

  const badge = PRODUCT_TYPE_BADGES[productType] ?? PRODUCT_TYPE_BADGES.image_analysis

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] w-full max-w-md mx-4 my-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">가격 옵션 추가</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 ${badge.bg} ${badge.text} text-xs font-bold rounded ${badge.border} border`}>
                {badge.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                옵션 코드 <span className="text-red-500">*</span>
              </label>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="30ml"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 font-mono focus:border-yellow-400 focus:ring-0 focus:outline-none"
              />
              <p className="text-xs text-slate-400 mt-1">결제 식별용 고유값</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                라벨 <span className="text-red-500">*</span>
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="30ml 향수"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 focus:border-yellow-400 focus:ring-0 focus:outline-none"
              />
              <p className="text-xs text-slate-400 mt-1">고객 노출 문구</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              판매가 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 font-mono tabular-nums focus:border-yellow-400 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">정가 (할인 표시용)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₩</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="비워두면 할인 뱃지 비표시"
                className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 font-mono tabular-nums focus:border-yellow-400 focus:ring-0 focus:outline-none"
              />
            </div>
            {numericOriginal !== null && numericOriginal > numericPrice && Number.isFinite(numericPrice) && (
              <p className="text-xs text-slate-400 mt-1">
                미리보기: 판매가 ₩{formatPrice(numericPrice)} / 정가 ₩{formatPrice(numericOriginal)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">옵션 이미지</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageFile(file)
                e.currentTarget.value = ''
              }}
            />
            {imageUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="옵션 이미지"
                  className="h-16 w-16 rounded-xl border-2 border-slate-200 object-cover"
                />
                <div className="flex flex-1 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    교체
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    disabled={uploading}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-900 hover:text-slate-600 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                <span className="text-xs font-bold">이미지 업로드</span>
              </button>
            )}
            <p className="text-xs text-slate-400 mt-1">체크아웃 옵션 선택 화면에 표시됩니다.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">판매 상태</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                isActive
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              {isActive ? '판매 중' : '판매 중지(숨김)'}
            </button>
          </div>

          {err && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{err}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading || !!validation}
            className="px-5 py-2.5 bg-yellow-400 text-slate-900 font-bold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> 추가 중...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> 추가
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
