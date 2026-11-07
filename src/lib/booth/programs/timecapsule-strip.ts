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

/**
 * 다시 촬영 이유 — 서버가 422 와 함께 보내고(생성 표는 쓰지 않는다), 촬영 화면이 무엇이 문제고 어떻게 찍으면 되는지 안내한다.
 * too-many 5명 이상 · no-people 사람을 못 찾음 · overlap 얼굴끼리 겹쳐 나눌 수 없음 · too-small 얼굴이 너무 작음 · unclear 그 밖(사람 읽기 답이 이상함)
 */
export type StripRetakeReason = 'too-many' | 'no-people' | 'overlap' | 'too-small' | 'unclear'
export interface StripRetake { reason: StripRetakeReason; people?: number }
/** 422 응답 — error 는 제목과 안내를 이은 한 문장(옛 화면은 이것만 보여 준다) */
export interface StripRetakeResponse { error: string; retake: StripRetake }

export function stripRetakeCopy({ reason, people }: StripRetake): { title: string; tip: string } {
  switch (reason) {
    case 'too-many':
      return { title: `사진에 ${people ?? STRIP_MAX_PEOPLE + 1}명이 보여요`, tip: `${STRIP_MAX_PEOPLE}명까지 함께 찍을 수 있어요. 인원을 줄이거나, 뒤에 지나가는 분이 찍혔다면 뒤가 빌 때 다시 찍어 주세요.` }
    case 'no-people':
      return { title: '얼굴을 찾지 못했어요', tip: '모두 카메라를 정면으로 바라보고, 화면의 모서리 표시 안으로 들어와서 다시 찍어 주세요.' }
    case 'overlap':
      return { title: '얼굴이 서로 겹쳐 있어요', tip: '얼굴끼리 한 뼘쯤 띄워 서서 다시 찍어 주세요. 아기는 얼굴이 가리지 않게 어깨 옆으로 안아 주세요.' }
    case 'too-small':
      return { title: '얼굴이 너무 작게 찍혔어요', tip: '카메라 쪽으로 한두 걸음 가까이 와서 다시 찍어 주세요.' }
    default:
      return { title: '얼굴을 정확히 구분하지 못했어요', tip: '모두 정면을 보고, 얼굴이 가리지 않게 조금씩 떨어져 서서 다시 찍어 주세요.' }
  }
}
