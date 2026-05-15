// 새 회원가입 알림 템플릿
export function newMemberTemplate(data: {
  memberName: string
  provider: 'google' | 'kakao'
  email: string | null
  createdAt: string
}) {
  return {
    subject: `[ACSCENT] 새 회원가입: ${data.memberName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">🎉 새 회원이 가입했습니다</h2>
        <table style="width: 100%; border-collapse: collapse; background: #f9f9f9; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 600; width: 30%;">이름</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eee;">${data.memberName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 600;">로그인 방식</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eee;">${data.provider === 'google' ? '🔵 Google' : '🟡 Kakao'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 600;">이메일</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eee;">${data.email || '미제공'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: 600;">가입일시</td>
            <td style="padding: 12px 16px;">${data.createdAt}</td>
          </tr>
        </table>
      </div>
    `
  }
}

// 새 주문 알림 템플릿
export function newOrderTemplate(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  finalPrice: number
  productType: string
  itemCount?: number
  createdAt: string
}) {
  // [FIX] HIGH: chemistry_set 라벨 추가
  const productTypeLabel: Record<string, string> = {
    image_analysis: '이미지 분석 향수',
    figure_diffuser: '피규어 디퓨저',
    personal_scent: '퍼스널 센트',
    graduation: '졸업 에디션',
    signature: '시그니처',
    chemistry_set: '레이어링 퍼퓸 세트',
  }

  return {
    subject: `[ACSCENT] 📦 새 주문: ${data.orderNumber}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">📦 새 주문이 접수되었습니다</h2>
        <table style="width: 100%; border-collapse: collapse; background: #f0f9ff; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 600; width: 30%;">주문번호</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 700; color: #0369a1;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 600;">수령인</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe;">${data.recipientName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 600;">상품</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe;">${data.perfumeName}${data.itemCount && data.itemCount > 1 ? ` 외 ${data.itemCount - 1}건` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 600;">상품유형</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe;">${productTypeLabel[data.productType] || data.productType}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 600;">결제금액</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e0f2fe; font-weight: 700; color: #0369a1;">${data.finalPrice.toLocaleString()}원</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: 600;">주문일시</td>
            <td style="padding: 12px 16px;">${data.createdAt}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://acscent-identity.vercel.app'}/admin/orders"
             style="display: inline-block; padding: 12px 24px; background: #0369a1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            관리자 페이지에서 확인하기 →
          </a>
        </p>
      </div>
    `
  }
}

