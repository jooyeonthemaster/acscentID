import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('docs/product-image-research/references/web/supplementary-pages')
const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const sources = [
  { slug: 'official-home', url: 'https://www.acscent.co.kr/' },
  { slug: 'official-image-analysis', url: 'https://www.acscent.co.kr/programs/idol-image' },
  { slug: 'official-layering', url: 'https://www.acscent.co.kr/programs/chemistry' },
  { slug: 'official-ai-scent-strip', url: 'https://www.acscent.co.kr/programs/sample' },
  { slug: 'official-products', url: 'https://www.acscent.co.kr/products' },
  { slug: 'official-product-10ml', url: 'https://www.acscent.co.kr/products/perfume-10ml' },
  { slug: 'official-product-50ml', url: 'https://www.acscent.co.kr/products/perfume-50ml' },
  { slug: 'official-product-scent-paper', url: 'https://www.acscent.co.kr/products/scent-paper' },
  { slug: 'fever-experience', url: 'https://feverup.com/m/409970/en' },
  { slug: 'perto-experience', url: 'https://en.perto.com/series/ac-scent-id-ai-773532/' },
  { slug: 'tistory-review', url: 'https://giri2.tistory.com/638' },
  { slug: 'note-japan-review', url: 'https://note.com/kpopwriter/n/n7f3b50e3321b?hl=en' },
  { slug: 'neander-experience', url: 'https://neander.co.kr/experience' },
  { slug: 'neander-en', url: 'https://neander.co.kr/en' },
  { slug: 'korea-grand-sale-review', url: 'https://en.koreagrandsale.co.kr/trend/3155' },
  { slug: 'hanyang-korea-grand-sale', url: 'https://oia.hanyang.ac.kr/notice/1814578' },
  { slug: 'offmate-jeno-event', url: 'https://www.offmate.kr/place/birthday-cafe/detail/13546' },
]

function decodeEntities(value) {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|article|section|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchSource(source) {
  const directory = path.join(root, source.slug)
  await fs.mkdir(directory, { recursive: true })
  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'user-agent': userAgent,
      },
    })
    const html = await response.text()
    const text = htmlToText(html)
    await fs.writeFile(path.join(directory, 'source.html'), html)
    await fs.writeFile(path.join(directory, 'text.txt'), `${text}\n`)
    const record = {
      ...source,
      finalUrl: response.url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      htmlBytes: Buffer.byteLength(html),
      textCharacters: text.length,
      fetchedAt: new Date().toISOString(),
    }
    await fs.writeFile(path.join(directory, 'source.json'), `${JSON.stringify(record, null, 2)}\n`)
    return record
  } catch (error) {
    const record = { ...source, error: error.message, fetchedAt: new Date().toISOString() }
    await fs.writeFile(path.join(directory, 'source.json'), `${JSON.stringify(record, null, 2)}\n`)
    return record
  }
}

await fs.mkdir(root, { recursive: true })
const results = []
for (const source of sources) {
  results.push(await fetchSource(source))
}
const index = {
  generatedAt: new Date().toISOString(),
  sourceCount: results.length,
  successfulSourceCount: results.filter((source) => !source.error && source.status < 400).length,
  sources: results,
}
await fs.writeFile(path.join(root, 'index.json'), `${JSON.stringify(index, null, 2)}\n`)
console.log(JSON.stringify(index, null, 2))
