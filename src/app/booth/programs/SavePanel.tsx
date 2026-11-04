'use client'

// 저장·완료 화면 오른쪽 — 휴대폰 QR(화면 표시 시간과 파일 보관 기간을 따로 안내) + 인쇄(사진만).
// QR 은 실제로 올린 결과의 주소다. 화면 시간이 지나면 흐리게 하고 [QR 다시 받기]로 파일을 확인해(없으면 다시 올려) 새로 보여 준다.
// 인쇄는 '요청을 보냈다'까지만 말한다(프린터가 실제로 뽑았는지는 부스가 알 수 없다). 한 번 보내면 버튼을 잠근다.

import { AlertTriangle, Clock, Loader2, Printer, QrCode, RotateCcw, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import { RESULT_PHOTO_TTL_HOURS } from '@/lib/photobooth/result-photo'
import { linkAlive, type SavedLink } from './save'
import { useCountdown } from './flow'
import { formatTime } from './ui'

/** 화면에 QR 을 보여 두는 시간 — 파일 보관(7일)과 다르다 */
export const QR_SCREEN_SECONDS = 120

export type PrintState = 'idle' | 'sending' | 'sent' | 'failed'

export function useSavedLink(make: () => Promise<SavedLink>, enabled: boolean) {
  const [link, setLink] = useState<SavedLink | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shownAt, setShownAt] = useState(0)
  const run = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const next = await make()
      setLink(next); setShownAt(Date.now())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }, [make])
  useEffect(() => { if (enabled && !link && !busy && !error) void run() }, [enabled, link, busy, error, run])
  /** QR 다시 받기 — 파일이 아직 있으면 같은 주소, 없으면 다시 올린다 */
  const reissue = useCallback(async () => {
    if (link && (await linkAlive(link))) { setShownAt(Date.now()); return }
    setLink(null)
    await run()
  }, [link, run])
  return { link, error, busy, shownAt, retry: run, reissue }
}

export function QrCard({ state, label = '휴대폰으로 저장', progress }: {
  state: ReturnType<typeof useSavedLink>
  label?: string
  /** 영상 올리기 진행(실제 보낸 바이트) */
  progress?: number | null
}) {
  const left = useCountdown(state.shownAt + QR_SCREEN_SECONDS * 1000, !!state.link)
  const expired = !!state.link && left <= 0
  return (
    <section className="pg-card pg-qr" aria-label={label}>
      <div className="pg-qr-code" data-expired={expired || undefined}>
        {state.link ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.link.qr} alt="휴대폰 저장 QR" width={260} height={260} />
        ) : state.error ? (
          <AlertTriangle size={48} aria-hidden="true" />
        ) : (
          <Loader2 className="pg-spin" size={48} aria-hidden="true" />
        )}
        {expired && <Clock className="pg-qr-clock" size={56} aria-hidden="true" />}
      </div>
      <div className="pg-qr-text">
        <b><Smartphone size={20} aria-hidden="true" />{label}</b>
        {state.error ? (
          <>
            <p className="pg-error-text" role="alert">{state.error}</p>
            <button type="button" className="pg-btn pg-btn--line" onClick={() => void state.retry()}><RotateCcw size={18} />다시 시도</button>
          </>
        ) : !state.link ? (
          <p aria-live="polite">{typeof progress === 'number' ? `올리는 중 ${Math.round(progress * 100)}%` : '저장할 주소를 만드는 중이에요…'}</p>
        ) : expired ? (
          <>
            <p>QR 표시 시간이 지났어요. 새 QR을 받아 저장해 주세요.</p>
            <button type="button" className="pg-btn pg-btn--accent" onClick={() => void state.reissue()} disabled={state.busy}><QrCode size={18} />QR 다시 받기</button>
          </>
        ) : (
          <>
            <p>휴대폰 카메라로 QR을 찍으면 바로 저장할 수 있어요.</p>
            <p className="pg-qr-time"><Clock size={16} aria-hidden="true" />화면 표시 {formatTime(left)} · 파일은 {RESULT_PHOTO_TTL_HOURS / 24}일 동안 받을 수 있어요</p>
          </>
        )}
      </div>
    </section>
  )
}

/** 인쇄 — 부스 앱이면 프린터로 바로, 브라우저면 인쇄 창(미리보기) */
export function usePrint(image: string | null, onPrinted: () => void) {
  const [state, setState] = useState<PrintState>('idle')
  const [error, setError] = useState<string | null>(null)
  const print = useCallback(async () => {
    if (!image || state === 'sending' || state === 'sent') return
    setState('sending'); setError(null)
    onPrinted()
    const shell = getBoothShell()
    if (!shell) {
      // 브라우저(데모 등) — 인쇄 창을 연다. 창을 닫으면 끝(실제로 뽑았는지는 모른다)
      window.setTimeout(() => { window.print(); setState('sent') }, 50)
      return
    }
    try {
      const result = await shell.print(image)
      if (result.ok) setState('sent')
      else { setState('failed'); setError(result.error || '프린터가 응답하지 않아요.') }
    } catch (cause) {
      setState('failed'); setError(cause instanceof Error ? cause.message : '프린터가 응답하지 않아요.')
    }
  }, [image, state, onPrinted])
  return { state, error, print, browser: !getBoothShell() }
}

export function PrintCard({ printer, label = '사진 1장 인쇄' }: { printer: ReturnType<typeof usePrint>; label?: string }) {
  const { state, error, print, browser } = printer
  return (
    <section className="pg-card pg-print" aria-label={label}>
      <Printer size={44} aria-hidden="true" />
      <b>{label}</b>
      {state === 'failed' ? (
        <>
          <p className="pg-error-text" role="alert">지금은 인쇄할 수 없어요. QR로 저장해 주세요.{error ? ` (${error})` : ''}</p>
          <p className="pg-muted">직원에게 프린터 확인을 요청해 주세요.</p>
        </>
      ) : state === 'sent' ? (
        <p role="status">{browser ? '인쇄 창을 열었어요. 부스에서는 프린터로 바로 보내요.' : '프린터로 보냈어요. 1분쯤 뒤 출구에서 나와요.'}</p>
      ) : (
        <p>4×6 사진 한 장 · 화면과 같은 디자인</p>
      )}
      <button type="button" className="pg-btn pg-btn--line" onClick={() => void print()} disabled={state === 'sending' || state === 'sent' || state === 'failed'}>
        {state === 'sending' ? <><Loader2 className="pg-spin" size={18} />보내는 중…</> : state === 'sent' ? '인쇄 요청 보냄' : '인쇄하기'}
      </button>
    </section>
  )
}
