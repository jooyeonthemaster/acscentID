// 펀그라운드 B안 미래 직업 탐색(NEXT!) — 4×6 사진 인쇄용 「미래 직업 탐색 카드」(세로 1200×1800 JPEG, 300dpi 4×6).
// 결과 화면의 「인쇄하기 · QR로 받기」가 연다 → FgResultButtons(미리보기 · QR). 설치 기기에서는 같은 그림을 포토 프린터로 보낸다.
// 화면과 같은 「FUN GROUND Editorial」 모양(2026-11-16) — 흰 바탕 · 검정 1px 선 · 블루 강조색 하나 · Anton 영문 제목 · Black Han Sans 머리말 · Pretendard 본문:
//   머리(FUN GROUND · 날짜, 아래 선) / 왼쪽 찍은 사진(꽉 차게, 아래 블루 축 조합 띠) · 오른쪽 라벨 띠 · NEXT! · 관심 축 · 재미로 보는 풀이(제목 + 들어가는 만큼의 문장)
//   / 탐색해 볼 직업(블루 밑줄) 01 · 02 · 03 번호 줄(이름 · 한 줄, 가는 선) / 작은 첫 도전 / 「재미로 보는 탐색 · 적성 검사가 아니에요」.
// 글은 키오스크 text.ts · career-combos.ts 표 그대로(AI 가 쓴 글이 아니다). 기기 안 캔버스로만 그린다.
// 테두리 없는 인쇄에서 가장자리가 조금 잘려도 되게 바깥 64px 은 비운다.

import { anton } from '@/app/booth/programs/fonts'
import { canvasBlob, drawCover, fontsReady, loadImage, makeCanvas, wrapLines } from '@/app/kiosk/experience/kx-canvas'

const W = 1200
const H = 1800
const PAD = 64
const INNER = W - PAD * 2
const INK = '#111111'
const SOFT = '#6b6b6b'
const ACCENT = '#2E6BFF'
/** 왼쪽 사진 칸 — 화면 카메라 칸(864:984)과 같은 비율 */
const PHOTO_W = 520
const PHOTO_H = Math.round((PHOTO_W * 984) / 864)
export const CAREER_DISCLAIMER = '재미로 보는 탐색 · 적성 검사가 아니에요'

export interface CareerPrintInput {
  /** 찍은 사진(data: JPEG) — 사진 없이 계속했으면 null */
  photo: string | null
  /** 관심 축 태그(앞 둘) — 예: ['만들기', '문제 풀기'] */
  tags: string[]
  mbti: string | null
  /** 재미로 보는 풀이 — 제목 · 축 짝(「만들기 × 문제 풀기」) · 문장들 */
  combo: { title: string; axes: string; body: string[] }
  /** 탐색해 볼 직업 셋 — 이름 · 한 줄 */
  careers: { name: string; desc: string }[]
  /** 작은 첫 도전(1위 직업) */
  first: string
  date: Date
}

/** 글꼴 — 에디토리얼 테마와 같은 자체 호스팅 글꼴(editorial.css 의 @font-face · next/font Anton) */
const DISPLAY = anton.style.fontFamily
const HEAD = "'FG Black Han Sans', 'FG Pretendard', 'Apple SD Gothic Neo', sans-serif"
const TEXT = "'FG Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')))
  reader.onerror = () => reject(new Error('read failed'))
  reader.readAsDataURL(blob)
})

/** 「 · 」가 줄 맨 앞에 오지 않게 앞 낱말에 붙여 줄을 나눈다 */
const wrapKeepDot = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) =>
  wrapLines(ctx, text.replace(/ · /g, ' · '), maxWidth).map((line) => line.replace(/ /g, ' '))

