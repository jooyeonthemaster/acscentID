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
  /** 십성(十星) — 감정서형 명식표. 일주 천간은 '日主' */
  ganGod?: string
  jiGod?: string
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
  /** 사주 제목들 — 화면 언어(src/lib/kiosk/saju-i18n.ts receipt). 없으면 한국어 */
  labels?: {
    myeongsik: string
    dayMaster: string
    yongsin: string
    born: string
    elements: string
    bridge: string
    ritual: string
    rxScent: string
    title: string
    sheetSub?: string
    info?: [string, string, string, string, string]
    rows?: [string, string, string, string]
    seal?: [string, string]
  }
  /** 감정서형 정보표 — 성별 표시·생년월일·생시 */
  genderText?: string
  birthDate?: string
  birthTime?: string
}

const SAJU_LABELS_KO = {
  myeongsik: '四柱命式 · 명식', dayMaster: '日干 일간', yongsin: '用神 용신', born: '生時 생시', elements: '오행 분포',
  bridge: '命과 香 · 처방의 연유', ritual: '處方 · 쓰는 법', rxScent: '處方 香 · 처방 향', title: '사주 향 처방전',
}

/** AI 퍼스널 컬러 — 흑백 감열지라 색 견본 대신 유형 이름·색 이름·눈금으로 찍는다 (extra-receipt.ts 가 만든다) */
export interface ReceiptColor {
  title: string
  typeName: string
  undertone: string
  nickname: string
  summary: string
  toneLabel: string
  gauges: { label: string; low: string; high: string; value: number }[]
  bestLabel: string
  bestNames: string[]
  avoidLabel: string
  avoidNames: string[]
  stylingLabel: string
  styling: { label: string; text: string }[]
}

export interface ReceiptTarotCard {
  position: string
  roman: string
  name: string
  orientation: string
  reversed: boolean
  element: 'fire' | 'water' | 'air' | 'earth'
  title: string
  keywords: string
  /** 앞면 원화 주소 — 있으면 카드 칸에 흑백 점묘로 찍는다(못 불러오면 예전 글자 카드) */
  artSrc?: string
}

/** AI 타로 — 뽑힌 세 장을 카드 모양으로 그리고 자리별 한 줄·흐름·조언을 찍는다 */
export interface ReceiptTarot {
  title: string
  topic: string
  question?: string
  headline: string
  cards: ReceiptTarotCard[]
  flowLabel: string
  flow: string
  adviceLabel: string
  advice: string[]
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
  /** AI 퍼스널 컬러 · AI 타로일 때만 — 진단서/리딩만 찍는다. 향·레시피·제품 주의사항·카운터 안내·티켓 번호는 없다
   *  (이 두 프로그램은 향을 추천하지 않는다 — perfumeNo·recipeRows 등 향 칸은 비워 넘긴다) */
  color?: ReceiptColor
  tarot?: ReceiptTarot
}

