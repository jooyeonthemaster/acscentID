/**
 * 부스 카메라로 QR 읽기 — 포토카드 뒷면 QR 과 카운터 이용권 쪽지 QR 이 같이 쓴다.
 *
 * 브라우저 내장 BarcodeDetector 가 가장 빠르지만 윈도우 크롬에는 없는 경우가 많다(매장 부스 PC 도 없음).
 * 그때는 jsQR(순수 JS)로 폴백해서 어떤 기기에서든 카메라 스캔이 되게 한다.
 */

export type QrSource = HTMLVideoElement | HTMLCanvasElement

/** 브라우저 내장 QR 인식 API (지원하지 않는 환경이 있어 직접 좁게 선언) */
type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}

const sourceSize = (src: QrSource) =>
  src instanceof HTMLVideoElement ? { w: src.videoWidth, h: src.videoHeight } : { w: src.width, h: src.height }

export interface QrReader {
  read: (source: QrSource) => Promise<string | null>
  /** 다음 프레임까지 쉬는 시간 — jsQR 은 무거워서 더 자주 돌리면 화면이 버벅인다 */
  intervalMs: number
}

export async function createQrReader(): Promise<QrReader> {
  const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorLike }).BarcodeDetector
  if (Detector) {
    try {
      const detector = new Detector({ formats: ['qr_code'] })
      return {
        read: async (source) => (await detector.detect(source))[0]?.rawValue ?? null,
        intervalMs: 350,
      }
    } catch {
      // 폴백으로
    }
  }
  // jsQR — 캔버스로 프레임을 떠서 직접 디코딩 (느리지만 어디서나 동작)
  const jsQR = (await import('jsqr')).default
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  /** 원본의 (sx,sy,sw,sh) 영역을 긴 변 640px 이하로 떠서 읽는다 — 더 크면 디코딩이 실시간으로 안 돈다 */
  const decode = (source: QrSource, sx: number, sy: number, sw: number, sh: number) => {
    if (!ctx) return null
    const scale = Math.min(1, 640 / Math.max(sw, sh))
    canvas.width = Math.round(sw * scale)
    canvas.height = Math.round(sh * scale)
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
  return {
    read: async (source) => {
      const { w, h } = sourceSize(source)
      if (!w || !h) return null
      // 전체 화면에서 못 찾으면 가운데(조준 칸 둘레)만 원래 해상도로 한 번 더 — 멀리서 댄 작은 QR 도 읽힌다
      const side = Math.round(Math.min(w, h) * 0.6)
      return decode(source, 0, 0, w, h) ?? decode(source, Math.round((w - side) / 2), Math.round((h - side) / 2), side, side)
    },
    intervalMs: 220,
  }
}

// ── 카운터 이용권 쪽지 QR ─────────────────────────────────
// 내용은 번호뿐이라 손님이 폰으로 찍어도 아무 일도 없다(번호를 입력하는 것과 같은 권한).

const PASS_QR_PREFIX = 'ACSPASS:'

export const passQrValue = (code: string) => `${PASS_QR_PREFIX}${code}`

/** 이용권 QR 이면 6자리 번호, 아니면(포토카드 QR 등) null */
export function parsePassQr(value: string): string | null {
  const match = value.trim().match(/^ACSPASS:(\d{6})$/i)
  return match ? match[1] : null
}
