// 영업용 데모(/kiosk-demo) — 랜딩페이지에서 고르는 프로그램 목록과, 데모로 연 화면을 가리는 표시.
// 데모는 운영 모드 미리보기 주소(/kiosk?mode=…)에 demo=1 을 붙여 연다: 기기 설정을 건드리지 않고, 화면에 NEANDER 워터마크가 깔린다(KioskWatermark).
// 설명: docs/kiosk-modes.md '영업용 데모'

/** 데모로 연 화면임을 알리는 주소 칸 */
export const KIOSK_DEMO_PARAM = 'demo'
/** 워터마크 없는 데모 — 서명 있는 랜딩 /kiosk-demo/clean?k=… 에서 연 주소는 demo=clean&k=… (2026-10-22 사용자 지시: 없앤 버전은 링크가 다르게,
 *  2026-11-11: 주소만 바꿔 워터마크를 빼지 못하게 관리자 비밀번호로 만든 기간 있는 서명이 있어야 빠진다 — src/lib/demo-clean.ts) */
export const DEMO_CLEAN = DEMO_CLEAN_VALUE

import { usesImage } from './expansion/image-prompts'
import { DEMO_CLEAN_KEY_PARAM, DEMO_CLEAN_VALUE } from '../demo-clean'
import { NO_PHOTO_IDS } from './expansion/housing'
import { EXPANSION_IDS, EXPANSION_META } from './expansion/types'
import { videoSoon, videoSoonDesc } from '../demo-video-soon'

export type KioskDemoNeed = 'camera' | 'mic' | 'ai' | 'analysis' | 'touch' | 'display'

export interface KioskDemo {
  /** 카드 이름 — 같은 모드를 다른 화면(lab)으로 여는 카드가 있어 따로 둔다. 없으면 mode */
  id?: string
  /** 운영 모드 id(src/lib/kiosk/modes.ts) */
  mode: string
  /** 같은 모드의 다른 화면(주소 &lab=…) — SIP! 영상판 */
  lab?: string
  /** 카드 견본 — 없으면 /assets/kiosk-demo/screen-<mode>.webp */
  screen?: string
  /** 첫 화면의 큰 글자 */
  tag: string
  name: string
  desc: string
  needs: KioskDemoNeed[]
  group: 'reading' | 'studio' | 'preferences' | 'social' | 'interactive' | 'housing'
  /** 그 프로그램 화면의 대표색 — 랜딩의 작은 표시에 쓴다 */
  color: string
  /** 같은 프로그램의 다른 판(영상판 · 스핀오프) — 기본판 카드 이름(id ?? mode). 랜딩에서 기본판 바로 옆에 나란히 놓는다 */
  variantOf?: string
  /** 영상판 준비 중 카드 — 누를 수 없고 「준비 중」 뱃지(src/lib/demo-video-soon.ts) */
  soon?: boolean
}

export const KIOSK_DEMO_NEEDS: Record<KioskDemoNeed, string> = { camera: '카메라', mic: '마이크', ai: 'AI 생성', analysis: 'AI 분석', touch: '터치', display: '전시 화면 연동' }

