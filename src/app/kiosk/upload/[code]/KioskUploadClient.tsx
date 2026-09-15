'use client'

/**
 * 키오스크 QR 사진 업로드 (고객 폰 전용 화면)
 * 키오스크 화면의 QR → /kiosk/upload/[code] → 갤러리에서 사진 선택 → 압축 후 업로드
 * 업로드되면 키오스크가 폴링으로 받아 분석 단계로 자동 진행한다.
 * 세션·업로드 API는 포토부스와 공유한다(photobooth_sessions).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { compressImage } from '@/lib/image/compressor'

type Status = 'checking' | 'ready' | 'invalid' | 'uploading' | 'done' | 'error'

export function KioskUploadClient({ code }: { code: string }) {
  const [status, setStatus] = useState<Status>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!/^PB-[A-Z2-9]{6}$/.test(code)) {
      setStatus('invalid')
      setErrorMessage('잘못된 주소입니다. 키오스크 화면의 QR을 다시 스캔해 주세요.')
      return
    }
    let cancelled = false
    fetch(`/api/photobooth/session?code=${code}`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (!ok) {
          setStatus('invalid')
          setErrorMessage(data.error || '세션을 확인할 수 없습니다.')
        } else if (data.status === 'expired') {
          setStatus('invalid')
          setErrorMessage('시간이 만료되었습니다. 키오스크에서 QR을 다시 만들어 주세요.')
        } else if (data.status === 'uploaded') {
          setStatus('done')
        } else {
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('invalid')
          setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const handleFile = useCallback(
    async (file: File) => {
      setStatus('uploading')
      setErrorMessage('')
      try {
        // 분석용이라 인화 품질까지는 필요 없다 — 긴 변 1280px
        const base64 = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.85 })
        setPreview(base64)

        const res = await fetch('/api/photobooth/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, imageBase64: base64 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '업로드에 실패했습니다')
        setStatus('done')
      } catch (error) {
        console.error('키오스크 업로드 실패:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : '업로드에 실패했습니다')
      }
    },
    [code]
  )

  return (
    <div className="kup-root">
      <header className="kup-top">
        <span className="kup-brand">AC&rsquo;SCENT</span>
        <span className="kup-code">{code}</span>
      </header>

      {status === 'checking' && <p className="kup-msg">연결 중입니다...</p>}

      {status === 'invalid' && (
        <div className="kup-block">
          <h1 className="kup-title">접속할 수 없습니다</h1>
          <p className="kup-desc">{errorMessage}</p>
        </div>
      )}

      {(status === 'ready' || status === 'error') && (
        <div className="kup-block">
          <h1 className="kup-title">사진 올리기</h1>
          <p className="kup-desc">
            갤러리에서 얼굴이 잘 나온 사진 한 장을 골라 주세요.
            <br />
            향 분석에만 사용되며 키오스크 화면에 바로 나타납니다.
          </p>
          {status === 'error' && <p className="kup-error">{errorMessage}</p>}
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
          <button className="kup-btn" onClick={() => fileInputRef.current?.click()}>
            {status === 'error' ? '다시 선택하기' : '갤러리에서 사진 선택'}
          </button>
        </div>
      )}

      {status === 'uploading' && (
        <div className="kup-block">
          <h1 className="kup-title">올리는 중...</h1>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kup-preview" src={preview} alt="업로드 중인 사진" />
          )}
          <p className="kup-desc">잠시만 기다려 주세요.</p>
        </div>
      )}

      {status === 'done' && (
        <div className="kup-block">
          <h1 className="kup-title">업로드 완료</h1>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kup-preview" src={preview} alt="업로드한 사진" />
          )}
          <p className="kup-desc">
            키오스크 화면을 확인해 주세요.
            <br />
            이 창은 닫으셔도 됩니다.
          </p>
        </div>
      )}
    </div>
  )
}
