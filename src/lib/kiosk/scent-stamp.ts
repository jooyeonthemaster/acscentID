// SCENT! 영상판 영수증 맨 위 그림(2026-11-18 사용자 지시: SIP! 영상판 영수증처럼 — 맨 위에 찍은 사진으로 도장, 맨 아래 조향사 사인).
// 촬영 사진을 '향수 부티크에 선 나' 검정 고무도장 라인아트로 — 감열지(검정 한 색)에 또렷하게: 순수 흑백 · 굵은 선 · 회색 없음. 얼굴은 바꾸지 않는다.
// 그리는 곳: POST /api/kiosk/scent-stamp, 쓰는 곳: src/app/kiosk/perfumer/scent-receipt.ts(영수증) · classic/KioskClassic.tsx(분석을 시작할 때 미리 요청).
// SIP! · COLOR! · MAKEUP! 의 같은 도장은 sip-stamp.ts · video-stamp.ts — SCENT! 는 기본 영수증(receipt-canvas)을 감싸는 길이라 따로 둔다.

export const SCENT_STAMP_PROMPT = [
  'Turn the attached photo into a single-color BLACK INK RUBBER-STAMP illustration.',
  'Scene: the person from the photo standing in an elegant perfume boutique, holding a small 10ml glass perfume bottle with a silver cap at chest height, arched display shelves of perfume bottles and a few flowers in a vase behind them, shown from the waist up and centered.',
  'Style: clean bold line art like a hand-carved rubber stamp pressed with black ink — confident contour lines, simple hatching for shadows, a slightly rough grainy ink texture at the edges, inside a thin round-cornered square stamp border with a little white margin.',
  'Strictly pure black on pure white: no color, no gray tones, no gradients, no photo texture. It will be printed on a black-and-white thermal receipt, so keep plenty of white space and avoid tiny details.',
  'Use the attached photo as the only reference for the person: keep their face shape, eyes, eyebrows, nose, smile, hairstyle, fringe, glasses only if worn, and clothing shapes so they are clearly recognizable — do not beautify, de-age or make them look like a celebrity.',
  'Only this one person appears — nobody else anywhere. No text, letters, numbers, logos or labels anywhere, including on the bottles.',
].join(' ')

/** 사람 없는 기본 도장(사진이 없거나 못 그렸을 때) — design-review/scent-art/tools/scent-receipt-art.mjs 로 한 번 만들어 public 에 둔다 */
export const SCENT_STAMP_DEFAULT_PROMPT = 'A single-color BLACK INK RUBBER-STAMP illustration of an elegant perfume boutique: arched display shelves of perfume bottles behind, and in the foreground a round marble pedestal with one small 10ml glass perfume bottle with a silver cap, a few paper scent strips and a small vase of flowers. Clean bold line art like a hand-carved rubber stamp pressed with black ink — confident contour lines, simple hatching, slightly rough grainy ink texture, inside a thin round-cornered square stamp border with a little white margin. Strictly pure black on pure white, no gray, no color. No people. No text, letters, numbers, logos or labels anywhere.'