const KIOSK_BASE: KioskDemo[] = [
  { mode: 'kwave-2026', tag: 'SAJU!', name: '사주 향 처방', desc: '생년월일시로 사주 오행을 읽고, 부족한 기운을 채우는 향을 처방전 영수증으로 뽑아 줍니다.', needs: ['touch', 'ai'], group: 'reading', color: '#1f5a45' },
  { mode: 'ai-color', tag: 'COLOR!', name: 'AI 퍼스널 컬러', desc: '사진 한 장으로 퍼스널 컬러 8유형을 진단하고, 어울리는 색을 얼굴 옆에 대어 봅니다.', needs: ['camera', 'ai'], group: 'reading', color: '#26307a' },
  { mode: 'ai-tarot', tag: 'TAROT!', name: 'AI 타로', desc: '직접 고른 카드 세 장으로 과거 · 현재 · 미래를 읽어 줍니다.', needs: ['touch', 'ai'], group: 'reading', color: '#59436e' },
  { mode: 'studio-nail', tag: 'NAIL!', name: '네일 디자이너', desc: '손을 비추면 손톱을 찾아 색과 패턴을 입혀 봅니다.', needs: ['camera'], group: 'studio', color: '#7a2946' },
  { mode: 'studio-card', tag: 'CARD!', name: '명함 디자이너', desc: '이름과 원하는 느낌을 고르면 AI가 나만의 명함을 디자인합니다.', needs: ['touch', 'ai'], group: 'studio', color: '#2148c8' },
  { mode: 'studio-skin', tag: 'SKIN!', name: '스킨케어', desc: '피부 상태를 체크하고 아침 · 저녁 루틴을 직접 고쳐 만듭니다.', needs: ['touch'], group: 'studio', color: '#426b58' },
  { mode: 'studio-draw', tag: 'DRAW!', name: '캐리커처', desc: '사진을 선화 · 수채화 · 코믹 세 가지 화풍의 그림으로 바꿉니다. 여럿이 함께 찍어도 됩니다.', needs: ['camera', 'ai'], group: 'studio', color: '#b34734' },
  { mode: 'studio-voice', tag: 'VOICE!', name: '보이스 체험', desc: '목소리를 녹음해 다람쥐 · 거인 · 외계인 같은 여덟 가지 필터로 들어 봅니다.', needs: ['mic'], group: 'studio', color: '#187b8d' },
  { mode: 'studio-career', tag: 'NEXT!', name: '미래 직업 탐색', desc: '질문 여덟 개와 관상 사진을 AI가 함께 보고 탐색해 볼 직업과 가이드를 인쇄해 줍니다.', needs: ['touch', 'camera', 'analysis'], group: 'housing', color: '#315ca8' },
  { mode: 'studio-makeup', tag: 'MAKEUP!', name: '버추얼 메이크업', desc: '내 얼굴에 립 · 아이 · 블러셔 · 헤어 색을 올려 보고 머리 모양도 바꿔 봅니다.', needs: ['camera', 'ai'], group: 'studio', color: '#754f70' },
  // 연말 시상식 소믈리에(sommelier-nh)는 기본 카드를 싣지 않고 영상판(해나)만 아래에 — SIP! 소믈리에 옆에 붙는다
  ...EXPANSION_IDS.filter((id) => id !== 'sommelier-nh').map((id): KioskDemo => ({ mode:`studio-${id}`, tag:EXPANSION_META[id].tag, name:EXPANSION_META[id].name, desc:EXPANSION_META[id].note, color:EXPANSION_META[id].color,
    // 체험 18종은 사진 한 장으로 시작하고 AI 가 분석한다. 6종(+ 2036 우리 집의 나)은 사진으로 새 그림까지 만든다(AI 생성)
    // 주거복지 내비게이터·성향 테스트는 사진 없이 질문만(NO_PHOTO_IDS)
    needs: (NO_PHOTO_IDS as readonly string[]).includes(id) ? ['touch', 'analysis'] : ['camera', usesImage(id) ? 'ai' : 'analysis', ...(['product','heritage','vision-wall'].includes(id) ? ['display' as const] : [])],
    // 주거복지대전 제안서(2026-10-26) 묶음: 향 처방 · 제품 인터랙티브(TOUCH!) · 비전 월(VISION!) + 직업 탐색(NEXT!, 위)
    group: ['housing-scent', 'product', 'vision-wall'].includes(id) ? 'housing' : id.startsWith('housing-') ? 'preferences' : ['science','heritage'].includes(id) ? 'interactive' : ['team','couple','lookalike','palm','face'].includes(id) ? 'social' : 'preferences',
  })),
  // ───── 행사에서 쓴 프로그램(2026-11-18 사용자 지시: 지금까지 만든 데모를 모두 랜딩에) ─────
  // 2026-11-25 사용자 지시로 「행사 · 팝업 맞춤」 묶음을 없애고 향 · 와인이라 「취향을 발견하는 시간」에 — SCENT! · 하린 루트 · SIP! 차례
  // 매장 기본(wow · 최애 이미지 분석)은 넣지 않는다 — 매장 카운터 발권 흐름이라 데모 손님이 매장 주문표를 만들 수 있다
  { mode: 'ai-perfumer', tag: 'SCENT!', name: 'AI 조향사', desc: '사진 한 장으로 나에게 어울리는 향 계열을 찾고, 그 자리에서 직접 조향할 레시피(퍼퓸 10ml)를 영수증으로 뽑아 줍니다.', needs: ['camera', 'analysis'], group: 'preferences', color: '#244eea' },
  // ───── 영상판(2026-11-25 사용자 지시: 따로 있던 「키오스크 영상판」 탭을 없애고 기본판 옆에 나란히) ─────
  // 같은 촬영 · AI · 결과를 길잡이 인물 영상 위에서(&lab=video). 영상판 계획은 src/app/kiosk/video/plans.ts · src/app/kiosk/perfumer/scent-plan.ts
  { id: 'ai-color-video', variantOf: 'ai-color', mode: 'ai-color', lab: 'video', tag: 'COLOR! · 영상판', name: 'AI 퍼스널 컬러 — 컬러리스트 서하', desc: '회색 옷만 입는 컬러리스트 서하가 아틀리에를 걸으며 상담 · 촬영 · 드레이프를 하고, 거울 앞에서 결과를 보여 줍니다.', needs: ['camera', 'ai'], group: 'reading', color: '#26307a', screen: '/assets/kiosk-video/color/door.webp' },
  { id: 'studio-draw-video', variantOf: 'studio-draw', mode: 'studio-draw', lab: 'video', tag: 'DRAW! · 영상판', name: '캐리커처 — 거리 화가 모루', desc: '언덕 위 화실의 거리 화가 모루가 손가락 프레임으로 구도를 잡고, 이젤 옆에서 그린 캐리커처를 캔버스째 돌려 보여 줍니다.', needs: ['camera', 'ai'], group: 'studio', color: '#b34734', screen: '/assets/kiosk-video/draw/steps.webp' },
  { id: 'studio-makeup-video', variantOf: 'studio-makeup', mode: 'studio-makeup', lab: 'video', tag: 'MAKEUP! · 영상판', name: '버추얼 메이크업 — 아티스트 이안', desc: '백스테이지 메이크업 아티스트 이안의 전구 거울이 카메라이자 화장 화면이 되고, 런웨이 입구에서 완성 사진을 들어 보입니다.', needs: ['camera', 'ai'], group: 'studio', color: '#754f70', screen: '/assets/kiosk-video/makeup/curtain.webp' },
  { id: 'ai-perfumer-video', variantOf: 'ai-perfumer', mode: 'ai-perfumer', lab: 'video', tag: 'SCENT! · 영상판', name: 'AI 조향사 — 하린의 향수 하우스', desc: '실사 조향사 하린을 따라 골목 입구 → 살롱 → 온실 → 증류실 → 향료 오르간 → 사진 스튜디오 → 블렌딩 랩 → 부티크를 걸으며 취향을 고르고 사진을 찍으면, AI가 나만의 향 레시피를 만들어 줍니다.', needs: ['camera', 'analysis'], group: 'preferences', color: '#244eea', screen: '/assets/kiosk-programs/perfumer/video/lane.webp' },
  // SCENT! 스핀오프 미연시(2026-11-19, 모드 ai-perfumer-harin, src/app/kiosk/perfumer/date) — 대본 docs/scent-harin-route.md
  { id: 'ai-perfumer-harin', mode: 'ai-perfumer-harin', tag: 'SCENT! · 하린 루트', name: '하린과의 하루 — 향기로 기억해 줄래요?', desc: '조향사 하린과 마주 보고 이야기하는 미연시. 하린이 목소리로 말을 걸고, 고르는 대답마다 호감도와 나에게 맞는 향 키워드가 쌓여요. 사진을 찍으면 AI가 향을 만들고, 호감도에 따라 엔딩 셋 중 하나와 손편지 영수증을 받아요.', needs: ['camera', 'analysis'], group: 'preferences', color: '#d94f86', screen: '/assets/kiosk-programs/perfumer/date/lane.webp' },
  // 연말 시상식 기본 모노 화면(sommelier-nh, 시음 와인 10병)은 2026-11-25 사용자 지시로 랜딩에서 뺐다 — 시상식 데모는 /booth-demo/nh
  // 2026-11-25 사용자 지시: 해나 와이너리 여정을 SIP! 소믈리에(studio-sommelier)의 영상판으로 — 위 기본 카드 옆에 붙는다
  { id: 'sommelier-nh-video', variantOf: 'studio-sommelier', mode: 'studio-sommelier-nh', lab: 'video', tag: 'SIP! · 영상판', name: 'AI 소믈리에 · 와이너리 여정', desc: '소믈리에 해나를 따라 포도밭 → 와이너리 → 수장고 → 시음실을 1인칭 영상으로 걸으며 맛을 고르면, AI가 시음 와인 10병 중 한 병을 골라 줍니다.', needs: ['camera', 'analysis'], group: 'preferences', color: '#3a2318', screen: '/assets/booth-demo/nh/sip-video.webp' },
]

