import type { ProductType } from '@/types/cart'
import { STORE_PRODUCTS } from '@/lib/products/store-products'

export type AdminCatalogKind = 'program' | 'store_product'

export interface AdminProgramDefinition {
  slug: string
  name: string
  description: string
  publicHref: string
  inputHref?: string
  productTypes: ProductType[]
  kind: 'analysis' | 'catalog' | 'signature'
  registryManaged: boolean
}

export interface AdminStoreProductDefinition {
  slug: string
  name: string
  description: string
  publicHref: string
  size: string
  badge: string
  productType: ProductType
}

export const ADMIN_PROGRAMS: AdminProgramDefinition[] = [
  {
    slug: 'idol-image',
    name: 'AI 이미지 분석 퍼퓸',
    description: '이미지 분석으로 향수를 추천하고 10ml/50ml 향수 옵션을 판매합니다.',
    publicHref: '/programs/idol-image',
    inputHref: '/input',
    productTypes: ['image_analysis'],
    kind: 'analysis',
    registryManaged: true,
  },
  {
    slug: 'sample',
    name: 'AI 이미지 분석 시향지',
    description: '이미지 분석 결과를 시향지로 먼저 받아보는 샘플 프로그램입니다.',
    publicHref: '/programs/sample',
    productTypes: ['image_analysis_paper'],
    kind: 'catalog',
    registryManaged: true,
  },
  {
    slug: 'figure',
    name: '피규어 화분 디퓨저',
    description: '피규어 모델링 요청과 디퓨저 세트 주문을 함께 관리합니다.',
    publicHref: '/programs/figure',
    inputHref: '/input?type=figure&mode=online',
    productTypes: ['figure_diffuser'],
    kind: 'analysis',
    registryManaged: true,
  },
  {
    slug: 'graduation',
    name: '졸업 기념 퍼퓸',
    description: '졸업/기념일 메시지 기반 향 추천 프로그램입니다.',
    publicHref: '/programs/graduation',
    inputHref: '/input?type=graduation&mode=online',
    productTypes: ['graduation'],
    kind: 'analysis',
    registryManaged: true,
  },
  {
    slug: 'personal',
    name: '퍼스널 센트',
    description: '개인 취향과 무드 기반으로 향을 추천하는 프로그램입니다.',
    publicHref: '/programs/personal',
    inputHref: '/input?type=personal&mode=online',
    productTypes: ['personal_scent'],
    kind: 'analysis',
    registryManaged: true,
  },
  {
    slug: 'chemistry',
    name: '레이어링 퍼퓸 세트',
    description: '두 캐릭터의 케미를 분석하고 레이어링 세트를 판매합니다.',
    publicHref: '/programs/chemistry',
    inputHref: '/input?type=chemistry&mode=online',
    productTypes: ['chemistry_set'],
    kind: 'analysis',
    registryManaged: true,
  },
  {
    slug: 'le-quack',
    name: 'LE QUACK 시그니처',
    description: '분석 없이 바로 구매하는 시그니처 프로그램형 상품입니다.',
    publicHref: '/programs/le-quack',
    productTypes: ['signature'],
    kind: 'signature',
    registryManaged: true,
  },
  {
    slug: 'today-scent',
    name: '오늘의 향',
    description: '하루의 추천 향을 선택해 바로 구매하는 카탈로그형 프로그램입니다.',
    publicHref: '/programs/today-scent',
    productTypes: ['today_scent'],
    kind: 'catalog',
    registryManaged: false,
  },
]

export const ADMIN_PROGRAM_SLUGS = new Set(ADMIN_PROGRAMS.map((program) => program.slug))

export const ADMIN_STORE_PRODUCTS: AdminStoreProductDefinition[] = STORE_PRODUCTS.map((product) => ({
  slug: product.slug,
  name: product.title,
  description: product.description,
  publicHref: `/products/${product.slug}`,
  size: product.size,
  badge: product.badge,
  productType: 'store_product',
}))

export function getAdminProgram(slug: string | null | undefined): AdminProgramDefinition | undefined {
  if (!slug) return undefined
  return ADMIN_PROGRAMS.find((program) => program.slug === slug)
}
