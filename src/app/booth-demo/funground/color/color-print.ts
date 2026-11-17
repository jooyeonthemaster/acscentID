// 펀그라운드 B안 퍼스널 컬러 — 4×6 사진 인쇄용 「퍼스널 컬러 카드」(세로 1200×1800 JPEG, 300dpi 4×6).
// 결과 화면의 「인쇄하기 · QR로 받기」가 만든다 → FgResultButtons(미리보기 · QR). 설치 기기에서는 같은 그림을 포토 프린터로 보낸다.
// 「FUN GROUND Editorial」 모양(2026-11-16 — 화면과 같은 흰 바탕 · 검정 잉크 · 1px 선 · 라임 강조, 그림자 · 둥근 모서리 없음):
//   위 FUN GROUND · 날짜 / 라임 라벨 「나의 퍼스널 컬러」 + 선 + COLOR! / 유형 이름(굵은 한글 머리말 + 라임 밑줄) · 웜쿨 띠 · 별명 /
//   왼쪽 찍은 사진(지금 고른 색으로 칠한 옷, 옷을 못 찾았으면 얼굴 아래 천) · 오른쪽 어울리는 색 12(2줄 × 6, 이름, 고른 색은 굵은 테두리 + 라임 막대) /
//   입는 법 01 · 02 · 03 번호 줄(들어가는 만큼 2~3) / 「재미로 보는 결과」. 점수 · 순위는 넣지 않는다(9~19세 체험).
// 글은 color-texts.ts 표 그대로(AI 가 쓴 글이 아니다). 테두리 없는 인쇄에서 가장자리가 조금 잘려도 되게 바깥 64px 은 비운다.
// 글꼴은 화면과 같다 — Anton(next/font) · Black Han Sans · Pretendard(editorial.css 의 자체 호스팅 @font-face).

import { anton } from '@/app/booth/programs/fonts'
import { canvasBlob, drawCover, fontsReady, loadImage, makeCanvas, wrapLines } from '@/app/kiosk/experience/kx-canvas'
import { FG_COLOR_DISCLAIMER, UNDERTONE_LABEL, type FgColorText } from '@/lib/funground/color-texts'

const W = 1200
const H = 1800
const PAD = 64
const INNER = W - PAD * 2
const INK = '#111111'
const SOFT = '#6b6b6b'
const DISPLAY = `${anton.style.fontFamily}, Impact, 'Arial Narrow', sans-serif`
const HEAD = "'FG Black Han Sans', 'FG Pretendard', 'Apple SD Gothic Neo', sans-serif"
const TEXT = "'FG Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
/** 사진 칸(세로 3:4 — 찍은 사진과 같은 비율) */
const PHOTO_W = 600
const PHOTO_H = 800

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')))
  reader.onerror = () => reject(new Error('read failed'))
  reader.readAsDataURL(blob)
})

