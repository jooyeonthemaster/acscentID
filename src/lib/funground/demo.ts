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
  b: { title: 'B안 · 기기 안 처리형', quote: '견적 26-218', short: 'B안', line: '외부 AI 서비스를 쓰지 않습니다. 사진이 기기 밖으로 나가지 않습니다.' },
}

const shot = (key: string) => `/assets/booth-demo/funground/${key}.webp`

export const FUNGROUND_PROGRAMS: FungroundProgram[] = [
  // ───────── A안 — AI 생성형(견적 26-217): AI 포토 6종 + AI 진단 1종(둘 중 고름) + AI 포춘 ─────────
  { key: 'a-idol', plan: 'a', no: 1, tag: 'IDOL!', name: '아이돌 메이크업', desc: '엔딩요정 · 앨범 재킷 · 직캠 · 뮤비 — 얼굴은 그대로, 무대 메이크업과 의상으로 4×6 인화.', phase: 1, build: 'existing', badges: ['AI 생성', '4×6 인화'], color: '#d63fa8', screen: shot('a-idol'), targets: [{ kind: 'booth', id: 'idol-makeup' }] },
  { key: 'a-era', plan: 'a', no: 2, tag: 'ERA!', name: '패션 타임머신', desc: '1970 · 1990 · 2000년대 — 같은 얼굴로 그 시절 옷과 배경을 입어 봐요.', phase: 1, build: 'existing', badges: ['AI 생성', '4×6 인화'], color: '#1e4fbf', screen: shot('a-era'), targets: [{ kind: 'booth', id: 'fashion-time' }] },
  { key: 'a-grad', plan: 'a', no: 3, tag: 'GRAD!', name: '졸업 포토부스', desc: '가운 색 · 학사모 · 배경을 골라 졸업 앨범 같은 한 장을 만들어요.', phase: 1, build: 'existing', badges: ['AI 생성', '4×6 인화'], color: '#1f5a3d', screen: shot('a-grad'), targets: [{ kind: 'booth', id: 'graduation' }] },
  { key: 'a-card', plan: 'a', no: 4, tag: 'WITH!', name: '팬 포토카드 메이커', desc: '내 사진을 포토카드 화보처럼 다듬고 프레임 · 스티커 · 문구로 꾸며요.', phase: 1, build: 'existing', badges: ['AI 보정', '4×6 인화'], color: '#3f5bd8', screen: shot('a-card'), targets: [{ kind: 'booth', id: 'fan-card' }] },
  { key: 'a-quest', plan: 'a', no: 5, tag: 'QUEST!', name: '판타지 모험', desc: '마법 학교 · 용의 계곡 · 숲 속 모험 — 얼굴은 그대로, 모험가 옷과 배경만 바꿔요. 망토 색도 골라요.', phase: 2, build: 'new', badges: ['AI 생성', '4×6 인화'], color: '#5b3fc4', screen: shot('a-quest'), targets: [{ kind: 'booth', id: 'quest' }] },
  { key: 'a-mvp', plan: 'a', no: 6, tag: 'MVP!', name: '스포츠 스타', desc: '축구 · 농구 · 야구 경기장의 우승 장면. 유니폼에 글자 · 번호 · 로고는 넣지 않아요.', phase: 2, build: 'new', badges: ['AI 생성', '4×6 인화'], color: '#d9681f', screen: shot('a-mvp'), targets: [{ kind: 'booth', id: 'mvp' }] },
  {
    key: 'a-diagnosis', plan: 'a', no: 7, tag: 'COLOR! · NEXT!', name: 'AI 진단', desc: '퍼스널 컬러(사진 한 장으로 어울리는 색) 또는 미래 직업 탐색(질문 여덟 개) — 둘 중 하나를 고르세요.', phase: 1, build: 'existing', badges: ['AI 분석', '결과 QR'], color: '#26307a', screen: shot('a-diagnosis'),
    // 설치 기기 화면이 가로라(2026-11-14) 키오스크 세로 화면 대신 같은 프로그램의 가로판(/kiosk/pc)을 연다 — 결과는 휴대폰 QR
    targets: [{ kind: 'pc', id: 'color', label: '퍼스널 컬러' }, { kind: 'pc', id: 'career', label: '미래 직업 탐색' }],
    note: '둘 중 하나를 고르세요',
  },
  {
    key: 'a-fortune', plan: 'a', no: 8, tag: 'FORTUNE!', name: 'AI 포춘', desc: '생년월일로 사주를 계산하고, AI가 공부 · 친구 · 진로 · 꿈 이야기로 풀어 줘요. 재미로 보는 풀이예요.', phase: 1, build: 'adapted', badges: ['AI 생성', '재미로 보는 풀이'], color: '#1f5a45', screen: shot('a-fortune'),
    targets: [{ kind: 'screen', id: 'saju', query: { engine: 'ai' } }],
    note: '사주(SAJU!)에서 향 처방을 빼고 공부 · 친구 · 진로 · 꿈 이야기로',
  },
  // ───────── B안 — 기기 안 처리형(견적 26-218 · 외부 AI API 0) ─────────
  {
    key: 'b-theme', plan: 'b', no: 1, tag: 'THEME!', name: '테마 포토', desc: '기기 안에서 사람만 오려 아이돌 무대 · 경기장 · 마법 학교 · 우주 정거장 · 놀이공원 · 펀그라운드 배경에 합성해요. 옷과 얼굴은 그대로, 1~4명.', phase: 2, build: 'new', badges: ['AI 인물 인식', '1~4명', '4×6 인화'], color: '#e0466f', screen: shot('b-theme'),
    targets: [{ kind: 'screen', id: 'theme' }],
  },
  {
    key: 'b-color', plan: 'b', no: 2, tag: 'COLOR!', name: '퍼스널 컬러', desc: '기기 안에서 피부 · 머리카락 색을 재어 8유형 중 어울리는 색을 알려 줘요. 사진은 기기 밖으로 나가지 않아요.', phase: 2, build: 'adapted', badges: ['AI 인식 기반', '기기 안 판정'], color: '#26307a', screen: shot('b-color'),
    targets: [{ kind: 'screen', id: 'color' }],
    note: '판정을 기기 안 숫자 규칙으로 · 결과 문장은 미리 써 둠',
  },
  {
    key: 'b-saju', plan: 'b', no: 3, tag: 'SAJU!', name: '사주', desc: '생년월일로 만세력을 계산하고, 미리 써 둔 풀이 문장에서 골라 보여 줘요. 재미로 보는 풀이예요.', phase: 1, build: 'adapted', badges: ['체험 프로그램', '기기 안 계산'], color: '#1f5a45', screen: shot('b-saju'),
    targets: [{ kind: 'screen', id: 'saju', query: { engine: 'local' } }],
    note: '만세력 그대로 · 풀이는 미리 쓴 문장에서',
  },
  {
    key: 'b-career', plan: 'b', no: 4, tag: 'NEXT!', name: '미래 직업 탐색', desc: '질문 여덟 개로 관심 축을 찾아 탐색해 볼 직업 세 가지를 보여 줘요. 사진은 찍지 않아요.', phase: 1, build: 'adapted', badges: ['체험 프로그램', '질문 8개'], color: '#315ca8', screen: shot('b-career'),
    targets: [{ kind: 'screen', id: 'career' }],
    note: '관상 사진을 빼고 · AI 풀이 대신 미리 쓴 축 조합 풀이',
  },
  {
    key: 'b-mv', plan: 'b', no: 5, tag: 'MV!', name: '뮤직비디오 메이커', desc: '15초 동안 춤추고 노래하면 음악 · 네온 · 필름 효과를 입힌 영상이 돼요. 기기 안에서 편집해요.', phase: 1, build: 'existing', badges: ['체험 프로그램', '영상 15초'], color: '#6a3fe0', screen: shot('b-mv'),
    targets: [{ kind: 'booth', id: 'music-video' }],
    note: 'QR 받기는 설치 때 연결',
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
