'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  Ticket,
  Truck,
  User,
  X,
} from 'lucide-react'
import { openDaumPostcode } from '@/lib/daum-postcode'
import {
  SHIP_COUPON_CODE_LENGTH,
  SHIP_COUPON_MAX_PER_REQUEST,
  formatShipCouponCode,
  normalizeShipCouponCode,
} from '@/lib/offline-shipping-coupons'

interface FormState {
  name: string
  phone: string
  zipCode: string
  address: string
  addressDetail: string
}

const INITIAL_FORM: FormState = {
  name: '',
  phone: '',
  zipCode: '',
  address: '',
  addressDetail: '',
}

interface ShipCoupon {
  code: string
  productName: string
}

type CheckStatus = 'active' | 'used' | 'void' | 'not_found'

// 교환권 QR을 하나 더 찍으면 새 탭이 열린다 — 확인된 코드를 잠깐 기억해 두었다가 새 탭에서 합친다.
// 매장 공용 기기에서 다음 손님에게 넘어가지 않도록 짧게만 기억하고, 접수하면 지운다.
const DRAFT_KEY = 'acscent-ship-coupons'
const DRAFT_TTL_MS = 30 * 60 * 1000

function loadDraftCodes(): string[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return []
    const draft = JSON.parse(raw) as { codes?: unknown; savedAt?: number }
    if (!Array.isArray(draft.codes) || !draft.savedAt || Date.now() - draft.savedAt > DRAFT_TTL_MS) return []
    return draft.codes.filter((code): code is string => typeof code === 'string')
  } catch {
    return []
  }
}

function saveDraftCodes(codes: string[]) {
  try {
    if (codes.length === 0) localStorage.removeItem(DRAFT_KEY)
    else localStorage.setItem(DRAFT_KEY, JSON.stringify({ codes, savedAt: Date.now() }))
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)는 합치기만 빠진다
  }
}

function describeUnusable(status: CheckStatus): string {
  if (status === 'used') return '이미 접수에 사용된 교환권이에요'
  if (status === 'void') return '사용할 수 없는 교환권이에요'
  return '없는 교환권 코드예요. 교환권에 적힌 8자리를 확인해주세요'
}

async function checkCoupons(codes: string[]): Promise<{ code: string; productName: string | null; status: CheckStatus }[]> {
  const response = await fetch('/api/offline-shipping/coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codes }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || '교환권 확인에 실패했습니다. 잠시 후 다시 시도해주세요.')
  return data.coupons || []
}

// 입력하는 동안 대문자로 바꾸고 4자리 뒤에 하이픈
function formatCodeInput(value: string): string {
  return formatShipCouponCode(normalizeShipCouponCode(value).slice(0, SHIP_COUPON_CODE_LENGTH))
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

const CODE_INPUT_CLASS = `${INPUT_CLASS} font-mono uppercase tracking-[0.12em] placeholder:tracking-[0.12em]`

const LABEL_CLASS =
  'flex items-center gap-1.5 text-sm font-bold text-[var(--ink)] mb-1.5 lg:text-base'

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 whitespace-pre-line rounded-[6px] border border-[var(--ink)] bg-[var(--soft)] px-3 py-2.5 text-xs font-bold leading-relaxed text-[var(--ink)] lg:text-sm">
      <AlertCircle size={15} className="mt-px shrink-0" />
      {message}
    </p>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-editorial flex min-h-[100svh] flex-col justify-center bg-[var(--canvas)] px-5 py-4">
      <main className="mx-auto w-full max-w-md">{children}</main>
    </div>
  )
}

