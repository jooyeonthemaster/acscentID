// 스탬프 시스템 타입 정의

export interface UserStamp {
  id: string
  user_id: string
  total_stamps: number
  created_at: string
  updated_at: string
}

export interface StampHistory {
  id: string
  user_id: string
  stamps_added: number
  source: 'online_order' | 'offline_admin' | 'manual_adjustment'
  order_id: string | null
  admin_note: string | null
  created_at: string
}

export interface StampReward {
  id: string
  user_id: string
  milestone: 2 | 4 | 6
  reward_type: 'stamp_10' | 'stamp_20' | 'stamp_free'
  is_claimed: boolean
  user_coupon_id: string | null
  created_at: string
  claimed_at: string | null
}

// 스탬프 마일스톤 정의
export const STAMP_MILESTONES = [
  {
    milestone: 2 as const,
    reward_type: 'stamp_10' as const,
    generation_at: 1, // 1개 구매 후 생성 (2번째 구매 시 사용 가능)
    discount_percent: 10,
    label: '10% 할인',
    description: '2회 구매 달성 시 10% 할인',
  },
  {
    milestone: 4 as const,
    reward_type: 'stamp_20' as const,
    generation_at: 3, // 3개 구매 후 생성
    discount_percent: 20,
    label: '20% 할인',
    description: '4회 구매 달성 시 20% 할인',
  },
  {
    milestone: 6 as const,
    reward_type: 'stamp_free' as const,
    generation_at: 5, // 5개 구매 후 생성
    discount_percent: 100,
    label: '상품 무료',
    description: '6회 구매 달성 시 상품 1개 무료',
  },
] as const

export type StampMilestone = (typeof STAMP_MILESTONES)[number]

// 스탬프 API 응답
export interface StampInfo {
  totalStamps: number
  rewards: StampReward[]
  nextMilestone: {
    milestone: number
    stampsNeeded: number
    reward: string
  } | null
}

// 관리자 스탬프 추가 요청
export interface AdminAddStampRequest {
  userId: string
  stamps: number
  note?: string
}
