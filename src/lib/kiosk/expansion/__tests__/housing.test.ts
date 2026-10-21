import assert from 'node:assert/strict'
import { test } from 'node:test'
import { perfumes } from '@/data/perfumes'
import { buildAiPrompt, readAiRequest, validateAiAnalysis } from '../ai'
import {
  HOME_SCENES, HOME_STYLES, homeResult, homeRuleRecipe, MATE_PROFILES, MATE_QUESTIONS, MATE_TYPES, mateResult, mateRuleRecipe,
  rankMates, scentRanked, scentResult, scentRuleRecipe, scentWeights, type Answers,
} from '../housing'
import { buildImagePrompt, readImageParams } from '../image-prompts'
import { expansionReceipt } from '../receipt'
import { normalizeId, preferIds, rankPerfumes, toRecipe, validateRecipe } from '../recipe'

const scent = (patch: Answers = {}): Answers => ({ home: 'studio', with: 'alone', light: 'dim', worry: ['damp'], stay: 'bed', mood: 'rest', avoid: ['none'], ...patch })
const ids = new Set(perfumes.map((p) => p.id))
const goodRaw = (prefer: string[]) => ({ name: '햇살 드는 오후', story: '창으로 들어온 오후 햇살이 방 안에 오래 머무는 듯한 포근한 블렌드예요.', notes: [
  { id: prefer[0], ratio: 50, reason: '주향으로 포근함을 잡아요' },
  { id: prefer[1], ratio: 30, reason: '맑은 공기를 더해요' },
  { id: prefer[2], ratio: 20, reason: '잔향을 부드럽게 마무리해요' },
] })

test('향 처방 — 원하는 분위기가 가장 크게 반영되고, 피하는 계열이 강한 향료는 빠진다', () => {
  const rest = scentWeights(scent({ mood: 'rest' })).weights
  const fresh = scentWeights(scent({ mood: 'fresh' })).weights
  assert.ok(rest.musky > fresh.musky)
  assert.ok(fresh.citrus > rest.citrus)
  const noFlower = scentRanked(scent({ mood: 'guest', avoid: ['flower'] }))
  assert.ok(noFlower.every((p) => p.characteristics.floral < 7))
  assert.ok(rankPerfumes({ citrus: 3 }).slice(0, 3).every((p) => p.characteristics.citrus >= 7))
})

test('기본 레시피(AI 없이) — 실제 향료 셋 · 서로 다름 · 50/30/20 · 용량은 향료 2ml 기준', () => {
  const recipe = scentRuleRecipe(scent())
  assert.equal(recipe.ai, false)
  assert.equal(recipe.notes.length, 3)
  assert.equal(new Set(recipe.notes.map((n) => n.id)).size, 3)
  assert.deepEqual(recipe.notes.map((n) => n.ratio), [50, 30, 20])
  assert.ok(recipe.notes.every((n) => ids.has(n.id)))
  assert.equal(recipe.notes.reduce((s, n) => s + n.ml, 0), 2)
  assert.equal(recipe.notes[0].ml, 1)
  for (const type of MATE_TYPES) assert.equal(mateRuleRecipe(type).notes.length, 3)
  for (const scene of Object.keys(HOME_SCENES) as (keyof typeof HOME_SCENES)[]) assert.equal(homeRuleRecipe(scene).notes.length, 3)
})

test('AI 레시피 검사 — 합 100 · 셋 · 서로 다름 · 실제 id · 주향은 추천 후보 안', () => {
  const prefer = preferIds(scentRanked(scent()))
  const raw = validateRecipe(goodRaw(prefer), prefer)
  assert.deepEqual(raw.notes.map((n) => n.ratio), [50, 30, 20])
  assert.equal(normalizeId("AC'SCENT 7"), "AC'SCENT 07")
  assert.equal(normalizeId('ACSCENT 99'), null)
  const bad = (patch: (r: ReturnType<typeof goodRaw>) => void, why: RegExp) => { const r = goodRaw(prefer); patch(r); assert.throws(() => validateRecipe(r, prefer), why) }
  bad((r) => { r.notes[2].ratio = 25 }, /합은 100/)
  bad((r) => { r.notes[1].id = r.notes[0].id }, /서로 달라야/)
  bad((r) => { r.notes[0].id = "AC'SCENT 99" }, /id 는 향료 목록/)
  bad((r) => { r.notes.pop() }, /정확히 3개/)
  bad((r) => { r.notes[0].ratio = 75; r.notes[1].ratio = 15; r.notes[2].ratio = 10 }, /10~70/)
  const outside = perfumes.find((p) => !prefer.includes(p.id))!.id
  bad((r) => { r.notes[0].id = outside; r.notes[1].id = prefer[1]; r.notes[2].id = prefer[2] }, /주향은 추천 후보/)
})