export function OfflineShippingFormClient() {
  const [phase, setPhase] = useState<'loading' | 'entry' | 'form'>('loading')
  const [coupons, setCoupons] = useState<ShipCoupon[]>([])
  const [codeInput, setCodeInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  // 교환권 확인·추가 문제는 교환권 칸 옆에, 접수 문제는 접수 버튼 위에 보여 준다
  const [couponError, setCouponError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  // 허니팟 — 봇이 채우면 서버가 저장 없이 통과시킨다
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ requestNumber: string; productName: string } | null>(null)

  const applyCoupons = (next: ShipCoupon[]) => {
    setCoupons(next)
    saveDraftCodes(next.map((coupon) => coupon.code))
    setPhase(next.length > 0 ? 'form' : 'entry')
  }

  // 첫 진입 — QR 주소의 ?code= 와 방금 확인한 교환권(다른 탭)을 합쳐 확인한다
  useEffect(() => {
    const urlCode = normalizeShipCouponCode(new URLSearchParams(window.location.search).get('code') || '')
    // 새로고침·뒤로 가기에 같은 코드가 다시 들어오지 않게 주소에서 뺀다
    if (urlCode) window.history.replaceState(null, '', window.location.pathname)

    const codes = [...new Set([...loadDraftCodes(), ...(urlCode ? [urlCode] : [])])].slice(-SHIP_COUPON_MAX_PER_REQUEST)
    if (codes.length === 0) {
      setPhase('entry')
      return
    }

    let cancelled = false
    checkCoupons(codes)
      .then((results) => {
        if (cancelled) return
        const usable = results
          .filter((result) => result.status === 'active' && result.productName)
          .map((result) => ({ code: result.code, productName: result.productName as string }))
        const unusable = results.filter((result) => result.status !== 'active')
        if (unusable.length > 0) {
          setCouponError(
            unusable.map((result) => `${formatShipCouponCode(result.code)} — ${describeUnusable(result.status)}`).join('\n')
          )
        }
        applyCoupons(usable)
      })
      .catch((err) => {
        if (cancelled) return
        setCouponError(err instanceof Error ? err.message : '교환권 확인에 실패했습니다.')
        setPhase('entry')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAddCoupon = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (checking) return
    const code = normalizeShipCouponCode(codeInput)
    if (code.length !== SHIP_COUPON_CODE_LENGTH) {
      setCouponError(`교환권에 적힌 코드 ${SHIP_COUPON_CODE_LENGTH}자리를 입력해주세요.`)
      return
    }
    if (coupons.some((coupon) => coupon.code === code)) {
      setCouponError('이미 추가된 교환권이에요.')
      return
    }

    setChecking(true)
    setCouponError(null)
    try {
      const [result] = await checkCoupons([code])
      if (!result || result.status !== 'active' || !result.productName) {
        setCouponError(`${formatShipCouponCode(code)} — ${describeUnusable(result?.status || 'not_found')}`)
        return
      }
      applyCoupons([...coupons, { code, productName: result.productName }])
      setCodeInput('')
      setAddOpen(false)
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : '교환권 확인에 실패했습니다.')
    } finally {
      setChecking(false)
    }
  }

  const removeCoupon = (code: string) => {
    setCouponError(null)
    applyCoupons(coupons.filter((coupon) => coupon.code !== code))
  }

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
          coupon_codes: coupons.map((coupon) => coupon.code),
          website: honeypot,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        // 이미 쓴 교환권은 목록에서 빼 두고, 남은 교환권으로 다시 누를 수 있게 한다
        if (Array.isArray(data.unusableCodes) && data.unusableCodes.length > 0) {
          const remaining = coupons.filter((coupon) => !data.unusableCodes.includes(coupon.code))
          applyCoupons(remaining)
          // 남은 교환권이 없으면 교환권 입력 화면으로 돌아가므로 거기에 이유를 보여 준다
          if (remaining.length === 0) {
            setCouponError(data.error || '쓸 수 없는 교환권이에요.')
            return
          }
        }
        throw new Error(data.error || '접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }

      saveDraftCodes([])
      setDone({ requestNumber: data.requestNumber || '', productName: data.productName || '' })
      setForm(INITIAL_FORM)
      setCoupons([])
    } catch (err) {
      console.error('Offline shipping submit failed:', err)
      setError(err instanceof Error ? err.message : '접수에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done !== null) {
    return (
      <Shell>
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

          {(done.requestNumber || done.productName) && (
            <div className="mt-6 space-y-3 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-4 py-4">
              {done.requestNumber && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-ink)]">
                    접수번호
                  </p>
                  <p className="mt-1.5 font-mono text-lg font-black tracking-wide text-[var(--ink)]">
                    {done.requestNumber}
                  </p>
                </div>
              )}
              {done.productName && (
                <p className="text-sm font-bold leading-relaxed text-[var(--ink)]">{done.productName}</p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setDone(null)
              setError(null)
              setCouponError(null)
              setCodeInput('')
              setAddOpen(false)
              setPhase('entry')
            }}
            className="mt-6 h-12 w-full rounded-[6px] border border-[var(--line)] bg-[var(--paper)] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
          >
            다른 분 추가 접수하기
          </button>
          <p className="mt-4 text-[11px] font-medium text-[var(--muted-ink)] lg:text-[13px]">
            문의는 매장 스태프에게 접수번호를 말씀해주세요.
          </p>
        </section>
      </Shell>
    )
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <div className="flex justify-center py-20" aria-label="교환권 확인 중">
          <Loader2 size={28} className="animate-spin text-[var(--muted-ink)]" />
        </div>
      </Shell>
    )
  }

  // 교환권 없이 들어온 경우 — QR을 찍거나 코드를 직접 넣어야 접수 화면이 열린다
  if (phase === 'entry') {
    return (
      <Shell>
        <section className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--soft)]">
            <Ticket size={20} className="text-[var(--ink)]" />
          </div>
          <h1 className="text-xl font-black leading-snug text-[var(--ink)] lg:text-2xl">
            택배 교환권이 필요해요
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-ink)] lg:text-base">
            매장에서 받은 교환권의 QR을 찍어주세요. QR이 열리지 않으면 교환권에 적힌 코드 {SHIP_COUPON_CODE_LENGTH}자리를 입력해주세요.
          </p>

          <form onSubmit={handleAddCoupon} className="mt-4 space-y-2.5">
            <label htmlFor="ship-coupon-code" className={LABEL_CLASS}>
              교환권 코드
            </label>
            <input
              id="ship-coupon-code"
              type="text"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(formatCodeInput(e.target.value))
                setCouponError(null)
              }}
              placeholder="ABCD-EFGH"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className={CODE_INPUT_CLASS}
            />

            {couponError && <ErrorNote message={couponError} />}

            <button
              type="submit"
              disabled={checking}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--ink)] py-3.5 text-base font-extrabold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {checking ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              교환권 확인
            </button>
          </form>
        </section>
      </Shell>
    )
  }

  return (
    <Shell>
      <section className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm">
        <h1 className="mb-3.5 text-xl font-black leading-snug text-[var(--ink)] lg:text-2xl">
          받으실 주소를 입력해주세요
        </h1>

        {/* 보내실 상품 — 교환권에 정해진 상품. 교환권이 여러 장이면 더해서 택배 한 건으로 */}
        <div className="mb-2.5">
          <p className={LABEL_CLASS}>
            <Package size={14} />
            보내실 상품
          </p>
          <ul className="divide-y divide-[var(--line)] rounded-[6px] border border-[var(--line)]">
            {coupons.map((coupon) => (
              <li key={coupon.code} className="flex items-center gap-2 py-1 pl-3 pr-1">
                <span className="min-w-0 flex-1 truncate text-base font-bold text-[var(--ink)]">
                  {coupon.productName}
                </span>
                <span className="shrink-0 font-mono text-xs font-medium tracking-wide text-[var(--muted-ink)]">
                  {formatShipCouponCode(coupon.code)}
                </span>
                <button
                  type="button"
                  onClick={() => removeCoupon(coupon.code)}
                  aria-label={`${coupon.productName} 교환권 빼기`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-[var(--muted-ink)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>

          {coupons.length < SHIP_COUPON_MAX_PER_REQUEST &&
            (addOpen ? (
              <div className="mt-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(formatCodeInput(e.target.value))
                      setCouponError(null)
                    }}
                    onKeyDown={(e) => {
                      // 바깥 접수 폼이 제출되지 않게 Enter 는 교환권 추가로
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleAddCoupon()
                      }
                    }}
                    placeholder="교환권 코드 ABCD-EFGH"
                    aria-label="추가할 교환권 코드"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    className={`${CODE_INPUT_CLASS} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddCoupon()}
                    disabled={checking}
                    className="flex shrink-0 items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] px-3 py-2.5 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--line-soft)] disabled:opacity-50 lg:text-base"
                  >
                    {checking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    추가
                  </button>
                </div>
                <p className="mt-1 text-[11px] font-medium text-[var(--muted-ink)] lg:text-[13px]">
                  다른 교환권의 QR을 찍어도 여기에 더해져요.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddOpen(true)
                  setCouponError(null)
                }}
                className="mt-1 flex items-center gap-1 py-1 text-sm font-bold text-[var(--muted-ink)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
              >
                <Plus size={14} />
                교환권이 더 있으면 추가
              </button>
            ))}

          {couponError && (
            <div className="mt-1.5">
              <ErrorNote message={couponError} />
            </div>
          )}
        </div>

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

          {error && <ErrorNote message={error} />}

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
    </Shell>
  )
}
