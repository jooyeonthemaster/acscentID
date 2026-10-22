'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  Loader2,
  Minus,
  Phone,
  Plus,
  Send,
  ShoppingBag,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { base64ToBlob, compressImage } from '@/lib/image/compressor'
import {
  ACCOUNT_DIGITS_MAX,
  ACCOUNT_DIGITS_MIN,
  BANK_OPTIONS,
  BANK_OTHER,
  OFFLINE_PROOF_MAX_IMAGES,
  OFFLINE_PROOF_MAX_QUANTITY,
  OFFLINE_PROOF_MAX_TOTAL_BYTES,
  formatAmount,
  formatItems,
  formatPhone,
  kstToday,
  type OfflineProofProductOption,
} from '@/lib/offline-proof'

interface FormState {
  name: string
  phone: string
  bank: string
  bankOther: string
  accountNumber: string
  paymentDate: string
  /** 숫자만 — 화면에는 쉼표를 넣어 보여준다 */
  paymentAmount: string
}

interface ProofImage {
  id: string
  blob: Blob
  previewUrl: string
}

const INITIAL_FORM: FormState = {
  name: '',
  phone: '',
  bank: '',
  bankOther: '',
  accountNumber: '',
  paymentDate: '',
  paymentAmount: '',
}

// 한 장 목표 용량 — 넘으면 한 번 더 줄인다 (3장이 요청 한도 안에 들어가도록)
const TARGET_IMAGE_BYTES = 1.3 * 1024 * 1024

/**
 * 결제 내역 글씨가 읽히는 해상도로 줄여 JPEG 로 만든다.
 * 세로를 길게 허용해 카드사 앱 긴 스크롤 캡처도 글씨가 뭉개지지 않게 한다.
 */
async function prepareImage(file: File): Promise<Blob> {
  let blob = base64ToBlob(await compressImage(file, { maxWidth: 1600, maxHeight: 4096, quality: 0.85 }))
  if (blob.size > TARGET_IMAGE_BYTES) {
    blob = base64ToBlob(await compressImage(file, { maxWidth: 1280, maxHeight: 3200, quality: 0.7 }))
  }
  return blob
}

// 공개 사이트 에디토리얼 컨벤션 — 매장 택배 접수(/ship)와 동일한 필드 스타일.
// 글자 크기는 16px — iOS Safari는 16px 미만 입력창을 포커스하면 자동 확대된다.
const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] focus:ring-0 outline-none transition-all text-[var(--ink)] placeholder:text-[var(--muted-ink)] bg-[var(--paper)] hover:bg-[var(--soft)] font-medium text-base'

const LABEL_CLASS =
  'flex items-center gap-1.5 text-sm font-bold text-[var(--ink)] mb-1.5 lg:text-base'

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 text-base font-black text-[var(--ink)] lg:text-lg">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-white">
        {step}
      </span>
      {title}
    </h2>
  )
}

function Mark({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded-[2px] bg-[var(--accent-ai-soft)] px-0.5 text-[var(--ink)] ring-1 ring-[var(--accent-ai)]">
      {children}
    </mark>
  )
}

