// 키오스크 영수증 캔버스 렌더러 — 512dot(3인치 감열) 폭 흑백 이미지 한 장을 그린다.
// 이 이미지가 곧 인쇄 원판이다: Electron 셸의 image 모드는 receiptImageBase64만 읽어
// 디더링 후 ESC/POS 래스터로 전송하므로, 웹 미리보기와 실물 출력이 픽셀 단위로 일치한다.

export interface ReceiptSignal {
  label: string
  value: number // 1~10
}

export interface ReceiptRecipeRow {
  id: string
  name: string
  ratio: number // %
  amountMl: number
  amountG: number
}

export interface ReceiptPillar {
  head: string // 時柱 / 日柱 / 月柱 / 年柱
  ganHanja: string
  ganRead: string
  ganElement: string // 오행 한자 (컬러바 대체 — 흑백에서 색은 전멸한다)
  jiHanja: string
  jiRead: string
  jiElement: string
  isDay: boolean
}

export interface ReceiptSaju {
  pillars: (ReceiptPillar | null)[] // null = 시 미상
  dayMaster: string
  yongsin: string
  birth: string
  elements: { label: string; value: number; isYongsin: boolean }[]
  bridge: string
  why: string
  tiers: { tier: string; name: string; meaning: string }[]
  ritual: string
}

export interface ReceiptData {
  ticket: string | null // null이면 "PREVIEW"
  date: string
  time: string
  customerName: string
  gender: string
  productLabel: string // 예: 퍼퓸 10ml
  perfumeNo: string // 예: 07
  perfumeName: string
  categoryEn: string // 예: FLORAL
  score: number // 0~1
  keywords: string[]
  notes: { top: string; middle: string; base: string }
  analysisText: string
  personalColorText: string
  palette: string[]
  signals: ReceiptSignal[]
  recipeRows: ReceiptRecipeRow[]
  baseText: string // 예: 퍼퓸 베이스 8.0ml
  steps: string[]
  /** 카운터 제출 안내 — 손님이 놓치면 안 되는 문장이라 향 번호(No.)와 같은 크기로 찍는다 */
  counterNotice?: string[]
  /** '퍼퓸 10ml 제조 레시피' — 화면 언어로 만들어 넘긴다 */
  recipeTitle?: string
  /** 주의사항 — 화면 언어 버전. 없으면 한국어 기본값 */
  precautions?: string[]
  footerLines: string[]
  /** 사주 프로그램일 때만 — 명식·용신·처방 섹션이 추가된다 */
  saju?: ReceiptSaju
}

export interface ReceiptRenderOptions {
  width?: number // 기본 512 (프린터 헤드 도트 폭)
  photoSrc?: string | null // 촬영 사진 dataURL — 있으면 흑백으로 삽입
  /** 화면 언어 — 한자권이면 본문 글꼴을 그 언어 웹폰트로 바꾼다 */
  lang?: 'ko' | 'en' | 'ja' | 'zh-Hans' | 'zh-Hant'
}

interface Fonts {
  sans: string // 한글 본문
  display: string // 워드마크/큰 숫자
  mono: string
  hanja: string // 명식 한자 — 한글 전용 서체엔 글리프가 없어 별도 스택이 필요하다
}

type DrawOp = (ctx: CanvasRenderingContext2D) => void

// 순흑/순백만 사용 — 셸의 Floyd-Steinberg 디더링(임계 170)이 회색을 점묘로 바꾸므로,
// 원판은 이미 1비트에 가까운 상태여야 실물 인쇄가 또렷하다.
const INK = '#000000'
const MARGIN = 26

/**
 * 영수증 맨 아래 주의사항 — 제품 실물 라벨(PRECAUTION)과 같은 문구를 유지한다.
 * 라벨 문구가 바뀌면 여기도 함께 고쳐야 한다.
 */
