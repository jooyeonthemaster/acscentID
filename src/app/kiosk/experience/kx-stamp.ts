// 영수증 도장 — 그림을 감열지(검정 한 색)에 고무도장으로 찍은 듯이(2026-11-18, SIP! 영상판에서 시작해 키오스크 영상판 셋도 함께 쓴다).
//   inkStamp: 이미 흑백 라인아트인 AI 도장 그림(sip-stamp · video-stamp) — 어두운 곳만 검정으로
//   artStamp: 색이 있는 그림(DRAW! 캐리커처) — 둘레보다 어두운 선 · 아주 어두운 면만 검정으로 남겨 선화처럼, 둥근 도장 테두리를 두른다
// 둘 다 잉크가 덜 묻은 듯 작은 덩어리 · 잔 점을 군데군데 비운다(같은 그림은 같은 결 — 고정된 씨앗).

const cell = (x: number, y: number) => { const n = Math.sin(Math.floor(x / 3) * 12.9898 + Math.floor(y / 3) * 78.233) * 43758.5453; return n - Math.floor(n) }
const fine = (x: number, y: number) => { const n = Math.sin(x * 91.17 + y * 47.31) * 23421.631; return n - Math.floor(n) }
/** 잉크 빠짐 — 덩어리(7%) · 잔 점(5%) */
const dropped = (x: number, y: number) => cell(x, y) < 0.07 || fine(x, y) < 0.05

function paint(image: HTMLImageElement, w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h)
  const s = Math.min(w / image.naturalWidth, h / image.naturalHeight)
  const dw = image.naturalWidth * s, dh = image.naturalHeight * s
  g.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh)
  return { c, g }
}

/** 흑백 라인아트 → 도장(정사각 size) */
export function inkStamp(image: HTMLImageElement, size: number): HTMLCanvasElement {
  const { c, g } = paint(image, size, size)
  const px = g.getImageData(0, 0, size, size), d = px.data
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4
    const ink = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 150 && !dropped(x, y)
    d[i] = d[i + 1] = d[i + 2] = ink ? 0 : 255; d[i + 3] = 255
  }
  g.putImageData(px, 0, 0)
  return c
}

/** 색 그림 → 선화 도장(폭 width, 높이는 그림 비율). 테두리 안쪽 여백 pad */
export function artStamp(image: HTMLImageElement, width: number): HTMLCanvasElement {
  const pad = 18, border = 4
  const iw = width - pad * 2, ih = Math.round(iw * image.naturalHeight / image.naturalWidth)
  const { g: ag } = paint(image, iw, ih)
  const src = ag.getImageData(0, 0, iw, ih).data
  const lum = new Float32Array(iw * ih)
  for (let i = 0; i < iw * ih; i++) lum[i] = src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11
  // 둘레 평균(가로 · 세로 상자 흐림, 반지름 R) — 선은 둘레보다 어둡다
  const R = 7, tmp = new Float32Array(iw * ih), mean = new Float32Array(iw * ih)
  for (let y = 0; y < ih; y++) {
    let sum = 0
    for (let x = -R; x <= R; x++) sum += lum[y * iw + Math.min(iw - 1, Math.max(0, x))]
    for (let x = 0; x < iw; x++) {
      tmp[y * iw + x] = sum / (R * 2 + 1)
      sum += lum[y * iw + Math.min(iw - 1, x + R + 1)] - lum[y * iw + Math.max(0, x - R)]
    }
  }
  for (let x = 0; x < iw; x++) {
    let sum = 0
    for (let y = -R; y <= R; y++) sum += tmp[Math.min(ih - 1, Math.max(0, y)) * iw + x]
    for (let y = 0; y < ih; y++) {
      mean[y * iw + x] = sum / (R * 2 + 1)
      sum += tmp[Math.min(ih - 1, y + R + 1) * iw + x] - tmp[Math.max(0, y - R) * iw + x]
    }
  }
  const W = width, H = ih + pad * 2
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
  g.strokeStyle = '#000'; g.lineWidth = border
  g.beginPath(); g.roundRect(border / 2, border / 2, W - border, H - border, 18); g.stroke()
  const px = g.getImageData(0, 0, W, H), d = px.data
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
    const k = y * iw + x, l = lum[k]
    const ink = (l < 64 || l < mean[k] - 14) && !dropped(x, y)
    if (!ink) continue
    const i = ((y + pad) * W + x + pad) * 4
    d[i] = d[i + 1] = d[i + 2] = 0
  }
  // 테두리도 잉크가 군데군데 빠지게
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x > pad && x < W - pad && y > pad && y < H - pad) continue
    const i = (y * W + x) * 4
    if (d[i] < 128 && dropped(x + 7, y + 3)) d[i] = d[i + 1] = d[i + 2] = 255
  }
  g.putImageData(px, 0, 0)
  return c
}
