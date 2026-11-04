// 결과 올리기 — "휴대폰으로 받기" 창과 영수증의 QR 이 같이 쓴다. 손님이 받기·출력을 눌렀을 때만 서버에 올라간다(24시간 보관).

import type { KioskLang } from '@/lib/kiosk/i18n'
import { SHARE_TTL_HOURS, type ShareKind, type ShareType } from '@/lib/kiosk/share'
import { publicOrigin } from '@/lib/kiosk/public-origin'

export interface KxShareFile {
  /** 영문 소문자·숫자·하이픈 + 확장자(jpg·png·wav·pdf) */
  name: string
  type: ShareType
  /** 휴대폰 화면에 보이는 이름 */
  label: string
  blob: Blob
}

export interface KxShare {
  /** 휴대폰에서 여는 주소 */
  url: string
  /** 그 주소의 QR(data: 주소) */
  qr: string
  /** 이때까지 받을 수 있다(ms) */
  expiresAt: number
}

const blobBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

/** 결과 파일을 올리고 받는 주소와 QR 을 만든다 */
export async function uploadShare(kind: ShareKind, lang: KioskLang, files: KxShareFile[]): Promise<KxShare> {
  const started = Date.now()
  const body = { kind, lang, files: await Promise.all(files.map(async (file) => ({ name: file.name, type: file.type, label: file.label, data: await blobBase64(file.blob) }))) }
  const response = await fetch('/api/kiosk/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(40000) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.path) throw new Error(result?.error || 'share failed')
  // 폰이 여는 주소 — 화면을 연 공개 주소(행사 전용 주소 포함), 기기 안 서버면 배포 주소(public-origin.ts)
  const url = `${publicOrigin()}${result.path}`
  const QRCode = (await import('qrcode')).default
  return { url, qr: await QRCode.toDataURL(url, { width: 520, margin: 1 }), expiresAt: started + SHARE_TTL_HOURS * 60 * 60 * 1000 }
}