export const RECEIPT_PRECAUTIONS: string[] = [
  '피부가 민감하거나 손상된 사람은 제품을 장기간 접촉하지 않도록 주의하시오.',
  '용기를 던지거나 떨어뜨리지 마시오.',
  '직사광선을 피해 서늘한 곳에 보관하시오.',
  '어린이 손에 닿지 않는 곳에 보관하시오.',
  '피부자극 반응 또는 붉은 반점이 나타나면 의학적 조치를 받으시오.',
  '내용물을 먹거나 삼킨 경우 응급조치를 하고 즉시 의사와 상의하시오.',
  '사용기한은 제조일로부터 2년입니다.',
]

function cssFontFamily(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  /* next/font 변수는 그 폰트를 쓰는 엘리먼트(.ksk-root)에 걸린다 — body 에서 읽으면
     빈 값이 나와 시스템 폰트로 떨어지고, CJK 폰트가 없는 매장 PC에서는 두부가 된다. */
  const scope = document.querySelector('.ksk-root') ?? document.body
  const v = getComputedStyle(scope).getPropertyValue(varName).trim()
  return v ? `${v}, ${fallback}` : fallback
}

/** 한자권 글꼴 변수 — src/app/kiosk/fonts.ts 가 심는 next/font 변수와 같은 이름 */
const CJK_FONT_VAR: Record<string, { varName: string; fallback: string }> = {
  ja: { varName: '--font-noto-jp', fallback: "'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif" },
  'zh-Hans': { varName: '--font-noto-sc', fallback: "'PingFang SC', 'Microsoft YaHei', sans-serif" },
  'zh-Hant': { varName: '--font-noto-tc', fallback: "'PingFang TC', 'Microsoft JhengHei', sans-serif" },
}

