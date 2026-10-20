import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EXHIBIT_COLORS } from '../exhibit'
import { closeness, colorFamily, dominantColors, expression, faceSignal, handSignal, hexToLab, leaning, outfitLook, PHOTO_PLANS, readingFacts, swatch, type FaceSignal, type PhotoReading } from '../photo'
import { photoHeritage, photoMission, photoProduct, photoWall } from '../photo-effects'
import { PHOTO_SECTION, recommend } from '../preferences'
import { NO_PHOTO_IDS } from '../housing'
import { expansionReceipt } from '../receipt'
import { analyzeParticipants, cameraStory, newParticipant, palmFocus, suggestMood } from '../social'
import { EXPANSION_IDS, type Answers } from '../types'

const face = (patch: Partial<FaceSignal> = {}): FaceSignal => ({ smile: 10, brow: 10, open: 5, tilt: 0, x: 0.5, y: 0.4, size: 0.3, ...patch })
const wearing = (...hexes: string[]) => hexes.map((hex, i) => swatch(hexToLab(hex), i === 0 ? 0.6 : 0.4 / (hexes.length - 1)))
const reading = (patch: Partial<PhotoReading> = {}): PhotoReading => ({ subject: 'face', faces: [face()], hand: null, outfit: [], outfitMissing: false, scene: { brightness: 60, warmth: 4 }, ...patch })
const points = (n: number) => Array.from({ length: n }, () => ({ x: 0.5, y: 0.5 }))

test('옷 색 이름 — 파랑과 보라·라벤더를 섞지 않고 흔한 이름으로 부른다', () => {
  const cases: [string, string][] = [['#1B2A4A', 'navy'], ['#000080', 'navy'], ['#1560BD', 'blue'], ['#87CEEB', 'sky'], ['#B39DDB', 'lavender'], ['#9370DB', 'purple'], ['#800080', 'purple'], ['#C0392B', 'red'], ['#800020', 'burgundy'], ['#FFC0CB', 'pink'], ['#FFA500', 'orange'], ['#8B5A2B', 'brown'], ['#D8C3A5', 'beige'], ['#F1C40F', 'yellow'], ['#2ECC71', 'green'], ['#111111', 'black'], ['#9E9E9E', 'gray'], ['#F7F7F5', 'white'], ['#FF7F50', 'coral'], ['#93171D', 'red'], ['#0E151F', 'navy'], ['#12141A', 'black'], ['#AA8264', 'beige'], ['#7E5941', 'brown'], ['#625D59', 'gray']]
  for (const [hex, family] of cases) assert.equal(colorFamily(hexToLab(hex)), family, hex)
})

test('많이 보이는 옷 색 — 그늘진 같은 색은 하나로, 작은 단추 색은 버린다', () => {
  const lab: number[] = []
  const push = (hex: string, count: number, shade = 0) => { const [L, a, b] = hexToLab(hex); for (let i = 0; i < count; i++) lab.push(L + ((i % 5) - 2) * shade, a, b) }
  push('#1B2A4A', 600, 4) // 네이비, 주름 그늘
  push('#F4F2EE', 350, 2) // 흰 셔츠
  push('#C0392B', 50) // 빨간 단추 5%
  const colors = dominantColors(lab)
  assert.deepEqual(colors.map((c) => c.family), ['navy', 'white'])
  assert.ok(Math.abs(colors[0].share - 0.6) < 0.05 && Math.abs(colors[1].share - 0.35) < 0.05)
  assert.deepEqual(dominantColors([1, 2, 3]), [], '픽셀이 너무 적으면 색을 지어내지 않는다')
})

