// 인화물 오른쪽 아래 폰 다운로드 QR(행사 모드) — 완성하기를 누르면
//   1) QR 없는 원판을 서버에 올려 사진 주소를 받고(/api/photobooth/result, 7일 보관)
//   2) 그 주소로 QR 을 만들어 같은 디자인에 넣은 원판을 인쇄·결과 화면에 쓴다.
// 손님 폰에 저장되는 사진에는 QR 이 없다. [폰으로 받기] 버튼도 같은 주소를 쓴다(두 번 올리지 않는다).
// 레트로·맥(BoothClient)과 클래식(BoothClassic)이 같이 쓴다.

import QRCode from 'qrcode'
import { drawIdolDesign, type Picture, type PrintQr } from './idol-layouts'
import type { IdolConcept } from './idol-concepts'

/** 인화 원판 크기 — 부스 CANVAS_W/H 와 같다 */
const W = 1200, H = 1800

export interface IdolPrintArgs {
  concept: IdolConcept
  designId: string | null
  pics: { main: Picture; before: Picture | null }
  event: string
}

/** 디자인 한 장을 새 캔버스에 그려 JPEG 주소로 */
export function renderIdolPrint(args: IdolPrintArgs, qr: PrintQr): string {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  drawIdolDesign(canvas.getContext('2d')!, args.concept, args.designId, args.pics, args.event, qr)
  return canvas.toDataURL('image/jpeg', 0.95)
}

/** 완성 사진을 올리고 폰에서 열 주소(언어 포함)를 받는다 — 서버가 촬영 기록(shotId)으로 요청을 확인한다 */
export async function uploadResultPhoto(shotId: string, imageBase64: string): Promise<string> {
  const res = await fetch('/api/photobooth/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shotId, imageBase64 }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || typeof data.path !== 'string') throw new Error(data.error || `업로드 실패 (${res.status})`)
  return data.path
}

/** 인쇄용 QR — 오류 정정 M(인화지 긁힘·접힘에 조금 강하게), 여백은 카드가 맡는다 */
export async function makePrintQr(url: string): Promise<{ qrDataUrl: string; image: HTMLImageElement }> {
  const qrDataUrl = await QRCode.toDataURL(url, { width: 672, margin: 1, errorCorrectionLevel: 'M' })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('QR 이미지를 만들지 못했어요'))
    img.src = qrDataUrl
  })
  return { qrDataUrl, image }
}
