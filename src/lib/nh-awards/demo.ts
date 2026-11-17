// 연말 시상식(2026-12-15) AI 체험존 데모(/booth-demo/nh) — 고객이 링크로 눌러 보고 프로그램을 고르는 카드 4장.
// 화면은 기존 데모 주소 규칙 그대로: 키오스크 /kiosk?mode=studio-sommelier-nh&demo=1, 포토부스 /booth?mode=<id>&demo=1.
// 노트북으로 확인하므로 포토부스는 camera=webcam(DSLR 브리지를 찾지 않는다). 워터마크 없는 판은 /booth-demo/nh/clean?k=…(src/lib/demo-clean.ts).
// 설명: docs/nh-awards-demo.md

import { boothDemoHref } from '@/lib/booth/demo'
import { kioskDemoHref } from '@/lib/kiosk/demo'

export type NhBuild = 'existing' | 'adapted' | 'new'
export const NH_BUILD_LABEL: Record<NhBuild, string> = { existing: '기존 프로그램', adapted: '기존 · 고쳐 씀', new: '새로 제작' }

export interface NhDemo {
  key: 'sommelier' | 'face' | 'saju' | 'palm'
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
  mode: string
}

const shot = (name: string) => `/assets/booth-demo/nh/${name}.webp`

export const NH_DEMOS: NhDemo[] = [
  { key: 'sommelier', device: 'kiosk', tag: 'SIP!', name: 'AI 소믈리에', build: 'adapted', from: '기존 AI 소믈리에(와인 스타일 추천)를 오늘의 시음 와인 10병 추천으로', desc: '사진 한 장과 단맛 · 산미 · 바디 · 종류를 고르면 AI가 시음 와인 10병 중 한 병을 골라 번호로 알려 줘요. 직원은 영수증 맨 위 번호를 보고 따라 드려요.', time: '1분 30초~2분', wait: 'AI 4~7초', output: '영수증 · 휴대폰 QR', color: '#6b2941', screen: shot('sommelier'), mode: 'studio-sommelier-nh' },
  { key: 'face', device: 'booth', tag: 'FACE!', name: '새해 관상 이야기', build: 'new', from: '키오스크 「관상에서 착안한 이야기」를 포토부스 · 신년 이야기로', desc: '한 컷 찍고 듣고 싶은 새해 이야기를 고르면, 오늘의 표정에서 착안한 2027 정미년 덕담을 사진과 함께 4×6 으로 인화해요.', time: '1분~1분 30초', wait: 'AI 3~6초', output: '4×6 인화 · QR', color: '#b3261e', screen: shot('face'), mode: 'nh-face' },
  { key: 'saju', device: 'booth', tag: 'SAJU!', name: '정미년 사주 이야기', build: 'new', from: '기존 사주 체험의 만세력 엔진과 2027년 풀이를 직장인 · 중장년 신년 이야기로', desc: '생년월일 여덟 자리를 누르고 한 컷 찍으면, 만세력으로 세운 사주와 2027 정미년 흐름 · 행운의 색을 사진과 함께 4×6 으로 인화해요.', time: '1분 30초~2분', wait: 'AI 3~6초', output: '4×6 인화 · QR', color: '#8a1c1c', screen: shot('saju'), mode: 'nh-saju' },
  { key: 'palm', device: 'booth', tag: 'PALM!', name: '새해 손금 이야기', build: 'new', from: '키오스크 「손금 이야기」(손을 펼친 모양)를 포토부스 · 신년 이야기로', desc: '얼굴 옆으로 손바닥을 펴고 한 컷 — 손을 펼친 모양에서 착안한 새해 덕담을 사진과 함께 4×6 으로 인화해요. 실제 손금 선은 읽지 않아요.', time: '1분~1분 30초', wait: 'AI 3~6초', output: '4×6 인화 · QR', color: '#2f3f73', screen: shot('palm'), mode: 'nh-palm' },
]

export function nhDemoHref(demo: NhDemo, cleanKey?: string): string {
  if (demo.device === 'kiosk') return kioskDemoHref(demo.mode, cleanKey)
  return `${boothDemoHref({ mode: demo.mode }, cleanKey)}&camera=webcam`
}
