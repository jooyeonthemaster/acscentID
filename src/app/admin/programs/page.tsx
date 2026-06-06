'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '../components/AdminHeader'
import { ADMIN_PROGRAMS, ADMIN_PROGRAM_SLUGS, type AdminProgramDefinition } from '@/lib/admin/catalog'
import { PRODUCT_TYPE_BADGES, type ProductType } from '@/types/cart'
import { ProductPricingPanel } from '@/components/admin/ProductPricingPanel'
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
} from 'lucide-react'

interface AdminProduct {
  slug: string
  name: string
  is_active: boolean
  display_order: number
  updated_at: string | null
}

const KIND_BADGE: Record<AdminProgramDefinition['kind'], { label: string; className: string }> = {
  analysis: { label: '분석형', className: 'bg-blue-100 text-blue-700' },
  catalog: { label: '카탈로그형', className: 'bg-amber-100 text-amber-700' },
  signature: { label: '시그니처', className: 'bg-pink-100 text-pink-700' },
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

function ProgramIcon({ kind }: { kind: AdminProgramDefinition['kind'] }) {
  if (kind === 'catalog') return <Star className="h-5 w-5" />
  if (kind === 'signature') return <Sparkles className="h-5 w-5" />
  return <Bot className="h-5 w-5" />
}

function ProductTypeChip({ type }: { type: ProductType }) {
  const badge = PRODUCT_TYPE_BADGES[type] ?? PRODUCT_TYPE_BADGES.image_analysis
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text} ${badge.border}`}>
      {badge.labelShort}
    </span>
  )
}

export default function AdminProgramsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [expandedPricing, setExpandedPricing] = useState<Set<string>>(new Set())

  const togglePricing = useCallback((slug: string) => {
    setExpandedPricing((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2500)
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '프로그램 목록 조회 실패')
      setProducts((json.products ?? []) as AdminProduct[])
    } catch (error) {
      showToast(error instanceof Error ? error.message : '프로그램 목록 조회 실패')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const productBySlug = useMemo(() => {
    return new Map(products.map((product) => [product.slug, product]))
  }, [products])

  const customPrograms = useMemo(() => {
    return products
      .filter((product) => !ADMIN_PROGRAM_SLUGS.has(product.slug))
      .sort((a, b) => a.display_order - b.display_order)
  }, [products])

  const activeCount = ADMIN_PROGRAMS.filter((program) => {
    if (!program.registryManaged) return true
    return productBySlug.get(program.slug)?.is_active
  }).length

  // 메인페이지 노출 on/off (오늘의 향 등 레지스트리 비관리 프로그램용). 행 없으면 생성, 있으면 수정.
  const handleToggleActive = async (program: AdminProgramDefinition, nextActive: boolean) => {
    setBusySlug(program.slug)
    try {
      const existing = productBySlug.get(program.slug)
      const res = await fetch('/api/admin/products', {
        method: existing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          existing
            ? { slug: program.slug, is_active: nextActive }
            : { slug: program.slug, name: program.name, is_active: nextActive, display_order: products.length },
        ),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '노출 설정 실패')
      showToast(nextActive ? '메인 페이지에 노출됩니다' : '메인 페이지에서 숨김 처리되었습니다')
      await fetchProducts()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '노출 설정 실패')
    } finally {
      setBusySlug(null)
    }
  }

  const handleRegisterProgram = async (program: AdminProgramDefinition) => {
    setBusySlug(program.slug)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: program.slug,
          name: program.name,
          is_active: true,
          display_order: products.length,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || '프로그램 등록 실패')
      showToast('프로그램 레지스트리에 등록되었습니다')
      await fetchProducts()
    } catch (error) {
      showToast(error instanceof Error ? error.message : '프로그램 등록 실패')
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        title="프로그램 관리"
        subtitle="분석형 프로그램과 시그니처/오늘의 향 같은 프로그램형 판매 흐름을 관리합니다"
        actions={
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">관리 대상</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{ADMIN_PROGRAMS.length}개</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">활성 프로그램</p>
            <p className="mt-2 text-2xl font-black text-emerald-600">{activeCount}개</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">분석형</p>
            <p className="mt-2 text-2xl font-black text-blue-600">
              {ADMIN_PROGRAMS.filter((program) => program.kind === 'analysis').length}개
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold text-slate-500">추가 등록 프로그램</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{customPrograms.length}개</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 items-start gap-4">
            {ADMIN_PROGRAMS.map((program) => {
              const registry = productBySlug.get(program.slug)
              const kindBadge = KIND_BADGE[program.kind]
              const isRegistered = !program.registryManaged || !!registry
              // registryManaged: registry.is_active 기준. 그 외(오늘의 향 등): 행 없으면 기본 노출(true)
              const isActive = program.registryManaged
                ? registry?.is_active === true
                : registry
                  ? registry.is_active
                  : true

              return (
                <section key={program.slug} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                        <ProgramIcon kind={program.kind} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-black text-slate-900">{registry?.name || program.name}</h2>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kindBadge.className}`}>
                            {kindBadge.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">{program.description}</p>
                      </div>
                    </div>
                    {isRegistered && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold ${isActive ? 'text-green-600' : 'text-slate-400'}`}>
                          {isActive ? '메인 노출' : '미노출'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          aria-label={isActive ? '메인 노출 끄기' : '메인 노출 켜기'}
                          onClick={() => handleToggleActive(program, !isActive)}
                          disabled={busySlug === program.slug}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            isActive ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              isActive ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {program.productTypes.map((type) => (
                      <ProductTypeChip key={type} type={type} />
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="font-bold text-slate-400">slug</p>
                      <p className="mt-1 font-mono text-slate-700">{program.slug}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="font-bold text-slate-400">수정일</p>
                      <p className="mt-1 text-slate-700">{registry ? formatDate(registry.updated_at) : '-'}</p>
                    </div>
                  </div>

                  {!isRegistered && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="font-semibold">상세/이미지 편집용 레지스트리에 아직 등록되지 않았습니다.</p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {program.registryManaged && registry ? (
                      <Link
                        href={`/admin/products/${program.slug}`}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        프로그램 편집
                      </Link>
                    ) : program.registryManaged ? (
                      <button
                        onClick={() => handleRegisterProgram(program)}
                        disabled={busySlug === program.slug}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {busySlug === program.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        레지스트리 등록
                      </button>
                    ) : null}
                    <Link
                      href={program.publicHref}
                      target="_blank"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      실제 페이지
                    </Link>
                    {program.inputHref && (
                      <Link
                        href={program.inputHref}
                        target="_blank"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        입력 흐름
                      </Link>
                    )}
                  </div>

                  {program.productTypes.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <button
                        onClick={() => togglePricing(program.slug)}
                        className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        <span className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-slate-400" />
                          연결 상품 관리
                        </span>
                        {expandedPricing.has(program.slug) ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                      {expandedPricing.has(program.slug) && (
                        <div className="mt-3">
                          <ProductPricingPanel
                            productTypes={program.productTypes}
                            title="연결 상품"
                            selectFromStoreProducts
                            onToast={showToast}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {customPrograms.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-black text-slate-900">추가 등록된 프로그램</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {customPrograms.map((program) => (
                <div key={program.slug} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-900">{program.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">{program.slug}</p>
                  </div>
                  <Link
                    href={`/admin/products/${program.slug}`}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    편집
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          <Check className="h-4 w-4 text-yellow-400" />
          {toast}
        </div>
      )}
    </div>
  )
}
