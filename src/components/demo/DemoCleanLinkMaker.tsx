'use client'

// 데모 랜딩(/kiosk-demo · /booth-demo) 바닥글의 '관리자 · 워터마크 없는 링크' — 매장 관리자 비밀번호(6자리)와 기간(7 · 30 · 90일)을 넣으면
// 서명이 붙은 워터마크 없는 랜딩 주소 두 개(포토부스 · 키오스크)를 만들어 복사하게 한다. 링크를 받은 사람은 기간 동안 워터마크 없이 본다.
// 설명: src/lib/demo-clean.ts

import { useState, type FormEvent } from 'react'
import { DEMO_CLEAN_DAYS, DEMO_CLEAN_KEY_PARAM, type DemoCleanDays } from '@/lib/demo-clean'
import './demo-clean-link.css'

type Made = { key: string; expiresAt: number }

export function DemoCleanLinkMaker() {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [days, setDays] = useState<DemoCleanDays>(30)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [made, setMade] = useState<Made | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const close = () => { setOpen(false); setPin(''); setError(null); setMade(null); setCopied(null) }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || pin.length !== 6) return
    setBusy(true); setError(null)
    try {
      const response = await fetch('/api/demo/clean', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, days }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.key !== 'string') throw new Error(data.error || '링크를 만들지 못했습니다.')
      setMade({ key: data.key, expiresAt: data.expiresAt })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '링크를 만들지 못했습니다.')
      setPin('')
    } finally {
      setBusy(false)
    }
  }
  const link = (path: string) => `${window.location.origin}${path}?${DEMO_CLEAN_KEY_PARAM}=${made?.key}`
  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label) } catch { setCopied(null) }
  }
  const until = made ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(made.expiresAt) : ''

  return (
    <>
      <button type="button" className="dcl-link" onClick={() => setOpen(true)}>관리자 · 워터마크 없는 링크</button>
      {open && (
        <div className="dcl-backdrop" role="presentation" onClick={close}>
          <div className="dcl-card" role="dialog" aria-modal="true" aria-labelledby="dcl-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="dcl-title">워터마크 없는 데모 링크</h2>
            {!made ? (
              <form onSubmit={submit}>
                <p>관리자 비밀번호 6자리를 넣으면 기간이 정해진 링크를 만들어요. 링크를 받은 사람은 그 기간 동안 워터마크 없이 데모를 봐요.</p>
                <div className="dcl-days" role="radiogroup" aria-label="링크 기간">
                  {DEMO_CLEAN_DAYS.map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)}>{d}일</button>
                  ))}
                </div>
                <input
                  type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={6} pattern="\d{6}"
                  aria-label="관리자 비밀번호 6자리" placeholder="••••••" value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
                />
                {error && <p className="dcl-error" role="alert">{error}</p>}
                <div className="dcl-actions">
                  <button type="button" onClick={close}>취소</button>
                  <button type="submit" disabled={busy || pin.length !== 6}>{busy ? '만드는 중…' : '링크 만들기'}</button>
                </div>
              </form>
            ) : (
              <>
                <p><b>{until}</b>까지 쓸 수 있어요. 그 뒤에는 같은 링크로 열어도 워터마크가 보여요.</p>
                {[['포토부스 데모', '/booth-demo/clean'], ['키오스크 데모', '/kiosk-demo/clean']].map(([label, path]) => (
                  <div key={path} className="dcl-out">
                    <span>{label}</span>
                    <input readOnly value={link(path)} onFocus={(e) => e.currentTarget.select()} aria-label={`${label} 링크`} />
                    <button type="button" onClick={() => void copy(label, link(path))}>{copied === label ? '복사됨' : '복사'}</button>
                  </div>
                ))}
                <div className="dcl-actions">
                  <button type="submit" onClick={close}>닫기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
