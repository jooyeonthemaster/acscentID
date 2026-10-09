// 옷 색 미리보기 · 진단용 얼굴 사진 계산(순수 함수 — DOM 없음). 웹 워커(garment.worker.ts)에서 돈다 — 매장 기기의 느린 CPU 에서 화면이 멈추지 않게.
// 설명은 garment-recolor.ts 머리말.

// sRGB ↔ Lab (D65)
const SRGB_TO_LINEAR = new Float32Array(256).map((_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
})
const labF = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
const labFInv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787)
const linearToSrgb = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255)
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = SRGB_TO_LINEAR[r], G = SRGB_TO_LINEAR[g], B = SRGB_TO_LINEAR[b]
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883
  const fx = labF(x), fy = labF(y), fz = labF(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

function hexToLab(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255)
}

/** 회색 기준 가이드 필터(He et al.) — 마스크 경계를 사진의 윤곽에 붙인다. r: 반경, eps: 매끄러움 */
function guidedFilter(I: Float32Array, p: Float32Array, w: number, h: number, r: number, eps: number): Float32Array {
  const box = (src: Float32Array) => {
    const out = new Float32Array(w * h)
    const tmp = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      let acc = 0
      const row = y * w
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))]
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * r + 1)
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * r + 1)
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
      }
    }
    return out
  }
  const n = w * h
  const Ip = new Float32Array(n), II = new Float32Array(n)
  for (let i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i] }
  const mI = box(I), mp = box(p), mIp = box(Ip), mII = box(II)
  const a = new Float32Array(n), b = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const cov = mIp[i] - mI[i] * mp[i]
    const varI = mII[i] - mI[i] * mI[i]
    a[i] = cov / (varI + eps)
    b[i] = mp[i] - a[i] * mI[i]
  }
  const ma = box(a), mb = box(b)
  const q = new Float32Array(n)
  for (let i = 0; i < n; i++) q[i] = Math.min(1, Math.max(0, ma[i] * I[i] + mb[i]))
  return q
}

export function bilinear(src: Float32Array, sw: number, sh: number, w: number, h: number): Float32Array {
  if (sw === w && sh === h) return src
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const fy = Math.min(sh - 1, Math.max(0, ((y + 0.5) * sh) / h - 0.5))
    const y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0
    for (let x = 0; x < w; x++) {
      const fx = Math.min(sw - 1, Math.max(0, ((x + 0.5) * sw) / w - 0.5))
      const x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0
      const top = src[y0 * sw + x0] * (1 - tx) + src[y0 * sw + x1] * tx
      const bot = src[y1 * sw + x0] * (1 - tx) + src[y1 * sw + x1] * tx
      out[y * w + x] = top * (1 - ty) + bot * ty
    }
  }
  return out
}

/**
 * 옷 덩어리만 남긴다 — 배경의 반짝이·소품이 '옷'으로 잡힌 작은 조각을 지운다.
 * 4px 칸으로 줄여 이어진 덩어리를 찾고, 가장 큰 덩어리의 12% 보다 작은 덩어리는 버린다.
 */
