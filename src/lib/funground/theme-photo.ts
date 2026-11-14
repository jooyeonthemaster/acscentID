// 펀그라운드 별내 B안 1. 테마 포토 「THEME!」 — 테마 목록과 4×6 합성(기기 안에서만, 외부 AI 호출 없음).
// 한 장 = 테마 배경(사람 뒤) + 오려 낸 사람(그대로 — 옷 · 얼굴 · 색을 바꾸지 않는다) + 앞 장식(사람 앞).
// 배경 그림은 개발 중 한 번 만들어 public/assets/booth-programs/funground-theme/<id>.webp 로 둔다(scripts/funground-theme-backgrounds.ts).
// 그 파일이 없으면 이 파일의 코드 그림(theme-art.ts)으로 그린다 — 데모가 그림 없이도 끝까지 돈다. 앞 장식은 늘 코드 그림.

import { PRINT, drawCoverFocal, drawCutoutPerson } from '@/lib/photobooth/compose'
import { drawThemeBackground, drawThemeFront, type ArtContext } from './theme-art'

export type ThemeId = 'idol' | 'stadium' | 'magic' | 'space' | 'park' | 'funground'

export interface ThemeInfo {
  id: ThemeId
  name: string
  /** 카드 아래 한 줄 */
  line: string
  /** 화면 대표색(고른 카드 · 단추) */
  color: string
  /** 사람 뒤 은은한 빛(오려 낸 경계를 배경에 녹인다) */
  glow: string
}

export const THEMES: ThemeInfo[] = [
  { id: 'idol', name: '아이돌 무대', line: '조명 · 꽃가루 · LED 무대', color: '#d63fa8', glow: '#ff7ad9' },
  { id: 'stadium', name: '경기장', line: '야간 조명 · 관중석 · 우승 깃발', color: '#1f8a4c', glow: '#fff1b8' },
  { id: 'magic', name: '마법 학교', line: '떠 있는 촛불 · 달빛 창문', color: '#5b3fc4', glow: '#ffd27a' },
  { id: 'space', name: '우주 정거장', line: '둥근 창 · 행성 · 별빛', color: '#2a63d6', glow: '#7fd8ff' },
  { id: 'park', name: '놀이공원', line: '대관람차 · 회전목마 · 풍선', color: '#ff7a3d', glow: '#ffffff' },
  { id: 'funground', name: '펀그라운드 기념', line: 'FUN GROUND 별내 기념 프레임', color: '#ff6b2c', glow: '#ffffff' },
]

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeInfo>

/** 미리 만든 배경 그림 자리(1200×1800 webp) — 파일이 있는지는 page.tsx 가 빌드 때 확인해 넘긴다 */
export const THEME_ART_DIR = 'public/assets/booth-programs/funground-theme'
export const themeArtUrl = (id: ThemeId) => `/assets/booth-programs/funground-theme/${id}.webp`

/** 인화 날짜 표기 — 2026.11.14 */
export function printDate(d = new Date()): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 캔버스 글꼴 — 화면 본문 서체(Wanted Sans, next/font 이름)를 먼저, 없으면 시스템 한글 서체 */
export async function loadThemeFont(): Promise<string> {
  const fallback = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif'
  if (typeof document === 'undefined') return fallback
  const wanted = getComputedStyle(document.body).getPropertyValue('--font-wanted').trim()
  const family = wanted ? `${wanted}, ${fallback}` : fallback
  await Promise.all(['800 40px', '600 40px'].map((w) => document.fonts.load(`${w} ${family}`, 'FUN 별내 2026').catch(() => undefined)))
  return family
}

/** 배경 그림 한 장 불러오기(같은 출처) — 실패하면 null(코드 그림으로) */
export function loadThemeArt(id: ThemeId): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = themeArtUrl(id)
  })
}

/** 테마 견본(사람 없이) — 고르기 카드 · 카메라 옆 작은 그림. 1200×1800 좌표로 그려 줄인다 */
export function renderThemeThumb(theme: ThemeInfo, width: number, font: string, art: HTMLImageElement | null): string {
  const scale = width / PRINT.W
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PRINT.W * scale)
  canvas.height = Math.round(PRINT.H * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  const a: ArtContext = { ctx, W: PRINT.W, H: PRINT.H, font, date: printDate(), theme }
  if (art) drawCoverFocal(ctx, art, 0, 0, PRINT.W, PRINT.H)
  else drawThemeBackground(a)
  drawThemeFront(a)
  return canvas.toDataURL('image/jpeg', 0.86)
}

export interface ComposeInput {
  theme: ThemeInfo
  /** cutoutPerson 결과(사람만 남은 투명 캔버스, 내용에 맞춰 잘림) */
  cutout: HTMLCanvasElement
  /** 미리 만든 배경 그림(없으면 코드 그림) */
  art: HTMLImageElement | null
  font: string
  date?: string
}

/** 사람 무리의 아래 끝 — 인화 아래에서 이만큼 위 */
export const PEOPLE_BOTTOM = 110

