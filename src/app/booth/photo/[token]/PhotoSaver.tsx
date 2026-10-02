'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Check, Loader2 } from 'lucide-react'
import { RESULT_PHOTO_TTL_HOURS } from '@/lib/photobooth/result-photo'
import { BOOTH_LANGS, boothText, type BoothLang } from '@/lib/booth/i18n'

interface Props {
  imageUrl: string
  downloadUrl: string
  fileName: string
  expiresAt: number
  /** 부스 화면 언어(QR 주소 ?lang=) */
  lang: BoothLang
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

/** 아이폰·아이패드(데스크톱 모드 포함) — 사진 앱 저장은 공유 시트의 "이미지 저장"으로만 된다 */
function isIOS() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// 서버(UTC)와 폰이 같은 글자를 그리도록 한국 시간으로 고정 — 다르면 하이드레이션이 어긋난다.
// 날짜 모양은 화면 언어를 따른다(서버·폰 모두 같은 ?lang= 이라 글자가 같다)
function formatExpiry(ts: number, htmlLang: string) {
  return new Intl.DateTimeFormat(htmlLang, {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

export default function PhotoSaver({ imageUrl, downloadUrl, fileName, expiresAt, lang }: Props) {
  const t = boothText(lang)
  const htmlLang = BOOTH_LANGS.find((l) => l.id === lang)?.htmlLang ?? 'ko'
  const [loaded, setLoaded] = useState(false)
  const [missing, setMissing] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  // 아이폰 공유 시트는 "누른 직후"에만 열린다 — 누르고 나서 받기 시작하면 늦으므로 미리 받아 둔다
  const fileRef = useRef<File | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(imageUrl)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (!cancelled) fileRef.current = new File([blob], fileName, { type: 'image/jpeg' })
      })
      .catch(() => {
        /* 표시용 img 의 onError 가 안내한다 */
      })
    return () => {
      cancelled = true
    }
  }, [imageUrl, fileName])

  const save = async () => {
    setState('saving')
    const file = fileRef.current
    // 아이폰: 공유 시트 → "이미지 저장" 을 누르면 사진 앱에 들어간다
    if (isIOS() && file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        setState('saved')
      } catch (error) {
        // 공유 시트를 그냥 닫은 경우 — 실패가 아니다
        setState((error as Error)?.name === 'AbortError' ? 'idle' : 'failed')
      }
      return
    }
    // 안드로이드 등: 바로 내려받기 → 갤러리의 "다운로드" 앨범에 들어간다
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setState('saved')
  }

  return (
    <div lang={htmlLang} className="min-h-svh bg-neutral-950 text-white flex flex-col items-center px-5 pt-8 pb-10 text-center">
      <p className="text-sm font-bold tracking-[0.25em] text-white/50 mb-6">AC&apos;SCENT WOW</p>

      {missing ? (
        <div className="flex flex-1 flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-3 break-keep">{t.photoNotFound}</h1>
          <p className="text-white/55 text-sm break-keep">{t.photoNotFoundDesc}</p>
        </div>
      ) : (
        <>
          {/* 사진은 화면 높이의 58% 까지 — 저장 버튼이 스크롤 없이 첫 화면에 보여야 한다 */}
          <div className="relative flex justify-center w-full max-w-sm">
            {!loaded && (
              <div className="aspect-[2/3] h-[58svh] max-w-full rounded-2xl bg-white/5 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              // 하이드레이션 전에 이미 다 받아졌으면 onLoad 를 놓친다 — 붙는 순간 한 번 더 확인
              ref={(node) => {
                if (!node?.complete) return
                if (node.naturalWidth) setLoaded(true)
                else setMissing(true)
              }}
              src={imageUrl}
              alt={t.photoAlt}
              onLoad={() => setLoaded(true)}
              onError={() => setMissing(true)}
              className={`max-h-[58svh] w-auto max-w-full rounded-2xl shadow-2xl ${loaded ? '' : 'absolute inset-0 opacity-0'}`}
            />
          </div>

          <button
            type="button"
            onClick={save}
            disabled={!loaded || state === 'saving'}
            className="mt-6 flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-neutral-950 disabled:opacity-50"
          >
            {state === 'saving' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : state === 'saved' ? (
              <Check className="w-5 h-5" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {state === 'saved' ? t.photoSaved : t.photoSave}
          </button>

          <p className="mt-4 text-sm text-white/80 leading-relaxed break-keep">
            {state === 'failed'
              ? t.photoSaveFailed
              : t.photoSaveHint}
          </p>

          <p className="mt-6 text-sm text-white/70 leading-relaxed break-keep">
            {t.photoPrivacy(RESULT_PHOTO_TTL_HOURS)}
            <br />
            {t.photoUntil(formatExpiry(expiresAt, htmlLang))}
          </p>
        </>
      )}
    </div>
  )
}
