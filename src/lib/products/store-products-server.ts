import { createServiceRoleClient } from '@/lib/supabase/service'
import { STORE_PRODUCTS, mapStoreProductRow, type StoreProduct, type StoreProductRow } from '@/lib/products/store-products'

export type StoreProductLookup =
  | { status: 'found'; product: StoreProduct }
  | { status: 'missing' }
  /** DB 조회 실패 — 404로 단정하지 않는다 (클라이언트가 다시 판단) */
  | { status: 'unknown' }

/**
 * 서버용 스토어 상품 조회 (메타데이터·404 판정).
 * 비활성 상품도 'found'로 돌려준다 — 관리자 미리보기(?adminPreview=1)가 같은 URL을 쓰기 때문.
 */
export async function lookupStoreProduct(slug: string): Promise<StoreProductLookup> {
  const constant = STORE_PRODUCTS.find((product) => product.slug === slug)
  try {
    const { data, error } = await createServiceRoleClient()
      .from('admin_store_products')
      .select('slug, title, short_label, size, fallback_price, image_url, badge, description, included, is_active, display_order')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    if (data) return { status: 'found', product: mapStoreProductRow(data as StoreProductRow) }
    return constant ? { status: 'found', product: constant } : { status: 'missing' }
  } catch (err) {
    console.error('[store-products-server] lookup failed:', err)
    return constant ? { status: 'found', product: constant } : { status: 'unknown' }
  }
}