export async function drawCareerPrint(input: CareerPrintInput): Promise<string> {
  const { photo, tags, mbti, combo, careers, first, date } = input
  await fontsReady(`400 80px ${DISPLAY}`, `400 60px ${HEAD}`, `900 40px ${TEXT}`, `700 30px ${TEXT}`, `600 28px ${TEXT}`)
  const picture = photo ? await loadImage(photo).catch(() => null) : null
  const [canvas, ctx] = makeCanvas(W, H)
  ctx.textBaseline = 'alphabetic'

  const text = (weight: number, size: number) => `${weight} ${size}px ${TEXT}`
  const display = (size: number) => `400 ${size}px ${DISPLAY}`
  const head = (size: number) => `400 ${size}px ${HEAD}`
  const write = (value: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left') => {
    ctx.font = f
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(value, x, y)
    return ctx.measureText(value).width
  }
  const rule = (x: number, y: number, w: number, h = 2, color = INK) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) }
  /** 폭에 들어가게 글자 크기를 줄인다 */
  const fitSize = (value: string, makeFont: (s: number) => string, size: number, maxW: number, min: number) => {
    let s = size
    while (s > min) {
      ctx.font = makeFont(s)
      if (ctx.measureText(value).width <= maxW) break
      s -= 2
    }
    return s
  }
  /** 강조색 띠 위 흰 글자 — 띠 높이를 돌려준다 */
  const band = (value: string, x: number, y: number, size: number) => {
    ctx.font = text(900, size)
    const w = ctx.measureText(value).width + size
    const h = Math.round(size * 1.5)
    ctx.fillStyle = ACCENT
    ctx.fillRect(x, y, w, h)
    write(value, x + size / 2, y + h - Math.round(size * 0.42), text(900, size), '#ffffff')
    return h
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // ── 머리: FUN GROUND(로고 자리 · 임시 글자) · 날짜 · 아래 선 ──
  let y = 128
  write('FUN GROUND', PAD, y, display(58), INK)
  write(new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date), W - PAD, y - 6, text(700, 28), SOFT, 'right')
  rule(PAD, 158, INNER, 2)

  // ── 왼쪽 사진(꽉 차게 · 1px 테두리) + 아래 블루 축 조합 띠 ──
  const photoTop = 196
  if (picture) {
    drawCover(ctx, picture, PAD, photoTop, PHOTO_W, PHOTO_H)
  } else {
    // 사진 없이 계속 — 옅은 회색 바탕에 NEXT!
    ctx.fillStyle = '#efefef'
    ctx.fillRect(PAD, photoTop, PHOTO_W, PHOTO_H)
    write('NEXT!', PAD + PHOTO_W / 2, photoTop + PHOTO_H / 2 + 60, display(170), '#c9c9c9', 'center')
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(PAD + 1, photoTop + 1, PHOTO_W - 2, PHOTO_H - 2)
  {
    const size = fitSize(combo.axes, (s) => text(900, s), 34, PHOTO_W - 60, 24)
    const h = Math.round(size * 1.6)
    ctx.font = text(900, size)
    const w = ctx.measureText(combo.axes).width + size * 1.1
    ctx.fillStyle = ACCENT
    ctx.fillRect(PAD, photoTop + PHOTO_H - h, w, h)
    write(combo.axes, PAD + size * 0.55, photoTop + PHOTO_H - Math.round(size * 0.5), text(900, size), '#ffffff')
  }

  // ── 오른쪽: 라벨 띠 · NEXT! · 관심 축 · 재미로 보는 풀이 ──
  const sideX = PAD + PHOTO_W + 44
  const sideW = W - PAD - sideX
  const sideBottom = photoTop + PHOTO_H
  y = photoTop
  y += band('미래 직업 탐색', sideX, y, 30)
  write('NEXT!', sideX - 4, y + 166, display(fitSize('NEXT!', display, 176, sideW, 120)), INK)
  y += 196
  const tagLine = [...tags.map((tag) => `#${tag}`), ...(mbti ? [mbti] : [])].join('  ')
  write(tagLine, sideX, y + 4, text(800, fitSize(tagLine, (s) => text(800, s), 30, sideW, 22)), ACCENT)
  y += 30
  rule(sideX, y, sideW, 2)
  y += 56
  write('재미로 보는 풀이', sideX, y, text(900, 26), SOFT)
  y += 62
  // 제목 — 두 줄까지(넘으면 글자를 줄인다)
  let titleSize = 52
  ctx.font = head(titleSize)
  while (titleSize > 38 && wrapKeepDot(ctx, combo.title, sideW).length > 2) { titleSize -= 4; ctx.font = head(titleSize) }
  for (const line of wrapKeepDot(ctx, combo.title, sideW)) {
    write(line, sideX, y, head(titleSize), INK)
    y += Math.round(titleSize * 1.2)
  }
  y += 14
  // 풀이 문장 — 사진 아래 끝까지 들어가는 만큼(첫 문장은 늘)
  const bodyFont = text(600, 28)
  const bodyLine = 42
  let bodyLines: string[] = []
  for (const sentence of combo.body) {
    ctx.font = bodyFont
    const next = [...bodyLines, ...wrapKeepDot(ctx, sentence, sideW)]
    if (bodyLines.length && y + (next.length - 1) * bodyLine > sideBottom - 6) break
    bodyLines = next
  }
  bodyLines.forEach((line, i) => write(line, sideX, y + i * bodyLine, bodyFont, INK))

  // ── 탐색해 볼 직업 — 블루 밑줄 머리말 · 01 · 02 · 03 번호 줄(가는 선) ──
  y = sideBottom + 108
  const headW = write('탐색해 볼 직업', PAD, y, head(60), INK)
  rule(PAD, y + 18, headW, 12, ACCENT)
  y += 58
  const rowH = 148
  rule(PAD, y, INNER, 2)
  careers.forEach((career, i) => {
    const top = y + i * rowH
    write(String(i + 1).padStart(2, '0'), PAD, top + 100, display(76), INK)
    const tx = PAD + 124
    const tw = W - PAD - tx
    write(career.name, tx, top + 66, text(900, fitSize(career.name, (s) => text(900, s), 44, tw, 32)), INK)
    write(career.desc, tx, top + 114, text(600, fitSize(career.desc, (s) => text(600, s), 28, tw, 22)), SOFT)
    rule(PAD, top + rowH, INNER, 1.5)
  })
  y += careers.length * rowH + 44

  // ── 작은 첫 도전 — 블루 띠 · 두 줄까지 ──
  y += band('작은 첫 도전', PAD, y, 28) + 52
  {
    let size = 38
    ctx.font = text(800, size)
    while (size > 28 && wrapKeepDot(ctx, first, INNER).length > 2) { size -= 2; ctx.font = text(800, size) }
    wrapKeepDot(ctx, first, INNER).forEach((line, i) => write(line, PAD, y + i * Math.round(size * 1.35), text(800, size), INK))
  }

  // ── 아래 말 ──
  const footY = H - PAD - 6
  rule(PAD, footY - 46, INNER, 2)
  write(CAREER_DISCLAIMER, W / 2, footY, text(700, 28), SOFT, 'center')

  return blobToDataUrl(await canvasBlob(canvas, 'image/jpeg', 0.92))
}
