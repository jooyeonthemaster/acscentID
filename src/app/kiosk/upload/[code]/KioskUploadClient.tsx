'use client'

/**
 * 키오스크 QR 사진 업로드 (고객 폰 전용 화면)
 * 키오스크 화면의 QR → /kiosk/upload/[code] → 갤러리에서 사진 선택 → 미리보기 확정 → 업로드
 * 사진을 고르는 즉시 보내지 않는다 — 잘못 고른 사진이 키오스크 큰 화면에 바로 뜨는 것을 막기 위해
 * 손님이 '이 사진으로 확정하기'를 눌러야 전송된다.
 * 업로드되면 키오스크가 폴링으로 받아 분석 단계로 자동 진행한다.
 * 세션·업로드 API는 포토부스와 공유한다(photobooth_sessions).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowRight, Check, Hourglass, ImageOff, ImagePlus, LoaderCircle, Lock, RefreshCw, Ban, SunMedium, UserRound } from 'lucide-react'
import { compressImage } from '@/lib/image/compressor'
import { kioskText, isKioskLang, isCjkLang, type KioskLang } from '@/lib/kiosk/i18n'
import { programUiText } from '@/lib/kiosk/program-ui-i18n'
import './upload-color.css'

type Status =
  | 'checking'
  | 'ready'
  | 'preparing' // 고른 사진을 압축하는 중
  | 'confirm' // 미리보기 — 손님이 확정해야 업로드된다
  | 'invalid'
  | 'uploading'
  | 'done'
  | 'error'

export function KioskUploadClient({ code, lang: langProp, program }: { code: string; lang?: string; program?: 'color' }) {
  // 키오스크가 QR 주소에 ?lang= 을 실어 보낸다 — 손님 폰도 같은 언어로 열린다
  const lang: KioskLang = isKioskLang(langProp) ? langProp : 'ko'
  const t = kioskText(lang).upload
  const [status, setStatus] = useState<Status>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!/^PB-[A-Z2-9]{6}$/.test(code)) {
      setStatus('invalid')
      setErrorMessage(t.invalidUrl)
      return
    }
    let cancelled = false
    fetch(`/api/photobooth/session?code=${code}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok) {
          setStatus('invalid')
          setErrorMessage(data.error || t.sessionCheckFailed)
        } else if (data.status === 'expired') {
          setStatus('invalid')
          setErrorMessage(t.expired)
        } else if (data.status === 'uploaded') {
          setStatus('done')
        } else {
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('invalid')
          setErrorMessage(t.networkError)
        }
      })
    return () => {
      cancelled = true
    }
  }, [code, t])

  // 고른 사진은 압축해서 미리보기로만 띄운다 — 전송은 confirmUpload에서
  const handleFile = useCallback(async (file: File) => {
    setStatus('preparing')
    setErrorMessage('')
    try {
      // 분석용이라 인화 품질까지는 필요 없다 — 긴 변 1280px
      const base64 = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.85 })
      setPreview(base64)
      setStatus('confirm')
    } catch (error) {
      console.error('키오스크 사진 처리 실패:', error)
      setPreview(null)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : t.photoLoadFailed)
    }
  }, [t])

  const confirmUpload = useCallback(async () => {
    if (!preview) return
    setStatus('uploading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/photobooth/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, imageBase64: preview }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t.uploadFailed)
      setStatus('done')
    } catch (error) {
      console.error('키오스크 업로드 실패:', error)
      // 사진은 그대로 두고 확정 화면으로 되돌린다 — 같은 사진으로 바로 재시도할 수 있게
      setStatus('confirm')
      setErrorMessage(error instanceof Error ? error.message : t.uploadFailed)
    }
  }, [code, preview, t])

  // 퍼스널 컬러 키오스크에서 온 손님 — Chromatic Archive 화면(목업 M01–M04). 다른 프로그램(최애 분석)은 예전 화면
  if (program === 'color') {
    return (
      <ColorUploadView
        code={code}
        lang={lang}
        status={status}
        errorMessage={errorMessage}
        preview={preview}
        fileInputRef={fileInputRef}
        onFile={handleFile}
        onConfirm={confirmUpload}
      />
    )
  }

  return (
    <div className="kup-root" lang={lang} data-cjk={isCjkLang(lang)}>
      <header className="kup-top">
        <span className="kup-brand">AC&rsquo;SCENT</span>
        <span className="kup-code">{code}</span>
      </header>

      {/* 선택 화면과 확정 화면 양쪽에서 쓰므로 항상 렌더한다 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {status === 'checking' && <p className="kup-msg">{t.connecting}</p>}

      {status === 'invalid' && (
        <div className="kup-block">
          <h1 className="kup-title">{t.cannotConnect}</h1>
          <p className="kup-desc">{errorMessage}</p>
        </div>
      )}

      {status === 'preparing' && <p className="kup-msg">{t.loadingPhoto}</p>}

      {(status === 'ready' || status === 'error') && (
        <div className="kup-block">
          <h1 className="kup-title">{t.title}</h1>
          <p className="kup-desc">
            {t.desc1}
            <br />
            {t.desc2}
          </p>
          {status === 'error' && <p className="kup-error">{errorMessage}</p>}
          <button className="kup-btn" onClick={() => fileInputRef.current?.click()}>
            {status === 'error' ? t.reselect : t.pickFromGallery}
          </button>
        </div>
      )}

      {status === 'confirm' && (
        <div className="kup-block">
          <h1 className="kup-title">{t.confirmTitle}</h1>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kup-preview" src={preview} alt={t.selectedAlt} />
          )}
          {errorMessage && <p className="kup-error">{errorMessage}</p>}
          <p className="kup-desc">{t.confirmDesc}</p>
          <button className="kup-btn" onClick={confirmUpload}>
            {errorMessage ? t.reupload : t.confirm}
          </button>
          <button className="kup-btn kup-btn-ghost" onClick={() => fileInputRef.current?.click()}>
            {t.pickAnother}
          </button>
        </div>
      )}

      {status === 'uploading' && (
        <div className="kup-block">
          <h1 className="kup-title">{t.uploading}</h1>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kup-preview" src={preview} alt={t.uploadingAlt} />
          )}
          <p className="kup-desc">{t.pleaseWait}</p>
        </div>
      )}

      {status === 'done' && (
        <div className="kup-block">
          <h1 className="kup-title">{t.done}</h1>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kup-preview" src={preview} alt={t.doneAlt} />
          )}
          <p className="kup-desc">
            {t.checkKiosk}
            <br />
            {t.canClose}
          </p>
        </div>
      )}
    </div>
  )
}

const TIP_ICONS = [UserRound, SunMedium, Ban]

/** 퍼스널 컬러 업로드 — 상태는 위 KioskUploadClient 가 그대로 들고, 여기는 그리기만 한다 */
function ColorUploadView({ code, lang, status, errorMessage, preview, fileInputRef, onFile, onConfirm }: {
  code: string
  lang: KioskLang
  status: Status
  errorMessage: string
  preview: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFile: (file: File) => void
  onConfirm: () => void
}) {
  const m = programUiText(lang).mobile
  const t = kioskText(lang).upload
  const pick = () => fileInputRef.current?.click()
  const stepIndex = status === 'done' ? 2 : status === 'confirm' || status === 'uploading' ? 1 : 0
  const showSteps = status === 'confirm' || status === 'uploading' || status === 'done'
  const uploadFailed = status === 'confirm' && Boolean(errorMessage)

  return (
    <div className="kupc-root" lang={lang} data-cjk={isCjkLang(lang)} data-status={status}>
      <header className="kupc-top">
        <span>AC&rsquo;SCENT AI COLOR</span>
        <span className="kupc-code">{code}</span>
      </header>
      {showSteps && (
        <ol className="kupc-steps">
          {m.steps.map((label, i) => (
            <li key={label} data-state={i < stepIndex || status === 'done' ? 'done' : i === stepIndex ? 'now' : 'todo'}>
              <span aria-hidden="true">{i < stepIndex || status === 'done' ? <Check size={14} strokeWidth={2.6} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}

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
        <main className="kupc-main">
          <h1 className="kupc-title">{m.title}</h1>
          <p className="kupc-desc">{m.desc[0]}<br />{m.desc[1]}</p>
          <button type="button" className="kupc-drop" onClick={pick}>
            <span className="kupc-drop-deco" aria-hidden="true"><i /><i /></span>
            <ImagePlus size={84} strokeWidth={1.1} aria-hidden="true" />
            <span>{m.dropHint[0]}<br />{m.dropHint[1]}</span>
            <em>{m.formats}</em>
          </button>
          <ul className="kupc-tips">
            {m.tips.map((tip, i) => {
              const Icon = TIP_ICONS[i]
              return <li key={tip.title}><Icon size={30} strokeWidth={1.3} aria-hidden="true" /><b>{tip.title}</b><span>{tip.desc}</span></li>
            })}
          </ul>
          <div className="kupc-spacer" />
          <button type="button" className="kupc-btn" onClick={pick}><span>{m.pick}</span><ArrowRight size={22} strokeWidth={2} aria-hidden="true" /></button>
          <p className="kupc-note"><Lock size={16} strokeWidth={1.6} aria-hidden="true" />{m.privacy}</p>
        </main>
      )}

      {status === 'confirm' && (
        <main className="kupc-main">
          <h1 className="kupc-title">{m.confirmTitle}</h1>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kupc-photo" src={preview} alt={t.selectedAlt} />
          )}
          {uploadFailed ? (
            <div className="kupc-alert" role="alert">
              <RefreshCw size={26} strokeWidth={1.6} aria-hidden="true" />
              <p><b>{m.uploadErrorTitle}</b><span>{m.uploadErrorDesc}</span></p>
            </div>
          ) : (
            <p className="kupc-desc kupc-desc--center">{m.confirmDesc}</p>
          )}
          <div className="kupc-spacer" />
          <button type="button" className="kupc-btn" onClick={onConfirm}>{uploadFailed ? m.reupload : m.confirm}</button>
          <button type="button" className="kupc-btn kupc-btn--ghost" onClick={pick}>{m.pickAnother}</button>
        </main>
      )}

      {status === 'done' && (
        <main className="kupc-main kupc-main--center">
          <span className="kupc-done" aria-hidden="true"><Check size={46} strokeWidth={1.8} /></span>
          <h1 className="kupc-title kupc-title--center">{m.doneTitle}</h1>
          <p className="kupc-desc kupc-desc--center">{m.doneDesc[0]}<br />{m.doneDesc[1]}</p>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kupc-photo kupc-photo--small" src={preview} alt={t.doneAlt} />
          )}
        </main>
      )}

      {(status === 'checking' || status === 'preparing' || status === 'uploading' || status === 'invalid' || status === 'error') && (
        <main className="kupc-main kupc-main--center">
          <div className="kupc-state" role={status === 'invalid' || status === 'error' ? 'alert' : 'status'}>
            {status === 'checking' && <LoaderCircle className="kupc-spin" size={52} strokeWidth={1.4} aria-hidden="true" />}
            {status === 'uploading' && <LoaderCircle className="kupc-spin" size={52} strokeWidth={1.4} aria-hidden="true" />}
            {status === 'preparing' && <span className="kupc-prep" aria-hidden="true"><ImagePlus size={52} strokeWidth={1.2} /><i /></span>}
            {status === 'invalid' && <Hourglass size={52} strokeWidth={1.2} aria-hidden="true" />}
            {status === 'error' && <ImageOff size={52} strokeWidth={1.2} aria-hidden="true" />}
            <h1>
              {status === 'checking' ? m.connecting
                : status === 'preparing' ? m.preparing
                  : status === 'uploading' ? m.sending
                    : status === 'invalid' ? m.expiredTitle : m.photoErrorTitle}
            </h1>
            <p>
              {status === 'uploading' ? m.sendingDesc
                : status === 'invalid' ? (errorMessage === t.expired ? m.expiredDesc : errorMessage || m.expiredDesc)
                  : status === 'error' ? m.photoErrorDesc : m.wait}
            </p>
            {status === 'error' && <button type="button" className="kupc-btn kupc-btn--small" onClick={pick}>{m.reselect}</button>}
          </div>
        </main>
      )}

      <footer className="kupc-foot"><span>{m.footer}</span></footer>
    </div>
  )
}
