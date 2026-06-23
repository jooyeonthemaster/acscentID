import type { PaymentMethod } from '@/types/cart'

// PortOne V2 설정

export const PORTONE_CONFIG = {
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '',
  // 기본 채널 (KCP - 카드결제)
  channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '',
  // 간편결제 전용 채널 (포트원 콘솔에서 별도 채널 설정 필요)
  kakaopayChannelKey: process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY || '',
  naverpayChannelKey: process.env.NEXT_PUBLIC_PORTONE_NAVERPAY_CHANNEL_KEY || '',
  // 별도 간편결제 채널 없이 기본 채널에서 EASY_PAY를 지원하는 경우 명시적으로 활성화
  enableEasyPay: process.env.NEXT_PUBLIC_PORTONE_ENABLE_EASY_PAY === 'true',
}

export type EasyPayMethod = Extract<PaymentMethod, 'kakao_pay' | 'naver_pay'>

export function isEasyPayMethod(paymentMethod: string): paymentMethod is EasyPayMethod {
  return paymentMethod === 'kakao_pay' || paymentMethod === 'naver_pay'
}

/**
 * 결제 수단별 채널 키 반환
 * 포트원 콘솔에서 PG사별 채널 설정에 따라 분기
 */
export function getChannelKey(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'kakao_pay':
      return PORTONE_CONFIG.kakaopayChannelKey || PORTONE_CONFIG.channelKey
    case 'naver_pay':
      return PORTONE_CONFIG.naverpayChannelKey || PORTONE_CONFIG.channelKey
    case 'card':
    default:
      return PORTONE_CONFIG.channelKey
  }
}

/**
 * 간편결제 채널이 설정되어 있는지 확인.
 * 전용 채널 키가 있으면 즉시 활성화하고, 기본 채널에서 EASY_PAY를 함께 쓰는 PG는
 * NEXT_PUBLIC_PORTONE_ENABLE_EASY_PAY=true로 명시적으로 열도록 한다.
 */
export function isEasyPayChannelConfigured(paymentMethod: string): boolean {
  switch (paymentMethod) {
    case 'kakao_pay':
      return !!PORTONE_CONFIG.kakaopayChannelKey || (PORTONE_CONFIG.enableEasyPay && !!PORTONE_CONFIG.channelKey)
    case 'naver_pay':
      return !!PORTONE_CONFIG.naverpayChannelKey || (PORTONE_CONFIG.enableEasyPay && !!PORTONE_CONFIG.channelKey)
    default:
      return true
  }
}
