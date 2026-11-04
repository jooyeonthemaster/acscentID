// 체험 18종이 사진 한 장에서 읽는 것 — 지금의 표정(미소·눈썹·입), 입은 옷의 색, 사진 속 빛, 손을 펼친 모양, 여럿이 선 거리.
// 이 파일은 계산만 한다(DOM 없음 · 시험 가능). 사진을 읽는 쪽은 app/kiosk/experience/expansion/read-photo.ts.
// 원칙: 얼굴 생김새(이목구비 비율)·피부색·나이·성별은 보지 않는다. 누가 누구인지도 찾지 않는다.
// 사진은 기기 안에서 읽고 바로 버린다 — 결과·카드·영수증에는 여기서 만든 숫자와 색 이름만 남는다.

import type { ExpansionId } from './types'

export type PhotoSubject = 'face' | 'hand' | 'group' | 'pair'
export type ColorFamily = 'black' | 'charcoal' | 'gray' | 'white' | 'red' | 'burgundy' | 'pink' | 'coral' | 'orange' | 'brown' | 'beige' | 'yellow' | 'khaki' | 'green' | 'mint' | 'sky' | 'blue' | 'navy' | 'purple' | 'lavender'
export type Lab = [number, number, number]

export interface Swatch { hex: string; name: string; family: ColorFamily; share: number; lab: Lab }
/** 얼굴 하나의 지금 표정과 자리. 값은 0~100, tilt 는 도(+ 는 화면에서 시계 방향 — 머리 위가 오른쪽으로) */
export interface FaceSignal { smile: number; brow: number; open: number; tilt: number; x: number; y: number; size: number }
/** 손가락을 펼친 정도(0~100)와 엄지를 벌렸는지 — 손금 선은 보지 않는다 */
export interface HandSignal { spread: number; thumb: boolean }
export interface PhotoReading {
  subject: PhotoSubject
  /** 큰 얼굴부터 */
  faces: FaceSignal[]
  hand: HandSignal | null
  /** 옷에서 많이 보이는 색부터(최대 3) */
  outfit: Swatch[]
  /** 옷 색을 읽는 도구를 이번에 쓰지 못했다 — 옷 색 없이 진행했다는 것을 화면에 그대로 알린다 */
  outfitMissing: boolean
  /** 사진 속 빛 — 밝기 0~100, 따뜻함(b*, + 노란빛 · − 푸른빛) */
  scene: { brightness: number; warmth: number }
}

export interface PhotoPlan {
  subject: PhotoSubject
  /** 옷 색을 읽는지 */
  outfit: boolean
  /** 안내에 적는 '사진에서 읽는 것' */
  reads: string[]
  /** 읽은 것을 결과에 어떻게 쓰는지 — 안내와 '사진에서 읽은 것' 화면에 같은 문장 */
  uses: string
  /** 사진 없이도 할 수 있는 체험인지(카메라가 안 될 때 멈추지 않게). 손금·관상·스타 무드는 사진이 체험의 중심이라 없다 */
  optional: boolean
}

