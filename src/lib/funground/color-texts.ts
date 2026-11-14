// 펀그라운드 별내 B안 퍼스널 컬러(COLOR!) — 8유형 결과 문장을 미리 써 둔 표. AI 가 쓰지 않는다(기기 안에서 판정 → 이 표에서 고른다).
// 9~19세 체험이라 외모 평가 · 점수 · 순위는 없다 — 「어울리는 색」만 말한다. 화장 · 염색 권유 대신 옷 · 소품 이야기.
// 어울리는 색 12개는 키오스크 팔레트(src/lib/kiosk/color-types.ts 의 best 8색)를 그대로 앞에 두고 같은 결의 4색을 더했다.
// 표가 빠짐없는지(8유형 × 12색 · 특징 3 · 조언 2~3)는 __tests__/color-texts.test.ts 가 본다 — npm run test:funground-color

import type { PersonalColorTypeId } from '@/types/analysis'

export interface FgSwatch {
  hex: string
  /** 아이들이 아는 말로 — 「코랄」보다 「살구 오렌지」 */
  name: string
}

export interface FgColorText {
  /** 유형 이름(키오스크와 같은 말) */
  name: string
  undertone: 'warm' | 'cool'
  /** 한 줄 별명 */
  nickname: string
  /** 두 문장 요약 — 이 사람이 아니라 '이 색들'이 어떤지 말한다 */
  summary: string
  /** 이 유형 색의 특징 3 */
  features: [string, string, string]
  /** 어울리는 색 12 */
  colors: FgSwatch[]
  /** 옷 · 소품 조언 2~3 */
  tips: string[]
  /** 소품 금속 — 머리핀 · 시계 · 단추(「…이 잘 어울려요」에 붙는다 — 받침 있는 말로 끝낸다) */
  metal: string
}

export const UNDERTONE_LABEL = { warm: '따뜻한 색(웜톤)', cool: '시원한 색(쿨톤)' } as const

