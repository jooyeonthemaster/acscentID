// CHEESE! 스튜디오 인화물 — 4×6 세로(1200×1800, 300dpi) 한 장에 찍은 네 컷을 2×2 로. AI 없이 기기 안에서 그린다.
// 배치(2026-11-25): 흔한 셀프사진관 2×2 4×6(my4cut 프레임 템플릿 1080×1620 — 칸 2:3 세로 · 좌우 여백 약 6% · 칸 사이 약 2% · 아래 글자 띠 약 9%)을 바탕으로,
// 칸은 3:4 세로(카메라가 가로라 여럿이 찍혀도 덜 잘리게), 아래 띠는 폰 저장 QR 까지 들어가게 조금 높게.
// 여백은 ANSAN 실물 시험(strip-print.ts 머리말 — 드라이버가 원판을 3~4% 키워 찍어 위아래 약 6~7mm · 좌우 약 4mm 가 잘린다)에 맞췄다.
// 프레임 8종(CHEESE_FRAMES)은 그림 파일 없이 색 · 선 · 글자로만 그린다(행사장 인터넷이 약해도 바로).

import { RESULT_PHOTO_TTL_HOURS } from '@/lib/photobooth/result-photo'
import { bricolage, jetbrains } from './fonts'
import { photoClip, rect, text, today, type Pic } from './print-designs'
import { qrBlock, type StripQr } from './strip-print'

export const CHEESE_W = 1200
export const CHEESE_H = 1800
/** 칸 — 3:4 세로 두 줄 두 칸 */
const SIDE = 60
const TOP = 72
const GAP = 24
const CELL_W = (CHEESE_W - SIDE * 2 - GAP) / 2
const CELL_H = Math.round((CELL_W * 4) / 3)
const BAND_Y = TOP + CELL_H * 2 + GAP
/** 아래 띠 글자 · QR 의 아래 끝(용지 여분 확대에 잘리지 않게) */
const FOOT = 1716
/** 찍은 사진 비율(가로/세로) — 촬영 화면 · 칸 모두 3:4 */
export const CHEESE_SHOT_RATIO = 3 / 4

export interface CheeseFrame {
  id: string
  name: string
  /** 바탕 — 색 하나 또는 [위, 아래] 그라데이션 */
  paper: string | [string, string]
  /** 글자 */
  ink: string
  /** 작은 글자(날짜 · 안내) */
  sub: string
  /** 칸 둘레 가는 선(없으면 선 없음) */
  line?: string
  /** 고르는 화면 타일 이름 아래 작은 점 색 */
  dot: string
}

/** 프레임 8종 — 현대 스튜디오 톤(레트로 아님). 캐릭터 · 무늬 없이 바탕색과 글자색만 */
export const CHEESE_FRAMES: CheeseFrame[] = [
  { id: 'white', name: '퓨어 화이트', paper: '#ffffff', ink: '#111111', sub: '#6b6b6b', line: '#e6e6e6', dot: '#ffffff' },
  { id: 'black', name: '잉크 블랙', paper: '#0d0d0f', ink: '#f6f6f6', sub: '#9a9a9f', dot: '#0d0d0f' },
  { id: 'greige', name: '웜 그레이지', paper: '#e9e3da', ink: '#2a2520', sub: '#7d7368', dot: '#e9e3da' },
  { id: 'butter', name: '버터 크림', paper: '#fbf0cf', ink: '#3a2f12', sub: '#8d7a45', dot: '#fbf0cf' },
  { id: 'sage', name: '세이지 그린', paper: '#dbe4da', ink: '#1f3127', sub: '#5f7566', dot: '#dbe4da' },
  { id: 'sky', name: '더스티 블루', paper: '#dbe6f3', ink: '#1b2a44', sub: '#5e7090', dot: '#dbe6f3' },
  { id: 'blush', name: '블러시 핑크', paper: '#f6e0e2', ink: '#4a2229', sub: '#9a6a71', dot: '#f6e0e2' },
  { id: 'chrome', name: '실버 크롬', paper: ['#f4f5f7', '#c3c7ce'], ink: '#15171b', sub: '#5b6069', line: 'rgba(255,255,255,0.7)', dot: '#d6d9de' },
]

