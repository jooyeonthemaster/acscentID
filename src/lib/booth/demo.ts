// 영업용 포토부스 데모(/booth-demo) — 랜딩에서 고르는 프로그램 목록과, 데모로 연 부스 화면의 주소 규칙.
// 키오스크 데모(src/lib/kiosk/demo.ts)와 같은 방식: /booth?mode=…&demo=1 로 연다.
//   - 매장 기기 설정(운영 모드·이용권·화면 디자인)을 건드리지 않고 주소의 모드로 돈다. 화면 디자인은 매장과 같은 맥
//   - 이용권 없이, 촬영 기록(매장 통계)을 남기지 않는다. STORE ADMIN 은 열리지 않는다(설정이 매장 기기에 바로 적용되므로)
//   - AI 아이돌 사진·폰으로 받기는 데모 표(/api/photobooth/demo/ticket)로 — 1분 3장·하루 40장 상한(src/lib/booth/demo-server.ts)
//   - 화면에 NEANDER 워터마크(BoothWatermark). 인화물·받는 사진에는 찍지 않는다

/** 데모로 연 화면임을 알리는 주소 칸 */
export const BOOTH_DEMO_PARAM = 'demo'

/** 매장 모드에서 바로 시작하는 프로그램(BoothClient 의 Mode) */
export type BoothDemoProgram = 'template' | 'together' | 'solo' | 'card'

export type BoothDemoNeed = 'camera' | 'ai' | 'phone' | 'print' | 'qr'

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
  group: 'idol' | 'store'
  color: string
  /** 카드 그림(가로 16:10 부스 화면 견본 또는 인화물 견본) */
  image: string
  /** image 가 세로 인화물(2:3)이면 true — 랜딩이 다른 틀에 넣는다 */
  print?: boolean
}

export const BOOTH_DEMO_NEEDS: Record<BoothDemoNeed, string> = {
  camera: '카메라', ai: 'AI 생성', phone: '휴대폰 연동', print: '4×6 인화', qr: 'QR 인식',
}

const shot = (name: string) => `/assets/booth-demo/${name}.webp`

export const BOOTH_DEMOS: BoothDemo[] = [
  { id: 'idol-ending-fairy', mode: 'kwave-2026', concept: 'ending-fairy', tag: 'ENDING FAIRY', name: '음방 엔딩요정', desc: '음악방송 무대가 끝난 순간의 엔딩 클로즈업. 헤드셋 마이크와 반짝이 메이크업, 컨페티까지.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#7a4fd0', image: shot('print-ending-fairy'), print: true },
  { id: 'idol-album-jacket', mode: 'kwave-2026', concept: 'album-jacket', tag: 'ALBUM', name: '앨범 재킷', desc: '스튜디오에서 찍은 공식 컨셉 포토처럼, 채도 낮은 필름 색감의 화보 한 장.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#8a6a52', image: shot('print-album-jacket'), print: true },
  { id: 'idol-stage-fancam', mode: 'kwave-2026', concept: 'stage-fancam', tag: 'FANCAM', name: '무대 직캠', desc: '콘서트 무대에서 안무 중인 순간. 조명 빔과 대형 LED, 걸크러시 무대 의상.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#c0303f', image: shot('print-stage-fancam'), print: true },
  { id: 'idol-mv-still', mode: 'kwave-2026', concept: 'mv-still', tag: 'MV', name: '뮤비 스틸', desc: '네온이 가득한 뮤직비디오의 한 장면처럼, 강한 컬러 조명과 액세서리.', needs: ['camera', 'ai', 'print'], group: 'idol', color: '#1f8a9a', image: shot('print-mv-still'), print: true },
  { id: 'store-template', mode: 'wow', program: 'template', tag: 'WITH BIAS', name: '최애와 찍기', desc: '최애 사진 옆 빈자리에 서면 카메라 화면이 그대로 합성돼 같은 무대에 선 한 장이 됩니다.', needs: ['camera', 'print'], group: 'store', color: '#d0507a', image: shot('screen-template') },
  { id: 'store-together', mode: 'wow', program: 'together', tag: 'PHOTOCARD', name: '포카 · 직찍 합성', desc: '폰으로 QR을 찍어 포토카드나 직찍을 올리면 인물만 오려 내 옆에 세워 함께 찍습니다.', needs: ['camera', 'phone', 'print'], group: 'store', color: '#3b6fd8', image: shot('screen-together') },
  { id: 'store-solo', mode: 'wow', program: 'solo', tag: '1 CUT · 4 CUTS', name: '일반 촬영', desc: '한 컷 또는 네 컷(2×2)을 찍고 프레임을 골라 4×6으로 인화합니다.', needs: ['camera', 'print'], group: 'store', color: '#2f8a5a', image: shot('screen-solo') },
  { id: 'store-card', mode: 'wow', program: 'card', tag: 'CARD SCAN', name: '포토카드 QR', desc: '매장에서 판매하는 포토카드 뒷면 QR을 카메라에 비추면, 그 카드 속 인물과 함께 찍습니다.', needs: ['camera', 'qr', 'print'], group: 'store', color: '#b5762a', image: shot('screen-card') },
]

/** 데모로 여는 주소 */
export function boothDemoHref(demo: Pick<BoothDemo, 'mode' | 'concept' | 'program'>): string {
  const q = new URLSearchParams({ mode: demo.mode, [BOOTH_DEMO_PARAM]: '1' })
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
