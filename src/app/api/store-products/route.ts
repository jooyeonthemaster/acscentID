import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  STORE_PRODUCTS,
  applyRepresentativeProductImages,
  mapStoreProductRow,
  type StoreProduct,
  type StoreProductImageRow,
  type StoreProductRow,
} from '@/lib/products/store-products'
import { readLocalStoreProducts } from '@/lib/products/store-products-local'

function isMissingStoreProductsTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  return (
    candidate.code === 'PGRST205' ||
    candidate.code === '42P01' ||
    Boolean(candidate.message?.includes('admin_store_products'))
  )
}

async function withRepresentativeImages(
  client: ReturnType<typeof createServiceRoleClient>,
  products: StoreProduct[],
): Promise<StoreProduct[]> {
  if (products.length === 0) return products
  const slugs = products.map((product) => product.slug)
  const { data, error } = await client
    .from('admin_product_images')
    .select('product_slug, image_url, display_order')
    .in('product_slug', slugs)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[store-products GET] representative image query failed:', error)
    return products
  }

  return applyRepresentativeProductImages(products, (data ?? []) as StoreProductImageRow[])
}

export async function GET(request: Request) {
  // adminPreview에서 비활성 상품도 편집/미리보기 할 수 있도록 관리자에 한해 비활성 포함 허용
  const includeInactive = new URL(request.url).searchParams.get('includeInactive') === '1'
  const allowInactive = includeInactive ? Boolean(await requireAdmin()) : false

  const client = createServiceRoleClient()
  let builder = client
    .from('admin_store_products')
    .select('slug, title, short_label, size, fallback_price, image_url, badge, description, included, is_active, display_order')
  if (!allowInactive) builder = builder.eq('is_active', true)
  const { data, error } = await builder
    .order('display_order', { ascending: true })
    .order('slug', { ascending: true })

  if (error) {
    if (isMissingStoreProductsTable(error)) {
      return NextResponse.json({
        products: await withRepresentativeImages(client, await readLocalStoreProducts()),
        fallback: true,
        localFallback: true,
      })
    }
    console.error('[store-products GET] DB error:', error)
    return NextResponse.json({ products: await withRepresentativeImages(client, STORE_PRODUCTS), fallback: true })
  }

  const products = ((data ?? []) as StoreProductRow[]).map(mapStoreProductRow)
  return NextResponse.json({
    products: await withRepresentativeImages(client, products),
  })
}
