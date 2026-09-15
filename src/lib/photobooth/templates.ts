/**
 * 포토부스 템플릿(주인공 컷) 기하 정보
 *
 * 번들 템플릿은 인생네컷 아티스트 프레임처럼 투명 전경 PNG를 손님의 전체
 * 카메라 화면 위에 올린다. 관리자 업로드처럼 전경이 없는 구형 템플릿은
 * 빈 영역(freeStart~freeEnd)에 현장 촬영을 블렌딩하는 방식으로 호환한다.
 *
 * 번들 템플릿은 수치를 직접 지정하고, 관리자가 올린 템플릿은 detectFreeArea()로 자동 추정한다.
 */

export interface TemplateGeometry {
  /** 손님이 들어갈 빈 영역이 어느 쪽인지 */
  freeSide: 'left' | 'right'
  /** 빈 영역의 가로 범위 (0~1 정규화) */
  freeStart: number
  freeEnd: number
  /** 배경 톤 — 합성된 손님 사진에 얇게 입혀 색감을 맞춘다 */
  bgColor: string
}

export interface BoothTemplateAsset {
  id: string
  kind: 'template'
  title: string
  image_url: string
  /** 손님의 전체 카메라 화면 위에 올릴 투명 인물/캐릭터 레이어 */
  foreground_url?: string | null
  display_order: number
  event_id: string | null
}

export interface BoothFrameAsset {
  id: string
  kind: 'frame'
  title: string
  image_url: string
  display_order: number
  event_id: null
}

/** 사진 중앙과 이벤트 푸터를 가리지 않는 1200x1800 RGBA 상시 프레임. */
export const BUNDLED_FRAMES: BoothFrameAsset[] = [
  ['mono-minimal', '모노 미니멀'],
  ['birthday-party', '버스데이 파티'],
  ['pastel-hearts', '파스텔 하트'],
  ['starlight', '스타라이트'],
  ['velvet-ribbon', '벨벳 리본'],
  ['four-cut-pearl', '네컷 펄'],
].map(([slug, title], index) => ({
  id: `bundled-${slug}`,
  kind: 'frame' as const,
  title,
  image_url: `/assets/photobooth/frames/${slug}.png`,
  display_order: 100 + index,
  event_id: null,
}))

/**
 * 관리자 소재가 아직 없거나 설정 API가 잠시 unavailable이어도 바로 쓸 수 있는 상시 템플릿.
 * public/assets/photobooth/templates/*.png (1200x900)
 */
export const BUNDLED_TEMPLATES: BoothTemplateAsset[] = [
  {
    id: 'bundled-blossom-date',
    kind: 'template',
    title: '블라썸 데이트',
    image_url: '/assets/photobooth/templates/blossom-date.png',
    foreground_url: '/assets/photobooth/templates/blossom-date-cutout.png',
    display_order: 0,
    event_id: null,
  },
  {
    id: 'bundled-blue-spark',
    kind: 'template',
    title: '블루 스파크',
    image_url: '/assets/photobooth/templates/blue-spark.png',
    foreground_url: '/assets/photobooth/templates/blue-spark-cutout.png',
    display_order: 1,
    event_id: null,
  },
  {
    id: 'bundled-ribbon-cat',
    kind: 'template',
    title: '리본 캣',
    image_url: '/assets/photobooth/templates/ribbon-cat.png',
    foreground_url: '/assets/photobooth/templates/ribbon-cat-cutout.png',
    display_order: 2,
    event_id: null,
  },
]

/** 번들 템플릿의 확정 기하 (이미지 구도에 맞춰 직접 측정) */
const BUNDLED_GEOMETRY: Record<string, TemplateGeometry> = {
  // 인물 좌측(붉은 가디건) · 우측 벚꽃 배경이 빔
  'bundled-blossom-date': {
    freeSide: 'right',
    freeStart: 0.56,
    freeEnd: 1,
    bgColor: '#f2c0c4',
  },
  // 인물 우측 · 좌측 푸른 무대 조명이 빔
  'bundled-blue-spark': {
    freeSide: 'left',
    freeStart: 0,
    freeEnd: 0.44,
    bgColor: '#2e6fb8',
  },
  // 고양이 중앙좌측 · 우측 크림 배경이 빔
  'bundled-ribbon-cat': {
    freeSide: 'right',
    freeStart: 0.62,
    freeEnd: 1,
    bgColor: '#f0e3d0',
  },
}

