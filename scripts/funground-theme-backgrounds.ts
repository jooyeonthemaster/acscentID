/**
 * 펀그라운드 B안 테마 포토 「THEME!」 배경 그림 6장 — 개발 중 한 번만 만든다(설치 기기 · 데모는 이 파일만 쓰고 AI 를 부르지 않는다).
 *
 * 만든 그림: public/assets/booth-programs/funground-theme/<id>.webp (1200×1800, 4×6 인화 원판 크기)
 * 화면(/booth-demo/funground/theme)은 빌드 때 이 파일이 있는지 보고, 있으면 그림을 · 없으면 코드 그림(src/lib/funground/theme-art.ts)을 배경으로 쓴다.
 * 앞 장식(꽃가루 · 촛불 · 창틀 · 풍선 · 아래 도장)은 그림과 상관없이 늘 코드로 그린다 — 그림에는 사람 · 글자 · 로고를 넣지 않는다.
 *
 * 키: OPENROUTER_FUNGROUND_API_KEY (환경 변수, 없으면 .env.local 에서 읽는다). 어떤 키를 쓸지는 대표 승인 뒤에 정한다 —
 *     키 값은 터미널에 찍지 않는다. ERP 서버 키(OPENROUTER_API_KEY)나 관리 키는 쓰지 않는다.
 *
 * 실행:
 *   npx tsx scripts/funground-theme-backgrounds.ts --dry-run            # 프롬프트만 보기(호출 없음)
 *   npx tsx scripts/funground-theme-backgrounds.ts                      # 없는 것만 만들기(6장)
 *   npx tsx scripts/funground-theme-backgrounds.ts --only idol,space    # 몇 개만
 *   npx tsx scripts/funground-theme-backgrounds.ts --force              # 있는 것도 다시
 *   npx tsx scripts/funground-theme-backgrounds.ts --model google/gemini-2.5-flash-image
 *
 * 비용(2026-11 기준 대략): 기본 모델 google/gemini-3-pro-image-preview 2K 장당 약 $0.14 → 6장 약 $0.8. 다시 뽑으면 그만큼 더.
 * 만든 뒤: 화면에서 6테마를 1 · 2 · 4명 사진으로 찍어 보고(앞 장식 · 사람 자리와 어울리는지) 마음에 안 드는 것만 --only 로 다시.
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import type { ThemeId } from '../src/lib/funground/theme-photo'

const OUT_DIR = path.join(process.cwd(), 'public/assets/booth-programs/funground-theme')
const W = 1200
const H = 1800
const DEFAULT_MODEL = 'google/gemini-3-pro-image-preview'
const KEY_NAME = 'OPENROUTER_FUNGROUND_API_KEY'

/** 모든 그림에 붙이는 조건 — 사람 없음 · 글자 없음 · 세로 2:3 · 아래 가운데 비움 */
const COMMON = [
  'Empty scene background for a photo booth. Absolutely no people, no characters, no animals, no faces, no silhouettes.',
  'No text, no letters, no numbers, no signs with writing, no logos, no brand marks, no watermarks, no team crests.',
  'Vertical portrait composition, aspect ratio 2:3.',
  'Leave the lower-middle of the image open and uncluttered — a clear floor or ground area where 1 to 4 people will be composited standing side by side, eye level about 45% from the top.',
  'Put the interesting details in the upper third and along the left and right edges. The bottom 8% should be plain floor.',
  'Bright, cheerful and friendly, suitable for children and teenagers aged 9 to 19. Rich colour, high detail, polished digital illustration with photographic lighting, sharp focus.',
].join(' ')

