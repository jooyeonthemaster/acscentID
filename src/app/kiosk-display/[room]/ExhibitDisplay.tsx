'use client'
import { useEffect, useRef, useState } from 'react'
import { validExhibitToken, validRoomId, type ExhibitState } from '@/lib/kiosk/expansion/exhibit'
import { ExhibitRequestError, exhibitRequest } from '@/lib/kiosk/expansion/exhibit-client'
import { ExhibitVisual } from '../ExhibitVisual'

export function ExhibitDisplay({ room }: { room: string }) {
  const [token, setToken] = useState('')
  const [state, setState] = useState<ExhibitState | null>(null)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)
  const [ended, setEnded] = useState(false)
  const [full, setFull] = useState(false)
  const [visible, setVisible] = useState(true)
  const [ackRetry, setAckRetry] = useState(0)
  const root = useRef<HTMLElement>(null)
  const rendered = useRef(0)
  const sequence = state?.sequence ?? 0
  const hasContent = !!state?.content
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? ''
    queueMicrotask(() => {
      if (!validRoomId(room) || !validExhibitToken(value)) setError('올바른 전시 연결 주소로 열어 주세요.')
      else setToken(value)
    })
  }, [room])
  useEffect(() => {
    const changed = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', changed)
    return () => document.removeEventListener('visibilitychange', changed)
  }, [])
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    let busy = false, stopped = false, lastHeartbeat = 0
    const poll = async () => {
      if (busy || stopped || document.visibilityState !== 'visible') return
      busy = true
      try {
        const heartbeat = Date.now() - lastHeartbeat > 4500
        const next = await exhibitRequest(room, token, heartbeat ? { action: 'heartbeat' } : undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]))
        if (controller.signal.aborted) return
        if (heartbeat) lastHeartbeat = Date.now()
        setState(next); setLive(true); setEnded(false); setError('')
      } catch (e) {
        if (!controller.signal.aborted) {
          setLive(false)
          if (e instanceof ExhibitRequestError && e.terminal) {
            stopped = true; setEnded(true); setState(null)
            setError('전시 연결이 종료되었습니다. 키오스크에서 새 연결을 만들어 주세요.')
          } else setError(e instanceof Error ? e.message : '연결이 끊겼습니다. 다시 확인하는 중입니다.')
        }
      } finally { busy = false }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 1200)
    document.addEventListener('visibilitychange', poll)
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', poll) }
  }, [room, token])
  useEffect(() => {
    if (!hasContent || !token || sequence <= rendered.current || !live || !visible) return
    const controller = new AbortController()
    let second = 0, retry = 0
    // ACK only after React has committed the content and two animation frames have run.
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => {
      if (!root.current?.querySelector('[data-exhibit-sequence]') || document.visibilityState !== 'visible') return
      void exhibitRequest(room, token, { action: 'ack', sequence }, AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])).then(() => { rendered.current = sequence }).catch(() => {
        if (!controller.signal.aborted) retry = window.setTimeout(() => setAckRetry(value => value + 1), 1000)
      })
    }) })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); window.clearTimeout(retry); controller.abort() }
  }, [sequence, hasContent, room, token, live, visible, ackRetry])
  return <main className="exhibit-display" ref={root}>
    <header className="exhibit-display-header"><strong>CONNECTED DISPLAY</strong><span role="status">{ended ? '전시 연결 종료' : live ? '키오스크 연결됨' : '연결 확인 중'}</span><button type="button" onClick={() => { if (!document.fullscreenElement) void root.current?.requestFullscreen().then(() => setFull(true)).catch(() => undefined); else void document.exitFullscreen().then(() => setFull(false)) }}>{full ? '전체 화면 닫기' : '전체 화면'}</button></header>
    {state?.content ? <div className="exhibit-display-canvas" data-exhibit-sequence={state.sequence}><ExhibitVisual content={state.content} /></div> : <div className="exhibit-display-canvas exhibit-display-wait"><h1>함께 만드는 순간</h1><p>{error || '전시 화면이 준비되었습니다. 키오스크에서 보낼 내용을 선택해 주세요.'}</p><p>이 창을 화면에 열어 두세요. 표시 확인이 끝나면 키오스크에 완료 안내가 나타납니다.</p></div>}
    <footer className="exhibit-display-footer" role="status">{error || (state?.kind === 'heritage' ? '전통 건축을 이해하기 위한 교육용 개념 재현입니다.' : state?.kind === 'product' ? '직접 조작하는 가상 조명 디자인 · 실제 판매 제품이 아닙니다.' : '우리의 문장으로 채우는 비전 월')} · 연결은 생성 후 1시간 유지됩니다.</footer>
  </main>
}