function keepMainGarment(alpha: Float32Array, W: number, H: number): void {
  const S = 4
  const gw = Math.ceil(W / S), gh = Math.ceil(H / S)
  const on = new Uint8Array(gw * gh)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 0.5) on[((y / S) | 0) * gw + ((x / S) | 0)] = 1
  const label = new Int32Array(gw * gh).fill(-1)
  const sizes: number[] = []
  const stack: number[] = []
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || label[start] >= 0) continue
    const id = sizes.length
    let size = 0
    stack.push(start)
    label[start] = id
    while (stack.length) {
      const c = stack.pop()!
      size++
      const cx = c % gw, cy = (c / gw) | 0
      const next = [cx > 0 ? c - 1 : -1, cx < gw - 1 ? c + 1 : -1, cy > 0 ? c - gw : -1, cy < gh - 1 ? c + gw : -1]
      for (const n of next) if (n >= 0 && on[n] && label[n] < 0) { label[n] = id; stack.push(n) }
    }
    sizes.push(size)
  }
  if (!sizes.length) return
  const keep = Math.max(...sizes) * 0.12
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = ((y / S) | 0) * gw + ((x / S) | 0)
    // 경계의 반투명 픽셀은 이웃 칸이 옷이면 남긴다
    let ok = label[g] >= 0 && sizes[label[g]] >= keep
    if (!ok && alpha[y * W + x] > 0) {
      const gx = g % gw, gy = (g / gw) | 0
      for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1 && !ok; dx++) {
        const nx = gx + dx, ny = gy + dy
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const l = label[ny * gw + nx]
        ok = l >= 0 && sizes[l] >= keep
      }
    }
    if (!ok) alpha[y * W + x] = 0
  }
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export interface GarmentState {
  W: number
  H: number
  N: number
  alpha: Float32Array
  L: Float32Array
  A: Float32Array
  B: Float32Array
  meanL: number
  spreadUp: number
  spreadDown: number
  std: number
  coverage: number
}

/** 사진 픽셀(RGBA) + 모델의 옷 신뢰도(저해상도) → 옷 알파·밝기 분포. 한 사진에 한 번 */
export function analyzeGarment(px: Uint8ClampedArray, W: number, H: number, clothesRaw: Float32Array, mw: number, mh: number): GarmentState {
  // 모델 해상도 → 사진 해상도, 확신이 애매한 경계는 부드럽게
  const clothes = bilinear(clothesRaw, mw, mh, W, H)
  const N = W * H
  const gray = new Float32Array(N)
  const L = new Float32Array(N)
  const A = new Float32Array(N)
  const B = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]
    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const lab = rgbToLab(r, g, b)
    L[i] = lab[0]; A[i] = lab[1]; B[i] = lab[2]
  }
  const soft = new Float32Array(N)
  for (let i = 0; i < N; i++) soft[i] = smoothstep(0.35, 0.7, clothes[i])
  // 경계를 사진 윤곽에 붙인다 — 반경은 사진 크기에 비례(960 기준 6px)
  const refined = guidedFilter(gray, soft, W, H, Math.max(3, Math.round(Math.max(W, H) / 160)), 0.0015)
  const alpha = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    // 모델이 확신하는 옷 안쪽은 1, 확실히 아닌 곳(신뢰도 0.15 미만)은 경계 다듬기가 번져도 0
    const a = clothes[i] < 0.15 ? 0 : Math.max(refined[i], clothes[i] > 0.85 ? 1 : 0)
    alpha[i] = a < 0.04 ? 0 : a
  }
  keepMainGarment(alpha, W, H)
  let coverage = 0
  for (let i = 0; i < N; i++) coverage += alpha[i]
  coverage /= N

  // 옷의 밝기 분포 — 평균, 위·아래로 얼마나 벌어지는지(고른 색에서 하이라이트·그늘이 넘치지 않게)
  let wsum = 0, lsum = 0
  for (let i = 0; i < N; i++) if (alpha[i] > 0.5) { wsum++; lsum += L[i] }
  const meanL = wsum ? lsum / wsum : 50
  const devs: number[] = []
  for (let i = 0; i < N; i += 3) if (alpha[i] > 0.5) devs.push(L[i] - meanL)
  devs.sort((x, y) => x - y)
  const q = (p: number) => (devs.length ? devs[Math.min(devs.length - 1, Math.floor(p * devs.length))] : 0)
  const spreadUp = Math.max(1, q(0.97))
  const spreadDown = Math.max(1, -q(0.03))
  let std = 0
  for (const d of devs) std += d * d
  std = devs.length ? Math.sqrt(std / devs.length) : 0
  return { W, H, N, alpha, L, A, B, meanL, spreadUp, spreadDown, std, coverage }
}

