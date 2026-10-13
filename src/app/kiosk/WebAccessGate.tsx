'use client'

// 일반 웹브라우저로 /kiosk 를 열면 비밀번호를 묻는다(2026-10-13) — 매장 키오스크 앱(Electron 셸, window.kiosk)은 묻지 않고 바로 연다.
// 앱인지는 화면에서 본다: 인터넷이 끊긴 채 켜져도 앱이 잠기지 않는다. 브라우저는 서버에 물어(쿠키) 통과했으면 바로, 아니면 숫자판을 띄운다.
// 비밀번호는 서버에서만 확인한다(src/lib/kiosk/web-access.ts) — 이 파일에는 들어 있지 않다.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Delete, LockKeyhole } from 'lucide-react'
import './web-access.css'

const LENGTH = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const
const subscribeNever = () => () => {}
const isKioskApp = () => typeof window !== 'undefined' && window.kiosk?.isElectron === true

export function WebAccessGate({ children }: { children: ReactNode }) {
  const app = useSyncExternalStore(subscribeNever, isKioskApp, () => false)
  const [access, setAccess] = useState<'checking' | 'locked' | 'open'>('checking')
  useEffect(() => {
    if (isKioskApp()) return
    let alive = true
    fetch('/api/kiosk/access', { cache: 'no-store', signal: AbortSignal.timeout(10000) })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (alive) setAccess(data?.ok === true ? 'open' : 'locked') })
      // 서버에 묻지 못하면 잠근 채로 둔다 — 숫자판에서 다시 시도할 수 있다
      .catch(() => { if (alive) setAccess('locked') })
    return () => { alive = false }
  }, [])
  if (app || access === 'open') return <>{children}</>
  if (access === 'checking') return <div className="kwg-wait" aria-busy="true" />
  return <PasswordScreen onOpen={() => setAccess('open')} />
}

function PasswordScreen({ onOpen }: { onOpen: () => void }) {
  const [digits, setDigits] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  /** 틀릴 때마다 올린다 — 점 줄을 새로 그려 흔든다 */
  const [wrong, setWrong] = useState(0)
  const typed = useRef('')
  const busy = useRef(false)

  const submit = useCallback(async (password: string) => {
    if (busy.current) return
    busy.current = true
    setSending(true); setError('')
    let message = ''
    try {
      const response = await fetch('/api/kiosk/access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(12000),
      })
      if (response.ok) { onOpen(); return }
      message = response.status === 401 ? '비밀번호가 맞지 않아요.' : response.status === 429 ? '입력이 너무 많아요. 1분 뒤에 다시 시도해 주세요.' : '확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    } catch {
      message = '인터넷 연결을 확인한 뒤 다시 시도해 주세요.'
    }
    typed.current = ''; busy.current = false
    setDigits(''); setSending(false); setError(message); setWrong((count) => count + 1)
  }, [onOpen])

  const press = useCallback((key: string) => {
    if (busy.current) return
    const next = key === 'back' ? typed.current.slice(0, -1) : typed.current.length < LENGTH ? typed.current + key : typed.current
    if (next === typed.current) return
    typed.current = next
    setDigits(next); setError('')
    if (next.length === LENGTH) void submit(next)
  }, [submit])

  // 자판으로도 넣을 수 있게
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') press('back')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  return (
    <div className="kwg" role="dialog" aria-modal="true" aria-labelledby="kwg-title">
      <div className="kwg-card">
        <span className="kwg-icon" aria-hidden="true"><LockKeyhole size={30} strokeWidth={1.8} /></span>
        <p className="kwg-brand">AC&apos;SCENT KIOSK</p>
        <h1 id="kwg-title">비밀번호를 입력해 주세요</h1>
        <p className="kwg-sub">매장 키오스크 화면이에요.<br />웹브라우저에서는 비밀번호를 넣어야 볼 수 있어요.</p>
        <div key={wrong} className="kwg-dots" data-wrong={wrong > 0 && !digits ? '' : undefined} role="img" aria-label={`${LENGTH}자리 중 ${digits.length}자리 입력`}>
          {Array.from({ length: LENGTH }, (_, index) => <i key={index} data-on={index < digits.length ? '' : undefined} />)}
        </div>
        <p className="kwg-msg" role="status" aria-live="polite" data-error={error ? '' : undefined}>{sending ? '확인하는 중…' : error}</p>
        <div className="kwg-pad">
          {KEYS.map((key) => key === '' ? <span key="blank" aria-hidden="true" /> : (
            <button key={key} type="button" disabled={sending} aria-label={key === 'back' ? '지우기' : key} onClick={() => press(key)}>
              {key === 'back' ? <Delete size={26} strokeWidth={1.8} aria-hidden="true" /> : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
