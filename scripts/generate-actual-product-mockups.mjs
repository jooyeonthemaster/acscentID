import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', 'design-mockups')
const ASSET_DIR = path.join(OUT_DIR, 'actual-product-assets')

const W = 852
const H = 1846

const COLORS = {
  bg: '#f6f1e8',
  surface: '#fffdf8',
  surface2: '#fbf7ef',
  ink: '#1d1a16',
  muted: '#716b61',
  soft: '#a09a90',
  line: '#e6dccd',
  yellow: '#f6c945',
  yellow2: '#fff2b5',
  dark: '#24211d',
  green: '#2f7a56',
  red: '#b9563f',
}

const PRODUCT_TYPE_BY_SLUG = {
  'idol-image': 'image_analysis',
  chemistry: 'chemistry_set',
  sample: 'image_analysis_paper',
  figure: 'figure_diffuser',
  graduation: 'graduation',
  personal: 'personal_scent',
  'le-quack': 'signature',
}

const SLUG_BY_PRODUCT_TYPE = Object.fromEntries(
  Object.entries(PRODUCT_TYPE_BY_SLUG).map(([slug, type]) => [type, slug]),
)

const FALLBACK_IMAGES = {
  'idol-image': '/images/perfume/KakaoTalk_20260125_225218071.jpg',
  chemistry: '/images/chemistry/chemistry-thumbnail.jpg',
  sample: null,
  figure: '/images/diffuser/KakaoTalk_20260125_225229624.jpg',
  graduation: '/images/jollduck/KakaoTalk_20260130_201156204.jpg',
  personal: '/제목 없는 디자인 (4)/1.png',
  'le-quack': '/images/perfume/LE QUACK.avif',
}

const SUBTITLES = {
  'idol-image': '좋아하는 이미지로 추출하는 나만의 퍼퓸',
  chemistry: '두 주인공의 케미를 향기로 담는 세트',
  sample: '이미지 한 장으로 받아보는 향 추천 시향지',
  figure: '좋아하는 이미지로 제작되는 나만의 화분 피규어 디퓨저',
  graduation: '졸업의 순간을 향으로 기록하는 기념 퍼퓸',
  personal: '나를 위한 시그니처 향',
  'le-quack': '시그니처 퍼퓸 + 오리 키링',
}

const PACKAGES = {
  'idol-image': ['뿌덕퍼퓸 10ml / 50ml', '실물 분석보고서', 'AI 이미지 분석 리포트'],
  chemistry: ['케미 향수 세트 10ml x 2', '케미 향수 세트 50ml x 2', '시향지 2매 옵션'],
  sample: ['AI 이미지 분석 시향지 1매', 'AI 이미지 분석 보고서 1매', '배송형 미니 리포트'],
  figure: ['피규어 + 디퓨저 세트', '사쉐스톤', 'AI 맞춤 향 에센스'],
}

function loadEnvFile() {
  return fs
    .readFile(path.join(ROOT, '.env.local'), 'utf8')
    .then((raw) => {
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx === -1) continue
        const key = trimmed.slice(0, idx)
        const value = trimmed.slice(idx + 1)
        if (!process.env[key]) process.env[key] = value
      }
    })
    .catch(() => {})
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(value) {
  return `₩${Number(value || 0).toLocaleString('ko-KR')}`
}

function discount(row) {
  if (!row?.original_price || row.original_price <= row.price) return null
  return `${Math.round(((row.original_price - row.price) / row.original_price) * 100)}% OFF`
}

function activeOptions(product, pricingByType) {
  const type = PRODUCT_TYPE_BY_SLUG[product.slug]
  return (pricingByType[type] || []).filter((row) => row.is_active)
}

function primaryDisplayOptions(product, pricingByType) {
  const options = activeOptions(product, pricingByType)
  if (product.slug === 'sample') return options
  const primary = options.filter((row) => !String(row.size).includes('scent_paper'))
  return primary.length ? primary : options
}

function minPriceText(options) {
  if (!options.length) return '가격 미정'
  const min = options.reduce((acc, row) => (row.price < acc.price ? row : acc), options[0])
  return `${money(min.price)}${options.length > 1 ? '~' : ''}`
}

function wrapText(text, max = 18) {
  const value = String(text || '')
  const chunks = []
  let line = ''
  for (const token of value.split(' ')) {
    const next = line ? `${line} ${token}` : token
    if ([...next].length > max && line) {
      chunks.push(line)
      line = token
    } else {
      line = next
    }
  }
  if (line) chunks.push(line)
  return chunks.length ? chunks : ['']
}

