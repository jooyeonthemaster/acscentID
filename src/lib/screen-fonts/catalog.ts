// 화면 글꼴 목록 — 관리자가 기기(포토부스·키오스크)별로 고른다.
// 파일은 public/fonts/ui/<id>/<굵기>.woff2 — 한글 상용 2,350자(KS X 1001) + 영문·기호·호환 자모로 줄였다.
// 그 밖의 드문 글자는 뒤따르는 기본 글꼴이 받는다. 출처·라이선스는 docs/screen-fonts.md.
// 생성: scripts/build-screen-fonts.py → 이 파일 (명조·붓글씨 계열은 일부러 넣지 않았다)

export type ScreenFontCategory = 'gothic' | 'round' | 'title' | 'cute' | 'pixel'

export interface ScreenFont {
  id: string
  label: string
  category: ScreenFontCategory
  weights: number[]
  license: string
  /** 사이트 전역에 이미 실린 글꼴(next/font) — 파일을 따로 싣지 않는다 */
  cssVar?: string
}

export const SCREEN_FONT_CATEGORIES: Record<ScreenFontCategory, string> = {
  gothic: '고딕 (본문용)',
  round: '둥근 글꼴',
  title: '제목용 굵은 글꼴',
  cute: '귀여운 글꼴',
  pixel: '픽셀·코딩',
}

export const SCREEN_FONTS: ScreenFont[] = [
  {
    "id": "score-dream",
    "label": "에스코어드림",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "에스코어 무료 글꼴(상업 이용 가능)",
    "cssVar": "--font-score-dream"
  },
  {
    "id": "wanted-sans",
    "label": "원티드 산스",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1",
    "cssVar": "--font-wanted"
  },
  {
    "id": "pretendard",
    "label": "프리텐다드",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "suit",
    "label": "SUIT",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "noto-sans-kr",
    "label": "본고딕 (Noto Sans KR)",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "nanum-gothic",
    "label": "나눔고딕",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "gothic-a1",
    "label": "Gothic A1",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "ibm-plex-sans-kr",
    "label": "IBM Plex Sans KR",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "gowun-dodum",
    "label": "고운돋움",
    "category": "gothic",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "sunflower",
    "label": "선플라워",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "nanum-barun-gothic",
    "label": "나눔바른고딕",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "네이버 나눔글꼴 라이선스안내"
  },
  {
    "id": "nanum-square",
    "label": "나눔스퀘어",
    "category": "gothic",
    "weights": [
      400
    ],
    "license": "네이버 나눔글꼴 라이선스안내"
  },
  {
    "id": "nanum-square-ac",
    "label": "나눔스퀘어 ac",
    "category": "gothic",
    "weights": [
      400
    ],
    "license": "네이버 나눔글꼴 라이선스안내"
  },
  {
    "id": "line-seed",
    "label": "LINE Seed Sans KR",
    "category": "gothic",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "nexon-lv1",
    "label": "넥슨 Lv.1 고딕",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "넥슨 폰트 사용정책"
  },
  {
    "id": "nexon-lv2",
    "label": "넥슨 Lv.2 고딕",
    "category": "gothic",
    "weights": [
      400,
      700
    ],
    "license": "넥슨 폰트 사용정책"
  },
  {
    "id": "hakgyo-bareon-dotum",
    "label": "학교안심 바른돋움",
    "category": "gothic",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "hakgyo-santteut-dotum",
    "label": "학교안심 산뜻돋움",
    "category": "gothic",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "dongle",
    "label": "동글",
    "category": "round",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "nanum-square-round",
    "label": "나눔스퀘어라운드",
    "category": "round",
    "weights": [
      400
    ],
    "license": "네이버 나눔글꼴 라이선스안내"
  },
  {
    "id": "bm-jua",
    "label": "배민 주아",
    "category": "round",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "bm-hanna-pro",
    "label": "배민 한나체 Pro",
    "category": "round",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "bm-hanna-air",
    "label": "배민 한나체 Air",
    "category": "round",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "bm-hanna-11",
    "label": "배민 한나는 열한살",
    "category": "round",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "nexon-maplestory",
    "label": "메이플스토리",
    "category": "round",
    "weights": [
      400,
      700
    ],
    "license": "넥슨 폰트 사용정책"
  },
  {
    "id": "nexon-bazzi",
    "label": "넥슨 배찌체",
    "category": "round",
    "weights": [
      400
    ],
    "license": "넥슨 폰트 사용정책"
  },
  {
    "id": "hakgyo-monggeul",
    "label": "학교안심 몽글몽글",
    "category": "round",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "hakgyo-gureum",
    "label": "학교안심 구름",
    "category": "round",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "black-han-sans",
    "label": "검은고딕",
    "category": "title",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "gugi",
    "label": "구기",
    "category": "title",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "orbit",
    "label": "오빗",
    "category": "title",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "bagel-fat-one",
    "label": "베이글 팻 원",
    "category": "title",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "gasoek-one",
    "label": "가속 원",
    "category": "title",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "bm-dohyeon",
    "label": "배민 도현",
    "category": "title",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "bm-yeonsung",
    "label": "배민 연성",
    "category": "title",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "bm-euljiro",
    "label": "배민 을지로",
    "category": "title",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "bm-euljiro-10",
    "label": "배민 을지로 10년후",
    "category": "title",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "hakgyo-godeun",
    "label": "학교안심 고든제목",
    "category": "title",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "hakgyo-undongjang",
    "label": "학교안심 운동장",
    "category": "title",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "stylish",
    "label": "스타일리시",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "poor-story",
    "label": "푸어 스토리",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "single-day",
    "label": "싱글데이",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "cute-font",
    "label": "큐트 폰트",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "gaegu",
    "label": "개구",
    "category": "cute",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "gamja-flower",
    "label": "감자꽃",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "hi-melody",
    "label": "하이멜로디",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "bm-kirang",
    "label": "배민 기랑해랑",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "배달의민족 글꼴 라이센스 정책"
  },
  {
    "id": "hakgyo-kkokkoma",
    "label": "학교안심 꼬꼬마",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "hakgyo-jiugae",
    "label": "학교안심 지우개",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "학교 안심폰트"
  },
  {
    "id": "nanum-pen",
    "label": "나눔손글씨 펜",
    "category": "cute",
    "weights": [
      400
    ],
    "license": "네이버 나눔글꼴 라이선스안내"
  },
  {
    "id": "galmuri11",
    "label": "갈무리11 (픽셀)",
    "category": "pixel",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "galmuri14",
    "label": "갈무리14 (픽셀)",
    "category": "pixel",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "nanum-gothic-coding",
    "label": "나눔고딕코딩",
    "category": "pixel",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "neodgm",
    "label": "네오둥근모 (픽셀)",
    "category": "pixel",
    "weights": [
      400
    ],
    "license": "OFL-1.1"
  },
  {
    "id": "d2coding",
    "label": "D2Coding",
    "category": "pixel",
    "weights": [
      400,
      700
    ],
    "license": "OFL-1.1"
  }
]