function resolveFonts(lang?: string): Fonts {
  // 한국어 전용 글꼴로 가나·간체를 그리면 빈칸이 된다 — 언어 글꼴을 앞에 세운다
  const cjk = lang ? CJK_FONT_VAR[lang] : undefined
  if (cjk) {
    const family = cssFontFamily(cjk.varName, cjk.fallback)
    return {
      sans: family,
      display: family,
      mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace",
      hanja: family,
    }
  }
  const sans = cssFontFamily('--font-score-dream', "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif")
  const serif = cssFontFamily('--font-noto-serif-kr', "'Noto Serif KR', serif")
  return {
    sans,
    display: sans,
    mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace",
    hanja: `${serif}, 'Apple SD Gothic Neo', 'Malgun Gothic', serif`,
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** 정수 좌표 채움 사각형 테두리 — strokeRect의 안티앨리어싱 회색을 피한다 */
function strokeRectCrisp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number
) {
  ctx.fillStyle = INK
  ctx.fillRect(x, y, w, t)
  ctx.fillRect(x, y + h - t, w, t)
  ctx.fillRect(x, y, t, h)
  ctx.fillRect(x + w - t, y, t, h)
}

/** 사진 → 감열 인쇄용 1비트 캔버스: 휘도 변환 → 히스토그램 2%/98% 스트레치 →
 *  평균 밝기를 150으로 끌어올리는 감마(0.45~2.4) → Floyd-Steinberg 디더링(임계 128).
 *  JIMFF 셸의 toneMapForThermal과 동일한 파라미터. */
function ditherForThermal(img: HTMLImageElement, dw: number, dh: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = dw
  c.height = dh
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, dw, dh)
  const imageData = ctx.getImageData(0, 0, dw, dh)
  const px = imageData.data
  const n = dw * dh
  const lum = new Float32Array(n)
  const hist = new Uint32Array(256)
  for (let i = 0; i < n; i++) {
    const v = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]
    lum[i] = v
    hist[Math.min(255, Math.round(v))]++
  }
  // 2% / 98% 레벨 스트레치
  let lo = 0
  let hi = 255
  let acc = 0
  const loTarget = n * 0.02
  const hiTarget = n * 0.98
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= loTarget) {
      lo = v
      break
    }
  }
  acc = 0
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= hiTarget) {
      hi = v
      break
    }
  }
  const range = Math.max(1, hi - lo)
  let mean = 0
  for (let i = 0; i < n; i++) {
    lum[i] = Math.max(0, Math.min(255, ((lum[i] - lo) / range) * 255))
    mean += lum[i]
  }
  mean /= n
  // 평균을 toneTarget(150)으로 — 어두운 셀피가 검은 덩어리가 되는 것 방지
  const gamma = Math.max(0.45, Math.min(2.4, Math.log(150 / 255) / Math.log(Math.max(1, mean) / 255)))
  for (let i = 0; i < n; i++) {
    lum[i] = 255 * Math.pow(lum[i] / 255, gamma)
  }
  // Floyd-Steinberg
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const i = y * dw + x
      const old = lum[i]
      const bit = old < 128 ? 0 : 255
      const err = old - bit
      lum[i] = bit
      if (x + 1 < dw) lum[i + 1] += (err * 7) / 16
      if (y + 1 < dh) {
        if (x > 0) lum[i + dw - 1] += (err * 3) / 16
        lum[i + dw] += (err * 5) / 16
        if (x + 1 < dw) lum[i + dw + 1] += (err * 1) / 16
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const bit = lum[i] < 128 ? 0 : 255
    px[i * 4] = bit
    px[i * 4 + 1] = bit
    px[i * 4 + 2] = bit
    px[i * 4 + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return c
}

class ReceiptBuilder {
  y = 0
  private ops: DrawOp[] = []
  private measure: CanvasRenderingContext2D

  constructor(private width: number, private fonts: Fonts) {
    const c = document.createElement('canvas')
    c.width = 10
    c.height = 10
    this.measure = c.getContext('2d')!
  }

  private innerWidth(): number {
    return this.width - MARGIN * 2
  }

  /** str 이 줄바꿈 없이 한 줄에 들어가는 가장 큰 크기 (maxSize 부터 1px씩 내린다) */
  fitOneLine(str: string, maxSize: number, weight: number, family: 'sans' | 'display' | 'mono' = 'sans', minSize = 12): number {
    const maxW = this.innerWidth()
    for (let size = maxSize; size > minSize; size -= 1) {
      this.measure.font = this.font(size, weight, this.fonts[family])
      if (this.measure.measureText(str).width <= maxW) return size
    }
    return minSize
  }

  private font(size: number, weight: number, family: string): string {
    return `${weight} ${size}px ${family}`
  }

  space(px: number) {
    this.y += px
  }

  rule(thickness = 2, dashed = false) {
    // 정수 두께·정수 y만 사용 — 반픽셀은 회색 안티앨리어싱을 만들어 디더링에서 사라진다
    const t = Math.max(1, Math.round(thickness))
    const yTop = Math.round(this.y)
    this.ops.push((ctx) => {
      ctx.fillStyle = INK
      if (dashed) {
        const dash = 6
        const gap = 5
        for (let x = MARGIN; x < this.width - MARGIN; x += dash + gap) {
          ctx.fillRect(x, yTop, Math.min(dash, this.width - MARGIN - x), t)
        }
      } else {
        ctx.fillRect(MARGIN, yTop, this.width - MARGIN * 2, t)
      }
    })
    this.y = yTop + t
  }

  /** 어절 단위 줄바꿈 텍스트. 반환값은 그려진 줄 수 */
  text(
    str: string,
    opts: {
      size: number
      weight?: number
      family?: 'sans' | 'display' | 'mono'
      align?: 'left' | 'center' | 'right'
      lineHeight?: number
      letterSpacing?: number
      maxLines?: number
      /** 둘째 줄부터 들여쓸 폭(px) */
      hangingIndent?: number
      /**
       * 첫 줄 앞에 붙는 기호(·, ※ 등). 본문과 함께 한 문자열로 넘기면 기호가 어절로 쪼개져
       * 혼자 한 줄을 차지하므로, 기호는 따로 그리고 본문 전체를 기호 폭만큼 들여쓴다.
       */
      bullet?: string
    }
  ): number {
    const {
      size,
      weight = 500,
      family = 'sans',
      align = 'left',
      lineHeight = 1.45,
      letterSpacing = 0,
      maxLines,
      hangingIndent = 0,
      bullet,
    } = opts
    const fontStr = this.font(size, weight, this.fonts[family])
    this.measure.font = fontStr
    const maxW = this.innerWidth()
    const bulletW = bullet ? Math.ceil(this.measure.measureText(bullet + ' ').width) : 0
    // 기호가 있으면 모든 줄이 같은 폭(기호 자리만큼 좁게), 없으면 둘째 줄부터 좁아진다
    const widthAt = (count: number) => maxW - (bullet ? bulletW : count === 0 ? 0 : hangingIndent)

    const lines: string[] = []
    for (const paragraph of String(str).split('\n')) {
      const words = paragraph.split(/\s+/).filter(Boolean)
      if (words.length === 0) {
        lines.push('')
        continue
      }
      let cur = ''
      for (const w of words) {
        const cand = cur ? cur + ' ' + w : w
        const avail = widthAt(lines.length)
        if (this.measure.measureText(cand).width + letterSpacing * cand.length <= avail) {
          cur = cand
        } else {
          if (cur) lines.push(cur)
          // 한 어절이 폭을 넘으면 글자 단위로 강제 분할 (띄어쓰기 없는 일본어·중국어가 여기로 온다)
          if (this.measure.measureText(w).width + letterSpacing * w.length > widthAt(lines.length)) {
            let chunk = ''
            for (const ch of w) {
              if (
                this.measure.measureText(chunk + ch).width + letterSpacing * (chunk.length + 1) <=
                widthAt(lines.length)
              ) {
                chunk += ch
              } else {
                lines.push(chunk)
                chunk = ch
              }
            }
            cur = chunk
          } else {
            cur = w
          }
        }
      }
      if (cur) lines.push(cur)
    }

    const shown = maxLines ? lines.slice(0, maxLines) : lines
    if (maxLines && lines.length > maxLines && shown.length > 0) {
      shown[shown.length - 1] = shown[shown.length - 1].replace(/.{0,1}$/, '') + '…'
    }

    const lh = Math.round(size * lineHeight)
    for (const [i, line] of shown.entries()) {
      const yLine = this.y + lh / 2
      const indent = bullet ? bulletW : i === 0 ? 0 : hangingIndent
      const drawBullet = Boolean(bullet) && i === 0
      this.ops.push((ctx) => {
        ctx.font = fontStr
        ctx.fillStyle = INK
        ctx.textBaseline = 'middle'
        if (drawBullet) {
          ctx.textAlign = 'left'
          ctx.fillText(bullet as string, MARGIN, yLine)
        }
        if (letterSpacing > 0) {
          // letterSpacing 수동 구현 (워드마크용)
          const total = [...line].reduce((acc, ch) => acc + ctx.measureText(ch).width + letterSpacing, -letterSpacing)
          let x =
            align === 'center'
              ? (this.width - total) / 2
              : align === 'right'
                ? this.width - MARGIN - total
                : MARGIN + indent
          for (const ch of line) {
            ctx.fillText(ch, x, yLine)
            x += ctx.measureText(ch).width + letterSpacing
          }
        } else {
          ctx.textAlign = align
          const x = align === 'center' ? this.width / 2 : align === 'right' ? this.width - MARGIN : MARGIN + indent
          ctx.fillText(line, x, yLine)
          ctx.textAlign = 'left'
        }
      })
      this.y += lh
    }
    return shown.length
  }

  /** 좌/우 2열 한 줄 */
  row(left: string, right: string, opts?: { size?: number; weightL?: number; weightR?: number; mono?: boolean }) {
    const { size = 19, weightL = 500, weightR = 700, mono = false } = opts ?? {}
    const famL = mono ? this.fonts.mono : this.fonts.sans
    const famR = this.fonts.sans
    const lh = Math.round(size * 1.6)
    const yLine = this.y + lh / 2
    this.ops.push((ctx) => {
      ctx.fillStyle = INK
      ctx.textBaseline = 'middle'
      ctx.font = this.font(size, weightL, famL)
      ctx.textAlign = 'left'
      ctx.fillText(left, MARGIN, yLine)
      ctx.font = this.font(size, weightR, famR)
      ctx.textAlign = 'right'
      ctx.fillText(right, this.width - MARGIN, yLine)
      ctx.textAlign = 'left'
    })
    this.y += lh
  }

  /** 특성 바 (SIGNALS) */
  bar(label: string, value: number, max = 10) {
    const size = 17
    const lh = 30
    const labelW = 118
    const barX = MARGIN + labelW
    const barW = this.width - MARGIN - barX - 44
    const yTop = this.y
    this.ops.push((ctx) => {
      ctx.fillStyle = INK
      ctx.textBaseline = 'middle'
      ctx.font = this.font(size, 600, this.fonts.sans)
      ctx.fillText(label, MARGIN, yTop + lh / 2)
      const bh = 12
      const by = Math.round(yTop + (lh - bh) / 2)
      strokeRectCrisp(ctx, barX, by, barW, bh, 2)
      const ratio = Math.max(0, Math.min(1, value / max))
      ctx.fillRect(barX, by, Math.round(barW * ratio), bh)
      ctx.font = this.font(15, 700, this.fonts.mono)
      ctx.textAlign = 'right'
      ctx.fillText(String(value), this.width - MARGIN, yTop + lh / 2)
      ctx.textAlign = 'left'
    })
    this.y += lh
  }

  /** 사진 삽입 — 감열지용 톤매핑(2%/98% 스트레치 + 감마) 후 Floyd-Steinberg로 미리 1비트화.
   *  셸의 임계값 170 패스는 0/255 픽셀을 건드리지 않으므로, 어두운 셀피도 원판 그대로 인쇄된다. */
  /**
   * 촬영본. 폭을 꽉 채우는 것이 기준이고, maxH 는 세로로 극단적인 사진이
   * 용지를 통째로 먹는 것을 막는 안전장치다 (예전 360px 은 3:4 사진의 폭을
   * 절반으로 줄여 버렸다).
   */
  photo(img: HTMLImageElement, maxH = 900) {
    const w = this.innerWidth()
    const scale = Math.min(w / img.naturalWidth, maxH / img.naturalHeight)
    const dw = Math.round(img.naturalWidth * scale)
    const dh = Math.round(img.naturalHeight * scale)
    const dx = Math.round((this.width - dw) / 2)
    const yTop = Math.round(this.y)
    this.ops.push((ctx) => {
      ctx.drawImage(ditherForThermal(img, dw, dh), dx, yTop)
      strokeRectCrisp(ctx, dx, yTop, dw, dh, 2)
    })
    this.y = yTop + dh
  }

  /** 사주 명식표 — 4열 × 106dot + 3갭 × 12dot = 460dot (inner 폭과 정확히 일치).
   *  오행은 색이 아니라 한자 마커로 표기한다(감열 흑백에서 5색은 전부 같은 검정이 된다). */
  pillars(list: (ReceiptPillar | null)[]) {
    const colW = 106
    const gap = 12
    const headH = 28
    const tileH = 106
    const yTop = Math.round(this.y)

    this.ops.push((ctx) => {
      ctx.textBaseline = 'middle'
      list.forEach((p, i) => {
        const x = MARGIN + i * (colW + gap)

        // 열 머리 — 일주는 반전으로 강조 (흑백에서 가장 값싼 앵커)
        const head = p?.head ?? '時柱'
        if (p?.isDay) {
          ctx.fillStyle = INK
          ctx.fillRect(x, yTop, colW, headH)
          ctx.fillStyle = '#ffffff'
        } else {
          ctx.fillStyle = INK
        }
        ctx.font = this.font(19, 700, this.fonts.hanja)
        ctx.textAlign = 'center'
        ctx.fillText(head, x + colW / 2, yTop + headH / 2)

        const drawTile = (ty: number, hanja: string, read: string, element: string, dashed: boolean) => {
          if (dashed) {
            // 시 미상 — 점선 테두리 (A4의 opacity 0.15는 감열에서 백지가 된다)
            ctx.fillStyle = INK
            for (let dx = x; dx < x + colW; dx += 8) ctx.fillRect(dx, ty, 4, 2)
            for (let dx = x; dx < x + colW; dx += 8) ctx.fillRect(dx, ty + tileH - 2, 4, 2)
            for (let dy = ty; dy < ty + tileH; dy += 8) ctx.fillRect(x, dy, 2, 4)
            for (let dy = ty; dy < ty + tileH; dy += 8) ctx.fillRect(x + colW - 2, dy, 2, 4)
          } else {
            strokeRectCrisp(ctx, x, ty, colW, tileH, p?.isDay ? 3 : 2)
          }
          ctx.fillStyle = INK
          if (element) {
            ctx.font = this.font(15, 600, this.fonts.hanja)
            ctx.textAlign = 'right'
            ctx.fillText(element, x + colW - 8, ty + 16)
          }
          ctx.textAlign = 'center'
          // 56dot 미만으로 내리면 획이 디더링에서 끊긴다
          ctx.font = this.font(52, 800, this.fonts.hanja)
          ctx.fillText(hanja, x + colW / 2, ty + 46)
          ctx.font = this.font(16, 500, this.fonts.sans)
          ctx.fillText(read, x + colW / 2, ty + tileH - 18)
        }

        const t1 = yTop + headH + 6
        const t2 = t1 + tileH + 6
        if (p) {
          drawTile(t1, p.ganHanja, p.ganRead, p.ganElement, false)
          drawTile(t2, p.jiHanja, p.jiRead, p.jiElement, false)
        } else {
          drawTile(t1, '—', '시 미상', '', true)
          drawTile(t2, '—', '', '', true)
        }
      })
      ctx.textAlign = 'left'
    })

    this.y = yTop + headH + 6 + tileH + 6 + tileH
  }

  /** 팔레트 색상 견본 (흑백 인쇄용 — 테두리 사각형 + HEX 텍스트) */
  palette(colors: string[]) {
    const n = Math.min(colors.length, 4)
    if (n === 0) return
    const gap = 10
    const w = Math.floor((this.innerWidth() - gap * (n - 1)) / n)
    const h = 26
    const yTop = this.y
    this.ops.push((ctx) => {
      for (let i = 0; i < n; i++) {
        const x = MARGIN + i * (w + gap)
        strokeRectCrisp(ctx, x, Math.round(yTop), w, h, 2)
        ctx.fillStyle = INK
        ctx.font = this.font(13, 600, this.fonts.mono)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(colors[i].toUpperCase(), x + w / 2, yTop + h / 2)
        ctx.textAlign = 'left'
      }
    })
    this.y += h
  }

  render(): { canvas: HTMLCanvasElement; height: number } {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = Math.max(64, Math.ceil(this.y))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const op of this.ops) op(ctx)
    return { canvas, height: canvas.height }
  }
}