export interface ReceiptRenderOptions {
  width?: number // 기본 512 (프린터 헤드 도트 폭)
  photoSrc?: string | null // 촬영 사진 dataURL — 있으면 흑백으로 삽입
  /** 화면 언어 — 한자권이면 본문 글꼴을 그 언어 웹폰트로 바꾼다 */
  lang?: 'ko' | 'en' | 'ja' | 'zh-Hans' | 'zh-Hant'
  /** 운영 모드(src/lib/kiosk/modes.ts)의 영수증 모양 — 없으면 매장 기본(WOW · SCENT REPORT) */
  brand?: {
    /** 'saju' 면 명식이 맨 앞에 오는 사주 처방전 순서(데이터에 saju 가 있을 때만) */
    theme?: 'scent' | 'saju'
    subtitle?: string
    /** 맨 아래 행사 안내 줄 */
    eventLines?: string[]
    /** 제조 레시피를 굵은 상자로 감싼다 — 손님이 직접 조향하는 행사장에서 레시피를 바로 찾게 */
    recipeBox?: boolean
    /** 사주 영수증 양식 — 'sheet'(사주 감정서형, 기본) · 'prescription'(이전 처방전형 그대로) */
    receiptStyle?: 'sheet' | 'prescription'
    /** 한자 글꼴 — 'kaishu'(霞鶩文楷) · 'gothic'(Noto Sans TC, 이전) */
    hanjaFont?: 'kaishu' | 'gothic'
  }
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

function resolveFonts(lang?: string, kaishu = false): Fonts {
  // 한국어 전용 글꼴로 가나·간체를 그리면 빈칸이 된다 — 언어 글꼴을 앞에 세운다
  const cjk = lang ? CJK_FONT_VAR[lang] : undefined
  if (cjk) {
    const family = cssFontFamily(cjk.varName, cjk.fallback)
    return {
      sans: family,
      display: family,
      mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace",
      hanja: kaishu ? `'ACS WenKai TC', ${family}` : family,
    }
  }
  const sans = cssFontFamily('--font-score-dream', "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif")
  // 명식 한자도 고딕으로 — 명조는 쓰지 않는다. 에스코어드림엔 한자가 없어 맑은 고딕(키오스크 Windows)이 받는다
  const hanjaSans = cssFontFamily('--font-noto-tc', "'Microsoft JhengHei', sans-serif")
  return {
    sans,
    display: sans,
    mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace",
    // 해서(霞鶩文楷) — 사주 감정서형 기본. 'gothic' 이면 이전 그대로(맑은 고딕·Noto Sans TC)
    hanja: kaishu
      ? `'ACS WenKai TC', 'Malgun Gothic', ${hanjaSans}`
      : `'Malgun Gothic', 'Apple SD Gothic Neo', ${hanjaSans}`,
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
/** toneTarget — 감마로 맞출 평균 밝기. 사진은 150, 선화(타로 원화)는 175 로 밝게 해야 선이 또렷하다(150 이면 면이 점으로 탁해진다) */
function ditherForThermal(img: HTMLImageElement, dw: number, dh: number, toneTarget = 150): HTMLCanvasElement {
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
  const gamma = Math.max(0.45, Math.min(2.4, Math.log(toneTarget / 255) / Math.log(Math.max(1, mean) / 255)))
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

  /** 위(yTop)부터 지금까지를 굵은 테두리 상자로 감싼다 — 본문(MARGIN)보다 바깥으로 그려 안쪽 여백을 만든다 */
  box(yTop: number, thickness = 3) {
    const t = Math.max(1, Math.round(thickness))
    const top = Math.round(yTop), bottom = Math.round(this.y)
    const x = MARGIN - 14, w = this.width - x * 2
    this.ops.push((ctx) => {
      ctx.fillStyle = INK
      ctx.fillRect(x, top, w, t)
      ctx.fillRect(x, bottom - t, w, t)
      ctx.fillRect(x, top, t, bottom - top)
      ctx.fillRect(x + w - t, top, t, bottom - top)
    })
  }

  /** 어절 단위 줄바꿈 텍스트. 반환값은 그려진 줄 수 */
  text(
    str: string,
    opts: {
      size: number
      weight?: number
      family?: 'sans' | 'display' | 'mono' | 'hanja'
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

  // ───────── 사주 감정서형 부품 ─────────

  /** 테두리 상자 안 '항목 | 값' 표 (성명·생년월일 등). 왼쪽 칸은 한자 머리 */
  infoTable(rows: [string, string][]) {
    const x = MARGIN, w = this.width - MARGIN * 2
    const rowH = 38, keyW = 124
    const yTop = Math.round(this.y)
    const h = rowH * rows.length
    this.ops.push((ctx) => {
      strokeRectCrisp(ctx, x, yTop, w, h, 2)
      ctx.fillStyle = INK
      ctx.fillRect(x + keyW, yTop, 2, h)
      rows.forEach(([k, v], i) => {
        const ry = yTop + i * rowH
        if (i > 0) ctx.fillRect(x, ry, w, 1)
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.font = this.font(18, 700, this.fonts.hanja)
        ctx.fillText(k, x + keyW / 2, ry + rowH / 2)
        ctx.textAlign = 'left'
        ctx.font = this.font(18, 600, this.fonts.sans)
        let value = v
        while (value.length > 1 && ctx.measureText(value).width > w - keyW - 20) value = value.slice(0, -1)
        ctx.fillText(value, x + keyW + 12, ry + rowH / 2)
      })
      ctx.textAlign = 'left'
    })
    this.y = yTop + h
  }

  /** 명식표 — 열: 時 日 月 年, 행: 十星 / 天干 / 地支 / 十星. 격자 선으로 감정서처럼 */
  sheetPillars(list: (ReceiptPillar | null)[], rowLabels: [string, string, string, string]) {
    const x0 = MARGIN, w = this.width - MARGIN * 2
    const labelW = 52
    const colW = Math.floor((w - labelW) / 4)
    const heads = ['時柱', '日柱', '月柱', '年柱']
    const hHead = 34, hGod = 30, hGlyph = 96
    const rowsH = [hHead, hGod, hGlyph, hGlyph, hGod]
    const yTop = Math.round(this.y)
    const total = rowsH.reduce((a, b) => a + b, 0)
    const tableW = labelW + colW * 4
    this.ops.push((ctx) => {
      ctx.fillStyle = INK
      strokeRectCrisp(ctx, x0, yTop, tableW, total, 3)
      // 세로선
      ctx.fillRect(x0 + labelW, yTop, 2, total)
      for (let c = 1; c < 4; c++) ctx.fillRect(x0 + labelW + c * colW, yTop, 1, total)
      // 가로선
      let yy = yTop
      rowsH.forEach((rh, r) => { if (r > 0) ctx.fillRect(x0, yy, tableW, r === 1 ? 2 : 1); yy += rh })
      // 머리줄 — 일주 반전
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      heads.forEach((hd, c) => {
        const cx = x0 + labelW + c * colW
        const isDay = list[c]?.isDay
        if (isDay) { ctx.fillStyle = INK; ctx.fillRect(cx, yTop, colW, hHead) }
        ctx.fillStyle = isDay ? '#ffffff' : INK
        ctx.font = this.font(19, 700, this.fonts.hanja)
        ctx.fillText(hd, cx + colW / 2, yTop + hHead / 2)
      })
      // 왼쪽 행 이름
      ctx.fillStyle = INK
      ctx.font = this.font(15, 700, this.fonts.hanja)
      let ry = yTop + hHead
      rowLabels.forEach((lb, r) => {
        const rh = rowsH[r + 1]
        // 두 글자 세로 쓰기(天/干)
        const chars = [...lb]
        if (chars.length === 2 && rh >= 60) {
          ctx.font = this.font(20, 700, this.fonts.hanja)
          ctx.fillText(chars[0], x0 + labelW / 2, ry + rh / 2 - 13)
          ctx.fillText(chars[1], x0 + labelW / 2, ry + rh / 2 + 13)
          ctx.font = this.font(15, 700, this.fonts.hanja)
        } else ctx.fillText(lb, x0 + labelW / 2, ry + rh / 2)
        ry += rh
      })
      // 칸 내용
      list.forEach((p, c) => {
        const cx = x0 + labelW + c * colW + colW / 2
        let cy = yTop + hHead
        const god = (t: string | undefined, rh: number) => { ctx.font = this.font(16, 700, this.fonts.hanja); ctx.fillText(t || '', cx, cy + rh / 2) }
        const glyph = (g: string, el: string, rh: number) => {
          ctx.font = this.font(58, 700, this.fonts.hanja)
          ctx.fillText(g, cx, cy + rh / 2 - 8)
          if (el) { ctx.font = this.font(15, 700, this.fonts.hanja); ctx.fillText(el, cx, cy + rh - 13) }
        }
        if (!p) {
          ctx.font = this.font(30, 700, this.fonts.hanja)
          ctx.fillText('—', cx, yTop + hHead + hGod + hGlyph)
          return
        }
        god(p.ganGod, hGod); cy += hGod
        glyph(p.ganHanja, p.ganElement, hGlyph); cy += hGlyph
        glyph(p.jiHanja, p.jiElement, hGlyph); cy += hGlyph
        god(p.jiGod, hGod)
      })
      ctx.textAlign = 'left'
    })
    this.y = yTop + total
  }

  /** 오행 다섯 칸 — 한자·개수·막대, 용신 칸은 반전 */
  sheetElements(list: { hanja: string; value: number; isYongsin: boolean }[], yongsinLabel: string) {
    const x0 = MARGIN, w = this.width - MARGIN * 2
    const n = list.length || 5
    const cw = Math.floor(w / n)
    const h = 118
    const yTop = Math.round(this.y)
    const max = Math.max(1, ...list.map(e => e.value))
    this.ops.push((ctx) => {
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      list.forEach((e, i) => {
        const x = x0 + i * cw
        ctx.fillStyle = INK
        if (e.isYongsin) ctx.fillRect(x + 3, yTop, cw - 6, h)
        else strokeRectCrisp(ctx, x + 3, yTop, cw - 6, h, 2)
        ctx.fillStyle = e.isYongsin ? '#ffffff' : INK
        ctx.font = this.font(40, 700, this.fonts.hanja)
        ctx.fillText(e.hanja, x + cw / 2, yTop + 34)
        ctx.font = this.font(22, 800, this.fonts.mono)
        ctx.fillText(String(e.value), x + cw / 2, yTop + 72)
        // 막대 — 개수를 5칸 눈금으로
        const cells = 5, cellW = Math.floor((cw - 26) / cells)
        const filled = Math.round((e.value / max) * cells)
        for (let k = 0; k < cells; k++) {
          const bx = x + 13 + k * cellW, by = yTop + 92
          if (k < filled) ctx.fillRect(bx, by, cellW - 3, 12)
          else { ctx.fillRect(bx, by, cellW - 3, 2); ctx.fillRect(bx, by + 10, cellW - 3, 2); ctx.fillRect(bx, by, 2, 12); ctx.fillRect(bx + cellW - 5, by, 2, 12) }
        }
        if (e.isYongsin) { ctx.font = this.font(14, 700, this.fonts.hanja); ctx.fillText(yongsinLabel, x + cw / 2, yTop + 10) }
      })
      ctx.textAlign = 'left'
    })
    this.y = yTop + h
  }

  /** 도장 — 감정서 끝의 네모 인장(흑백). 오른쪽에 붙인다 */
  seal(lines: [string, string]) {
    const size = 92
    const x = this.width - MARGIN - size, yTop = Math.round(this.y)
    this.ops.push((ctx) => {
      strokeRectCrisp(ctx, x, yTop, size, size, 4)
      strokeRectCrisp(ctx, x + 7, yTop + 7, size - 14, size - 14, 2)
      ctx.fillStyle = INK
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = this.font(30, 700, this.fonts.hanja)
      ctx.fillText(lines[0], x + size / 2, yTop + size / 2 - 17)
      ctx.fillText(lines[1], x + size / 2, yTop + size / 2 + 17)
      ctx.textAlign = 'left'
    })
    return { x, yTop, size }
  }

  // ───────── 퍼스널 컬러 · 타로 부품 ─────────

  /** 양 끝 이름이 붙은 눈금 — 0~100 자리에 검은 표식. 색 없이도 웜/쿨·밝기가 읽힌다 */
  gauge(label: string, low: string, high: string, value: number) {
    const size = 16
    const lh = 34
    const labelW = 104, endW = 78
    const trackX = MARGIN + labelW + endW + 8
    const trackW = this.width - MARGIN - endW - 8 - trackX
    const yMid = Math.round(this.y + lh / 2)
    this.ops.push((ctx) => {
      ctx.fillStyle = INK
      ctx.textBaseline = 'middle'
      ctx.font = this.font(17, 700, this.fonts.sans)
      ctx.textAlign = 'left'
      ctx.fillText(label, MARGIN, yMid)
      ctx.font = this.font(size, 500, this.fonts.sans)
      ctx.textAlign = 'right'
      ctx.fillText(low, trackX - 8, yMid)
      ctx.textAlign = 'left'
      ctx.fillText(high, trackX + trackW + 8, yMid)
      ctx.fillRect(trackX, yMid - 1, trackW, 2)
      for (let i = 0; i <= 4; i++) ctx.fillRect(trackX + Math.round((trackW - 2) * (i / 4)), yMid - 5, 2, 10)
      const mx = trackX + Math.round(trackW * Math.max(0, Math.min(1, value / 100)))
      ctx.fillRect(mx - 5, yMid - 11, 10, 22)
    })
    this.y += lh
  }

  /**
   * 타로 세 장 — 자리 이름(반전 띠) · 카드 · 정/역방향.
   * 원화(arts)가 있으면 카드 칸에 흑백 점묘(사진과 같은 감열 처리)로 찍고 그 아래 이름, 역방향은 원화를 거꾸로.
   * 원화가 없으면 예전 글자 카드(로마 숫자·원소 기호·이름, 역방향은 안쪽을 거꾸로).
   */
  tarotCards(cards: ReceiptTarotCard[], arts: (HTMLImageElement | null)[] = []) {
    const gap = 14
    const n = cards.length || 3
    const colW = Math.floor((this.innerWidth() - gap * (n - 1)) / n)
    // 원화 칸 — 카드 안쪽 여백 11, 원화 비율 그대로(350×600)
    const pad = 11
    const artW = colW - pad * 2
    const artRatio = arts.find(Boolean) ? arts.find(Boolean)!.naturalHeight / arts.find(Boolean)!.naturalWidth : 0
    const artH = artRatio ? Math.round(artW * artRatio) : 0
    const nameH = 30
    const headH = 28, cardH = artH ? pad + artH + 6 + nameH + 6 : Math.round(colW * 1.45), footH = 26
    // 점묘는 미리 만들어 둔다(그리기 단계는 동기)
    const dithered = arts.map((img) => (img && artH ? ditherForThermal(img, artW, artH, 175) : null))
    const yTop = Math.round(this.y)
    this.ops.push((ctx) => {
      cards.forEach((card, i) => {
        const x = MARGIN + i * (colW + gap)
        const cy = yTop + headH + 6
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.fillStyle = INK
        ctx.fillRect(x, yTop, colW, headH)
        ctx.fillStyle = '#ffffff'
        ctx.font = this.font(17, 700, this.fonts.sans)
        ctx.fillText(card.position, x + colW / 2, yTop + headH / 2)

        strokeRectCrisp(ctx, x, cy, colW, cardH, 3)
        strokeRectCrisp(ctx, x + 7, cy + 7, colW - 14, cardH - 14, 1)
        const fitName = (max: number) => {
          let size = max
          ctx.font = this.font(size, 800, this.fonts.sans)
          while (size > 11 && ctx.measureText(card.name).width > colW - 24) {
            size -= 1
            ctx.font = this.font(size, 800, this.fonts.sans)
          }
        }
        const art = dithered[i]
        if (art) {
          const ax = x + pad, ay = cy + pad
          ctx.save()
          if (card.reversed) {
            ctx.translate(ax + artW / 2, ay + artH / 2)
            ctx.rotate(Math.PI)
            ctx.drawImage(art, -artW / 2, -artH / 2)
          } else {
            ctx.drawImage(art, ax, ay)
          }
          ctx.restore()
          // 이름은 종이에서 읽히게 늘 바로 — 방향은 카드 아래 줄이 알려 준다
          ctx.fillStyle = INK
          fitName(19)
          ctx.fillText(card.name, x + colW / 2, ay + artH + 6 + nameH / 2)
          ctx.font = this.font(15, 600, this.fonts.sans)
          ctx.fillText(card.orientation, x + colW / 2, cy + cardH + 6 + footH / 2)
          return
        }
        ctx.save()
        ctx.translate(x + colW / 2, cy + cardH / 2)
        if (card.reversed) ctx.rotate(Math.PI)
        ctx.fillStyle = INK
        ctx.font = this.font(30, 700, "Georgia, 'Times New Roman', serif")
        ctx.fillText(card.roman, 0, -cardH / 2 + 34)
        // 이름 — 칸 폭에 맞춰 줄인다
        fitName(19)
        ctx.fillText(card.name, 0, cardH / 2 - 30)
        ctx.restore()
        // 원소 기호 — 불 △ · 바람 △에 가로줄 · 물 ▽ · 흙 ▽에 가로줄.
        // 뒤집히면 다른 원소가 되므로 역방향 카드에서도 돌리지 않고 가운데에 그린다
        const up = card.element === 'fire' || card.element === 'air'
        const gx = x + colW / 2, gy = cy + cardH / 2
        const r = 26
        ctx.lineWidth = 3
        ctx.strokeStyle = INK
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(gx, gy + (up ? -r : r))
        ctx.lineTo(gx + r, gy + (up ? r - 4 : -r + 4))
        ctx.lineTo(gx - r, gy + (up ? r - 4 : -r + 4))
        ctx.closePath()
        ctx.stroke()
        if (card.element === 'air' || card.element === 'earth') ctx.fillRect(gx - 15, gy + (up ? 4 : -7), 30, 3)

        ctx.fillStyle = INK
        ctx.font = this.font(15, 600, this.fonts.sans)
        ctx.fillText(card.orientation, x + colW / 2, cy + cardH + 6 + footH / 2)
      })
      ctx.textAlign = 'left'
    })
    this.y = yTop + headH + 6 + cardH + 6 + footH
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
  const fonts = resolveFonts(opts.lang, opts.brand?.hanjaFont === 'kaishu')
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
        document.fonts.load(`800 52px ${fonts.hanja}`, '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水柱時日月年四香處方箋比肩劫財食神傷官偏正印官主鑑定書室之姓名性別生時辰十星天干地支用神氏'),
      ])
      await document.fonts.ready
    } catch {
      /* 폰트 로드 실패 시 폴백 폰트로 진행 */
    }
  }
  // 타로 원화 — 타로 첫 화면에서 받아 둔 것이라 보통 바로 온다. 망이 끊겨도 영수증이 멈추지 않게 4초 안에 못 받으면 글자 카드로
  const tarotArt = data.tarot
    ? await Promise.all(data.tarot.cards.map((card) => card.artSrc
      ? Promise.race([loadImage(card.artSrc), new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))])
      : Promise.resolve(null)))
    : []
  const b = new ReceiptBuilder(width, fonts)

