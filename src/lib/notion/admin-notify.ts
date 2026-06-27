import { getNotionConfig, notionRequest } from './client'

// 이메일 템플릿과 동일한 라벨 매핑 (노션 표에 한글로 표기)
const productTypeLabel: Record<string, string> = {
  image_analysis: '이미지 분석 향수',
  image_analysis_paper: 'AI 이미지 분석 시향지',
  figure_diffuser: '피규어 디퓨저',
  personal_scent: '퍼스널 센트',
  graduation: '졸업 에디션',
  signature: '시그니처',
  chemistry_set: '레이어링 퍼퓸 세트',
}

const paymentMethodLabel: Record<string, string> = {
  card: '카드',
  kakao_pay: '카카오페이',
  naver_pay: '네이버페이',
  bank_transfer: '무통장입금',
}

const statusLabel: Record<string, string> = {
  paid: '결제완료',
  pending: '대기',
  awaiting_payment: '입금대기',
  preparing: '준비중',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '취소',
}

export interface NotionOrderData {
  orderNumber: string
  recipientName: string
  perfumeName: string
  finalPrice: number
  productType: string
  itemCount?: number
  paymentMethod?: string
  status?: string
  orderId?: string
  createdAtIso: string
}

/**
 * 새 주문을 노션 데이터베이스에 한 행(페이지)으로 추가한다.
 * NOTION_ADMIN_USER_ID가 설정돼 있으면 본문에 관리자를 @멘션하여
 * 노션 모바일 푸시 알림이 발송되도록 한다.
 *
 * 실패해도 주문/결제 흐름에는 영향이 없도록 절대 throw 하지 않는다.
 */
export async function createOrderInNotion(data: NotionOrderData): Promise<boolean> {
  const config = getNotionConfig()
  if (!config) {
    console.log('[Notion] Skipping - NOTION_API_KEY / NOTION_ORDERS_DATABASE_ID not configured')
    return false
  }

  const productLabel = productTypeLabel[data.productType] || data.productType || '기타'
  const payLabel = data.paymentMethod
    ? paymentMethodLabel[data.paymentMethod] || data.paymentMethod
    : '미정'
  const stLabel = data.status ? statusLabel[data.status] || data.status : '대기'
  const productText =
    data.itemCount && data.itemCount > 1
      ? `${data.perfumeName} 외 ${data.itemCount - 1}건`
      : data.perfumeName

  // 데이터베이스 속성(컬럼) 매핑 — 노션에 아래 이름/타입으로 속성을 만들어 두어야 한다.
  const properties: Record<string, unknown> = {
    주문번호: { title: [{ text: { content: data.orderNumber } }] },
    수령인: { rich_text: [{ text: { content: data.recipientName || '' } }] },
    상품: { rich_text: [{ text: { content: productText || '' } }] },
    결제금액: { number: data.finalPrice },
    상품유형: { select: { name: productLabel } },
    결제수단: { select: { name: payLabel } },
    상태: { select: { name: stLabel } },
    수량: { number: data.itemCount || 1 },
    주문일시: { date: { start: data.createdAtIso } },
  }

  // 본문: 관리자 @멘션(푸시 알림 트리거) + 관리자 페이지 바로가기 링크
  const adminUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://acscent-identity.vercel.app'}/admin/orders`
  const richText: unknown[] = config.adminUserId
    ? [
        { type: 'text', text: { content: '🔔 새 주문 확인 필요  ' } },
        { type: 'mention', mention: { type: 'user', user: { id: config.adminUserId } } },
        { type: 'text', text: { content: '   ·   ' } },
        { type: 'text', text: { content: '관리자에서 보기', link: { url: adminUrl } } },
      ]
    : [
        { type: 'text', text: { content: '📦 새 주문   ·   ' } },
        { type: 'text', text: { content: '관리자에서 보기', link: { url: adminUrl } } },
      ]

  const children = [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: richText },
    },
  ]

  try {
    const { ok, status, data: resData } = await notionRequest(config.apiKey, '/pages', {
      parent: { database_id: config.databaseId },
      properties,
      children,
    })

    if (!ok) {
      console.error('[Notion] Create page failed:', status, JSON.stringify(resData))
      return false
    }

    console.log('[Notion] Order page created:', data.orderNumber)
    return true
  } catch (err) {
    console.error('[Notion] Unexpected error:', err)
    return false
  }
}
