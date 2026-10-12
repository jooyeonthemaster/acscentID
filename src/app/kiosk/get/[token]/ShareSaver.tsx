'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Download, FileText, Loader2 } from 'lucide-react'
import { shareFileUrl, type ShareFileMeta, type ShareMeta } from '@/lib/kiosk/share'
import { SHARE_TEXT } from './text'

/** 아이폰·아이패드(데스크톱 모드 포함) — 사진 앱 저장은 공유 시트의 "이미지 저장"으로만 된다 */
function isIOS() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// 서버(UTC)와 폰이 같은 글자를 그리도록 한국 시간으로 고정 — 다르면 하이드레이션이 어긋난다
function formatExpiry(ts: number, htmlLang: string) {
  return new Intl.DateTimeFormat(htmlLang, { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts))
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

function Item({ token, file, text }: { token: string; file: ShareFileMeta; text: (typeof SHARE_TEXT)['ko'] }) {
  const [state, setState] = useState<SaveState>('idle')
  // 아이폰 공유 시트는 "누른 직후"에만 열린다 — 누르고 나서 받기 시작하면 늦으므로 미리 받아 둔다
  const ready = useRef<File | null>(null)
  const url = shareFileUrl(token, file.name)
  const image = file.type.startsWith('image/')

  useEffect(() => {
    if (!image) return
    let cancelled = false
    fetch(url)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => { if (!cancelled) ready.current = new File([blob], `acscent-${file.name}`, { type: file.type }) })
      .catch(() => { /* 저장 버튼이 내려받기로 대신한다 */ })
    return () => { cancelled = true }
  }, [url, image, file.name, file.type])

  const save = async () => {
    setState('saving')
    const shared = ready.current
    // 아이폰: 공유 시트 → "이미지 저장" 을 누르면 사진 앱에 들어간다
    if (image && isIOS() && shared && navigator.canShare?.({ files: [shared] })) {
      try {
        await navigator.share({ files: [shared] })
        setState('saved')
      } catch (error) {
        setState((error as Error)?.name === 'AbortError' ? 'idle' : 'failed')
      }
      return
    }
    // 안드로이드·그 밖: 바로 내려받기
    const link = document.createElement('a')
    link.href = shareFileUrl(token, file.name, true)
    link.download = `acscent-${file.name}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setState('saved')
  }

  return (
    <section className="w-full max-w-sm rounded-2xl bg-white/[0.06] p-3">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.label} className="mx-auto max-h-[52svh] w-auto max-w-full rounded-xl" />
      )}
      {file.type === 'audio/wav' && <audio src={url} controls preload="metadata" className="w-full" />}
      {file.type === 'application/pdf' && (
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-5 text-left">
          <FileText className="h-8 w-8 shrink-0 text-white/70" />
          <span className="break-keep text-base font-semibold">{file.label}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="min-w-0 break-keep text-left text-sm font-semibold text-white/85">{file.label}</span>
        <button type="button" onClick={save} disabled={state === 'saving'} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-base font-bold text-neutral-950 disabled:opacity-50">
          {state === 'saving' ? <Loader2 className="h-5 w-5 animate-spin" /> : state === 'saved' ? <Check className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          {state === 'saved' ? text.saved : text.save}
        </button>
      </div>
      {state === 'failed' && <p className="mt-2 break-keep text-left text-sm text-red-300">{text.failed}</p>}
    </section>
  )
}

export function ShareSaver({ token, meta, tag, color, htmlLang, expiresAt }: {
  token: string
  meta: ShareMeta
  tag: string
  color: string
  htmlLang: string
  expiresAt: number
}) {
  const text = SHARE_TEXT[meta.lang]
  return (
    <div lang={htmlLang} className="flex min-h-svh flex-col items-center gap-4 bg-neutral-950 px-5 pb-10 pt-8 text-center text-white">
      <p className="text-3xl font-black tracking-tight" style={{ color: '#fff', textShadow: `0 0 28px ${color}` }}>{tag}</p>
      <h1 className="break-keep text-xl font-bold">{text.title}</h1>
      {meta.files.map((file) => <Item key={file.name} token={token} file={file} text={text} />)}
      <p className="max-w-sm break-keep text-sm leading-relaxed text-white/70">{text.hint}</p>
      <p className="max-w-sm break-keep text-sm leading-relaxed text-white/55">{text.keep(formatExpiry(expiresAt, htmlLang))}</p>
    </div>
  )
}
