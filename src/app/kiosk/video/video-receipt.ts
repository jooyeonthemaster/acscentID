// 키오스크 영상판 영수증(2026-11-18 사용자 지시: COLOR! · DRAW! · MAKEUP! 도 SIP! 영상판 영수증처럼 — 맨 위 도장, 맨 아래 길잡이의 큰 사인).
// 감열지 한 장(폭 512점, 흰 바탕 · 검정만)을 직접 그린다 — kx-receipt.ts 의 render 길로 KxReceiptSheet 인쇄 · 미리보기에 그대로 쓰인다.
//   1. 맨 위 도장 — COLOR! · MAKEUP! 는 촬영 사진으로 만든 AI 도장 그림(/api/kiosk/experience/video-stamp, 그 장소에 선 '나'),
//      사진이 없거나 못 만들면 사람 없는 기본 도장. DRAW! 는 손님의 캐리커처를 그대로 도장처럼 찍는다(사용자 지시 — AI 도장 없음).
//   2. 프로그램 결과(큰 제목 · 점 다섯 눈금 · 줄)   3. 길잡이의 한마디   4. 휴대폰으로 받기 QR(있을 때)   5. 길잡이 사인(크게) · 역할 · 이름
// 본보기: src/app/kiosk/experience/expansion/sip-receipt.ts. 그림: public/assets/kiosk-video/receipt(원본 design-review/kiosk-cast/receipt, R&D 키)

import { useCallback, useEffect, useRef } from 'react'
import type { KioskLang } from '@/lib/kiosk/i18n'
import type { VideoStampProgram } from '@/lib/kiosk/video-stamp'
import { fontsReady, kxFontFamily, loadImage, wrapLines } from '@/app/kiosk/experience/kx-canvas'
import type { KxReceipt, KxReceiptQr } from '@/app/kiosk/experience/kx-receipt'
import { artStamp, inkStamp } from '@/app/kiosk/experience/kx-stamp'

const ART = '/assets/kiosk-video/receipt'
const W = 512
const M = 30
const SERIF = "'nh-serif', 'Cormorant Garamond', 'Times New Roman', serif"

export type VideoReceiptProgram = 'color' | 'draw' | 'makeup'

/** 프로그램마다 — 머리 줄(누구의 어디), 사인, 맺음 이름 */
const GUIDE: Record<VideoReceiptProgram, { tag: string; house: string; sign: string; role: string; ko: string; en: string }> = {
  color: { tag: 'COLOR!', house: "SEOHA'S ATELIER", sign: 'sign-seoha', role: 'Colorist', ko: '서하', en: 'Seoha' },
  draw: { tag: 'DRAW!', house: "MORU'S HILLTOP STUDIO", sign: 'sign-moru', role: 'Street Painter', ko: '모루', en: 'Moru' },
  makeup: { tag: 'MAKEUP!', house: "IAN'S BACKSTAGE", sign: 'sign-ian', role: 'Makeup Artist', ko: '이안', en: 'Ian' },
}

