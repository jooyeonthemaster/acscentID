// 키오스크 운영 모드 — 매장 상시 운영과 외부 행사마다 켜는 프로그램·첫 화면 문구·영수증 머리말이 다르다.
// 관리자가 키오스크 STORE ADMIN(우측 상단 모서리 → PIN) '운영 모드'에서 고른다.
// 매장 기본(맨 앞 항목)은 모든 키오스크가 함께 쓰는 운영 모드이고, 그 밖의 프로그램은 모두 '체험 모드' —
// 고른 그 키오스크에만 저장된다(device-mode.ts). 행사가 생기면 여기에 한 항목을 더하면 된다 — docs/kiosk-modes.md

import type { KioskLang } from './i18n'
import type { ProductType } from '@/types/feedback'
import { EXPERIENCE_IDS, EXPERIENCE_META, experienceModeId, type ExperienceId } from './experience'

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
    /** 레시피를 영수증 머리 바로 아래에 크게(검은 띠 · 큰 향 이름 · 아주 큰 분량) — 손님이 직접 조향하는 행사(AI 조향사) */
    recipeHero?: boolean
    /** 맨 아래 크게 찍는 안내(첫 줄 크게) — 없으면 매장 '카운터에 제출' 문구. 언어별, 없는 언어는 영어 */
    counterNotice?: Partial<Record<KioskLang, string[]>>
  }
  /** 이 모드로 바꿀 때 함께 고르는 키오스크 기본 배경(catalog.json id) */
  defaultBackground?: string
  /** 제품을 하나로 정해 둔 모드 — 제품 고르기 단계를 건너뛰고 그 제품 기준 레시피를 찍는다(행사: 정해진 분량만 준비) */
  fixedProduct?: ProductType
  /** 레시피 그램을 ml 과 같은 숫자로(1ml = 1g) — 행사 현장에서 숫자 둘이 달라 헷갈리지 않게(2026-10-28 사용자 지시, AI 조향사) */
  gramsEqualMl?: boolean
  /** 사진 분석 문장을 존댓말로 — 연령대가 다양한 공공 행사에서 매장의 반말·주접 톤을 쓰지 않는다(/api/kiosk/analyze 의 tone) */
  politeTone?: boolean
  /** 체험 모드(네일·명함 등) — 기존 화면 셸 대신 전용 화면(src/app/kiosk/experience)이 돈다. programs·attract·receipt 는 쓰이지 않는다 */
  experience?: ExperienceId
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
    brandName: "K-WAVE",
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
    // AI 조향사 — 손님 본인 사진으로 향을 찾고 조향 레시피를 영수증으로 뽑는 행사·팝업용 모드(2026-10-26, 은평구 행사).
    // 프로그램 하나뿐이라 고르기 화면 없이 바로 시작, 제품은 퍼퓸 10ml 로 고정(제품 단계 없음), 촬영은 키오스크 카메라가 먼저,
    // 분석 문장은 존댓말(매장의 반말·주접 톤 대신).
    // 행사가 정해지면 receipt.eventLines 에 행사명·장소·날짜를 넣는다.
    id: 'ai-perfumer',
    label: 'AI 조향사',
    note: '행사 · 팝업용 · 본인 사진으로 향 레시피 (퍼퓸 10ml)',
    brandName: "AI PERFUMER",
    storeEvents: false,
    programs: ['personal'],
    fixedProduct: 'perfume_10ml',
    gramsEqualMl: true,
    politeTone: true,
    poster: {
      word: 'SCEN',
      accent: 'T!',
      line: '내 사진으로 찾는 나만의 향,',
      main: 'AI 조향사',
      mainEn: 'AI PERFUMER',
      langs: 'English · 日本語 · 简体中文 · 繁體中文',
    },
    attract: {
      ko: {
        ticket: 'AI PERFUMER · MY PHOTO',
        wordmark: 'SCENT!',
        sub: '내 사진으로 찾는 나만의 향, AI 조향사',
        cardNo: '01 PHOTO > 01 SCENT',
        title1: '지금의 나,',
        title2: '어떤 향이 어울릴까요?',
        body1: '사진 한 장으로 나의 분위기를 읽고 어울리는 향을 찾아,',
        body2: '나만의 조향 레시피를 영수증으로 뽑아드려요.',
        tags: ['#나만의향', '#AI조향', '#조향체험'],
      },
      en: {
        ticket: 'AI PERFUMER · MY PHOTO',
        wordmark: 'SCENT!',
        sub: 'An AI perfumer that reads your photo',
        cardNo: '01 PHOTO > 01 SCENT',
        title1: 'The you of today,',
        title2: 'which scent suits you?',
        body1: 'We read your mood from a single photo and find the scent that fits,',
        body2: 'then print your own perfume recipe as a receipt.',
        tags: ['#MyScent', '#AIPerfumer', '#ScentLab'],
      },
      ja: {
        ticket: 'AI PERFUMER · MY PHOTO',
        wordmark: 'SCENT!',
        sub: '写真で見つける、私だけの香り',
        cardNo: '01 PHOTO > 01 SCENT',
        title1: '今のわたしに、',
        title2: '似合う香りは？',
        body1: '写真一枚から雰囲気を読み取り、似合う香りを見つけて、',
        body2: 'あなただけの調香レシピをレシートでお渡しします。',
        tags: ['#私だけの香り', '#AI調香', '#調香体験'],
      },
      'zh-Hans': {
        ticket: 'AI PERFUMER · MY PHOTO',
        wordmark: 'SCENT!',
        sub: '用照片找到属于你的香气',
        cardNo: '01 PHOTO > 01 SCENT',
        title1: '现在的你，',
        title2: '适合什么香气？',
        body1: '从一张照片读取你的气质，找到适合你的香气，',
        body2: '并把专属调香配方打印成小票。',
        tags: ['#专属香气', '#AI调香', '#调香体验'],
      },
      'zh-Hant': {
        ticket: 'AI PERFUMER · MY PHOTO',
        wordmark: 'SCENT!',
        sub: '用照片找到屬於你的香氣',
        cardNo: '01 PHOTO > 01 SCENT',
        title1: '現在的你，',
        title2: '適合什麼香氣？',
        body1: '從一張照片讀取你的氣質，找到適合你的香氣，',
        body2: '並把專屬調香配方列印成收據。',
        tags: ['#專屬香氣', '#AI調香', '#調香體驗'],
      },
    },
    receipt: {
      theme: 'scent',
      subtitle: 'AI PERFUMER · SCENT RECIPE',
      eventLines: [],
      recipeBox: true,
      // 2026-10-28 사용자: "레시피 부분이 눈에 띄게 크게 — 한눈에 봐도 이걸 보고 조향을 해야 하는구나 싶게"
      recipeHero: true,
      counterNotice: {
        ko: ['이 영수증을 직원에게 보여주세요.', '적힌 레시피 그대로 조향을 하시면 됩니다.'],
        en: ['Please show this receipt to our staff.', 'Blend your perfume exactly as the recipe says.'],
        ja: ['このレシートをスタッフにお見せください。', '書かれたレシピ通りに調香してください。'],
        'zh-Hans': ['请把这张小票出示给工作人员。', '按照上面的配方调香即可。'],
        'zh-Hant': ['請把這張收據出示給工作人員。', '依照上面的配方調香即可。'],
      },
    },
    defaultBackground: 'kiosk-study-01',
  },
  {
    // AI 퍼스널 컬러 진단 — 프로그램 하나뿐인 모드라 첫 화면 다음에 바로 시작한다(고르기 화면 없음).
    // 향을 추천하지 않는다(진단서만). 행사가 정해지면 label·note·attract·receipt.eventLines 를 그 행사에 맞게 고친다.
    id: 'ai-color',
    label: 'AI 퍼스널 컬러',
    note: '행사 · 팝업용 · 사진 한 장으로 퍼스널 컬러 진단',
    brandName: "AI COLOR",
    storeEvents: false,
    programs: ['color'],
    attract: {
      ko: {
        ticket: 'AI PERSONAL COLOR',
        wordmark: 'COLOR!',
        sub: '사진 한 장으로 찾는 나의 퍼스널 컬러',
        cardNo: '01 PHOTO > 01 COLOR',
        title1: '나에게 어울리는 색,',
        title2: 'AI가 찾아 드릴게요',
        body1: '얼굴 사진 한 장으로 퍼스널 컬러 8유형을 진단하고,',
        body2: '어울리는 색과 스타일 가이드를 영수증으로 뽑아드려요.',
        tags: ['#퍼스널컬러', '#웜톤쿨톤', '#AI진단'],
      },
      en: {
        ticket: 'AI PERSONAL COLOR',
        wordmark: 'COLOR!',
        sub: 'Find your personal color from a single photo',
        cardNo: '01 PHOTO > 01 COLOR',
        title1: 'Your best colors,',
        title2: 'found by AI',
        body1: 'AI finds your personal color type from one photo',
        body2: 'and prints your best colors as a receipt.',
        tags: ['#PersonalColor', '#WarmOrCool'],
      },
      ja: {
        ticket: 'AI PERSONAL COLOR',
        wordmark: 'COLOR!',
        sub: '写真1枚でわかる、私のパーソナルカラー',
        cardNo: '01 PHOTO > 01 COLOR',
        title1: '私に似合う色、',
        title2: 'AIが見つけます',
        body1: '顔写真1枚からパーソナルカラー8タイプを診断し、',
        body2: '似合う色とスタイルガイドをレシートでお渡しします。',
        tags: ['#パーソナルカラー', '#イエベブルベ', '#AI診断'],
      },
      'zh-Hans': {
        ticket: 'AI PERSONAL COLOR',
        wordmark: 'COLOR!',
        sub: '一张照片，找到你的个人色彩',
        cardNo: '01 PHOTO > 01 COLOR',
        title1: '适合你的颜色，',
        title2: '交给 AI 来找',
        body1: '只需一张面部照片，AI 就能诊断你的个人色彩类型，',
        body2: '并把适合的颜色与风格指南打印成小票。',
        tags: ['#个人色彩', '#冷暖色调', '#AI诊断'],
      },
      'zh-Hant': {
        ticket: 'AI PERSONAL COLOR',
        wordmark: 'COLOR!',
        sub: '一張照片，找到你的個人色彩',
        cardNo: '01 PHOTO > 01 COLOR',
        title1: '適合你的顏色，',
        title2: '交給 AI 來找',
        body1: '只需一張臉部照片，AI 就能診斷你的個人色彩類型，',
        body2: '並把適合的顏色與風格指南列印成收據。',
        tags: ['#個人色彩', '#冷暖色調', '#AI診斷'],
      },
    },
    receipt: { theme: 'scent', subtitle: 'PERSONAL COLOR REPORT', eventLines: [] },
  },
  {
    // AI 타로 — 프로그램 하나뿐인 모드(고르기 화면 없음). 향을 추천하지 않는다(리딩만).
    id: 'ai-tarot',
    label: 'AI 타로',
    note: '행사 · 팝업용 · 카드 세 장(과거 · 현재 · 미래) 리딩',
    brandName: "AI TAROT",
    storeEvents: false,
    programs: ['tarot'],
    attract: {
      ko: {
        ticket: 'AI TAROT',
        wordmark: 'TAROT!',
        sub: '카드 세 장으로 읽는 지금의 나',
        cardNo: '03 CARDS > 01 READING',
        title1: '마음이 가는 카드 세 장,',
        title2: 'AI가 읽어 드릴게요',
        body1: '과거 · 현재 · 미래 세 장을 직접 뽑으면 AI가 흐름을 풀이하고,',
        body2: '리딩을 영수증으로 뽑아드려요.',
        tags: ['#AI타로', '#메이저아르카나', '#오늘의흐름'],
      },
      en: {
        ticket: 'AI TAROT',
        wordmark: 'TAROT!',
        sub: 'A three-card reading of where you are now',
        cardNo: '03 CARDS > 01 READING',
        title1: 'Pick three cards,',
        title2: 'AI reads them for you',
        body1: 'Draw your past, present and future — AI reads the flow',
        body2: 'and prints your reading as a receipt.',
        tags: ['#AITarot', '#ThreeCards'],
      },
      ja: {
        ticket: 'AI TAROT',
        wordmark: 'TAROT!',
        sub: '3枚のカードで読み解く、今の私',
        cardNo: '03 CARDS > 01 READING',
        title1: '気になるカードを3枚、',
        title2: 'AIが読み解きます',
        body1: '過去・現在・未来の3枚を自分で引くと、AIが流れを読み解き、',
        body2: 'リーディングをレシートでお渡しします。',
        tags: ['#AIタロット', '#大アルカナ', '#今日の流れ'],
      },
      'zh-Hans': {
        ticket: 'AI TAROT',
        wordmark: 'TAROT!',
        sub: '用三张牌解读现在的你',
        cardNo: '03 CARDS > 01 READING',
        title1: '选出三张有感觉的牌，',
        title2: '交给 AI 来解读',
        body1: '亲手抽出过去、现在、未来三张牌，AI 为你解读其中的流动，',
        body2: '并把解读打印成小票。',
        tags: ['#AI塔罗', '#大阿尔卡那', '#今日运势'],
      },
      'zh-Hant': {
        ticket: 'AI TAROT',
        wordmark: 'TAROT!',
        sub: '用三張牌解讀現在的你',
        cardNo: '03 CARDS > 01 READING',
        title1: '選出三張有感覺的牌，',
        title2: '交給 AI 來解讀',
        body1: '親手抽出過去、現在、未來三張牌，AI 為你解讀其中的流動，',
        body2: '並把解讀列印成收據。',
        tags: ['#AI塔羅', '#大阿爾克那', '#今日運勢'],
      },
    },
    receipt: { theme: 'scent', subtitle: 'TAROT READING', eventLines: [] },
  },
  // 체험 모드 7종(2026-10-12) — 화면·문구는 src/app/kiosk/experience, 이름은 experience.ts
  ...EXPERIENCE_IDS.map((id): KioskMode => ({
    id: experienceModeId(id),
    label: EXPERIENCE_META[id].name,
    note: EXPERIENCE_META[id].note,
    brandName: EXPERIENCE_META[id].tag,
    storeEvents: false,
    programs: [],
    attract: {},
    receipt: { theme: 'scent', subtitle: '', eventLines: [] },
    experience: id,
  })),
]

