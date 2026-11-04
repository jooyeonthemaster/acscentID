'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { validExhibitToken, validRoomId, type ExhibitCommand, type ExhibitConnection, type ExhibitKind, type ExhibitState } from './exhibit'

const storageKey = (kind: ExhibitKind) => `acscent-exhibit-controller-${kind}-v1`
export class ExhibitRequestError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ExhibitRequestError' }
  get terminal() { return [401, 403, 404, 410].includes(this.status) }
}
function cached(kind: ExhibitKind): ExhibitConnection | null {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(kind)) ?? 'null') as ExhibitConnection | null
    return value && value.kind === kind && validRoomId(value.id) && validExhibitToken(value.controllerToken) && value.expiresAt > Date.now() ? value : null
  } catch { return null }
}
export async function exhibitRequest<T = ExhibitState>(id: string, token: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/kiosk/exhibit/${id}`, { method: body ? 'PATCH' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: signal ?? AbortSignal.timeout(8000) })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) throw new ExhibitRequestError(data?.error || '전시 화면과 연결하지 못했습니다.', response.status)
  return data as T
}
export function useExhibit(kind: ExhibitKind) {
  const [connection, setConnection] = useState<ExhibitConnection | null>(() => cached(kind))
  const [state, setState] = useState<ExhibitState | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState<number | null>(null)
  const [confirmedCommandKey, setConfirmedCommandKey] = useState<string | null>(null)
  const pending = useRef<{ key: string; id: string } | null>(null)
  const active = useRef<AbortController | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; active.current?.abort() } }, [])

  const connect = useCallback(async () => {
    if (creating) return
    setCreating(true); setError('')
    try {
      const response = await fetch('/api/kiosk/exhibit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }), signal: AbortSignal.timeout(10_000) })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data || !validRoomId(data.id) || !validExhibitToken(data.controllerToken) || !validExhibitToken(data.viewerToken)) throw new Error(data?.error || '전시 연결을 만들지 못했습니다.')
      const made: ExhibitConnection = { id: data.id, kind, controllerToken: data.controllerToken, viewerUrl: `${window.location.origin}/kiosk-display/${data.id}#token=${data.viewerToken}`, expiresAt: data.expiresAt }
      if (!alive.current) return
      try { sessionStorage.setItem(storageKey(kind), JSON.stringify(made)) } catch { /* this visit still works */ }
      setConnection(made); setState(null); setConfirmed(null); setConfirmedCommandKey(null); pending.current = null
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : '전시 연결을 만들지 못했습니다.') }
    finally { if (alive.current) setCreating(false) }
  }, [kind, creating])

  useEffect(() => {
    if (!connection) return
    const controller = new AbortController()
    let busy = false
    const poll = async () => {
      if (busy || controller.signal.aborted) return
      busy = true
      try {
        const next = await exhibitRequest(connection.id, connection.controllerToken, undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]))
        if (!controller.signal.aborted) setState(next)
      } catch (e) {
        if (!controller.signal.aborted) {
          setState(null)
          if (e instanceof ExhibitRequestError && e.terminal) {
            setConnection(null); setError('전시 연결이 종료되었습니다. 새 연결을 만들어 주세요.')
            try { sessionStorage.removeItem(storageKey(kind)) } catch { /* the expired connection is already cleared in memory */ }
          }
        }
      }
      finally { busy = false }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 2500)
    return () => { window.clearInterval(timer); controller.abort() }
  }, [connection, kind])

  const send = useCallback(async (command: ExhibitCommand): Promise<ExhibitState | null> => {
    if (sending) return null
    if (!connection || connection.expiresAt <= Date.now()) { setError('먼저 전시 화면을 연결해 주세요. 입력한 내용은 유지됩니다.'); return null }
    const controller = new AbortController()
    active.current?.abort(); active.current = controller
    const key = JSON.stringify(command)
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() }
    const requestId = pending.current.id
    setSending(true); setError(''); setConfirmed(null); setConfirmedCommandKey(null)
    try {
      let next = await exhibitRequest(connection.id, connection.controllerToken, { action: 'publish', command, requestId }, AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]))
      const sequence = next.sequence, until = Date.now() + 12_000
      while (next.acknowledgedSequence < sequence) {
        if (Date.now() >= until) throw new Error('전시 화면의 표시 확인을 받지 못했습니다. 내용을 유지했으니 다시 시도해 주세요.')
        await new Promise<void>(resolve => setTimeout(resolve, 550))
        controller.signal.throwIfAborted()
        next = await exhibitRequest(connection.id, connection.controllerToken, undefined, AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]))
        if (next.sequence !== sequence) throw new Error('다른 내용으로 전시가 갱신되었습니다. 다시 보내 주세요.')
      }
      if (!alive.current || controller.signal.aborted) return null
      // Keep this successful command's request ID for Back → Send in the same visit.
      // A changed command or an explicitly new connection creates a new ID.
      setState(next); setConfirmed(sequence); setConfirmedCommandKey(key)
      return next
    } catch (e) { if (alive.current && !controller.signal.aborted) setError(e instanceof Error ? e.message : '전시 전송에 실패했습니다.'); return null }
    finally { if (alive.current && active.current === controller) setSending(false) }
  }, [connection, sending])
  return { connection, state, creating, sending, confirmed, confirmedCommandKey, error, connect, send }
}
