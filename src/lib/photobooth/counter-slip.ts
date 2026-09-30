/**
 * 카운터 이용권 쪽지 — 영수증 프린터(OKPOS OK30 = Sewoo LK-T 계열)용 ESC/POS 원본을 브라우저에서 만든다.
 *
 * 카운터 PC 의 인쇄 도우미(scripts/counter-pc/counter-print-helper.ps1)가 이 바이트를 드라이버 없이
 * 프린터로 그대로 넘긴다. 쪽지는 캔버스에 그려 흑백 비트 이미지로 보내므로 글꼴·배치가 화면과 같고,
 * 한 장마다 잘라 준다. 도우미가 없으면 CounterClient 가 브라우저 인쇄로 넘어간다.
 */

import QRCode from 'qrcode'
import { passQrValue } from './qr-scan'

/** 헤드 폭 — OK30 은 한 줄 512점(180dpi·72mm). 더 넓게 보내면 오른쪽이 잘린다 */
export const SLIP_DOTS = 512
const DPI = 180
const mm = (value: number) => Math.round((value * DPI) / 25.4)
const pt = (value: number) => (value * DPI) / 72
/** 이 값보다 어두우면 검정 — 감열지는 중간톤이 없다 */
const THRESHOLD = 150
/** 한 번에 보내는 래스터 줄 수 (버퍼가 작은 기종 대비) */
const BAND_ROWS = 128

export interface SlipContent {
  title: string
  code: string
  /** 부스 카메라로 읽는 QR 에 넣을 6자리 번호 */
  qrCode?: string
  usage: string
  event?: string | null
  issued: string
}

/** 쪽지 안내 문구 — 캔버스 쪽지와 브라우저 인쇄 쪽지가 같이 쓴다 */
export const SLIP_GUIDE = ['포토부스에서 촬영 방식을 고른 뒤', 'QR을 카메라에 보여 주거나 번호를 입력하세요.']

/** 이용권 QR 모듈 (true = 검정). 번호만 담아서 21칸짜리 작은 QR 이 나온다 */
export function passQrModules(code: string) {
  const { modules } = QRCode.create(passQrValue(code), { errorCorrectionLevel: 'M' })
  return { size: modules.size, dark: (row: number, col: number) => !!modules.get(row, col) }
}

/** 브라우저 인쇄 쪽지용 — 한 칸 = 1 인 SVG path */
export function passQrPath(code: string) {
  const { size, dark } = passQrModules(code)
  let d = ''
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) if (dark(row, col)) d += `M${col} ${row}h1v1h-1z`
  return { size, d }
}

function headingFamily() {
  const fromPage = getComputedStyle(document.body).getPropertyValue('--font-heading-serif').trim()
  return `${fromPage ? `${fromPage}, ` : ''}'Pretendard Variable', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif`
}