/** 고른 색으로 칠한 옷만 담은 RGBA(옷 밖은 완전히 투명 — 원본 사진이 그대로 비친다) */
export function renderGarment(s: GarmentState, hex: string): Uint8ClampedArray<ArrayBuffer> {
  const { N, alpha, L, A, B, meanL, spreadUp, spreadDown, std } = s
  const [Lt, at, bt] = hexToLab(hex)
  // 밝기 차이를 얼마나 살릴지 — 짜임이 거의 없는 민무늬는 조금 키우고, 고른 색이 아주 밝거나 어두우면
  // 하이라이트·그늘이 0·100 에 부딪히지 않게 줄인다(그래도 질감이 사라지지 않게 최소 0.35)
  const boost = std > 0 && std < 7 ? Math.min(1.5, 7 / std) : 1
  const k = Math.max(0.35, Math.min(boost, (99 - Lt) / spreadUp, (Lt - 3) / spreadDown))
  const o = new Uint8ClampedArray(N * 4)
  for (let i = 0; i < N; i++) {
    const a = alpha[i]
    if (a === 0) continue
    const nl = Math.min(100, Math.max(0, Lt + (L[i] - meanL) * k))
    // 그늘진 곳은 채도를 조금 낮춰 실제 천처럼(밝은 곳은 그대로)
    const chroma = Math.min(1.08, Math.max(0.55, Lt > 1 ? 0.6 + 0.4 * (nl / Lt) : 1))
    // 원래 옷이 가진 미세한 색 차이(무늬·얼룩)를 아주 조금 남겨 평평한 색판처럼 보이지 않게
    const na = at * chroma + A[i] * 0.08
    const nb = bt * chroma + B[i] * 0.08
    const fy = (nl + 16) / 116
    const X = 0.95047 * labFInv(fy + na / 500)
    const Y = labFInv(fy)
    const Z = 1.08883 * labFInv(fy - nb / 200)
    const j = i * 4
    o[j] = linearToSrgb(3.2406 * X - 1.5372 * Y - 0.4986 * Z)
    o[j + 1] = linearToSrgb(-0.9689 * X + 1.8758 * Y + 0.0415 * Z)
    o[j + 2] = linearToSrgb(0.0557 * X - 0.204 * Y + 1.057 * Z)
    o[j + 3] = Math.round(a * 255)
  }
  return o
}

/** 디버그·검증용 — 옷 마스크를 흑백으로 */
export function maskGarment(s: GarmentState): Uint8ClampedArray<ArrayBuffer> {
  const m = new Uint8ClampedArray(s.N * 4)
  for (let i = 0; i < s.N; i++) {
    const v = Math.round(s.alpha[i] * 255)
    m[i * 4] = v; m[i * 4 + 1] = v; m[i * 4 + 2] = v; m[i * 4 + 3] = 255
  }
  return m
}

// ───────────────────────── 진단용 얼굴 사진 · 색 측정 ─────────────────────────
//
// 퍼스널 컬러 진단(AI)이 옷 색에 끌렸다 — 같은 얼굴에 옷 색만 바꾼 사진 30장 중 9장의 유형이 달라졌다(2026-10-10 실험).
// 그래서 AI 에는 옷과 배경을 회색으로 지우고 얼굴 둘레만 잘라 낸 사진을 보낸다. 근거가 될 수 없는 색은 아예 보이지 않게.
// 같이, 얼굴 피부·머리카락 픽셀에서 잰 색(Lab)을 숫자로 넘겨 판단의 닻으로 쓰게 한다.

/** 사진에서 잰 색 — CIELAB(D65). 조명 영향을 받으므로 참고값 */
export interface ColorMeasure {
  skin: { L: number; a: number; b: number }
  hair: { L: number; a: number; b: number } | null
  /** 사진에서 얼굴 피부 · 머리카락이 차지하는 비율(0~1) */
  skinShare: number
  hairShare: number
}

const round1 = (v: number) => Math.round(v * 10) / 10

