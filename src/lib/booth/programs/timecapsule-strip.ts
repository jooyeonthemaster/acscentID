// ANSAN 운영 모드(2026 안산사이언스밸리 과학축제 · AI 포토존)의 'LATER! 미래로 가는 타임캡슐' — 화면·서버 공통.
// 한 컷(혼자~4명)을 찍으면 2×6 사진 네 컷: 지금(찍은 사진 그대로) + 10·20·30년 후(AI). 모두가 같은 햇수만큼 나이 든다.
// 장면 묘사(영어 프롬프트)는 서버 전용 timecapsule-server.ts 에, 여기는 화면에 보이는 이름·연도만.

export const STRIP_PROGRAM_ID = 'ansan-2026'
export const STRIP_NOW_YEAR = 2026

/** 축제 공식 표기 — 공식 웹사이트 디자인 문서(확정 카피)와 글자까지 같게. 바꾸거나 지어내지 않는다 */
export const ASV_FESTIVAL = {
  name: '2026 안산사이언스밸리(ASV) 과학축제',
  short: 'ASV 2026',
  dates: '2026.11.07(토) – 11.08(일)',
  venue: '한양대학교 ERICA캠퍼스',
  theme: '디지털 교육 & 88로봇위크',
} as const
/** 함께 찍을 수 있는 사람 수 — 넘으면 얼굴이 섞이기 쉬워 다시 찍게 한다 */
export const STRIP_MAX_PEOPLE = 4

export type StripYears = 10 | 20 | 30

export interface StripStep {
  years: StripYears
  year: number
  /** 칸 이름 */
  label: string
  /** 장면 이름(화면·사진) */
  place: string
}

export const STRIP_STEPS: StripStep[] = [
  { years: 10, year: STRIP_NOW_YEAR + 10, label: '10년 후', place: '미래 과학관' },
  { years: 20, year: STRIP_NOW_YEAR + 20, label: '20년 후', place: '초록 미래 도시' },
  { years: 30, year: STRIP_NOW_YEAR + 30, label: '30년 후', place: '우주 정거장' },
]

export const isStripYears = (value: unknown): value is StripYears => value === 10 || value === 20 || value === 30

/** POST /api/photobooth/timecapsule 응답 — images 는 요청한 years 순서, 못 만든 칸은 null */
export interface StripResponse {
  people: number
  images: { years: StripYears; image: string | null }[]
}
