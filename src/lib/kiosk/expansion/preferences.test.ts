import assert from 'node:assert/strict'
import test from 'node:test'
import { perfumes } from '../../../data/perfumes'
import { initialAnswers, PREFERENCES, recommend, summarizeAnswers, validateAnswers } from './preferences'
import type { Answers, ExperienceResult, PreferenceId, RecommendationBundle } from './types'

const IDS = Object.keys(PREFERENCES) as PreferenceId[]
function valid(id: PreferenceId): Answers {
  const a = initialAnswers(id)
  for (const q of PREFERENCES[id].steps.flatMap(s => s.questions)) {
    if (q.type === 'single') a[q.key] = q.options![0].id
    if (q.type === 'multi') a[q.key] = q.options!.slice(0, q.min ?? (q.required ? 1 : 0)).map(x => x.id)
  }
  return a
}
const all = (b: RecommendationBundle): ExperienceResult[] => [b.primary, ...b.alternatives]
const text = (r: ExperienceResult): string => `${r.title} ${r.summary} ${r.sections.map(s => `${s.title} ${s.body} ${(s.items ?? []).join(' ')}`).join(' ')}`

test('nine definitions contain useful input steps and all picks start unselected', () => {
  assert.equal(IDS.length, 9)
  for (const id of IDS) {
    const d = PREFERENCES[id], answers = initialAnswers(id)
    assert.ok(d.steps.length >= 2 && d.steps.length <= 3, id)
    const keys = d.steps.flatMap(s => s.questions.map(q => q.key))
    assert.equal(new Set(keys).size, keys.length, id)
    for (const s of d.steps) {
      assert.ok(s.questions.length >= 1 && s.questions.length <= 3, id)
      for (const q of s.questions) {
        assert.deepEqual(answers[q.key], q.type === 'scale' ? q.initial : q.type === 'multi' ? [] : '', `${id}:${q.key}`)
      }
    }
    assert.ok(Object.keys(validateAnswers(id, answers)).length, `${id} must require choices`)
    assert.throws(() => recommend(id, answers), Error)
  }
})

test('every mode produces deterministic primary and three distinct alternatives from valid inputs', () => {
  for (const id of IDS) {
    const a = valid(id)
    assert.deepEqual(validateAnswers(id, a), {}, id)
    const result = recommend(id, a)
    assert.equal(result.alternatives.length, 3, id)
    assert.equal(new Set(all(result).map(r => r.id)).size, 4, id)
    assert.deepEqual(result, recommend(id, a), id)
    assert.ok(result.summary.length >= 4, id)
    for (const r of all(result)) {
      assert.ok(r.title && r.summary && r.sections.length >= 3 && r.palette?.length, id)
      for (const m of r.metrics ?? []) assert.ok(Number.isFinite(m.value) && m.value >= 0 && m.value <= m.max, `${id}:${m.label}`)
    }
  }
})

test('validation rejects tampered options, duplicate picks and invalid scale values', () => {
  for (const id of IDS) {
    for (const q of PREFERENCES[id].steps.flatMap(s => s.questions)) {
      const a = valid(id)
      a[q.key] = q.type === 'scale' ? NaN : q.type === 'multi' ? ['not-an-option'] : 'not-an-option'
      assert.ok(validateAnswers(id, a)[q.key], `${id}:${q.key}`)
      assert.throws(() => recommend(id, a), Error)
      if (q.type === 'multi') {
        a[q.key] = [q.options![0].id, q.options![0].id]
        assert.ok(validateAnswers(id, a)[q.key])
      }
      if (q.type === 'scale') {
        for (const value of [0, 6, Infinity, 2.5, '3']) {
          a[q.key] = value
          assert.ok(validateAnswers(id, a)[q.key])
        }
      }
    }
  }
  assert.throws(() => initialAnswers('__proto__' as PreferenceId), /지원하지/)
  assert.throws(() => recommend('missing' as PreferenceId, {}), /지원하지/)
})