const PROMPTS: Record<ThemeId, string> = {
  idol: 'A K-pop concert stage seen from the audience: a huge glowing LED video wall in pink, violet and cyan, coloured spotlight beams from a lighting truss, light haze, glossy stage floor with reflections. No performers, no audience heads in frame.',
  stadium: 'A big outdoor stadium at night: bright floodlight towers, packed colourful stands blurred in the distance, green grass pitch with clean white field lines in the foreground, festive celebration mood with a few streamers in the air. Empty pitch.',
  magic: 'A grand hall of an old magic school at night: tall gothic arched windows with moonlight, stone walls, many floating lit candles high in the air, warm golden glow on a stone floor, hanging banners with simple star and moon patterns (no emblems).',
  space: 'The inside of a futuristic space station looking out through a huge observation window: a blue planet curving across the bottom, a ringed planet and colourful nebula among stars, soft cyan interior lights, clean metallic floor in front of the window.',
  park: 'A sunny amusement park: a colourful ferris wheel on the left, a red-and-white striped carousel on the right, blue sky with fluffy clouds, string lights and bunting, trees and a wide paved plaza in the foreground.',
  funground: 'A playful indoor youth play space in bright orange, green, sky blue and yellow: big rounded shapes, soft climbing blocks and slides in the background, dotted wall pattern, cheerful confetti shapes, clean light floor in the foreground.',
}

const THEME_IDS = Object.keys(PROMPTS) as ThemeId[]

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
  const only = val('--only')?.split(',').map((s) => s.trim()).filter(Boolean) as ThemeId[] | undefined
  for (const id of only ?? []) if (!THEME_IDS.includes(id)) throw new Error(`모르는 테마: ${id} (가능: ${THEME_IDS.join(', ')})`)
  return { only, model: val('--model') ?? DEFAULT_MODEL, force: a.includes('--force'), dryRun: a.includes('--dry-run') }
}

interface Completion {
  choices?: { message?: { images?: { image_url?: { url?: string } }[]; content?: string | null } }[]
  error?: { message?: string }
}

async function generate(key: string, model: string, prompt: string): Promise<Buffer> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'FUN GROUND theme backgrounds' },
    body: JSON.stringify({
      model,
      modalities: ['image', 'text'],
      image_config: model.includes('gemini-3') ? { aspect_ratio: '2:3', image_size: '2K' } : { aspect_ratio: '2:3' },
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    }),
    signal: AbortSignal.timeout(180_000),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error(`생성 호출 실패 ${res.status}: ${raw.slice(0, 300)}`)
  const data = JSON.parse(raw) as Completion
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url?.startsWith('data:image/')) throw new Error(`그림이 오지 않았어요: ${data.error?.message ?? data.choices?.[0]?.message?.content?.slice(0, 200) ?? '이유 없음'}`)
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
}

async function main() {
  const { only, model, force, dryRun } = args()
  const ids = only ?? THEME_IDS
  if (dryRun) {
    for (const id of ids) console.log(`\n[${id}]\n${PROMPTS[id]} ${COMMON}`)
    return
  }
  const key = loadEnvKey(KEY_NAME)
  if (!key) {
    console.error(`${KEY_NAME} 가 없어요 — 대표 승인을 받은 키를 환경 변수나 .env.local 에 넣고 다시 실행해 주세요.`)
    process.exit(1)
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  console.log(`모델 ${model} · ${ids.length}장 → ${path.relative(process.cwd(), OUT_DIR)}`)
  let failed = 0
  for (const id of ids) {
    const out = path.join(OUT_DIR, `${id}.webp`)
    if (fs.existsSync(out) && !force) {
      console.log(`- ${id}: 이미 있어 건너뜀(--force 로 다시)`)
      continue
    }
    const started = Date.now()
    try {
      const png = await generate(key, model, `${PROMPTS[id]} ${COMMON}`)
      // 2:3 로 오지 않아도 가운데를 살려 1200×1800 으로 맞춘다
      await sharp(png).resize(W, H, { fit: 'cover', position: 'centre' }).webp({ quality: 86 }).toFile(out)
      const kb = Math.round(fs.statSync(out).size / 1024)
      console.log(`- ${id}: 완료 ${kb}KB · ${Math.round((Date.now() - started) / 1000)}초`)
    } catch (error) {
      failed++
      console.error(`- ${id}: 실패 — ${error instanceof Error ? error.message : error}`)
    }
  }
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
