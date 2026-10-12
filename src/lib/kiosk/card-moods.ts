// 명함의 느낌 종류 — 화면(명함 디자이너)과 서버(card-art.ts)가 같이 쓴다. 서버 전용 코드를 화면 묶음에 끌어들이지 않게 따로 둔다.

export const CARD_MOODS = ['minimal', 'pastel', 'nature', 'night', 'luxury', 'retro', 'space', 'paint'] as const
export type CardMood = (typeof CARD_MOODS)[number]
/** 손님이 직접 적는 느낌의 길이 상한 */
export const CARD_MOOD_MAX = 30
