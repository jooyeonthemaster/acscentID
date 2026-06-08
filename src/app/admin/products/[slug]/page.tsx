'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import NextImage from 'next/image'
import { AdminHeader } from '../../components/AdminHeader'
import { supabase } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import { VisualDetailEditor } from './VisualDetailEditor'
import { ProductPricingPanel } from '@/components/admin/ProductPricingPanel'
import { STORE_PRODUCT_TYPE, type StoreProduct } from '@/lib/products/store-products'
import type { ProductType } from '@/types/cart'
import {
  extractProductPageContent,
  mergeProductPageContentConfig,
  type ProductPageContent,
  type ProductPagePositionField,
  type ProductPageTextField,
} from '@/lib/products/page-content'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'

interface AdminProduct {
  slug: string
  name: string
  is_active: boolean
  display_order: number
  updated_at: string | null
}

type EditorKind = 'program' | 'store'

interface ProductImage {
  id: string
  product_slug: string
  image_url: string
  image_type: ImageType
  display_order: number
  alt_text: string | null
  created_at: string
  updated_at: string
}

interface DetailVersion {
  id: string
  product_slug: string
  label: string
  html: string
  created_by: string | null
  created_at: string
  deployed_at: string | null
}

type ImageType = 'gallery' | 'thumbnail' | 'hero'
type DraftState = 'idle' | 'editing' | 'saving' | 'saved'
type AdminEditorSection = 'basic' | 'page' | 'image' | 'detail'
type PageEditorField = 'productName' | ProductPageTextField
const PAGE_POSITION_TO_EDITOR_FIELD: Partial<Record<ProductPagePositionField, PageEditorField>> = {
  badge: 'badge',
  imagePlaceholder: 'imagePlaceholder',
  subtitle: 'subtitle',
  productName: 'productName',
  infoCard: 'infoTitle',
  infoTitle: 'infoTitle',
  infoBody: 'infoBody',
  ctaButton: 'ctaLabel',
  ctaLabel: 'ctaLabel',
}
const PAGE_EDITOR_TO_PREVIEW_POSITION: Partial<Record<PageEditorField, ProductPagePositionField>> = {
  productName: 'productName',
  badge: 'badge',
  imagePlaceholder: 'productImage',
  subtitle: 'subtitle',
  infoTitle: 'infoCard',
  infoBody: 'infoCard',
  ctaLabel: 'ctaButton',
}

type BasicPreviewField =
  | 'productName'
  | 'productImage'
  | 'badge'
  | 'subtitle'
  | 'price'
  | 'included'

type ProductImageUploadMode = 'add' | 'replaceSelected' | 'replaceRepresentative'

interface AdminPreviewMessage {
  source?: string
  type?: string
  slug?: string
  section?: AdminEditorSection
  pageField?: PageEditorField
  pagePositionField?: ProductPagePositionField
  field?: 'product_name' | 'detail_html'
  commit?: boolean
  text?: string
  html?: string
  hasBuilder?: boolean
  blockId?: string
  patch?: Record<string, unknown>
  file?: File
  content?: Partial<ProductPageContent>
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function plainDateLabel(): string {
  return new Date().toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isBuilderDetailHtml(html: string): boolean {
  return html.includes('data-ac-detail-builder="1"') || html.includes('data-ac-block')
}

function isUploadFile(value: unknown): value is File {
  if (typeof File !== 'undefined' && value instanceof File) return true
  if (!value || typeof value !== 'object') return false
  const candidate = value as File
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.arrayBuffer === 'function'
  )
}

function isMissingRequiredDefaultDetail(slug: string, html: string): boolean {
  if (slug !== 'idol-image' || !html.trim() || isBuilderDetailHtml(html)) return false
  return !/RESULT PREVIEW|이런 분석 결과를 받아보실 수 있어요|LIVE PREVIEW|실제 분석 결과가 이렇게/.test(html)
}

async function uploadProductImage(file: File, productSlug: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
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
  const { data: urlData } = supabase.storage.from('admin-content').getPublicUrl(data.path)
  return urlData.publicUrl
}

export default function AdminProductEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const requestedKind = searchParams.get('kind')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewDetailImageInputRef = useRef<HTMLInputElement>(null)
  const previewIframeRef = useRef<HTMLIFrameElement>(null)
  const previewShellRef = useRef<HTMLDivElement>(null)
  const previewViewportRef = useRef<HTMLDivElement>(null)
  const previewToolbarRef = useRef<HTMLDivElement>(null)
  const basicSectionRef = useRef<HTMLElement>(null)
  const pageSectionRef = useRef<HTMLElement>(null)
  const imageSectionRef = useRef<HTMLElement>(null)
  const detailSectionRef = useRef<HTMLElement>(null)
  const editorSectionHighlightTimerRef = useRef<number | null>(null)
  const previewToolbarPlacedRef = useRef(false)
  const defaultDetailImportedRef = useRef(false)
  const pendingPreviewImageBlockIdRef = useRef<string | null>(null)
  const productImageUploadModeRef = useRef<ProductImageUploadMode>('add')
  const skipNextPreviewPushRef = useRef(false)

  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [storeProduct, setStoreProduct] = useState<StoreProduct | null>(null)
  const [editorKind, setEditorKind] = useState<EditorKind>(requestedKind === 'store' ? 'store' : 'program')
  const [images, setImages] = useState<ProductImage[]>([])
  const [versions, setVersions] = useState<DetailVersion[]>([])
  const [detailHtml, setDetailHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingBasic, setSavingBasic] = useState(false)
  const [savingVersion, setSavingVersion] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [versionLabel, setVersionLabel] = useState('')
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [draftState, setDraftState] = useState<DraftState>('idle')
  const [nameDraft, setNameDraft] = useState('')
  const [orderDraft, setOrderDraft] = useState('0')
  const [storeShortLabelDraft, setStoreShortLabelDraft] = useState('')
  const [storeSizeDraft, setStoreSizeDraft] = useState('')
  const [storeBadgeDraft, setStoreBadgeDraft] = useState('')
  const [storeDescriptionDraft, setStoreDescriptionDraft] = useState('')
  const [storePriceDraft, setStorePriceDraft] = useState('0')
  const [storeImageUrlDraft, setStoreImageUrlDraft] = useState('')
  const [storeIncludedDraft, setStoreIncludedDraft] = useState('')
  const [previewRevision, setPreviewRevision] = useState(0)
  const [previewZoom, setPreviewZoom] = useState(100)
  const [previewToolbarPosition, setPreviewToolbarPosition] = useState({ x: 12, y: 12 })
  const [previewToolbarPlaced, setPreviewToolbarPlaced] = useState(false)
  const [selectedDetailBlockId, setSelectedDetailBlockId] = useState('')
  const [detailEditorFocusToken, setDetailEditorFocusToken] = useState(0)
  const [highlightedEditorSection, setHighlightedEditorSection] = useState<AdminEditorSection | null>(null)
  const [highlightedPageField, setHighlightedPageField] = useState<PageEditorField | null>(null)
  const [previewPatch, setPreviewPatch] = useState<{
    id: string
    patch: Record<string, unknown>
    nonce: number
  } | null>(null)

