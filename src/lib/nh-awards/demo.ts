// 연말 시상식(2026-12-15) AI 체험존 데모(/booth-demo/nh) — 고객이 링크로 눌러 보고 프로그램을 고르는 카드 4장.
// 화면은 기존 데모 주소 규칙 그대로: 키오스크 /kiosk?mode=studio-sommelier-nh&demo=1, 포토부스 /booth?mode=<id>&demo=1.
// 노트북으로 확인하므로 포토부스는 camera=webcam(DSLR 브리지를 찾지 않는다). 워터마크 없는 판은 /booth-demo/nh/clean?k=…(src/lib/demo-clean.ts).
// 설명: docs/nh-awards-demo.md

import { boothDemoHref } from '@/lib/booth/demo'
import { kioskDemoHref } from '@/lib/kiosk/demo'

export type NhBuild = 'existing' | 'adapted' | 'new'
export const NH_BUILD_LABEL: Record<NhBuild, string> = { existing: '기존 프로그램', adapted: '기존 · 고쳐 씀', new: '새로 제작' }

export interface NhDemo {
  key: 'sommelier' | 'face' | 'saju' | 'palm' | 'sip-video'
  device: 'kiosk' | 'booth'
  tag: string
  name: string
  desc: string
  build: NhBuild
  /** 무엇을 다시 썼나 */
  from: string
  /** 손님 한 명 — 입력 · 대기(어림, docs/nh-awards-demo.md '처리량') */
  time: string
  wait: string
  output: string
  color: string
  /** 카드 견본 — 데모 화면 캡처(키오스크 세로 560×996 · 부스 가로 1280×720) */
  screen: string
  /** 포토부스 카드의 출구에서 나오는 4×6 견본(데모로 만든 원판 — AI 가상 인물) */
  print?: string
  mode: string
  /** 같은 모드의 다른 화면(키오스크 주소의 &lab=…) — 영상판 SIP! */
  lab?: string
}

const shot = (name: string) => `/assets/booth-demo/nh/${name}.webp`

export const NH_DEMOS: NhDemo[] = [
  { key: 'sommelier', device: 'kiosk', tag: 'SIP!', name: 'AI 소믈리에', build: 'adapted', from: '기존 AI 소믈리에(와인 스타일 추천)를 오늘의 시음 와인 10병 추천으로', desc: '사진 한 장과 단맛 · 산미 · 바디 · 종류를 고르면 AI가 시음 와인 10병 중 한 병을 골라 번호로 알려 줘요. 직원은 영수증 맨 위 번호를 보고 따라 드려요.', time: '1분 30초~2분', wait: 'AI 4~7초', output: '영수증 · 휴대폰 QR', color: '#6b2941', screen: shot('sommelier'), mode: 'studio-sommelier-nh' },
  { key: 'face', device: 'booth', tag: 'FACE!', name: '새해 관상 이야기', build: 'new', from: '키오스크 「관상에서 착안한 이야기」를 포토부스 · 신년 이야기로', desc: '한 컷 찍으면 조선 시대 초상처럼 그려지고, 오늘의 표정에서 착안한 2027 정미년 덕담을 초상 위에 붓글씨로 얹어 4×6 으로 인화해요.', time: '1분 30초 안팎', wait: 'AI 10~20초', output: '4×6 인화 · QR', color: '#b3261e', screen: shot('face'), print: shot('print-face'), mode: 'nh-face' },
  { key: 'saju', device: 'booth', tag: 'SAJU!', name: '정미년 사주 이야기', build: 'new', from: '기존 사주 체험의 만세력 엔진과 2027년 풀이를 직장인 · 중장년 신년 이야기로', desc: '생년월일 여덟 자리를 누르고 한 컷 찍으면, 후광 · 구름 속 새해 소원 초상과 만세력으로 세운 오행 색 원국 · 2027 정미년 풀이를 반 접는 4×6 카드로 인화해요.', time: '1분 30초~2분', wait: 'AI 10~20초', output: '4×6 접는 카드 · QR', color: '#8a1c1c', screen: shot('saju'), print: shot('print-saju'), mode: 'nh-saju' },
  { key: 'palm', device: 'booth', tag: 'PALM!', name: '새해 손금 이야기', build: 'new', from: '키오스크 「손금 이야기」(손을 펼친 모양)를 포토부스 · 신년 이야기로', desc: '얼굴 옆으로 손바닥을 펴고 한 컷 — 손을 펼친 모양에서 착안한 새해 덕담을 사진과 함께 4×6 으로 인화해요. 실제 손금 선은 읽지 않아요.', time: '1분~1분 30초', wait: 'AI 3~6초', output: '4×6 인화 · QR', color: '#2f3f73', screen: shot('palm'), print: shot('print-palm'), mode: 'nh-palm' },
]

/**
 * 새로 만든 판 — 기존 4종과 따로 보여 준다(2026-11-17 사용자 지시: nh 4종과 영상 버전을 구분해서).
 * SIP! 영상판: 같은 소믈리에(studio-sommelier-nh · 같은 와인 10병 · 같은 추천 규칙)를 1인칭 영상 여정으로 — 주소 &lab=video
 */
export const NH_NEW_DEMOS: NhDemo[] = [
  { key: 'sip-video', device: 'kiosk', tag: 'SIP! · 영상판', name: 'AI 소믈리에 — 와이너리 여정', build: 'new', from: '위 AI 소믈리에(같은 와인 10병 · 같은 추천 규칙)를 1인칭 영상 게임으로', desc: '소믈리에 해나를 따라 포도밭 입구 → 포도밭 → 와이너리 → 와인 수장고 → 시음실을 1인칭으로 걸어가며 맛을 고르면, 수장고에서 AI가 시음 와인 10병 중 한 병을 골라 번호로 알려 줘요. 장면마다 움직이는 영상이에요.', time: '2분~2분 30초', wait: 'AI 4~7초', output: '영수증 · 휴대폰 QR', color: '#3a2318', screen: shot('sip-video'), mode: 'studio-sommelier-nh', lab: 'video' },
]

export function nhDemoHref(demo: NhDemo, cleanKey?: string): string {
  if (demo.device === 'kiosk') return `${kioskDemoHref(demo.mode, cleanKey)}${demo.lab ? `&lab=${demo.lab}` : ''}`
  return `${boothDemoHref({ mode: demo.mode }, cleanKey)}&camera=webcam`
}
