// 헤어 스타일 종류 — 화면(버추얼 메이크업)과 서버(hairstyle.ts)가 같이 쓴다. 서버 전용 코드를 화면 묶음에 끌어들이지 않게 따로 둔다.

export const HAIR_STYLES = ['bob', 'long-wave', 'short', 'ponytail', 'bangs', 'perm'] as const
export type HairStyle = (typeof HAIR_STYLES)[number]
