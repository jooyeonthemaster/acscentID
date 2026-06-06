import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { buildDefaultProductDetailTemplate } from '@/lib/products/detail-template'
import {
  STORE_PRODUCT_IMAGE,
  STORE_PRODUCT_TYPE,
  STORE_PRODUCTS,
  applyRepresentativeProductImages,
  mapStoreProductRow,
  normalizeIncluded,
  type StoreProduct,
  type StoreProductImageRow,
  type StoreProductRow,
} from '@/lib/products/store-products'
import { readLocalStoreProducts, writeLocalStoreProducts } from '@/lib/products/store-products-local'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const numberValue = Number(value)
  return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null
}

function isMissingStoreProductsTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  return (
    candidate.code === 'PGRST205' ||
    candidate.code === '42P01' ||
    Boolean(candidate.message?.includes('admin_store_products'))
  )
}

function validateSlug(slug: string): string | null {
  if (!slug) return 'slug는 필수입니다'
  if (slug.length > 64) return 'slug는 64자 이하여야 합니다'
  if (!SLUG_PATTERN.test(slug)) return 'slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다'
  return null
}

async function nextDisplayOrder(client: ReturnType<typeof createServiceRoleClient>) {
  const { data } = await client
    .from('admin_store_products')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.display_order ?? -1) + 1
}

async function upsertStorePricing({
  client,
  size,
  label,
  price,
  isActive = true,
  adminEmail,
}: {
  client: ReturnType<typeof createServiceRoleClient>
  size: string
  label: string
  price: number
  isActive?: boolean
  adminEmail: string
}) {
  await client
    .from('admin_product_pricing')
    .upsert({
      product_type: STORE_PRODUCT_TYPE,
      size,
      label,
      price,
      original_price: null,
      is_active: isActive,
      updated_by: adminEmail,
    }, { onConflict: 'product_type,size' })
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
    console.error('[admin/store-products GET] representative image query failed:', error)
    return products
  }

  return applyRepresentativeProductImages(products, (data ?? []) as StoreProductImageRow[])
}

