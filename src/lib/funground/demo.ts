// 펀그라운드 별내(남양주 · 9~19세 청소년 공공시설) 상설 체험기 견적 데모 — /booth-demo/funground
// 견적 두 안(A안 26-217 AI 생성형 · B안 26-218 기기 안 처리형)의 프로그램을 고객이 직접 눌러 본다.
// 기존 데모(/booth-demo · /kiosk-demo)와 같은 규칙: 데모 워터마크 · 데모 생성 상한(src/lib/booth/demo-server.ts) · 서명 링크(demo=clean&k=…) ·
// 검색 노출 금지(middleware 로케일 라우팅 밖). 매장 · 행사 기기 설정과 다른 프로그램의 기본값은 건드리지 않는다 —
// 펀그라운드에만 쓰는 것은 주소의 site=funground(부스 프로그램 → Seedream 생성)와 이 폴더의 전용 화면으로 둔다. 설명: docs/funground-demo.md

import { DEMO_CLEAN_KEY_PARAM, DEMO_CLEAN_VALUE } from '../demo-clean'

/** 부스 프로그램 주소에 붙이는 펀그라운드 표시 — 생성 서버가 이 표시로 펀그라운드 모델 표(Seedream 먼저)를 쓴다 */
export const FUNGROUND_SITE_PARAM = 'site'
export const FUNGROUND_SITE = 'funground'

export type FungroundPlan = 'a' | 'b'
/** 1단계 = 12월 설치 때, 2단계 = 1월 업데이트 */
export type FungroundPhase = 1 | 2
/** 기존 프로그램 그대로 · 기존을 고쳐 씀 · 새로 제작 */
export type FungroundBuild = 'existing' | 'adapted' | 'new'

export interface FungroundTarget {
  /**
   * booth: 부스 프로그램(/booth?mode=…, 1280×720 가로) · pc: 키오스크 프로그램의 노트북 가로판(/kiosk/pc/<slug>, docs/kiosk-pc.md) ·
   * screen: 이 데모의 전용 화면(/booth-demo/funground/<screen>, 1920×1080 가로)
   */
  kind: 'booth' | 'pc' | 'screen'
  /** 부스 모드 id · 노트북판 slug · 전용 화면 경로 */
  id: string
  /** 전용 화면에 넘기는 주소 칸(예: 사주 engine=ai) */
  query?: Record<string, string>
  label?: string
}

export interface FungroundProgram {
  key: string
  plan: FungroundPlan
  /** 견적서의 번호 */
  no: number
  tag: string
  name: string
  desc: string
  phase: FungroundPhase
  build: FungroundBuild
  /** 카드 아래 작은 표시 */
  badges: string[]
  color: string
  /** 화면 견본(public/assets/booth-demo/funground/<key>.webp) */
  screen: string
  /** 여는 화면 — 둘이면 '둘 중 하나를 고르세요' */
  targets: FungroundTarget[]
  /** 카드에 덧붙이는 한 줄(고친 점 · 남은 일) */
  note?: string
}

export const PHASE_LABEL: Record<FungroundPhase, string> = { 1: '1단계 · 12월', 2: '2단계 · 1월' }
export const BUILD_LABEL: Record<FungroundBuild, string> = { existing: '기존 프로그램', adapted: '기존 · 고쳐 씀', new: '새로 제작' }
export const PLAN_INFO: Record<FungroundPlan, { title: string; quote: string; short: string; line: string }> = {
  a: { title: 'A안 · AI 생성형', quote: '견적 26-217', short: 'A안', line: '사진을 AI가 테마 속 모습으로 바꿔 줍니다. 사진은 처리하는 동안만 AI 서비스로 갑니다.' },
  b: { title: 'B안 · 기기 안 처리형', quote: '견적 26-218', short: 'B안', line: '외부 AI 서비스를 쓰지 않습니다. 사진은 기기 안에서 처리하고, QR로 받기를 누른 결과만 24시간 보관합니다.' },
}

const shot = (key: string) => `/assets/booth-demo/funground/${key}.webp`