function textBlock(text, x, y, size, color, opts = {}) {
  const {
    weight = 500,
    maxChars = 24,
    lineHeight = Math.round(size * 1.38),
    anchor = 'start',
    opacity = 1,
  } = opts
  return wrapText(text, maxChars)
    .map((line, idx) => {
      const dy = idx === 0 ? 0 : lineHeight
      return `<text x="${x}" y="${y + dy}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}" opacity="${opacity}">${esc(line)}</text>`
    })
    .join('')
}

function pill(x, y, text, opts = {}) {
  const {
    fill = COLORS.surface2,
    stroke = COLORS.line,
    color = COLORS.ink,
    width = Math.max(72, [...String(text)].length * 14 + 34),
    size = 20,
    weight = 700,
  } = opts
  return `
    <rect x="${x}" y="${y}" width="${width}" height="38" rx="19" fill="${fill}" stroke="${stroke}"/>
    <text x="${x + width / 2}" y="${y + 25}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(text)}</text>
  `
}

function iconCircle(x, y, label, fill = COLORS.surface) {
  return `
    <circle cx="${x}" cy="${y}" r="26" fill="${fill}" stroke="${COLORS.line}"/>
    <text x="${x}" y="${y + 7}" text-anchor="middle" font-size="22" font-weight="700" fill="${COLORS.ink}">${esc(label)}</text>
  `
}

function priceRows(options, x, y, width) {
  return options
    .map((row, idx) => {
      const yy = y + idx * 72
      const off = discount(row)
      const labelX = off ? x + 136 : x + 22
      return `
        <rect x="${x}" y="${yy}" width="${width}" height="58" rx="8" fill="${idx === 0 ? COLORS.yellow2 : COLORS.surface}" stroke="${idx === 0 ? COLORS.yellow : COLORS.line}"/>
        <text x="${labelX}" y="${yy + 37}" font-size="24" font-weight="750" fill="${COLORS.ink}">${esc(row.label)}</text>
        <text x="${x + width - 22}" y="${yy + 35}" text-anchor="end" font-size="25" font-weight="800" fill="${COLORS.ink}">${money(row.price)}</text>
        ${row.original_price ? `<text x="${x + width - 22}" y="${yy + 52}" text-anchor="end" font-size="16" fill="${COLORS.soft}" text-decoration="line-through">${money(row.original_price)}</text>` : ''}
        ${off ? pill(x + 18, yy + 10, off, { fill: COLORS.yellow, stroke: COLORS.yellow, width: 100, size: 16 }) : ''}
      `
    })
    .join('')
}

function imageTag(asset, x, y, w, h, id, fit = 'cover') {
  const preserveAspectRatio = fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'
  return `
    <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/></clipPath>
    <image href="${asset.dataUri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${preserveAspectRatio}" clip-path="url(#${id})"/>
  `
}

function baseSvg(inner) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#1d1a16" flood-opacity="0.08"/>
      </filter>
      <style>
        text { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif; letter-spacing: 0; }
      </style>
    </defs>
    <rect width="${W}" height="${H}" fill="${COLORS.bg}"/>
    ${inner}
  </svg>
  `
}

async function fetchDb() {
  await loadEnvFile()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env values are missing.')
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const [productsRes, imagesRes, pricingRes] = await Promise.all([
    supabase.from('admin_products').select('*').order('display_order', { ascending: true }),
    supabase
      .from('admin_product_images')
      .select('*')
      .order('product_slug', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('admin_product_pricing')
      .select('*')
      .order('product_type', { ascending: true })
      .order('sort_order', { ascending: true }),
  ])

  for (const res of [productsRes, imagesRes, pricingRes]) {
    if (res.error) throw new Error(res.error.message)
  }

  const pricingByType = {}
  for (const row of pricingRes.data || []) {
    if (!pricingByType[row.product_type]) pricingByType[row.product_type] = []
    pricingByType[row.product_type].push(row)
  }

  const imagesBySlug = {}
  for (const row of imagesRes.data || []) {
    if (!imagesBySlug[row.product_slug]) imagesBySlug[row.product_slug] = []
    imagesBySlug[row.product_slug].push(row)
  }

  return {
    products: productsRes.data || [],
    imagesBySlug,
    pricingByType,
  }
}

function resolveImageSource(slug, imagesBySlug, pricingByType) {
  const direct = imagesBySlug[slug]?.find((row) => row.image_type === 'gallery')?.image_url
  if (direct) return direct
  const type = PRODUCT_TYPE_BY_SLUG[slug]
  const pricingImage = pricingByType[type]?.find((row) => row.image_url)?.image_url
  if (pricingImage) return pricingImage
  return FALLBACK_IMAGES[slug]
}

async function readImageSource(source) {
  if (!source) return null
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source)
    if (!res.ok) throw new Error(`Failed to fetch ${source}: ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
  const relative = source.startsWith('/') ? source.slice(1) : source
  return fs.readFile(path.join(ROOT, 'public', relative))
}