/** 쪽지 한 장을 512점 폭 캔버스에 그린다. 높이는 내용에 맞춘다(아래 여백만큼 용지 절약) */
export async function drawSlip(slip: SlipContent): Promise<HTMLCanvasElement> {
  const family = headingFamily()
  await Promise.all([400, 700, 800, 900].map((weight) => document.fonts.load(`${weight} 40px ${family}`).catch(() => [])))

  const canvas = document.createElement('canvas')
  canvas.width = SLIP_DOTS
  canvas.height = mm(150)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const cx = SLIP_DOTS / 2
  let y = mm(1)

  const text = (value: string, size: number, weight: number, gapAfter: number, spacing = 0) => {
    ctx.font = `${weight} ${pt(size)}px ${family}`
    ctx.letterSpacing = `${spacing * pt(size)}px`
    // letterSpacing 은 마지막 글자 뒤에도 붙으므로 그만큼 오른쪽으로 밀어 가운데를 맞춘다
    ctx.fillText(value, cx + (spacing * pt(size)) / 2, y)
    y += Math.round(pt(size) * 1.25) + gapAfter
  }
  const dashed = (gapBefore: number, gapAfter: number) => {
    y += gapBefore
    for (let x = 0; x < SLIP_DOTS; x += 12) ctx.fillRect(x, y, 7, 2)
    y += 2 + gapAfter
  }

  text("AC'SCENT PHOTO", 9, 700, mm(1.5), 0.3)
  text(slip.title, 15, 800, 0)
  dashed(mm(3), mm(3))
  text('이용권 번호', 9, 400, mm(0.5))
  text(slip.code, 34, 900, 0, 0.08)
  if (slip.qrCode) {
    // 칸을 정수 점으로 그려야 흐림 없이 또렷하다 — 부스 카메라가 멀리서도 읽게 약 27mm
    const { size, dark } = passQrModules(slip.qrCode)
    const cell = Math.max(4, Math.floor(mm(27) / size))
    const left = Math.round(cx - (size * cell) / 2)
    y += mm(2)
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) if (dark(row, col)) ctx.fillRect(left + col * cell, y + row * cell, cell, cell)
    y += size * cell + mm(1)
  }
  dashed(mm(2), mm(3))
  text(slip.usage, 10.5, 700, mm(1.5))
  text(SLIP_GUIDE[0], 9.5, 400, 0)
  text(SLIP_GUIDE[1], 9.5, 400, mm(1.5))
  if (slip.event) text(`♥ ${slip.event}`, 9, 400, mm(1.5))
  text(slip.issued, 8, 400, 0)

  const trimmed = document.createElement('canvas')
  trimmed.width = SLIP_DOTS
  trimmed.height = Math.min(canvas.height, y + mm(3))
  trimmed.getContext('2d')!.drawImage(canvas, 0, 0)
  return trimmed
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** 쪽지 캔버스들 → ESC/POS (GS v 0 래스터, 장마다 조금 올린 뒤 자르기) */
export function slipsToEscPos(canvases: HTMLCanvasElement[]): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.of(0x1b, 0x40)]
  for (const canvas of canvases) {
    const { width, height } = canvas
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
    const bytesPerRow = Math.ceil(Math.min(width, SLIP_DOTS) / 8)
    for (let top = 0; top < height; top += BAND_ROWS) {
      const rows = Math.min(BAND_ROWS, height - top)
      const band = new Uint8Array(8 + bytesPerRow * rows)
      band.set([0x1d, 0x76, 0x30, 0x00, bytesPerRow & 255, bytesPerRow >> 8, rows & 255, rows >> 8])
      for (let row = 0; row < rows; row++) {
        for (let x = 0; x < bytesPerRow * 8 && x < width; x++) {
          const i = ((top + row) * width + x) * 4
          const luminance = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
          if (luminance < THRESHOLD) band[8 + row * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7)
        }
      }
      parts.push(band)
    }
    parts.push(Uint8Array.of(0x1d, 0x56, 0x42, 0x00))
  }
  return concat(parts)
}

/** 카운터 PC 인쇄 도우미 주소 (scripts/counter-pc/counter-print-helper.ps1 과 같은 포트) */
export const PRINT_HELPER_URL = 'http://127.0.0.1:9131'

export interface HelperStatus {
  ok: boolean
  printer?: string
  error?: string
}

export async function helperStatus(timeoutMs = 1500): Promise<HelperStatus | null> {
  try {
    const res = await fetch(`${PRINT_HELPER_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) })
    return (await res.json()) as HelperStatus
  } catch {
    return null
  }
}

/** 도우미로 보낸다. 도우미가 없으면 null(브라우저 인쇄로 넘길 것), 도우미가 실패를 알리면 오류를 던진다 */
export async function printViaHelper(bytes: Uint8Array): Promise<true | null> {
  let res: Response
  try {
    res = await fetch(`${PRINT_HELPER_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes as BodyInit,
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return null
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error || '영수증 프린터로 보내지 못했습니다')
  return true
}
