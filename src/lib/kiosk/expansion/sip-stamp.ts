// SIP! 영수증 맨 위 그림(2026-11-18 사용자 지시) — 포도밭 기념사진을 '포도밭에 선 나'로, 검정 고무도장으로 찍은 듯한 라인아트로.
// 감열지(검정 한 색)에 또렷하게: 순수 흑백 · 굵은 선 · 회색 없음. 사람 얼굴은 바꾸지 않는다(다른 합성과 같은 원칙).
// 그리는 곳: POST /api/kiosk/experience/sip-stamp, 쓰는 곳: src/app/kiosk/experience/expansion/sip-receipt.ts

export const SIP_STAMP_PROMPT = [
  'Turn the attached photo into a single-color BLACK INK RUBBER-STAMP illustration.',
  'Scene: the person from the photo standing in a sunny vineyard between rows of grapevines heavy with grape bunches, rolling hills and a small winery roof far behind, holding a glass of wine at chest height, shown from the knees up and centered.',
  'Style: clean bold line art like a hand-carved rubber stamp pressed with black ink — confident contour lines, simple hatching for shadows, a slightly rough grainy ink texture at the edges, inside a thin round-cornered square stamp border with a little white margin.',
  'Strictly pure black on pure white: no color, no gray tones, no gradients, no photo texture. It will be printed on a black-and-white thermal receipt, so keep plenty of white space and avoid tiny details.',
  'Use the attached photo as the only reference for the person: keep their face shape, eyes, eyebrows, nose, smile, hairstyle, fringe, glasses only if worn, and clothing shapes so they are clearly recognizable — do not beautify, de-age or make them look like a celebrity.',
  'Only this one person appears — nobody else anywhere. No text, letters, numbers, logos or labels anywhere, including on the wine glass or bottles.',
].join(' ')
