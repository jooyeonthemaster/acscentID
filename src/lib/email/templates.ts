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
  const productTypeLabel: Record<string, string> = {
    image_analysis: '이미지 분석 향수',
    figure_diffuser: '피규어 디퓨저',
    personal_scent: '퍼스널 센트',
    graduation: '졸업 에디션',
    signature: '시그니처'
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

// 주문 취소 요청 알림 템플릿
export function cancelRequestTemplate(data: {
  orderNumber: string
  recipientName: string
  perfumeName: string
  finalPrice: number
  requestedAt: string
}) {
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