function nextLocalDisplayOrder(products: StoreProduct[]): number {
  return products.length > 0
    ? Math.max(...products.map((product) => product.displayOrder ?? 0)) + 1
    : 0
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_store_products')
    .select('*')
    .order('display_order', { ascending: true })
    .order('slug', { ascending: true })

  if (error) {
    if (isMissingStoreProductsTable(error)) {
      return NextResponse.json({
        products: await withRepresentativeImages(client, await readLocalStoreProducts()),
        unavailable: true,
        localFallback: true,
      })
    }
    console.error('[admin/store-products GET] DB error:', error)
    return NextResponse.json({ error: '상품 목록 조회 실패', details: error.message }, { status: 500 })
  }

  const products = ((data ?? []) as StoreProductRow[]).map(mapStoreProductRow)
  return NextResponse.json({
    products: await withRepresentativeImages(client, products),
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const slug = cleanText(body.slug).toLowerCase()
  const title = cleanText(body.title)
  const shortLabel = cleanText(body.short_label) || title
  const size = cleanText(body.size).toLowerCase()
  const badge = cleanText(body.badge) || '상품'
  const description = cleanText(body.description)
  const imageUrl = cleanText(body.image_url) || null
  const fallbackPrice = cleanInteger(body.fallback_price)
  const displayOrder = cleanInteger(body.display_order)
  const included = normalizeIncluded(body.included)
  const slugError = validateSlug(slug)

  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })
  if (!title) return NextResponse.json({ error: '상품명은 필수입니다' }, { status: 400 })
  if (!size) return NextResponse.json({ error: '옵션/사이즈 코드는 필수입니다' }, { status: 400 })
  if (fallbackPrice === null) return NextResponse.json({ error: '가격은 0 이상의 정수여야 합니다' }, { status: 400 })

  const client = createServiceRoleClient()
  const now = new Date().toISOString()
  const order = displayOrder ?? await nextDisplayOrder(client)

  const { data, error } = await client
    .from('admin_store_products')
    .insert({
      slug,
      title,
      short_label: shortLabel,
      size,
      fallback_price: fallbackPrice,
      image_url: imageUrl,
      badge,
      description,
      included,
      is_active: body.is_active ?? true,
      display_order: order,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingStoreProductsTable(error)) {
      const localProducts = await readLocalStoreProducts()
      if (localProducts.some((product) => product.slug === slug || product.size === size)) {
        return NextResponse.json({ error: '이미 사용 중인 slug 또는 옵션 코드입니다' }, { status: 409 })
      }

      const product: StoreProduct = {
        slug,
        title,
        shortLabel,
        size,
        fallbackPrice,
        image: imageUrl || STORE_PRODUCT_IMAGE,
        badge,
        description,
        included,
        isActive: body.is_active ?? true,
        displayOrder: displayOrder ?? nextLocalDisplayOrder(localProducts),
      }
      await writeLocalStoreProducts([...localProducts, product])
      await upsertStorePricing({
        client,
        size,
        label: title,
        price: fallbackPrice,
        isActive: product.isActive ?? true,
        adminEmail: admin.email,
      })

      const templateHtml = buildDefaultProductDetailTemplate({ slug, name: title })
      await client
        .from('admin_product_details')
        .upsert({
          slug,
          detail_mode: 'custom',
          custom_html: templateHtml,
          published_detail_mode: 'default',
          published_html: null,
          updated_at: now,
          published_at: null,
        }, { onConflict: 'slug' })

      const [withImage] = await withRepresentativeImages(client, [product])
      return NextResponse.json({ product: withImage, unavailable: true, localFallback: true }, { status: 201 })
    }
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 slug 또는 옵션 코드입니다' }, { status: 409 })
    }
    console.error('[admin/store-products POST] DB error:', error)
    return NextResponse.json({ error: '상품 추가 실패', details: error.message }, { status: 500 })
  }

  await upsertStorePricing({
    client,
    size,
    label: title,
    price: fallbackPrice,
    adminEmail: admin.email,
  })

  const templateHtml = buildDefaultProductDetailTemplate({ slug, name: title })
  await client
    .from('admin_product_details')
    .upsert({
      slug,
      detail_mode: 'custom',
      custom_html: templateHtml,
      published_detail_mode: 'default',
      published_html: null,
      updated_at: now,
      published_at: null,
    }, { onConflict: 'slug' })

  return NextResponse.json({ product: mapStoreProductRow(data as StoreProductRow) }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const slug = cleanText(body.slug).toLowerCase()
  const slugError = validateSlug(slug)
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const title = cleanText(body.title)
  const size = cleanText(body.size).toLowerCase()
  const fallbackPrice = body.fallback_price !== undefined ? cleanInteger(body.fallback_price) : undefined

  if (body.title !== undefined) {
    if (!title) return NextResponse.json({ error: '상품명은 비워둘 수 없습니다' }, { status: 400 })
    updates.title = title
  }
  if (body.short_label !== undefined) updates.short_label = cleanText(body.short_label) || title || undefined
  if (body.size !== undefined) {
    if (!size) return NextResponse.json({ error: '옵션/사이즈 코드는 비워둘 수 없습니다' }, { status: 400 })
    updates.size = size
  }
  if (body.badge !== undefined) updates.badge = cleanText(body.badge) || '상품'
  if (body.description !== undefined) updates.description = cleanText(body.description)
  if (body.image_url !== undefined) updates.image_url = cleanText(body.image_url) || null
  if (body.included !== undefined) updates.included = normalizeIncluded(body.included)
  if (body.fallback_price !== undefined) {
    if (fallbackPrice === null) return NextResponse.json({ error: '가격은 0 이상의 정수여야 합니다' }, { status: 400 })
    updates.fallback_price = fallbackPrice
  }
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (body.display_order !== undefined) {
    const displayOrder = cleanInteger(body.display_order)
    if (displayOrder === null) return NextResponse.json({ error: '정렬 순서는 0 이상의 정수여야 합니다' }, { status: 400 })
    updates.display_order = displayOrder
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: '수정할 항목이 없습니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_store_products')
    .update(updates)
    .eq('slug', slug)
    .select('*')
    .single()

  if (error) {
    if (isMissingStoreProductsTable(error)) {
      const localProducts = await readLocalStoreProducts()
      const index = localProducts.findIndex((product) => product.slug === slug)
      if (index < 0) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })

      const current = localProducts[index]
      const nextTitle = body.title !== undefined ? title : current.title
      const nextSize = body.size !== undefined ? size : current.size
      const nextFallbackPrice = body.fallback_price !== undefined ? fallbackPrice ?? 0 : current.fallbackPrice
      const nextDisplayOrder = body.display_order !== undefined
        ? cleanInteger(body.display_order) ?? current.displayOrder ?? 0
        : current.displayOrder ?? 0

      const duplicate = localProducts.find((product) => (
        product.slug !== slug && (product.slug === slug || product.size === nextSize)
      ))
      if (duplicate) {
        return NextResponse.json({ error: '이미 사용 중인 slug 또는 옵션 코드입니다' }, { status: 409 })
      }

      const nextProduct: StoreProduct = {
        ...current,
        title: nextTitle,
        shortLabel: body.short_label !== undefined
          ? cleanText(body.short_label) || nextTitle
          : current.shortLabel,
        size: nextSize,
        fallbackPrice: nextFallbackPrice,
        image: body.image_url !== undefined ? cleanText(body.image_url) || STORE_PRODUCT_IMAGE : current.image,
        badge: body.badge !== undefined ? cleanText(body.badge) || '상품' : current.badge,
        description: body.description !== undefined ? cleanText(body.description) : current.description,
        included: body.included !== undefined ? normalizeIncluded(body.included) : current.included,
        isActive: typeof body.is_active === 'boolean' ? body.is_active : current.isActive ?? true,
        displayOrder: nextDisplayOrder,
      }

      const nextProducts = [...localProducts]
      nextProducts[index] = nextProduct
      await writeLocalStoreProducts(nextProducts)

      if (
        body.title !== undefined ||
        body.fallback_price !== undefined ||
        body.size !== undefined ||
        typeof body.is_active === 'boolean'
      ) {
        await upsertStorePricing({
          client,
          size: nextProduct.size,
          label: nextProduct.title,
          price: nextProduct.fallbackPrice,
          isActive: nextProduct.isActive ?? true,
          adminEmail: admin.email,
        })
      }

      const [withImage] = await withRepresentativeImages(client, [nextProduct])
      return NextResponse.json({ product: withImage, unavailable: true, localFallback: true })
    }
    console.error('[admin/store-products PATCH] DB error:', error)
    return NextResponse.json({ error: '상품 저장 실패', details: error.message }, { status: 500 })
  }

  const row = data as StoreProductRow
  if (body.title !== undefined || body.fallback_price !== undefined || body.size !== undefined || typeof body.is_active === 'boolean') {
    await upsertStorePricing({
      client,
      size: row.size,
      label: row.title,
      price: row.fallback_price ?? 0,
      isActive: row.is_active ?? true,
      adminEmail: admin.email,
    })
  }

  return NextResponse.json({ product: mapStoreProductRow(row) })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const slug = cleanText(body.slug).toLowerCase()
  const slugError = validateSlug(slug)
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_store_products')
    .delete()
    .eq('slug', slug)
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingStoreProductsTable(error)) {
      const localProducts = await readLocalStoreProducts()
      const deleted = localProducts.find((product) => product.slug === slug)
      if (!deleted) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })

      await writeLocalStoreProducts(localProducts.filter((product) => product.slug !== slug))
      await client
        .from('admin_product_pricing')
        .update({ is_active: false, updated_by: admin.email })
        .eq('product_type', STORE_PRODUCT_TYPE)
        .eq('size', deleted.size)

      return NextResponse.json({ deleted, unavailable: true, localFallback: true })
    }
    console.error('[admin/store-products DELETE] DB error:', error)
    return NextResponse.json({ error: '상품 삭제 실패', details: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json({ deleted: mapStoreProductRow(data as StoreProductRow) })
}
