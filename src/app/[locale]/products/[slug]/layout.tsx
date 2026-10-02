import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createMetadata, localizePublicPath } from '@/lib/seo/metadata'
import { resolveProgramLocale } from '@/lib/programs/program-seo'
import { lookupStoreProduct } from '@/lib/products/store-products-server'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale: rawLocale, slug: rawSlug } = await params
  const locale = resolveProgramLocale(rawLocale)
  const slug = decodeURIComponent(rawSlug)
  const lookup = await lookupStoreProduct(slug)
  if (lookup.status !== 'found') return {}

  const { product } = lookup
  const t = await getTranslations({ locale })
  // 표준 상품은 번역 키(store.items.<slug>), 관리자 커스텀 상품은 DB 원문
  const base = `store.items.${slug}`
  const title = t.has(`${base}.title`) ? t(`${base}.title`) : product.title
  const description = t.has(`${base}.description`) ? t(`${base}.description`) : product.description

  return createMetadata({
    title,
    description: description.replace(/\s+/g, ' ').trim() || t('metadata.pages.products.description'),
    path: localizePublicPath(`/products/${slug}`, locale),
    locale,
    noIndex: product.isActive === false,
    openGraph: product.image.startsWith('http') ? { images: [{ url: product.image, alt: title }] } : undefined,
  })
}

export default async function ProductDetailLayout({ children, params }: Props) {
  const { slug } = await params
  // 없는 상품 주소는 200 대신 404 (조회 실패는 단정하지 않고 클라이언트 판단에 맡긴다)
  if ((await lookupStoreProduct(decodeURIComponent(slug))).status === 'missing') notFound()
  return <>{children}</>
}