test('summary preserves step destinations and contains actual selected labels', () => {
  const answers = { ...valid('sommelier'), sweetness: 5, aromas: ['spice', 'floral'] }
  const summary = summarizeAnswers('sommelier', answers)
  assert.equal(summary.find(s => s.key === 'sweetness')!.value, '5 / 5')
  assert.equal(summary.find(s => s.key === 'aromas')!.value, '향신료 · 꽃향')
  assert.equal(summary.find(s => s.key === 'aromas')!.step, 1)
  assert.equal(summary.find(s => s.key === 'wineColor')!.step, 2)
  assert.equal(summarizeAnswers('coord', valid('coord')).find(s => s.key === 'included')!.value, '없음')
})

test('wine ranking responds to dry citrus versus sweet floral and red full-bodied preferences', () => {
  const base = valid('sommelier')
  const white = recommend('sommelier', { ...base, sweetness: 1, acidity: 5, body: 2, aromas: ['citrus'], wineColor: 'white' })
  const sweet = recommend('sommelier', { ...base, sweetness: 5, acidity: 3, body: 2, aromas: ['floral'], wineColor: 'white' })
  const red = recommend('sommelier', { ...base, sweetness: 1, acidity: 3, body: 5, aromas: ['spice'], wineColor: 'red', occasion: 'quiet' })
  assert.equal(white.primary.id, 'crisp-white')
  assert.equal(sweet.primary.id, 'floral-sweet')
  assert.equal(red.primary.id, 'bold-red')
})

test('cocktail branches have coherent amounts and mocktails never contain a spirit', () => {
  const base = { ...valid('cocktail'), ingredients: ['berry'], flavors: ['berry'], mood: 'festive' }
  const mocktails = recommend('cocktail', { ...base, drinkType: 'mocktail' })
  const cocktails = recommend('cocktail', { ...base, drinkType: 'cocktail' })
  for (const r of all(mocktails)) {
    const amounts = r.sections.find(s => s.title === '재료와 비율')!.items!
    assert.equal(amounts.reduce((sum, line) => sum + Number(line.match(/ (\d+) ml/)![1]), 0), 180)
    assert.ok(!amounts.some(line => /^(진|보드카|럼) /.test(line)))
    assert.equal(r.metrics!.find(m => m.label === '주류 분량')!.value, 0)
  }
  for (const r of all(cocktails)) {
    const amounts = r.sections.find(s => s.title === '재료와 비율')!.items!
    assert.equal(amounts.reduce((sum, line) => sum + Number(line.match(/ (\d+) ml/)![1]), 0), 180)
    assert.equal(amounts.filter(line => /^(진|보드카|럼) 30 ml/.test(line)).length, 1)
    assert.equal(r.metrics!.find(m => m.label === '주류 분량')!.value, 30)
  }
})

test('cocktail exclusions apply to every alternative and conflicting answers fail clearly', () => {
  const a = { ...valid('cocktail'), ingredients: ['apple'], excluded: ['citrus', 'mint', 'ginger', 'alcohol'], drinkType: 'mocktail' }
  const result = recommend('cocktail', a)
  for (const r of all(result)) {
    const ingredients = r.sections.find(s => s.title === '재료와 비율')!.items!.join(' ')
    assert.doesNotMatch(ingredients, /레몬|라임|민트|생강|보드카|럼\s|진\s/)
  }
  assert.ok(validateAnswers('cocktail', { ...a, drinkType: 'cocktail' }).drinkType)
  assert.ok(validateAnswers('cocktail', { ...a, ingredients: ['citrus'] }).excluded)
  assert.throws(() => recommend('cocktail', { ...a, ingredients: ['apple'], excluded: ['apple'] }), /동시에/)
})

test('coffee respects decaf, brew method, serving style and taste changes', () => {
  const bright = recommend('barista', { ...valid('barista'), acidity: 5, body: 2, roast: 'light', brew: 'filter', serve: 'iced', caffeine: 'decaf' })
  assert.match(bright.primary.id, /^bright-filter-iced-decaf$/)
  assert.match(text(bright.primary), /디카페인/)
  assert.match(text(bright.primary), /얼음 75 g/)
  const deep = recommend('barista', { ...valid('barista'), acidity: 1, body: 5, roast: 'dark', usual: 'latte', brew: 'espresso', serve: 'milk' })
  assert.match(deep.primary.id, /^deep-espresso-milk-/)
  assert.match(text(deep.primary), /우유 150 ml/)
  const cold = recommend('barista', { ...valid('barista'), brew: 'cold', serve: 'hot' })
  assert.match(text(cold.primary), /냉장 추출한 뒤/)
})

