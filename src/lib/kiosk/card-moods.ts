// 명함의 스타일 종류 — 화면(명함 디자이너)과 서버(card-art.ts)가 같이 쓴다. 서버 전용 코드를 화면 묶음에 끌어들이지 않게 따로 둔다.
// 2026-10-13: 실제 명함 제작 사이트들이 정리한 최근 경향(가는 선·파스텔 색면·모티프 반복·블루프린트·블랙&골드·레트로·홀로그램·보태니컬)으로 다시 골랐다 — docs/kiosk-experiences.md

export const CARD_MOODS = ['minimal', 'pastel', 'pattern', 'blueprint', 'luxury', 'retro', 'holo', 'nature'] as const
export type CardMood = (typeof CARD_MOODS)[number]
/** 예전 화면(다시 켜지 않은 키오스크 앱)이 보내는 스타일 — 서버는 계속 받는다 */
export const CARD_LEGACY_MOODS = ['night', 'space', 'paint'] as const
export type CardLegacyMood = (typeof CARD_LEGACY_MOODS)[number]
/** 손님이 직접 적는 느낌의 길이 상한 */
export const CARD_MOOD_MAX = 30
/** 그림의 소재를 고르는 데 쓰는 역할·직업의 길이 상한 */
export const CARD_ROLE_MAX = 24