export const SCREEN_FONT_IDS = SCREEN_FONTS.map((font) => font.id)

/** 레트로 UI 기본 글꼴 — 고딕으로 통일(명조 없음) */
export const DEFAULT_RETRO_FONT = 'score-dream'

const FALLBACK = "var(--font-score-dream), 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"

export function findScreenFont(id: string | null | undefined): ScreenFont | undefined {
  return id ? SCREEN_FONTS.find((font) => font.id === id) : undefined
}

/** CSS font-family 값 — 드문 글자는 기본 고딕이 받는다 */
export function screenFontFamily(id: string | null | undefined): string | undefined {
  const font = findScreenFont(id)
  if (!font) return undefined
  return font.cssVar ? `var(${font.cssVar}), ${FALLBACK}` : `'acs-ui-${font.id}', ${FALLBACK}`
}

/** 고른 글꼴 하나만 싣는 @font-face — 55종을 다 내려받지 않게 한다.
 *  굵기가 하나뿐이면 전 굵기 범위에 걸어 가짜 굵게(합성)가 생기지 않게 한다. */
export function screenFontFaceCss(id: string | null | undefined): string {
  const font = findScreenFont(id)
  if (!font || font.cssVar) return ''
  const single = font.weights.length === 1
  return font.weights
    .map((w) => {
      const range = single ? '100 900' : w < 600 ? '100 599' : '600 900'
      return `@font-face{font-family:'acs-ui-${font.id}';src:url('/fonts/ui/${font.id}/${w}.woff2') format('woff2');font-weight:${range};font-display:swap}`
    })
    .join('')
}
