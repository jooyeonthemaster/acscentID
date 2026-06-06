import { promises as fs } from 'fs'
import path from 'path'
import {
  STORE_PRODUCT_IMAGE,
  STORE_PRODUCTS,
  type StoreProduct,
} from './store-products'

const STORE_FILE = path.join(process.cwd(), '.data', 'admin-store-products.json')

interface LocalStoreProductsFile {
  updatedAt: string
  products: StoreProduct[]
}

function normalizeLocalProduct(product: Partial<StoreProduct>, fallback?: StoreProduct): StoreProduct {
  const title = product.title || fallback?.title || '상품'
  return {
    slug: product.slug || fallback?.slug || '',
    title,
    shortLabel: product.shortLabel || fallback?.shortLabel || title,
    size: product.size || fallback?.size || '',
    fallbackPrice: Number.isInteger(product.fallbackPrice) ? product.fallbackPrice! : fallback?.fallbackPrice ?? 0,
    image: product.image || fallback?.image || STORE_PRODUCT_IMAGE,
    badge: product.badge || fallback?.badge || '상품',
    description: product.description ?? fallback?.description ?? '',
    included: Array.isArray(product.included) ? product.included : fallback?.included ?? [],
    isActive: product.isActive ?? fallback?.isActive ?? true,
    displayOrder: Number.isInteger(product.displayOrder) ? product.displayOrder : fallback?.displayOrder ?? 0,
  }
}

export async function readLocalStoreProducts(): Promise<StoreProduct[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<LocalStoreProductsFile>
    if (!Array.isArray(parsed.products)) return STORE_PRODUCTS
    return parsed.products
      .map((product) => {
        const fallback = STORE_PRODUCTS.find((item) => item.slug === product.slug || item.size === product.size)
        return normalizeLocalProduct(product, fallback)
      })
      .filter((product) => product.slug && product.size)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.slug.localeCompare(b.slug))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return STORE_PRODUCTS
    }
    console.error('[store-products-local] read failed:', error)
    return STORE_PRODUCTS
  }
}

export async function writeLocalStoreProducts(products: StoreProduct[]): Promise<void> {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true })
  const sortedProducts = [...products].sort((a, b) => {
    const orderA = a.displayOrder ?? 0
    const orderB = b.displayOrder ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.slug.localeCompare(b.slug)
  })
  const payload: LocalStoreProductsFile = {
    updatedAt: new Date().toISOString(),
    products: sortedProducts,
  }
  const tmpFile = `${STORE_FILE}.tmp`
  await fs.writeFile(tmpFile, JSON.stringify(payload, null, 2), 'utf8')
  await fs.rename(tmpFile, STORE_FILE)
}