/** 다섯 언어 — 도장 밑 한 줄(DRAW! 는 화풍 표기를 쓴다), 맺음 인사, 사진 안내 */
const COPY: Record<VideoReceiptProgram, Record<KioskLang, { caption: string; thanks: string; privacy: string }>> = {
  color: {
    ko: { caption: '색의 아틀리에에서, 오늘의 나', thanks: '오늘 당신의 색을 함께 찾았어요', privacy: '촬영 사진은 진단과 도장 그림에만 쓰고 저장하지 않아요' },
    en: { caption: 'Today, at the color atelier', thanks: 'We found your colors together today', privacy: 'Your photo is used only for the reading and this stamp, and is not stored' },
    ja: { caption: '色のアトリエで、今日のわたし', thanks: '今日はあなたの色を一緒に見つけました', privacy: '撮影した写真は診断とスタンプ作りにだけ使い、保存しません' },
    'zh-Hans': { caption: '在色彩工作室，今天的我', thanks: '今天一起找到了你的颜色', privacy: '拍摄的照片仅用于诊断和印章图，不会保存' },
    'zh-Hant': { caption: '在色彩工作室，今天的我', thanks: '今天一起找到了你的顏色', privacy: '拍攝的照片僅用於診斷和印章圖，不會保存' },
  },
  draw: {
    ko: { caption: '언덕 위 화실에서, 오늘의 얼굴', thanks: '오늘 언덕 위 화실에서 함께 그렸어요', privacy: '' },
    en: { caption: "Today's face, from the hilltop studio", thanks: 'Drawn together at the hilltop studio today', privacy: '' },
    ja: { caption: '丘の上のアトリエで、今日の顔', thanks: '今日、丘の上のアトリエで一緒に描きました', privacy: '' },
    'zh-Hans': { caption: '山丘上的画室，今天的脸', thanks: '今天在山丘上的画室一起画的', privacy: '' },
    'zh-Hant': { caption: '山丘上的畫室，今天的臉', thanks: '今天在山丘上的畫室一起畫的', privacy: '' },
  },
  makeup: {
    ko: { caption: '백스테이지에서, 오늘의 나', thanks: '오늘의 룩을 함께 완성했어요', privacy: '촬영 사진은 도장 그림을 만드는 데만 쓰고 저장하지 않아요' },
    en: { caption: 'Today, backstage', thanks: "We finished today's look together", privacy: 'Your photo is used only to make this stamp and is not stored' },
    ja: { caption: 'バックステージで、今日のわたし', thanks: '今日のルックを一緒に完成させました', privacy: '撮影した写真はスタンプ作りにだけ使い、保存しません' },
    'zh-Hans': { caption: '在后台，今天的我', thanks: '一起完成了今天的妆容', privacy: '拍摄的照片仅用于制作印章图，不会保存' },
    'zh-Hant': { caption: '在後台，今天的我', thanks: '一起完成了今天的妝容', privacy: '拍攝的照片僅用於製作印章圖，不會保存' },
  },
}

/** 길잡이의 한마디 — 결과 글이 따로 없는 DRAW! · MAKEUP! */
export const VIDEO_NOTE: Record<'draw' | 'makeup', Record<KioskLang, string>> = {
  draw: {
    ko: '오늘의 얼굴, 제가 제일 좋아하는 한 장이 됐어요.',
    en: "Today's face became my favorite piece.",
    ja: '今日の顔、いちばんお気に入りの一枚になりました。',
    'zh-Hans': '今天的你，成了我最喜欢的一幅画。',
    'zh-Hant': '今天的你，成了我最喜歡的一幅畫。',
  },
  makeup: {
    ko: '오늘 고른 색은 무대 조명 아래에서도 잘 어울려요. 거울 앞에서 한 번 더 웃어 보세요!',
    en: 'These colors will shine under the stage lights too. Give the mirror one more smile!',
    ja: 'このカラーはステージの照明の下でもよく映えます。鏡の前でもう一度笑ってみて！',
    'zh-Hans': '这些颜色在舞台灯光下也很出彩。对着镜子再笑一次吧！',
    'zh-Hant': '這些顏色在舞台燈光下也很出彩。對著鏡子再笑一次吧！',
  },
}

export type VideoReceiptSection =
  /** 큰 제목 — 작은 영문 머리 · 큰 이름 · 아래 한 줄 · 검은 알약 */
  | { kind: 'big'; label: string; title: string; sub?: string; pill?: string }
  /** 점 다섯 눈금 — 이름 · 양 끝 말 · 값(1~5) */
  | { kind: 'scales'; label: string; rows: { title: string; lo: string; hi: string; v: number }[] }
  /** 이름 · 값 줄(값이 길면 다음 줄로) */
  | { kind: 'rows'; label: string; rows: [string, string][] }
  /** 따옴표 글 */
  | { kind: 'note'; label: string; text: string }

export interface VideoReceiptInput {
  program: VideoReceiptProgram
  lang: KioskLang
  /** 맨 위 도장 그림 — COLOR! · MAKEUP! 는 AI 도장(data: 주소, 없으면 기본 도장), DRAW! 는 캐리커처 */
  stamp: string | null
  /** 도장 밑 한 줄을 바꿀 때 */
  caption?: string
  sections: VideoReceiptSection[]
}

export function videoReceipt(input: VideoReceiptInput): KxReceipt {
  return { tag: GUIDE[input.program].tag, title: input.program, blocks: [], render: (qr, when) => renderVideoReceipt(input, qr, when) }
}