test('taste map is built from preferences and exclusions change every food suggestion', () => {
  const a = { ...valid('taste-dna'), tastes: ['sour', 'sweet'], pairing: 'creamy', texture: 'soft', intensity: 5 }
  const result = recommend('taste-dna', a)
  const metrics = result.primary.metrics!
  assert.ok(metrics.find(m => m.label === '달콤함')!.value > metrics.find(m => m.label === '매콤함')!.value)
  assert.match(result.primary.footnote!, /유전자 검사/)
  const excluded = recommend('taste-dna', { ...a, excluded: ['dairy', 'nuts', 'seafood', 'chili'] })
  for (const r of all(excluded)) {
    const items = r.sections.find(s => s.title === '조합에 담긴 재료')!.items!.join(' ')
    assert.doesNotMatch(items, /요거트|견과 버터|새우|고추/)
  }
})

test('style preferences change rank and carry chosen palette, fit and focus into the guide', () => {
  const minimal = recommend('style-profiler', { ...valid('style-profiler'), styles: ['minimal'], occasion: 'work', palette: 'neutral', silhouette: 'slim', focus: 'shoes' })
  assert.equal(minimal.primary.id, 'minimal')
  assert.match(text(minimal.primary), /몸에 가깝게/)
  assert.match(minimal.primary.sections.find(s => s.title === '먼저 바꿔볼 하나')!.body, /로퍼/)
  const romantic = recommend('style-profiler', { ...valid('style-profiler'), styles: ['romantic'], occasion: 'date', palette: 'pastel', silhouette: 'regular' })
  assert.equal(romantic.primary.id, 'romantic')
  assert.notDeepEqual(minimal.primary.palette, romantic.primary.palette)
})

test('outfits honor pinned items, forbidden items and weather on all ranked results', () => {
  const cold = recommend('coord', { ...valid('coord'), weather: 'cold', included: ['knit', 'skirt', 'sneakers'], excluded: ['shirt', 'loafers'] })
  for (const r of all(cold)) {
    const items = r.sections.find(s => s.title === '아이템 구성')!.items!.join(' ')
    assert.match(items, /니트/)
    assert.match(items, /스커트/)
    assert.match(items, /스니커즈/)
    assert.match(items, /코트/)
    assert.doesNotMatch(items, /셔츠|로퍼|팬츠/)
  }
  const rain = recommend('coord', { ...valid('coord'), weather: 'rain', excluded: ['jacket', 'sneakers', 'loafers'], included: ['pants'] })
  for (const r of all(rain)) {
    const items = r.sections.find(s => s.title === '아이템 구성')!.items!.join(' ')
    assert.match(items, /레인 부츠/)
    assert.match(items, /방수/)
    assert.doesNotMatch(items, /재킷|스니커즈|로퍼/)
  }
  const hot = recommend('coord', { ...valid('coord'), weather: 'hot', included: ['knit'] })
  assert.match(text(hot.primary), /여름 니트/)
  assert.ok(validateAnswers('coord', { ...valid('coord'), included: ['pants', 'skirt'] }).included)
  assert.ok(validateAnswers('coord', { ...valid('coord'), excluded: ['pants', 'skirt'] }).excluded)
  assert.ok(validateAnswers('coord', { ...valid('coord'), included: ['shirt'], excluded: ['shirt'] }).excluded)
})

test('aura colors and selected pace change results without invented measurement claims', () => {
  const quiet = recommend('aura', { ...valid('aura'), mood: 'calm', energy: 1, atmosphere: 'quiet', color: 'lavender' })
  const active = recommend('aura', { ...valid('aura'), mood: 'curious', energy: 5, atmosphere: 'creative', color: 'gold' })
  assert.equal(quiet.primary.id, 'lavender')
  assert.equal(active.primary.id, 'gold')
  assert.notDeepEqual(quiet.primary.palette, active.primary.palette)
  assert.equal(active.primary.metrics![0].value, 5)
  assert.match(quiet.primary.footnote!, /측정하거나 예측하지/)
})

