'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  AlertCircle,
  Check,
  Loader2,
  MapPin,
  Package,
  Phone,
  Search,
  Truck,
  User,
} from 'lucide-react'
import { openDaumPostcode } from '@/lib/daum-postcode'

interface FormState {
  name: string
  phone: string
  zipCode: string
  address: string
  addressDetail: string
  productName: string
}

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  zipCode: '',
  address: '',
  addressDetail: '',
  productName: '',
}

// 010-1234-5678 형태로 자동 하이픈
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

// 공개 사이트 에디토리얼 컨벤션 — 체크아웃 배송지 입력과 동일한 필드 스타일.
// 글자 크기만 16px로 올려둔다 — iOS Safari는 16px 미만 입력창을 포커스하면
// 자동 확대되어 한 화면에 맞춘 레이아웃이 틀어진다.
const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-[6px] border border-[var(--line)] focus:border-[var(--line)] focus:ring-0 outline-none transition-all text-[var(--ink)] placeholder:text-[var(--muted-ink)] bg-[var(--paper)] hover:bg-[var(--soft)] font-medium text-base'

const LABEL_CLASS =
  'flex items-center gap-1.5 text-sm font-bold text-[var(--ink)] mb-1.5 lg:text-base'

export function OfflineShippingFormClient() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  // 허니팟 — 봇이 채우면 서버가 저장 없이 통과시킨다
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneNumber, setDoneNumber] = useState<string | null>(null)

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddressSearch = async () => {
    const result = await openDaumPostcode()
    if (!result) {
      setError('주소 검색을 불러올 수 없습니다. 주소를 직접 입력해주세요.')
      return
    }
    setError(null)
    setForm((prev) => ({
      ...prev,
      zipCode: result.zonecode,
      address: result.roadAddress || result.jibunAddress,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('이름, 연락처, 주소는 필수 입력입니다.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/offline-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          zip_code: form.zipCode,
          address: form.address,
          address_detail: form.addressDetail,
          product_name: form.productName,
          website: honeypot,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || '접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }

      setDoneNumber(data.requestNumber || '')
      setForm(EMPTY_FORM)
    } catch (err) {
      console.error('Offline shipping submit failed:', err)
      setError(err instanceof Error ? err.message : '접수에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const wordmark = (
    <div className="mb-3 flex flex-col items-center">
      <Image
        src="/images/logo/acscent-wordmark-ink.png"
        alt="AC'SCENT"
        width={2053}
        height={285}
        priority
        className="h-4 w-auto select-none"
      />
    </div>
  )

  if (doneNumber !== null) {
    return (
      <div className="public-editorial flex min-h-[100svh] flex-col justify-center bg-[var(--canvas)] px-5 py-4">
        <main className="mx-auto w-full max-w-md">
          {wordmark}

          <section className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-6 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dark-band)]">
              <Check size={22} className="text-white" strokeWidth={3} />
            </div>

            <h1 className="text-2xl font-black leading-snug text-[var(--ink)]">
              접수가 완료되었습니다
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-ink)] lg:text-base">
              입력해주신 주소로 발송되며, 준비가 완료되면 순차적으로 출고됩니다.
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
              다른 분 추가 접수하기
            </button>
            <p className="mt-4 text-[11px] font-medium text-[var(--muted-ink)] lg:text-[13px]">
              문의는 매장 스태프에게 접수번호를 말씀해주세요.
            </p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="public-editorial flex min-h-[100svh] flex-col justify-center bg-[var(--canvas)] px-5 py-4">
      <main className="mx-auto w-full max-w-md">
        {wordmark}

        <section className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
          <h1 className="mb-3.5 text-xl font-black leading-snug text-[var(--ink)] lg:text-2xl">
            받으실 주소를 입력해주세요
          </h1>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* 이름·연락처는 한 줄로 — 아이폰에서 스크롤 없이 담기 위한 배치 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="ship-name" className={LABEL_CLASS}>
                  <User size={14} />
                  이름 <span className="text-[var(--muted-ink)]">*</span>
                </label>
                <input
                  id="ship-name"
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
                <label htmlFor="ship-phone" className={LABEL_CLASS}>
                  <Phone size={14} />
                  연락처 <span className="text-[var(--muted-ink)]">*</span>
                </label>
                <input
                  id="ship-phone"
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
              <label className={LABEL_CLASS}>
                <MapPin size={14} />
                주소 <span className="text-[var(--muted-ink)]">*</span>
              </label>
              <div className="mb-1.5 flex gap-2">
                <input
                  type="text"
                  value={form.zipCode}
                  onChange={(e) => update('zipCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="우편번호"
                  inputMode="numeric"
                  className={`${INPUT_CLASS} flex-1 min-w-0`}
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="flex shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-3 py-2.5 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--line-soft)] lg:text-base"
                >
                  <Search size={14} />
                  주소 검색
                </button>
              </div>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="도로명 주소"
                autoComplete="street-address"
                maxLength={200}
                required
                className={`${INPUT_CLASS} mb-1.5`}
              />
              <input
                type="text"
                value={form.addressDetail}
                onChange={(e) => update('addressDetail', e.target.value)}
                placeholder="상세주소 (동 · 호수)"
                autoComplete="address-line2"
                enterKeyHint="done"
                maxLength={100}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="ship-product" className={LABEL_CLASS}>
                <Package size={14} />
                상품 <span className="font-normal text-[var(--muted-ink)]">(선택)</span>
              </label>
              <input
                id="ship-product"
                type="text"
                value={form.productName}
                onChange={(e) => update('productName', e.target.value)}
                placeholder="예: 킥플립 계훈 문고리"
                maxLength={100}
                className={INPUT_CLASS}
              />
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
              <p className="flex items-start gap-2 rounded-[6px] border border-[var(--ink)] bg-[var(--soft)] px-3 py-2.5 text-xs font-bold leading-relaxed text-[var(--ink)] lg:text-sm">
                <AlertCircle size={15} className="mt-px shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--ink)] py-3.5 text-base font-extrabold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
              택배 접수하기
            </button>

            <p className="text-center text-[11px] font-medium leading-relaxed text-[var(--muted-ink)] lg:text-[13px]">
              입력하신 정보는 배송 처리 목적으로만 사용됩니다.
            </p>
          </form>
        </section>
      </main>
    </div>
  )
}