const face = (reads: string[], uses: string, outfit = true): PhotoPlan => ({ subject: 'face', outfit, reads, uses, optional: true })
export const PHOTO_PLANS: Record<ExpansionId, PhotoPlan> = {
  sommelier: face(['표정', '옷 색'], '미소는 단맛·과일향 쪽에, 옷 색의 짙기는 바디감에, 옷 색은 레드·화이트·로제 방향에 점수를 더해요.'),
  cocktail: face(['표정', '옷 색'], '옷 색과 닮은 색의 한 잔, 표정에 어울리는 기분의 레시피에 점수를 더해요.'),
  barista: face(['표정', '옷 색'], '옷 색의 짙기는 로스팅에, 표정의 활기는 산미에 점수를 더해요.'),
  'taste-dna': face(['표정', '옷 색'], '표정은 새콤달콤한 맛과 구수한 맛 사이에서, 옷 색의 선명함은 매콤·새콤한 조합에 점수를 더해요.'),
  'style-profiler': face(['옷 색'], '지금 입은 옷의 색 계열로 어울리는 스타일에 점수를 더하고, 그 색을 무드보드에 넣어요.'),
  coord: face(['옷 색'], '지금 입은 옷의 색으로 이어 입기 좋은 조합에 점수를 더하고, 그 색을 코디 팔레트에 넣어요.'),
  lookalike: { ...face(['표정', '옷 색'], '표정과 옷 색으로 어울리는 가상 스타 무드를 먼저 골라 드려요. 얼굴 생김새는 비교하지 않아요.'), optional: false },
  science: face(['옷 색', '빛'], '옷에서 뽑은 색을 빛으로 다시 만들어 보는 미션을 하나 더해요.'),
  palm: { subject: 'hand', outfit: false, reads: ['손을 펼친 모양'], uses: '손가락을 펼친 모양으로 먼저 읽을 이야기를 골라요. 손금 선은 읽지 않아요.', optional: false },
  aura: face(['표정', '옷 색'], '옷 색과 닮은 컬러, 표정의 활기에 맞는 속도의 컬러에 점수를 더해요.'),
  product: face(['빛', '옷 색'], '사진 속 공간의 밝기로 조명 밝기를, 옷 색의 온도로 조명 색을 먼저 맞춰 드려요.'),
  team: { subject: 'group', outfit: true, reads: ['사진 속 인원', '함께 웃은 정도', '모여 선 거리', '옷 색'], uses: '사진 속 인원, 함께 웃은 정도, 모여 선 거리와 옷 색을 팀 카드에 담아요. 누가 누구인지는 찾지 않아요.', optional: true },
  'vision-wall': face(['표정', '옷 색'], '옷 색과 닮은 카드 색, 표정에 어울리는 카드 모양을 먼저 골라 드려요.'),
  heritage: face(['빛', '옷 색'], '사진 속 빛의 밝기·온도로 탐험할 시간대를, 옷 색의 온도로 첫 장면을 골라 드려요.'),
  travel: face(['표정', '옷 색'], '표정의 활기는 여행 속도가 맞는 코스에, 옷 색의 온도는 첫 활동에 점수를 더해요.'),
  scent: face(['표정', '옷 색'], '옷 색과 어울리는 향 계열, 표정에 어울리는 무드의 향에 점수를 더해요.'),
  face: { ...face(['표정', '고개 기울기', '옷 색'], '표정과 고개의 기울기로 오늘의 이야기 한 줄을 더해요. 얼굴 생김새로 성격·능력·운명을 보지 않아요.'), optional: false },
  couple: { subject: 'pair', outfit: true, reads: ['두 사람의 미소', '서 있는 거리', '고개 방향', '옷 색'], uses: '두 사람의 미소, 서 있는 거리, 고개 방향과 옷 색을 사진 케미로 담아요. 관계를 판정하지 않아요.', optional: true },
  // 주거복지 — 내비게이터·성향 테스트는 사진을 쓰지 않는다(정책 안내라 얼굴이 필요 없다 · NO_PHOTO_IDS). 캐리커처는 사진이 중심
  'housing-scent': face([], '사진을 쓰지 않아요.', false),
  'housing-home': { ...face(['표정', '옷 색'], '표정과 옷 색을 캐리커처와 향의 분위기에 담아요. 얼굴은 그림을 만드는 데만 쓰고 저장하지 않아요.'), optional: false },
  'housing-mate': face([], '사진을 쓰지 않아요.', false),
}

// ───────────────────────── 색 ─────────────────────────

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))
const toLinear = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
const fromLinear = (c: number) => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(clamp(v * 255, 0, 255)) }
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
const fInv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787)

