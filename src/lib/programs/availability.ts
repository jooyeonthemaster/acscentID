import { createServiceRoleClient } from '@/lib/supabase/service'

const CACHE_TTL_MS = 60_000
let cache: { enabled: Map<string, boolean>; expiresAt: number } | null = null

/**
 * 서버(메타데이터)용 프로그램 활성 여부 — 클라이언트 useActiveProducts().isProductActive와 같은 규칙.
 * admin_products 행이 없으면 활성, is_enabled === false 일 때만 비활성.
 * 조회 실패 시에는 활성으로 간주한다 (판매 중인 페이지를 noindex로 잘못 숨기지 않도록).
 */
export async function isProgramEnabledServer(slug: string): Promise<boolean> {
  const now = Date.now()
  if (!cache || cache.expiresAt < now) {
    try {
      const { data, error } = await createServiceRoleClient()
        .from('admin_products')
        .select('slug, is_enabled')
      if (error) throw error
      cache = {
        enabled: new Map((data ?? []).map((row) => [row.slug as string, row.is_enabled !== false])),
        expiresAt: now + CACHE_TTL_MS,
      }
    } catch (err) {
      console.error('[program-availability] admin_products query failed:', err)
      return true
    }
  }
  return cache.enabled.get(slug) ?? true
}