export const FUNGROUND_PROGRAMS: FungroundProgram[] = [
  // 2026-11-14 사용자 지시: A안 · B안 모두 같은 네 프로그램(LATER! · COLOR! · NEXT! · FORTUNE!)만 — 나머지(IDOL! · ERA! · GRAD! · WITH! · QUEST! · MVP! · THEME! · MV!)는 이 데모에서 뺐다.
  // 모든 프로그램은 사진을 찍고, 마지막에 「인쇄하기」(노트북 · 폰: 인쇄 미리보기 + QR)로 결과물을 받는다.
  // ───────── A안 — AI 생성형(견적 26-217) ─────────
  {
    key: 'a-later', plan: 'a', no: 1, tag: 'LATER!', name: '타임캡슐 포토', desc: '오늘의 나를 찍으면 AI가 10년 · 20년 뒤의 나를 상상해 그려 4×6 사진으로 줘요. 재미로 보는 상상 사진이에요.', phase: 1, build: 'existing', badges: ['AI 생성', '4×6 인화'], color: '#5b55d6', screen: shot('a-later'),
    targets: [{ kind: 'booth', id: 'timecapsule' }],
  },
  {
    key: 'a-color', plan: 'a', no: 2, tag: 'COLOR!', name: 'AI 퍼스널 컬러', desc: '사진 한 장으로 AI가 8유형 중 어울리는 색을 찾아 주고, 옷 색을 바꿔 대어 봐요.', phase: 1, build: 'existing', badges: ['AI 분석', '결과 카드'], color: '#26307a', screen: shot('a-color'),
    // 설치 기기 화면이 가로라 키오스크 세로 화면 대신 같은 프로그램의 노트북 가로판(/kiosk/pc)을 연다
    targets: [{ kind: 'pc', id: 'color' }],
  },
  {
    key: 'a-next', plan: 'a', no: 3, tag: 'NEXT!', name: 'AI 미래 직업 탐색', desc: '질문 여덟 개와 사진 한 장을 AI가 함께 보고 탐색해 볼 직업과 가이드를 만들어 줘요.', phase: 1, build: 'existing', badges: ['AI 분석', '결과 카드'], color: '#315ca8', screen: shot('a-next'),
    targets: [{ kind: 'pc', id: 'career' }],
  },
  {
    key: 'a-fortune', plan: 'a', no: 4, tag: 'FORTUNE!', name: 'AI 포춘', desc: '사진 한 장과 생년월일로 사주를 계산하고, AI가 공부 · 친구 · 진로 · 꿈 이야기로 풀어 내 사진이 든 카드로 줘요. 재미로 보는 풀이예요.', phase: 1, build: 'adapted', badges: ['AI 생성', '4×6 인화', '재미로 보는 풀이'], color: '#1f5a45', screen: shot('a-fortune'),
    targets: [{ kind: 'screen', id: 'saju', query: { engine: 'ai' } }],
    note: '사주(SAJU!)에서 향 처방을 빼고 공부 · 친구 · 진로 · 꿈 이야기로',
  },
  // ───── 2026-11-14 새 프로그램(사용자 지시: FUTURE NEWS! · DREAM! 을 데모에 더해 비교) — LATER! 보다 1회 비용이 낮다 ─────
  {
    key: 'a-news', plan: 'a', no: 5, tag: 'FUTURE NEWS!', name: '2046 별내 신문', desc: '사진 한 장과 질문 세 개로, AI 기자가 2046년 신문 1면에 나의 미래 이야기를 써 줘요. 얼굴은 진짜 나 그대로예요.', phase: 2, build: 'new', badges: ['AI 생성(글)', '4×6 인화', '재미로 보는 상상'], color: '#2b2f3a', screen: shot('a-news'),
    targets: [{ kind: 'screen', id: 'news', query: { engine: 'ai' } }],
    note: '사진은 기기 안에서 오려 신문에 · AI는 기사 글만(약 $0.002)',
  },
  {
    key: 'a-dream', plan: 'a', no: 6, tag: 'DREAM!', name: '꿈의 직업 포토', desc: '천문학자 · 셰프 · 수의사 · 과학자 · 소방관 · 게임 개발자 — 얼굴은 그대로, 꿈의 직업 옷과 일터로 바꿔 4×6 사진으로 줘요.', phase: 2, build: 'new', badges: ['AI 생성', '1~4명', '4×6 인화'], color: '#1f8fd0', screen: shot('a-dream'),
    targets: [{ kind: 'booth', id: 'dream' }],
    note: 'Seedream — 옷 · 배경만 바꿔 얼굴이 잘 남는다(1장 $0.018)',
  },
  // ───────── B안 — 기기 안 처리형(견적 26-218 · 외부 AI API 0) ─────────
  {
    key: 'b-later', plan: 'b', no: 1, tag: 'LATER!', name: '타임캡슐 포토', desc: '오늘의 나를 찍어 미래 배경에 합성하고, 미래의 나에게 한마디와 열어 볼 날을 적은 4×6 사진으로 줘요. 얼굴은 바꾸지 않아요.', phase: 2, build: 'new', badges: ['AI 인물 인식', '1~4명', '4×6 인화'], color: '#5b55d6', screen: shot('b-later'),
    targets: [{ kind: 'screen', id: 'later' }],
    note: 'AI로 나이를 바꾸는 대신 기기 안 사람 분리 합성 · 미래의 나에게 한마디',
  },
  {
    key: 'b-color', plan: 'b', no: 2, tag: 'COLOR!', name: '퍼스널 컬러', desc: '기기 안에서 피부 · 머리카락 색을 재어 8유형 중 어울리는 색을 알려 줘요. 판정은 기기 안에서 해요.', phase: 2, build: 'adapted', badges: ['AI 인식 기반', '기기 안 판정', '4×6 인화'], color: '#26307a', screen: shot('b-color'),
    targets: [{ kind: 'screen', id: 'color' }],
    note: '판정을 기기 안 숫자 규칙으로 · 결과 문장은 미리 써 둠',
  },
  {
    key: 'b-next', plan: 'b', no: 3, tag: 'NEXT!', name: '미래 직업 탐색', desc: '사진 한 장을 찍고 질문 여덟 개로 관심 축을 찾아, 탐색해 볼 직업 세 가지를 내 사진이 든 카드로 보여 줘요.', phase: 1, build: 'adapted', badges: ['체험 프로그램', '질문 8개', '4×6 인화'], color: '#315ca8', screen: shot('b-next'),
    targets: [{ kind: 'screen', id: 'career' }],
    note: '관상 분석 대신 결과 카드용 사진 · AI 풀이 대신 미리 쓴 축 조합 풀이',
  },
  {
    key: 'b-fortune', plan: 'b', no: 4, tag: 'FORTUNE!', name: '포춘', desc: '사진 한 장과 생년월일로 만세력을 계산하고, 미리 써 둔 풀이 문장에서 골라 내 사진이 든 카드로 보여 줘요. 재미로 보는 풀이예요.', phase: 1, build: 'adapted', badges: ['체험 프로그램', '기기 안 계산', '4×6 인화'], color: '#1f5a45', screen: shot('b-fortune'),
    targets: [{ kind: 'screen', id: 'saju', query: { engine: 'local' } }],
    note: '만세력 그대로 · 풀이는 미리 쓴 문장에서',
  },
  {
    key: 'b-news', plan: 'b', no: 5, tag: 'FUTURE NEWS!', name: '2046 별내 신문', desc: '사진 한 장과 질문 세 개로, 2046년 신문 1면에 나의 미래 이야기가 실려요. 기사는 미리 써 둔 틀에서 골라요.', phase: 2, build: 'new', badges: ['AI 인물 인식', '4×6 인화', '재미로 보는 상상'], color: '#2b2f3a', screen: shot('b-news'),
    targets: [{ kind: 'screen', id: 'news', query: { engine: 'local' } }],
    note: '사진은 기기 안에서 오려 신문에 · 기사는 미리 쓴 틀',
  },
]