/** sRGB(0~255) → CIELAB(D65) */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
export function labToRgb([L, a, b]: Lab): [number, number, number] {
  const fy = (L + 16) / 116
  const X = 0.95047 * fInv(fy + a / 500), Y = fInv(fy), Z = 1.08883 * fInv(fy - b / 200)
  return [fromLinear(3.2406 * X - 1.5372 * Y - 0.4986 * Z), fromLinear(-0.9689 * X + 1.8758 * Y + 0.0415 * Z), fromLinear(0.0557 * X - 0.204 * Y + 1.057 * Z)]
}
export const labToHex = (lab: Lab) => `#${labToRgb(lab).map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`
export function hexToLab(hex: string): Lab {
  const n = parseInt(hex.replace('#', ''), 16)
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255)
}
export const chroma = ([, a, b]: Lab) => Math.hypot(a, b)
export const hue = ([, a, b]: Lab) => (Math.atan2(b, a) * 180 / Math.PI + 360) % 360
/** 색 차이 — 밝기 차이는 조금 덜 친다(같은 옷의 그늘과 빛을 다른 색으로 보지 않게) */
export const colorDistance = (p: Lab, q: Lab, lightWeight = 0.5) => Math.hypot((p[0] - q[0]) * lightWeight, p[1] - q[1], p[2] - q[2])

const NAMES: Record<ColorFamily, string> = { black: '블랙', charcoal: '차콜', gray: '그레이', white: '화이트', red: '레드', burgundy: '버건디', pink: '핑크', coral: '코럴', orange: '오렌지', brown: '브라운', beige: '베이지', yellow: '옐로', khaki: '카키', green: '그린', mint: '민트', sky: '스카이 블루', blue: '블루', navy: '네이비', purple: '퍼플', lavender: '라벤더' }

/** RGB 의 색상환 각도(0~360)와 채도(0~1) — 이름 붙이기용(Lab 색상각은 파랑과 보라가 거의 같은 각도라 이름이 섞인다) */
function hsv([r, g, b]: [number, number, number]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s: max ? d / max : 0 }
}
/** Lab 색에 붙이는 이름 — 옷 색을 부르는 흔한 말로(조명에 따라 조금 달라질 수 있다). 밝기는 Lab L, 색 갈래는 RGB 색상환 */
export function colorFamily(lab: Lab): ColorFamily {
  const [L] = lab, C = chroma(lab)
  const { h, s } = hsv(labToRgb(lab))
  // 아주 어두운 색은 Lab 채도가 작게 나온다 — 어두운 네이비(RGB 14·21·31)가 검정으로 불리지 않게 RGB 채도로 본다(2026-10-14 시험 사진)
  const gray = L < 25 ? s < 0.4 : L > 88 ? C < 10 : C < 8 || s < 0.1
  if (gray) return L < 22 ? 'black' : L < 38 ? 'charcoal' : L < 82 ? 'gray' : 'white'
  // 그늘진 빨간 재킷(RGB 147·23·29, L 32)은 레드 — 버건디는 더 어두울 때만
  if (h >= 345 || h < 15) return L >= 68 ? 'pink' : L < 28 ? 'burgundy' : s >= 0.5 ? 'red' : 'pink'
  // 낙타색 니트(채도 0.4~0.5)가 오렌지로 불리지 않게 — 오렌지는 채도가 높을 때만
  if (h < 40) return L < 50 ? 'brown' : h < 25 && L >= 60 && s >= 0.4 ? 'coral' : s < 0.55 ? (L >= 55 ? 'beige' : 'brown') : 'orange'
  if (h < 65) return s < 0.35 ? (L >= 65 ? 'beige' : 'khaki') : L < 55 ? 'khaki' : 'yellow'
  if (h < 160) return s < 0.3 && L < 60 ? 'khaki' : L >= 75 && s < 0.5 ? 'mint' : 'green'
  if (h < 190) return L >= 65 ? 'mint' : 'green'
  if (h < 255) return L < 35 ? 'navy' : L >= 70 ? 'sky' : 'blue'
  if (h < 290) return L >= 65 ? 'lavender' : 'purple'
  return L >= 60 ? 'pink' : 'purple'
}
export const colorName = (family: ColorFamily) => NAMES[family]
export function swatch(lab: Lab, share: number): Swatch {
  const family = colorFamily(lab)
  return { hex: labToHex(lab), name: NAMES[family], family, share: Math.round(share * 100) / 100, lab: lab.map((v) => Math.round(v * 10) / 10) as Lab }
}

