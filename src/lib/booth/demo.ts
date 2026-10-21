// 영업용 포토부스 데모(/booth-demo) — 랜딩에서 고르는 프로그램 목록과, 데모로 연 부스 화면의 주소 규칙.
// 포토부스 프로그램 14종(src/lib/booth/programs/catalog.ts)도 같은 주소 규칙 /booth?mode=<프로그램 id>&demo=1 — 프로그램 전용 화면이 뜬다.
// 키오스크 데모(src/lib/kiosk/demo.ts)와 같은 방식: /booth?mode=…&demo=1 로 연다.
//   - 매장 기기 설정(운영 모드·이용권·화면 디자인)을 건드리지 않고 주소의 모드로 돈다. 화면 디자인은 매장과 같은 맥
//   - 이용권 없이, 촬영 기록(매장 통계)을 남기지 않는다. STORE ADMIN 은 열리지 않는다(설정이 매장 기기에 바로 적용되므로)
//   - AI 아이돌 사진·폰으로 받기는 데모 표(/api/photobooth/demo/ticket)로 — 1분 3장·하루 40장 상한(src/lib/booth/demo-server.ts)
//   - 화면에 NEANDER 워터마크(BoothWatermark). 인화물·받는 사진에는 찍지 않는다

/** 데모로 연 화면임을 알리는 주소 칸 */
export const BOOTH_DEMO_PARAM = 'demo'

/** 매장 모드에서 바로 시작하는 프로그램(BoothClient 의 Mode) */
export type BoothDemoProgram = 'template' | 'together' | 'solo' | 'card'

import { PROGRAMS } from './programs/catalog'

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
  group: 'idol' | 'photo' | 'video' | 'housing'
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
  // 포토부스 프로그램 14종 — 화면 견본은 실제 시작 화면 캡처(/assets/booth-demo/program-<id>.webp)
  ...PROGRAMS.map((p): BoothDemo => ({
    id: `program-${p.id}`,
    mode: p.id,
    tag: p.card.tag,
    name: p.name,
    desc: p.card.desc,
    needs: p.kind === 'photo'
      ? ['camera', 'ai', ...(p.capture.people > 1 ? ['two' as const] : []), 'print']
      : p.kind === 'mv' ? ['camera', 'mic', 'video', 'qr'] : ['phone', 'video', 'qr'],
    badges: p.card.badges,
    group: p.id.startsWith('housing-') ? 'housing' : p.kind === 'photo' ? 'photo' : 'video',
    color: p.card.color,
    screen: shot(`program-${p.id}`),
  })),
]

/** 데모로 여는 주소 */
/** 워터마크 없는 데모 — 랜딩 /booth-demo/clean 에서 연 주소는 demo=clean */
export const BOOTH_DEMO_CLEAN = 'clean'
export const boothDemoClean = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get(BOOTH_DEMO_PARAM) === BOOTH_DEMO_CLEAN

export function boothDemoHref(demo: Pick<BoothDemo, 'mode' | 'concept' | 'program'>, clean = false): string {
  const q = new URLSearchParams({ mode: demo.mode, [BOOTH_DEMO_PARAM]: clean ? BOOTH_DEMO_CLEAN : '1' })
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
