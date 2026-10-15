'use client'

// 프로그램 흐름이 화면 틀(ProgramApp)에 받는 것 + 휴대폰 사진 받기(업로드 세션) 훅.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProgramDef } from '@/lib/booth/programs/catalog'
import { makeScreenQr } from './save'

export interface FlowCtx {
  program: ProgramDef
  demo: boolean
  /** 이번 손님의 생성·저장 표 — 못 받으면 Error(안내 문구) */
  getTicket: () => Promise<string>
  /** 확인 없이 처음으로 */
  home: () => void
  /** 처음으로(진행 중이면 확인 창) */
  requestHome: () => void
  /** 생성·녹화·업로드 중 — 무입력 안내를 띄우지 않는다 */
  setBusy: (busy: boolean) => void
  /** 저장하지 않은 결과가 있다 — 처음으로 갈 때 확인 */
  setDirty: (dirty: boolean) => void
  /** 위 단계 표시(1 촬영 · 2 옵션 · 3 결과/저장) */
  setStep: (step: 1 | 2 | 3) => void
  /** 결과가 나왔다(매장 통계 1건) */
  onResult: () => void
  markShot: (patch: { printed?: boolean; downloaded?: boolean }) => void
}

export interface AlbumPhoto { name: string; url: string; token: string }

type AlbumStatus = 'idle' | 'creating' | 'ready' | 'expired' | 'error'

/**
 * 휴대폰 → 부스 사진 받기(추억 무비 5~20장, 사진 프로그램의 '휴대폰 사진 가져오기')
 * — /api/photobooth/album 세션을 만들고 QR 을 보여 주며 2.5초마다 목록을 가져온다. 화면을 떠나면 올라온 사진을 지운다.
 */
export function useAlbum(getTicket: () => Promise<string>, enabled: boolean, query: string) {
  const [status, setStatus] = useState<AlbumStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState(0)
  /** 지금 세션 사진 + 만료된 예전 세션에서 받아 둔 사진 */
  const [current, setCurrent] = useState<AlbumPhoto[]>([])
  const [kept, setKept] = useState<AlbumPhoto[]>([])
  const tokenRef = useRef<string | null>(null)
  const allTokens = useRef<string[]>([])

  const create = useCallback(async () => {
    setStatus('creating'); setError(null)
    try {
      const ticket = await getTicket()
      const res = await fetch('/api/photobooth/album', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '휴대폰 연결을 준비하지 못했어요.')
      tokenRef.current = data.token
      allTokens.current.push(data.token)
      const full = `${window.location.origin}${data.path}${query ? `?${query}` : ''}`
      setUrl(full)
      setQr(await makeScreenQr(full))
      setExpiresAt(Number(data.expiresAt))
      setStatus('ready')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '휴대폰 연결을 준비하지 못했어요.')
      setStatus('error')
    }
  }, [getTicket, query])

  useEffect(() => {
    if (enabled && status === 'idle') void create()
  }, [enabled, status, create])

  // 목록 가져오기
  useEffect(() => {
    if (!enabled || status !== 'ready') return
    let alive = true
    const poll = async () => {
      const token = tokenRef.current
      if (!token) return
      try {
        const res = await fetch(`/api/photobooth/album?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!alive || token !== tokenRef.current) return
        if (res.status === 410) { setStatus('expired'); return }
        if (res.ok && Array.isArray(data.photos)) setCurrent(data.photos.map((p: { name: string; url: string }) => ({ ...p, token })))
      } catch { /* 다음 차례에 다시 */ }
    }
    void poll()
    const timer = window.setInterval(poll, 2500)
    const expiry = window.setTimeout(() => { if (alive) setStatus('expired') }, Math.max(0, expiresAt - Date.now()))
    return () => { alive = false; window.clearInterval(timer); window.clearTimeout(expiry) }
  }, [enabled, status, expiresAt])

  /** 만료 후 새 QR — 받아 둔 사진은 그대로 */
  const reissue = useCallback(() => {
    setKept((k) => [...k, ...current])
    setCurrent([])
    void create()
  }, [current, create])

  const remove = useCallback(async (photo: AlbumPhoto) => {
    setCurrent((list) => list.filter((p) => p.name !== photo.name))
    setKept((list) => list.filter((p) => p.name !== photo.name))
    await fetch(`/api/photobooth/album?token=${encodeURIComponent(photo.token)}&name=${encodeURIComponent(photo.name)}`, { method: 'DELETE' }).catch(() => undefined)
  }, [])

  const clear = useCallback(async () => {
    setCurrent([]); setKept([])
    await Promise.all(allTokens.current.map((t) => fetch(`/api/photobooth/album?token=${encodeURIComponent(t)}`, { method: 'DELETE' }).catch(() => undefined)))
  }, [])

  // 화면을 떠나면(처음으로·다음 손님) 올라온 사진을 지운다
  useEffect(() => () => {
    for (const t of allTokens.current) {
      void fetch(`/api/photobooth/album?token=${encodeURIComponent(t)}`, { method: 'DELETE', keepalive: true }).catch(() => undefined)
    }
  }, [])

  return { status, error, qr, url, expiresAt, photos: [...kept, ...current], reissue, remove, clear, retry: create }
}

/** 남은 초(화면 표시용) */
export function useCountdown(until: number, running = true) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((until - Date.now()) / 1000)))
  useEffect(() => {
    if (!running) return
    const tick = () => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 500)
    return () => window.clearInterval(timer)
  }, [until, running])
  return left
}

/** 사진 → 생성 요청용 JPEG(긴 변 1280) — 두 장이어도 Vercel 요청 4.5MB 아래 */
export function toRequestJpeg(pic: HTMLCanvasElement | HTMLImageElement, max = 1280): string {
  const w = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width
  const h = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(pic, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.9)
}