/**
 * 옷 픽셀(Lab 세 값씩 이어 붙인 배열)에서 많이 보이는 색 — k-평균(시작점이 정해져 있어 같은 사진은 같은 답).
 * 그늘·빛으로 갈린 같은 색은 합치고, 옷의 12% 미만인 색(단추·무늬 조각)은 버린다.
 */
export function dominantColors(pixels: ArrayLike<number>, limit = 3): Swatch[] {
  const n = Math.floor(pixels.length / 3)
  if (n < 150) return []
  const at = (i: number): Lab => [pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]]
  // 시작점: 밝기 순 다섯 구간의 가운데(밝기가 다른 색) + 가장 먼 픽셀 둘(같은 밝기의 다른 색)
  const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => pixels[p * 3] - pixels[q * 3])
  const centers: Lab[] = [0.1, 0.3, 0.5, 0.7, 0.9].map((q) => at(order[Math.floor(q * (n - 1))]))
  for (let extra = 0; extra < 2; extra++) {
    let best = 0, far = -1
    for (let i = 0; i < n; i += 3) { const d = Math.min(...centers.map((c) => colorDistance(at(i), c, 0.6))); if (d > far) { far = d; best = i } }
    if (far > 12) centers.push(at(best))
  }
  const label = new Int32Array(n)
  for (let round = 0; round < 10; round++) {
    const sum = centers.map(() => [0, 0, 0, 0])
    for (let i = 0; i < n; i++) {
      const p = at(i)
      let k = 0, near = Infinity
      for (let c = 0; c < centers.length; c++) { const d = colorDistance(p, centers[c], 0.6); if (d < near) { near = d; k = c } }
      label[i] = k
      sum[k][0] += p[0]; sum[k][1] += p[1]; sum[k][2] += p[2]; sum[k][3]++
    }
    centers.forEach((_, c) => { if (sum[c][3]) centers[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]] })
  }
  const groups = centers.map((lab, c) => ({ lab, count: 0, c })).map((g) => { for (let i = 0; i < n; i++) if (label[i] === g.c) g.count++; return g }).filter((g) => g.count > 0)
  // 같은 옷의 그늘·빛(밝기만 다른 색)과 아주 가까운 색은 하나로
  for (let merged = true; merged;) {
    merged = false
    groups.sort((p, q) => q.count - p.count)
    outer: for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
      const p = groups[i], q = groups[j]
      const sameHue = chroma(p.lab) >= 10 && chroma(q.lab) >= 10 && Math.abs(((hue(p.lab) - hue(q.lab) + 540) % 360) - 180) < 18 && Math.abs(p.lab[0] - q.lab[0]) < 30
      if (colorDistance(p.lab, q.lab, 0.35) < 11 || sameHue) {
        const total = p.count + q.count
        // 이름은 많은 쪽 색으로 — 그늘이 섞여 어두워지지 않게 많은 쪽에 무게를 더 둔다
        p.lab = p.lab.map((v, k) => (v * p.count * 1.5 + q.lab[k] * q.count) / (p.count * 1.5 + q.count)) as Lab
        p.count = total
        groups.splice(j, 1)
        merged = true
        break outer
      }
    }
  }
  return groups.filter((g) => g.count / n >= 0.12).sort((p, q) => q.count - p.count).slice(0, limit).map((g) => swatch(g.lab, g.count / n))
}