export function OfflineProofFormClient({ products }: { products: OfflineProofProductOption[] }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  // 구매 상품 — 펼쳐서 고르는 토글, 고른 상품만 수량을 가진다
  const [productsOpen, setProductsOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [images, setImages] = useState<ProofImage[]>([])
  const [preparing, setPreparing] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  // 허니팟 — 봇이 채우면 서버가 저장 없이 통과시킨다
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneNumber, setDoneNumber] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<ProofImage[]>([])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  // 떠날 때 미리보기 주소 정리
  useEffect(() => () => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  }, [])

  const today = kstToday()
  const remainingSlots = OFFLINE_PROOF_MAX_IMAGES - images.length - preparing
  const hasProducts = products.length > 0
  // 상품이 등록돼 있을 때만 「구매 상품」이 1번 — 나머지 번호를 한 칸씩 민다
  const stepOffset = hasProducts ? 1 : 0
  const selectedItems = products
    .filter((product) => quantities[product.id])
    .map((product) => ({ product_id: product.id, name: product.name, quantity: quantities[product.id] }))

  const toggleProduct = (id: string) => {
    setQuantities((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
    setError(null)
  }

  const changeQuantity = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.min(OFFLINE_PROOF_MAX_QUANTITY, Math.max(1, (prev[id] || 1) + delta)),
    }))
  }

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/') || file.type === '')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (files.length === 0) return

    const accepted = files.slice(0, Math.max(0, remainingSlots))
    if (files.length > accepted.length) {
      setError(`사진은 최대 ${OFFLINE_PROOF_MAX_IMAGES}장까지 올릴 수 있어요.`)
    } else {
      setError(null)
    }

    setPreparing((count) => count + accepted.length)
    for (const file of accepted) {
      try {
        const blob = await prepareImage(file)
        const image: ProofImage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          blob,
          previewUrl: URL.createObjectURL(blob),
        }
        setImages((prev) => [...prev, image])
      } catch (err) {
        console.error('Proof image prepare failed:', err)
        setError('이 사진은 열 수 없어요. 화면 캡처(스크린샷)나 JPG 사진으로 다시 올려주세요.')
      } finally {
        setPreparing((count) => count - 1)
      }
    }
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((image) => image.id !== id)
    })
  }

  const validate = (): string | null => {
    if (hasProducts && selectedItems.length === 0) return '구매하신 상품을 선택해주세요.'
    if (images.length === 0) return '결제 내역 사진을 올려주세요.'
    if (preparing > 0) return '사진을 준비하고 있어요. 잠시만 기다려주세요.'
    if (!form.paymentDate) return '결제일을 선택해주세요.'
    if (form.paymentDate > today) return '결제일은 오늘 이전 날짜여야 해요.'
    if (!form.paymentAmount || Number(form.paymentAmount) <= 0) return '결제 금액을 입력해주세요.'
    if (!form.name.trim()) return '이름(예금주)을 입력해주세요.'
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length < 9) return '연락처를 입력해주세요.'
    if (!form.bank) return '은행을 선택해주세요.'
    if (form.bank === BANK_OTHER && !form.bankOther.trim()) return '은행 이름을 입력해주세요.'
    const accountDigits = form.accountNumber.replace(/\D/g, '')
    if (accountDigits.length < ACCOUNT_DIGITS_MIN || accountDigits.length > ACCOUNT_DIGITS_MAX) {
      return '계좌번호를 다시 확인해주세요.'
    }
    if (!agreed) return '개인정보 수집·이용에 동의해주세요.'
    const totalBytes = images.reduce((sum, image) => sum + image.blob.size, 0)
    if (totalBytes > OFFLINE_PROOF_MAX_TOTAL_BYTES) return '사진 용량이 너무 커요. 사진 수를 줄여주세요.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const invalid = validate()
    if (invalid) {
      setError(invalid)
      if (hasProducts && selectedItems.length === 0) setProductsOpen(true)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const body = new FormData()
      body.append('name', form.name.trim())
      body.append('phone', form.phone)
      body.append('bank_name', form.bank === BANK_OTHER ? form.bankOther.trim() : form.bank)
      body.append('account_number', form.accountNumber)
      body.append('payment_date', form.paymentDate)
      body.append('payment_amount', form.paymentAmount)
      body.append(
        'items',
        JSON.stringify(selectedItems.map(({ product_id, quantity }) => ({ product_id, quantity })))
      )
      body.append('privacy_agreed', agreed ? 'true' : 'false')
      body.append('website', honeypot)
      images.forEach((image, index) => body.append('images', image.blob, `proof-${index + 1}.jpg`))

      const response = await fetch('/api/offline-proof', { method: 'POST', body })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 413) throw new Error('사진 용량이 너무 커요. 사진 수를 줄여 다시 시도해주세요.')
        throw new Error(data.error || '제출에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }

      images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      setImages([])
      setForm(INITIAL_FORM)
      setQuantities({})
      setProductsOpen(false)
      setAgreed(false)
      setDoneNumber(data.requestNumber || '')
      window.scrollTo({ top: 0 })
    } catch (err) {
      console.error('Offline proof submit failed:', err)
      setError(err instanceof Error ? err.message : '제출에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (doneNumber !== null) {
    return (
      <div className="public-editorial flex min-h-[100svh] flex-col justify-center bg-[var(--canvas)] px-5 py-4">
        <main className="mx-auto w-full max-w-md">
          <section className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-6 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dark-band)]">
              <Check size={22} className="text-white" strokeWidth={3} />
            </div>

            <h1 className="text-2xl font-black leading-snug text-[var(--ink)]">
              제출이 완료되었습니다
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-ink)] lg:text-base">
              결제 내역을 확인한 뒤, 돌려드릴 금액을 입력하신 계좌로 입금해 드려요.
              <br />
              확인에 시간이 걸릴 수 있으니 조금만 기다려주세요.
            </p>

            {doneNumber && (
              <div className="mt-6 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-ink)]">
                  접수번호
                </p>
                <p className="mt-1.5 font-mono text-lg font-black tracking-wide text-[var(--ink)]">
                  {doneNumber}
                </p>
              </div>
            )}

            <button
              onClick={() => setDoneNumber(null)}
              className="mt-6 h-12 w-full rounded-[6px] border border-[var(--line)] bg-[var(--paper)] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
            >
              다른 결제 건 추가 제출하기
            </button>
            <p className="mt-4 text-[11px] font-medium text-[var(--muted-ink)] lg:text-[13px]">
              문의하실 때 접수번호를 알려주세요.
            </p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="public-editorial min-h-[100svh] bg-[var(--canvas)] px-5 py-6">
      <main className="mx-auto w-full max-w-md">
        <section className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
          <h1 className="text-xl font-black leading-snug text-[var(--ink)] lg:text-2xl">
            오프라인 결제 증빙 제출
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-ink)]">
            매장에서 카드로 결제하신 내역을 올려주시면, 확인 후 돌려드릴 금액을 입력하신 계좌로 입금해 드려요.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-6" noValidate>
            {/* 1. 구매 상품 — 눌러서 펼친 뒤 고르는 토글 (등록된 상품이 있을 때만) */}
            {hasProducts && (
              <div>
                <SectionTitle step={1} title="구매 상품" />
                <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)]">
                  <button
                    type="button"
                    onClick={() => setProductsOpen(!productsOpen)}
                    aria-expanded={productsOpen}
                    aria-controls="proof-products"
                    className="flex min-h-[46px] w-full items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <ShoppingBag size={16} className="shrink-0 text-[var(--ink)]" />
                    <span
                      className={`min-w-0 flex-1 text-base ${
                        selectedItems.length > 0 ? 'font-bold text-[var(--ink)]' : 'font-medium text-[var(--muted-ink)]'
                      }`}
                    >
                      {selectedItems.length > 0 ? formatItems(selectedItems) : '구매하신 상품을 선택해주세요'}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-[var(--muted-ink)] transition-transform ${productsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {productsOpen && (
                    <div id="proof-products" className="border-t border-[var(--line)]">
                      <ul>
                        {products.map((product) => {
                          const quantity = quantities[product.id]
                          return (
                            <li
                              key={product.id}
                              className="flex items-center gap-3 border-b border-[var(--line-soft)] px-3 py-2 last:border-b-0"
                            >
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={!!quantity}
                                onClick={() => toggleProduct(product.id)}
                                className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2.5 text-left"
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border ${
                                    quantity
                                      ? 'border-[var(--ink)] bg-[var(--ink)]'
                                      : 'border-[var(--muted-ink)] bg-[var(--paper)]'
                                  }`}
                                >
                                  {quantity ? <Check size={13} className="text-white" strokeWidth={3} /> : null}
                                </span>
                                <span className="text-base font-bold text-[var(--ink)]">{product.name}</span>
                              </button>

                              {quantity ? (
                                <div className="flex shrink-0 items-center rounded-[6px] border border-[var(--line)]">
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(product.id, -1)}
                                    disabled={quantity <= 1}
                                    aria-label={`${product.name} 수량 줄이기`}
                                    className="flex h-9 w-9 items-center justify-center text-[var(--ink)] disabled:opacity-30"
                                  >
                                    <Minus size={14} strokeWidth={3} />
                                  </button>
                                  <span className="w-7 text-center text-base font-bold text-[var(--ink)]" aria-live="polite">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(product.id, 1)}
                                    disabled={quantity >= OFFLINE_PROOF_MAX_QUANTITY}
                                    aria-label={`${product.name} 수량 늘리기`}
                                    className="flex h-9 w-9 items-center justify-center text-[var(--ink)] disabled:opacity-30"
                                  >
                                    <Plus size={14} strokeWidth={3} />
                                  </button>
                                </div>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setProductsOpen(false)}
                        className="w-full border-t border-[var(--line)] bg-[var(--soft)] py-2.5 text-sm font-bold text-[var(--ink)]"
                      >
                        선택 완료
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 결제 내역 사진 */}
            <div>
              <SectionTitle step={1 + stepOffset} title="결제 내역 사진" />

              {/* 예시 — 날짜와 금액이 꼭 보여야 한다는 걸 그림으로 */}
              <div className="mb-3 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] p-3">
                <p className="mb-2 text-[11px] font-bold text-[var(--muted-ink)] lg:text-xs">
                  예시 · 카드사 앱 결제(이용)내역 캡처
                </p>
                <div className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5" aria-hidden="true">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-bold text-[var(--ink)]">
                      <Mark>2026.10.20</Mark>{' '}
                      <span className="font-medium text-[var(--muted-ink)]">14:32</span>
                    </span>
                    <span className="text-[15px] font-black text-[var(--ink)]">
                      <Mark>35,000원</Mark>
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-[var(--muted-ink)]">
                    <span>가맹점명</span>
                    <span>일시불 · 승인</span>
                  </div>
                </div>
                <ul className="mt-2.5 space-y-1 text-xs font-medium leading-relaxed text-[var(--ink)] lg:text-[13px]">
                  <li className="flex gap-1.5">
                    <Check size={13} className="mt-0.5 shrink-0" strokeWidth={3} />
                    <span>
                      <b>결제 날짜</b>와 <b>결제 금액</b>이 잘리지 않게 담아주세요.
                    </span>
                  </li>
                  <li className="flex gap-1.5">
                    <Check size={13} className="mt-0.5 shrink-0" strokeWidth={3} />
                    <span>카드 영수증을 찍어 올려도 돼요.</span>
                  </li>
                  <li className="flex gap-1.5">
                    <Check size={13} className="mt-0.5 shrink-0" strokeWidth={3} />
                    <span>카드번호 같은 다른 정보는 가리셔도 괜찮아요.</span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative aspect-[3/4] overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.previewUrl}
                      alt={`결제 내역 사진 ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      aria-label={`사진 ${index + 1} 삭제`}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)]/80 text-white"
                    >
                      <X size={15} strokeWidth={3} />
                    </button>
                  </div>
                ))}

                {Array.from({ length: preparing }, (_, index) => (
                  <div
                    key={`preparing-${index}`}
                    className="flex aspect-[3/4] items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--soft)]"
                  >
                    <Loader2 size={20} className="animate-spin text-[var(--muted-ink)]" />
                  </div>
                ))}

                {remainingSlots > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-[var(--muted-ink)] bg-[var(--paper)] text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
                  >
                    {images.length === 0 ? <Camera size={22} /> : <Plus size={22} />}
                    <span className="text-xs font-bold">
                      {images.length === 0 ? '사진 올리기' : '사진 추가'}
                    </span>
                    <span className="text-[11px] font-medium text-[var(--muted-ink)]">
                      {images.length}/{OFFLINE_PROOF_MAX_IMAGES}
                    </span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* 결제 정보 */}
            <div>
              <SectionTitle step={2 + stepOffset} title="결제 정보" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="proof-date" className={LABEL_CLASS}>
                    <Calendar size={14} />
                    결제일 <span className="text-[var(--muted-ink)]">*</span>
                  </label>
                  <input
                    id="proof-date"
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => update('paymentDate', e.target.value)}
                    max={today}
                    required
                    className={`${INPUT_CLASS} min-h-[46px] appearance-none text-left`}
                  />
                </div>

                <div>
                  <label htmlFor="proof-amount" className={LABEL_CLASS}>
                    <CreditCard size={14} />
                    결제 금액 <span className="text-[var(--muted-ink)]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="proof-amount"
                      type="text"
                      inputMode="numeric"
                      value={form.paymentAmount ? formatAmount(Number(form.paymentAmount)) : ''}
                      onChange={(e) => update('paymentAmount', e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9))}
                      placeholder="0"
                      enterKeyHint="next"
                      required
                      className={`${INPUT_CLASS} pr-8 text-right`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-bold text-[var(--muted-ink)]">
                      원
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 입금받을 계좌 */}
            <div>
              <SectionTitle step={3 + stepOffset} title="입금받을 계좌" />
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="proof-name" className={LABEL_CLASS}>
                      <User size={14} />
                      이름(예금주) <span className="text-[var(--muted-ink)]">*</span>
                    </label>
                    <input
                      id="proof-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="홍길동"
                      autoComplete="name"
                      enterKeyHint="next"
                      maxLength={50}
                      required
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="proof-phone" className={LABEL_CLASS}>
                      <Phone size={14} />
                      연락처 <span className="text-[var(--muted-ink)]">*</span>
                    </label>
                    <input
                      id="proof-phone"
                      type="tel"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(e) => update('phone', formatPhone(e.target.value))}
                      placeholder="010-1234-5678"
                      autoComplete="tel"
                      enterKeyHint="next"
                      maxLength={20}
                      required
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="proof-bank" className={LABEL_CLASS}>
                    <Landmark size={14} />
                    은행 <span className="text-[var(--muted-ink)]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="proof-bank"
                      value={form.bank}
                      onChange={(e) => update('bank', e.target.value)}
                      required
                      className={`${INPUT_CLASS} appearance-none pr-9 ${form.bank ? '' : 'text-[var(--muted-ink)]'}`}
                    >
                      <option value="" disabled>
                        은행을 선택해주세요
                      </option>
                      {BANK_OPTIONS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                      <option value={BANK_OTHER}>기타 (직접 입력)</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-ink)]"
                    />
                  </div>
                  {form.bank === BANK_OTHER && (
                    <input
                      type="text"
                      value={form.bankOther}
                      onChange={(e) => update('bankOther', e.target.value)}
                      placeholder="은행 이름 (예: OO저축은행, OO증권)"
                      aria-label="은행 이름"
                      maxLength={30}
                      className={`${INPUT_CLASS} mt-1.5`}
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="proof-account" className={LABEL_CLASS}>
                    <Wallet size={14} />
                    계좌번호 <span className="text-[var(--muted-ink)]">*</span>
                  </label>
                  <input
                    id="proof-account"
                    type="text"
                    inputMode="numeric"
                    value={form.accountNumber}
                    onChange={(e) => update('accountNumber', e.target.value.replace(/[^\d-]/g, '').slice(0, 30))}
                    placeholder="숫자만 입력 (- 없이도 괜찮아요)"
                    autoComplete="off"
                    enterKeyHint="done"
                    required
                    className={INPUT_CLASS}
                  />
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[var(--muted-ink)] lg:text-[13px]">
                    입력하신 이름과 예금주가 다르면 입금이 늦어질 수 있어요.
                  </p>
                </div>
              </div>
            </div>

            {/* 개인정보 수집·이용 동의 */}
            <div className="rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked)
                      setError(null)
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--ink)]"
                  />
                  <span className="text-sm font-bold leading-snug text-[var(--ink)]">
                    개인정보 수집·이용에 동의합니다 <span className="text-[var(--muted-ink)]">(필수)</span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(!showPrivacy)}
                  aria-expanded={showPrivacy}
                  className="shrink-0 text-xs font-bold text-[var(--muted-ink)] underline underline-offset-2"
                >
                  {showPrivacy ? '접기' : '내용 보기'}
                </button>
              </div>
              {showPrivacy && (
                <dl className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-xs leading-relaxed text-[var(--ink)] lg:text-[13px]">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-bold">수집 항목</dt>
                    <dd>이름(예금주), 연락처, 은행·계좌번호, 결제일·결제 금액, 결제 내역 사진</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-bold">이용 목적</dt>
                    <dd>오프라인 결제 확인 및 입금 처리, 처리 관련 안내 연락</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-bold">보유 기간</dt>
                    <dd>입금 처리 완료 후 지체 없이 파기 (관계 법령에 따라 보관이 필요한 경우 해당 기간까지)</dd>
                  </div>
                  <p className="pt-1 text-[var(--muted-ink)]">
                    동의를 거부하실 수 있으나, 거부하시면 증빙 접수와 입금 처리가 어려워요.
                  </p>
                </dl>
              )}
            </div>

            {/* 봇 차단용 숨김 필드 — 실제 사용자에게는 보이지 않는다 */}
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-[6px] border border-[var(--ink)] bg-[var(--soft)] px-3 py-2.5 text-xs font-bold leading-relaxed text-[var(--ink)] lg:text-sm"
              >
                <AlertCircle size={15} className="mt-px shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || preparing > 0}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--ink)] py-3.5 text-base font-extrabold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? '제출하는 중…' : '증빙 제출하기'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