export async function drawColorPrint({ text, photo, overlay, picked, tone, date }: {
  text: FgColorText
  /** 찍은 사진(data: JPEG, 세로 3:4) */
  photo: string
  /** 고른 색으로 칠한 옷만 담은 투명 PNG(blob:) — 없으면 얼굴 아래에 고른 색 천을 두른다(화면과 같다) */
  overlay: string | null
  /** 지금 고른 색 */
  picked: { hex: string; name: string }
  /** 강조색(라임) — 라벨 띠 · 밑줄 · 고른 색 막대 */
  tone: string
  date: Date
}): Promise<string> {
  await fontsReady(`56px ${DISPLAY}`, `110px ${HEAD}`, `900 34px ${TEXT}`, `600 30px ${TEXT}`)
  const [picture, clothes] = await Promise.all([loadImage(photo), overlay ? loadImage(overlay).catch(() => null) : Promise.resolve(null)])
  const [canvas, ctx] = makeCanvas(W, H)
  ctx.textBaseline = 'alphabetic'

  const text_ = (weight: number, size: number) => `${weight} ${size}px ${TEXT}`
  const write = (value: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left') => {
    ctx.font = f
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(value, x, y)
  }
  const widthOf = (value: string, f: string) => { ctx.font = f; return ctx.measureText(value).width }
  /** 폭에 들어가게 글자 크기를 줄인다 */
  const fitSize = (value: string, make: (s: number) => string, size: number, maxW: number, min: number) => {
    let s = size
    while (s > min && widthOf(value, make(s)) > maxW) s -= 2
    return s
  }
  const hline = (y: number, x = PAD, w = INNER) => { ctx.fillStyle = INK; ctx.fillRect(x, y, w, 2) }

  // 바탕
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // ── 위: 로고 자리(임시 FUN GROUND 글자) · 날짜 · 선 ──
  write('FUN GROUND', PAD, 128, `56px ${DISPLAY}`, INK)
  write(new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date), W - PAD, 122, text_(700, 28), SOFT, 'right')
  hline(156)

  // ── 라임 라벨 「나의 퍼스널 컬러」 + 가는 선 + COLOR! ──
  const labelFont = text_(900, 34)
  const label = '나의 퍼스널 컬러'
  const labelW = widthOf(label, labelFont) + 36
  ctx.fillStyle = tone
  ctx.fillRect(PAD, 196, labelW, 56)
  write(label, PAD + 18, 236, labelFont, INK)
  const colorW = widthOf('COLOR!', `64px ${DISPLAY}`)
  write('COLOR!', W - PAD, 250, `64px ${DISPLAY}`, INK, 'right')
  ctx.fillStyle = INK
  ctx.fillRect(PAD + labelW + 24, 223, W - PAD - colorW - 24 - (PAD + labelW + 24), 2)

  // ── 유형 이름(+ 라임 밑줄) · 웜쿨 띠 · 별명 ──
  const badge = UNDERTONE_LABEL[text.undertone]
  const badgeFont = text_(800, 30)
  const badgeW = widthOf(badge, badgeFont) + 32
  const nameSize = fitSize(text.name, (s) => `${s}px ${HEAD}`, 120, INNER - badgeW - 32, 72)
  const nameW = widthOf(text.name, `${nameSize}px ${HEAD}`)
  const nameY = 400
  ctx.fillStyle = tone
  ctx.fillRect(PAD, nameY + 18, nameW, 16)
  write(text.name, PAD, nameY, `${nameSize}px ${HEAD}`, INK)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(PAD + nameW + 32, nameY - 52, badgeW, 52)
  write(badge, PAD + nameW + 32 + 16, nameY - 15, badgeFont, INK)
  const nick = `“${text.nickname}”`
  write(nick, PAD, 506, text_(800, fitSize(nick, (s) => text_(800, s), 40, INNER, 30)), INK)

  // ── 왼쪽 사진(3:4, 1px 검정 테두리) — 결과 화면과 같은 옷 색 ──
  const photoTop = 556
  ctx.save()
  ctx.beginPath()
  ctx.rect(PAD, photoTop, PHOTO_W, PHOTO_H)
  ctx.clip()
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(PAD, photoTop, PHOTO_W, PHOTO_H)
  drawCover(ctx, picture, PAD, photoTop, PHOTO_W, PHOTO_H)
  if (clothes) {
    drawCover(ctx, clothes, PAD, photoTop, PHOTO_W, PHOTO_H)
  } else {
    // 화면의 .fcl-cape 와 같은 모양 — 사진 폭보다 넓은 둥근 천을 아래 36% 에
    const top = photoTop + PHOTO_H * 0.74
    const rx = PHOTO_W * 0.62
    const ry = PHOTO_H * 0.36 * 0.7
    ctx.fillStyle = picked.hex
    ctx.beginPath()
    ctx.ellipse(PAD + PHOTO_W / 2, top + ry, rx, ry, 0, Math.PI, 0)
    ctx.lineTo(PAD + PHOTO_W / 2 + rx, photoTop + PHOTO_H)
    ctx.lineTo(PAD + PHOTO_W / 2 - rx, photoTop + PHOTO_H)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(PAD + 1, photoTop + 1, PHOTO_W - 2, PHOTO_H - 2)

  // ── 오른쪽 어울리는 색 12 — 2줄 × 6(색 칸 + 이름). 고른 색: 굵은 검정 테두리 + 아래 라임 막대 ──
  const gridX = PAD + PHOTO_W + 40
  const gridW = W - PAD - gridX
  const colGap = 24
  const cellW = (gridW - colGap) / 2
  const cellH = PHOTO_H / 6
  const chipH = cellH - 52
  text.colors.forEach((c, i) => {
    const x = gridX + (i % 2) * (cellW + colGap)
    const y = photoTop + Math.floor(i / 2) * cellH
    const on = c.hex === picked.hex
    ctx.fillStyle = c.hex
    ctx.fillRect(x, y, cellW, chipH)
    ctx.strokeStyle = on ? INK : 'rgba(17, 17, 17, 0.18)'
    ctx.lineWidth = on ? 6 : 1.5
    ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, cellW - ctx.lineWidth, chipH - ctx.lineWidth)
    const nameFont = (s: number) => text_(on ? 900 : 700, s)
    const size = fitSize(c.name, nameFont, 26, cellW - (on ? 26 : 0), 18)
    if (on) {
      ctx.fillStyle = tone
      ctx.fillRect(x, y + chipH + 10, 14, 30)
    }
    write(c.name, x + (on ? 24 : 0), y + chipH + 36, nameFont(size), on ? INK : SOFT)
  })

  // ── 입는 법 01 · 02 · 03 — 들어가는 만큼(적어도 2개) ──
  const footY = H - PAD - 8
  const rowsTop = photoTop + PHOTO_H + 40
  const rowsMax = footY - 70
  const tipFont = text_(600, 30)
  const tipLine = 42
  const tipX = PAD + 76
  const rows: string[][] = []
  let used = 0
  for (const tip of text.tips) {
    ctx.font = tipFont
    const lines = wrapLines(ctx, tip, W - PAD - tipX)
    const need = lines.length * tipLine + 30
    if (rows.length >= 2 && rowsTop + used + need > rowsMax) break
    rows.push(lines)
    used += need
  }
  hline(rowsTop, PAD, INNER)
  let ry = rowsTop
  rows.forEach((lines, i) => {
    write(`0${i + 1}`, PAD, ry + 52, `40px ${DISPLAY}`, INK)
    lines.forEach((line, j) => write(line, tipX, ry + 46 + j * tipLine, tipFont, INK))
    ry += lines.length * tipLine + 30
    ctx.fillStyle = INK
    ctx.fillRect(PAD, ry, INNER, 1)
  })

  // ── 아래 말 ──
  write(FG_COLOR_DISCLAIMER, W / 2, footY, text_(600, 26), SOFT, 'center')

  return blobToDataUrl(await canvasBlob(canvas, 'image/jpeg', 0.92))
}