/** 밝기 순으로 줄 세워 lo~hi 구간(그늘·번들거림을 뺀 가운데)만 남기고 그 가운데 값을 낸다 */
function bandMedian(index: number[], L: Float32Array, A: Float32Array, B: Float32Array, lo: number, hi: number) {
  index.sort((x, y) => L[x] - L[y])
  const band = index.slice(Math.floor(index.length * lo), Math.max(Math.floor(index.length * lo) + 1, Math.floor(index.length * hi)))
  const mid = (values: number[]) => { values.sort((x, y) => x - y); return values[values.length >> 1] }
  return { L: round1(mid(band.map((i) => L[i]))), a: round1(mid(band.map((i) => A[i]))), b: round1(mid(band.map((i) => B[i]))) }
}

/** 얼굴 피부 · 머리카락 마스크(사진 해상도, 0~1)에서 색을 잰다. 얼굴이 너무 작으면 null */
export function measureColors(s: GarmentState, face: Float32Array, hair: Float32Array): ColorMeasure | null {
  const skinIdx: number[] = []
  const hairIdx: number[] = []
  // 두 칸에 한 번만 본다 — 가운데 값에는 충분하고 느린 기기에서 빠르다
  for (let i = 0; i < s.N; i += 2) {
    if (face[i] > 0.75) skinIdx.push(i)
    else if (hair[i] > 0.75) hairIdx.push(i)
  }
  const skinShare = (skinIdx.length * 2) / s.N
  const hairShare = (hairIdx.length * 2) / s.N
  if (skinIdx.length < 400 || skinShare < 0.012) return null
  return {
    // 피부: 그늘(어두운 30%)과 번들거림(밝은 15%)을 뺀 가운데
    skin: bandMedian(skinIdx, s.L, s.A, s.B, 0.3, 0.85),
    // 머리카락: 빛 반사(밝은 30%)를 뺀다
    hair: hairIdx.length >= 300 ? bandMedian(hairIdx, s.L, s.A, s.B, 0.1, 0.7) : null,
    skinShare: Math.round(skinShare * 1000) / 1000,
    hairShare: Math.round(hairShare * 1000) / 1000,
  }
}

export interface FocusImage {
  /** 사람(얼굴·머리카락·몸 피부)만 남기고 나머지는 회색인 RGBA — 사진 전체 크기 */
  rgba: Uint8ClampedArray<ArrayBuffer>
  /** 얼굴·머리카락 둘레를 조금 넉넉히 잡은 잘라 낼 칸 */
  box: { x: number; y: number; w: number; h: number }
}

/** 옷·배경·액세서리를 중간 회색으로 지운다. keep 은 남길 정도(0~1, 얼굴 피부 + 머리카락 + 몸 피부) */
export function focusOnPerson(px: Uint8ClampedArray, W: number, H: number, face: Float32Array, hair: Float32Array, body: Float32Array): FocusImage | null {
  const N = W * H
  const rgba = new Uint8ClampedArray(N * 4)
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  const GRAY = 128
  for (let i = 0; i < N; i++) {
    // 경계를 안쪽으로 조인다 — 머리카락 끝·어깨선에 옷·배경 색이 실처럼 남지 않게
    const k = smoothstep(0.45, 0.82, Math.min(1, face[i] + hair[i] + body[i]))
    const j = i * 4
    rgba[j] = px[j] * k + GRAY * (1 - k)
    rgba[j + 1] = px[j + 1] * k + GRAY * (1 - k)
    rgba[j + 2] = px[j + 2] * k + GRAY * (1 - k)
    rgba[j + 3] = 255
    if (face[i] > 0.5 || hair[i] > 0.5) {
      const x = i % W, y = (i / W) | 0
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  // 턱 아래 목까지 보이게 아래쪽을 더 준다
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  const mx = Math.round(bw * 0.08), top = Math.round(bh * 0.06), bottom = Math.round(bh * 0.14)
  const x = Math.max(0, x0 - mx), y = Math.max(0, y0 - top)
  return { rgba, box: { x, y, w: Math.min(W, x1 + mx + 1) - x, h: Math.min(H, y1 + bottom + 1) - y } }
}
