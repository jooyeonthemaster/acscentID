/**
 * 펀그라운드 B안 타임캡슐 포토 「LATER!」 미래 장면 배경 — 개발 중 한 번만 만든다(설치 기기 · 데모는 이 파일만 쓰고 AI 를 부르지 않는다).
 *
 * 만든 그림: public/assets/booth-programs/funground-later/<id>.webp (1200×1800, 4×6 인화 원판 크기)
 * 「우주 정거장」은 THEME! 배경(funground-theme/space.webp)을 그대로 쓴다 — 여기서는 새 장면(미래 도시 · 하늘 위 학교)만 만든다.
 * 화면(/booth-demo/funground/later)은 빌드 때 파일이 있는지 보고, 없으면 코드 그림(src/lib/funground/later-art.ts)으로 그린다.
 * 편지 카드 · 타임캡슐 틀 · 아래 도장은 늘 코드로 그린다 — 그림에는 사람 · 글자 · 로고를 넣지 않는다.
 *
 * 키: OPENROUTER_FUNGROUND_API_KEY (환경 변수, 없으면 .env.local) — 펀그라운드 프로젝트 키(STUDIO_FUNGROUND_DONGJU).
 *     키 값은 터미널에 찍지 않는다. ERP 서버 키(OPENROUTER_API_KEY)나 관리 키는 쓰지 않는다.
 *
 * 실행:
 *   npx tsx scripts/funground-later-backgrounds.ts --dry-run          # 프롬프트만 보기(호출 없음)
 *   npx tsx scripts/funground-later-backgrounds.ts                    # 없는 것만 만들기(2장)
 *   npx tsx scripts/funground-later-backgrounds.ts --only sky --force # 하나만 다시
 *
 * 비용(2026-11 기준 대략): 기본 모델 google/gemini-3-pro-image-preview 2K 장당 약 $0.14 → 2장 약 $0.28. 오픈라우터가 알려 준 실제 비용을 찍는다.
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const OUT_DIR = path.join(process.cwd(), 'public/assets/booth-programs/funground-later')
const W = 1200
const H = 1800
const DEFAULT_MODEL = 'google/gemini-3-pro-image-preview'
const KEY_NAME = 'OPENROUTER_FUNGROUND_API_KEY'

/** 모든 그림에 붙이는 조건 — 사람 없음 · 글자 없음 · 세로 2:3 · 위는 단순(편지 카드 자리) · 아래 가운데 비움 */
const COMMON = [
  'Empty scene background for a photo booth. Absolutely no people, no characters, no animals, no faces, no silhouettes, no robots.',
  'No text, no letters, no numbers, no signs with writing, no logos, no brand marks, no watermarks, no clock numerals.',
  'Vertical portrait composition, aspect ratio 2:3.',
  'The top 22% of the image should be simple open sky with soft light (a note card will be placed there later).',
  'Leave the lower-middle of the image open and uncluttered — a clear floor or ground area where 1 to 4 people will be composited standing side by side, eye level about 40% from the top.',
  'Put the interesting details in the middle band and along the left and right edges. The bottom 10% should be plain floor.',
  'Bright, hopeful, optimistic future, suitable for children and teenagers aged 9 to 19. Rich colour, high detail, polished digital illustration with photographic lighting, sharp focus.',
].join(' ')

const PROMPTS = {
  city: 'A bright, hopeful city of the future in the daytime: sleek white and glass towers with rounded tops, lush green rooftop gardens and vertical forests, a transparent elevated tube train line curving between buildings, a few small friendly flying vehicles far away, soft sunrise sky in peach, pink and light blue. In the foreground, a wide clean sunny plaza with smooth pale paving, low flower beds and trees at the left and right edges.',
  sky: 'A dreamy school floating high above the clouds: a cheerful white-and-pastel school building with a round tower and a glass dome sitting on a floating island with green trees and small waterfalls, a soft rainbow, colourful hot air balloons and tiny floating islands in the distance, bright clear blue sky. In the foreground, a wide flat white stone terrace above a sea of fluffy clouds, with a low white railing only at the far left and right.',
} as const

