// 키오스크 운영 모드 — 매장 상시 운영과 외부 행사마다 켜는 프로그램·첫 화면 문구·영수증 머리말이 다르다.
// 관리자가 키오스크 STORE ADMIN(우측 하단 → PIN) '운영 모드'에서 고르고, 같은 종류의 키오스크가 모두 따라간다
// (기기 설정 settings-kiosk 의 mode). 행사가 생기면 여기에 한 항목을 더하면 된다 — docs/kiosk-modes.md

import type { KioskLang } from './i18n'

export type KioskProgramId = 'personal' | 'idol' | 'saju' | 'color' | 'tarot'

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

/** 홍보 배너 모양 첫 화면 제목 — word+accent(벽돌색) / line / main(벽돌색) / mainEn / langs (src/app/kiosk/PosterTitle.tsx) */
export interface KioskPoster {
  word: string
  accent: string
  /** 한국어 화면의 둘째 줄. 외국어 화면에서는 그 언어의 attract.sub 를 쓴다 */
  line: string
  main: string
  mainEn: string
  langs: string
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
  /** 있으면 첫 화면 제목(티켓·워드마크·부제 자리)을 홍보 배너 모양으로 */
  poster?: KioskPoster
  /** 사주 결과를 장 넘기기 대신 한 화면 스크롤로 — 손님이 몰리는 행사장에서 줄을 줄이려고 */
  resultOnePage?: boolean
  receipt: {
    /** 'scent' = 향 먼저(매장), 'saju' = 명식 먼저인 사주 처방전. 컬러·타로는 프로그램이 제 머리말을 쓴다 */
    theme: 'scent' | 'saju'
    /** 워드마크 아래 한 줄 */
    subtitle: string
    /** 맨 아래 행사 안내 줄(한국어) */
    eventLines: string[]
    /** 행사 안내 줄 — 언어별. 없는 언어는 영어 → 한국어 */
    eventLinesByLang?: Partial<Record<KioskLang, string[]>>
    /** 제조 레시피를 상자로 감싼다 */
    recipeBox?: boolean
    /** 맨 아래 크게 찍는 안내(첫 줄 크게) — 없으면 매장 '카운터에 제출' 문구. 언어별, 없는 언어는 영어 */
    counterNotice?: Partial<Record<KioskLang, string[]>>
  }
  /** 이 모드로 바꿀 때 함께 고르는 키오스크 기본 배경(catalog.json id) */
  defaultBackground?: string
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
    resultOnePage: true,
    // 홍보 배너(2026-10-02)와 같은 제목
    poster: {
      word: 'SAJ',
      accent: 'U!',
      line: '사주로 찾는 나만의 향,',
      main: 'AI 조향사',
      mainEn: 'AI PERFUMER',
      langs: 'English · 日本語 · 简体中文 · 繁體中文',
    },
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
      eventLinesByLang: {
        en: ['2026 K-WAVE DANCE FESTIVAL', 'Global Culture Village · Itaewon-ro · Oct 3–4'],
        ja: ['2026 K-WAVE DANCE FESTIVAL', '世界文化村 · 梨泰院路 · 10.3~10.4'],
        'zh-Hans': ['2026 K-WAVE DANCE FESTIVAL', '世界文化村 · 梨泰院路 · 10.3~10.4'],
        'zh-Hant': ['2026 K-WAVE DANCE FESTIVAL', '世界文化村 · 梨泰院路 · 10.3~10.4'],
      },
      recipeBox: true,
      counterNotice: {
        ko: ['이 영수증을 직원에게 보여주세요.', '적힌 레시피 그대로 조향을 하시면 됩니다.'],
        en: ['Please show this receipt to our staff.', 'Blend your perfume exactly as the recipe says.'],
        ja: ['このレシートをスタッフにお見せください。', '書かれたレシピ通りに調香してください。'],
        'zh-Hans': ['请把这张小票出示给工作人员。', '按照上面的配方调香即可。'],
        'zh-Hant': ['請把這張收據出示給工作人員。', '依照上面的配方調香即可。'],
      },
    },
    defaultBackground: 'kiosk-event-kwave-2026',
  },
  {
    // 초안 — AI 퍼스널 컬러 진단 · AI 타로. 프로그램이 둘이라 첫 화면 다음에 고르기 화면이 나온다.
    // 행사가 정해지면 label·note·attract·receipt.eventLines 를 그 행사에 맞게 고친다(K-WAVE 항목 참고).
    id: 'ai-lab',
    label: 'AI 컬러 · 타로 (초안)',
    note: '행사 · 팝업용 · 퍼스널 컬러 진단 + 타로',
    brandName: "AC'SCENT AI LAB",
    storeEvents: false,
    programs: ['color', 'tarot'],
    // 두 프로그램은 향을 추천하지 않는다(진단서 · 리딩만) — 첫 화면 문구에도 향 이야기를 넣지 않는다
    attract: {
      ko: {
        ticket: 'AI COLOR · AI TAROT',
        wordmark: 'LAB!',
        sub: '나의 색과 오늘의 카드를 읽어 주는 AI',
        cardNo: '01 PICK > 01 REPORT',
        title1: '나의 색, 오늘의 카드,',
        title2: 'AI가 읽어 드릴게요',
        body1: 'AI가 퍼스널 컬러를 진단하거나 타로 세 장을 읽고,',
        body2: '결과를 영수증으로 뽑아드려요.',
        tags: ['#퍼스널컬러', '#AI타로', '#AI리딩'],
      },
      en: {
        ticket: 'AI COLOR · AI TAROT',
        wordmark: 'LAB!',
        sub: 'An AI that reads your colors and your cards',
        cardNo: '01 PICK > 01 REPORT',
        title1: 'Your colors, your cards,',
        title2: 'read for you by AI',
        body1: 'AI diagnoses your personal color or reads three tarot cards,',
        body2: 'then prints your result as a receipt.',
        tags: ['#PersonalColor', '#AITarot', '#AIReading'],
      },
      ja: {
        ticket: 'AI COLOR · AI TAROT',
        wordmark: 'LAB!',
        sub: 'あなたの色と今日のカードをAIが読み解きます',
        cardNo: '01 PICK > 01 REPORT',
        title1: '私の色、今日のカード、',
        title2: 'AIが読み解きます',
        body1: 'AIがパーソナルカラーを診断、またはタロット3枚を読み、',
        body2: '結果をレシートでお渡しします。',
        tags: ['#パーソナルカラー', '#AIタロット', '#AIリーディング'],
      },
      'zh-Hans': {
        ticket: 'AI COLOR · AI TAROT',
        wordmark: 'LAB!',
        sub: '由 AI 解读你的色彩与今天的牌',
        cardNo: '01 PICK > 01 REPORT',
        title1: '我的色彩，今天的牌，',
        title2: '交给 AI 来解读',
        body1: 'AI 为你诊断个人色彩，或解读三张塔罗牌，',
        body2: '并把结果打印成小票。',
        tags: ['#个人色彩', '#AI塔罗', '#AI解读'],
      },
      'zh-Hant': {
        ticket: 'AI COLOR · AI TAROT',
        wordmark: 'LAB!',
        sub: '由 AI 解讀你的色彩與今天的牌',
        cardNo: '01 PICK > 01 REPORT',
        title1: '我的色彩，今天的牌，',
        title2: '交給 AI 來解讀',
        body1: 'AI 為你診斷個人色彩，或解讀三張塔羅牌，',
        body2: '並把結果列印成收據。',
        tags: ['#個人色彩', '#AI塔羅', '#AI解讀'],
      },
    },
    receipt: { theme: 'scent', subtitle: 'AI LAB · REPORT', eventLines: [] },
  },
]

