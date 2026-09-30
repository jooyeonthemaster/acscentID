// 포토부스 운영 모드 — 매장 상시 운영과 외부 행사마다 첫 화면 문구·제목줄·인화물 하단·콘텐츠가 다르다.
// 관리자가 포토부스 STORE ADMIN(우측 하단 → PIN) '운영 모드'에서 고르고, 같은 종류의 포토부스가 모두 따라간다
// (기기 설정 settings-booth 의 mode). 키오스크 모드(src/lib/kiosk/modes.ts)와 같은 방식 — docs/kiosk-modes.md '포토부스'

/** 대기 화면(WELCOME 창) 문구 — 부스 화면은 한국어라, 외국인 손님이 많은 행사 모드는 영어를 한 줄 곁들인다 */
export interface BoothAttract {
  wordmark: string
  sub: string
  badge: string
  headline: string
  /** 대기 화면 제목 아래 영어 한 줄(행사 모드) */
  headlineEn?: string
}

export interface BoothMode {
  id: string
  /** 관리자 화면에 보이는 이름 */
  label: string
  /** 관리자 화면 보조 설명(기간·장소·콘텐츠) */
  note: string
  /** 제목줄 아래 브랜드 줄(예: AC'SCENT WOW · 4X6 PHOTO BOOTH) */
  brandLine: string
  /** 매장 이벤트 배경·글꼴(생카 등, docs/screen-events.md)을 적용하는가 — 매장 밖 행사에서는 끈다 */
  storeEvents: boolean
  /** 없으면 매장 기본 문구(화면 코드에 그대로) */
  attract?: BoothAttract
  /** K-POP 무대 메이크업 — 편집 화면에서 룩을 고르면 색 보정·스티커·인화물 하단 '오늘의 무대 메이크업'(src/lib/booth/stage-makeup.ts) */
  stageMakeup?: {
    /** 인화물 하단 행사 줄 — 1줄: 행사명, 2줄: 장소·기간 */
    eventLines: [string, string]
  }
  /** 이 모드로 바꿀 때 함께 고르는 포토부스 기본 배경(catalog.json id) */
  defaultBackground?: string
}

export const BOOTH_MODES: BoothMode[] = [
  {
    id: 'wow',
    label: "AC'SCENT WOW 매장",
    note: '상시 운영 · 최애·포토카드 촬영',
    brandLine: "AC'SCENT WOW · 4X6 PHOTO BOOTH",
    storeEvents: true,
  },
  {
    id: 'kwave-2026',
    label: 'K-WAVE 댄스 페스티벌',
    note: '2026.10.3~10.4 · 이태원로 세계문화마을',
    brandLine: "AC'SCENT × K-WAVE · STAGE MAKEUP PHOTO",
    storeEvents: false,
    attract: {
      wordmark: "AC'SCENT × K-WAVE",
      sub: 'STAGE MAKEUP PHOTO',
      badge: '2026 K-WAVE DANCE FESTIVAL',
      headline: '오늘의 무대 메이크업, 한 장에',
      headlineEn: 'Pick your K-POP stage makeup look',
    },
    stageMakeup: {
      eventLines: ['2026 K-WAVE DANCE FESTIVAL', '세계문화마을 · 이태원로 · 10.3~10.4'],
    },
    defaultBackground: 'booth-event-kwave-2026-idol',
  },
]

export const DEFAULT_BOOTH_MODE = BOOTH_MODES[0]
export const BOOTH_MODE_IDS = BOOTH_MODES.map((m) => m.id)

export function findBoothMode(id: string | null | undefined): BoothMode {
  return BOOTH_MODES.find((m) => m.id === id) ?? DEFAULT_BOOTH_MODE
}
