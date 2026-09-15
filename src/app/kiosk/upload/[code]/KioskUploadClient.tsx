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
import { compressImage } from '@/lib/image/compressor'

type Status =
  | 'checking'
  | 'ready'
  | 'preparing' // 고른 사진을 압축하는 중
  | 'confirm' // 미리보기 — 손님이 확정해야 업로드된다
  | 'invalid'
  | 'uploading'
  | 'done'
  | 'error'

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
      setErrorMessage(error instanceof Error ? error.message : '사진을 불러오지 못했습니다')
    }
  }, [])

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
      if (!res.ok) throw new Error(data.error || '업로드에 실패했습니다')
      setStatus('done')
    } catch (error) {
      console.error('키오스크 업로드 실패:', error)
      // 사진은 그대로 두고 확정 화면으로 되돌린다 — 같은 사진으로 바로 재시도할 수 있게
      setStatus('confirm')
      setErrorMessage(error instanceof Error ? error.message : '업로드에 실패했습니다')
    }
  }, [code, preview])

  return (
    <div className="kup-root">
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

      {status === 'checking' && <p className="kup-msg">연결 중입니다...</p>}

      {status === 'invalid' && (
        <div className="kup-block">
          <h1 className="kup-title">접속할 수 없습니다</h1>
          <p className="kup-desc">{errorMessage}</p>
        </div>
      )}

      {status === 'preparing' && <p className="kup-msg">사진을 불러오는 중입니다...</p>}

      {(status === 'ready' || status === 'error') && (
        <div className="kup-block">
          <h1 className="kup-title">사진 올리기</h1>
          <p className="kup-desc">
            갤러리에서 얼굴이 잘 나온 사진 한 장을 골라 주세요.
            <br />
            향 분석에만 사용되며, 확정하신 뒤 키오스크 화면에 나타납니다.
          </p>
          {status === 'error' && <p className="kup-error">{errorMessage}</p>}
          <button className="kup-btn" onClick={() => fileInputRef.current?.click()}>
            {status === 'error' ? '다시 선택하기' : '갤러리에서 사진 선택'}
          </button>
        </div>
      )}

      {status === 'confirm' && (
        <div className="kup-block">
          <h1 className="kup-title">이 사진으로 할까요?</h1>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kup-preview" src={preview} alt="선택한 사진" />
          )}
          {errorMessage && <p className="kup-error">{errorMessage}</p>}
          <p className="kup-desc">확정하면 키오스크 화면으로 전송됩니다.</p>
          <button className="kup-btn" onClick={confirmUpload}>
            {errorMessage ? '다시 올리기' : '이 사진으로 확정하기'}
          </button>
          <button className="kup-btn kup-btn-ghost" onClick={() => fileInputRef.current?.click()}>
            다른 사진 고르기
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