// 환불 완료 안내 템플릿 (고객 대상) — 결제 수단별 안내 차등
export function refundCompletedTemplate(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  refundAmount: number
  paymentMethod: string // 'card' | 'kakao_pay' | 'naver_pay' | 'bank_transfer'
  refundedAt: string
  reason?: string
}) {
  const methodGuide = (() => {
    switch (data.paymentMethod) {
      case 'card':
        return '신용/체크카드로 결제하신 건은 카드사 정책에 따라 영업일 기준 <strong>3~7일 내</strong>에 승인 취소 또는 환급이 반영됩니다.'
      case 'kakao_pay':
        return '카카오페이로 결제하신 건은 카카오페이 잔액 또는 결제 수단으로 <strong>영업일 기준 1~3일 내</strong> 환불됩니다.'
      case 'naver_pay':
        return '네이버페이로 결제하신 건은 네이버페이 잔액 또는 결제 수단으로 <strong>영업일 기준 1~3일 내</strong> 환불됩니다.'
      case 'bank_transfer':
        return '계좌이체(무통장입금) 환불은 입금자명 확인 후 지정 계좌로 <strong>영업일 기준 1~3일 내</strong> 송금됩니다.'
      default:
        return '결제하신 수단으로 환불 처리되었습니다. 반영까지 영업일 기준 1~7일이 소요될 수 있습니다.'
    }
  })()

  return {
    subject: `[ACSCENT] 💸 환불이 완료되었습니다 · ${data.orderNumber}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 6px;">💸 환불이 완료되었습니다</h2>
        <p style="color: #64748b; margin-top: 0; margin-bottom: 20px;">주문하신 상품의 환불 처리가 정상적으로 완료되었습니다.</p>

        <table style="width: 100%; border-collapse: collapse; background: #f0fdf4; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; font-weight: 600; width: 32%;">주문번호</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; font-weight: 700; color: #047857;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; font-weight: 600;">주문자</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5;">${data.recipientName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; font-weight: 600;">상품</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5;">${data.perfumeName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; font-weight: 600;">환불 금액</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; font-weight: 700; color: #047857;">${data.refundAmount.toLocaleString()}원</td>
          </tr>
          ${data.reason ? `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; font-weight: 600;">처리 사유</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #d1fae5; color: #475569;">${data.reason}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px 16px; font-weight: 600;">완료일시</td>
            <td style="padding: 12px 16px;">${data.refundedAt}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
          <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
            ${methodGuide}
          </p>
        </div>

        <p style="margin-top: 20px; color: #64748b; font-size: 13px; line-height: 1.5;">
          환불 반영이 지연되거나 내역이 확인되지 않는 경우, 주문번호와 함께 고객센터로 문의해 주세요.
        </p>
      </div>
    `
  }
}

// 발송(=운송장 등록) 알림 템플릿 — 고객 대상
export function orderShippedTemplate(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  carrierLabel: string
  trackingNumber: string
  trackingUrl: string
  shippedAt: string
}) {
  return {
    subject: `[ACSCENT] 🚚 상품이 발송되었습니다 · ${data.orderNumber}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 6px;">🚚 상품이 발송되었습니다</h2>
        <p style="color: #64748b; margin-top: 0; margin-bottom: 20px;">주문하신 상품이 출고되어 ${data.carrierLabel}을(를) 통해 배송됩니다.</p>

        <table style="width: 100%; border-collapse: collapse; background: #faf5ff; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff; font-weight: 600; width: 32%;">주문번호</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff; font-weight: 700; color: #6b21a8;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff; font-weight: 600;">받는분</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff;">${data.recipientName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff; font-weight: 600;">상품</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff;">${data.perfumeName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff; font-weight: 600;">택배사</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff;">${data.carrierLabel}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff; font-weight: 600;">운송장 번호</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e9d5ff; font-family: 'Courier New', monospace; font-weight: 700; color: #6b21a8;">${data.trackingNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: 600;">발송일시</td>
            <td style="padding: 12px 16px;">${data.shippedAt}</td>
          </tr>
        </table>

        <p style="margin-top: 20px; text-align: center;">
          <a href="${data.trackingUrl}"
             target="_blank" rel="noopener noreferrer"
             style="display: inline-block; padding: 12px 24px; background: #6b21a8; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            📦 배송 조회하기 →
          </a>
        </p>

        <p style="margin-top: 20px; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
          배송 관련 문의는 ${data.carrierLabel} 또는 고객센터로 연락 주세요.
        </p>
      </div>
    `
  }
}

// 주문 취소 요청 알림 템플릿
export function cancelRequestTemplate(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  finalPrice: number
  reason: string
  requestedAt: string
}) {
  const reason = data.reason
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  return {
    subject: `[ACSCENT] ⚠️ 주문 취소 요청: ${data.orderNumber}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ 주문 취소 요청이 접수되었습니다</h2>
        <table style="width: 100%; border-collapse: collapse; background: #fef2f2; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; font-weight: 600; width: 30%;">주문번호</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; font-weight: 700; color: #dc2626;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; font-weight: 600;">수령인</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca;">${data.recipientName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; font-weight: 600;">상품</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca;">${data.perfumeName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; font-weight: 600;">결제금액</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca;">${data.finalPrice.toLocaleString()}원</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; font-weight: 600;">취소 사유</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #fecaca; white-space: pre-wrap;">${reason}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: 600;">요청일시</td>
            <td style="padding: 12px 16px;">${data.requestedAt}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #dc2626; font-weight: 700;">⏰ 빠른 확인이 필요합니다!</p>
        </div>
        <p style="margin-top: 20px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://acscent-identity.vercel.app'}/admin/orders"
             style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            관리자 페이지에서 처리하기 →
          </a>
        </p>
      </div>
    `
  }
}