export const DEFAULT_KIOSK_MODE = KIOSK_MODES[0]

/**
 * 이름이 바뀐 모드 — 기기 설정에 옛 id 가 남아 있어도 매장 기본 모드로 떨어지지 않게 새 모드로 읽는다.
 * 'ai-lab'(퍼스널 컬러 + 타로를 고르는 모드)은 2026-10-09 에 'ai-color' · 'ai-tarot' 두 모드로 나뉘었다.
 */
const LEGACY_KIOSK_MODE_IDS: Record<string, string> = { 'ai-lab': 'ai-color' }

/** 저장·미리보기에서 받는 id — 지금 모드 + 옛 이름 */
export const KIOSK_MODE_IDS = [...KIOSK_MODES.map((m) => m.id), ...Object.keys(LEGACY_KIOSK_MODE_IDS)]

export function findKioskMode(id: string | null | undefined): KioskMode {
  const current = id ? LEGACY_KIOSK_MODE_IDS[id] ?? id : id
  return KIOSK_MODES.find((m) => m.id === current) ?? DEFAULT_KIOSK_MODE
}

/** 체험 모드(매장 기본이 아닌 프로그램)인가 — 기기에만 저장하는 모드. 없는 이름·매장 기본은 아니다 */
export function isDeviceKioskMode(id: string | null | undefined): id is string {
  return Boolean(id) && KIOSK_MODE_IDS.includes(id as string) && findKioskMode(id).id !== DEFAULT_KIOSK_MODE.id
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
