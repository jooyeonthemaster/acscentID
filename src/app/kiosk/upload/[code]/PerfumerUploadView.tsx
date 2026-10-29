'use client'

// SCENT! AI 조향사 키오스크의 QR 로 들어온 휴대폰 화면(목업 08) — 상태·업로드는 KioskUploadClient 가 그대로 들고 여기는 그리기만 한다.
// 세션 코드·언어·업로드 규약(/api/photobooth/session · /api/photobooth/upload)은 다른 모드와 같다.

import { useState } from 'react'
import { ArrowRight, Check, Hourglass, ImageOff, ImagePlus, LoaderCircle, Lock, RefreshCw } from 'lucide-react'
import { KIOSK_LANGS, isCjkLang, isKioskLang, kioskText, type KioskLang } from '@/lib/kiosk/i18n'
import { perfumerText } from '@/lib/kiosk/perfumer-i18n'
import { PERFUMER_ART } from '@/lib/kiosk/perfumer-art'
import './upload-perfumer.css'

type Status = 'checking' | 'ready' | 'preparing' | 'confirm' | 'invalid' | 'uploading' | 'done' | 'error'

function Lines({ text }: { text: string }) {
  const parts = text.split('\n')
  return <>{parts.map((part, i) => <span key={i}>{part}{i < parts.length - 1 && <br />}</span>)}</>
}

/** 사진 → … → 키오스크 그림(전송 중·완료) */
function SendVisual({ preview, sending }: { preview: string | null; sending: boolean }) {
  return (
    <div className="pfm-send" data-sending={sending || undefined} aria-hidden="true">
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pfm-send-photo" src={preview} alt="" />
      )}
      <span className="pfm-send-dots"><i /><i /><i /></span>
      <div className="pfm-kiosk">
        <div className="pfm-kiosk-screen">
          <span className="pfm-kiosk-mark">SCENT<em>!</em></span>
          <span className="pfm-kiosk-sub">AI PERFUMER</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PERFUMER_ART.hero} alt="" />
        </div>
        <i className="pfm-kiosk-slot" />
      </div>
    </div>
  )
}