async function renderVideoReceipt({ program, lang, stamp, caption, sections }: VideoReceiptInput, qr: KxReceiptQr | null, when: string): Promise<HTMLCanvasElement> {
  const guide = GUIDE[program], copy = COPY[program][lang]
  const family = kxFontFamily()
  await fontsReady(`900 30px ${family}`, `700 22px ${family}`, `500 20px ${family}`, `500 40px ${SERIF}`, `italic 300 22px ${SERIF}`)
  const fallback = program === 'draw' ? null : `${ART}/stamp-default-${program}.png`
  const [stampImg, sign] = await Promise.all([
    (stamp ? loadImage(stamp) : Promise.reject(new Error('no stamp'))).catch(() => (fallback ? loadImage(fallback) : null)).catch(() => null),
    loadImage(`${ART}/${guide.sign}.png`).catch(() => null),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = 5200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, canvas.height)
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.textBaseline = 'top'
  const inner = W - M * 2
  let y = 26
  const text = (value: string, size: number, weight: number | string, { center = true, gap = 8, font = family, spacing = 0, line = 1.38, x = M, width = inner }: { center?: boolean; gap?: number; font?: string; spacing?: number; line?: number; x?: number; width?: number } = {}) => {
    ctx.font = `${weight} ${size}px ${font}`
    ctx.letterSpacing = `${spacing}px`
    ctx.textAlign = center ? 'center' : 'left'
    for (const l of wrapLines(ctx, value, width)) { ctx.fillText(l, center ? W / 2 : x, y); y += Math.round(size * line) }
    ctx.letterSpacing = '0px'
    y += gap
  }
  const dots = (gap = 18) => { for (let x = M; x < W - M; x += 9) ctx.fillRect(x, y, 3, 3); y += 3 + gap }
  const head = (label: string, gap = 10) => text(label, 14, 800, { spacing: 4, gap })

  // 머리 — 프로그램 표시(세리프)와 누구의 어디 · 날짜
  text(guide.tag, 46, 500, { font: SERIF, gap: 0, line: 1.05 })
  text(`${guide.house}  ·  ${when}`, 13, 700, { spacing: 2.4, gap: 16 })

  // 1. 도장 — 손으로 찍은 듯 살짝 기울여
  if (stampImg) {
    const st = program === 'draw' ? artStamp(stampImg, 440) : inkStamp(stampImg, 420)
    ctx.save()
    ctx.translate(W / 2, y + st.height / 2 + 6)
    ctx.rotate(program === 'draw' ? 0.018 : -0.022)
    ctx.drawImage(st, -st.width / 2, -st.height / 2)
    ctx.restore()
    y += st.height + 14
    const cap = caption ?? copy.caption
    if (cap) text(cap, 17, 700, { gap: 18 })
  }
  dots()

  // 2 · 3. 결과 · 한마디
  for (const s of sections) {
    if (s.kind === 'big') {
      head(s.label, 6)
      text(s.title, 40, 900, { gap: 2, line: 1.25 })
      if (s.sub) text(s.sub, 20, 'italic 500', { gap: 10 })
      if (s.pill) {
        ctx.font = `800 20px ${family}`
        const kw = ctx.measureText(s.pill).width + 40
        ctx.beginPath(); ctx.roundRect((W - kw) / 2, y, kw, 36, 18); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(s.pill, W / 2, y + 7)
        ctx.fillStyle = '#000'
        y += 36 + 16
      }
      y += 6
    }
    if (s.kind === 'scales') {
      head(s.label, 12)
      for (const row of s.rows) {
        const v = Math.max(1, Math.min(5, Math.round(row.v)))
        ctx.textAlign = 'left'; ctx.font = `800 21px ${family}`; ctx.fillText(row.title, M + 6, y + 2)
        ctx.font = `600 15px ${family}`
        ctx.textAlign = 'right'; ctx.fillText(row.lo, 246, y + 6)
        ctx.textAlign = 'left'; ctx.fillText(row.hi, 412, y + 6)
        for (let i = 0; i < 5; i++) {
          const cx = 266 + i * 31, cy = y + 14
          ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2)
          if (i < v) ctx.fill(); else { ctx.lineWidth = 2.4; ctx.stroke() }
        }
        y += 40
      }
      y += 10
    }
    if (s.kind === 'rows') {
      head(s.label, 10)
      // 값 칸은 줄마다 같은 자리에서 — 가장 긴 이름에 맞춘다(너무 길면 이름을 두 줄로)
      ctx.font = `800 19px ${family}`
      const kw = Math.min(150, Math.max(...s.rows.map(([k]) => ctx.measureText(k).width)) + 18)
      for (const [k, v] of s.rows) {
        ctx.textAlign = 'left'; ctx.font = `800 19px ${family}`
        const keys = wrapLines(ctx, k, kw - 12)
        keys.forEach((l, i) => ctx.fillText(l, M + 6, y + 1 + i * 27))
        ctx.font = `600 19px ${family}`
        const lines = wrapLines(ctx, v, inner - kw - 12)
        lines.forEach((l, i) => ctx.fillText(l, M + 6 + kw, y + 1 + i * 27))
        y += Math.max(keys.length, lines.length) * 27 + 8
      }
      y += 10
    }
    if (s.kind === 'note') {
      head(s.label, 10)
      text(`“${s.text}”`, 20, 600, { gap: 20, line: 1.5 })
    }
    dots()
  }

  // 4. 휴대폰으로 받기
  if (qr) {
    text(qr.title, 22, 800, { gap: 10 })
    const QRCode = (await import('qrcode')).default
    const code = document.createElement('canvas')
    await QRCode.toCanvas(code, qr.url, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
    ctx.drawImage(code, Math.round((W - code.width) / 2), y)
    y += code.height + 10
    text(qr.desc, 16, 600, { gap: 2 })
    text(qr.until, 16, 800, { gap: 18 })
    dots(10)
  }

  // 5. 길잡이 사인 — 크게, 그 아래 가는 선과 역할 · 이름
  if (sign) {
    const sw = 400, sh = Math.round(sw * sign.naturalHeight / sign.naturalWidth)
    ctx.drawImage(sign, Math.round((W - sw) / 2), y, sw, sh)
    y += sh - 6
  }
  ctx.fillRect(W / 2 - 150, y, 300, 2); y += 12
  text(`${guide.role}  ·  ${lang === 'ko' ? guide.ko : guide.en}`, 19, 700, { gap: 4 })
  text(copy.thanks, 15, 600, { gap: 16 })
  if (copy.privacy) text(copy.privacy, 13, 500, { gap: 4 })
  y += 40

  const out = document.createElement('canvas')
  out.width = W; out.height = y
  out.getContext('2d')!.drawImage(canvas, 0, 0)
  return out
}

/** 이 정도 기다려도 도장 그림이 안 오면 기본 도장으로 찍는다(영수증 창은 그동안 '만드는 중') */
const STAMP_WAIT_MS = 45_000

/**
 * AI 도장 그림 — start 가 켜지고 사진이 있으면 한 번 그리기 시작해(사진이 바뀌면 다시) 영수증을 열 때 기다려 받는다.
 * 사진은 data: 주소 또는 캔버스(MAKEUP! 의 머리 모양까지 바뀐 얼굴). 실패하면 null — 기본 도장.
 */
export function useVideoStamp(program: VideoStampProgram, photo: string | HTMLCanvasElement | null, start: boolean) {
  const job = useRef<{ photo: string | HTMLCanvasElement; done: Promise<string | null> } | null>(null)
  const now = useRef(photo)
  useEffect(() => { now.current = photo }, [photo])
  useEffect(() => {
    if (!start || !photo || job.current?.photo === photo) return
    const data = typeof photo === 'string' ? photo : photo.toDataURL('image/jpeg', 0.88)
    const done = fetch('/api/kiosk/experience/video-stamp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ program, photo: data }), signal: AbortSignal.timeout(120_000) })
      .then((r) => r.json()).then((j: { image?: unknown }) => (typeof j.image === 'string' ? j.image : null)).catch(() => null)
    job.current = { photo, done }
  }, [program, photo, start])
  /** wait: 이만큼만 기다린다(화면의 영수증 미리보기는 짧게, 인쇄는 STAMP_WAIT_MS) */
  return useCallback(async (wait = STAMP_WAIT_MS): Promise<string | null> => {
    const j = job.current
    // 다른 사진(다시 찍음 · 머리 모양 바꿈)의 그림은 쓰지 않는다
    if (!j || j.photo !== now.current) return null
    return Promise.race([j.done, new Promise<null>((ok) => window.setTimeout(() => ok(null), wait))])
  }, [])
}
