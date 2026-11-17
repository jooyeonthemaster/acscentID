// 새해 관상 FACE!(nh-face) — 찍은 사진 → 동양풍 초상(조선 시대 인물 사진처럼) 한 장. 서버 · 화면이 같이 쓴다(DOM · 네트워크 없음).
// 2026-11-17 사용자 요청: 「사진을 찍으면 동양풍 얼굴 초상처럼 나오고, 그 위에 분석 결과가 쓰여 나오게」(시대극 영화 포스터 분위기 참고).
// 참고 포스터의 배우 · 제목 글씨 · 도장을 따라 하지 않는다 — 분위기(정면 클로즈업 · 한지 배경 · 세피아 · 세로 붓글씨)만. 글씨는 AI 가 아니라 부스가 얹는다(reading-print.ts).
//
// 시험(2026-11-17, 가상 손님 8장 — 혼자 5 · 둘 · 셋 · 넷, ArcFace 얼굴 유사도 — design-review/nh-face-portrait-20261117):
//   Gemini 2.5 Flash Image 8~13초 · $0.039 · 혼자 평균 0.72 · 셋이면 얼굴이 바뀌고(최저 0.12) 넷이면 1명만 그린 적이 있다 · 24번 중 1번 그림 없이 끝남
//   Seedream 5.0 Flash 14~22초 · $0.018 · 혼자 평균 0.79~0.85 · 셋도 최저 0.82
//   Gemini 3 Pro Image 23~28초 · $0.138 · 혼자 0.68
//   → 얼굴 닮음이 먼저(메모: 부스 AI 사진은 비용보다 얼굴 유사도)라 Seedream 을 먼저, 실패 · 시간 초과면 Flash.
//   촬영 직후 주제를 고르는 동안 만들기 시작한다(손님이 더 기다리는 시간은 주제 고르는 시간에 따라 5~12초).
// 여럿이 찍으면(기기가 센 얼굴 수) 한 사람 클로즈업 대신 모두 나오는 단체 초상으로 — 클로즈업 지시문 그대로면 사람을 빼먹었다.

import type { ImageModelKey } from '../image-models'

/** 첫 모델 → 예비 모델(기다리는 시간) — 라우트 maxDuration 60초 안 */
export const PORTRAIT_ATTEMPTS: [ImageModelKey, number][] = [['seedream-5-flash', 30_000], ['gemini-2.5-flash-image', 25_000]]

/** 한 표(손님 한 명)로 만들 수 있는 초상 수 — 첫 생성 + 다시 찍기 한 번 */
export const PORTRAIT_USES = 2

/** 기기가 센 얼굴 수(못 세면 1) — 1~6 */
export const portraitPeople = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.min(6, Math.round(v))) : 1

/** 초상 지시문 — 손님이 고르는 값이 없다(주제는 글에만 쓴다). people: 기기가 센 얼굴 수. 사진은 이 요청에만 쓰고 저장하지 않는다 */
export function buildFacePortraitPrompt(people = 1): string {
  const many = people > 1
  return [
    `EDIT IMAGE 1 into a solemn, cinematic portrait of the SAME real ${many ? 'people' : 'person'} reimagined as ${many ? 'people' : 'someone'} from Korea's Joseon era — the quiet mood of a historical-drama film still. This is a playful creative portrait, not a historical record.`,
    '',
    'IDENTITY LOCK — the most important rule:',
    many
      ? `- IMAGE 1 shows ${people} people. Show ALL ${people} of them — never drop, merge, duplicate or add anyone. Keep each person's own face, skin tone, ethnicity, age and gender presentation exactly (do not make anyone look Korean if they are not), and keep them in the same left-to-right order.`
      : "- Preserve the person's real face exactly: face shape, eyes and eyelids, brows, nose, lips, jawline, moles and marks, skin tone, ethnicity, age and gender presentation.",
    '- They must be instantly recognizable as themselves. Do not beautify, swap or regenerate the face, enlarge the eyes, change the nose or lips, smooth away wrinkles, or lighten/darken the skin. Do not add a beard or mustache they do not have.',
    '- Keep their own expression (if they smile, they still smile).',
    '- GLASSES: if they wear glasses in IMAGE 1, keep the very same glasses on (same frame shape and color). Never remove or add glasses.',
    many ? '' : '- If more than one person is in IMAGE 1, keep every person, side by side, each with their own exact face.',
    '',
    'WARDROBE (Joseon era, matched to their own gender presentation): a man wears a black horsehair manggeon headband over a neat topknot and a plain undyed ivory ramie hanbok; a woman wears her hair parted in the middle and pulled into a low chignon with a simple wooden binyeo hairpin, and a plain ivory or muted hanbok jeogori. No jewelry, no crowns, no hats beyond the headband.',
    many
      ? `COMPOSITION: a frontal formal group portrait of all ${people} people from the chest up, close together as in IMAGE 1 (keep front and back rows if they stood that way), every face fully visible, sharp and large enough to recognize, all looking into the lens, filling the upper two-thirds of a vertical 2:3 frame. The lower third shows light hanbok collars and shoulders. Keep calm empty background at the top corners.`
      : 'COMPOSITION: strictly frontal and symmetrical close-up, head and upper shoulders, face centered and large in the upper-middle of a vertical 2:3 frame, eyes looking straight into the lens. The lower third shows the light hanbok collar and shoulders. Keep calm empty background at the top corners and along the left and right edges.',
    'BACKGROUND: a plain, slightly mottled aged hanji paper wall in warm ochre and parchment tones, completely empty.',
    'LOOK: desaturated warm sepia color grade, soft diffused light from the front, gentle vignette, fine film grain, crisp realistic skin texture, painterly and quiet.',
    'DO NOT add any text, calligraphy, seals, captions, logos, watermarks or signatures — no readable letters anywhere. Do not make them resemble any real celebrity or actor.',
  ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n')
}
