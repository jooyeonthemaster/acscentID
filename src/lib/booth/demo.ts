// 영업용 포토부스 데모(/booth-demo) — 랜딩에서 고르는 프로그램 목록과, 데모로 연 부스 화면의 주소 규칙.
// 포토부스 프로그램 14종(src/lib/booth/programs/catalog.ts)도 같은 주소 규칙 /booth?mode=<프로그램 id>&demo=1 — 프로그램 전용 화면이 뜬다.
// 키오스크 데모(src/lib/kiosk/demo.ts)와 같은 방식: /booth?mode=…&demo=1 로 연다.
//   - 매장 기기 설정(운영 모드·이용권·화면 디자인)을 건드리지 않고 주소의 모드로 돈다. 화면 디자인은 매장과 같은 맥
//   - 이용권 없이, 촬영 기록(매장 통계)을 남기지 않는다. STORE ADMIN 은 열리지 않는다(설정이 매장 기기에 바로 적용되므로)
//   - AI 아이돌 사진·폰으로 받기는 데모 표(/api/photobooth/demo/ticket)로 — 1분 3장·하루 40장 상한(src/lib/booth/demo-server.ts)
//   - 화면에 DEMO 워터마크(BoothWatermark). 인화물·받는 사진에는 찍지 않는다

/** 데모로 연 화면임을 알리는 주소 칸 */
export const BOOTH_DEMO_PARAM = 'demo'

/** 매장 모드에서 바로 시작하는 프로그램(BoothClient 의 Mode) */
export type BoothDemoProgram = 'template' | 'together' | 'solo' | 'card'

import { PROGRAMS, findProgram } from './programs/catalog'
import { DEMO_CLEAN_KEY_PARAM, DEMO_CLEAN_VALUE } from '../demo-clean'
import { FUNGROUND_PROGRAMS, fungroundTargetHref, type FungroundTarget } from '../funground/demo'

export type BoothDemoNeed = 'camera' | 'ai' | 'phone' | 'print' | 'qr' | 'video' | 'mic' | 'two'

export interface BoothDemo {
  id: string
  /** 운영 모드 id(src/lib/booth/modes.ts) */
  mode: string
  /** AI 아이돌 컨셉 id(src/lib/booth/idol-concepts.ts) — 첫 화면에서 미리 고른다 */
  concept?: string
  /** 매장 모드 프로그램 — 첫 화면을 건너뛰고 바로 연다 */
  program?: BoothDemoProgram
  tag: string
  name: string
  desc: string
  needs: BoothDemoNeed[]
  group: 'idol' | 'photo' | 'video' | 'housing' | 'event' | 'funground'
  /** /booth?mode=… 가 아닌 화면(펀그라운드 전용 화면 · 노트북판)이나 주소 칸을 더 붙여 여는 카드 — 있으면 boothDemoHref 대신 */
  href?: (cleanKey?: string) => string
  /** 카드에 보이는 기능 표시(프로그램) — 없으면 needs 로 */
  badges?: string[]
  color: string
  /** 부스 화면 견본(1280×720 데모 화면을 960×540 으로) */
  screen: string
  /** 출구로 나오는 인화물 견본(4×6, AI 아이돌만) */
  print?: string
}

export const BOOTH_DEMO_NEEDS: Record<BoothDemoNeed, string> = {
  camera: '카메라', ai: 'AI 생성', phone: '휴대폰 연동', print: '4×6 인화', qr: 'QR 인식', video: '영상', mic: '마이크', two: '2인',
}

const shot = (name: string) => `/assets/booth-demo/${name}.webp`