/** 사진 속 빛 — 배경(없으면 전체) 픽셀의 평균 밝기와 노란빛·푸른빛 */
export function sceneLight(pixels: ArrayLike<number>): PhotoReading['scene'] {
  const n = Math.floor(pixels.length / 3)
  if (!n) return { brightness: 50, warmth: 0 }
  let L = 0, b = 0
  for (let i = 0; i < n; i++) { L += pixels[i * 3]; b += pixels[i * 3 + 2] }
  return { brightness: Math.round(clamp(L / n)), warmth: Math.round((b / n) * 10) / 10 }
}

// ───────────────────────── 얼굴 · 손 ─────────────────────────

interface P { x: number; y: number }
const mid = (p: P, q: P): P => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })

/**
 * 얼굴 특징점(정규화 좌표, 478점)과 표정 값(MediaPipe blendshape 0~1)에서 지금의 표정과 자리.
 * aspect = 사진 가로/세로(기울기를 실제 각도로 재려고). 생김새의 비율은 쓰지 않는다.
 */
export function faceSignal(points: P[], shapes: Record<string, number>, aspect: number): FaceSignal {
  const s = (key: string) => shapes[key] ?? 0
  const eyeA = mid(points[33], points[133]), eyeB = mid(points[362], points[263])
  const [left, right] = eyeA.x <= eyeB.x ? [eyeA, eyeB] : [eyeB, eyeA]
  const tilt = Math.atan2(right.y - left.y, (right.x - left.x) * aspect) * 180 / Math.PI
  const centre = mid(points[234], points[454])
  return {
    // 웃음 값은 크게 웃어도 0.7~0.9 — 0.75 를 100 으로 본다
    smile: Math.round(clamp(((s('mouthSmileLeft') + s('mouthSmileRight')) / 2) / 0.75 * 100)),
    brow: Math.round(clamp(((s('browInnerUp') + (s('browOuterUpLeft') + s('browOuterUpRight')) / 2) / 2) / 0.6 * 100)),
    open: Math.round(clamp(s('jawOpen') / 0.5 * 100)),
    tilt: Math.round(tilt * 10) / 10,
    x: Math.round(centre.x * 1000) / 1000,
    y: Math.round(mid(points[10], points[152]).y * 1000) / 1000,
    size: Math.round(Math.abs(points[454].x - points[234].x) * 1000) / 1000,
  }
}

const angle = (p: P, q: P, r: P, s: P, aspect: number) => {
  const u = [(q.x - p.x) * aspect, q.y - p.y], v = [(s.x - r.x) * aspect, s.y - r.y]
  const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]) || 1)
  return Math.acos(clamp(cos, -1, 1)) * 180 / Math.PI
}
/** 검지와 새끼손가락이 벌어진 각도(도), 엄지 끝이 검지 뿌리에서 떨어진 거리(손바닥 너비 배) */
export function handAngles(points: P[], aspect: number) {
  const dist = (p: P, q: P) => Math.hypot((p.x - q.x) * aspect, p.y - q.y)
  return { fingers: Math.round(angle(points[5], points[8], points[17], points[20], aspect)), thumb: Math.round(dist(points[4], points[5]) / (dist(points[5], points[17]) || 1) * 100) / 100 }
}
/**
 * 손 특징점(21점)에서 손가락을 펼친 정도 — 검지와 새끼손가락이 벌어진 각도(붙이면 8° 안팎, 편하게 벌리면 20° 안팎, 활짝 펴면 40° 이상 —
 * 2026-10-14 시험 사진: 편하게 벌린 손 19°). 엄지는 끝이 검지 뿌리에서 손바닥 너비의 0.55배 넘게 떨어지면 벌렸다고 본다(같은 사진 0.6 안팎)
 */
export function handSignal(points: P[], aspect: number): HandSignal {
  const { fingers, thumb } = handAngles(points, aspect)
  return { spread: Math.round(clamp((fingers - 8) / 32 * 100)), thumb: thumb > 0.55 }
}

// ───────────────────────── 읽은 값 → 말 ─────────────────────────

