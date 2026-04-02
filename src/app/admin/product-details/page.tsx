'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AdminHeader } from '../components/AdminHeader'
import { supabase } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Loader2,
  Save,
  Smartphone,
  PenTool,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Monitor,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { Placeholder } from '@tiptap/extension-placeholder'
import EditorToolbar from './EditorToolbar'
import PhonePreview from './PhonePreview'
import EditorStyles from './EditorStyles'
import ProductSelector from './ProductSelector'

// ─── Resize Image Extension (fallback to standard Image) ────────────────────

let ImageResize: typeof Image | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ImageResize = require('tiptap-extension-resize-image').default
} catch {
  // Not available, will use standard Image
}

// ─── Types ──────────────────────────────────────────────────────────────────

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

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

// ─── Constants ──────────────────────────────────────────────────────────────

const PRODUCT_LABELS: Record<string, string> = {
  'idol-image': 'AI 이미지 분석 퍼퓸',
  'figure': '피규어 화분 디퓨저',
  'graduation': '졸업 기념 퍼퓸',
  'le-quack': 'LE QUACK 시그니처',
  'personal': '퍼스널 센트',
}

// ─── Upload Helper ──────────────────────────────────────────────────────────

const uploadDetailImage = async (file: File, productSlug: string): Promise<string> => {
  const ext = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filePath = `details/${productSlug}/${timestamp}_${random}.${ext}`

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

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProductDetailsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [detailData, setDetailData] = useState<Record<string, ProductDetail>>({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [uploading, setUploading] = useState(false)
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor')
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingContent = useRef(false)

  // ─── Current Detail ───────────────────────────────────────────────────────

  const currentDetail = detailData[selectedSlug] || {
    slug: selectedSlug,
    detail_mode: 'default' as const,
    custom_html: null,
    updated_at: null,
  }

  const isCustomMode = currentDetail.detail_mode === 'custom'

  // ─── TipTap Editor ────────────────────────────────────────────────────────

  const ImageExtension = ImageResize || Image

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExtension.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto cursor-pointer',
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute('style'),
              renderHTML: (attributes: Record<string, string>) => {
                if (!attributes.style) return {}
                return { style: attributes.style }
              },
            },
          }
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: '상세페이지 콘텐츠를 작성하세요...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-6',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) return false

            if (file.size > 10 * 1024 * 1024) {
              alert('이미지 크기는 10MB 이하여야 합니다.')
              return true
            }

            setUploading(true)
            uploadDetailImage(file, selectedSlug)
              .then((url) => {
                const { tr } = view.state
                const node = view.state.schema.nodes.image.create({ src: url })
                const transaction = tr.replaceSelectionWith(node)
                view.dispatch(transaction)
              })
              .catch(() => {
                showToast('이미지 붙여넣기 업로드에 실패했습니다.', 'error')
              })
              .finally(() => setUploading(false))

            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      setPreviewHtml(ed.getHTML())
      if (isLoadingContent.current) return
      setSaveStatus('unsaved')
      debouncedAutoSave()
    },
  })

  // ─── Toast ────────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_products')
      .select('slug, name, is_active, display_order')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch products:', error)
      return
    }

    if (data && data.length > 0) {
      setProducts(data)
      setSelectedSlug((prev) => prev || data[0].slug)
    }
  }, [])

  const fetchDetailForSlug = useCallback(async (slug: string) => {
    const { data, error } = await supabase
      .from('admin_product_details')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch detail:', error)
      return
    }

    if (data) {
      setDetailData((prev) => ({ ...prev, [slug]: data }))
      return data
    }

    return null
  }, [])

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchProducts()
      setLoading(false)
    }
    init()
  }, [fetchProducts])

  // ─── Load Detail When Slug Changes ────────────────────────────────────────

  useEffect(() => {
    if (!selectedSlug || !editor) return

    const loadDetail = async () => {
      isLoadingContent.current = true
      const detail = await fetchDetailForSlug(selectedSlug)
      if (detail?.custom_html) {
        editor.commands.setContent(detail.custom_html)
        setPreviewHtml(detail.custom_html)
      } else {
        editor.commands.clearContent()
        setPreviewHtml('')
      }
      setSaveStatus('saved')
      setTimeout(() => {
        isLoadingContent.current = false
      }, 100)
    }
    loadDetail()
  }, [selectedSlug, editor, fetchDetailForSlug])

  // ─── Save Functions ───────────────────────────────────────────────────────

  const saveContent = useCallback(async (mode?: 'default' | 'custom') => {
    if (!selectedSlug) return

    setSaveStatus('saving')

    const detail_mode = mode ?? currentDetail.detail_mode
    const payload: Record<string, unknown> = {
      slug: selectedSlug,
      detail_mode,
      updated_at: new Date().toISOString(),
    }

    if (detail_mode === 'custom' && editor) {
      payload.custom_html = editor.getHTML()
    }

    const { error } = await supabase
      .from('admin_product_details')
      .upsert(payload, { onConflict: 'slug' })

    if (error) {
      console.error('Failed to save:', error)
      setSaveStatus('error')
      showToast('저장에 실패했습니다.', 'error')
    } else {
      setSaveStatus('saved')
      setDetailData((prev) => ({
        ...prev,
        [selectedSlug]: {
          ...prev[selectedSlug],
          slug: selectedSlug,
          detail_mode,
          custom_html: detail_mode === 'custom' && editor ? editor.getHTML() : prev[selectedSlug]?.custom_html ?? null,
          updated_at: payload.updated_at as string,
        },
      }))
      showToast('저장되었습니다.', 'success')
    }
  }, [selectedSlug, currentDetail.detail_mode, editor, showToast])

  const debouncedAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveContent()
    }, 2000)
  }, [saveContent])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // ─── Mode Toggle ──────────────────────────────────────────────────────────

  const handleModeToggle = async () => {
    // 자동 저장 타이머 취소 (레이스 컨디션 방지)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const newMode = isCustomMode ? 'default' : 'custom'
    setDetailData((prev) => ({
      ...prev,
      [selectedSlug]: {
        ...prev[selectedSlug],
        slug: selectedSlug,
        detail_mode: newMode,
        custom_html: prev[selectedSlug]?.custom_html ?? null,
        updated_at: prev[selectedSlug]?.updated_at ?? null,
      },
    }))
    await saveContent(newMode)
  }

  // ─── Image Upload Handler ─────────────────────────────────────────────────

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    setUploading(true)
    try {
      const url = await uploadDetailImage(file, selectedSlug)
      return url
    } finally {
      setUploading(false)
    }
  }, [selectedSlug])

  // ─── Save Status Indicator ────────────────────────────────────────────────

  const SaveStatusBadge = () => {
    const configs = {
      saved: { icon: Check, label: '저장됨', dotClass: 'bg-green-400', textClass: 'text-green-700' },
      unsaved: { icon: AlertCircle, label: '미저장', dotClass: 'bg-yellow-400', textClass: 'text-yellow-700' },
      saving: { icon: Loader2, label: '저장 중...', dotClass: 'bg-blue-400', textClass: 'text-blue-700' },
      error: { icon: AlertCircle, label: '저장 실패', dotClass: 'bg-red-400', textClass: 'text-red-700' },
    }
    const config = configs[saveStatus]
    const Icon = config.icon

    return (
      <div className={`flex items-center gap-2 text-sm ${config.textClass}`}>
        <div className={`w-2 h-2 rounded-full ${config.dotClass} ${saveStatus === 'saving' ? 'animate-pulse' : ''}`} />
        <Icon className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />
        <span className="font-medium">{config.label}</span>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <AdminHeader title="상세페이지 관리" subtitle="상품별 상세페이지를 편집합니다" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <AdminHeader
        title="상세페이지 관리"
        subtitle="상품별 커스텀 상세페이지를 편집합니다"
        actions={
          <div className="flex items-center gap-3">
            <SaveStatusBadge />
            <button
              onClick={() => saveContent()}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${saveStatus === 'saved'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-yellow-400 text-slate-900 hover:bg-yellow-500 shadow-sm'
                }
              `}
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6 flex-1">
        {/* ── Product Selector ─────────────────────────────────────────────── */}
        <ProductSelector
          products={products}
          selectedSlug={selectedSlug}
          detailData={detailData}
          onSelect={setSelectedSlug}
        />

        {/* ── Mode Toggle ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-600" />
              <div>
                <h2 className="text-sm font-semibold text-slate-700">상세페이지 모드</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isCustomMode
                    ? '커스텀 상세페이지가 사용됩니다.'
                    : '기본 상세페이지가 사용됩니다.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleModeToggle}
              className="flex items-center gap-3 group"
            >
              <span className={`text-sm font-medium ${!isCustomMode ? 'text-slate-900' : 'text-slate-400'}`}>
                기본
              </span>
              {isCustomMode ? (
                <ToggleRight className="w-10 h-10 text-yellow-500 group-hover:text-yellow-600 transition-colors" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-300 group-hover:text-slate-400 transition-colors" />
              )}
              <span className={`text-sm font-medium ${isCustomMode ? 'text-slate-900' : 'text-slate-400'}`}>
                커스텀
              </span>
            </button>
          </div>
        </div>

        {/* ── Content Area ────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!isCustomMode ? (
            <motion.div
              key="default-mode"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl border border-slate-200 p-8 text-center"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">기본 상세페이지 모드</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                기본 상세페이지가 사용됩니다. 기존 하드코딩된 섹션이 표시됩니다.
              </p>
              <p className="text-xs text-slate-400 mt-3">
                커스텀 모드로 전환하면 에디터에서 자유롭게 상세페이지를 편집할 수 있습니다.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="custom-mode"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Mobile Toggle: Editor / Preview */}
              <div className="flex lg:hidden mb-4 bg-white rounded-xl border border-slate-200 p-1">
                <button
                  onClick={() => setMobileView('editor')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mobileView === 'editor'
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  에디터
                </button>
                <button
                  onClick={() => setMobileView('preview')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mobileView === 'preview'
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  미리보기
                </button>
              </div>

              <div className="flex gap-6 flex-col lg:flex-row">
                {/* ── Editor Panel ──────────────────────────────────────────── */}
                <div
                  className={`flex-1 min-w-0 ${
                    mobileView !== 'editor' ? 'hidden lg:block' : ''
                  }`}
                >
                  <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
                    {/* 에디터 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">에디터</span>
                      </div>
                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          이미지 업로드 중...
                        </div>
                      )}
                    </div>

                    {/* 툴바 - 고정 (flex-shrink-0) */}
                    <div className="flex-shrink-0 border-b border-slate-200 bg-white">
                      <EditorToolbar
                        editor={editor}
                        onImageUpload={handleImageUpload}
                        uploading={uploading}
                      />
                    </div>

                    {/* 에디터 본문 - 스크롤 영역 */}
                    <div className="flex-1 overflow-y-auto bg-slate-100">
                      <div className="flex justify-center py-6 px-4">
                        <div className="w-full max-w-[455px] bg-white rounded-lg shadow-sm border border-slate-200 min-h-[500px]">
                          <EditorContent editor={editor} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Preview Panel - 고정 높이 + 자체 스크롤 ─────────────── */}
                <div
                  className={`lg:w-[520px] flex-shrink-0 ${
                    mobileView !== 'preview' ? 'hidden lg:block' : 'w-full'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">모바일 미리보기</span>
                  </div>

                  <div style={{ height: 'calc(100vh - 160px)' }}>
                    <PhonePreview
                      productLabel={PRODUCT_LABELS[selectedSlug] || selectedSlug}
                      previewHtml={previewHtml}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`
              fixed bottom-6 left-1/2 z-50 px-4 py-3 rounded-xl shadow-lg
              flex items-center gap-2 text-sm font-medium
              ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
            `}
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

      <EditorStyles />
    </div>
  )
}