test('표정·고개 — blendshape 값과 눈의 기울기만 쓴다', () => {
  const p = points(478)
  Object.assign(p[33], { x: 0.40, y: 0.40 }); Object.assign(p[133], { x: 0.46, y: 0.40 }); Object.assign(p[362], { x: 0.54, y: 0.40 }); Object.assign(p[263], { x: 0.60, y: 0.40 })
  Object.assign(p[234], { x: 0.35, y: 0.45 }); Object.assign(p[454], { x: 0.65, y: 0.45 }); Object.assign(p[10], { x: 0.5, y: 0.2 }); Object.assign(p[152], { x: 0.5, y: 0.7 })
  const level = faceSignal(p, { mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }, 0.75)
  assert.equal(level.smile, 80)
  assert.equal(level.tilt, 0)
  assert.equal(level.size, 0.3)
  // 오른쪽 눈이 내려가면(머리 위가 오른쪽으로) + 기울기
  Object.assign(p[362], { y: 0.43 }); Object.assign(p[263], { y: 0.43 })
  assert.ok(faceSignal(p, {}, 0.75).tilt > 5)
  const e = expression(reading({ faces: [face({ smile: 80 })] }))!
  assert.equal(e.label, '환한 미소')
  assert.equal(expression(reading({ faces: [face({ smile: 40 })] }))!.label, '살짝 미소')
  assert.equal(expression(reading({ faces: [face({ smile: 70 })] }))!.label, '살짝 미소', '입을 다문 옅은 미소(시험 사진 70)는 환한 미소가 아니다')
  assert.equal(expression(reading({ faces: [face({ smile: 5 })] }))!.label, '차분한 표정')
})

test('손 — 손가락을 펼친 정도만 잰다', () => {
  const open = points(21), closed = points(21)
  for (const hand of [open, closed]) { Object.assign(hand[5], { x: 0.45, y: 0.6 }); Object.assign(hand[17], { x: 0.55, y: 0.6 }); Object.assign(hand[2], { x: 0.4, y: 0.7 }); Object.assign(hand[4], { x: 0.3, y: 0.65 }) }
  Object.assign(open[8], { x: 0.3, y: 0.3 }); Object.assign(open[20], { x: 0.75, y: 0.35 })
  Object.assign(closed[8], { x: 0.45, y: 0.3 }); Object.assign(closed[20], { x: 0.55, y: 0.33 })
  assert.ok(handSignal(open, 0.75).spread >= 55)
  assert.ok(handSignal(closed, 0.75).spread < 25)
})

test('여럿 — 거리와 고개 방향(누가 누구인지는 보지 않는다)', () => {
  const near = reading({ subject: 'pair', faces: [face({ x: 0.36, size: 0.2, tilt: 8 }), face({ x: 0.6, size: 0.2, tilt: -7 })] })
  const far = reading({ subject: 'pair', faces: [face({ x: 0.2, size: 0.12 }), face({ x: 0.8, size: 0.12 })] })
  assert.ok(closeness(near)! >= 75)
  assert.ok(closeness(far)! < 45)
  assert.deepEqual(leaning(near), { both: true, one: false })
})

const SOMMELIER: Answers = { sweetness: 3, acidity: 3, body: 3, aromas: ['red-fruit'], occasion: 'meal', wineColor: 'any' }

test('사진은 답변 위에 점수를 더하고, 후보마다 무엇을 몇 점 더했는지 적는다', () => {
  const plain = recommend('sommelier', SOMMELIER)
  assert.ok([plain.primary, ...plain.alternatives].every((r) => !r.sections.some((s) => s.title === PHOTO_SECTION)), '사진이 없으면 사진 이야기도 없다')
  const dark = recommend('sommelier', SOMMELIER, reading({ outfit: wearing('#5A1A2A', '#111111'), faces: [face({ smile: 5 })] }))
  const all = [dark.primary, ...dark.alternatives]
  assert.ok(all.every((r) => r.sections.at(-1)?.title === PHOTO_SECTION))
  assert.ok((dark.primary.metrics?.find((m) => m.label === '바디')?.value ?? 0) >= 4, '짙은 옷·차분한 표정이면 묵직한 바디 쪽이 앞선다')
  const reasons = dark.primary.sections.at(-1)!.items!
  assert.ok(reasons.some((x) => /짙은 옷 색\(버건디\) → 묵직한 바디 \+8점/.test(x)), reasons.join('\n'))
  assert.ok(reasons.some((x) => /옷 색 버건디 → 레드 \+6점/.test(x)))
  const light = recommend('sommelier', SOMMELIER, reading({ outfit: wearing('#F4F2EE', '#D8C3A5'), faces: [face({ smile: 80 })] }))
  assert.ok((light.primary.metrics?.find((m) => m.label === '바디')?.value ?? 9) <= 3, '밝은 옷·환한 미소면 묵직한 바디가 앞서지 않는다')
  assert.notEqual(light.primary.id, dark.primary.id, '같은 답변이라도 사진이 다르면 첫 후보가 달라진다')
  assert.ok(light.primary.sections.at(-1)!.items!.some((x) => /환한 미소 → 과일향·단맛이 도는 스타일 \+6점/.test(x)))
})