test('travel indoor-only conditions and time budget apply to every stop and alternative', () => {
  for (const pace of ['slow', 'balanced', 'active']) {
    const a = { ...valid('travel'), duration: 'half', setting: 'indoor', pace, activities: ['culture', 'nature', 'craft'] }
    for (const r of all(recommend('travel', a))) {
      assert.ok(r.metrics!.find(m => m.label === '예상 소요 분')!.value <= 240)
      const schedule = r.sections.find(s => s.title === '코스 순서')!.items!
      assert.ok(schedule.filter(s => /\d{2}:\d{2}/.test(s)).every(s => s.endsWith('실내')))
      assert.doesNotMatch(schedule.join(' '), /야외|공원 산책|물가/)
      assert.ok(schedule.some(s => /전시/.test(s)))
      assert.ok(schedule.some(s => /식물|자연/.test(s)))
      assert.ok(schedule.some(s => /만들기|드로잉/.test(s)))
    }
  }
})

test('two-day outdoor itineraries keep both days even when catalog candidates repeat', () => {
  const result = recommend('travel', { ...valid('travel'), duration: 'two-days', pace: 'active', setting: 'outdoor', activities: ['culture', 'nature', 'food'], companion: 'family', planning: 'flexible' })
  for (const r of all(result)) {
    const schedule = r.sections.find(s => s.title === '코스 순서')!.items!
    assert.ok(schedule.some(s => s.startsWith('1일차')))
    assert.ok(schedule.some(s => s.startsWith('2일차')))
    assert.ok(schedule.filter(s => /\d{2}:\d{2}/.test(s)).every(s => s.endsWith('야외')))
    assert.ok(r.metrics!.find(m => m.label === '예상 소요 분')!.value <= 960)
    assert.match(text(r), /화장실/)
    assert.match(text(r), /현장|다른 장소로 바꿀/)
  }
})

