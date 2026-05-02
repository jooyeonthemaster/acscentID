'use client'

import { Package, Eye, EyeOff } from 'lucide-react'

interface AdminProduct {
  slug: string
  name: string
  is_active: boolean
  display_order: number
}

interface ProductDetail {
  slug: string
  detail_mode: 'default' | 'custom'
  custom_html: string | null
  updated_at: string | null
}

// [FIX] HIGH: chemistry 추가
const PRODUCT_LABELS: Record<string, string> = {
  'idol-image': 'AI 이미지 분석 퍼퓸',
  'figure': '피규어 화분 디퓨저',
  'graduation': '졸업 기념 퍼퓸',
  'le-quack': 'LE QUACK 시그니처',
  'personal': '퍼스널 센트',
  'chemistry': '레이어링 퍼퓸 세트',
}

interface ProductSelectorProps {
  products: AdminProduct[]
  selectedSlug: string
  detailData: Record<string, ProductDetail>
  onSelect: (slug: string) => void
}

export default function ProductSelector({
  products,
  selectedSlug,
  detailData,
  onSelect,
}: ProductSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-5 h-5 text-slate-600" />
        <h2 className="text-sm font-semibold text-slate-700">상품 선택</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((product) => {
          const isSelected = product.slug === selectedSlug
          const detail = detailData[product.slug]
          const mode = detail?.detail_mode || 'default'
          return (
            <button
              key={product.slug}
              onClick={() => onSelect(product.slug)}
              className={`flex-shrink-0 rounded-xl border-2 transition-all min-w-[180px] text-left px-4 py-3 ${
                isSelected
                  ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                  : product.is_active
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-slate-200 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                  {PRODUCT_LABELS[product.slug] || product.name}
                </span>
                {product.is_active ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                    <Eye className="w-2.5 h-2.5" />
                    활성
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500">
                    <EyeOff className="w-2.5 h-2.5" />
                    비활성
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400 font-mono">{product.slug}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    mode === 'custom'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {mode === 'custom' ? '커스텀' : '기본'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
