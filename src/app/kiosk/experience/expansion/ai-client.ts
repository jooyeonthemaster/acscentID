'use client'

// 체험 18종 — AI 분석(/api/kiosk/experience/expansion)과 이미지 합성(/expansion-image) 부르기.
// 사진은 이 순간에만 줄여서 보내고(분석 768px · 합성 1024px) 기기에도 서버에도 남기지 않는다.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiAnalysis, AiRequest } from '@/lib/kiosk/expansion/ai'
import type { ImageParams } from '@/lib/kiosk/expansion/image-prompts'

export class AiCallError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'AiCallError' }
}

/** 사진을 긴 변 edge 로 줄인 JPEG data: 주소 */
export async function shrinkPhoto(photo: string, edge: number, quality = 0.85): Promise<string> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('사진을 읽지 못했습니다')); image.src = photo })
  const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  const out = canvas.toDataURL('image/jpeg', quality)
  canvas.width = canvas.height = 0
  return out
}

async function post<T>(path: string, body: unknown, signal: AbortSignal, pick: (data: Record<string, unknown>) => T | undefined): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(130_000)]) })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  const value = response.ok ? pick(data) : undefined
  if (value === undefined) throw new AiCallError(typeof data.error === 'string' ? data.error : 'AI 응답을 받지 못했어요.', response.status)
  return value
}

export async function requestAnalysis(request: Omit<AiRequest, 'photo'> & { photo: string | null }, signal: AbortSignal): Promise<AiAnalysis> {
  const photo = request.photo ? await shrinkPhoto(request.photo, 768, 0.82) : null
  return post('/api/kiosk/experience/expansion', { ...request, photo }, signal, (d) => (d.analysis && typeof d.analysis === 'object' ? d.analysis as AiAnalysis : undefined))
}

export async function requestImage(params: ImageParams, photo: string, signal: AbortSignal): Promise<string> {
  const small = await shrinkPhoto(photo, 1024, 0.88)
  return post('/api/kiosk/experience/expansion-image', { id: params.id, photo: small, params }, signal, (d) => (typeof d.image === 'string' && d.image.startsWith('data:image/') ? d.image : undefined))
}

export type AiJobState =
  | { phase: 'idle' }
  | { phase: 'analyzing' | 'imaging' }
  | { phase: 'done'; analysis: AiAnalysis | null; image: string | null; imageFailed: boolean; imageRetrying: boolean }
  | { phase: 'error'; message: string; busy: boolean }

/**
 * AI 분석(필수)과 이미지 합성(있으면)을 한 번에 — 합성 조건이 분석 결과에 달렸으면(오라 색·코디 아이템) 분석 뒤에 이어서.
 * 분석이 실패하면 오류(화면이 다시 시도·AI 없이 보기를 고르게 한다). 합성만 실패하면 결과는 보여 주고 합성 실패를 알린다.
 */
export function useAiJob() {
  const [state, setState] = useState<AiJobState>({ phase: 'idle' })
  const ctrl = useRef<AbortController | null>(null)
  useEffect(() => () => ctrl.current?.abort(), [])
  const run = useCallback(async (job: { analysis: Parameters<typeof requestAnalysis>[0]; image?: ((analysis: AiAnalysis) => { params: ImageParams; photo: string } | null) | null }) => {
    ctrl.current?.abort()
    const mine = new AbortController()
    ctrl.current = mine
    setState({ phase: 'analyzing' })
    let analysis: AiAnalysis
    try {
      analysis = await requestAnalysis(job.analysis, mine.signal)
    } catch (error) {
      if (mine.signal.aborted) return null
      console.error('[kiosk] AI 분석 실패:', error)
      setState({ phase: 'error', message: error instanceof Error ? error.message : 'AI 응답을 받지 못했어요.', busy: error instanceof AiCallError && (error.status === 429 || error.status === 503) })
      return null
    }
    const wanted = job.image?.(analysis) ?? null
    let image: string | null = null
    let imageFailed = false
    if (wanted) {
      setState({ phase: 'imaging' })
      try { image = await requestImage(wanted.params, wanted.photo, mine.signal) } catch (error) {
        if (mine.signal.aborted) return null
        console.error('[kiosk] 이미지 합성 실패:', error)
        imageFailed = true
      }
    }
    if (mine.signal.aborted) return null
    const done = { phase: 'done' as const, analysis, image, imageFailed, imageRetrying: false }
    setState(done)
    return done
  }, [])
  /** 합성만 다시(분석은 그대로) */
  const retryImage = useCallback(async (params: ImageParams, photo: string) => {
    const mine = new AbortController()
    ctrl.current = mine
    setState((s) => s.phase === 'done' ? { ...s, imageFailed: false, imageRetrying: true } : s)
    try {
      const image = await requestImage(params, photo, mine.signal)
      if (!mine.signal.aborted) setState((s) => s.phase === 'done' ? { ...s, image, imageFailed: false, imageRetrying: false } : s)
    } catch (error) {
      if (mine.signal.aborted) return
      console.error('[kiosk] 이미지 합성 실패:', error)
      setState((s) => s.phase === 'done' ? { ...s, imageFailed: true, imageRetrying: false } : s)
    }
  }, [])
  const reset = useCallback(() => { ctrl.current?.abort(); setState({ phase: 'idle' }) }, [])
  /** AI 없이 결과 보기 — 분석 없이 끝난 것으로 */
  const skip = useCallback(() => { ctrl.current?.abort(); setState({ phase: 'done', analysis: null, image: null, imageFailed: false, imageRetrying: false }) }, [])
  return { state, run, retryImage, reset, skip }
}
