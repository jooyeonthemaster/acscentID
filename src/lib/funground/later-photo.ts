// 펀그라운드 별내 B안 타임캡슐 포토 「LATER!」 — 열어 볼 때 · 미래 장면 · 한마디 목록과 4×6 합성(기기 안에서만, 외부 AI 호출 없음).
// 한 장 = 미래 장면 배경(사람 뒤) + 오려 낸 사람(그대로 — 얼굴 · 옷 · 색을 바꾸지 않는다, AI 로 나이를 바꾸지 않는다)
//       + 앞(반짝이 · 타임캡슐 틀 · 위 편지 카드 · 아래 「20XX년 X월 X일에 다시 열어 보세요」 도장).
// 사람 분리 · 사람 층 · 얼굴 피하기는 THEME!(theme-photo.ts)과 같은 함수. 배경 그림은 개발 중 한 번 만든 webp
// (우주 정거장 = THEME! 배경 그대로, 미래 도시 · 하늘 위 학교 = scripts/funground-later-backgrounds.ts) — 없으면 코드 그림.

import { PRINT, drawCoverFocal } from '@/lib/photobooth/compose'
import { drawThemeBackground } from './theme-art'
import { THEME_BY_ID, drawPeople, loadArtImage, peopleHitTest, placePeople, printDate } from './theme-photo'
import { LATER_LAYOUT, drawLaterBackground, drawLaterFront, type LaterArtContext, type LaterBgId, type LaterTexts } from './later-art'

export type LaterYears = 10 | 20
export const LATER_YEARS: LaterYears[] = [10, 20]

export type LaterSceneId = 'space' | 'city' | 'sky'

export interface LaterScene {
  id: LaterSceneId
  name: string
  /** 카드 아래 한 줄 */
  line: string
  /** 화면 대표색 */
  color: string
  /** 사람 뒤 은은한 빛 */
  glow: string
  /** 미리 만든 배경(public/ 아래 경로) */
  art: string
}

export const LATER_SCENES: LaterScene[] = [
  { id: 'space', name: '우주 정거장', line: '둥근 창 너머 행성 · 별빛', color: '#2a63d6', glow: '#7fd8ff', art: 'assets/booth-programs/funground-theme/space.webp' },
  { id: 'city', name: '미래 도시', line: '숲이 자라는 빌딩 · 하늘 열차', color: '#1f9a72', glow: '#fff1d6', art: 'assets/booth-programs/funground-later/city.webp' },
  { id: 'sky', name: '하늘 위 학교', line: '구름 위 섬 · 무지개 · 열기구', color: '#e0567f', glow: '#ffffff', art: 'assets/booth-programs/funground-later/sky.webp' },
]

export const LATER_SCENE_BY_ID = Object.fromEntries(LATER_SCENES.map((s) => [s.id, s])) as Record<LaterSceneId, LaterScene>

/** 미래의 나에게 한마디 — 미리 쓴 말에서 고른다(글자 입력 없음) */
export const LATER_MESSAGES = [
  '지금처럼 웃고 있니?',
  '좋아하는 일을 하고 있기를!',
  '오늘의 우리를 기억해 줘',
  '꿈에 한 걸음 더 가까워졌니?',
  '힘들 땐 오늘을 떠올려 봐',
  '여전히 멋지게 지내고 있지?',
] as const

export const laterArtUrl = (scene: LaterScene) => `/${scene.art}`

/** 화면 대표색(시작 · 고르기) */
export const LATER_TONE = '#5b55d6'

/** 미래 장면 그림 한 장 불러오기(같은 출처) — 실패하면 null(코드 그림으로) */
export function loadLaterArt(id: LaterSceneId): Promise<HTMLImageElement | null> {
  return loadArtImage(laterArtUrl(LATER_SCENE_BY_ID[id]))
}

/** 열어 볼 날 — 오늘에서 N년 뒤 같은 날(2월 29일은 3월 1일로 넘어간다) */
export function openDate(years: LaterYears, today = new Date()): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setFullYear(d.getFullYear() + years)
  return d
}

/** 2036년 11월 14일 */
export function koreanDate(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 4×6 위 글 — 카드 · 도장 */
export function laterTexts({ years, message, scene, today = new Date() }: { years: LaterYears; message: string; scene: LaterScene; today?: Date }): LaterTexts {
  const open = openDate(years, today)
  return {
    to: `To. ${open.getFullYear()}년의 나에게`,
    message,
    from: `From. ${koreanDate(today)}의 나`,
    openYear: open.getFullYear(),
    openLine: `${koreanDate(open)}에 다시 열어 보세요`,
    tag: `LATER! · ${scene.name}`,
    shotOn: `찍은 날 ${printDate(today)}`,
  }
}

function artContext(ctx: CanvasRenderingContext2D, scene: LaterScene, font: string): LaterArtContext {
  return { ctx, W: PRINT.W, H: PRINT.H, font, color: scene.color, glow: scene.glow }
}

/** 배경 — 미리 만든 그림, 없으면 코드 그림(우주 정거장은 THEME! 코드 그림) */
function drawBackground(a: LaterArtContext, scene: LaterScene, art: HTMLImageElement | null, font: string) {
  if (art) drawCoverFocal(a.ctx, art, 0, 0, PRINT.W, PRINT.H)
  else if (scene.id === 'space') {
    a.ctx.save()
    drawThemeBackground({ ctx: a.ctx, W: PRINT.W, H: PRINT.H, font, date: printDate(), theme: THEME_BY_ID.space })
    a.ctx.restore()
  } else drawLaterBackground(a, scene.id as LaterBgId)
}

export interface LaterInput {
  scene: LaterScene
  years: LaterYears
  message: string
  /** 미리 만든 배경 그림(없으면 코드 그림) */
  art: HTMLImageElement | null
  font: string
  today?: Date
}

/** 견본(사람 없이) — 장면 카드 · 한마디 미리보기. 1200×1800 좌표로 그려 줄인다 */
export function renderLaterPreview({ width, ...input }: LaterInput & { width: number }): string {
  const scale = width / PRINT.W
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PRINT.W * scale)
  canvas.height = Math.round(PRINT.H * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  const a = artContext(ctx, input.scene, input.font)
  drawBackground(a, input.scene, input.art, input.font)
  drawLaterFront(a, laterTexts(input))
  return canvas.toDataURL('image/jpeg', 0.86)
}

/**
 * 미래 장면 + 사람 + 타임캡슐 틀 · 편지 카드 · 도장 → 1200×1800 캔버스.
 * 사람 자리: 위 끝은 편지 카드 꼬리 아래(LATER_LAYOUT.peopleTop), 아래 끝은 틀 몸통 밑 — 카드 · 도장이 얼굴을 가리지 않는다.
 */
export function composeLaterPhoto({ cutout, ...input }: LaterInput & { cutout: HTMLCanvasElement }): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PRINT.W
  canvas.height = PRINT.H
  const ctx = canvas.getContext('2d')!
  const a = artContext(ctx, input.scene, input.font)
  drawBackground(a, input.scene, input.art, input.font)
  const p = placePeople(cutout.width, cutout.height, {
    bottom: LATER_LAYOUT.peopleBottom,
    maxH: LATER_LAYOUT.peopleBottom - LATER_LAYOUT.peopleTop,
  })
  drawPeople(ctx, cutout, p, input.scene.glow)
  drawLaterFront({ ...a, people: peopleHitTest(cutout, p) }, laterTexts(input))
  return canvas
}