async function createAsset(slug, source) {
  const raw = await readImageSource(source)
  if (!raw) return null
  const png = await sharp(raw).rotate().resize(920, 920, { fit: 'cover' }).png().toBuffer()
  const filename = `${slug}.png`
  const out = path.join(ASSET_DIR, filename)
  await fs.writeFile(out, png)
  return {
    path: out,
    dataUri: `data:image/png;base64,${png.toString('base64')}`,
  }
}

async function createAssets(products, imagesBySlug, pricingByType) {
  await fs.mkdir(ASSET_DIR, { recursive: true })
  const assets = {}
  for (const product of products) {
    const source = resolveImageSource(product.slug, imagesBySlug, pricingByType)
    if (!source) continue
    try {
      assets[product.slug] = await createAsset(product.slug, source)
    } catch (error) {
      console.warn(`[mockups] skipped image for ${product.slug}: ${error.message}`)
    }
  }
  return assets
}

function header(title = '') {
  return `
    <rect x="0" y="0" width="${W}" height="98" fill="${COLORS.surface}" stroke="${COLORS.line}"/>
    <text x="44" y="62" font-size="26" font-weight="800" fill="${COLORS.ink}">AC'SCENT</text>
    <text x="44" y="82" font-size="11" font-weight="700" fill="${COLORS.soft}" letter-spacing="2">IDENTITY</text>
    ${title ? `<text x="${W / 2}" y="63" text-anchor="middle" font-size="22" font-weight="750" fill="${COLORS.ink}">${esc(title)}</text>` : ''}
    ${iconCircle(W - 104, 52, '⌕')}
    ${iconCircle(W - 46, 52, 'Bag')}
  `
}

