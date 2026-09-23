'use client'

import { useCallback, useEffect, useRef } from 'react'

/** One request at a time; unchanged responses never retrigger canvas rendering.
 * Cross-device updates take at most the 1s poll interval + request latency while visible.
 * Refocus/reconnect refresh immediately. Failed reads retain the last good configuration.
 */
export function useLiveBoothConfig<T>(apply: (config: T) => void) {
  const applyRef = useRef(apply)
  applyRef.current = apply
  const previous = useRef('')
  const active = useRef(false)
  const pending = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    if (!active.current || pending.current) return
    const controller = new AbortController()
    pending.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      // no-cache: 브라우저가 지난 ETag 로 확인만 한다 — 바뀐 게 없으면 서버는 본문 없이 304 를 주고,
      // 브라우저는 저장해 둔 응답을 그대로 돌려준다 (아래 서명 비교로 재합성도 일어나지 않는다)
      const response = await fetch('/api/photobooth/config', {
        cache: 'no-cache', signal: controller.signal,
      })
      if (!response.ok) return
      const config = await response.json()
      if (!Array.isArray(config.frames) || !Array.isArray(config.templates)) return
      const signature = JSON.stringify(config)
      if (active.current && !controller.signal.aborted && signature !== previous.current) {
        previous.current = signature
        applyRef.current(config)
      }
    } catch {
      // Offline / timeout: preserve the current selection and retry on the next tick.
    } finally {
      window.clearTimeout(timeout)
      if (pending.current === controller) pending.current = null
    }
  }, [])

  useEffect(() => {
    active.current = true
    void refresh()
    const onVisible = () => { if (!document.hidden) void refresh() }
    const timer = window.setInterval(onVisible, 1000)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active.current = false
      pending.current?.abort()
      pending.current = null
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])
  return refresh
}
