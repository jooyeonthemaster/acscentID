// 키오스크 영상판 영수증 맨 위 그림(2026-11-18 사용자 지시: SIP! 처럼 COLOR! · MAKEUP! 도 촬영 사진으로 도장을 찍고 맨 아래에 길잡이 사인).
// 그 프로그램 장소에 선 '나'를 검정 고무도장 라인아트로 — 감열지(검정 한 색)에 또렷하게: 순수 흑백 · 굵은 선 · 회색 없음. 얼굴은 바꾸지 않는다.
// DRAW! 는 도장 그림을 따로 만들지 않고 손님의 캐리커처를 도장처럼 찍는다(사용자 지시) — src/app/kiosk/video/video-receipt.ts.
// 그리는 곳: POST /api/kiosk/experience/video-stamp, 쓰는 곳: src/app/kiosk/video/video-receipt.ts · stamp.ts. SIP! 는 src/lib/kiosk/expansion/sip-stamp.ts.

export type VideoStampProgram = 'color' | 'makeup'

const STYLE = [
  'Style: clean bold line art like a hand-carved rubber stamp pressed with black ink — confident contour lines, simple hatching for shadows, a slightly rough grainy ink texture at the edges, inside a thin round-cornered square stamp border with a little white margin.',
  'Strictly pure black on pure white: no color, no gray tones, no gradients, no photo texture. It will be printed on a black-and-white thermal receipt, so keep plenty of white space and avoid tiny details.',
  'Use the attached photo as the only reference for the person: keep their face shape, eyes, eyebrows, nose, smile, hairstyle, fringe, glasses only if worn, and clothing shapes so they are clearly recognizable — do not beautify, de-age or make them look like a celebrity.',
  'Only this one person appears — nobody else anywhere. No text, letters, numbers, logos or labels anywhere.',
]

const SCENE: Record<VideoStampProgram, string> = {
  color: 'Scene: the person from the photo standing in a bright colorist\'s atelier, holding a fanned-out deck of color swatch cards beside their cheek, tall shelves of neatly folded fabric swatches and a tall arched window behind them, shown from the waist up and centered.',
  makeup: 'Scene: the person from the photo large in the foreground at a fashion-show backstage, shown from the chest up, centered, facing the viewer and filling about two thirds of the frame, holding a makeup brush near their cheek; behind them a vanity mirror ringed with round light bulbs, a clothing rack and a curtain. The person is real and in front of the mirror, not a reflection inside it.',
}

export function videoStampPrompt(program: VideoStampProgram): string {
  return ['Turn the attached photo into a single-color BLACK INK RUBBER-STAMP illustration.', SCENE[program], ...STYLE].join(' ')
}

/** 사람 없는 기본 도장(사진이 없거나 못 그렸을 때) — design-review 에서 한 번 만들어 public 에 둔다 */
export const VIDEO_STAMP_DEFAULT: Record<VideoStampProgram, string> = {
  color: 'A single-color BLACK INK RUBBER-STAMP illustration of a bright colorist\'s atelier: tall shelves of neatly folded fabric swatches, a tall arched window, and in the foreground a small table with a fanned-out deck of color swatch cards and a round hand mirror.',
  makeup: 'A single-color BLACK INK RUBBER-STAMP illustration of a fashion-show backstage vanity: a large mirror ringed with round light bulbs, makeup brushes in a cup, a lipstick and a powder compact on the table, a clothing rack and a curtain behind.',
}
