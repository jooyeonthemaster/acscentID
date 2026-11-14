'use client'

// 펀그라운드 데모 「인쇄하기」 — 노트북 · 폰에서는 프린터가 없으니 인쇄물 미리보기 창을 띄우고, 같은 결과를 QR 로 휴대폰에 받게 한다.
// 설치 기기에서는 같은 단추가 4×6 포토 프린터 · 영수증 프린터로 바로 보낸다(브리지 연결은 설치 때).
// QR: 창을 처음 열 때 결과 그림을 우리 서버에 올린다(/api/kiosk/share — 키오스크 「휴대폰으로 받기」와 같은 저장소, 받기를 누른 결과만 24시간 보관,
// AI 호출 아님). 2026-11-14 사용자 결정: B안 결과도 QR 로 받는다. 받기 페이지는 /kiosk/get/<token>(머리 「FUN GROUND」).
// FgStage 안(1920×1080 좌표)에 그린다.

import { Download, Loader2, Printer, RotateCcw, Smartphone, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { uploadShare, type KxShare } from '@/app/kiosk/experience/kx-share'

export interface FgPrintable {
  /** 인쇄물 그림(data:image/jpeg|png) */
  image: string
  /** 받기 페이지 · 저장 파일에 보이는 이름(예: 「사주 결과지」) */
  label: string
  /** 저장 파일 이름(영문 소문자 · 숫자 · 하이픈) */
  fileName: string
  /** photo: 4×6 포토 프린터 · receipt: 영수증 프린터(80mm) */
  printer: 'photo' | 'receipt'
}

const toBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob()
const typeOf = (dataUrl: string) => (dataUrl.startsWith('data:image/png') ? 'image/png' as const : 'image/jpeg' as const)

/** 인쇄하기 단추 + 미리보기 · QR 창. 같은 그림이면 QR 을 다시 만들지 않는다 */
export function FgPrintButton({ printable, className = 'fg-btn fg-btn--primary', label = '인쇄하기', onOpen }: {
  printable: FgPrintable | null
  className?: string
  label?: string
  onOpen?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} disabled={!printable} onClick={() => { setOpen(true); onOpen?.() }}>
        <Printer size={40} strokeWidth={2.4} aria-hidden="true" />{label}
      </button>
      {open && printable && <FgResultSheet printable={printable} onClose={() => setOpen(false)} />}
    </>
  )
}

/** 그림마다 한 번만 올린다 — 창을 닫았다 열어도, 화면이 두 번 그려져도 같은 QR(실패하면 지워서 다시 할 수 있게) */
const shares = new Map<string, Promise<KxShare>>()
function shareOnce(printable: FgPrintable): Promise<KxShare> {
  let job = shares.get(printable.image)
  if (!job) {
    const type = typeOf(printable.image)
    job = toBlob(printable.image).then((blob) => uploadShare('funground', 'ko', [{
      name: `${printable.fileName}.${type === 'image/png' ? 'png' : 'jpg'}`, type, label: printable.label, blob,
    }]))
    job.catch(() => shares.delete(printable.image))
    shares.set(printable.image, job)
  }
  return job
}

export function FgResultSheet({ printable, onClose }: { printable: FgPrintable; onClose: () => void }) {
  const [share, setShare] = useState<KxShare | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    shareOnce(printable)
      .then((made) => { if (alive) { setShare(made); setError(null) } })
      .catch(() => { if (alive) setError('QR을 만들지 못했어요. 잠시 뒤 다시 해 주세요.') })
    return () => { alive = false }
  }, [printable, attempt])

  const retry = useCallback(() => { setError(null); setAttempt((n) => n + 1) }, [])
  const until = share ? new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(share.expiresAt) : ''

  return (
    <div className="fg-sheet" role="dialog" aria-modal="true" aria-label={`${printable.label} 인쇄 미리보기`} onClick={onClose}>
      <div className="fg-sheet-card" onClick={(e) => e.stopPropagation()}>
        <figure className="fg-sheet-preview" data-printer={printable.printer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={printable.image} alt={`${printable.label} 미리보기`} />
          <figcaption>{printable.printer === 'photo' ? '4×6 사진 미리보기' : '영수증 미리보기'}</figcaption>
        </figure>
        <div className="fg-sheet-side">
          <p className="fg-kicker">인쇄 미리보기</p>
          <h2 className="fg-sheet-title">{printable.label}</h2>
          <p className="fg-sheet-note">
            설치 기기에서는 이 단추를 누르면 {printable.printer === 'photo' ? '4×6 사진이 바로 인쇄돼요' : '영수증 프린터로 바로 나와요'}.
            지금은 미리보기로 보여 드려요.
          </p>
          <div className="fg-sheet-qr">
            <div className="fg-sheet-qr-code">
              {share ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={share.qr} alt="휴대폰으로 받는 QR" />
              ) : error ? (
                <button type="button" className="fg-sheet-retry" onClick={retry}><RotateCcw size={44} aria-hidden="true" />다시</button>
              ) : (
                <Loader2 className="fg-sheet-spin" size={64} aria-hidden="true" />
              )}
            </div>
            <div className="fg-sheet-qr-text">
              <b><Smartphone size={34} aria-hidden="true" />휴대폰으로 받기</b>
              {error ? <span role="alert">{error}</span> : share ? <span>휴대폰 카메라로 QR을 찍으면 저장할 수 있어요. {until}까지 받을 수 있어요.</span> : <span>QR을 만드는 중이에요…</span>}
            </div>
          </div>
          <div className="fg-sheet-actions">
            <a className="fg-btn fg-btn--ghost" href={printable.image} download={`${printable.fileName}.${typeOf(printable.image) === 'image/png' ? 'png' : 'jpg'}`}>
              <Download size={38} aria-hidden="true" />이 기기에 저장
            </a>
            <button type="button" className="fg-btn fg-btn--primary" onClick={onClose}><X size={38} aria-hidden="true" />닫기</button>
          </div>
          <p className="fg-sheet-fine">QR로 받은 결과는 24시간 뒤 지워져요.</p>
        </div>
      </div>
    </div>
  )
}