  const isStoreEditor = editorKind === 'store'
  const productTypeForPricing = useMemo<ProductType[]>(() => [STORE_PRODUCT_TYPE], [])
  const programPath = isStoreEditor ? `/products/${slug}` : `/programs/${slug}`
  const previewSrc = useMemo(() => {
    const query = new URLSearchParams({
      adminPreview: '1',
      adminEditing: '1',
      previewRevision: String(previewRevision),
    })
    return `${programPath}?${query.toString()}`
  }, [previewRevision, programPath])

  const selectedImage = useMemo(() => {
    return images.find((image) => image.id === selectedImageId) || images[0] || null
  }, [images, selectedImageId])

  const pageContent = useMemo(() => extractProductPageContent(detailHtml), [detailHtml])

  const previewWidth = 380
  const previewHeight = 844
  const previewScale = previewZoom / 100
  const previewStageStyle = useMemo(() => ({
    width: `${Math.round(previewWidth * previewScale)}px`,
    height: `${Math.round(previewHeight * previewScale)}px`,
  }), [previewScale])
  const previewFrameStyle = useMemo(() => ({
    width: `${previewWidth}px`,
    height: `${previewHeight}px`,
    transform: `scale(${previewScale})`,
    transformOrigin: 'top left',
  }), [previewScale])

  const zoomPreview = useCallback((delta: number) => {
    setPreviewZoom((current) => clampNumber(current + delta, 35, 180))
  }, [])

  const constrainPreviewToolbarPosition = useCallback((position: { x: number; y: number }) => {
    const shell = previewShellRef.current
    const toolbar = previewToolbarRef.current
    if (!shell || !toolbar) return position

    const maxX = Math.max(8, shell.clientWidth - toolbar.offsetWidth - 8)
    const maxY = Math.max(8, shell.clientHeight - toolbar.offsetHeight - 8)

    return {
      x: clampNumber(position.x, 8, maxX),
      y: clampNumber(position.y, 8, maxY),
    }
  }, [])

