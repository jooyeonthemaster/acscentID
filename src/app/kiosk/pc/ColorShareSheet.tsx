'use client'

// 퍼스널 컬러 [휴대폰으로 받기] — 노트북 가로 화면(/kiosk/pc/color)에는 영수증 프린터가 없어 결과를 QR 로 받는다.
// 체험 모드의 KxSaveSheet 와 같은 흐름: 열리면 결과 카드를 그려 올리고(손님이 누른 것만, 24시간) QR 을 보여 준다.
// 같은 결과는 한 번만 올린다 — 닫았다 다시 열면 같은 QR.

import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, X } from 'lucide-react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import { uploadShare, type KxShare } from '../experience/kx-share'
import { KX_COMMON } from '../experience/kx-i18n'

export function ColorShareSheet({ open, lang, cacheKey, build, label, closeLabel, onClose }: {
  open: boolean
  lang: KioskLang
  /** 결과가 바뀌면 달라지는 값 — 같으면 다시 올리지 않는다 */
  cacheKey: string
  build: () => Promise<Blob>
  /** 휴대폰 화면에 보이는 파일 이름 */
  label: string
  closeLabel: string
  onClose: () => void
}) {
  const c = KX_COMMON[lang]
  const [made, setMade] = useState<{ key: string; share: KxShare | null } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const kept = useRef(new Map<string, KxShare>())
  const builder = useRef(build)
  useEffect(() => { builder.current = build }, [build])
  const run = `${cacheKey}#${attempt}`

  useEffect(() => {
    if (!open) return
    let alive = true
    const ready = kept.current.get(cacheKey)
    if (ready && ready.expiresAt > Date.now() + 60_000) {
      setMade({ key: run, share: ready })
      return
    }
    void (async () => {
      try {
        const blob = await builder.current()
        const share = await uploadShare('color', lang, [{ name: 'personal-color.jpg', type: 'image/jpeg', label, blob }])
        kept.current.set(cacheKey, share)
        if (alive) setMade({ key: run, share })
      } catch (error) {
        console.error('[kiosk] 퍼스널 컬러 결과를 올리지 못했습니다:', error)
        if (alive) setMade({ key: run, share: null })
      }
    })()
    return () => { alive = false }
  }, [open, cacheKey, run, lang, label])

  if (!open) return null
  const phase = made?.key !== run ? 'preparing' : made.share ? 'ready' : 'failed'
  return (
    <div className="pcs-sheet" role="dialog" aria-modal="true" aria-label={c.saveTitle}>
      <div className="pcs-card">
        <button type="button" className="pcs-x" aria-label={closeLabel} onClick={onClose}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
        <h2>{c.saveTitle}</h2>
        <p className="pcs-desc">{c.saveDesc}</p>
        <div className="pcs-qr" data-phase={phase}>
          {phase === 'preparing' && <p role="status"><Loader2 className="pg-spin" size={34} strokeWidth={1.8} aria-hidden="true" />{c.savePreparing}</p>}
          {phase === 'ready' && made?.share && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={made.share.qr} alt={c.saveTitle} />
          )}
          {phase === 'failed' && (
            <p role="alert">{c.saveFailed}<button type="button" className="ksk-btn" onClick={() => setAttempt((n) => n + 1)}><RefreshCw size={20} strokeWidth={1.9} aria-hidden="true" />{c.saveRetry}</button></p>
          )}
        </div>
        <p className="pcs-keep">{c.saveKeep}</p>
        <button type="button" className="ksk-btn ksk-btn-primary pcs-done" onClick={onClose}>{phase === 'ready' ? c.saveDone : closeLabel}</button>
      </div>
    </div>
  )
}