test('AI 요청 — 레시피는 주거복지대전 3종만, 주향 후보는 실제 id 만 · 지시문에 향료 목록이 들어간다', () => {
  const prefer = preferIds(scentRanked(scent()))
  const req = readAiRequest({ id: 'housing-scent', photo: null, answers: [], candidates: [], context: '', recipe: { prefer: [...prefer, 'nope', prefer[0]] } })!
  assert.deepEqual(req.recipe?.prefer, prefer)
  assert.equal(readAiRequest({ id: 'scent', photo: null, answers: [], candidates: [], context: '', recipe: { prefer } })!.recipe, undefined)
  const prompt = buildAiPrompt(req)
  assert.match(prompt, /AC'SCENT 30/)
  assert.match(prompt, /합은 정확히 100/)
  assert.match(prompt, /"recipe"/)
  const base = { headline: '포근한 오후의 방', insight: '해가 잘 들지 않는 원룸에서 깊은 휴식을 원하신다고 하셔서, 따뜻하고 부드러운 향을 중심으로 맑은 기운을 살짝 더해 균형을 맞췄어요.', photo: [], tips: ['잠들기 전에 한 번 뿌려 보세요.', '창을 잠깐 열어 환기해 보세요.'] }
  assert.throws(() => validateAiAnalysis({ pick: null, ...base }, req), /recipe/)
  const ok = validateAiAnalysis({ pick: null, ...base, recipe: goodRaw(prefer) }, req)
  assert.equal(ok.recipe?.notes.length, 3)
  assert.throws(() => validateAiAnalysis({ pick: null, ...base, insight: base.insight + ' 습한 냄새를 탈취해 줘요.', recipe: goodRaw(prefer) }, req), /효능/)
})

test('향 처방 결과 · 영수증 — 레시피가 주인공(향료 · 비율 · 용량 · 베이스 · 조향 안내), 계열 점수 줄은 빼고 절은 둘까지', () => {
  const prefer = preferIds(scentRanked(scent()))
  const recipe = toRecipe(validateRecipe(goodRaw(prefer), prefer), true)
  const result = scentResult(scent(), recipe)
  assert.equal(result.title, '햇살 드는 오후')
  assert.equal(result.metrics?.length, 6)
  const withAi = { ...result, sections: [{ title: 'AI 분석 · 한 줄', body: '풀이' }, ...result.sections] }
  const receipt = expansionReceipt('housing-scent', withAi)
  const headings = receipt.blocks.filter((b) => b.kind === 'heading').map((b) => (b as { text: string }).text)
  assert.equal(headings[0], '조향 레시피 · 햇살 드는 오후')
  assert.ok(headings.length <= 3)
  const pairs = receipt.blocks.find((b) => b.kind === 'pairs') as { rows: [string, string][] }
  assert.equal(pairs.rows.length, 4)
  assert.match(pairs.rows[0][1], /^50% · 1\.0ml/)
  assert.deepEqual(pairs.rows[3], ['퍼퓸 베이스', '8.0ml'])
  assert.ok(receipt.blocks.some((b) => b.kind === 'text' && /조향 스태프/.test(b.text)))
  assert.match(receipt.foot ?? '', /입력한 내용은 저장하지 않아요/)
  const rule = expansionReceipt('housing-scent', scentResult(scent(), scentRuleRecipe(scent())))
  assert.ok(rule.blocks.some((b) => b.kind === 'text' && /기본 레시피/.test(b.text)))
})

test('성향 향수 — 성향은 여섯 중 하나, 잘 맞는 이웃은 다른 성향, 레시피가 있어도 영수증에 스탬프 랠리 칸이 남는다', () => {
  for (const type of MATE_TYPES) assert.notEqual(MATE_PROFILES[type].match, type)
  const allFirst = Object.fromEntries(MATE_QUESTIONS.map((q) => [q.key, q.options[0].id]))
  const allSecond = Object.fromEntries(MATE_QUESTIONS.map((q) => [q.key, q.options[1].id]))
  assert.equal(rankMates(allFirst)[0], 'lounge')
  assert.equal(rankMates(allSecond)[0], 'garden')
  const result = mateResult(allFirst, undefined, mateRuleRecipe('lounge'))
  assert.equal(result.metrics?.length, 4)
  assert.ok(result.recipe)
  const withAi = { ...result, sections: [{ title: 'AI 분석 · 한 줄', body: '풀이' }, ...result.sections] }
  const headings = expansionReceipt('housing-mate', withAi).blocks.filter((b) => b.kind === 'heading').map((b) => (b as { text: string }).text)
  assert.ok(headings.includes('스탬프 랠리'), headings.join(' / '))
  assert.ok(headings[0].startsWith('조향 레시피'))
})

test('성향 향수 — 어느 성향이든 한 번은 1등이 될 수 있다(답 조합 탐색)', () => {
  const seen = new Set<string>()
  const keys = MATE_QUESTIONS.map((q) => q.key)
  for (let n = 0; n < 4 ** 4; n++) {
    const a: Answers = {}
    keys.forEach((key, i) => { a[key] = MATE_QUESTIONS[i].options[(Math.floor(n / 4 ** (i % 4)) + i) % 4].id })
    seen.add(rankMates(a)[0])
  }
  for (const type of MATE_TYPES) assert.ok(seen.has(type), type)
})

test('2036 우리 집의 향 — 장면·화풍 검사, 선화는 흑백, 그림에 다른 사람·글자 없음, 결과에 레시피', () => {
  assert.equal(readImageParams('housing-home', { scene: 'mars', style: 'line' }), null)
  for (const scene of Object.keys(HOME_SCENES)) for (const style of Object.keys(HOME_STYLES)) {
    const params = readImageParams('housing-home', { scene, style })!
    const { prompt, aspect } = buildImagePrompt(params)
    assert.equal(aspect, '3:4')
    assert.match(prompt, /Nobody else appears/)
    assert.match(prompt, /letters/)
    if (style === 'line') assert.match(prompt, /STRICTLY BLACK AND WHITE/)
  }
  const result = homeResult('share', 'line', homeRuleRecipe('share'))
  assert.match(result.subtitle ?? '', /2036/)
  assert.equal(result.recipe?.notes.length, 3)
  const receipt = expansionReceipt('housing-home', result, { src: 'data:image/jpeg;base64,AA', caption: '그림' })
  assert.match(receipt.foot ?? '', /촬영 사진은 저장하지 않아요/)
})

test('그림 에셋 — 키오스크 3종·포토부스 3종의 모든 선택지·장면·캐릭터·대기 그림 파일이 있다', async () => {
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { choiceArt, mateArt, RECEIPT_ROOM_ART, sceneArt, styleArt, WAIT_ART } = await import('../housing-art')
  const { SCENT_QUESTIONS } = await import('../housing')
  const { PROGRAMS } = await import('@/lib/booth/programs/catalog')
  const file = (url: string) => join(process.cwd(), 'public', url)
  const urls = [
    ...SCENT_QUESTIONS.flatMap((q) => q.options.map((o) => choiceArt('scent', q.key, o.id))),
    ...MATE_QUESTIONS.flatMap((q) => q.options.map((o) => choiceArt('mate', q.key, o.id))),
    ...(Object.keys(HOME_SCENES) as (keyof typeof HOME_SCENES)[]).map(sceneArt),
    ...(Object.keys(HOME_STYLES) as (keyof typeof HOME_STYLES)[]).map(styleArt),
    ...MATE_TYPES.map(mateArt), ...Object.values(WAIT_ART), RECEIPT_ROOM_ART,
  ]
  const booth = PROGRAMS.filter((p) => p.id.startsWith('housing-')).flatMap((p) => [p.intro, ...p.options.groups.flatMap((g) => g.options.map((o) => o.image))])
  assert.equal(booth.filter((x) => !x).length, 0, '포토부스 주거복지 3종은 모든 선택지에 그림이 있다')
  const missing = [...urls, ...booth as string[]].filter((u) => !existsSync(file(u)))
  assert.deepEqual(missing, [])
  assert.equal(urls.length, 31 + 32 + 4 + 2 + 6 + 3 + 1)
})

test('성향 향수 결과 — 캐릭터 그림과 도장 칸 셋(영수증에는 점선 원 블록)', () => {
  const result = mateResult(Object.fromEntries(MATE_QUESTIONS.map((q) => [q.key, q.options[0].id])), 'quiet', mateRuleRecipe('quiet'))
  assert.match(result.art?.src ?? '', /housing-mate-quiet\.webp$/)
  assert.equal(result.sections.find((s) => s.title === '스탬프 랠리')?.stamps, 3)
  const receipt = expansionReceipt('housing-mate', result)
  assert.ok(receipt.blocks.some((b) => b.kind === 'stamps' && b.count === 3))
  assert.ok(receipt.blocks[0].kind === 'image' && /housing-mate-quiet/.test(receipt.blocks[0].src))
  assert.ok(expansionReceipt('housing-scent', scentResult(scent(), scentRuleRecipe(scent()))).blocks[0].kind === 'image')
})