export const BOOTH_DEMOS: BoothDemo[] = [
  { id: 'idol-ending-fairy', mode: 'kwave-2026', concept: 'ending-fairy', tag: 'ENDING FAIRY', name: '음방 엔딩요정', desc: '음악방송 무대가 끝난 순간의 엔딩 클로즈업. 헤드셋 마이크와 반짝이 메이크업, 컨페티까지.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#7a4fd0', screen: shot('idol-ending-fairy'), print: shot('print-ending-fairy') },
  { id: 'idol-album-jacket', mode: 'kwave-2026', concept: 'album-jacket', tag: 'ALBUM', name: '앨범 재킷', desc: '스튜디오에서 찍은 공식 컨셉 포토처럼, 채도 낮은 필름 색감의 화보 한 장.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#8a6a52', screen: shot('idol-album-jacket'), print: shot('print-album-jacket') },
  { id: 'idol-stage-fancam', mode: 'kwave-2026', concept: 'stage-fancam', tag: 'FANCAM', name: '무대 직캠', desc: '콘서트 무대에서 안무 중인 순간. 조명 빔과 대형 LED, 걸크러시 무대 의상.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#c0303f', screen: shot('idol-stage-fancam'), print: shot('print-stage-fancam') },
  { id: 'idol-mv-still', mode: 'kwave-2026', concept: 'mv-still', tag: 'MV', name: '뮤비 스틸', desc: '네온이 가득한 뮤직비디오의 한 장면처럼, 강한 컬러 조명과 액세서리.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#1f8a9a', screen: shot('idol-mv-still'), print: shot('print-mv-still') },
  // 포토부스 프로그램 14종 — 화면 견본은 실제 시작 화면 캡처(/assets/booth-demo/program-<id>.webp).
  // 행사 전용(event)과 특정 고객 전용(site — 펀그라운드)은 아래 「행사 · 고객 맞춤」 묶음에 따로 싣는다
  ...PROGRAMS.filter((p) => !p.event && !p.site).map((p): BoothDemo => ({
    id: `program-${p.id}`,
    mode: p.id,
    tag: p.card.tag,
    name: p.name,
    desc: p.card.desc,
    needs: p.kind === 'photo'
      ? ['camera', 'ai', ...(p.capture.people > 1 ? ['two' as const] : []), 'print']
      : p.kind === 'mv' ? ['camera', 'mic', 'video', 'qr'] : p.kind === 'reading' ? ['camera', 'print', 'qr'] : ['phone', 'video', 'qr'],
    badges: p.card.badges,
    // 주거복지대전 제안서(2026-10-26) 묶음: 입주 기념사진 · 2046 미래 도시 주민 · 과거로의 여행(TIME!)
    group: ['housing-movein', 'housing-2046', 'history'].includes(p.id) ? 'housing' : p.kind === 'photo' ? 'photo' : 'video',
    color: p.card.color,
    screen: shot(`program-${p.id}`),
  })),
  // ───── 행사 · 고객 맞춤(2026-11-18 사용자 지시: 지금까지 만든 데모를 모두 랜딩에) ─────
  // 행사 전용 프로그램 — ANSAN 과학축제 2×6 띠지, 연말 시상식 새해 이야기 셋(그 고객 랜딩 /booth-demo/nh 와 같은 주소 · 같은 견본).
  // 노트북으로 여는 일이 많아 연말 시상식 카드는 그 랜딩처럼 camera=webcam(DSLR 브리지를 찾지 않는다)
  eventDemo('ansan-2026', { screen: shot('program-ansan-2026'), desc: '안산사이언스밸리 과학축제(2026.11) AI 포토존. 1~4명이 한 컷을 찍으면 지금 · 10년 · 20년 · 30년 뒤의 우리를 2×6 사진 네 컷으로 뽑아요.' }),
  eventDemo('nh-face', { screen: shot('nh/face'), print: shot('nh/print-face'), webcam: true }),
  eventDemo('nh-saju', { screen: shot('nh/saju'), print: shot('nh/print-saju'), webcam: true }),
  eventDemo('nh-palm', { screen: shot('nh/palm'), print: shot('nh/print-palm'), webcam: true }),
  // 펀그라운드 별내 상설 체험기(32인치 가로 터치) — 견적 데모(/booth-demo/funground)의 A안 · B안 프로그램 중 부스 · 전용 화면으로 여는 것.
  // A안 COLOR! · NEXT! 는 키오스크 프로그램의 노트북 가로판이라 키오스크 랜딩의 같은 프로그램으로 갈음한다.
  // 견적에서 뺀 QUEST! · MVP! · THEME! · LATER!(B안) 도 화면이 남아 있어 함께 싣는다
  ...FUNGROUND_PROGRAMS.flatMap((p) => p.targets.filter((t) => t.kind !== 'pc').map((target): BoothDemo => ({
    id: `funground-${p.key}`,
    mode: target.kind === 'booth' ? target.id : `funground-${target.id}`,
    tag: p.tag,
    name: `${p.name} · ${p.plan === 'a' ? 'A안 AI 생성형' : 'B안 기기 안 처리'}`,
    desc: p.desc,
    needs: [],
    badges: p.badges,
    group: 'funground',
    color: p.color,
    screen: p.screen,
    href: (cleanKey) => fungroundTargetHref(target, cleanKey),
  }))),
  fungroundBooth('quest', 'program-quest'),
  fungroundBooth('mvp', 'program-mvp'),
  fungroundScreen('theme', { tag: 'THEME!', name: '테마 포토 · B안 기기 안 처리', desc: '아이돌 무대 · 경기장 · 마법 학교 · 우주 정거장 · 놀이공원 등 테마 6가지 — 1~4명이 찍으면 사람만 오려 고른 배경에 넣어 4×6 사진으로 줘요. 외부 AI로 보내지 않아요.', color: '#d9466f', badges: ['AI 인물 인식', '기기 안 처리', '4×6 인화'] }),
  fungroundScreen('later', { tag: 'LATER!', name: '타임캡슐 포토 · B안 기기 안 처리', desc: '10년 · 20년 뒤에 열어 볼 장면(우주 정거장 · 미래 도시 · 하늘 위 학교)과 한마디를 골라, 사진을 그 장면에 넣은 4×6 타임캡슐 사진으로 줘요. 얼굴은 바꾸지 않아요.', color: '#5b55d6', badges: ['AI 인물 인식', '기기 안 처리', '4×6 인화'] }),
]

