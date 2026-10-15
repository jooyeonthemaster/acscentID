'use client'

// 관리자 — 기존 키오스크와 같은 자리(오른쪽 위 모서리 96×36)를 누르면 PIN 6자리.
// PIN 은 서버(/api/screen-backgrounds/unlock)가 확인하고, 인터넷이 끊겼으면 셸(window.kiosk.checkAdminPin)이 확인한다.
// 열리면: 처음으로 · 앱 종료(셸이 있을 때) · 닫기.

import { AnimatePresence, motion } from 'framer-motion'
import { Delete, LogOut, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getKioskBridge } from '@/lib/kiosk/kiosk-bridge'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export function AdminGate({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const kiosk = typeof window !== 'undefined' ? getKioskBridge() : undefined

  const close = () => { setOpen(false); setPin(''); setUnlocked(false); setError(null) }

  // 열어 둔 채 자리를 비우면(특히 '앱 종료'가 보이는 상태) 1분 뒤 저절로 닫는다
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => { setOpen(false); setPin(''); setUnlocked(false); setError(null) }, 60_000)
    return () => window.clearTimeout(id)
  }, [open, unlocked])

  const verify = async (value: string) => {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch('/api/screen-backgrounds/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: value }),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) setUnlocked(true)
      else setError(res.status === 429 ? '입력이 너무 많습니다. 1분 후 다시 시도해 주세요.' : '비밀번호가 올바르지 않습니다.')
    } catch {
      // 인터넷이 끊겼으면 기기(셸)에 확인받는다
      const ok = kiosk?.checkAdminPin ? await kiosk.checkAdminPin(value).catch(() => false) : false
      if (ok) setUnlocked(true)
      else setError('인터넷에 연결되어 있지 않습니다.')
    } finally {
      setChecking(false)
      setPin('')
    }
  }

  const press = (key: string) => {
    if (checking) return
    if (key === 'del') { setPin((p) => p.slice(0, -1)); return }
    if (!key) return
    const next = `${pin}${key}`.slice(0, 6)
    setPin(next)
    if (next.length === 6) void verify(next)
  }

  return (
    <>
      <button type="button" className="ok-admin-hotspot" aria-label="관리자" onClick={() => setOpen(true)} />
      <AnimatePresence>
        {open && (
          <motion.div key="admin" className="ok-modal is-admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="ok-admin lg lg-strong" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <button type="button" className="ok-admin-x lg-press" onClick={close} aria-label="닫기"><X size={20} /></button>
              {!unlocked ? (
                <>
                  <h2>STORE ADMIN</h2>
                  <p>{error ?? '관리자 비밀번호 6자리'}</p>
                  <div className="ok-pin-dots">{Array.from({ length: 6 }, (_, i) => <i key={i} className={i < pin.length ? 'is-on' : ''} />)}</div>
                  <div className="ok-pinpad">
                    {KEYS.map((k, i) => (
                      <button key={i} type="button" className={`lg-press${!k ? ' is-blank' : ''}`} disabled={!k || checking} onClick={() => press(k)}>
                        {k === 'del' ? <Delete size={22} /> : k}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2>STORE ADMIN</h2>
                  <p>Aible 주문 키오스크 · 모락(가상 매장)</p>
                  <div className="ok-admin-actions">
                    <button type="button" className="ok-btn ok-btn--ghost lg-press" onClick={() => { close(); onReset() }}><RotateCcw size={18} /> 처음 화면으로</button>
                    {kiosk?.quitApp && (
                      <button type="button" className="ok-btn ok-btn--danger lg-press" onClick={() => void kiosk.quitApp()}><LogOut size={18} /> 앱 종료</button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