/** 영수증에 실제로 찍히는 글자를 한 문자열로 모은다 (웹폰트 조각 선로딩용) */
function collectReceiptText(data: ReceiptData): string {
  const parts: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') parts.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(data)
  return parts.join(' ')
}

export async function renderKioskReceipt(
  data: ReceiptData,
  opts: ReceiptRenderOptions = {}
): Promise<{ base64: string; dataUrl: string; width: number; height: number }> {
  const width = opts.width ?? 512
  const fonts = resolveFonts(opts.lang)
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      // fonts.ready는 '이미 요청된' 페이스만 기다린다 — 캔버스가 쓰는 웨이트를 명시적으로 로드
      /* CJK 웹폰트는 unicode-range 로 잘게 쪼개져 있다 — 실제로 찍을 글자를 넘겨야
         그 글자가 든 조각만 받아온다. 안 넘기면 캔버스가 빈칸(두부)으로 그려진다. */
      const sampleText = collectReceiptText(data)
      await Promise.all([
        ...[500, 600, 700, 800].map((w) => document.fonts.load(`${w} 20px ${fonts.sans}`, sampleText)),
        document.fonts.load(`800 44px ${fonts.display}`, sampleText),
        // 명식 한자는 unicode-range 분할 서브셋이라 쓰일 글자를 명시해야 실제로 받아온다
        document.fonts.load(`800 52px ${fonts.hanja}`, '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水柱時日月年'),
      ])
      await document.fonts.ready
    } catch {
      /* 폰트 로드 실패 시 폴백 폰트로 진행 */
    }
  }
  const b = new ReceiptBuilder(width, fonts)

  // ── 헤더
  b.space(34)
  b.text("AC'SCENT", { size: 46, weight: 800, family: 'display', align: 'center', letterSpacing: 6, lineHeight: 1.1 })
  b.space(6)
  b.text('WOW · SCENT REPORT', { size: 16, weight: 600, family: 'mono', align: 'center', letterSpacing: 3 })
  b.space(18)
  b.rule(3)
  b.space(10)

  // ── 발권 정보
  b.row(`${data.date}  ${data.time}`, data.ticket ? `NO. ${data.ticket}` : 'PREVIEW', { mono: true })
  b.row('NAME', data.customerName || '-', { mono: true })
  b.row('PRODUCT', data.productLabel, { mono: true })
  b.space(10)
  b.rule(1.5, true)

  // ── 사진
  if (opts.photoSrc) {
    const img = await loadImage(opts.photoSrc)
    if (img) {
      b.space(16)
      b.photo(img)
    }
  }

  // ── 매칭 향
  b.space(22)
  b.text('YOUR SCENT', { size: 16, weight: 600, family: 'mono', align: 'center', letterSpacing: 3 })
  b.space(8)
  b.text(`No. ${data.perfumeNo}`, { size: 30, weight: 700, family: 'mono', align: 'center', lineHeight: 1.2 })
  b.space(4)
  b.text(data.perfumeName, { size: 44, weight: 800, align: 'center', lineHeight: 1.2 })
  b.space(6)
  b.text(`${data.categoryEn.toUpperCase()} · MATCH ${(data.score * 100).toFixed(0)}%`, {
    size: 17,
    weight: 600,
    family: 'mono',
    align: 'center',
    letterSpacing: 1,
  })
  if (data.keywords.length > 0) {
    b.space(10)
    b.text(data.keywords.map((k) => `#${k}`).join('  '), { size: 18, weight: 500, align: 'center', maxLines: 2 })
  }
  b.space(16)
  b.rule(1.5, true)
  b.space(12)

  // ── 노트
  b.row('TOP', data.notes.top)
  b.row('MIDDLE', data.notes.middle)
  b.row('BASE', data.notes.base)
  b.space(12)
  b.rule(1.5, true)
  b.space(14)

  // ── 사주: 명식 · 용신 · 처방 (사주 프로그램일 때만)
  if (data.saju) {
    const sj = data.saju
    b.text('四柱命式 · 명식', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(10)
    b.pillars(sj.pillars)
    b.space(14)
    b.row('日干 일간', sj.dayMaster, { size: 18 })
    b.row('用神 용신', sj.yongsin, { size: 18 })
    b.row('生時 생시', sj.birth, { size: 18, mono: true })
    b.space(12)

    b.text('오행 분포', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    for (const el of sj.elements) {
      // 용신 행만 ◀ 마커로 표시 — 색 없이도 처방의 근거가 읽힌다
      b.bar(`${el.label}${el.isYongsin ? ' ◀' : ''}`, el.value, 4)
    }
    b.space(14)
    b.rule(1.5, true)
    b.space(14)

    b.text('命과 香 · 처방의 연유', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    if (sj.bridge) {
      b.text(sj.bridge, { size: 20, weight: 700, lineHeight: 1.4 })
      b.space(6)
    }
    b.text(sj.why, { size: 18, weight: 500, lineHeight: 1.55, maxLines: 5 })
    b.space(14)

    for (const t of sj.tiers) {
      b.row(t.tier, t.name, { size: 18 })
      b.text(t.meaning, { size: 17, weight: 500, lineHeight: 1.5, maxLines: 2 })
      b.space(8)
    }
    b.space(6)
    if (sj.ritual) {
      b.text('處方 · 쓰는 법', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
      b.space(8)
      b.text(sj.ritual, { size: 18, weight: 500, lineHeight: 1.55, maxLines: 3 })
      b.space(14)
    }
  }

  // ── 분석 (이미지 분석 프로그램 전용 — 사주는 위 서사가 대신한다)
  if (!data.saju && data.analysisText) {
    b.text('ANALYSIS', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    b.text(data.analysisText, { size: 19, weight: 500, lineHeight: 1.55, maxLines: 6 })
    b.space(14)
  }

  // ── 퍼스널 컬러
  if (!data.saju && data.personalColorText) {
    b.text('PERSONAL COLOR', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    b.text(data.personalColorText, { size: 21, weight: 700 })
    b.space(8)
    b.palette(data.palette)
    b.space(14)
  }

  // ── 시그널 (사주판은 오행 분포가 그 역할을 한다)
  if (!data.saju && data.signals.length > 0) {
    b.text('SIGNALS', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    for (const s of data.signals) b.bar(s.label, s.value)
    b.space(14)
  }

  b.rule(3)
  b.space(14)

  // ── 제조 레시피
  b.text('RECIPE', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
  b.space(4)
  b.text(data.recipeTitle ?? `${data.productLabel} 제조 레시피`, { size: 23, weight: 700 })
  b.space(10)
  for (const r of data.recipeRows) {
    b.row(`${r.id}`, `${r.ratio}%  ·  ${r.amountMl.toFixed(1)}ml (${r.amountG.toFixed(1)}g)`, {
      size: 19,
      weightL: 700,
      mono: true,
    })
    b.text(r.name, { size: 18, weight: 500 })
    b.space(6)
  }
  b.row('BASE', data.baseText, { size: 19, mono: true })
  b.space(10)
  for (let i = 0; i < data.steps.length; i++) {
    b.text(`${i + 1}. ${data.steps[i]}`, { size: 18, weight: 500, lineHeight: 1.5 })
  }
  b.space(14)
  b.rule(1.5, true)
  b.space(12)

  // ── 푸터
  for (const line of data.footerLines) {
    b.text(line, { size: 17, weight: 500, align: 'center', lineHeight: 1.6 })
  }
  b.space(16)

  // ── 주의사항 (실물 라벨 PRECAUTION과 동일 문구)
  b.rule(1.5, true)
  b.space(12)
  b.text('PRECAUTION', { size: 16, weight: 600, family: 'mono', align: 'center', letterSpacing: 3 })
  b.space(10)
  for (const line of data.precautions ?? RECEIPT_PRECAUTIONS) {
    // 감열 인쇄에서 체크 글리프는 뭉개지므로 가운뎃점으로 대신한다.
    // 넘친 줄은 불릿 아래가 아니라 글 시작점에 맞춘다 (일본어·중국어는 길어서 자주 넘친다)
    b.text(line, { size: 17, weight: 500, lineHeight: 1.5, bullet: '·' })
    b.space(3)
  }
  b.space(16)

  // ── 카운터 제출 안내 — 맨 아래.
  //   손님이 영수증을 떼어 들었을 때 마지막으로 눈에 들어와야 하는 행동 지시라서
  //   주의사항보다 뒤에 둔다.
  //   첫 줄(제출 안내)은 손님이 꼭 읽어야 한다 — 향 번호(No.) 크기를 상한으로 폭에 맞춘다.
  //   두 줄째부터(준비 안내)는 보조 문장이라 작게. 둘 다 반드시 한 줄로 끊김 없이.
  if (data.counterNotice?.length) {
    b.rule(1.5, true)
    b.space(14)
    const [headline, ...rest] = data.counterNotice
    b.text(headline, { size: b.fitOneLine(headline, 30, 800), weight: 800, align: 'center', lineHeight: 1.3 })
    for (const line of rest) {
      b.space(4)
      b.text(line, { size: b.fitOneLine(line, 17, 500), weight: 500, align: 'center', lineHeight: 1.5 })
    }
  }
  b.space(30)

  const { canvas, height } = b.render()
  const dataUrl = canvas.toDataURL('image/png')
  return { base64: dataUrl.split(',')[1], dataUrl, width, height }
}
