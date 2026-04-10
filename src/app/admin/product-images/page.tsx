'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  Package,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Check,
  GripVertical,
  Power,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductImage {
  id: string
  product_slug: string
  image_url: string
  image_type: 'gallery' | 'thumbnail' | 'hero'
  display_order: number
  alt_text: string | null
  created_at: string
  updated_at: string
}

type ImageType = 'gallery' | 'thumbnail' | 'hero'

interface ModalState {
  open: boolean
  mode: 'add' | 'edit'
  image: ProductImage | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

// [FIX] HIGH: chemistry 추가
const PRODUCT_LABELS: Record<string, string> = {
  'idol-image': 'AI 이미지 분석 퍼퓸',
  'figure': '피규어 화분 디퓨저',
  'graduation': '졸업 기념 퍼퓸',
  'le-quack': 'LE QUACK 시그니처',
  'personal': '퍼스널 센트',
  'chemistry': '케미 향수 세트',
}

const PRODUCT_SLUGS = Object.keys(PRODUCT_LABELS)

const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  gallery: '갤러리',
  thumbnail: '썸네일',
  hero: '히어로',
}

const IMAGE_TYPE_COLORS: Record<ImageType, string> = {
  gallery: 'bg-blue-100 text-blue-800 border-blue-200',
  thumbnail: 'bg-amber-100 text-amber-800 border-amber-200',
  hero: 'bg-purple-100 text-purple-800 border-purple-200',
}

// ─── Upload Helper ────────────────────────────────────────────────────────────

