'use client'

// 인쇄 미리보기 창의 속 — 영업용 데모(…?demo=)에서만 [휴대폰으로 받기] 창 대신 보인다(ColorShareSheet · KxSaveSheet 의 preview).
// 왼쪽: 올리는 결과 그림 그대로(설치 기기에서 인쇄되는 것) / 오른쪽: 안내 · QR · 24시간 안내 · 이 기기에 저장 · 닫기.
// 노트북에는 프린터가 없어 인쇄 대신 미리보기로 보여 준다. 행사 링크(데모 표시 없음)는 예전 창 그대로.

import { useEffect, useState } from 'react'
import { Download, Loader2, RefreshCw, X } from 'lucide-react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { KxCommonText } from '../experience/kx-i18n'
import './print-preview.css'

export const PRINT_PREVIEW_TEXT: Record<KioskLang, { print: string; title: string; note: string; save: string; drawing: string }> = {
  ko: { print: '인쇄하기', title: '인쇄 미리보기', note: '설치 기기에서는 「인쇄하기」를 누르면 바로 인쇄돼요. 지금은 미리보기로 보여 드려요.', save: '이 기기에 저장', drawing: '인쇄할 결과를 만들고 있어요…' },
  en: { print: 'Print', title: 'Print preview', note: 'On an installed kiosk, “Print” prints right away. Here we show you a preview.', save: 'Save to this device', drawing: 'Preparing your printout…' },
  ja: { print: '印刷する', title: '印刷プレビュー', note: '設置機器では「印刷する」を押すとすぐに印刷されます。ここではプレビューでお見せします。', save: 'この端末に保存', drawing: '印刷する結果を準備しています…' },
  'zh-Hans': { print: '打印', title: '打印预览', note: '在安装的设备上按「打印」即可立即打印。这里先为您显示预览。', save: '保存到本设备', drawing: '正在准备打印内容…' },
  'zh-Hant': { print: '列印', title: '列印預覽', note: '在安裝的設備上按「列印」即可立即列印。這裡先為您顯示預覽。', save: '儲存到本裝置', drawing: '正在準備列印內容…' },
}

/** 결과 그림을 미리보기 주소(data:)로 — 풀어 줄 것이 없어 창이 닫혀도 남는 것이 없다. 그림이 바뀌면 다시 읽는다 */
export function useBlobUrl(blob: Blob | null): string | null {
  const [read, setRead] = useState<{ blob: Blob; url: string } | null>(null)
  useEffect(() => {
    if (!blob) return
    let alive = true
    const reader = new FileReader()
    reader.onload = () => { if (alive) setRead({ blob, url: String(reader.result) }) }
    reader.readAsDataURL(blob)
    return () => { alive = false }
  }, [blob])
  return blob && read?.blob === blob ? read.url : null
}

/** 두 창의 겉모양(퍼스널 컬러 셸 · 체험 화면 틀)에 맞춘 class 이름 */
const LOOK = {
  pcs: { card: 'pcs-card', x: 'pcs-x', desc: 'pcs-desc', qr: 'pcs-qr', keep: 'pcs-keep', spin: 'pg-spin', btn: 'ksk-btn', primary: 'ksk-btn ksk-btn-primary' },
  kx: { card: 'kx-sheet-card', x: 'kx-sheet-x', desc: 'kx-sheet-desc', qr: 'kx-sheet-qr', keep: 'kx-sheet-keep', spin: 'kx-spin', btn: 'kx-btn kx-btn--ghost', primary: 'kx-btn kx-btn--primary' },
} as const

export function PrintPreviewCard({ look, lang, c, closeLabel, image, fileName, phase, qr, onRetry, onClose }: {
  look: keyof typeof LOOK
  lang: KioskLang
  c: KxCommonText
  closeLabel: string
  /** 결과 그림 주소(그리는 중이면 null) */
  image: string | null
  /** 이 기기에 저장할 때의 파일 이름 */
  fileName: string
  phase: 'preparing' | 'ready' | 'failed'
  qr: string | null
  onRetry: () => void
  onClose: () => void
}) {
  const p = PRINT_PREVIEW_TEXT[lang]
  const k = LOOK[look]
  return (
    <div className={`${k.card} pp-card`}>
      <button type="button" className={k.x} aria-label={closeLabel} onClick={onClose}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
      <figure className="pp-paper" aria-label={p.title}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={p.title} />
        ) : (
          <p role="status"><Loader2 className={k.spin} size={34} strokeWidth={1.8} aria-hidden="true" />{p.drawing}</p>
        )}
      </figure>
      <div className="pp-side">
        <h2>{p.title}</h2>
        <p className={`${k.desc} pp-note`}>{p.note}</p>
        <div className={`${k.qr} pp-qr`} data-phase={phase}>
          {phase === 'preparing' && <p role="status"><Loader2 className={k.spin} size={30} strokeWidth={1.8} aria-hidden="true" />{c.savePreparing}</p>}
          {phase === 'ready' && qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={c.saveTitle} />
          )}
          {phase === 'failed' && (
            <p role="alert">{c.saveFailed}<button type="button" className={look === 'pcs' ? 'ksk-btn' : 'kx-btn kx-btn--ghost'} onClick={onRetry}><RefreshCw size={20} strokeWidth={1.9} aria-hidden="true" />{c.saveRetry}</button></p>
          )}
        </div>
        <p className="pp-qr-desc">{c.saveDesc}</p>
        <p className={k.keep}>{c.saveKeep}</p>
        <div className="pp-actions">
          {image ? (
            <a className={`${k.btn} pp-save`} href={image} download={fileName}><Download size={20} strokeWidth={2} aria-hidden="true" />{p.save}</a>
          ) : (
            <button type="button" className={`${k.btn} pp-save`} disabled><Download size={20} strokeWidth={2} aria-hidden="true" />{p.save}</button>
          )}
          <button type="button" className={`${k.primary} pp-done`} onClick={onClose}>{phase === 'ready' ? c.saveDone : closeLabel}</button>
        </div>
      </div>
    </div>
  )
}
