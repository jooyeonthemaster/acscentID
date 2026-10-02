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
  /** 있으면 대기 화면 제목을 홍보 배너 모양으로(src/components/photobooth/IdolPosterTitle.tsx) — 위 문구 대신 */
  poster?: BoothPoster
}

/** 홍보 배너 모양 제목 — word+accent(벽돌색) / line / main(벽돌색) / mainEn / langs */
export interface BoothPoster {
  word: string
  accent: string
  line: string
  main: string
  mainEn: string
  langs: string
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
  /** 행사 모드(K-POP AI 아이돌 사진) — 첫 화면에서 컨셉을 고르고 한 컷, 인화 디자인 4종(src/lib/booth/idol-layouts.ts) */
  stageMakeup?: {
    /** 인화물 행사 줄 — 1줄: 행사명(인화 디자인에 싣는다), 2줄: 장소·기간 */
    eventLines: [string, string]
  }
  /** 이 모드로 바꿀 때 함께 고르는 포토부스 기본 배경(catalog.json id) */
  defaultBackground?: string
  /**
   * 인화물 오른쪽 아래에 폰 다운로드 QR — 완성 사진을 모두 서버에 7일 보관하게 된다(src/lib/booth/print-qr.ts).
   * 손님 동의 문구에 보관을 안내하는 행사 모드만 켠다. 매장 모드는 [폰으로 받기]를 누른 사진만 올린다
   */
  printQr?: boolean
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
    brandLine: "AC'SCENT × K-WAVE · AI IDOL PHOTO",
    storeEvents: false,
    attract: {
      wordmark: "AC'SCENT × K-WAVE",
      sub: 'AI IDOL PHOTO',
      badge: '2026 K-WAVE DANCE FESTIVAL',
      headline: '오늘, 나도 K-POP 아이돌',
      headlineEn: 'Become a K-POP idol today',
      // 홍보 배너(2026-10-01)와 같은 제목
      poster: {
        word: 'IDO',
        accent: 'L!',
        line: '오늘, 나도 K-POP 아이돌',
        main: 'AI 포토부스',
        mainEn: 'AI PHOTOBOOTH',
        langs: 'English · 日本語 · 简体中文 · 繁體中文',
      },
    },
    stageMakeup: {
      eventLines: ['2026 K-WAVE DANCE FESTIVAL', '세계문화마을 · 이태원로 · 10.3~10.4'],
    },
    defaultBackground: 'booth-event-kwave-2026-idol',
    printQr: true,
  },
]

export const DEFAULT_BOOTH_MODE = BOOTH_MODES[0]
export const BOOTH_MODE_IDS = BOOTH_MODES.map((m) => m.id)

export function findBoothMode(id: string | null | undefined): BoothMode {
  return BOOTH_MODES.find((m) => m.id === id) ?? DEFAULT_BOOTH_MODE
}