test('옷 색과 닮은 칵테일·컬러, 옷 팔레트의 스타일·향', () => {
  const drink: Answers = { drinkType: 'mocktail', mood: 'fresh', flavors: ['berry'], ingredients: ['berry'], sweetness: 'normal', excluded: [], sparkle: 'yes' }
  const berry = recommend('cocktail', drink, reading({ outfit: wearing('#C85173') }))
  assert.match(berry.primary.title, /베리 스파크/)
  assert.ok(berry.primary.sections.at(-1)!.items!.some((x) => x.startsWith('옷 색 핑크와 가장 닮은 색의 한 잔 +10점') || x.includes('가장 닮은 색의 한 잔 +10점')))

  const style: Answers = { occasion: 'weekend', styles: ['minimal', 'natural'], palette: 'neutral', silhouette: 'regular', focus: 'top' }
  const earth = recommend('style-profiler', style, reading({ outfit: wearing('#8B5A2B', '#D8C3A5') }))
  assert.equal(earth.primary.palette?.[0], earth.primary.sections.at(-1) && wearing('#8B5A2B')[0].hex, '무드보드 첫 색은 옷에서 읽은 색')
  assert.ok(earth.primary.sections.at(-1)!.items!.some((x) => /어스 톤을 쓰는 스타일 \+12점/.test(x)))

  const scent: Answers = { families: ['floral'], occasion: 'everyday', mood: 'fresh', intensity: 3, avoided: [] }
  const yellow = recommend('scent', scent, reading({ outfit: wearing('#F1C40F') }))
  assert.ok(yellow.primary.sections.at(-1)!.items!.some((x) => x.startsWith('옷 색 옐로 → 시트러스')))

  const aura: Answers = { mood: 'calm', energy: 2, atmosphere: 'quiet', color: 'lavender' }
  const sky = recommend('aura', aura, reading({ outfit: wearing('#87CEEB') }))
  assert.ok([sky.primary, ...sky.alternatives].some((r) => r.sections.at(-1)!.items!.some((x) => x.includes('옷 색 스카이 블루와 가장 닮은 하늘색의 숨 고르기 +12점'))))
})

test('사진 없이 하거나 옷 색을 못 읽어도 결과는 나오고, 못 읽었다고 적는다', () => {
  const missing = reading({ outfitMissing: true })
  const made = recommend('coord', { weather: 'mild', occasion: 'work', style: 'minimal', palette: 'neutral', included: [], excluded: [] }, missing)
  assert.match(made.primary.sections.at(-1)!.body, /옷 색 이번에는 읽지 못했어요/)
  assert.deepEqual(readingFacts(missing, PHOTO_PLANS.coord).map((f) => f.value), ['이번에는 읽지 못했어요'])
})

test('스타 무드는 표정·옷 색으로 짚기만 하고 얼굴을 비교한다는 말을 하지 않는다', () => {
  assert.equal(suggestMood(reading({ faces: [face({ smile: 80 })] }))?.id, 'bright')
  assert.equal(suggestMood(reading({ outfit: wearing('#111111') }))?.id, 'chic')
  assert.equal(suggestMood(reading({ outfit: wearing('#F4F2EE'), faces: [face({ smile: 40 })] }))?.id, 'soft')
  assert.equal(suggestMood(reading({ faces: [face({ smile: 80 })] }))?.reason, '환한 미소')
  const story = cameraStory('lookalike', 'chic', reading({ faces: [face({ smile: 80 })], outfit: wearing('#F4F2EE') }))
  const text = JSON.stringify({ ...story, footnote: '' })
  assert.doesNotMatch(text, /닮았|닮은 연예인|유사도/)
  assert.match(story.sections.at(-1)!.items!.join(' '), /짚어 드린 무드 대신 직접 끌리는 무드를 골랐어요/)
})