const DEFAULT_GEOMETRY: TemplateGeometry = {
  freeSide: 'right',
  freeStart: 0.55,
  freeEnd: 1,
  bgColor: '#e8e4dd',
}

const detectionCache = new Map<string, TemplateGeometry>()

/**
 * 템플릿의 빈 영역 자동 추정.
 * 세로 방향 밝기 분산이 낮은(= 평평한 배경) 열들이 좌/우 가장자리에 연속으로 붙어 있는 구간을 찾는다.
 * 인물·캐릭터가 있는 쪽은 머리카락/의상 경계 때문에 분산이 높게 나온다.
 */
export function detectFreeArea(img: HTMLImageElement): TemplateGeometry {
  const COLS = 120
  const ROWS = 90

  try {
    const canvas = document.createElement('canvas')
    canvas.width = COLS
    canvas.height = ROWS
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return DEFAULT_GEOMETRY
    ctx.drawImage(img, 0, 0, COLS, ROWS)
    const { data } = ctx.getImageData(0, 0, COLS, ROWS)

    // 열별 밝기 분산
    const scores = new Float64Array(COLS)
    for (let x = 0; x < COLS; x++) {
      let sum = 0
      let sumSq = 0
      for (let y = 0; y < ROWS; y++) {
        const i = (y * COLS + x) * 4
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        sum += lum
        sumSq += lum * lum
      }
      const mean = sum / ROWS
      scores[x] = Math.sqrt(Math.max(0, sumSq / ROWS - mean * mean))
    }

    // 누적합으로 구간 평균을 빠르게 비교
    const prefix = new Float64Array(COLS + 1)
    for (let x = 0; x < COLS; x++) prefix[x + 1] = prefix[x] + scores[x]
    const rangeMean = (from: number, to: number) => (prefix[to] - prefix[from]) / (to - from)

    const minWidth = Math.round(COLS * 0.35)
    const maxWidth = Math.round(COLS * 0.55)
    let best: { side: 'left' | 'right'; from: number; to: number; score: number } | null = null

    for (let width = minWidth; width <= maxWidth; width++) {
      const leftScore = rangeMean(0, width)
      if (!best || leftScore < best.score) {
        best = { side: 'left', from: 0, to: width, score: leftScore }
      }
      const rightScore = rangeMean(COLS - width, COLS)
      if (!best || rightScore < best.score) {
        best = { side: 'right', from: COLS - width, to: COLS, score: rightScore }
      }
    }

    if (!best) return DEFAULT_GEOMETRY

    // 빈 영역 한가운데에서 배경색 샘플링
    const sampleX = Math.floor((best.from + best.to) / 2)
    const sampleY = Math.floor(ROWS * 0.35)
    const si = (sampleY * COLS + sampleX) * 4
    const bgColor = `rgb(${data[si]}, ${data[si + 1]}, ${data[si + 2]})`

    return {
      freeSide: best.side,
      freeStart: best.from / COLS,
      freeEnd: best.to / COLS,
      bgColor,
    }
  } catch (error) {
    // CORS 등으로 픽셀을 읽을 수 없으면 기본값 (합성은 계속 동작)
    console.warn('템플릿 빈 영역 자동 추정 실패, 기본값 사용:', error)
    return DEFAULT_GEOMETRY
  }
}

/** 번들 템플릿은 확정 수치, 관리자 업로드분은 자동 추정(결과 캐시) */
export function resolveTemplateGeometry(
  assetId: string,
  img: HTMLImageElement
): TemplateGeometry {
  const bundled = BUNDLED_GEOMETRY[assetId]
  if (bundled) return bundled

  const cached = detectionCache.get(assetId)
  if (cached) return cached

  const detected = detectFreeArea(img)
  detectionCache.set(assetId, detected)
  return detected
}