function productCard(product, options, asset, x, y, w, h, index) {
  const off = discount(options[0])
  const titleLines = wrapText(product.name, 10).slice(0, 2)
  const descLines = wrapText(SUBTITLES[product.slug] || '', 14).slice(0, titleLines.length > 1 ? 1 : 2)
  const titleSvg = titleLines
    .map((line, idx) => `<text x="${x + 22}" y="${y + 302 + idx * 38}" font-size="26" font-weight="850" fill="${COLORS.ink}">${esc(line)}</text>`)
    .join('')
  const descY = titleLines.length > 1 ? y + 376 : y + 346
  const descSvg = descLines
    .map((line, idx) => `<text x="${x + 22}" y="${descY + idx * 26}" font-size="17" font-weight="600" fill="${COLORS.muted}">${esc(line)}</text>`)
    .join('')
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}" filter="url(#shadow)"/>
    ${asset ? imageTag(asset, x + 14, y + 14, w - 28, 248, `card-${product.slug}-${index}`) : ''}
    ${pill(x + 28, y + 30, product.is_active ? '판매중' : '비활성', {
      fill: product.is_active ? COLORS.yellow : COLORS.surface2,
      stroke: product.is_active ? COLORS.yellow : COLORS.line,
      width: product.is_active ? 76 : 82,
      size: 16,
    })}
    ${off ? pill(x + w - 126, y + 30, off, { fill: COLORS.dark, stroke: COLORS.dark, color: '#fff', width: 96, size: 16 }) : ''}
    ${titleSvg}
    ${descSvg}
    <text x="${x + 22}" y="${y + h - 28}" font-size="26" font-weight="850" fill="${COLORS.ink}">${minPriceText(options)}</text>
    <text x="${x + w - 22}" y="${y + h - 28}" text-anchor="end" font-size="17" font-weight="700" fill="${COLORS.green}">2-3일 배송</text>
  `
}

function homePage(data, assets) {
  const activeProducts = data.products
    .filter((p) => p.is_active && PRODUCT_TYPE_BY_SLUG[p.slug])
    .filter((p) => activeOptions(p, data.pricingByType).length)

  const heroProduct = activeProducts[0]
  const heroOptions = primaryDisplayOptions(heroProduct, data.pricingByType)
  const second = activeProducts[1] || activeProducts[0]
  const secondOptions = primaryDisplayOptions(second, data.pricingByType)

  let cards = ''
  const layout = [
    [40, 712],
    [438, 712],
    [40, 1196],
    [438, 1196],
  ]
  activeProducts.slice(0, 4).forEach((product, index) => {
    cards += productCard(
      product,
      primaryDisplayOptions(product, data.pricingByType),
      assets[product.slug],
      layout[index][0],
      layout[index][1],
      374,
      438,
      index,
    )
  })

  const inactive = data.products
    .filter((p) => !p.is_active && ['figure', 'graduation', 'le-quack', 'personal'].includes(p.slug))
    .slice(0, 3)
    .map((p) => p.name)
    .join(' · ')

  return baseSvg(`
    ${header()}
    <rect x="40" y="136" width="772" height="500" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}" filter="url(#shadow)"/>
    <rect x="40" y="136" width="772" height="500" rx="8" fill="#171512"/>
    ${assets[heroProduct.slug] ? imageTag(assets[heroProduct.slug], 454, 156, 352, 460, 'hero-product') : ''}
    <rect x="40" y="136" width="772" height="500" rx="8" fill="url(#heroGrad)" opacity="0"/>
    <text x="76" y="208" font-size="18" font-weight="800" fill="${COLORS.yellow}">ACTUAL DB PRODUCT</text>
    <text x="76" y="270" font-size="49" font-weight="850" fill="#fff">실제 상품 사진</text>
    <text x="76" y="328" font-size="49" font-weight="850" fill="#fff">기반 리디자인</text>
    ${textBlock(`${heroProduct.name} · ${minPriceText(heroOptions)}`, 76, 400, 25, '#efe7d8', { weight: 700, maxChars: 26 })}
    ${pill(76, 484, '분석 시작', { fill: COLORS.yellow, stroke: COLORS.yellow, width: 148, size: 22 })}
    ${pill(246, 484, '프로그램 보기', { fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(255,255,255,0.32)', color: '#fff', width: 164, size: 20 })}
    <text x="40" y="690" font-size="30" font-weight="850" fill="${COLORS.ink}">판매중인 프로그램</text>
    ${cards}
    <rect x="40" y="1662" width="772" height="112" rx="8" fill="${COLORS.dark}"/>
    <text x="72" y="1710" font-size="24" font-weight="850" fill="#fff">DB 기준 비활성 상품</text>
    <text x="72" y="1748" font-size="20" font-weight="600" fill="#d9d0c1">${esc(inactive || '없음')}</text>
    <text x="W" y="0"></text>
  `)
}

function detailPage(product, data, assets, opts = {}) {
  const options = activeOptions(product, data.pricingByType)
  const displayOptions = primaryDisplayOptions(product, data.pricingByType)
  const asset = assets[product.slug]
  const primary = options[0]
  const title = opts.title || product.name
  const kicker = opts.kicker || (product.is_active ? '판매중' : '비활성')
  const body = opts.body || SUBTITLES[product.slug] || ''
  const packageItems = opts.packageItems || PACKAGES[product.slug] || options.map((row) => row.label)
  const topY = 132

  return baseSvg(`
    ${header('상품 상세')}
    <rect x="40" y="${topY}" width="772" height="610" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}" filter="url(#shadow)"/>
    ${asset ? imageTag(asset, 60, topY + 20, 732, 412, `detail-${product.slug}`) : ''}
    ${pill(70, topY + 36, kicker, { fill: COLORS.yellow, stroke: COLORS.yellow, width: 92, size: 17 })}
    <text x="70" y="${topY + 482}" font-size="18" font-weight="750" fill="${COLORS.muted}">홈 · 프로그램 · ${esc(title)}</text>
    ${textBlock(title, 70, topY + 534, 42, COLORS.ink, { weight: 850, maxChars: 15, lineHeight: 52 })}
    ${textBlock(body, 70, topY + 592, 22, COLORS.muted, { maxChars: 30, lineHeight: 32 })}

    <rect x="40" y="782" width="772" height="210" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}"/>
    <text x="70" y="836" font-size="28" font-weight="850" fill="${COLORS.ink}">상품 구성</text>
    ${packageItems
      .slice(0, 3)
      .map((item, idx) => {
        const x = 70 + idx * 244
        return `
          <rect x="${x}" y="868" width="218" height="82" rx="8" fill="${idx === 0 ? COLORS.yellow2 : COLORS.surface2}" stroke="${COLORS.line}"/>
          <text x="${x + 18}" y="904" font-size="18" font-weight="850" fill="${COLORS.ink}">0${idx + 1}</text>
          ${textBlock(item, x + 54, 902, 18, COLORS.ink, { weight: 700, maxChars: 9, lineHeight: 24 })}
        `
      })
      .join('')}

    <rect x="40" y="1030" width="772" height="${Math.max(340, options.length * 72 + 120)}" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}"/>
    <text x="70" y="1084" font-size="28" font-weight="850" fill="${COLORS.ink}">실제 판매 옵션</text>
    <text x="70" y="1120" font-size="18" font-weight="600" fill="${COLORS.muted}">Supabase admin_product_pricing 기준</text>
    ${priceRows(options, 70, 1164, 712)}

    <rect x="40" y="1516" width="772" height="112" rx="8" fill="${COLORS.surface2}" stroke="${COLORS.line}"/>
    <text x="70" y="1560" font-size="22" font-weight="850" fill="${COLORS.ink}">배송 안내</text>
    <text x="70" y="1596" font-size="19" font-weight="600" fill="${COLORS.muted}">주문 후 2-3일 내 배송 · 분석 결과 확인 후 구매 흐름 유지</text>

    <rect x="0" y="1666" width="${W}" height="180" fill="${COLORS.surface}" stroke="${COLORS.line}"/>
    <text x="44" y="1720" font-size="18" font-weight="700" fill="${COLORS.muted}">시작가</text>
    <text x="44" y="1762" font-size="34" font-weight="900" fill="${COLORS.ink}">${minPriceText(displayOptions)}</text>
    <rect x="330" y="1700" width="218" height="68" rx="8" fill="${COLORS.surface2}" stroke="${COLORS.line}"/>
    <text x="439" y="1744" text-anchor="middle" font-size="22" font-weight="800" fill="${COLORS.ink}">장바구니</text>
    <rect x="572" y="1700" width="240" height="68" rx="8" fill="${COLORS.yellow}"/>
    <text x="692" y="1744" text-anchor="middle" font-size="22" font-weight="850" fill="${COLORS.ink}">${opts.cta || '구매하기'}</text>
  `)
}

function cartPage(data, assets) {
  const items = [
    { slug: 'idol-image', option: data.pricingByType.image_analysis?.find((row) => row.size === '10ml') },
    { slug: 'chemistry', option: data.pricingByType.chemistry_set?.find((row) => row.size === 'set_10ml') },
    { slug: 'sample', option: data.pricingByType.image_analysis_paper?.find((row) => row.size === 'set') },
  ].filter((item) => item.option)

  const productsBySlug = Object.fromEntries(data.products.map((product) => [product.slug, product]))
  const total = items.reduce((sum, item) => sum + item.option.price, 0)

  return baseSvg(`
    ${header('마이페이지')}
    <rect x="40" y="132" width="772" height="160" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}" filter="url(#shadow)"/>
    <circle cx="104" cy="212" r="42" fill="${COLORS.yellow}"/>
    <text x="104" y="225" text-anchor="middle" font-size="30" font-weight="850" fill="${COLORS.ink}">AC</text>
    <text x="164" y="196" font-size="28" font-weight="850" fill="${COLORS.ink}">김아센</text>
    <text x="164" y="232" font-size="19" font-weight="600" fill="${COLORS.muted}">실제 상품 옵션으로 구성한 장바구니</text>
    ${pill(580, 182, '장바구니 3', { fill: COLORS.yellow, stroke: COLORS.yellow, width: 142, size: 20 })}

    <rect x="40" y="332" width="772" height="64" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}"/>
    ${pill(66, 345, '분석', { fill: COLORS.surface, stroke: COLORS.line, width: 118, size: 18 })}
    ${pill(206, 345, '장바구니', { fill: COLORS.yellow, stroke: COLORS.yellow, width: 142, size: 18 })}
    ${pill(374, 345, '주문', { fill: COLORS.surface, stroke: COLORS.line, width: 118, size: 18 })}
    ${pill(514, 345, '쿠폰', { fill: COLORS.surface, stroke: COLORS.line, width: 118, size: 18 })}

    ${items
      .map((item, idx) => {
        const y = 444 + idx * 258
        const product = productsBySlug[item.slug]
        return `
          <rect x="40" y="${y}" width="772" height="218" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}" filter="url(#shadow)"/>
          ${assets[item.slug] ? imageTag(assets[item.slug], 62, y + 22, 174, 174, `cart-${item.slug}`) : ''}
          <text x="260" y="${y + 56}" font-size="26" font-weight="850" fill="${COLORS.ink}">${esc(product?.name || item.slug)}</text>
          <text x="260" y="${y + 94}" font-size="19" font-weight="650" fill="${COLORS.muted}">${esc(item.option.label)}</text>
          ${item.option.original_price ? `<text x="260" y="${y + 132}" font-size="18" fill="${COLORS.soft}" text-decoration="line-through">${money(item.option.original_price)}</text>` : ''}
          <text x="260" y="${y + 172}" font-size="30" font-weight="900" fill="${COLORS.ink}">${money(item.option.price)}</text>
          <rect x="670" y="${y + 126}" width="84" height="44" rx="8" fill="${COLORS.surface2}" stroke="${COLORS.line}"/>
          <text x="712" y="${y + 156}" text-anchor="middle" font-size="20" font-weight="800" fill="${COLORS.ink}">1개</text>
        `
      })
      .join('')}

    <rect x="40" y="1256" width="772" height="264" rx="8" fill="${COLORS.surface}" stroke="${COLORS.line}"/>
    <text x="70" y="1312" font-size="28" font-weight="850" fill="${COLORS.ink}">결제 요약</text>
    <text x="70" y="1370" font-size="21" font-weight="650" fill="${COLORS.muted}">상품 금액</text>
    <text x="782" y="1370" text-anchor="end" font-size="23" font-weight="800" fill="${COLORS.ink}">${money(total)}</text>
    <text x="70" y="1426" font-size="21" font-weight="650" fill="${COLORS.muted}">배송비</text>
    <text x="782" y="1426" text-anchor="end" font-size="23" font-weight="800" fill="${COLORS.ink}">무료</text>
    <line x1="70" y1="1464" x2="782" y2="1464" stroke="${COLORS.line}"/>
    <text x="70" y="1504" font-size="24" font-weight="850" fill="${COLORS.ink}">총 결제 예정 금액</text>
    <text x="782" y="1504" text-anchor="end" font-size="30" font-weight="900" fill="${COLORS.ink}">${money(total)}</text>

    <rect x="0" y="1666" width="${W}" height="180" fill="${COLORS.surface}" stroke="${COLORS.line}"/>
    <text x="44" y="1720" font-size="18" font-weight="700" fill="${COLORS.muted}">총 3개 상품</text>
    <text x="44" y="1762" font-size="34" font-weight="900" fill="${COLORS.ink}">${money(total)}</text>
    <rect x="524" y="1700" width="288" height="68" rx="8" fill="${COLORS.yellow}"/>
    <text x="668" y="1744" text-anchor="middle" font-size="23" font-weight="850" fill="${COLORS.ink}">결제하기</text>
  `)
}

async function renderPng(name, svg) {
  const out = path.join(OUT_DIR, name)
  await sharp(Buffer.from(svg)).png().toFile(out)
  return out
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const data = await fetchDb()
  const assets = await createAssets(data.products, data.imagesBySlug, data.pricingByType)
  const productsBySlug = Object.fromEntries(data.products.map((product) => [product.slug, product]))

  const outputs = []
  outputs.push(await renderPng('acscent-home-actual-products.png', homePage(data, assets)))
  outputs.push(
    await renderPng(
      'acscent-idol-image-actual-detail.png',
      detailPage(productsBySlug['idol-image'], data, assets, {
        kicker: 'BEST',
        body: '좋아하는 이미지로 추출하는 나만의 퍼퓸. 무료 분석 후 마음에 들 때 결제합니다.',
        cta: '분석 시작',
      }),
    ),
  )
  outputs.push(
    await renderPng(
      'acscent-chemistry-actual-detail.png',
      detailPage(productsBySlug.chemistry, data, assets, {
        kicker: 'SEASON 3',
        body: '두 주인공의 케미를 향기로 담는 레이어링 퍼퓸 세트.',
        cta: '케미 분석',
      }),
    ),
  )
  outputs.push(
    await renderPng(
      'acscent-sample-actual-detail.png',
      detailPage(productsBySlug.sample, data, assets, {
        kicker: 'NEW',
        body: '이미지 한 장에서 시작되는 향 추천 리포트와 시향지 패키지.',
        packageItems: PACKAGES.sample,
        cta: '시향지 주문',
      }),
    ),
  )
  outputs.push(await renderPng('acscent-cart-actual-products.png', cartPage(data, assets)))

  console.log(JSON.stringify({ outputs, assetDir: ASSET_DIR }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
