'use client'

// 데모 랜딩(/kiosk-demo · /booth-demo) 바닥글의 '워터마크 끄기' — 매장 관리자 비밀번호(6자리)를 넣으면
// 이 브라우저에서 연 데모 화면(키오스크·포토부스)의 NEANDER 워터마크를 걷는다. 다시 켜기도 여기서.

import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { relockWatermark, subscribeWatermark, unlockWatermark, watermarkUnlocked } from '@/lib/demo-watermark'
import './demo-watermark-unlock.css'

export function DemoWatermarkUnlock() {
  const off = useSyncExternalStore(subscribeWatermark, watermarkUnlocked, () => false)
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = () => { setOpen(false); setPin(''); setError(null) }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || pin.length !== 6) return
    setBusy(true)
    const result = await unlockWatermark(pin)
    setBusy(false)
    if (result.ok) close()
    else { setError(result.error); setPin('') }
  }

  return (
    <>
      <button type="button" className="dwu-link" onClick={() => (off ? relockWatermark() : setOpen(true))}>
        {off ? '워터마크 다시 켜기' : '관리자 · 워터마크 끄기'}
      </button>
      {open && (
        <div className="dwu-backdrop" role="presentation" onClick={close}>
          <form className="dwu-card" role="dialog" aria-modal="true" aria-labelledby="dwu-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2 id="dwu-title">워터마크 끄기</h2>
            <p>관리자 비밀번호 6자리를 넣으면 이 브라우저에서 여는 데모 화면에 NEANDER 워터마크가 보이지 않아요.</p>
            <input
              type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={6} pattern="\d{6}"
              aria-label="관리자 비밀번호 6자리" placeholder="••••••" value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null) }}
            />
            {error && <p className="dwu-error" role="alert">{error}</p>}
            <div className="dwu-actions">
              <button type="button" onClick={close}>취소</button>
              <button type="submit" disabled={busy || pin.length !== 6}>{busy ? '확인 중…' : '확인'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
