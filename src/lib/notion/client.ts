// Notion API 저수준 클라이언트 (서버사이드 전용)
// 별도 SDK 의존성 없이 fetch로 호출한다.

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

export interface NotionConfig {
  apiKey: string
  databaseId: string
  // 새 주문 페이지에서 @멘션할 관리자 Notion 사용자 ID (선택)
  // 설정 시 노션 모바일 푸시 알림이 발송된다.
  adminUserId: string | null
}

// 환경변수가 갖춰졌을 때만 설정 객체를 반환한다. (미설정이면 null → 조용히 스킵)
export function getNotionConfig(): NotionConfig | null {
  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_ORDERS_DATABASE_ID
  if (!apiKey || !databaseId) {
    return null
  }
  return {
    apiKey,
    databaseId,
    adminUserId: process.env.NOTION_ADMIN_USER_ID || null,
  }
}

export async function notionRequest(
  apiKey: string,
  path: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${NOTION_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  return { ok: res.ok, status: res.status, data }
}
