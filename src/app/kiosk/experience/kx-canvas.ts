// 결과 카드(저장용 그림)를 캔버스에 그릴 때 쓰는 작은 도구들 — 모드마다 제 카드를 그린다.

export function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d 를 쓸 수 없습니다')
  return [canvas, ctx]
}

export const canvasBlob = (canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png' = 'image/jpeg', quality = 0.92) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('그림을 만들지 못했습니다'))), type, quality))

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('그림을 읽지 못했습니다'))
    image.src = src
  })
}

/** 화면이 쓰는 글꼴 그대로(next/font 가 만든 이름 포함) — 캔버스 글자도 같은 글꼴로 */
export function kxFontFamily(): string {
  const root = document.querySelector('.kx-root')
  return root ? getComputedStyle(root).fontFamily : 'sans-serif'
}

/** 캔버스에 쓸 글꼴이 다 내려왔는지 기다린다(안 기다리면 첫 그림이 기본 글꼴로 나온다) */
export async function fontsReady(...fonts: string[]) {
  try {
    await Promise.all(fonts.map((font) => document.fonts.load(font, '가Aa1あ中')))
    await document.fonts.ready
  } catch { /* 기본 글꼴로 그린다 */ }
}

/**
 * 폭에 맞게 줄을 나눈다. 띄어쓰기가 있는 글(한국어·영어)은 낱말 단위로, 없는 글(일본어·중국어)과 폭을 넘는 긴 낱말은 글자 단위로.
 */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/(\s+)/)) {
      if (!word) continue
      if (ctx.measureText(line + word).width <= maxWidth) { line += word; continue }
      if (line.trim()) { lines.push(line.trimEnd()); line = '' }
      if (/^\s+$/.test(word)) continue
      // 낱말 하나가 폭을 넘는다 — 글자 단위로 자른다
      for (const ch of word) {
        if (line && ctx.measureText(line + ch).width > maxWidth) { lines.push(line); line = '' }
        line += ch
      }
    }
    lines.push(line.trimEnd())
  }
  return lines
}

/** 여러 줄을 그리고 다음 y 를 돌려준다 */
export function fillLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number): number {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight))
  return y + lines.length * lineHeight
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** 그림을 상자에 꽉 차게(넘치는 쪽은 가운데 기준으로 자른다) */
export function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, focusY = 0.5) {
  const scale = Math.max(w / image.width, h / image.height)
  const sw = w / scale, sh = h / scale
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) * focusY, sw, sh, x, y, w, h)
}
