'use client'

// POST! 우체통 — 한 번 찍은 사진으로 그림엽서 앞면(큰 사진) + 얼굴 우표(같은 사진에서 얼굴만)를 만든다.
// 얼굴은 AI 로 바꾸지 않는다 — 자르기만.
import { faceRectsInCell } from '@/lib/booth/face-detect'

/** 엽서 앞면 사진 칸(1112×1000) 비율 */
export const FRONT_W = 1112
export const FRONT_H = 1000
/** 우표 안쪽 비율(200×254) */
const STAMP_RATIO = 200 / 254

function crop(src: HTMLCanvasElement, x: number, y: number, w: number, h: number, outW: number, outH: number) {
  const c = document.createElement('canvas')
  c.width = outW
  c.height = outH
  c.getContext('2d')!.drawImage(src, x, y, w, h, 0, 0, outW, outH)
  return c.toDataURL('image/jpeg', 0.92)
}

export async function makePhotos(shot: HTMLCanvasElement): Promise<{ front: string; stamp: string; faces: number }> {
  const W = shot.width, H = shot.height
  // 앞면 — 가운데를 1112:1000 으로
  const want = FRONT_W / FRONT_H
  let fw = W, fh = W / want
  if (fh > H) { fh = H; fw = H * want }
  const fx = (W - fw) / 2, fy = (H - fh) / 2
  const front = crop(shot, fx, fy, fw, fh, FRONT_W, FRONT_H)

  // 우표 — 얼굴들을 모두 담는 칸(머리 위 · 턱 아래 여유)
  const rects = (await faceRectsInCell(shot, 0, 0, W, H)).filter((r) => r.x + r.w > fx && r.x < fx + fw)
  let sx: number, sy: number, sw: number, sh: number
  if (rects.length) {
    const x0 = Math.min(...rects.map((r) => r.x)), y0 = Math.min(...rects.map((r) => r.y))
    const x1 = Math.max(...rects.map((r) => r.x + r.w)), y1 = Math.max(...rects.map((r) => r.y + r.h))
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    sw = Math.max((x1 - x0) * 1.25, (y1 - y0) * 1.25 * STAMP_RATIO)
    sh = sw / STAMP_RATIO
    sx = cx - sw / 2
    sy = cy - sh * 0.45
  } else {
    sh = H * 0.8; sw = sh * STAMP_RATIO; sx = (W - sw) / 2; sy = H * 0.05
  }
  // 사진 밖으로 나가지 않게
  if (sw > W) { sw = W; sh = sw / STAMP_RATIO }
  if (sh > H) { sh = H; sw = sh * STAMP_RATIO }
  sx = Math.max(0, Math.min(W - sw, sx))
  sy = Math.max(0, Math.min(H - sh, sy))
  const stamp = crop(shot, sx, sy, sw, sh, 400, 508)
  return { front, stamp, faces: rects.length }
}