  // ── 헤더
  const sajuFirst = opts.brand?.theme === 'saju' && !!data.saju
  // 사주 감정서형 — 철학관 감정서처럼 정보표·명식 격자표·오행 칸·인장. 'prescription' 이면 아래 이전 처방전형 그대로
  const sheet = sajuFirst && opts.brand?.receiptStyle !== 'prescription'
  const L: NonNullable<ReceiptSaju['labels']> = data.saju?.labels ?? SAJU_LABELS_KO
  if (sheet) {
    b.space(30)
    b.text("AC'SCENT", { size: 32, weight: 800, family: 'display', align: 'center', letterSpacing: 6, lineHeight: 1.1 })
    b.space(4)
    b.text(opts.brand?.subtitle ?? 'SAJU SCENT', { size: 14, weight: 600, family: 'mono', align: 'center', letterSpacing: 3 })
    b.space(14)
    b.rule(3)
    b.space(3)
    b.rule(1)
    b.space(16)
    b.text('四柱鑑定書', { size: 56, weight: 700, family: 'hanja', align: 'center', letterSpacing: 6, lineHeight: 1.15 })
    b.space(2)
    b.text(L.sheetSub ?? '사주 향 감정서', { size: 18, weight: 600, align: 'center', letterSpacing: 4 })
    b.space(16)
    b.rule(1)
    b.space(3)
    b.rule(3)
    b.space(16)
  }
  if (!sheet) {
  b.space(34)
  b.text("AC'SCENT", { size: 46, weight: 800, family: 'display', align: 'center', letterSpacing: 6, lineHeight: 1.1 })
  b.space(6)
  b.text(opts.brand?.subtitle ?? 'WOW · SCENT REPORT', { size: 16, weight: 600, family: 'mono', align: 'center', letterSpacing: 3 })
  if (sajuFirst) {
    // 사주 처방전 — 한약방 처방전처럼 큰 한자 제목을 두 줄 괘선 사이에
    b.space(16)
    b.rule(3)
    b.space(4)
    b.rule(1)
    b.space(14)
    b.text('四柱香 處方箋', { size: 40, weight: 800, family: 'hanja', align: 'center', letterSpacing: 4, lineHeight: 1.15 })
    b.space(4)
    b.text(L.title, { size: 18, weight: 600, align: 'center', letterSpacing: L.title === SAJU_LABELS_KO.title ? 6 : 2 })
    b.space(14)
    b.rule(1)
    b.space(4)
    b.rule(3)
    b.space(10)
  } else {
    b.space(18)
    b.rule(3)
    b.space(10)
  }

  // ── 발권 정보
  // 퍼스널 컬러·타로는 만들 제품이 없다 — 발권 번호·제품 줄을 찍지 않는다
  const noProduct = Boolean(data.color || data.tarot)
  b.row(`${data.date}  ${data.time}`, noProduct ? '' : data.ticket ? `NO. ${data.ticket}` : 'PREVIEW', { mono: true })
  b.row('NAME', data.customerName || '-', { mono: true })
  if (!noProduct) b.row('PRODUCT', data.productLabel, { mono: true })
  b.space(10)
  b.rule(1.5, true)
  }

