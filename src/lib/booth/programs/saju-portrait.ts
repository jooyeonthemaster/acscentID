// 정미년 사주 이야기 SAJU!(nh-saju) — 찍은 사진 → 「새해 소원 카드」 초상 한 장. 서버만 쓴다(DOM · 네트워크 없음).
// 2026-11-17 사용자 요청: 「행사 접는 카드처럼」 — 왼쪽 면은 후광 · 구름 · 한복의 꾸민 초상, 오른쪽 면은 오행 색 원국 + 풀이(saju-print.ts).
// 참고 카드의 행사 이름 · 글씨 · 로고는 따르지 않는다. 분위기(정면 반신 · 무지개 후광 · 뭉게구름 · 밤하늘 · 한복)만 쓴다.
// 모델 · 대기 시간은 새해 관상 초상과 같다(src/lib/booth/programs/portrait.ts PORTRAIT_ATTEMPTS).
// 왼쪽 면은 3:4(900×1200)라 2:3 으로 만들어 위아래를 조금 자른다. 얼굴은 위 40% 쯤, 위 · 아래 가장자리는 비워 둔다.

/** 사주 초상 지시문 — 손님이 고르는 값이 없다. 사진은 이 요청에만 쓰고 저장하지 않는다 */
export function buildSajuPortraitPrompt(): string {
  return [
    'EDIT IMAGE 1 into a joyful, dreamy New Year "wish card" portrait of the SAME real person, in the style of a retro Korean airbrushed fortune poster. This is a playful creative portrait.',
    '',
    'IDENTITY LOCK — the most important rule:',
    "- Preserve the person's real face exactly: face shape, eyes and eyelids, brows, nose, lips, jawline, moles and marks, skin tone, ethnicity, age and gender presentation.",
    '- They must be instantly recognizable as themselves. Do not beautify, swap or regenerate the face, enlarge the eyes, change the nose or lips, smooth away wrinkles, or lighten/darken the skin. Do not add a beard or mustache they do not have.',
    '- Keep their own expression (if they smile, they still smile) and their own hairstyle.',
    '- GLASSES: if they wear glasses in IMAGE 1, keep the very same glasses on (same frame shape and color). Never remove or add glasses.',
    '- If more than one person is in IMAGE 1, keep every person, side by side, each with their own exact face.',
    '',
    'WARDROBE: a neat, simple traditional Korean hanbok in deep navy or black with a crisp white collar band (dongjeong), matched to their own gender presentation. No crowns, no hats, no jewelry.',
    'COMPOSITION: strictly frontal, head and upper chest, face centered in the upper-middle of a vertical 2:3 frame, eyes looking straight into the lens. Leave calm space above the head and along the left and right edges.',
    'BACKGROUND: a deep twilight indigo-to-violet night sky with tiny soft stars. Directly behind the head, a large glowing circular halo made of soft concentric rainbow bands (red, orange, yellow, green, blue). Big fluffy white and pastel-pink clouds drift around the shoulders and the bottom of the frame. One small glowing red sun disk and one pale full moon float in the upper corners. A few tiny golden sparkles.',
    'LOOK: saturated but soft retro airbrush colors, gentle glow, smooth painterly gradients, crisp realistic face with natural skin texture, festive and warm.',
    'DO NOT add any text, calligraphy, seals, captions, logos, watermarks or signatures — no readable letters anywhere. Do not make them resemble any real celebrity or actor. No religious symbols.',
  ].join('\n')
}