test('손금 이야기는 손을 펼친 정도로 순서만 바꾸고, 손금 선을 읽는다고 하지 않는다', () => {
  const wide = reading({ subject: 'hand', faces: [], hand: { spread: 70, thumb: true } })
  assert.equal(palmFocus(wide), 1)
  assert.equal(palmFocus(reading({ subject: 'hand', faces: [], hand: { spread: 10, thumb: false } })), 2)
  assert.equal(palmFocus(null), 0)
  const story = cameraStory('palm', '', wide)
  assert.equal(story.sections[0].title, '생각의 선')
  assert.match(story.summary, /사진 속 손\(손가락을 활짝 펼침 · 엄지를 벌림\)을 보고 '생각의 선' 이야기를 먼저 펼쳤어요/)
  assert.match(story.footnote!, /실제 손금 선을 해석하지 않으며/)
})

test('관상 이야기는 표정으로 한 줄을 더하고 성격·운명을 말하지 않는다', () => {
  const story = cameraStory('face', 'rest', reading({ faces: [face({ smile: 80, tilt: 9 })], outfit: wearing('#1B2A4A') }))
  const line = story.sections.find((s) => s.title === '오늘의 한마디')!.body
  assert.match(line, /환하게 웃으며/)
  assert.match(line, /다른 각도에서/)
  assert.match(line, /입고 온 네이비예요/)
  assert.doesNotMatch(line, /성격|운명|능력|팔자|타고난/)
})

test('함께 찍은 사진은 얼굴을 이름과 짝짓지 않고 사진 속 모습만 적는다', () => {
  const people = ['하늘', '수아', '민', '도윤'].map((name, i) => ({ ...newParticipant(i), name, role: 'idea', interests: ['art'] }))
  const photo = reading({ subject: 'group', faces: [face({ x: 0.3, size: 0.14, smile: 90 }), face({ x: 0.48, size: 0.14, smile: 80 }), face({ x: 0.66, size: 0.14, smile: 70 })], outfit: wearing('#C0392B', '#1B2A4A') })
  const result = analyzeParticipants('team', people, photo).result
  const part = result.sections.find((s) => s.title === '사진 속 우리 팀')!
  assert.match(part.items![0], /사진에서 찾은 얼굴 3명 · 참여자 4명 — 모두 들어오지 않았다면/)
  assert.ok(part.items!.some((x) => x === '서 있는 거리: 어깨가 닿을 만큼 가까이'))
  assert.ok(people.every((p) => !part.items!.join(' ').includes(p.name)), '얼굴과 이름을 짝짓지 않는다')
  assert.deepEqual(result.palette, photo.outfit.map((c) => c.hex))
})

test('터치 전시의 첫 설정 — 무엇을 읽어 무엇을 골랐는지 함께 돌려준다', () => {
  const dim = reading({ scene: { brightness: 30, warmth: 12 }, outfit: wearing('#C0392B') })
  assert.deepEqual(photoProduct(dim).patch, { brightness: 85, color: '#BA715F', on: true })
  assert.deepEqual(photoHeritage(dim).patch, { light: 'night', scene: 'court' })
  assert.deepEqual(photoHeritage(reading({ scene: { brightness: 75, warmth: 2 }, outfit: wearing('#87CEEB') })).patch, { light: 'day', scene: 'pond' })
  const wall = photoWall(reading({ outfit: wearing('#7C86BE'), faces: [face({ smile: 80 })] }))
  assert.deepEqual(wall.patch, { color: '#7C86BE', shape: 'circle' })
  assert.ok((EXHIBIT_COLORS as readonly string[]).includes(photoWall(reading({ outfit: wearing('#1B2A4A') })).patch.color!))
  const mission = photoMission(reading({ outfit: wearing('#1560BD') }))!
  assert.equal(mission.name, '내 옷 색 · 블루')
  assert.ok(mission.target[2] > mission.target[0])
  assert.equal(photoMission(reading()), null, '옷 색이 없으면 미션을 지어내지 않는다')
})

