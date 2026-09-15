'use client'

/**
 * 포토부스 고객 폰 업로드 (모바일 전용 화면)
 * 부스 화면의 QR → /booth/upload/[code] → 사진 선택 → 압축 후 업로드
 * 업로드되면 부스 화면이 폴링으로 수신해 자동으로 다음 단계 진행
 */

import { useState, useEffect, useRef } from 'react'
import { compressImage } from '@/lib/image/compressor'
import { ImagePlus, Loader2, Check, RefreshCw, Sparkles } from 'lucide-react'

type Status = 'checking' | 'ready' | 'invalid' | 'uploading' | 'done' | 'error'

export function BoothUploadClient({ code }: { code: string }) {
  const [status, setStatus] = useState<Status>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [event, setEvent] = useState<{ greeting?: string; title?: string; artist?: string; hashtag?: string; theme_color?: string } | null>(null)

  useEffect(() => {
    fetch('/api/photobooth/config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEvent(data?.event ?? null))
      .catch(() => undefined)
  }, [])

  // 세션 유효성 확인
  useEffect(() => {
    if (!/^PB-[A-Z2-9]{6}$/.test(code)) {
      setStatus('invalid')
      setErrorMessage('잘못된 접속 주소예요. 부스 화면의 QR을 다시 스캔해주세요.')
      return
    }
    let cancelled = false
    fetch(`/api/photobooth/session?code=${code}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok) {
          setStatus('invalid')
          setErrorMessage(data.error || '세션을 확인할 수 없어요.')
        } else if (data.status === 'expired') {
          setStatus('invalid')
          setErrorMessage('만료된 세션이에요. 부스 화면에서 QR을 다시 만들어주세요.')
        } else if (data.status === 'uploaded') {
          setStatus('done')
        } else {
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('invalid')
          setErrorMessage('네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const handleFile = async (file: File) => {
    setStatus('uploading')
    setErrorMessage('')
    try {
      // 인화 품질 확보를 위해 긴 변 1600px, 품질 0.85로 압축
      const base64 = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
      })
      setPreview(base64)

      const res = await fetch('/api/photobooth/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, imageBase64: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '업로드에 실패했어요')
      setStatus('done')
    } catch (error) {
      console.error('포토부스 업로드 실패:', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : '업로드에 실패했어요')
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0b0b0a] text-white flex flex-col items-center justify-center px-6 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/photobooth/attract/graphite-gallery.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black/95" />
      <div className="relative z-10 w-full max-w-sm">
      <div className="mb-8 text-center">
        <p className="text-base font-bold tracking-[0.25em] text-white/65">AC&apos;SCENT WOW PHOTO</p>
        {event && (
          <div className="mt-5 rounded-2xl border border-white/15 bg-white/8 px-5 py-4 backdrop-blur-xl">
            <p className="flex items-center justify-center gap-2 text-lg font-bold" style={{ color: event.theme_color || '#f5d76e' }}>
              <Sparkles className="h-4 w-4" /> {event.greeting || event.title}
            </p>
            {event.artist && <p className="mt-1 text-base text-white/60">with {event.artist}</p>}
            {event.hashtag && <p className="mt-2 text-base font-semibold text-white/80">{event.hashtag}</p>}
          </div>
        )}
      </div>

      {status === 'checking' && (
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      )}

      {status === 'invalid' && (
        <div className="text-center">
          <p className="text-lg font-semibold mb-3">접속할 수 없어요</p>
          <p className="text-base text-white/55 leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {(status === 'ready' || status === 'error') && (
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ImagePlus className="h-7 w-7" /></div>
          <h1 className="text-3xl font-black mb-3">최애 사진 올리기</h1>
          <p className="text-base text-white/60 mb-8 leading-relaxed">
            함께 찍고 싶은 사진 한 장을 선택해주세요.
            <br />
            업로드하면 부스 화면에서 바로 이어져요.
          </p>
          {status === 'error' && (
            <p className="text-base text-red-300 mb-4">{errorMessage}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="min-h-16 w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-neutral-950 py-5 text-lg font-bold shadow-[0_12px_40px_rgba(255,255,255,.16)] active:scale-[.98] transition-transform"
          >
            {status === 'error' ? (
              <>
                <RefreshCw className="w-5 h-5" /> 다시 선택하기
              </>
            ) : (
              <>
                <ImagePlus className="w-5 h-5" /> 사진 선택하기
              </>
            )}
          </button>
          <p className="mt-5 font-mono text-base text-white/30 tracking-widest">{code}</p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="w-full max-w-sm text-center">
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="업로드 중인 사진"
              className="w-40 mx-auto rounded-2xl mb-6 opacity-60"
            />
          )}
          <p className="flex items-center justify-center gap-2 text-base text-white/70">
            <Loader2 className="w-4 h-4 animate-spin" /> 업로드하는 중...
          </p>
        </div>
      )}

      {status === 'done' && (
        <div className="w-full max-w-sm text-center">
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="업로드된 사진"
              className="w-40 mx-auto rounded-2xl mb-6"
            />
          )}
          <div className="w-14 h-14 mx-auto rounded-full bg-white text-neutral-950 flex items-center justify-center mb-4">
            <Check className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold mb-2">업로드 완료!</h1>
          <p className="text-base text-white/55 leading-relaxed">
            이제 부스 화면에서 촬영을 이어가주세요.
            <br />이 창은 닫으셔도 돼요.
          </p>
        </div>
      )}
      </div>
    </div>
  )
}
