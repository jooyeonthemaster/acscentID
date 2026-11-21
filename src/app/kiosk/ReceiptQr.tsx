'use client'

// 프린터 없는 매장 기기(안드로이드 키오스크 앱)의 영수증 창 — 인쇄 원판 대신 그 결과를 받는 휴대폰 QR.
// 기존 화면(매장 WOW · 행사 · 퍼스널 컬러 · 타로)의 영수증 창 두 곳(ProgramReceiptModal · 기본 모달)이 같이 쓴다.
// 문구는 체험 모드의 [휴대폰으로 받기] 창과 같다(KX_COMMON).

import { Loader2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import { KX_COMMON } from './experience/kx-i18n'

export type ReceiptQrState = { state: 'uploading' | 'ready' | 'failed'; qr?: string } | null

const box: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 'min(300px, 64vw)',
  aspectRatio: '1',
  margin: '12px auto 6px',
  padding: 12,
  borderRadius: 18,
  background: '#fff',
  boxShadow: '0 12px 32px rgba(0,0,0,.18)',
  color: '#555',
  fontSize: 15,
  textAlign: 'center',
}

export function ReceiptQrPanel({ lang, share, ticket }: { lang: KioskLang; share: ReceiptQrState; ticket?: string | null }) {
  const c = KX_COMMON[lang]
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700 }}>{c.saveDesc}</p>
      <div style={box} data-phase={share?.state ?? 'uploading'}>
        {share?.state === 'ready' && share.qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={share.qr} alt={c.saveTitle} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
        ) : share?.state === 'failed' ? (
          <span role="alert">{c.saveFailed}</span>
        ) : (
          <span role="status" style={{ display: 'grid', placeItems: 'center', gap: 10 }}>
            <Loader2 className="kx-spin" size={30} strokeWidth={1.8} aria-hidden="true" />
            {c.savePreparing}
          </span>
        )}
      </div>
      {ticket && <p style={{ margin: '6px 0 0', fontSize: 15 }}>NO. <strong style={{ fontSize: 26, letterSpacing: '.06em' }}>{ticket}</strong></p>}
      <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.75 }}>{c.saveKeep}</p>
    </div>
  )
}