const D = () => bricolage.style.fontFamily
const M = () => jetbrains.style.fontFamily
const K = 'Pretendard, sans-serif'

const cellX = (i: number) => SIDE + (i % 2) * (CELL_W + GAP)
const cellY = (i: number) => TOP + Math.floor(i / 2) * (CELL_H + GAP)

/** 네 컷 한 장(1200×1800) — qr 이 있으면 오른쪽 아래에 폰 저장 QR(인쇄본) */
export function renderCheese(frame: CheeseFrame, shots: Pic[], qr: StripQr | null = null): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CHEESE_W; canvas.height = CHEESE_H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  if (Array.isArray(frame.paper)) {
    const g = ctx.createLinearGradient(0, 0, CHEESE_W * 0.4, CHEESE_H)
    g.addColorStop(0, frame.paper[0]); g.addColorStop(1, frame.paper[1])
    ctx.fillStyle = g; ctx.fillRect(0, 0, CHEESE_W, CHEESE_H)
  } else rect(ctx, 0, 0, CHEESE_W, CHEESE_H, frame.paper)

  for (let i = 0; i < 4; i++) {
    const x = cellX(i), y = cellY(i), pic = shots[i]
    if (pic) photoClip(ctx, pic, x, y, CELL_W, CELL_H, 8, 0.4)
    else rect(ctx, x, y, CELL_W, CELL_H, frame.sub, 8)
    if (frame.line) {
      ctx.save(); ctx.strokeStyle = frame.line; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(x - 1, y - 1, CELL_W + 2, CELL_H + 2, 9); ctx.stroke(); ctx.restore()
    }
  }

  // 아래 띠 — 왼쪽 워드마크 · 스튜디오 · 날짜, 오른쪽 QR(없으면 날짜만 오른쪽에)
  const left = SIDE + 4
  text(ctx, 'CHEESE!', left, BAND_Y + 104, `800 84px ${D()}`, frame.ink, 'left', (c) => { c.fontStretch = 'condensed'; c.letterSpacing = '-1px' })
  text(ctx, `PHOTO STUDIO  ·  ${today()}`, left + 2, BAND_Y + 150, `500 22px ${M()}`, frame.sub, 'left', (c) => { c.letterSpacing = '3px' })
  if (qr) {
    const box = qrBlock(ctx, qr, CHEESE_W - SIDE - 8, FOOT, 6)
    text(ctx, '휴대폰으로 사진 받기', box.x - 18, box.y + box.size / 2 - 4, `700 21px ${K}`, frame.ink, 'right')
    text(ctx, `${RESULT_PHOTO_TTL_HOURS / 24}일 보관 →`, box.x - 18, box.y + box.size / 2 + 26, `500 19px ${K}`, frame.sub, 'right')
  } else {
    text(ctx, 'Say cheese!', CHEESE_W - SIDE - 4, BAND_Y + 104, `italic 600 34px ${D()}`, frame.sub, 'right')
  }
  return canvas
}

/** 고르는 화면 타일(240×360) */
export function cheeseThumb(sheet: HTMLCanvasElement): string {
  const c = document.createElement('canvas')
  c.width = 240; c.height = 360
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(sheet, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

/** 찍은 사진을 3:4 세로로(가운데) — 촬영 미리보기 칸이 3:4 cover 라 손님이 본 그대로 */
export function crop34(src: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
  const w = src instanceof HTMLImageElement ? src.naturalWidth : src.width
  const h = src instanceof HTMLImageElement ? src.naturalHeight : src.height
  const cw = Math.min(w, h * CHEESE_SHOT_RATIO), ch = cw / CHEESE_SHOT_RATIO
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cw); canvas.height = Math.round(ch)
  canvas.getContext('2d')!.drawImage(src, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height)
  return canvas
}
