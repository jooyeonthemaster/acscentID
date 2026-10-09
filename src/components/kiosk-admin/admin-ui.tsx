'use client'

// 키오스크 현장 관리자 창의 공용 부품 — 알림 띠, 돌아가는 표시, 창 안 모달, Escape·포커스 순서.
// 관리자 창은 고객 화면의 테마(기존·레트로·맥·컬러·타로)와 상관없이 늘 같은 모양이다(kiosk-admin.css).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

// ───────────────────────── 서버 호출 ─────────────────────────

/** 관리자 인증(10분)이 끝났다 — 다시 비밀번호를 받아야 한다 */
export class AdminAuthError extends Error {}

/** useScreenBackgrounds 의 저장 오류(상태가 실려 온다)와 아래 adminCall 의 오류를 같이 본다 */
export function errorStatus(error: unknown): number | null {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : null
}
export const isAuthError = (error: unknown) => error instanceof AdminAuthError || errorStatus(error) === 403
export const errorText = (error: unknown, fallback: string) => {
  // fetch 자체가 실패하면 브라우저 원문('Failed to fetch')이 온다 — 안내 문구로 바꾼다
  if (error instanceof TypeError || (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError'))) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
  return error instanceof Error && error.message ? error.message : fallback
}

/** 기기 관리자 API(/api/screen-backgrounds/…) — PIN 세션 쿠키로 인증된다 */
export async function adminCall<T>(path: string, method = 'GET', body?: unknown, timeoutMs = 15000): Promise<T> {
  const response = await fetch(path, {
    method, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const result = await response.json().catch(() => null)
  if (response.status === 403) throw new AdminAuthError('관리자 인증 시간이 지났어요.')
  if (!response.ok) throw Object.assign(new Error(result?.error || '서버에 연결하지 못했어요.'), { status: response.status })
  return result as T
}

// ───────────────────────── Escape · 포커스 순서 ─────────────────────────

interface Layer { close: (() => void) | null }
const LayerContext = createContext<{ push: (layer: Layer) => () => void } | null>(null)

/**
 * 열려 있는 창의 순서 — Escape 는 맨 위 창부터 닫는다. close 가 null 인 창(생성 중처럼 닫을 수 없는 상태)은 Escape 를 삼킨다.
 * 관리자 창 뿌리에서 한 번 쓰고(useAdminLayerRoot), 하위 창은 useAdminLayer 로 자기를 올린다.
 */
export function useAdminLayerRoot(active: boolean, closeBase: () => void) {
  const stack = useRef<Layer[]>([])
  const base = useRef(closeBase)
  useEffect(() => { base.current = closeBase }, [closeBase])
  /** 맨 위 창 하나를 닫는다 — Escape 와 창 밖(어두운 바탕) 누르기가 같이 쓴다. 닫을 수 없는 창이 떠 있으면 아무 일도 없다 */
  const dismiss = useCallback(() => {
    const top = stack.current[stack.current.length - 1]
    if (top) top.close?.()
    else base.current()
  }, [])
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    }
    // 캡처 단계 — 화면 쪽의 다른 Escape 처리보다 먼저 받는다
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active, dismiss])
  return useMemo(() => ({
    push: (layer: Layer) => {
      stack.current.push(layer)
      return () => { stack.current = stack.current.filter((item) => item !== layer) }
    },
    dismiss,
  }), [dismiss])
}
export const AdminLayerProvider = LayerContext.Provider

export function useAdminLayer(close: (() => void) | null) {
  const context = useContext(LayerContext)
  const latest = useRef(close)
  useEffect(() => { latest.current = close }, [close])
  const locked = close === null
  useEffect(() => {
    if (!context) return
    return context.push({ close: locked ? null : () => latest.current?.() })
  }, [context, locked])
}

/** 창은 아니지만 Escape 로 한 단계 돌아가야 하는 화면(행사 상세 → 목록)이 자기를 순서에 올린다 */
export function AdminEscape({ onClose }: { onClose: () => void }) {
  useAdminLayer(onClose)
  return null
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 창이 열리면 그 안으로 포커스를 옮기고 Tab 이 밖으로 나가지 않게 한다. 닫히면 열기 전 자리로 돌려준다 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, resetKey?: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!active) return
    const previous = document.activeElement as HTMLElement | null
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [active])
  useEffect(() => {
    const node = ref.current
    if (!active || !node) return
    const first = node.querySelector<HTMLElement>('[data-autofocus]') ?? node.querySelector<HTMLElement>(FOCUSABLE) ?? node
    first.focus({ preventScroll: true })
  }, [active, resetKey])
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !ref.current) return
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0], last = items[items.length - 1]
    if (event.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }, [])
  return { ref, onKeyDown }
}

// ───────────────────────── 작은 부품 ─────────────────────────

export function Spinner({ size = 22 }: { size?: number }) {
  return <span className="kadm-spin" style={{ width: size, height: size }} aria-hidden="true" />
}

export type NoticeTone = 'info' | 'ok' | 'warn' | 'error' | 'busy'

/** 안내 띠 — 저장 중 · 완료 · 주의 · 실패. action 은 다시 시도 같은 한 가지 행동 */
export function Notice({ tone = 'info', title, children, action, compact }: {
  tone?: NoticeTone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : tone === 'error' ? AlertCircle : Info
  return (
    <div className="kadm-notice" data-tone={tone} data-compact={compact || undefined} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'busy' ? <Spinner size={compact ? 20 : 26} /> : <Icon size={compact ? 22 : 28} strokeWidth={1.8} aria-hidden="true" />}
      <div className="kadm-notice-text">
        {title && <b>{title}</b>}
        {children && <span>{children}</span>}
      </div>
      {action}
    </div>
  )
}

/** 관리자 창 안에 뜨는 창(글꼴 고르기 · 생성 확인 · 종료 확인). onClose 가 없으면 닫을 수 없는 상태다(생성 중) */
export function AdminModal({ label, onClose, children, wide, className }: {
  label: string
  onClose: (() => void) | null
  children: ReactNode
  /** 글꼴 목록처럼 창을 거의 채우는 창 */
  wide?: boolean
  className?: string
}) {
  useAdminLayer(onClose)
  const { ref, onKeyDown } = useFocusTrap<HTMLDivElement>(true)
  return (
    <div className="kadm-modal-scrim" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
      <div ref={ref} className={`kadm-modal${wide ? ' kadm-modal--wide' : ''}${className ? ` ${className}` : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onKeyDown={onKeyDown}>
        {children}
      </div>
    </div>
  )
}