test('모든 체험에 사진 계획이 있고, 영수증은 사진에서 읽은 것을 빠뜨리지 않는다', () => {
  // 사진을 쓰지 않는 체험(주거복지 내비게이터·성향 테스트)은 읽을 것도 없다
  for (const id of EXPANSION_IDS) assert.ok(PHOTO_PLANS[id] && ((NO_PHOTO_IDS as readonly string[]).includes(id) ? !PHOTO_PLANS[id].reads.length : PHOTO_PLANS[id].reads.length), id)
  const travel = recommend('travel', { companion: 'friends', duration: 'two-days', activities: ['culture', 'food', 'nature'], pace: 'active', setting: 'mixed', planning: 'planned' }, reading({ faces: [face({ smile: 90 })], outfit: wearing('#C0392B') }))
  const receipt = expansionReceipt('travel', travel.primary)
  const headings = receipt.blocks.filter((b) => b.kind === 'heading').map((b) => (b as { text: string }).text)
  assert.equal(headings.at(-1), PHOTO_SECTION)
  assert.ok(headings.length <= 4)
  assert.equal(receipt.tag, 'TRIP!')
  assert.ok(receipt.blocks.every((b) => b.kind !== 'image' || !b.src.startsWith('data:')), '영수증에 촬영 사진은 없다')
  const lists = receipt.blocks.filter((b) => b.kind === 'list') as { items: string[] }[]
  assert.ok(lists.every((b) => b.items.length <= 5))
})

test('outfitLook — 팔레트·온도·짙기', () => {
  assert.deepEqual(['palette', 'tone', 'depth'].map((k) => outfitLook(reading({ outfit: wearing('#1B2A4A', '#F4F2EE') }))![k as 'palette']), ['neutral', 'cool', 'dark'])
  assert.equal(outfitLook(reading({ outfit: wearing('#8B5A2B') }))!.palette, 'earth')
  assert.equal(outfitLook(reading({ outfit: wearing('#E63946') }))!.palette, 'vivid')
  assert.equal(outfitLook(reading())?.palette, undefined)
})

test('표정을 읽는 취향 체험은 세 표정 모두에서 사진 점수를 준다(어느 표정이든 결과에 반영된다)', () => {
  const answers: Record<string, Answers> = {
    sommelier: SOMMELIER,
    cocktail: { drinkType: 'mocktail', mood: 'fresh', flavors: ['berry'], ingredients: ['berry'], sweetness: 'normal', excluded: [], sparkle: 'yes' },
    barista: { usual: 'black', caffeine: 'regular', acidity: 3, body: 3, roast: 'medium', brew: 'filter', serve: 'hot' },
    'taste-dna': { tastes: ['sweet', 'nutty'], intensity: 3, pairing: 'fresh', texture: 'crisp', excluded: [] },
    aura: { mood: 'calm', energy: 2, atmosphere: 'quiet', color: 'lavender' },
    travel: { companion: 'solo', duration: 'day', activities: ['culture'], pace: 'balanced', setting: 'mixed', planning: 'planned' },
    scent: { families: ['floral'], occasion: 'everyday', mood: 'fresh', intensity: 3, avoided: [] },
  }
  for (const [id, a] of Object.entries(answers)) for (const smile of [5, 50, 90]) {
    const bundle = recommend(id as Parameters<typeof recommend>[0], a, reading({ faces: [face({ smile })] }))
    const label = expression(reading({ faces: [face({ smile })] }))!.label
    assert.ok([bundle.primary, ...bundle.alternatives].some((r) => r.sections.at(-1)!.items!.some((x) => x.startsWith(label))), `${id} · ${label}`)
  }
})