export const fungroundPlanPrograms = (plan: FungroundPlan) => FUNGROUND_PROGRAMS.filter((p) => p.plan === plan)

/** 데모 주소 칸 — 서명(cleanKey)이 있으면 워터마크 없는 판(demo=clean&k=…) */
export function fungroundDemoQuery(cleanKey?: string): URLSearchParams {
  const q = new URLSearchParams({ demo: cleanKey ? DEMO_CLEAN_VALUE : '1' })
  if (cleanKey) q.set(DEMO_CLEAN_KEY_PARAM, cleanKey)
  return q
}

/** 프로그램 한 화면의 주소 */
export function fungroundTargetHref(target: FungroundTarget, cleanKey?: string): string {
  const q = fungroundDemoQuery(cleanKey)
  if (target.kind === 'screen') {
    for (const [k, v] of Object.entries(target.query ?? {})) q.set(k, v)
    return `/booth-demo/funground/${target.id}?${q.toString()}`
  }
  if (target.kind === 'pc') return `/kiosk/pc/${target.id}?${q.toString()}`
  const base = new URLSearchParams({ mode: target.id })
  for (const [k, v] of q) base.set(k, v)
  base.set(FUNGROUND_SITE_PARAM, FUNGROUND_SITE)
  return `/booth?${base.toString()}`
}

/** 시작 화면(프로그램 고르기 — 설치 기기의 첫 화면) */
export function fungroundStartHref(plan: FungroundPlan, cleanKey?: string): string {
  const q = fungroundDemoQuery(cleanKey)
  q.set('plan', plan)
  return `/booth-demo/funground/start?${q.toString()}`
}

/** 지금 주소가 펀그라운드 부스 프로그램인지(브라우저) */
export function isFungroundSite(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(FUNGROUND_SITE_PARAM) === FUNGROUND_SITE
}

/**
 * 펀그라운드 데모는 노트북 웹캠 · 마이크로 확인한다 — DSLR 브리지(127.0.0.1:9120)를 먼저 찾지 않는다(운영 https 화면에서 로컬 주소를 부르면
 * 크롬이 「이 기기의 다른 앱에 접근」 권한을 묻고, 없는 브리지를 기다리느라 카메라가 늦게 켜진다). 설치 기기는 주소에 camera=dslr 를 붙인다.
 */
export function fungroundWebcamOnly(): boolean {
  if (typeof window === 'undefined') return false
  return isFungroundSite() && new URLSearchParams(window.location.search).get('camera') !== 'dslr'
}