/** 행사 전용 프로그램 카드(catalog 의 event) — 문구는 프로그램 카드에서 */
function eventDemo(id: string, o: { screen: string; print?: string; desc?: string; webcam?: boolean }): BoothDemo {
  const p = findProgram(id)!
  return {
    id: `event-${id}`, mode: id, tag: p.card.tag, name: p.name, desc: o.desc ?? p.card.desc, needs: [], badges: p.card.badges,
    group: 'event', color: p.card.color, screen: o.screen, print: o.print,
    href: o.webcam ? (cleanKey) => `${boothDemoHref({ mode: id }, cleanKey)}&camera=webcam` : undefined,
  }
}

/** 펀그라운드 전용 부스 프로그램(catalog 의 site) — /booth?mode=<id>&site=funground */
function fungroundBooth(id: string, screen: string): BoothDemo {
  const p = findProgram(id)!
  const target: FungroundTarget = { kind: 'booth', id }
  return {
    id: `funground-${id}`, mode: id, tag: p.card.tag, name: `${p.name} · A안 AI 생성형`, desc: p.card.desc, needs: [], badges: p.card.badges,
    group: 'funground', color: p.card.color, screen: shot(screen), href: (cleanKey) => fungroundTargetHref(target, cleanKey),
  }
}

/** 펀그라운드 전용 화면(/booth-demo/funground/<id>) */
function fungroundScreen(id: string, o: Pick<BoothDemo, 'tag' | 'name' | 'desc' | 'color'> & { badges: string[] }): BoothDemo {
  const target: FungroundTarget = { kind: 'screen', id }
  return { id: `funground-${id}`, mode: `funground-${id}`, ...o, needs: [], group: 'funground', screen: shot(`funground/${id}`), href: (cleanKey) => fungroundTargetHref(target, cleanKey) }
}

/** 카드가 여는 주소 */
export const boothDemoCardHref = (demo: BoothDemo, cleanKey?: string) => demo.href ? demo.href(cleanKey) : boothDemoHref(demo, cleanKey)

/** 데모로 여는 주소 */
/** 워터마크 없는 데모 — 서명 있는 랜딩 /booth-demo/clean?k=… 에서 연 주소는 demo=clean&k=…(서명이 맞아야 워터마크가 빠진다, src/lib/demo-clean.ts) */
export const BOOTH_DEMO_CLEAN = DEMO_CLEAN_VALUE

export function boothDemoHref(demo: Pick<BoothDemo, 'mode' | 'concept' | 'program'>, cleanKey?: string): string {
  const q = new URLSearchParams({ mode: demo.mode, [BOOTH_DEMO_PARAM]: cleanKey ? BOOTH_DEMO_CLEAN : '1' })
  if (cleanKey) q.set(DEMO_CLEAN_KEY_PARAM, cleanKey)
  if (demo.concept) q.set('concept', demo.concept)
  if (demo.program) q.set('program', demo.program)
  return `/booth?${q.toString()}`
}

export interface BoothDemoState {
  mode: string
  concept: string | null
  program: BoothDemoProgram | null
}

/** 지금 주소가 데모면 그 설정(브라우저에서만) — 데모가 아니면 null */
export function readBoothDemo(): BoothDemoState | null {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  if (!q.has(BOOTH_DEMO_PARAM)) return null
  const program = q.get('program')
  return {
    mode: q.get('mode') || 'kwave-2026',
    concept: q.get('concept'),
    program: program === 'template' || program === 'together' || program === 'solo' || program === 'card' ? program : null,
  }
}

/** 데모 표 받기(브라우저) — 못 받으면 null(AI 사진은 찍은 사진으로 대신, 폰으로 받기는 실패 안내) */
export async function requestDemoTicket(): Promise<string | null> {
  try {
    const res = await fetch('/api/photobooth/demo/ticket', { method: 'POST', cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { idolTicket?: unknown }
    return typeof data.idolTicket === 'string' ? data.idolTicket : null
  } catch {
    return null
  }
}