/** 랜딩 카드 — 위 목록 + 영상판이 없는 카드마다 「영상판 준비 중」 카드(기본판 옆에 나란히) */
export const KIOSK_DEMOS: KioskDemo[] = [
  ...KIOSK_BASE,
  ...KIOSK_BASE.flatMap((base): KioskDemo[] => {
    const key = base.id ?? base.mode
    const soon = videoSoon(key)
    return soon && !base.variantOf && !KIOSK_BASE.some((d) => d.variantOf === key)
      ? [{ ...base, id: `${key}-video-soon`, variantOf: key, soon: true, lab: undefined, tag: `${base.tag} · 영상판`, name: `${base.name} — ${soon.guide}`, desc: videoSoonDesc(soon.guide), screen: soon.screen }]
      : []
  }),
]

/** 카드가 여는 주소 — 다른 화면(lab)이면 그 칸을 붙인다 */
export const kioskDemoCardHref = (demo: Pick<KioskDemo, 'mode' | 'lab'>, cleanKey?: string) =>
  `${kioskDemoHref(demo.mode, cleanKey)}${demo.lab ? `&lab=${encodeURIComponent(demo.lab)}` : ''}`

/** 데모로 여는 주소 — 미리보기 주소에 데모 표시를 붙인다 */
export const kioskDemoHref = (mode: string, cleanKey?: string) =>
  `/kiosk?mode=${encodeURIComponent(mode)}&${KIOSK_DEMO_PARAM}=${cleanKey ? `${DEMO_CLEAN}&${DEMO_CLEAN_KEY_PARAM}=${encodeURIComponent(cleanKey)}` : '1'}`