  useEffect(() => {
    const shell = previewShellRef.current
    const toolbar = previewToolbarRef.current
    if (!shell || !toolbar) return

    const placeToolbar = () => {
      setPreviewToolbarPosition((current) => {
        const nextPosition = previewToolbarPlacedRef.current
          ? current
          : { x: shell.clientWidth - toolbar.offsetWidth - 14, y: 12 }

        previewToolbarPlacedRef.current = true
        return constrainPreviewToolbarPosition(nextPosition)
      })
      setPreviewToolbarPlaced(true)
    }

    placeToolbar()

    const resizeObserver = new ResizeObserver(placeToolbar)
    resizeObserver.observe(shell)
    resizeObserver.observe(toolbar)
    window.addEventListener('resize', placeToolbar)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', placeToolbar)
    }
  }, [constrainPreviewToolbarPosition])

  const handlePreviewToolbarDragStart = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const shell = previewShellRef.current
    if (!shell) return

    event.preventDefault()
    const shellBounds = shell.getBoundingClientRect()
    const toolbarBounds = previewToolbarRef.current?.getBoundingClientRect()
    const currentToolbarPosition = toolbarBounds
      ? {
          x: toolbarBounds.left - shellBounds.left,
          y: toolbarBounds.top - shellBounds.top,
        }
      : previewToolbarPosition
    const dragOffset = {
      x: event.clientX - shellBounds.left - currentToolbarPosition.x,
      y: event.clientY - shellBounds.top - currentToolbarPosition.y,
    }

    setPreviewToolbarPlaced(true)

    const handleMove = (moveEvent: PointerEvent) => {
      setPreviewToolbarPosition(constrainPreviewToolbarPosition({
        x: moveEvent.clientX - shellBounds.left - dragOffset.x,
        y: moveEvent.clientY - shellBounds.top - dragOffset.y,
      }))
    }

    const stopDrag = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointercancel', stopDrag)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
  }, [constrainPreviewToolbarPosition, previewToolbarPosition])

  const fitPreviewToViewport = useCallback(() => {
    const viewport = previewViewportRef.current
    if (!viewport) return
    const viewportPadding = 32
    const horizontalZoom = ((viewport.clientWidth - viewportPadding) / previewWidth) * 100
    const verticalZoom = ((viewport.clientHeight - viewportPadding) / previewHeight) * 100
    const fittedZoom = Math.floor(Math.min(horizontalZoom, verticalZoom) / 5) * 5
    setPreviewZoom(clampNumber(fittedZoom, 35, 180))
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }, [])

  const bumpPreview = useCallback(() => {
    setPreviewRevision((revision) => revision + 1)
  }, [])

  const postToPreview = useCallback((payload: Record<string, unknown>) => {
    previewIframeRef.current?.contentWindow?.postMessage(
      {
        source: 'acscent-admin-parent',
        slug,
        ...payload,
      },
      window.location.origin,
    )
  }, [slug])

  const scrollEditorSectionIntoView = useCallback((section: AdminEditorSection, pageField?: PageEditorField) => {
    const sectionRef = {
      basic: basicSectionRef,
      page: pageSectionRef,
      image: imageSectionRef,
      detail: detailSectionRef,
    }[section]

    setHighlightedEditorSection(section)
    setHighlightedPageField(section === 'page' ? pageField ?? null : null)
    if (editorSectionHighlightTimerRef.current) {
      window.clearTimeout(editorSectionHighlightTimerRef.current)
    }
    editorSectionHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedEditorSection(null)
      setHighlightedPageField(null)
      editorSectionHighlightTimerRef.current = null
    }, 1800)

    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    })
  }, [])

  useEffect(() => {
    return () => {
      if (editorSectionHighlightTimerRef.current) {
        window.clearTimeout(editorSectionHighlightTimerRef.current)
      }
    }
  }, [])

  const editorSectionClassName = (section: AdminEditorSection) => (
    `scroll-mt-4 rounded-xl border bg-white p-4 transition-all duration-200 ${
      highlightedEditorSection === section
        ? 'border-yellow-400 shadow-[0_0_0_4px_rgba(250,204,21,0.32),3px_3px_0_0_#111827]'
        : 'border-slate-200'
    }`
  )

  const pageFieldClassName = (field: PageEditorField) => (
    `block rounded-lg border-2 p-2 transition-all ${
      highlightedPageField === field
        ? 'border-yellow-400 bg-yellow-50 shadow-[2px_2px_0_0_#111827]'
        : 'border-transparent bg-transparent'
    }`
  )

  const focusPreviewPageField = useCallback((field: PageEditorField) => {
    postToPreview({
      type: 'page:focus',
      pageField: field,
      pagePositionField: PAGE_EDITOR_TO_PREVIEW_POSITION[field],
      scroll: true,
    })
  }, [postToPreview])

  const focusPreviewPosition = useCallback((field: BasicPreviewField) => {
    postToPreview({
      type: 'page:focus',
      pagePositionField: field,
      scroll: true,
    })
  }, [postToPreview])

  const pageFieldWorkbenchProps = (field: PageEditorField) => ({
    className: pageFieldClassName(field),
    onClick: () => focusPreviewPageField(field),
    onFocusCapture: () => focusPreviewPageField(field),
  })

  const previewFocusProps = (field: BasicPreviewField) => ({
    onClick: () => focusPreviewPosition(field),
    onFocusCapture: () => focusPreviewPosition(field),
  })

  const pushDetailPreview = useCallback((html: string) => {
    if (!html.trim()) return
    if (!isBuilderDetailHtml(html)) return
    postToPreview({ type: 'detail:preview', html })
  }, [postToPreview])

  const fetchProduct = useCallback(async () => {
    const loadStoreProduct = async () => {
      const storeRes = await fetch('/api/admin/store-products', { cache: 'no-store' })
      const storeJson = await storeRes.json().catch(() => ({}))
      if (!storeRes.ok) throw new Error(storeJson.error || '상품 조회 실패')
      const storeProducts = (storeJson.products ?? []) as StoreProduct[]
      const foundStore = storeProducts.find((item) => item.slug === slug) || null
      if (!foundStore) return null

      setEditorKind('store')
      setStoreProduct(foundStore)
      setProduct({
        slug: foundStore.slug,
        name: foundStore.title,
        is_active: foundStore.isActive ?? true,
        display_order: foundStore.displayOrder ?? 0,
        updated_at: null,
      })
      setNameDraft(foundStore.title)
      setOrderDraft(String(foundStore.displayOrder ?? 0))
      setStoreShortLabelDraft(foundStore.shortLabel)
      setStoreSizeDraft(foundStore.size)
      setStoreBadgeDraft(foundStore.badge)
      setStoreDescriptionDraft(foundStore.description)
      setStorePriceDraft(String(foundStore.fallbackPrice))
      setStoreImageUrlDraft(foundStore.image)
      setStoreIncludedDraft(foundStore.included.join('\n'))
      return foundStore
    }

    if (requestedKind === 'store') {
      const foundStore = await loadStoreProduct()
      if (!foundStore) setProduct(null)
      return
    }

    const res = await fetch('/api/admin/products', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || '프로그램 조회 실패')
    const products = (json.products ?? []) as AdminProduct[]
    const found = products.find((item) => item.slug === slug) || null

    if (!found) {
      await loadStoreProduct()
      return
    }

    setEditorKind('program')
    setStoreProduct(null)
    setProduct(found)
    setNameDraft(found.name)
    setOrderDraft(String(found.display_order ?? 0))
  }, [requestedKind, slug])

  const fetchImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_product_images')
      .select('*')
      .eq('product_slug', slug)
      .order('display_order', { ascending: true })

    if (error) throw error
    const nextImages = (data || []) as ProductImage[]
    setImages(nextImages)
    setSelectedImageId((prev) => {
      if (prev && nextImages.some((image) => image.id === prev)) return prev
      return nextImages[0]?.id || null
    })
    return nextImages
  }, [slug])

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/products/${slug}/preview-detail`, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || '상세페이지 조회 실패')
    setDetailHtml(json.detail?.custom_html || '')
    defaultDetailImportedRef.current = false
  }, [slug])

  const fetchVersions = useCallback(async () => {
    const res = await fetch(`/api/admin/products/${slug}/detail-versions`, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || '수정본 조회 실패')
    setVersions((json.versions ?? []) as DetailVersion[])
  }, [slug])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([fetchProduct(), fetchImages(), fetchDetail(), fetchVersions()])
    } catch (error) {
      showToast(error instanceof Error ? error.message : '프로그램 정보를 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }, [fetchDetail, fetchImages, fetchProduct, fetchVersions, showToast])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    if (skipNextPreviewPushRef.current) {
      skipNextPreviewPushRef.current = false
      return
    }
    pushDetailPreview(detailHtml)
  }, [detailHtml, pushDetailPreview])

  const updateProduct = useCallback(async (
    updates: Partial<Pick<AdminProduct, 'name' | 'is_active' | 'display_order'>>,
    toastMessage = '기본정보가 저장되었습니다',
  ) => {
    setSavingBasic(true)
    try {
      const res = await fetch(isStoreEditor ? '/api/admin/store-products' : '/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          ...(isStoreEditor
            ? {
                ...(updates.name !== undefined ? { title: updates.name } : {}),
                ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
                ...(updates.display_order !== undefined ? { display_order: updates.display_order } : {}),
              }
            : updates),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '프로그램 저장 실패')
      if (isStoreEditor) {
        const nextStoreProduct = json.product as StoreProduct
        setStoreProduct(nextStoreProduct)
        setProduct({
          slug: nextStoreProduct.slug,
          name: nextStoreProduct.title,
          is_active: nextStoreProduct.isActive ?? true,
          display_order: nextStoreProduct.displayOrder ?? 0,
          updated_at: null,
        })
        setNameDraft(nextStoreProduct.title)
        setOrderDraft(String(nextStoreProduct.displayOrder ?? 0))
      } else {
        const nextProduct = json.product as AdminProduct
        setProduct(nextProduct)
        setNameDraft(nextProduct.name)
        setOrderDraft(String(nextProduct.display_order))
      }
      bumpPreview()
      showToast(toastMessage)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '기본정보 저장 실패')
    } finally {
      setSavingBasic(false)
    }
  }, [bumpPreview, isStoreEditor, showToast, slug])

  const saveStoreProductInfo = useCallback(async () => {
    if (!storeProduct) return
    const title = nameDraft.trim()
    const displayOrder = Number(orderDraft)
    const fallbackPrice = Number(storePriceDraft)
    if (!title) {
      showToast('상품명은 비워둘 수 없습니다')
      return
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      showToast('정렬 순서는 0 이상의 정수여야 합니다')
      return
    }
    if (!storeSizeDraft.trim()) {
      showToast('옵션/사이즈 코드는 비워둘 수 없습니다')
      return
    }
    if (!Number.isInteger(fallbackPrice) || fallbackPrice < 0) {
      showToast('가격은 0 이상의 정수여야 합니다')
      return
    }

    setSavingBasic(true)
    try {
      const res = await fetch('/api/admin/store-products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          short_label: storeShortLabelDraft.trim() || title,
          size: storeSizeDraft.trim(),
          badge: storeBadgeDraft.trim() || '상품',
          description: storeDescriptionDraft.trim(),
          fallback_price: fallbackPrice,
          image_url: storeImageUrlDraft.trim() || null,
          included: storeIncludedDraft,
          display_order: displayOrder,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '상품 저장 실패')
      const nextStoreProduct = json.product as StoreProduct
      setStoreProduct(nextStoreProduct)
      setProduct({
        slug: nextStoreProduct.slug,
        name: nextStoreProduct.title,
        is_active: nextStoreProduct.isActive ?? true,
        display_order: nextStoreProduct.displayOrder ?? 0,
        updated_at: null,
      })
      setNameDraft(nextStoreProduct.title)
      setOrderDraft(String(nextStoreProduct.displayOrder ?? 0))
      setStoreShortLabelDraft(nextStoreProduct.shortLabel)
      setStoreSizeDraft(nextStoreProduct.size)
      setStoreBadgeDraft(nextStoreProduct.badge)
      setStoreDescriptionDraft(nextStoreProduct.description)
      setStorePriceDraft(String(nextStoreProduct.fallbackPrice))
      setStoreImageUrlDraft(nextStoreProduct.image)
      setStoreIncludedDraft(nextStoreProduct.included.join('\n'))
      bumpPreview()
      showToast('상품 기본정보가 저장되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '상품 저장 실패')
    } finally {
      setSavingBasic(false)
    }
  }, [
    bumpPreview,
    nameDraft,
    orderDraft,
    showToast,
    slug,
    storeBadgeDraft,
    storeDescriptionDraft,
    storeImageUrlDraft,
    storeIncludedDraft,
    storePriceDraft,
    storeProduct,
    storeShortLabelDraft,
    storeSizeDraft,
  ])

  const saveBasicInfo = () => {
    if (!product) return
    if (isStoreEditor) {
      saveStoreProductInfo()
      return
    }
    const trimmedName = nameDraft.trim()
    const displayOrder = Number(orderDraft)
    if (!trimmedName) {
      showToast('프로그램명은 비워둘 수 없습니다')
      return
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      showToast('정렬 순서는 0 이상의 정수여야 합니다')
      return
    }
    updateProduct({
      name: trimmedName,
      display_order: displayOrder,
    })
  }

  const previewProductName = useCallback((name: string) => {
    postToPreview({ type: 'product:name-preview', name })
  }, [postToPreview])

  const updatePageContent = useCallback((patch: Partial<ProductPageContent>) => {
    const currentContent = extractProductPageContent(detailHtml)
    const nextContent: Partial<ProductPageContent> = {
      ...currentContent,
      ...patch,
      positions: patch.positions ?? currentContent.positions,
    }
    const nextHtml = mergeProductPageContentConfig(detailHtml, nextContent)
    defaultDetailImportedRef.current = false
    setDetailHtml(nextHtml)
    setDraftState('editing')
    postToPreview({ type: 'page:content', content: nextContent })
  }, [detailHtml, postToPreview])

  const saveDetailDraft = useCallback(async (
    html: string,
    options: { reloadPreview?: boolean; toastMessage?: string } = {},
  ) => {
    if (isMissingRequiredDefaultDetail(slug, html)) {
      showToast('결과 미리보기 섹션이 빠져 있어 저장하지 않았습니다. 미리보기를 새로고침합니다')
      bumpPreview()
      setDraftState('idle')
      return
    }

    setDraftState('saving')
    try {
      const res = await fetch(`/api/admin/products/${slug}/preview-detail`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '상세페이지 저장 실패')
      setDetailHtml(json.detail?.custom_html ?? html)
      defaultDetailImportedRef.current = false
      setDraftState('saved')
      if (options.reloadPreview) bumpPreview()
      if (options.toastMessage) showToast(options.toastMessage)
    } catch (error) {
      setDraftState('editing')
      showToast(error instanceof Error ? error.message : '상세페이지 저장 실패')
    }
  }, [bumpPreview, showToast, slug])

  const syncStoreRepresentativeImage = useCallback(async (imageUrl: string | null) => {
    if (!isStoreEditor || !product) return
    setStoreImageUrlDraft(imageUrl || '')
    setStoreProduct((current) => current ? { ...current, image: imageUrl || current.image } : current)

    try {
      const res = await fetch('/api/admin/store-products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: product.slug, image_url: imageUrl }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.product) {
        const nextStoreProduct = json.product as StoreProduct
        setStoreProduct(nextStoreProduct)
        setStoreImageUrlDraft(nextStoreProduct.image)
      }
    } catch (error) {
      console.error('[AdminProductEditPage] representative image sync failed:', error)
    }
  }, [isStoreEditor, product])

  const handleImageUpload = useCallback(async (file: File, replaceImage?: ProductImage) => {
    if (!product) return
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('파일 크기는 10MB 이하만 가능합니다')
      return
    }

    setUploading(true)
    try {
      const imageUrl = await uploadProductImage(file, product.slug)
      if (replaceImage) {
        const { error } = await supabase
          .from('admin_product_images')
          .update({
            image_url: imageUrl,
            alt_text: replaceImage.alt_text || `${product.name} 이미지`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', replaceImage.id)
        if (error) throw error
      } else {
        const nextOrder = images.length > 0
          ? Math.max(...images.map((image) => image.display_order)) + 1
          : 0
        const { error } = await supabase
          .from('admin_product_images')
          .insert({
            product_slug: product.slug,
            image_url: imageUrl,
            image_type: 'gallery',
            alt_text: `${product.name} 이미지`,
            display_order: nextOrder,
          })
        if (error) throw error
      }
      const nextImages = await fetchImages()
      await syncStoreRepresentativeImage(nextImages[0]?.image_url || null)
      bumpPreview()
      showToast(replaceImage ? '이미지가 교체되었습니다' : '이미지가 추가되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '이미지 저장 실패')
    } finally {
      setUploading(false)
    }
  }, [bumpPreview, fetchImages, images, product, showToast, syncStoreRepresentativeImage])

  const handleDetailImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드 가능합니다')
      throw new Error('이미지 파일만 업로드 가능합니다')
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('파일 크기는 10MB 이하만 가능합니다')
      throw new Error('파일 크기는 10MB 이하만 가능합니다')
    }

    const imageUrl = await uploadProductImage(file, `${slug}/details`)
    showToast('상세 이미지가 추가되었습니다')
    return imageUrl
  }, [showToast, slug])

  const handlePreviewDetailImageUpload = useCallback(async (file: File) => {
    const blockId = pendingPreviewImageBlockIdRef.current
    if (!blockId) return

    try {
      const src = await handleDetailImageUpload(file)
      setSelectedDetailBlockId(blockId)
      setPreviewPatch({
        id: blockId,
        patch: {
          src,
          alt: '상세페이지 이미지',
        },
        nonce: Date.now(),
      })
      setDraftState('editing')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '상세 이미지 업로드 실패')
    } finally {
      pendingPreviewImageBlockIdRef.current = null
    }
  }, [handleDetailImageUpload, showToast])

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent<AdminPreviewMessage>) => {
      if (event.origin !== window.location.origin) return
      const message = event.data
      if (message?.source !== 'acscent-admin-preview' || message.slug !== slug) return

      if (message.type === 'preview:ready') {
        setDraftState((current) => (current === 'saving' ? current : 'idle'))
        pushDetailPreview(detailHtml)
        return
      }

      if (message.type === 'page:content-source' && message.content) {
        setDetailHtml((currentHtml) => {
          const nextHtml = mergeProductPageContentConfig(currentHtml, message.content || {})
          if (nextHtml === currentHtml) return currentHtml
          skipNextPreviewPushRef.current = true
          return nextHtml
        })
        return
      }

      if (message.type === 'detail:source') {
        const html = message.html?.trim() || ''
        if (!detailHtml.trim() && html && !defaultDetailImportedRef.current) {
          defaultDetailImportedRef.current = true
          setDetailHtml(html)
          setDraftState('idle')
        }
        return
      }

      if (message.type === 'block:select' && message.blockId) {
        const nextBlockId = message.blockId.startsWith('legacy-') ? 'legacy-detail' : message.blockId
        setSelectedDetailBlockId(nextBlockId)
        setDetailEditorFocusToken((current) => current + 1)
        scrollEditorSectionIntoView('detail')
        return
      }

      if (message.type === 'block:image-upload-request' && message.blockId) {
        pendingPreviewImageBlockIdRef.current = message.blockId
        setSelectedDetailBlockId(message.blockId)
        setDetailEditorFocusToken((current) => current + 1)
        scrollEditorSectionIntoView('detail')
        previewDetailImageInputRef.current?.click()
        return
      }

      if (message.type === 'block:image-upload-file' && message.blockId && isUploadFile(message.file)) {
        pendingPreviewImageBlockIdRef.current = message.blockId
        setSelectedDetailBlockId(message.blockId)
        setDetailEditorFocusToken((current) => current + 1)
        scrollEditorSectionIntoView('detail')
        handlePreviewDetailImageUpload(message.file)
        return
      }

      if (message.type === 'product:image-upload-request') {
        productImageUploadModeRef.current = 'replaceRepresentative'
        scrollEditorSectionIntoView('image')
        fileInputRef.current?.click()
        return
      }

      if (message.type === 'product:image-upload-file' && isUploadFile(message.file)) {
        productImageUploadModeRef.current = 'add'
        scrollEditorSectionIntoView('image')
        handleImageUpload(message.file, images[0])
        return
      }

      if (message.type === 'section:focus' && message.section) {
        scrollEditorSectionIntoView(
          message.section,
          message.pageField ?? (
            message.pagePositionField
              ? PAGE_POSITION_TO_EDITOR_FIELD[message.pagePositionField]
              : undefined
          ),
        )
        return
      }

      if (message.type === 'detail:update-full') {
        const html = message.html ?? ''
        skipNextPreviewPushRef.current = true
        setDetailHtml(html)
        if (!isBuilderDetailHtml(html)) {
          setSelectedDetailBlockId('legacy-detail')
        }
        setDraftState('editing')
        return
      }

      if (message.type === 'block:update' && message.blockId && message.patch) {
        skipNextPreviewPushRef.current = true
        setPreviewPatch({
          id: message.blockId,
          patch: message.patch,
          nonce: Date.now(),
        })
        setSelectedDetailBlockId(message.blockId)
        setDraftState('editing')
        return
      }

      if (message.type !== 'field:update') return

      if (message.field === 'product_name' && message.commit) {
        const nextName = message.text?.trim() || ''
        if (nextName && nextName !== product?.name) {
          updateProduct({ name: nextName }, isStoreEditor ? '상품명이 저장되었습니다' : '프로그램명이 저장되었습니다')
        }
        return
      }

      if (message.field === 'detail_html') {
        const html = message.html ?? ''
        skipNextPreviewPushRef.current = true
        setDetailHtml(html)
        setDraftState('editing')
      }
    }

    window.addEventListener('message', handlePreviewMessage)
    return () => window.removeEventListener('message', handlePreviewMessage)
  }, [detailHtml, handleImageUpload, handlePreviewDetailImageUpload, images, isStoreEditor, product?.name, pushDetailPreview, scrollEditorSectionIntoView, slug, updateProduct])

  const handleDetailChange = useCallback((html: string) => {
    defaultDetailImportedRef.current = false
    setDetailHtml(html)
    setDraftState('editing')
  }, [])

  const handleDetailBlockSelect = useCallback((blockId: string) => {
    setSelectedDetailBlockId(blockId)
    setDetailEditorFocusToken((current) => current + 1)
    postToPreview({ type: 'block:select', blockId })
  }, [postToPreview])

  const handleDetailPreviewTargetChange = useCallback((blockId: string | null) => {
    postToPreview({ type: 'block:highlight', blockId })
  }, [postToPreview])

  const handleDeleteImage = async (image: ProductImage) => {
    const confirmed = window.confirm('이미지를 삭제하시겠습니까?')
    if (!confirmed) return
    const { error } = await supabase.from('admin_product_images').delete().eq('id', image.id)
    if (error) {
      showToast('이미지 삭제에 실패했습니다')
      return
    }
    const nextImages = await fetchImages()
    await syncStoreRepresentativeImage(nextImages[0]?.image_url || null)
    bumpPreview()
    showToast('이미지가 삭제되었습니다')
  }

  const handleSaveVersion = async (deploy = false) => {
    if (defaultDetailImportedRef.current && draftState !== 'editing') {
      showToast('상세페이지를 수정한 뒤 수정본으로 저장해주세요')
      return
    }
    if (isMissingRequiredDefaultDetail(slug, detailHtml)) {
      showToast('결과 미리보기 섹션이 빠져 있어 수정본으로 저장하지 않았습니다')
      bumpPreview()
      return
    }

    setSavingVersion(true)
    try {
      const res = await fetch(`/api/admin/products/${slug}/detail-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: versionLabel.trim() || `${plainDateLabel()} 수정본`,
          html: detailHtml,
          deploy,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '수정본 저장 실패')
      setVersionLabel('')
      await fetchVersions()
      if (deploy) {
        defaultDetailImportedRef.current = false
        bumpPreview()
      }
      showToast(deploy ? '수정본 저장 및 배포 완료' : '수정본이 저장되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '수정본 저장 실패')
    } finally {
      setSavingVersion(false)
    }
  }

  const handleDeployCurrent = async () => {
    if (defaultDetailImportedRef.current && draftState !== 'editing') {
      showToast('상세페이지를 수정한 뒤 저장하거나 배포해주세요')
      return
    }
    if (isMissingRequiredDefaultDetail(slug, detailHtml)) {
      showToast('결과 미리보기 섹션이 빠져 있어 배포하지 않았습니다')
      bumpPreview()
      return
    }

    setDeploying(true)
    try {
      const res = await fetch(`/api/admin/products/${slug}/detail-versions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: detailHtml }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '배포 실패')
      await fetchVersions()
      defaultDetailImportedRef.current = false
      bumpPreview()
      showToast('현재 편집본이 배포되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '배포 실패')
    } finally {
      setDeploying(false)
    }
  }

  const handleLoadVersion = async (version: DetailVersion) => {
    defaultDetailImportedRef.current = false
    setDetailHtml(version.html)
    setDraftState('editing')
    postToPreview({ type: 'detail:preview', html: version.html, replace: true })
    showToast('수정본을 미리보기에 불러왔습니다')
  }

  const handleDeployVersion = async (version: DetailVersion) => {
    if (isMissingRequiredDefaultDetail(slug, version.html)) {
      showToast('결과 미리보기 섹션이 없는 수정본은 배포할 수 없습니다')
      return
    }

    setDeploying(true)
    try {
      const res = await fetch(`/api/admin/products/${slug}/detail-versions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: version.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '배포 실패')
      setDetailHtml(version.html)
      await fetchVersions()
      defaultDetailImportedRef.current = false
      bumpPreview()
      showToast('선택한 수정본이 배포되었습니다')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '배포 실패')
    } finally {
      setDeploying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminHeader title={requestedKind === 'store' ? '상품 편집' : '프로그램 편집'} subtitle="정보를 불러오는 중입니다" />
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminHeader title={requestedKind === 'store' ? '상품 편집' : '프로그램 편집'} subtitle="대상을 찾을 수 없습니다" />
        <div className="p-6">
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">대상을 찾을 수 없습니다</p>
            <button
              onClick={() => router.push(requestedKind === 'store' ? '/admin/products' : '/admin/programs')}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <input
        ref={previewDetailImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handlePreviewDetailImageUpload(file)
          event.currentTarget.value = ''
        }}
      />
      <AdminHeader
        title={isStoreEditor ? '상품 편집' : '프로그램 편집'}
        subtitle={`${product.name} · ${programPath} 실제 화면을 그대로 불러온 미리보기입니다`}
        breadcrumbs={[
          { href: '/admin', label: '관리자' },
          { href: isStoreEditor ? '/admin/products' : '/admin/programs', label: isStoreEditor ? '상품 관리' : '프로그램 관리' },
          { href: `/admin/products/${slug}${isStoreEditor ? '?kind=store' : ''}`, label: product.name },
        ]}
        actions={
          <button
            onClick={() => router.push(isStoreEditor ? '/admin/products' : '/admin/programs')}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {isStoreEditor ? '상품 목록' : '프로그램 목록'}
          </button>
        }
      />

      <div className="grid h-[calc(100vh-104px)] gap-5 overflow-hidden p-5 xl:grid-cols-[minmax(520px,1fr)_420px]">
        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">{programPath}</span>
            </div>
            <button
              onClick={bumpPreview}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-black"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>

          <div ref={previewShellRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
            <div
              ref={previewToolbarRef}
              className="absolute z-30"
              style={previewToolbarPlaced
                ? {
                    left: 0,
                    top: 0,
                    transform: `translate3d(${previewToolbarPosition.x}px, ${previewToolbarPosition.y}px, 0)`,
                  }
                : {
                    right: 12,
                    top: 12,
                  }}
            >
              <div className="inline-flex w-9 flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-1.5 py-2 text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.16)] backdrop-blur">
                <button
                  type="button"
                  onPointerDown={handlePreviewToolbarDragStart}
                  className="flex h-7 w-7 touch-none cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                  aria-label="미리보기 도구 이동"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="my-0.5 h-px w-5 bg-slate-200" />
                <button
                  type="button"
                  onClick={() => zoomPreview(-10)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  disabled={previewZoom <= 35}
                  aria-label="미리보기 축소"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(100)}
                  className="w-full rounded-lg px-0.5 py-1 text-center text-[11px] font-black leading-none tabular-nums text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="미리보기 100%로 보기"
                >
                  {previewZoom}%
                </button>
                <button
                  type="button"
                  onClick={() => zoomPreview(10)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                  disabled={previewZoom >= 180}
                  aria-label="미리보기 확대"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={fitPreviewToViewport}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                  aria-label="미리보기 화면 맞춤"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={previewViewportRef} className="h-full overflow-auto p-4">
              <div className="mx-auto" style={previewStageStyle}>
                <div
                  className="overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10"
                  style={previewFrameStyle}
                >
                  <iframe
                    key={previewRevision}
                    ref={previewIframeRef}
                    src={previewSrc}
                    title={`${product.name} 실제 페이지 미리보기`}
                    onLoad={() => pushDetailPreview(detailHtml)}
                    className="block h-full w-full bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-h-0 space-y-4 overflow-y-auto pr-1">
          <section ref={basicSectionRef} className={editorSectionClassName('basic')}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">기본정보</h2>
              <button
                onClick={() => updateProduct(
                  { is_active: !product.is_active },
                  product.is_active
                    ? isStoreEditor ? '상품 판매가 중지되었습니다' : '프로그램이 비활성화되었습니다'
                    : isStoreEditor ? '상품 판매가 시작되었습니다' : '프로그램이 활성화되었습니다',
                )}
                disabled={savingBasic}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  product.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {product.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {product.is_active ? '활성' : '비활성'}
              </button>
            </div>
            <div className="space-y-3">
              <label className="block" {...previewFocusProps('productName')}>
                <span className="mb-1 block text-xs font-bold text-slate-500">{isStoreEditor ? '상품명' : '프로그램명'}</span>
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onBlur={() => {
                    if (nameDraft.trim() && nameDraft.trim() !== product.name) saveBasicInfo()
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">정렬 순서</span>
                <input
                  value={orderDraft}
                  onChange={(event) => setOrderDraft(event.target.value)}
                  onBlur={() => {
                    if (orderDraft !== String(product.display_order)) saveBasicInfo()
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-slate-900"
                />
              </label>
              {isStoreEditor && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-slate-500">짧은 라벨</span>
                      <input
                        value={storeShortLabelDraft}
                        onChange={(event) => setStoreShortLabelDraft(event.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900"
                      />
                    </label>
                    <label className="block" {...previewFocusProps('badge')}>
                      <span className="mb-1 block text-xs font-bold text-slate-500">뱃지</span>
                      <input
                        value={storeBadgeDraft}
                        onChange={(event) => setStoreBadgeDraft(event.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block" {...previewFocusProps('productName')}>
                      <span className="mb-1 block text-xs font-bold text-slate-500">옵션/사이즈 코드</span>
                      <input
                        value={storeSizeDraft}
                        onChange={(event) => setStoreSizeDraft(event.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-slate-900"
                      />
                    </label>
                    <label className="block" {...previewFocusProps('price')}>
                      <span className="mb-1 block text-xs font-bold text-slate-500">기준 판매가</span>
                      <input
                        value={storePriceDraft}
                        onChange={(event) => setStorePriceDraft(event.target.value)}
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-slate-900"
                      />
                    </label>
                  </div>
                  <label className="block" {...previewFocusProps('subtitle')}>
                    <span className="mb-1 block text-xs font-bold text-slate-500">설명</span>
                    <textarea
                      value={storeDescriptionDraft}
                      onChange={(event) => setStoreDescriptionDraft(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-slate-900"
                    />
                  </label>
                  <label className="block" {...previewFocusProps('productImage')}>
                    <span className="mb-1 block text-xs font-bold text-slate-500">대표 이미지 URL</span>
                    <input
                      value={storeImageUrlDraft}
                      onChange={(event) => setStoreImageUrlDraft(event.target.value)}
                      className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                    />
                  </label>
                  <label className="block" {...previewFocusProps('included')}>
                    <span className="mb-1 block text-xs font-bold text-slate-500">구성 안내</span>
                    <textarea
                      value={storeIncludedDraft}
                      onChange={(event) => setStoreIncludedDraft(event.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-slate-900"
                    />
                  </label>
                </>
              )}
              <button
                onClick={saveBasicInfo}
                disabled={savingBasic}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {savingBasic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isStoreEditor ? '상품정보 저장' : '기본정보 저장'}
              </button>
            </div>
          </section>

          <section ref={pageSectionRef} className={editorSectionClassName('page')}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">상단 화면</h2>
              <span className="text-[11px] font-bold text-slate-400">미리보기 상단</span>
            </div>
            <div className="space-y-3">
              <label {...pageFieldWorkbenchProps('productName')}>
                <span className="mb-1 block text-xs font-bold text-slate-500">{isStoreEditor ? '상품명' : '프로그램명'}</span>
                <input
                  value={nameDraft}
                  onChange={(event) => {
                    setNameDraft(event.target.value)
                    previewProductName(event.target.value)
                  }}
                  onBlur={() => {
                    if (nameDraft.trim() && nameDraft.trim() !== product.name) saveBasicInfo()
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-black outline-none focus:border-slate-900"
                />
              </label>

              <label {...pageFieldWorkbenchProps('badge')}>
                <span className="mb-1 block text-xs font-bold text-slate-500">뱃지</span>
                <input
                  value={pageContent.badge}
                  onChange={(event) => updatePageContent({ badge: event.target.value })}
                  className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900"
                />
              </label>

              <label {...pageFieldWorkbenchProps('subtitle')}>
                <span className="mb-1 block text-xs font-bold text-slate-500">한 줄 설명</span>
                <textarea
                  value={pageContent.subtitle}
                  onChange={(event) => updatePageContent({ subtitle: event.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-medium leading-relaxed outline-none focus:border-slate-900"
                />
              </label>

              <div className="space-y-3 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900">정보 박스</h3>
                  <span className="text-[10px] font-bold text-slate-400">상단 안내 카드</span>
                </div>
                <label {...pageFieldWorkbenchProps('infoTitle')}>
                  <span className="mb-1 block text-xs font-bold text-slate-500">제목</span>
                  <input
                    value={pageContent.infoTitle}
                    onChange={(event) => updatePageContent({ infoTitle: event.target.value })}
                    className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900"
                  />
                </label>

                <label {...pageFieldWorkbenchProps('infoBody')}>
                  <span className="mb-1 block text-xs font-bold text-slate-500">내용</span>
                  <textarea
                    value={pageContent.infoBody}
                    onChange={(event) => updatePageContent({ infoBody: event.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-medium leading-relaxed outline-none focus:border-slate-900"
                  />
                </label>
              </div>

              <label {...pageFieldWorkbenchProps('imagePlaceholder')}>
                <span className="mb-1 block text-xs font-bold text-slate-500">이미지 빈 상태 문구</span>
                <input
                  value={pageContent.imagePlaceholder}
                  onChange={(event) => updatePageContent({ imagePlaceholder: event.target.value })}
                  className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-slate-900"
                />
              </label>

              <div className="space-y-3 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900">CTA 버튼</h3>
                  <span className="text-[10px] font-bold text-slate-400">상단 주요 버튼</span>
                </div>
                <label {...pageFieldWorkbenchProps('ctaLabel')}>
                  <span className="mb-1 block text-xs font-bold text-slate-500">버튼 문구</span>
                  <input
                    value={pageContent.ctaLabel}
                    onChange={(event) => updatePageContent({ ctaLabel: event.target.value })}
                    className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm font-black outline-none focus:border-slate-900"
                  />
                </label>
              </div>

              <button
                onClick={() => saveDetailDraft(detailHtml, {
                  toastMessage: '상단 화면 초안이 저장되었습니다',
                })}
                disabled={draftState === 'saving'}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {draftState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                상단 화면 저장
              </button>
            </div>
          </section>

          <ProductPricingPanel
            slug={isStoreEditor ? undefined : slug}
            productTypes={isStoreEditor ? productTypeForPricing : undefined}
            title={isStoreEditor ? '상품 가격 옵션' : '연결 상품'}
            selectFromStoreProducts={!isStoreEditor}
            onToast={showToast}
          />

          <section
            ref={imageSectionRef}
            className={editorSectionClassName('image')}
            {...previewFocusProps('productImage')}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">이미지</h2>
              <button
                onClick={() => {
                  productImageUploadModeRef.current = 'add'
                  fileInputRef.current?.click()
                }}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-black text-black ring-2 ring-black disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                추가
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  const uploadMode = productImageUploadModeRef.current
                  const replaceTarget = uploadMode === 'replaceRepresentative'
                    ? images[0]
                    : uploadMode === 'replaceSelected'
                      ? selectedImage || images[0]
                      : undefined
                  productImageUploadModeRef.current = 'add'
                  handleImageUpload(file, replaceTarget)
                } else {
                  productImageUploadModeRef.current = 'add'
                }
                event.currentTarget.value = ''
              }}
            />
            {images.length === 0 ? (
              <button
                onClick={() => {
                  productImageUploadModeRef.current = 'add'
                  fileInputRef.current?.click()
                }}
                className="flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400"
              >
                <ImageIcon className="mb-2 h-8 w-8" />
                <span className="text-sm font-bold">이미지 추가</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageId(image.id)}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-white ${
                        selectedImage?.id === image.id ? 'border-black shadow-[2px_2px_0_0_black]' : 'border-slate-200'
                      }`}
                    >
                      <NextImage
                        src={image.image_url}
                        alt={image.alt_text || ''}
                        fill
                        className="object-cover"
                        sizes="80px"
                        unoptimized
                      />
                      {index === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-black text-black ring-1 ring-black">
                          대표
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      productImageUploadModeRef.current = 'replaceSelected'
                      fileInputRef.current?.click()
                    }}
                    disabled={uploading}
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    선택 이미지 교체
                  </button>
                  <button
                    onClick={() => selectedImage && handleDeleteImage(selectedImage)}
                    disabled={!selectedImage}
                    className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                </div>
              </div>
            )}
          </section>

          <section ref={detailSectionRef} className={editorSectionClassName('detail')}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">상세페이지</h2>
              <span className="text-[11px] font-bold text-slate-400">
                {draftState === 'saving'
                  ? '저장 중'
                  : draftState === 'saved'
                    ? '초안 저장됨'
                    : draftState === 'editing'
                      ? '편집 중'
                      : '대기'}
              </span>
            </div>
            <VisualDetailEditor
              value={detailHtml}
              onChange={handleDetailChange}
              onImageUpload={handleDetailImageUpload}
              selectedBlockId={selectedDetailBlockId}
              previewPatch={previewPatch}
              focusToken={detailEditorFocusToken}
              onPreviewTargetChange={handleDetailPreviewTargetChange}
              onSelectedBlockChange={handleDetailBlockSelect}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (defaultDetailImportedRef.current && draftState !== 'editing') {
                    showToast('상세페이지를 수정한 뒤 저장해주세요')
                    return
                  }
                  saveDetailDraft(detailHtml, {
                    toastMessage: '상세페이지 초안이 저장되었습니다',
                  })
                }}
                disabled={draftState === 'saving'}
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {draftState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                초안 저장
              </button>
              <button
                onClick={handleDeployCurrent}
                disabled={deploying}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                배포
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h2 className="text-sm font-black text-slate-900">수정본 저장</h2>
            </div>
            <input
              value={versionLabel}
              onChange={(event) => setVersionLabel(event.target.value)}
              placeholder={`${plainDateLabel()} 수정본`}
              className="mb-3 w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSaveVersion(false)}
                disabled={savingVersion}
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {savingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </button>
              <button
                onClick={() => handleSaveVersion(true)}
                disabled={savingVersion}
                className="flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-3 py-2.5 text-sm font-black text-black ring-2 ring-black disabled:opacity-50"
              >
                {savingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                저장+배포
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-black text-slate-900">저장된 수정본</h2>
            {versions.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-400">
                저장된 수정본이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div key={version.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{version.label}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock3 className="h-3 w-3" />
                        {formatDate(version.created_at)}
                      </p>
                      {version.deployed_at && (
                        <p className="mt-1 text-[11px] font-bold text-emerald-600">
                          배포됨 {formatDate(version.deployed_at)}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleLoadVersion(version)}
                        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                      >
                        불러오기
                      </button>
                      <button
                        onClick={() => handleDeployVersion(version)}
                        disabled={deploying}
                        className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        배포
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 30, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-[60] flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl"
          >
            <Check className="h-4 w-4 text-yellow-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
