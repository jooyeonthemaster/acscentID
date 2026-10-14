// 영업용 데모(/kiosk-demo) — 랜딩페이지에서 고르는 프로그램 목록과, 데모로 연 화면을 가리는 표시.
// 데모는 운영 모드 미리보기 주소(/kiosk?mode=…)에 demo=1 을 붙여 연다: 기기 설정을 건드리지 않고, 화면에 NEANDER 워터마크가 깔린다(KioskWatermark).
// 설명: docs/kiosk-modes.md '영업용 데모'

/** 데모로 연 화면임을 알리는 주소 칸 */
export const KIOSK_DEMO_PARAM = 'demo'

import { EXPANSION_IDS, EXPANSION_META } from './expansion/types'

export type KioskDemoNeed = 'camera' | 'mic' | 'ai' | 'touch' | 'display'

export interface KioskDemo {
  /** 운영 모드 id(src/lib/kiosk/modes.ts) */
  mode: string
  /** 첫 화면의 큰 글자 */
  tag: string
  name: string
  desc: string
  needs: KioskDemoNeed[]
  group: 'reading' | 'studio' | 'preferences' | 'social' | 'interactive'
  /** 그 프로그램 화면의 대표색 — 랜딩의 작은 표시에 쓴다 */
  color: string
}

export const KIOSK_DEMO_NEEDS: Record<KioskDemoNeed, string> = { camera: '카메라', mic: '마이크', ai: 'AI 생성', touch: '터치', display: '전시 화면 연동' }

export const KIOSK_DEMOS: KioskDemo[] = [
  { mode: 'kwave-2026', tag: 'SAJU!', name: '사주 향 처방', desc: '생년월일시로 사주 오행을 읽고, 부족한 기운을 채우는 향을 처방전 영수증으로 뽑아 줍니다.', needs: ['touch', 'ai'], group: 'reading', color: '#1f5a45' },
  { mode: 'ai-color', tag: 'COLOR!', name: 'AI 퍼스널 컬러', desc: '사진 한 장으로 퍼스널 컬러 8유형을 진단하고, 어울리는 색을 얼굴 옆에 대어 봅니다.', needs: ['camera', 'ai'], group: 'reading', color: '#26307a' },
  { mode: 'ai-tarot', tag: 'TAROT!', name: 'AI 타로', desc: '직접 고른 카드 세 장으로 과거 · 현재 · 미래를 읽어 줍니다.', needs: ['touch', 'ai'], group: 'reading', color: '#59436e' },
  { mode: 'studio-nail', tag: 'NAIL!', name: '네일 디자이너', desc: '손을 비추면 손톱을 찾아 색과 패턴을 입혀 봅니다.', needs: ['camera'], group: 'studio', color: '#7a2946' },
  { mode: 'studio-card', tag: 'CARD!', name: '명함 디자이너', desc: '이름과 원하는 느낌을 고르면 AI가 나만의 명함을 디자인합니다.', needs: ['touch', 'ai'], group: 'studio', color: '#2148c8' },
  { mode: 'studio-skin', tag: 'SKIN!', name: '스킨케어', desc: '피부 상태를 체크하고 아침 · 저녁 루틴을 직접 고쳐 만듭니다.', needs: ['touch'], group: 'studio', color: '#426b58' },
  { mode: 'studio-draw', tag: 'DRAW!', name: '캐리커처', desc: '사진을 선화 · 수채화 · 코믹 세 가지 화풍의 그림으로 바꿉니다. 여럿이 함께 찍어도 됩니다.', needs: ['camera', 'ai'], group: 'studio', color: '#b34734' },
  { mode: 'studio-voice', tag: 'VOICE!', name: '보이스 체험', desc: '목소리를 녹음해 다람쥐 · 거인 · 외계인 같은 여덟 가지 필터로 들어 봅니다.', needs: ['mic'], group: 'studio', color: '#187b8d' },
  { mode: 'studio-career', tag: 'NEXT!', name: '미래 직업 탐색', desc: '관심사 · MBTI · 재미로 보는 관상으로 어울리는 직업을 찾아 줍니다.', needs: ['touch', 'camera'], group: 'studio', color: '#315ca8' },
  { mode: 'studio-makeup', tag: 'MAKEUP!', name: '버추얼 메이크업', desc: '내 얼굴에 립 · 아이 · 블러셔 · 헤어 색을 올려 보고 머리 모양도 바꿔 봅니다.', needs: ['camera', 'ai'], group: 'studio', color: '#754f70' },
  ...EXPANSION_IDS.map((id): KioskDemo => ({ mode:`studio-${id}`, tag:EXPANSION_META[id].tag, name:EXPANSION_META[id].name, desc:EXPANSION_META[id].note, color:EXPANSION_META[id].color,
    // 18종 모두 사진 한 장으로 시작한다(사진 없이도 되는 체험도 카메라가 있어야 제대로 보인다)
    needs: ['product','heritage','vision-wall'].includes(id) ? ['camera','touch','display'] : ['camera','touch'],
    group:['science','product','heritage','vision-wall'].includes(id) ? 'interactive' : ['team','couple','lookalike','palm','face'].includes(id) ? 'social' : 'preferences',
  })),
]

/** 데모로 여는 주소 — 미리보기 주소에 데모 표시를 붙인다 */
export const kioskDemoHref = (mode: string) => `/kiosk?mode=${encodeURIComponent(mode)}&${KIOSK_DEMO_PARAM}=1`