  // ── 사진
  if (opts.photoSrc) {
    const img = await loadImage(opts.photoSrc)
    if (img) {
      b.space(16)
      b.photo(img)
    }
  }

  // 퍼스널 컬러·타로 — 진단서/리딩만
  const isExtra = Boolean(data.color || data.tarot)
  const heading = (label: string, align: 'left' | 'center' = 'left') =>
    b.text(label, { size: 16, weight: 700, align, letterSpacing: 2 })
  const drawColor = (c: ReceiptColor) => {
    b.space(20)
    heading(c.title, 'center')
    b.space(8)
    b.text(c.typeName, { size: b.fitOneLine(c.typeName, 46, 800), weight: 800, align: 'center', lineHeight: 1.2 })
    b.space(2)
    b.text(c.undertone, { size: 19, weight: 700, align: 'center' })
    b.space(6)
    b.text(c.nickname, { size: 20, weight: 600, align: 'center', lineHeight: 1.4, maxLines: 2 })
    b.space(14)
    b.rule(1.5, true)
    b.space(12)
    b.text(c.summary, { size: 18, weight: 500, lineHeight: 1.55, maxLines: 12 })
    b.space(14)
    heading(c.toneLabel)
    b.space(6)
    for (const g of c.gauges) b.gauge(g.label, g.low, g.high, g.value)
    b.space(12)
    heading(c.bestLabel)
    b.space(6)
    b.text(c.bestNames.join(' · '), { size: 19, weight: 700, lineHeight: 1.5 })
    b.space(10)
    heading(c.avoidLabel)
    b.space(6)
    b.text(c.avoidNames.join(' · '), { size: 18, weight: 500, lineHeight: 1.5 })
    b.space(14)
    heading(c.stylingLabel)
    b.space(6)
    for (const row of c.styling) {
      b.text(row.label, { size: 18, weight: 700 })
      b.text(row.text, { size: 17, weight: 500, lineHeight: 1.5, maxLines: 6 })
      b.space(8)
    }
    b.space(4)
    b.rule(3)
  }
  const drawTarot = (t: ReceiptTarot) => {
    b.space(20)
    heading(t.title, 'center')
    b.space(8)
    b.text(t.headline, { size: 30, weight: 800, align: 'center', lineHeight: 1.3, maxLines: 3 })
    b.space(4)
    b.text(t.question ? `${t.topic} · ${t.question}` : t.topic, { size: 17, weight: 500, align: 'center', lineHeight: 1.5, maxLines: 2 })
    b.space(16)
    b.tarotCards(t.cards, tarotArt)
    b.space(14)
    for (const card of t.cards) {
      // 정방향은 카드 그림 아래에 이미 찍혔다 — 줄 머리에는 역방향만 덧붙인다
      b.text(`${card.position} · ${card.roman} ${card.name}${card.reversed ? ` · ${card.orientation}` : ''}`, { size: 18, weight: 700, lineHeight: 1.6 })
      b.text(card.title, { size: 19, weight: 700, lineHeight: 1.45 })
      b.text(card.keywords, { size: 17, weight: 500, lineHeight: 1.5, maxLines: 2 })
      b.space(8)
    }
    b.space(4)
    b.rule(1.5, true)
    b.space(12)
    heading(t.flowLabel)
    b.space(8)
    b.text(t.flow, { size: 18, weight: 500, lineHeight: 1.55, maxLines: 16 })
    b.space(14)
    heading(t.adviceLabel)
    b.space(8)
    for (const [i, line] of t.advice.entries()) {
      b.text(line, { size: 18, weight: 500, lineHeight: 1.5, bullet: `${i + 1}.` })
      b.space(3)
    }
    b.space(8)
    b.rule(3)
  }
  const drawScent = () => {
    // ── 매칭 향
    b.space(22)
    b.text(sajuFirst ? L.rxScent : 'YOUR SCENT', { size: 16, weight: 600, family: 'mono', align: 'center', letterSpacing: 3 })
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

  }
  const drawSaju = () => {
    // ── 사주: 명식 · 용신 · 처방 (사주 프로그램일 때만)
    if (data.saju) {
      const sj = data.saju
      b.text(L.myeongsik, { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
      b.space(10)
      b.pillars(sj.pillars)
      b.space(14)
      b.row(L.dayMaster, sj.dayMaster, { size: 18 })
      b.row(L.yongsin, sj.yongsin, { size: 18 })
      b.row(L.born, sj.birth, { size: 18, mono: true })
      b.space(12)

      b.text(L.elements, { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
      b.space(8)
      for (const el of sj.elements) {
        // 용신 행만 ◀ 마커로 표시 — 색 없이도 처방의 근거가 읽힌다
        b.bar(`${el.label}${el.isYongsin ? ' ◀' : ''}`, el.value, 4)
      }
      b.space(14)
      b.rule(1.5, true)
      b.space(14)

      b.text(L.bridge, { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
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
        b.text(L.ritual, { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
        b.space(8)
        b.text(sj.ritual, { size: 18, weight: 500, lineHeight: 1.55, maxLines: 3 })
        b.space(14)
      }
    }

  }
  // 매장: 향 → (사주) · 사주 처방전: 명식 → 향
  const drawSheet = () => {
    const sj = data.saju!
    const info = L.info ?? ['姓名', '性別', '生年月日', '生時', '鑑定日']
    b.infoTable([
      [info[0], data.customerName || '-'],
      [info[1], sj.genderText || '-'],
      [info[2], sj.birthDate ?? sj.birth],
      [info[3], sj.birthTime ?? '-'],
      [info[4], `${data.date} ${data.time}${data.ticket ? `  · NO. ${data.ticket}` : ''}`],
    ])
    b.space(24)
    b.text(L.myeongsik, { size: 16, weight: 700, family: 'mono', letterSpacing: 3 })
    b.space(10)
    b.sheetPillars(sj.pillars, L.rows ?? ['十星', '天干', '地支', '十星'])
    b.space(12)
    b.row(L.dayMaster, sj.dayMaster, { size: 18 })
    b.row(L.yongsin, sj.yongsin, { size: 18 })
    b.space(18)
    b.text(L.elements, { size: 16, weight: 700, family: 'mono', letterSpacing: 3 })
    b.space(10)
    b.sheetElements(sj.elements.map(e => ({ hanja: e.label.match(/[木火土金水]/)?.[0] ?? e.label, value: e.value, isYongsin: e.isYongsin })), '用神')
    b.space(22)

    // 處方香 — 상자 안에 향 번호·이름·노트
    const top = b.y
    b.space(16)
    b.text(L.rxScent, { size: 16, weight: 700, family: 'mono', align: 'center', letterSpacing: 3 })
    b.space(6)
    b.text(`No. ${data.perfumeNo}`, { size: 28, weight: 700, family: 'mono', align: 'center', lineHeight: 1.2 })
    b.text(data.perfumeName, { size: 42, weight: 800, align: 'center', lineHeight: 1.2 })
    b.space(4)
    b.text(`${data.categoryEn.toUpperCase()} · ${data.productLabel}`, { size: 16, weight: 600, family: 'mono', align: 'center', letterSpacing: 1 })
    b.space(12)
    b.row('TOP', data.notes.top)
    b.row('MIDDLE', data.notes.middle)
    b.row('BASE', data.notes.base)
    b.space(12)
    b.box(top, 2)
    b.space(22)

    // 鑑定 — 처방의 연유·향 층·쓰는 법
    b.text(L.bridge, { size: 16, weight: 700, family: 'mono', letterSpacing: 3 })
    b.space(8)
    if (sj.bridge) { b.text(sj.bridge, { size: 21, weight: 800, lineHeight: 1.4 }); b.space(6) }
    b.text(sj.why, { size: 18, weight: 500, lineHeight: 1.55, maxLines: 5 })
    b.space(14)
    for (const t of sj.tiers) {
      b.row(t.tier, t.name, { size: 18 })
      b.text(t.meaning, { size: 17, weight: 500, lineHeight: 1.5, maxLines: 2 })
      b.space(8)
    }
    if (sj.ritual) {
      b.space(6)
      b.text(L.ritual, { size: 16, weight: 700, family: 'mono', letterSpacing: 3 })
      b.space(8)
      b.text(sj.ritual, { size: 18, weight: 500, lineHeight: 1.55, maxLines: 3 })
    }
    b.space(16)
    b.rule(3)
    b.space(14)
  }
  if (sheet) drawSheet()
  else if (sajuFirst) { drawSaju(); drawScent() }
  else if (data.color) drawColor(data.color)
  else if (data.tarot) drawTarot(data.tarot)
  else { drawScent(); drawSaju() }

  // ── 분석 (이미지 분석 프로그램 전용 — 사주는 위 서사가 대신한다)
  if (!data.saju && !isExtra && data.analysisText) {
    b.text('ANALYSIS', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    b.text(data.analysisText, { size: 19, weight: 500, lineHeight: 1.55, maxLines: 6 })
    b.space(14)
  }

  // ── 퍼스널 컬러
  if (!data.saju && !isExtra && data.personalColorText) {
    b.text('PERSONAL COLOR', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    b.text(data.personalColorText, { size: 21, weight: 700 })
    b.space(8)
    b.palette(data.palette)
    b.space(14)
  }

  // ── 시그널 (사주판은 오행 분포가 그 역할을 한다)
  if (!data.saju && !isExtra && data.signals.length > 0) {
    b.text('SIGNALS', { size: 16, weight: 600, family: 'mono', letterSpacing: 3 })
    b.space(8)
    for (const s of data.signals) b.bar(s.label, s.value)
    b.space(14)
  }

  // 퍼스널 컬러·타로는 향을 추천하지 않는다 — 레시피를 찍지 않는다(진단서/리딩이 굵은 선으로 끝나 있다)
  if (isExtra) b.space(14)
  if (!isExtra) {
  b.rule(3)
  b.space(14)

  // ── 제조 레시피
  const recipeBox = !!opts.brand?.recipeBox
  const recipeTop = b.y
  if (recipeBox) b.space(16)
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
  if (recipeBox) {
    b.space(16)
    b.box(recipeTop, 3)
    b.space(18)
  } else {
    b.space(14)
    b.rule(1.5, true)
    b.space(12)
  }

  }

  // ── 푸터
  for (const line of data.footerLines) {
    b.text(line, { size: 17, weight: 500, align: 'center', lineHeight: 1.6 })
  }
  // 행사 모드 — 어느 행사에서 뽑은 영수증인지
  if (opts.brand?.eventLines?.length) {
    b.space(8)
    for (const [i, line] of opts.brand.eventLines.entries()) {
      b.text(line, { size: i === 0 ? 18 : 16, weight: i === 0 ? 700 : 500, family: i === 0 ? 'mono' : 'sans', align: 'center', letterSpacing: i === 0 ? 1 : 0, lineHeight: 1.5 })
    }
  }
  // 감정서형 — 끝에 네모 인장(香室之印)
  if (sheet) {
    b.space(14)
    const seal = b.seal(L.seal ?? ['香室', '之印'])
    b.y = seal.yTop + seal.size
  }
  b.space(16)

  // 제품 주의사항·카운터 제출 안내·티켓 번호는 만들 제품이 있을 때만
  if (!isExtra) {
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
  // ── 티켓 번호 — 맨 아래에도 크게. 영수증을 떼어 들었을 때 직원이 바로 맞춰 볼 수 있게
  b.space(16)
  b.rule(3)
  b.space(12)
  b.text('TICKET', { size: 15, weight: 600, family: 'mono', align: 'center', letterSpacing: 4 })
  b.space(2)
  b.text(data.ticket ? `NO. ${data.ticket}` : 'PREVIEW', { size: data.ticket ? 44 : 28, weight: 800, family: 'mono', align: 'center', letterSpacing: 2, lineHeight: 1.2 })
  b.space(30)

  } else {
    b.space(14)
  }

  const { canvas, height } = b.render()
  const dataUrl = canvas.toDataURL('image/png')
  return { base64: dataUrl.split(',')[1], dataUrl, width, height }
}
