// PortOne V2 설정

export const PORTONE_CONFIG = {
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '',
  // 기본 채널 (KCP - 카드결제)
  channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '',
  // 간편결제 전용 채널 (포트원 콘솔에서 별도 채널 설정 필요)
  kakaopayChannelKey: process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_CHANNEL_KEY || '',
  naverpayChannelKey: process.env.NEXT_PUBLIC_PORTONE_NAVERPAY_CHANNEL_KEY || '',
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
 * 간편결제 채널이 설정되어 있는지 확인
 */
export function isEasyPayChannelConfigured(paymentMethod: string): boolean {
  switch (paymentMethod) {
    case 'kakao_pay':
      return !!PORTONE_CONFIG.kakaopayChannelKey
    case 'naver_pay':
      return !!PORTONE_CONFIG.naverpayChannelKey
    default:
      return true
  }
}