const average = (values: number[]) => values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0

/**
 * 미소 구간 — 입을 다문 옅은 미소가 70 안팎, 이를 드러낸 웃음이 90 이상으로 나왔다(2026-10-14 시험 사진: 한 사람 70 · 단체 94~96)
 */
export const SMILE_BRIGHT = 78
export const SMILE_SOFT = 30
/** 표정 — 여럿이면 평균. level 은 활기 1~5 */
export function expression(reading: PhotoReading) {
  const faces = reading.subject === 'face' ? reading.faces.slice(0, 1) : reading.faces
  if (!faces.length) return null
  const smile = Math.round(average(faces.map((x) => x.smile)))
  const energy = Math.round(clamp(average(faces.map((x) => x.smile * 0.7 + x.brow * 0.15 + x.open * 0.15))))
  const label = smile >= SMILE_BRIGHT ? '환한 미소' : smile >= SMILE_SOFT ? '살짝 미소' : '차분한 표정'
  return { smile, energy, level: Math.min(5, 1 + Math.floor(energy / 20)), label, bright: smile >= SMILE_BRIGHT, calm: smile < SMILE_SOFT }
}

export type OutfitPalette = 'neutral' | 'earth' | 'pastel' | 'vivid'
/** 옷 색의 성격 — 짙기·온도·선명함과 네 가지 팔레트 */
export function outfitLook(reading: PhotoReading) {
  const colors = reading.outfit
  if (!colors.length) return null
  const total = colors.reduce((sum, c) => sum + c.share, 0) || 1
  const L = colors.reduce((sum, c) => sum + c.lab[0] * c.share, 0) / total
  const C = colors.reduce((sum, c) => sum + chroma(c.lab) * c.share, 0) / total
  const main = colors[0]
  const neutralFamilies: ColorFamily[] = ['black', 'charcoal', 'gray', 'white', 'navy']
  const warmFamilies: ColorFamily[] = ['red', 'burgundy', 'pink', 'coral', 'orange', 'brown', 'beige', 'yellow', 'khaki']
  const coolFamilies: ColorFamily[] = ['green', 'mint', 'sky', 'blue', 'navy', 'purple', 'lavender']
  const warm = colors.filter((c) => warmFamilies.includes(c.family)).reduce((sum, c) => sum + c.share, 0)
  const cool = colors.filter((c) => coolFamilies.includes(c.family)).reduce((sum, c) => sum + c.share, 0)
  const tone: 'warm' | 'cool' | 'neutral' = warm > cool && warm >= total * 0.35 ? 'warm' : cool > warm && cool >= total * 0.35 ? 'cool' : 'neutral'
  const palette: OutfitPalette = neutralFamilies.includes(main.family) && C < 22 ? 'neutral' : C >= 42 ? 'vivid' : L >= 68 && C < 40 ? 'pastel' : ['brown', 'beige', 'khaki', 'green', 'orange', 'burgundy'].includes(main.family) ? 'earth' : neutralFamilies.includes(main.family) ? 'neutral' : C >= 30 ? 'vivid' : 'earth'
  // 짙기는 가장 많이 보이는 색으로 — 결과 문장이 그 색 이름을 부른다('짙은 옷 색(네이비)')
  const depth = main.lab[0] < 38 ? 'dark' : main.lab[0] > 68 ? 'light' : 'mid'
  return { main, depth: depth as 'dark' | 'mid' | 'light', tone, vivid: C >= 42, palette, lightness: Math.round(L), chroma: Math.round(C) }
}
export const PALETTE_NAMES: Record<OutfitPalette, string> = { neutral: '무채색', earth: '어스 톤', pastel: '파스텔', vivid: '선명한 색' }