/**
 * 사람 자리 — 무리(1~4명) 전체를 아래 가운데에 앉힌다.
 * 가로는 인화 폭의 90%, 세로는 64%까지(위 1/3 은 테마 장면이 보이게). 원본보다 2.2배 넘게 키우면 흐려져 거기서 멈춘다.
 * 아래 끝은 인화 아래에서 PEOPLE_BOTTOM 위 — 원본 사진 테두리에서 잘린 몸(cutoutPerson 이 흐리게 처리)은 앞 장식의 아래 띠(불투명)에 가리고,
 * 사진 아래쪽에 있는 얼굴(앞줄에 앉은 사람)은 띠보다 위에 온다. 앞 장식의 아래 띠는 모두 인화 아래 150px 안쪽에서만 불투명하게 둔다.
 */
export function placePeople(cw: number, ch: number) {
  const maxW = PRINT.W * 0.9
  const maxH = PRINT.H * 0.64
  const scale = Math.min(maxW / cw, maxH / ch, 2.2)
  const width = cw * scale
  const height = ch * scale
  const bottom = PRINT.H - PEOPLE_BOTTOM
  return { cx: PRINT.W / 2, cy: bottom - height / 2, width, height, bottom }
}

/** 테마 배경 + 사람 + 앞 장식 → 1200×1800 캔버스 */
export function composeThemePhoto({ theme, cutout, art, font, date = printDate() }: ComposeInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PRINT.W
  canvas.height = PRINT.H
  const ctx = canvas.getContext('2d')!
  const a: ArtContext = { ctx, W: PRINT.W, H: PRINT.H, font, date, theme }

  // ① 배경
  if (art) drawCoverFocal(ctx, art, 0, 0, PRINT.W, PRINT.H)
  else drawThemeBackground(a)

  // ② 사람 — 뒤에 테마 빛을 흐리게 깔아 오려 낸 경계를 배경에 녹이고, 바닥 그림자 + 드롭섀도.
  //    사람 그림 자체(얼굴 · 옷 · 피부색)는 그대로 그린다 — 색 보정(toneColor)도 쓰지 않는다.
  const p = placePeople(cutout.width, cutout.height)
  drawBackGlow(ctx, cutout, p, theme.glow)
  ctx.save()
  const floor = ctx.createRadialGradient(p.cx, p.bottom - 40, 10, p.cx, p.bottom - 40, p.width * 0.62)
  floor.addColorStop(0, 'rgba(0,0,0,0.42)')
  floor.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = floor
  ctx.fillRect(0, p.bottom - 260, PRINT.W, 260)
  ctx.restore()
  drawCutoutPerson(ctx, cutout, p.cx, p.cy, p.width, 0, { shadow: true })

  // ③ 앞 장식 — 사람이 있는 자리는 비운다(꽃가루 · 촛불 · 풍선 · 스티커가 얼굴을 가리지 않게)
  drawThemeFront({ ...a, people: peopleHitTest(cutout, p) })
  return canvas
}

/** 합성한 사람 자리를 1/10 격자로 — (x, y) 반경 r 안에 사람이 조금이라도 있으면 true */
function peopleHitTest(cutout: HTMLCanvasElement, p: ReturnType<typeof placePeople>) {
  const S = 10
  const gw = Math.ceil(PRINT.W / S)
  const gh = Math.ceil(PRINT.H / S)
  const grid = document.createElement('canvas')
  grid.width = gw
  grid.height = gh
  const g = grid.getContext('2d', { willReadFrequently: true })
  if (!g) return () => false
  // 그림자 · 흐린 경계까지 넉넉히 — 조금 크게 그린다
  const pad = 1.04
  g.drawImage(cutout, (p.cx - (p.width * pad) / 2) / S, (p.cy - (p.height * pad) / 2) / S, (p.width * pad) / S, (p.height * pad) / S)
  const alpha = g.getImageData(0, 0, gw, gh).data
  return (x: number, y: number, r: number) => {
    const x0 = Math.max(0, Math.floor((x - r) / S))
    const x1 = Math.min(gw - 1, Math.ceil((x + r) / S))
    const y0 = Math.max(0, Math.floor((y - r) / S))
    const y1 = Math.min(gh - 1, Math.ceil((y + r) / S))
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) if (alpha[(gy * gw + gx) * 4 + 3] > 16) return true
    return false
  }
}

/** 사람 실루엣을 테마 빛 색으로 칠해 흐리게 뒤에 깐다(사람 앞에는 아무것도 칠하지 않는다) */
function drawBackGlow(ctx: CanvasRenderingContext2D, cutout: HTMLCanvasElement, p: ReturnType<typeof placePeople>, color: string) {
  const off = document.createElement('canvas')
  off.width = Math.max(1, Math.round(p.width))
  off.height = Math.max(1, Math.round(p.height))
  const o = off.getContext('2d')
  if (!o) return
  o.drawImage(cutout, 0, 0, off.width, off.height)
  o.globalCompositeOperation = 'source-in'
  o.fillStyle = color
  o.fillRect(0, 0, off.width, off.height)
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.filter = `blur(${Math.round(Math.max(14, p.width * 0.025))}px)`
  ctx.drawImage(off, p.cx - p.width / 2, p.cy - p.height / 2, p.width, p.height)
  ctx.restore()
}
