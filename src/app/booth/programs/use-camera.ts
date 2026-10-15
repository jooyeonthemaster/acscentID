'use client'

// 프로그램 화면 카메라 — 매장 DSLR 브리지(src/lib/photobooth/dslr-bridge.ts)가 있으면 그 라이브뷰·원본 촬영, 없으면 웹캠.
// 영상 녹화(뮤직비디오)는 웹캠+마이크만 쓴다(DSLR 라이브뷰는 프레임이 띄엄띄엄이라).
// 화면을 떠나면 카메라·마이크·라이브뷰 반복을 모두 끈다.
import { useCallback, useEffect, useRef, useState } from 'react'
import { captureDslrStill, fetchDslrFrame, probeDslrBridge } from '@/lib/photobooth/dslr-bridge'

export type CameraState = 'starting' | 'ready' | 'error'

export interface CameraHandle {
  state: CameraState
  error: string | null
  /** 웹캠일 때 미리보기 video 에 붙인다 */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** DSLR 라이브뷰를 그리는 캔버스 */
  liveRef: React.RefObject<HTMLCanvasElement | null>
  source: 'webcam' | 'dslr' | null
  stream: MediaStream | null
  retry: () => void
  /** 지금 장면을 캔버스로 — 웹캠은 미리보기처럼 거울 방향(손님이 본 그대로), DSLR 은 그대로 */
  still: () => Promise<HTMLCanvasElement>
}

const errorText = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return '카메라 권한이 꺼져 있어요. 브라우저 주소창의 카메라 권한을 허용해 주세요.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '연결된 카메라를 찾지 못했어요.'
  if (name === 'NotReadableError') return '다른 프로그램이 카메라를 쓰고 있어요.'
  return '카메라를 켜지 못했어요.'
}

export function useCamera({ enabled, audio = false, allowDslr = true }: { enabled: boolean; audio?: boolean; allowDslr?: boolean }): CameraHandle {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const liveRef = useRef<HTMLCanvasElement | null>(null)
  const [state, setState] = useState<CameraState>('starting')
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'webcam' | 'dslr' | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    let media: MediaStream | null = null
    let raf = 0
    const video = videoRef.current
    ;(async () => {
      await Promise.resolve()
      if (!alive) return
      setState('starting'); setError(null)
      if (allowDslr && !audio) {
        const health = await probeDslrBridge()
        if (!alive) return
        if (health.connected) {
          setSource('dslr'); setState('ready')
          const loop = async () => {
            if (!alive) return
            const frame = await fetchDslrFrame().catch(() => null)
            const canvas = liveRef.current
            if (frame && canvas && alive) {
              canvas.width = frame.width; canvas.height = frame.height
              canvas.getContext('2d')!.drawImage(frame, 0, 0)
              frame.close()
            }
            raf = window.setTimeout(loop, 60) as unknown as number
          }
          void loop()
          return
        }
      }
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
          audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        })
        if (!alive) { media.getTracks().forEach((t) => t.stop()); return }
        setStream(media); setSource('webcam')
        const target = videoRef.current
        if (target) {
          target.srcObject = media
          await target.play().catch(() => undefined)
        }
        setState('ready')
      } catch (cause) {
        if (!alive) return
        setError(errorText(cause)); setState('error')
      }
    })()
    return () => {
      alive = false
      window.clearTimeout(raf)
      media?.getTracks().forEach((t) => t.stop())
      setStream(null)
      if (video) video.srcObject = null
    }
  }, [enabled, audio, allowDslr, attempt])

  // 미리보기 video 가 바뀌어도(두 사람 차례 촬영 등) 같은 카메라를 붙인다 — 매 렌더 확인
  useEffect(() => {
    const target = videoRef.current
    if (target && stream && target.srcObject !== stream) {
      target.srcObject = stream
      void target.play().catch(() => undefined)
    }
  })

  // 카메라가 뽑히면(트랙 종료) 오류로
  useEffect(() => {
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    const onEnded = () => { setError('카메라 연결이 끊겼어요.'); setState('error') }
    track?.addEventListener('ended', onEnded)
    return () => track?.removeEventListener('ended', onEnded)
  }, [stream])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const still = useCallback(async () => {
    const canvas = document.createElement('canvas')
    if (source === 'dslr') {
      const bitmap = await captureDslrStill(2400)
      canvas.width = bitmap.width; canvas.height = bitmap.height
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
      bitmap.close()
      return canvas
    }
    const video = videoRef.current
    if (!video || !video.videoWidth) throw new Error('카메라 화면이 아직 준비되지 않았어요.')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    return canvas
  }, [source])

  return { state, error, videoRef, liveRef, source, stream, retry, still }
}