export const FG_COLOR_TEXTS: Record<PersonalColorTypeId, FgColorText> = {
  'spring-light': {
    name: '봄 라이트',
    undertone: 'warm',
    nickname: '햇살 머금은 피치',
    summary: '따뜻하고 밝은 파스텔 색이 잘 어울리는 타입이에요. 복숭아 · 크림처럼 부드럽고 환한 색을 입으면 얼굴빛이 한층 화사해 보여요.',
    features: ['노란 기가 살짝 도는 따뜻한 색', '밝고 연한 파스텔 색', '진하고 어두운 색보다 가볍고 맑은 색'],
    colors: [
      { hex: '#FFD9B8', name: '피치 크림' },
      { hex: '#FFB7A5', name: '살구 핑크' },
      { hex: '#FFC8D2', name: '벚꽃 핑크' },
      { hex: '#FFF0B8', name: '버터 옐로' },
      { hex: '#CDE8A6', name: '새싹 연두' },
      { hex: '#A8E0D1', name: '민트' },
      { hex: '#F7E7CE', name: '아이보리' },
      { hex: '#F6B26B', name: '살구 오렌지' },
      { hex: '#FF9E80', name: '코랄' },
      { hex: '#9AD4EA', name: '아쿠아 블루' },
      { hex: '#D9B48F', name: '라이트 카멜' },
      { hex: '#C9B6E8', name: '라일락' },
    ],
    tips: [
      '새하얀 티셔츠 대신 아이보리 · 크림색 티셔츠를 골라 보세요.',
      '머리끈 · 운동화 끈 · 가방 고리 같은 작은 소품에 살구색이나 민트를 넣어 보세요.',
      '검정 · 남색 옷을 입는 날엔 얼굴 가까이에 밝은 색 후드나 목도리를 더해 보세요.',
    ],
    metal: '반짝이는 금빛',
  },
  'spring-bright': {
    name: '봄 브라이트',
    undertone: 'warm',
    nickname: '톡톡 터지는 비타민',
    summary: '따뜻하면서 선명하고 쨍한 색이 잘 어울리는 타입이에요. 귤 · 레몬 · 수박처럼 생기 있는 색이 얼굴을 또렷하고 밝게 살려 줘요.',
    features: ['따뜻하면서도 맑고 선명한 색', '과일처럼 생기 있는 비비드 색', '회색이 섞인 흐린 색보다 깨끗한 원색'],
    colors: [
      { hex: '#FF6F4E', name: '토마토 코랄' },
      { hex: '#FF8C42', name: '귤 오렌지' },
      { hex: '#FFD23F', name: '레몬 옐로' },
      { hex: '#7ED957', name: '라임 그린' },
      { hex: '#00C2B8', name: '터쿼이즈' },
      { hex: '#FF5E8A', name: '수박 핑크' },
      { hex: '#FFF1D6', name: '크림 화이트' },
      { hex: '#3F7FE0', name: '맑은 파랑' },
      { hex: '#FFB000', name: '망고 옐로' },
      { hex: '#2EB872', name: '잔디 초록' },
      { hex: '#FF8FA3', name: '플라밍고 핑크' },
      { hex: '#1FA3E0', name: '여름 하늘색' },
    ],
    tips: [
      '무채색 옷에 선명한 색 하나(모자 · 양말 · 가방)를 더하면 확 살아나요.',
      '티셔츠는 회색보다 크림 화이트나 맑은 색 쪽이 얼굴이 밝아 보여요.',
      '운동복 · 체육복도 형광에 가까운 쨍한 색이 잘 어울려요.',
    ],
    metal: '밝은 금빛',
  },
  'summer-light': {
    name: '여름 라이트',
    undertone: 'cool',
    nickname: '솜사탕 라벤더',
    summary: '시원하고 밝은 파스텔 색이 잘 어울리는 타입이에요. 라벤더 · 하늘색처럼 푸른 기가 도는 연한 색을 입으면 얼굴이 맑고 깨끗해 보여요.',
    features: ['푸른 기가 살짝 도는 시원한 색', '우유를 탄 듯 밝고 부드러운 색', '노랗고 진한 색보다 연하고 맑은 색'],
    colors: [
      { hex: '#F4C2D7', name: '베이비 핑크' },
      { hex: '#D7C9F0', name: '라벤더' },
      { hex: '#BFD9F2', name: '하늘색' },
      { hex: '#C5E8E0', name: '아쿠아 민트' },
      { hex: '#F9F0F5', name: '소프트 화이트' },
      { hex: '#E8B4C8', name: '로즈 핑크' },
      { hex: '#B4C7E7', name: '파우더 블루' },
      { hex: '#DADCE6', name: '라이트 그레이' },
      { hex: '#C9A8DC', name: '라일락 퍼플' },
      { hex: '#8FAADC', name: '페리윙클' },
      { hex: '#F2A7B8', name: '딸기 우유' },
      { hex: '#7FB5C9', name: '물빛 블루' },
    ],
    tips: [
      '흰 옷은 노란 기 없는 깨끗한 흰색이나 연한 회색이 잘 어울려요.',
      '청바지는 너무 진한 것보다 밝은 연청색을 골라 보세요.',
      '필통 · 폰 케이스 · 머리핀 같은 소품에 라벤더나 하늘색을 써 보세요.',
    ],
    metal: '은빛',
  },
  'summer-mute': {
    name: '여름 뮤트',
    undertone: 'cool',
    nickname: '안개 낀 아침 하늘',
    summary: '시원하면서 차분하고 부드러운 색이 잘 어울리는 타입이에요. 회색이 살짝 섞인 듯한 은은한 색이 얼굴을 편안하고 단정하게 보여 줘요.',
    features: ['푸른 기가 도는 시원한 색', '회색이 살짝 섞인 차분한 색', '쨍한 원색보다 은은하고 부드러운 색'],
    colors: [
      { hex: '#B8A9C9', name: '그레이 라벤더' },
      { hex: '#9DB4C0', name: '스모키 블루' },
      { hex: '#C9A9A6', name: '로즈 베이지' },
      { hex: '#A3B5A6', name: '세이지 그린' },
      { hex: '#8E9AAF', name: '블루 그레이' },
      { hex: '#D8C4CC', name: '더스티 핑크' },
      { hex: '#7D8CA3', name: '데님 블루' },
      { hex: '#E5E0E6', name: '안개 그레이' },
      { hex: '#A68DA8', name: '모브' },
      { hex: '#B5838D', name: '로즈 우드' },
      { hex: '#8FA9A0', name: '그레이 민트' },
      { hex: '#4F5D75', name: '네이비 그레이' },
    ],
    tips: [
      '새까만 검정 대신 네이비 그레이 · 차콜을 바탕색으로 써 보세요.',
      '비슷한 톤 두세 가지(예: 블루 그레이 + 안개 그레이)를 겹쳐 입으면 잘 어울려요.',
      '형광 · 원색 소품보다 파스텔을 살짝 누른 색 소품이 자연스러워요.',
    ],
    metal: '은빛 · 무광 은색',
  },
  'autumn-mute': {
    name: '가을 뮤트',
    undertone: 'warm',
    nickname: '포근한 라테 한 잔',
    summary: '따뜻하면서 차분하고 부드러운 색이 잘 어울리는 타입이에요. 라테 · 카멜 · 올리브처럼 자연에서 온 듯한 색이 얼굴을 포근하게 감싸 줘요.',
    features: ['노란 기가 도는 따뜻한 색', '흙 · 나무 · 풀처럼 자연스러운 색', '선명한 원색보다 살짝 가라앉은 색'],
    colors: [
      { hex: '#C9A27E', name: '라테 베이지' },
      { hex: '#B5A27A', name: '카키 베이지' },
      { hex: '#A67B5B', name: '밀크 브라운' },
      { hex: '#8A9A5B', name: '올리브' },
      { hex: '#D4A373', name: '카멜' },
      { hex: '#C08A7A', name: '말린 장미' },
      { hex: '#7F8F8A', name: '모스 그레이' },
      { hex: '#EDE0C8', name: '오트밀' },
      { hex: '#D2A84C', name: '머스터드' },
      { hex: '#6B7A4B', name: '카키' },
      { hex: '#C47F5A', name: '테라코타' },
      { hex: '#5E6E66', name: '딥 세이지' },
    ],
    tips: [
      '흰 티셔츠 대신 오트밀 · 베이지 티셔츠를 골라 보세요.',
      '니트 · 코듀로이 · 면처럼 부드러운 질감의 옷이 이 색들과 잘 어울려요.',
      '가방 · 신발은 검정보다 갈색 · 카멜 쪽이 전체를 부드럽게 이어 줘요.',
    ],
    metal: '무광 금빛 · 나무색',
  },
  'autumn-deep': {
    name: '가을 딥',
    undertone: 'warm',
    nickname: '깊은 숲 속 단풍',
    summary: '따뜻하면서 깊고 진한 색이 잘 어울리는 타입이에요. 초콜릿 · 단풍 · 숲처럼 짙은 색을 입으면 얼굴이 또렷하고 든든해 보여요.',
    features: ['노란 기가 도는 따뜻한 색', '깊고 진한 가을 색', '연한 파스텔보다 묵직하고 짙은 색'],
    colors: [
      { hex: '#7B3F00', name: '초콜릿 브라운' },
      { hex: '#A0522D', name: '벽돌 브라운' },
      { hex: '#B7410E', name: '단풍 오렌지' },
      { hex: '#556B2F', name: '다크 올리브' },
      { hex: '#8B1E2D', name: '와인' },
      { hex: '#C68E17', name: '황금 머스터드' },
      { hex: '#1F4E4A', name: '딥 틸' },
      { hex: '#3B2F2F', name: '다크 초콜릿' },
      { hex: '#D97A2B', name: '펌프킨' },
      { hex: '#2E5E3E', name: '포레스트 그린' },
      { hex: '#E2C290', name: '모래 베이지' },
      { hex: '#9B6A2F', name: '캐러멜' },
    ],
    tips: [
      '검정 대신 다크 초콜릿 · 포레스트 그린을 바탕색으로 써 보세요.',
      '체크 · 가죽 · 두툼한 니트처럼 묵직한 소재가 이 색들과 잘 어울려요.',
      '밝은 색이 입고 싶을 땐 모래 베이지 · 펌프킨처럼 따뜻한 색을 골라 보세요.',
    ],
    metal: '진한 금빛 · 구리빛',
  },
  'winter-bright': {
    name: '겨울 브라이트',
    undertone: 'cool',
    nickname: '반짝이는 겨울 별빛',
    summary: '시원하면서 선명하고 대비가 또렷한 색이 잘 어울리는 타입이에요. 새하얀 색 · 검정 · 쨍한 원색을 입으면 얼굴이 또렷하고 반짝여 보여요.',
    features: ['푸른 기가 도는 시원한 색', '맑고 쨍한 원색', '흰색과 검정처럼 대비가 큰 조합'],
    colors: [
      { hex: '#E4007C', name: '푸시아' },
      { hex: '#0047FF', name: '코발트 블루' },
      { hex: '#00A86B', name: '에메랄드' },
      { hex: '#FFFFFF', name: '새하얀 흰색' },
      { hex: '#111111', name: '블랙' },
      { hex: '#FF1744', name: '체리 레드' },
      { hex: '#7C3AED', name: '바이올렛' },
      { hex: '#00E5FF', name: '아이스 블루' },
      { hex: '#FFF35C', name: '아이스 레몬' },
      { hex: '#1A2A8C', name: '로열 네이비' },
      { hex: '#FF66C4', name: '버블검 핑크' },
      { hex: '#C0C7D6', name: '실버 그레이' },
    ],
    tips: [
      '흰색 + 검정, 흰색 + 코발트처럼 또렷한 두 색 조합이 잘 어울려요.',
      '베이지 · 카키처럼 흐린 색 옷엔 선명한 색 소품 하나를 더해 보세요.',
      '운동화 · 모자에 쨍한 색 하나를 넣으면 사진에서 얼굴이 더 또렷해 보여요.',
    ],
    metal: '반짝이는 은빛',
  },
  'winter-deep': {
    name: '겨울 딥',
    undertone: 'cool',
    nickname: '한밤의 벨벳',
    summary: '시원하면서 깊고 진한 색이 잘 어울리는 타입이에요. 밤하늘 남색 · 블랙 체리처럼 차갑고 짙은 색을 입으면 얼굴이 단단하고 또렷해 보여요.',
    features: ['푸른 기가 도는 시원한 색', '깊고 진한 밤의 색', '노르스름한 색보다 차갑고 짙은 색'],
    colors: [
      { hex: '#0B1F4B', name: '미드나잇 네이비' },
      { hex: '#4A0E2E', name: '블랙 체리' },
      { hex: '#0F3D3E', name: '다크 틸' },
      { hex: '#2D1B4E', name: '딥 퍼플' },
      { hex: '#111111', name: '블랙' },
      { hex: '#8B0A1A', name: '루비 레드' },
      { hex: '#F5F5F7', name: '스노 화이트' },
      { hex: '#5A5F6B', name: '차콜 그레이' },
      { hex: '#0B6E4F', name: '에메랄드 그린' },
      { hex: '#2747A8', name: '사파이어 블루' },
      { hex: '#A0115C', name: '라즈베리' },
      { hex: '#C9CED8', name: '실버' },
    ],
    tips: [
      '검정 · 남색을 바탕으로 깨끗한 흰색을 얼굴 가까이에 두면 잘 어울려요.',
      '갈색 · 베이지 대신 차콜 그레이 · 네이비를 써 보세요.',
      '포인트 색은 루비 레드 · 사파이어 블루처럼 깊은 보석 색이 좋아요.',
    ],
    metal: '은빛 · 흰 금빛',
  },
}

/** 어떤 사진이든 결과 화면 아래에 붙이는 말 */
export const FG_COLOR_DISCLAIMER = '재미로 보는 결과예요 · 조명에 따라 달라질 수 있어요'