const uploadImage = async (file: File, productSlug: string): Promise<string> => {
  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filePath = `products/${productSlug}/${timestamp}_${random}.${ext}`

  const { data, error } = await supabase.storage
    .from('admin-content')
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('admin-content')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductImagesPage() {
  const [selectedSlug, setSelectedSlug] = useState<string>(PRODUCT_SLUGS[0])
  const [images, setImages] = useState<ProductImage[]>([])
  const [allCounts, setAllCounts] = useState<Record<string, number>>({})
  const [productStatus, setProductStatus] = useState<Record<string, boolean>>({})
  const [togglingProduct, setTogglingProduct] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'add', image: null })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [reordering, setReordering] = useState<string | null>(null)

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchAllCounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_product_images')
      .select('product_slug')

    if (error) {
      console.error('Failed to fetch counts:', error)
      return
    }

    const counts: Record<string, number> = {}
    PRODUCT_SLUGS.forEach((slug) => {
      counts[slug] = 0
    })
    data?.forEach((row) => {
      counts[row.product_slug] = (counts[row.product_slug] || 0) + 1
    })
    setAllCounts(counts)
  }, [])

  const fetchProductStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_products')
      .select('slug, is_active')

    if (error) {
      console.error('Failed to fetch product status:', error)
      return
    }

    const status: Record<string, boolean> = {}
    data?.forEach((row) => {
      status[row.slug] = row.is_active
    })
    setProductStatus(status)
  }, [])

  const handleToggleProduct = async (slug: string) => {
    setTogglingProduct(slug)
    const newStatus = !productStatus[slug]

    const { error } = await supabase
      .from('admin_products')
      .update({ is_active: newStatus })
      .eq('slug', slug)

    if (error) {
      showToast('상품 상태 변경에 실패했습니다.', 'error')
    } else {
      setProductStatus((prev) => ({ ...prev, [slug]: newStatus }))
      showToast(
        `${PRODUCT_LABELS[slug]} ${newStatus ? '활성화' : '비활성화'} 완료`,
        'success'
      )
    }
    setTogglingProduct(null)
  }

  const fetchImages = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('admin_product_images')
      .select('*')
      .eq('product_slug', selectedSlug)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch images:', error)
      showToast('이미지 목록을 불러오는데 실패했습니다.', 'error')
    } else {
      setImages(data || [])
    }
    setLoading(false)
  }, [selectedSlug])

  useEffect(() => {
    fetchAllCounts()
    fetchProductStatus()
  }, [fetchAllCounts, fetchProductStatus])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  // ─── Toast ──────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Reorder ────────────────────────────────────────────────────────────────

  const handleReorder = async (imageId: string, direction: 'up' | 'down') => {
    const idx = images.findIndex((img) => img.id === imageId)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === images.length - 1) return

    setReordering(imageId)

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const current = images[idx]
    const swap = images[swapIdx]

    const updates = [
      supabase
        .from('admin_product_images')
        .update({ display_order: swap.display_order, updated_at: new Date().toISOString() })
        .eq('id', current.id),
      supabase
        .from('admin_product_images')
        .update({ display_order: current.display_order, updated_at: new Date().toISOString() })
        .eq('id', swap.id),
    ]

    const results = await Promise.all(updates)
    const hasError = results.some((r) => r.error)

    if (hasError) {
      showToast('순서 변경에 실패했습니다.', 'error')
    } else {
      await fetchImages()
    }
    setReordering(null)
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (imageId: string) => {
    const image = images.find((img) => img.id === imageId)
    if (!image) return

    // Try to delete from storage if it's in our bucket
    if (image.image_url.includes('admin-content')) {
      try {
        const url = new URL(image.image_url)
        const pathParts = url.pathname.split('/admin-content/')
        if (pathParts.length > 1) {
          const storagePath = decodeURIComponent(pathParts[1])
          await supabase.storage.from('admin-content').remove([storagePath])
        }
      } catch {
        // Storage deletion is best-effort
      }
    }

    const { error } = await supabase
      .from('admin_product_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      showToast('이미지 삭제에 실패했습니다.', 'error')
    } else {
      showToast('이미지가 삭제되었습니다.', 'success')
      await fetchImages()
      await fetchAllCounts()
    }
    setDeleteConfirm(null)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="상품 이미지 관리"
        subtitle="각 상품의 갤러리/썸네일/히어로 이미지를 관리합니다"
        actions={
          <button
            onClick={() => setModal({ open: true, mode: 'add', image: null })}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            이미지 추가
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* ── Product Selector ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-700">상품 선택</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {PRODUCT_SLUGS.map((slug) => {
              const isSelected = slug === selectedSlug
              const count = allCounts[slug] ?? 0
              const isActive = productStatus[slug] ?? true
              return (
                <div
                  key={slug}
                  className={`flex-shrink-0 rounded-xl border-2 transition-all min-w-[180px] ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                      : isActive
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSlug(slug)}
                    className="w-full px-4 pt-3 pb-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                        {PRODUCT_LABELS[slug]}
                      </span>
                      {isActive ? (
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
                      <span className="text-xs text-slate-400 font-mono">{slug}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-yellow-200 text-yellow-900'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}장
                      </span>
                    </div>
                  </button>
                  {/* Active Toggle */}
                  <div className="px-4 pb-3 pt-1 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleProduct(slug)
                      }}
                      disabled={togglingProduct === slug}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      } disabled:opacity-50`}
                    >
                      {togglingProduct === slug ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Power className="w-3 h-3" />
                      )}
                      {isActive ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Image Grid ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-700">
                {PRODUCT_LABELS[selectedSlug]} 이미지
              </h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                {images.length}장
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-400">불러오는 중...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">등록된 이미지가 없습니다</p>
              <p className="text-xs mt-1">상단의 "이미지 추가" 버튼을 눌러 이미지를 등록하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
              <AnimatePresence mode="popLayout">
                {images.map((img) => (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-square bg-slate-100">
                      <Image
                        src={img.image_url}
                        alt={img.alt_text || `${PRODUCT_LABELS[img.product_slug]} 이미지`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        unoptimized
                      />
                      {/* Order Badge */}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-slate-900/80 text-white text-xs font-bold flex items-center justify-center">
                        {img.display_order}
                      </div>
                      {/* Type Badge */}
                      <div className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${IMAGE_TYPE_COLORS[img.image_type]}`}>
                        {IMAGE_TYPE_LABELS[img.image_type]}
                      </div>
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModal({ open: true, mode: 'edit', image: img })}
                            className="p-2 bg-white rounded-lg shadow-lg hover:bg-slate-50 transition-colors"
                            title="편집"
                          >
                            <Edit className="w-4 h-4 text-slate-700" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(img.id)}
                            className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-xs text-slate-500 truncate" title={img.alt_text || ''}>
                        {img.alt_text || '(대체 텍스트 없음)'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-1">
                          <button
                            disabled={img.display_order === images[0]?.display_order || reordering === img.id}
                            onClick={() => handleReorder(img.id, 'up')}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="위로"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            disabled={img.display_order === images[images.length - 1]?.display_order || reordering === img.id}
                            onClick={() => handleReorder(img.id, 'down')}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="아래로"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setModal({ open: true, mode: 'edit', image: img })}
                            className="p-1 rounded hover:bg-slate-100 transition-colors"
                            title="편집"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(img.id)}
                            className="p-1 rounded hover:bg-red-50 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Gallery Preview ────────────────────────────────────────────── */}
        {images.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
              <Eye className="w-5 h-5 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-700">상품 페이지 미리보기</h2>
            </div>
            <GalleryPreview images={images} productSlug={selectedSlug} />
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal.open && (
          <ImageModal
            modal={modal}
            productSlug={selectedSlug}
            nextOrder={(images.length > 0 ? Math.max(...images.map((i) => i.display_order)) : 0) + 1}
            onClose={() => setModal({ open: false, mode: 'add', image: null })}
            onSuccess={async () => {
              setModal({ open: false, mode: 'add', image: null })
              await fetchImages()
              await fetchAllCounts()
              showToast(
                modal.mode === 'add' ? '이미지가 추가되었습니다.' : '이미지가 수정되었습니다.',
                'success'
              )
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">이미지 삭제</h3>
                  <p className="text-sm text-slate-500">정말 삭제하시겠습니까?</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                삭제된 이미지는 복구할 수 없으며, 스토리지에서도 함께 제거됩니다.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Gallery Preview Component ────────────────────────────────────────────────

function GalleryPreview({ images, productSlug }: { images: ProductImage[]; productSlug: string }) {
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    setSelectedIdx(0)
  }, [productSlug])

  const mainImage = images[selectedIdx] || images[0]

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        {/* Main Image */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
          {mainImage && (
            <Image
              src={mainImage.image_url}
              alt={mainImage.alt_text || PRODUCT_LABELS[productSlug]}
              fill
              className="object-cover"
              sizes="400px"
              unoptimized
            />
          )}
        </div>
        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setSelectedIdx(idx)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedIdx
                    ? 'border-yellow-400 ring-2 ring-yellow-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Image
                  src={img.image_url}
                  alt={img.alt_text || ''}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Image Modal Component ────────────────────────────────────────────────────

function ImageModal({
  modal,
  productSlug,
  nextOrder,
  onClose,
  onSuccess,
  showToast,
}: {
  modal: ModalState
  productSlug: string
  nextOrder: number
  onClose: () => void
  onSuccess: () => void
  showToast: (message: string, type: 'success' | 'error') => void
}) {
  const isEdit = modal.mode === 'edit' && modal.image !== null
  const [imageType, setImageType] = useState<ImageType>(modal.image?.image_type || 'gallery')
  const [altText, setAltText] = useState(modal.image?.alt_text || '')
  const [displayOrder, setDisplayOrder] = useState(modal.image?.display_order ?? nextOrder)
  const [previewUrl, setPreviewUrl] = useState<string | null>(modal.image?.image_url || null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다.', 'error')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast('파일 크기는 10MB 이하만 가능합니다.', 'error')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => setPreviewUrl(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleSave = async () => {
    if (!isEdit && !file) {
      showToast('이미지를 선택해주세요.', 'error')
      return
    }

    setSaving(true)

    try {
      let imageUrl = modal.image?.image_url || ''

      // Upload new file if provided
      if (file) {
        imageUrl = await uploadImage(file, productSlug)
      }

      if (isEdit && modal.image) {
        // Update existing record
        const { error } = await supabase
          .from('admin_product_images')
          .update({
            image_url: imageUrl,
            image_type: imageType,
            alt_text: altText || null,
            display_order: displayOrder,
            updated_at: new Date().toISOString(),
          })
          .eq('id', modal.image.id)

        if (error) throw error

        // Delete old storage file if we uploaded a new one
        if (file && modal.image.image_url.includes('admin-content')) {
          try {
            const url = new URL(modal.image.image_url)
            const pathParts = url.pathname.split('/admin-content/')
            if (pathParts.length > 1) {
              const storagePath = decodeURIComponent(pathParts[1])
              await supabase.storage.from('admin-content').remove([storagePath])
            }
          } catch {
            // Best-effort cleanup
          }
        }
      } else {
        // Insert new record
        const { error } = await supabase.from('admin_product_images').insert({
          product_slug: productSlug,
          image_url: imageUrl,
          image_type: imageType,
          alt_text: altText || null,
          display_order: displayOrder,
        })

        if (error) throw error
      }

      onSuccess()
    } catch (err: any) {
      console.error('Save error:', err)
      showToast(err?.message || '저장에 실패했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-slate-900">
            {isEdit ? '이미지 수정' : '이미지 추가'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Product Info */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{PRODUCT_LABELS[productSlug]}</span>
            <span className="text-xs text-slate-400 font-mono">({productSlug})</span>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">이미지 파일</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden ${
                dragging
                  ? 'border-yellow-400 bg-yellow-50'
                  : previewUrl
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
              }`}
            >
              {previewUrl ? (
                <div className="relative aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <div className="bg-white px-3 py-1.5 rounded-lg shadow text-xs font-medium text-slate-700">
                      클릭하여 변경
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Upload className="w-8 h-8 mb-2" />
                  <p className="text-sm font-medium">이미지를 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs mt-1">PNG, JPG, AVIF, WebP (최대 10MB)</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>
          </div>

          {/* Image Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">이미지 유형</label>
            <div className="flex gap-2">
              {(['gallery', 'thumbnail', 'hero'] as ImageType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setImageType(type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    imageType === type
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {IMAGE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Alt Text */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">대체 텍스트 (Alt Text)</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="이미지에 대한 설명을 입력하세요"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">
              접근성과 SEO를 위해 이미지 내용을 설명해주세요
            </p>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">표시 순서</label>
            <input
              type="number"
              min={1}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
              className="w-24 px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isEdit ? '수정' : '추가'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