export const DEFAULT_KIOSK_MODE = KIOSK_MODES[0]
export const KIOSK_MODE_IDS = KIOSK_MODES.map((m) => m.id)

export function findKioskMode(id: string | null | undefined): KioskMode {
  return KIOSK_MODES.find((m) => m.id === id) ?? DEFAULT_KIOSK_MODE
}

/** 영수증 행사 줄 — 그 언어, 없으면 영어, 없으면 한국어 */
export function modeEventLines(mode: KioskMode, lang: KioskLang): string[] {
  return lang === 'ko' ? mode.receipt.eventLines : mode.receipt.eventLinesByLang?.[lang] ?? mode.receipt.eventLinesByLang?.en ?? mode.receipt.eventLines
}

/** 영수증 맨 아래 안내 — 모드에 있으면 그 언어(없으면 영어), 없으면 매장 기본 */
export function modeCounterNotice(mode: KioskMode, lang: KioskLang, fallback: string[] | undefined): string[] | undefined {
  const notice = mode.receipt.counterNotice
  return notice ? notice[lang] ?? notice.en ?? fallback : fallback
}

/** 이 모드·언어의 첫 화면 문구 — 없으면 영어 → 기본 문구 순으로 */
export function modeAttract(mode: KioskMode, lang: KioskLang, fallback: ModeAttract): ModeAttract {
  return { ...fallback, ...(mode.attract.en ?? {}), ...(mode.attract[lang] ?? {}) }
}