/** 여럿이 선 거리 0~100(높을수록 가깝다) — 이웃한 얼굴 사이를 얼굴 너비로 나눈 값 */
export function closeness(reading: PhotoReading): number | null {
  if (reading.faces.length < 2) return null
  const faces = [...reading.faces].sort((p, q) => p.x - q.x)
  const gaps = faces.slice(1).map((face, i) => (face.x - faces[i].x) / (((face.size + faces[i].size) / 2) || 1))
  return Math.round(clamp(100 - (average(gaps) - 1.1) * 55))
}
export const closenessLabel = (value: number) => value >= 75 ? '어깨가 닿을 만큼 가까이' : value >= 45 ? '나란히 가까이' : '조금씩 떨어져서'
/** 두 사람이 서로 쪽으로 고개를 기울였는지 — 왼쪽 사람은 시계 방향, 오른쪽 사람은 반대로 */
export function leaning(reading: PhotoReading): { both: boolean; one: boolean } | null {
  if (reading.faces.length < 2) return null
  const [left, right] = [...reading.faces].slice(0, 2).sort((p, q) => p.x - q.x)
  const l = left.tilt >= 5, r = right.tilt <= -5
  return { both: l && r, one: l !== r }
}
export const handLabel = (hand: HandSignal) => `${hand.spread >= 55 ? '손가락을 활짝 펼침' : hand.spread >= 25 ? '손가락을 편안하게 폄' : '손가락을 가지런히 모음'}${hand.thumb ? ' · 엄지를 벌림' : ''}`
export function lightLabel(scene: PhotoReading['scene']) {
  const level = scene.brightness >= 70 ? '밝은' : scene.brightness >= 45 ? '부드러운' : '어스름한'
  const temp = scene.warmth >= 9 ? '따뜻한 빛' : scene.warmth <= 0 ? '차가운 빛' : '자연스러운 빛'
  return `${level} ${temp}`
}

export interface PhotoFact { label: string; value: string; colors?: string[] }
/** 화면·카드·영수증에 그대로 적는 '사진에서 읽은 것' */
export function readingFacts(reading: PhotoReading, plan: PhotoPlan): PhotoFact[] {
  const facts: PhotoFact[] = []
  const face = expression(reading)
  if (reading.subject === 'group' || reading.subject === 'pair') {
    facts.push({ label: '사진 속 사람', value: `${reading.faces.length}명` })
    if (face) facts.push({ label: '함께 웃은 정도', value: `${face.smile} / 100 · ${face.label}` })
    const near = closeness(reading)
    if (near !== null) facts.push({ label: '모여 선 거리', value: closenessLabel(near) })
    const lean = reading.subject === 'pair' ? leaning(reading) : null
    if (lean) facts.push({ label: '고개 방향', value: lean.both ? '서로 쪽으로 기울임' : lean.one ? '한 사람이 기울임' : '똑바로' })
  } else if (reading.subject === 'face' && face && plan.reads.includes('표정')) {
    facts.push({ label: '표정', value: `${face.label} · 미소 ${face.smile}` })
    if (plan.reads.includes('고개 기울기')) facts.push({ label: '고개', value: Math.abs(reading.faces[0].tilt) >= 6 ? '살짝 기울임' : '똑바로' })
  }
  if (reading.hand) facts.push({ label: '손 모양', value: handLabel(reading.hand) })
  if (plan.outfit) {
    if (reading.outfit.length) facts.push({ label: '옷 색', value: reading.outfit.map((c) => c.name).join(' · '), colors: reading.outfit.map((c) => c.hex) })
    else facts.push({ label: '옷 색', value: reading.outfitMissing ? '이번에는 읽지 못했어요' : '사진에서 옷을 찾지 못했어요' })
  }
  if (plan.reads.includes('빛')) facts.push({ label: '빛', value: lightLabel(reading.scene) })
  return facts
}
/** 결과 카드 한 줄 요약 — '환한 미소 · 옷 색 네이비·화이트' */
export const readingLine = (reading: PhotoReading, plan: PhotoPlan) => readingFacts(reading, plan).map((fact) => `${fact.label} ${fact.value}`).join(' · ')