type LaterArtId = keyof typeof PROMPTS
const IDS = Object.keys(PROMPTS) as LaterArtId[]

function loadEnvKey(name: string): string | undefined {
  if (process.env[name]) return process.env[name]
  const file = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(file)) return undefined
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t.startsWith(`${name}=`)) continue
    let v = t.slice(name.length + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    return v || undefined
  }
  return undefined
}

function args() {
  const a = process.argv.slice(2)
  const val = (flag: string) => {
    const i = a.indexOf(flag)
    return i >= 0 ? a[i + 1] : undefined
  }
  const only = val('--only')?.split(',').map((s) => s.trim()).filter(Boolean) as LaterArtId[] | undefined
  for (const id of only ?? []) if (!IDS.includes(id)) throw new Error(`모르는 장면: ${id} (가능: ${IDS.join(', ')})`)
  return { only, model: val('--model') ?? DEFAULT_MODEL, force: a.includes('--force'), dryRun: a.includes('--dry-run') }
}

interface Completion {
  choices?: { message?: { images?: { image_url?: { url?: string } }[]; content?: string | null } }[]
  usage?: { cost?: number }
  error?: { message?: string }
}

async function generate(key: string, model: string, prompt: string): Promise<{ png: Buffer; cost: number | null }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'FUN GROUND later backgrounds' },
    body: JSON.stringify({
      model,
      modalities: ['image', 'text'],
      image_config: model.includes('gemini-3') ? { aspect_ratio: '2:3', image_size: '2K' } : { aspect_ratio: '2:3' },
      usage: { include: true },
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }),
    signal: AbortSignal.timeout(180_000),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error(`생성 호출 실패 ${res.status}: ${raw.slice(0, 300)}`)
  const data = JSON.parse(raw) as Completion
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url?.startsWith('data:image/')) throw new Error(`그림이 오지 않았어요: ${data.error?.message ?? data.choices?.[0]?.message?.content?.slice(0, 200) ?? '이유 없음'}`)
  return { png: Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'), cost: typeof data.usage?.cost === 'number' ? data.usage.cost : null }
}

async function main() {
  const { only, model, force, dryRun } = args()
  const ids = only ?? IDS
  if (dryRun) {
    for (const id of ids) console.log(`\n[${id}]\n${PROMPTS[id]} ${COMMON}`)
    return
  }
  const key = loadEnvKey(KEY_NAME)
  if (!key) {
    console.error(`${KEY_NAME} 가 없어요 — 펀그라운드 프로젝트 키를 환경 변수나 .env.local 에 넣고 다시 실행해 주세요.`)
    process.exit(1)
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  console.log(`모델 ${model} · ${ids.length}장 → ${path.relative(process.cwd(), OUT_DIR)}`)
  let failed = 0
  let total = 0
  for (const id of ids) {
    const out = path.join(OUT_DIR, `${id}.webp`)
    if (fs.existsSync(out) && !force) {
      console.log(`- ${id}: 이미 있어 건너뜀(--force 로 다시)`)
      continue
    }
    const started = Date.now()
    try {
      const { png, cost } = await generate(key, model, `${PROMPTS[id]} ${COMMON}`)
      if (cost !== null) total += cost
      // 2:3 로 오지 않아도 가운데를 살려 1200×1800 으로 맞춘다
      await sharp(png).resize(W, H, { fit: 'cover', position: 'centre' }).webp({ quality: 86 }).toFile(out)
      const kb = Math.round(fs.statSync(out).size / 1024)
      console.log(`- ${id}: 완료 ${kb}KB · ${Math.round((Date.now() - started) / 1000)}초 · ${cost !== null ? `$${cost.toFixed(4)}` : '비용 모름'}`)
    } catch (error) {
      failed++
      console.error(`- ${id}: 실패 — ${error instanceof Error ? error.message : error}`)
    }
  }
  console.log(`합계 비용: $${total.toFixed(4)}`)
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
