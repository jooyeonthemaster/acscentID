// 키오스크 운영 모드 — 매장 상시 운영과 외부 행사마다 켜는 프로그램·첫 화면 문구·영수증 머리말이 다르다.
// 관리자가 키오스크 STORE ADMIN(우측 하단 → PIN) '운영 모드'에서 고르고, 같은 종류의 키오스크가 모두 따라간다
// (기기 설정 settings-kiosk 의 mode). 행사가 생기면 여기에 한 항목을 더하면 된다 — docs/kiosk-modes.md

import type { KioskLang } from './i18n'

export type KioskProgramId = 'personal' | 'idol' | 'saju'

/** 첫 화면(대기 화면) 문구 — 없는 칸은 기본(i18n) 문구를 쓴다 */
export interface ModeAttract {
  ticket: string
  wordmark: string
  sub: string
  cardNo: string
  title1: string
  title2: string
  body1: string
  body2: string
  tags: string[]
}

export interface KioskMode {
  id: string
  /** 관리자 화면에 보이는 이름 */
  label: string
  /** 관리자 화면 보조 설명(기간·장소) */
  note: string
  /** 화면 맨 위 제목줄 이름 */
  brandName: string
  /** 매장 이벤트 배경·글꼴(생카 등, docs/screen-events.md)을 적용하는가 — 매장 밖 행사에서는 끈다 */
  storeEvents: boolean
  /** 켜는 프로그램 — 둘 이상이면 프로그램 고르기 화면이 나온다 */
  programs: KioskProgramId[]
  /** 언어별 첫 화면 문구. 비면 매장 기본 문구 */
  attract: Partial<Record<KioskLang, Partial<ModeAttract>>>
  receipt: {
    /** 'scent' = 향 먼저(매장), 'saju' = 명식 먼저인 사주 처방전 */
    theme: 'scent' | 'saju'
    /** 워드마크 아래 한 줄 */
    subtitle: string
    /** 맨 아래 행사 안내 줄 */
    eventLines: string[]
  }
}

export const KIOSK_MODES: KioskMode[] = [
  {
    id: 'wow',
    label: "AC'SCENT WOW 매장",
    note: '상시 운영 · 최애 이미지 분석',
    brandName: "AC'SCENT WOW",
    storeEvents: true,
    programs: ['idol'],
    attract: {},
    receipt: { theme: 'scent', subtitle: 'WOW · SCENT REPORT', eventLines: [] },
  },
  {
    id: 'kwave-2026',
    label: 'K-WAVE 댄스 페스티벌',
    note: '2026.10.3~10.4 · 이태원로 세계문화마을 · 사주 분석',
    brandName: "AC'SCENT × K-WAVE",
    storeEvents: false,
    programs: ['saju'],
    attract: {
      ko: {
        ticket: 'K-WAVE DANCE FESTIVAL · ITAEWON',
        wordmark: 'SAJU!',
        sub: '사주로 찾는 나만의 향, AI 조향사',
        cardNo: '01 BIRTH > 01 SCENT',
        title1: '태어난 순간의 기운,',
        title2: '어떤 향으로 채울까요?',
        body1: '생년월일시로 사주 오행을 읽고 부족한 기운(용신)을 채우는 향을 찾아,',
        body2: '나만의 향 처방전을 영수증으로 뽑아드려요.',
        tags: ['#사주향수', '#오행', '#K-WAVE'],
      },
      en: {
        ticket: 'K-WAVE DANCE FESTIVAL · ITAEWON',
        wordmark: 'SAJU!',
        sub: 'An AI perfumer that reads your Korean saju',
        cardNo: '01 BIRTH > 01 SCENT',
        title1: 'The energy of your birth,',
        title2: 'which scent will balance it?',
        body1: 'We read the five elements of your birth date and hour and find the scent your chart needs,',
        body2: 'then print your scent prescription as a receipt.',
        tags: ['#SajuPerfume', '#FiveElements', '#KWAVE'],
      },
      ja: {
        ticket: 'K-WAVE DANCE FESTIVAL · ITAEWON',
        wordmark: 'SAJU!',
        sub: '四柱推命で見つける、私だけの香り',
        cardNo: '01 BIRTH > 01 SCENT',
        title1: '生まれた瞬間の気、',
        title2: 'どんな香りで満たしますか？',
        body1: '生年月日と時間から五行を読み、足りない気を補う香りを見つけて、',
        body2: '香りの処方箋をレシートでお渡しします。',
        tags: ['#四柱香水', '#五行', '#KWAVE'],
      },
      'zh-Hans': {
        ticket: 'K-WAVE DANCE FESTIVAL · ITAEWON',
        wordmark: 'SAJU!',
        sub: '用四柱八字找到属于你的香气',
        cardNo: '01 BIRTH > 01 SCENT',
        title1: '出生那一刻的气，',
        title2: '要用什么香气来补足？',
        body1: '根据出生年月日时解读五行，找出补足所缺之气的香气，',
        body2: '并把专属香气处方打印成小票。',
        tags: ['#八字香水', '#五行', '#KWAVE'],
      },
      'zh-Hant': {
        ticket: 'K-WAVE DANCE FESTIVAL · ITAEWON',
        wordmark: 'SAJU!',
        sub: '用四柱八字找到屬於你的香氣',
        cardNo: '01 BIRTH > 01 SCENT',
        title1: '出生那一刻的氣，',
        title2: '要用什麼香氣來補足？',
        body1: '根據出生年月日時解讀五行，找出補足所缺之氣的香氣，',
        body2: '並把專屬香氣處方列印成收據。',
        tags: ['#八字香水', '#五行', '#KWAVE'],
      },
    },
    receipt: {
      theme: 'saju',
      subtitle: 'SAJU SCENT · 四柱香 處方',
      eventLines: ['2026 K-WAVE DANCE FESTIVAL', '세계문화마을 · 이태원로 · 10.3~10.4'],
    },
  },
]

export const DEFAULT_KIOSK_MODE = KIOSK_MODES[0]
export const KIOSK_MODE_IDS = KIOSK_MODES.map((m) => m.id)

export function findKioskMode(id: string | null | undefined): KioskMode {
  return KIOSK_MODES.find((m) => m.id === id) ?? DEFAULT_KIOSK_MODE
}

/** 이 모드·언어의 첫 화면 문구 — 없으면 영어 → 기본 문구 순으로 */
export function modeAttract(mode: KioskMode, lang: KioskLang, fallback: ModeAttract): ModeAttract {
  return { ...fallback, ...(mode.attract.en ?? {}), ...(mode.attract[lang] ?? {}) }
}