export function PerfumerUploadView({ lang: initialLang, status, errorMessage, preview, fileInputRef, onFile, onConfirm }: {
  lang: KioskLang
  status: Status
  errorMessage: string
  preview: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFile: (file: File) => void
  onConfirm: () => void
}) {
  // 키오스크가 넘긴 언어로 열리고, 손님이 폰에서 바꿀 수도 있다
  const [lang, setLang] = useState<KioskLang>(initialLang)
  const p = perfumerText(lang)
  const t = kioskText(lang).upload
  const pick = () => fileInputRef.current?.click()
  const connected = status !== 'invalid' && status !== 'checking'
  const uploadFailed = status === 'confirm' && Boolean(errorMessage)

  return (
    <div className="pfm-root" lang={KIOSK_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'} data-cjk={isCjkLang(lang) || undefined} data-status={status}>
      <header className="pfm-top">
        <div className="pfm-brand">
          <span className="pfm-wordmark">SCENT<em>!</em></span>
          <span>{p.brandSub}</span>
        </div>
        <div className="pfm-tools">
          <label className="pfm-lang">
            <span className="pfm-sr">{kioskText(lang).langMenuLabel}</span>
            <select value={lang} onChange={(e) => { if (isKioskLang(e.target.value)) setLang(e.target.value) }}>
              {KIOSK_LANGS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <span className="pfm-pill" data-on={connected || undefined}><i />{connected ? p.mConnected : p.mDisconnected}</span>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />

      {status === 'ready' && (
        <main className="pfm-main">
          <h1 className="pfm-title"><Lines text={p.mTitle} /></h1>
          <p className="pfm-desc">{p.mDesc}</p>
          <button type="button" className="pfm-drop" onClick={pick} aria-label={t.pickFromGallery}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pfm-drop-orb" src={PERFUMER_ART.orb} alt="" aria-hidden="true" />
            <span className="pfm-drop-icon" aria-hidden="true"><ImagePlus size={72} strokeWidth={1.2} /></span>
          </button>
          <ul className="pfm-tips">
            {p.mTips.map((tip) => <li key={tip}><span aria-hidden="true"><Check size={16} strokeWidth={3} /></span>{tip}</li>)}
          </ul>
          <p className="pfm-privacy"><Lock size={16} strokeWidth={1.8} aria-hidden="true" />{p.mPrivacy}</p>
          <div className="pfm-spacer" />
          <button type="button" className="pfm-btn" data-variant="primary" onClick={pick}>
            <span>{t.pickFromGallery}</span><ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </main>
      )}

      {status === 'confirm' && (
        <main className="pfm-main">
          <h1 className="pfm-title pfm-title--center">{t.confirmTitle}</h1>
          <p className="pfm-desc pfm-desc--center">{t.confirmDesc}</p>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pfm-photo" src={preview} alt={t.selectedAlt} />
          )}
          {uploadFailed && (
            <div className="pfm-alert" role="alert">
              <RefreshCw size={22} strokeWidth={1.8} aria-hidden="true" />
              <p><b>{p.mFailTitle}</b><span>{p.mFailDesc}</span></p>
            </div>
          )}
          <div className="pfm-spacer" />
          <div className="pfm-row">
            <button type="button" className="pfm-btn" onClick={pick}>{t.pickAnother}</button>
            <button type="button" className="pfm-btn" data-variant="primary" onClick={onConfirm}>
              <span>{uploadFailed ? t.reupload : t.confirm}</span><ArrowRight size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </main>
      )}

      {(status === 'uploading' || status === 'done') && (
        <main className="pfm-main pfm-main--center">
          {status === 'done' && <span className="pfm-done" aria-hidden="true"><Check size={56} strokeWidth={2.4} /></span>}
          <h1 className="pfm-title pfm-title--center"><Lines text={status === 'done' ? p.mDoneTitle : p.mSendingTitle} /></h1>
          {status === 'uploading' && <p className="pfm-desc pfm-desc--center">{t.pleaseWait}</p>}
          <SendVisual preview={preview} sending={status === 'uploading'} />
          {status === 'done' ? (
            <>
              <p className="pfm-strong">{t.checkKiosk}</p>
              <p className="pfm-desc pfm-desc--center pfm-muted">{t.canClose}</p>
              {/* 같은 QR 로는 한 번만 보낼 수 있다(세션 소진) — 바꾸려면 키오스크에서 새 QR 을 만든다 */}
              <p className="pfm-note">{p.mDoneNote}</p>
            </>
          ) : (
            <>
              <div className="pfm-spacer" />
              <button type="button" className="pfm-btn" data-variant="primary" disabled>
                <LoaderCircle className="pfm-spin" size={22} strokeWidth={2} aria-hidden="true" /><span>{p.mSendingBtn}</span>
              </button>
            </>
          )}
        </main>
      )}

      {(status === 'checking' || status === 'preparing' || status === 'invalid' || status === 'error') && (
        <main className="pfm-main pfm-main--center">
          <div className="pfm-state" role={status === 'invalid' || status === 'error' ? 'alert' : 'status'}>
            {(status === 'checking' || status === 'preparing') && <LoaderCircle className="pfm-spin" size={48} strokeWidth={1.6} aria-hidden="true" />}
            {status === 'invalid' && <Hourglass size={48} strokeWidth={1.4} aria-hidden="true" />}
            {status === 'error' && <ImageOff size={48} strokeWidth={1.4} aria-hidden="true" />}
            <h1>
              {status === 'checking' ? t.connecting
                : status === 'preparing' ? t.loadingPhoto
                  : status === 'invalid' ? t.cannotConnect : p.mPhotoErrorTitle}
            </h1>
            {status === 'invalid' && <p>{errorMessage || t.expired}</p>}
            {status === 'error' && <p>{p.mPhotoErrorDesc}</p>}
            {status === 'error' && (
              <button type="button" className="pfm-btn" data-variant="primary" onClick={pick}>{t.reselect}</button>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