test('scent matching uses only the actual catalog and displays registered notes without invented pyramid', () => {
  const citrus = recommend('scent', { ...valid('scent'), families: ['citrus'], mood: 'fresh', intensity: 1, avoided: ['spicy'] })
  const woods = recommend('scent', { ...valid('scent'), families: ['woody', 'musky'], mood: 'warm', intensity: 5, occasion: 'evening' })
  assert.notEqual(citrus.primary.id, woods.primary.id)
  for (const r of all(citrus)) {
    const source = perfumes.find(p => p.id === r.id)
    assert.ok(source)
    assert.ok(source.characteristics.spicy < 7)
    assert.deepEqual(r.sections.find(s => s.title === '대표·보조 노트')!.items, [`대표 노트: ${source.mainScent.name}`, `보조 노트 1: ${source.subScent1.name}`, `보조 노트 2: ${source.subScent2.name}`])
    assert.doesNotMatch(text(r), /AC['’]SCENT|탑 노트|미들 노트|베이스 노트/)
  }
  assert.ok(validateAnswers('scent', { ...valid('scent'), families: ['citrus'], avoided: ['citrus'] }).avoided)
})

test('one change in every input is reflected in the result or its explanation', () => {
  for (const id of IDS) {
    const base = valid(id), original = recommend(id, base)
    for (const q of PREFERENCES[id].steps.flatMap(s => s.questions)) {
      const modified = { ...base }
      if (q.type === 'scale') modified[q.key] = q.max!
      else if (q.type === 'single') modified[q.key] = q.options![q.options!.length - 1].id
      else modified[q.key] = q.options!.slice(-(q.min || 1)).map(o => o.id)
      if (Object.keys(validateAnswers(id, modified)).length) continue // Intentional cross-field conflicts are tested above.
      const changed = recommend(id, modified)
      assert.notDeepEqual(all(changed), all(original), `${id}:${q.key} must affect the recommendations, not only the input summary`)
    }
  }
})

test('result sentences attach the right Korean particle to every chosen word', async () => {
  const { josa } = await import('./korean')
  assert.equal(josa('레몬·라임', '을/를'), '레몬·라임을')
  assert.equal(josa('민트', '을/를'), '민트를')
  assert.equal(josa('미디엄', '과/와'), '미디엄과')
  assert.equal(josa('다크', '과/와'), '다크와')
  assert.equal(josa('로퍼', '으로/로'), '로퍼로')
  assert.equal(josa('스커트와 보온 레깅스', '으로/로'), '스커트와 보온 레깅스로')
  assert.equal(josa('3', '을/를'), '3을')
  assert.equal(josa('맛있는 발견', '이에요/예요'), '맛있는 발견이에요')
  // 실제 결과 문장: 받침과 맞지 않는 조사가 바뀌는 단어 뒤에 붙지 않는다
  // 고치기 전에 실제로 나오던 틀린 표현들
  const bad = /레몬·라임를|생강를|미디엄와|미디엄를|산책를|음식를|체험를|특별한 자리을|선명한 포인트과|블루·화이트을|브라운·베이지을|라벤더을|민트을|피치을|골드을|로즈을|식사와 함께에|매일 가볍게에|둘러보기 움직일|향를|균형를|여운를/
  const cases: [PreferenceId, Answers][] = [
    ['cocktail', { ...valid('cocktail'), ingredients: ['citrus', 'ginger'] }],
    ['barista', { ...valid('barista'), roast: 'medium' }],
    ['style-profiler', { ...valid('style-profiler'), occasion: 'event', palette: 'vivid' }],
    ['coord', { ...valid('coord'), palette: 'blue' }],
    ['aura', { ...valid('aura'), color: 'lavender' }],
    ['travel', { ...valid('travel'), activities: ['nature', 'food', 'craft'], pace: 'active' }],
    ['sommelier', { ...valid('sommelier'), occasion: 'meal' }],
    ['scent', { ...valid('scent'), occasion: 'everyday' }],
  ]
  for (const [id, a] of cases) for (const r of all(recommend(id, a))) assert.doesNotMatch(`${r.subtitle} ${text(r)}`, bad, `${id}:${r.id}`)
})

test('cocktail sweetness and carbonation change the actual recipe while keeping one glass', () => {
  const base = { ...valid('cocktail'), drinkType: 'mocktail', ingredients: ['mint'], flavors: ['citrus'] }
  const amounts = (r: ExperienceResult) => r.sections.find(s => s.title === '재료와 비율')!.items!
  for (const sweetness of ['normal', 'less', 'more']) for (const sparkle of ['yes', 'no']) for (const drinkType of ['mocktail', 'cocktail']) {
    for (const r of all(recommend('cocktail', { ...base, drinkType, sweetness, sparkle }))) {
      const lines = amounts(r)
      assert.equal(lines.reduce((sum, line) => sum + Number(line.match(/ (\d+) ml/)![1]), 0), 180, `${sweetness}/${sparkle}/${r.id}`)
      assert.ok(lines.every(line => Number(line.match(/ (\d+) ml/)![1]) > 0), lines.join(','))
      if (sweetness === 'less') assert.ok(!lines.some(l => l.startsWith('설탕 시럽')), r.id)
      if (sparkle === 'no') assert.ok(!lines.some(l => l.startsWith('탄산수')), r.id)
    }
  }
  const plain = recommend('cocktail', { ...base, sweetness: 'normal' }).primary, sweet = recommend('cocktail', { ...base, sweetness: 'more' }).primary
  const syrup = (r: ExperienceResult) => Number(amounts(r).find(l => l.startsWith('설탕 시럽'))?.match(/ (\d+) ml/)?.[1] ?? 0)
  assert.equal(syrup(sweet), syrup(plain) + 10)
  assert.ok(validateAnswers('cocktail', { ...base, drinkType: 'cocktail', excluded: ['alcohol'] }).excluded, 'alcohol conflict must show on the exclusion step too')
})

test('candidates with the same content are not offered as different alternatives', () => {
  const pinned = recommend('coord', { ...valid('coord'), weather: 'mild', included: ['shirt', 'pants', 'sneakers'] })
  const outfits = all(pinned).map(r => JSON.stringify(r.sections))
  assert.equal(new Set(outfits).size, outfits.length)
  if (pinned.alternatives.length === 0) assert.match(text(pinned.primary), /꼭 넣을 아이템을 줄이면/)
  for (const id of IDS) { const r = recommend(id, valid(id)); assert.equal(new Set(all(r).map(x => JSON.stringify(x.sections))).size, all(r).length, id) }
})
