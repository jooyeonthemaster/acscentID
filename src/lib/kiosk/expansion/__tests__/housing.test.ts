import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildAiPrompt, readAiRequest } from '../ai'
import {
  HOME_SCENES, HOME_STYLES, homeResult, MATE_PROFILES, MATE_QUESTIONS, MATE_TYPES, matchPolicies, mateResult, naviCandidates,
  naviResult, rankMates, type Answers,
} from '../housing'
import { buildImagePrompt, readImageParams } from '../image-prompts'
import { expansionReceipt } from '../receipt'

const navi = (patch: Answers = {}): Answers => ({ age: 'youth', family: 'single', home: 'monthly', owner: 'none', income: 'lower', need: ['rent'], ...patch })
const ids = (a: Answers) => matchPolicies(a).map((m) => m.id)

test('내비게이터 — 월세 사는 무주택 청년에게는 청년 월세 지원이 먼저', () => {
  const list = ids(navi())
  assert.equal(list[0], 'youth-rent')
  assert.ok(list.includes('youth-deposit-loan'))
  assert.ok(!list.includes('senior-house'))
})

test('내비게이터 — 집이 있으면 무주택 대상 대출·임대를 짚지 않는다', () => {
  const list = ids(navi({ owner: 'has', need: ['repair'], home: 'own' }))
  for (const id of ['youth-rent', 'beotimmok', 'didimdol', 'happy-house', 'integrated-rental', 'newborn-loan']) assert.ok(!list.includes(id), id)
  assert.ok(list.includes('repair'))
})

test('내비게이터 — 소득이 높은 편이면 소득 기준이 있는 지원을 빼고, 생활이 빠듯하면 주거급여를 먼저', () => {
  assert.ok(!ids(navi({ income: 'high' })).includes('youth-rent'))
  assert.equal(ids(navi({ income: 'low', age: 'middle' }))[0], 'housing-benefit')
})

test('내비게이터 — 아기가 있는 무주택 가구는 신생아 특례 대출, 어르신은 고령자 복지주택, 전세 보증금 걱정은 반환보증', () => {
  assert.equal(ids(navi({ age: 'middle', family: 'baby', home: 'jeonse', need: ['buy'] }))[0], 'newborn-loan')
  assert.ok(ids(navi({ age: 'senior', family: 'single', home: 'monthly', need: ['care'] })).includes('senior-house'))
  assert.equal(ids(navi({ age: 'middle', family: 'family', home: 'jeonse', income: 'high', owner: 'has', need: ['deposit'] }))[0], 'deposit-guarantee')
})

test('내비게이터 — 결과 카드: 정책마다 대상·알아볼 곳, 마지막은 마이홈 상담, 금액·금리 숫자는 없다', () => {
  const result = naviResult(navi())
  assert.ok(result.sections.length >= 2)
  assert.equal(result.sections.at(-1)!.title, '더 알아보기')
  for (const s of result.sections.slice(0, -1)) {
    assert.ok(s.items?.some((x) => x.startsWith('대상:')))
    assert.ok(s.items?.some((x) => x.startsWith('알아볼 곳:')))
  }
  const text = JSON.stringify(result)
  assert.ok(!/\d+\s*(만\s*원|원|%|퍼센트)/.test(text), '금액·금리 숫자를 만들지 않는다')
})

test('내비게이터 — 맞는 정책이 하나도 없으면 마이홈 상담만 짚는다', () => {
  const result = naviResult({ age: 'middle', family: 'family', home: 'own', owner: 'has', income: 'high', need: ['buy'] })
  assert.equal(result.sections.length, 1)
  assert.equal(result.sections[0].title, '마이홈 맞춤 상담')
})

test('내비게이터 — AI 후보는 넷까지, AI 지시문에 숫자를 지어내지 말라는 규칙이 들어간다', () => {
  const candidates = naviCandidates(navi({ need: ['rent', 'public'] }))
  assert.ok(candidates.length <= 4 && candidates.length >= 1)
  const req = readAiRequest({ id: 'housing-navi', photo: null, answers: [], candidates, context: '' })!
  const prompt = buildAiPrompt(req)
  assert.match(prompt, /금액·금리·소득 기준 숫자/)
  assert.match(prompt, /사진 없음/)
})

test('성향 테스트 — 문항마다 답하면 여섯 성향 중 하나, 잘 맞는 이웃은 다른 성향', () => {
  for (const type of MATE_TYPES) assert.notEqual(MATE_PROFILES[type].match, type)
  const allFirst = Object.fromEntries(MATE_QUESTIONS.map((q) => [q.key, q.options[0].id]))
  const allSecond = Object.fromEntries(MATE_QUESTIONS.map((q) => [q.key, q.options[1].id]))
  assert.equal(rankMates(allFirst)[0], 'lounge')
  assert.equal(rankMates(allSecond)[0], 'garden')
  const result = mateResult(allFirst)
  assert.equal(result.metrics?.length, 4)
  assert.ok(result.metrics!.every((m) => m.value >= 0 && m.value <= 10))
  assert.ok(result.sections.some((s) => s.title === '스탬프 랠리'))
  // AI 분석 절이 맨 앞에 붙어도 영수증에 도장 칸이 남는다
  const withAi = { ...result, sections: [{ title: 'AI 분석 · 한 줄', body: '풀이' }, ...result.sections] }
  const headings = expansionReceipt('housing-mate', withAi).blocks.filter((b) => b.kind === 'heading').map((b) => (b as { text: string }).text)
  assert.ok(headings.includes('스탬프 랠리'), headings.join(' / '))
})

test('성향 테스트 — 어느 성향이든 한 번은 1등이 될 수 있다(답 조합 탐색)', () => {
  const seen = new Set<string>()
  const keys = MATE_QUESTIONS.map((q) => q.key)
  for (let n = 0; n < 4 ** 4; n++) {
    const a: Answers = {}
    keys.forEach((key, i) => { a[key] = MATE_QUESTIONS[i].options[(Math.floor(n / 4 ** (i % 4)) + i) % 4].id })
    seen.add(rankMates(a)[0])
  }
  for (const type of MATE_TYPES) assert.ok(seen.has(type), type)
})

test('2036 우리 집 — 장면·화풍 검사, 선화는 흑백, 그림에 다른 사람·글자 없음', () => {
  assert.equal(readImageParams('housing-home', { scene: 'mars', style: 'line' }), null)
  for (const scene of Object.keys(HOME_SCENES)) for (const style of Object.keys(HOME_STYLES)) {
    const params = readImageParams('housing-home', { scene, style })!
    const { prompt, aspect } = buildImagePrompt(params)
    assert.equal(aspect, '3:4')
    assert.match(prompt, /Nobody else appears/)
    assert.match(prompt, /letters/)
    if (style === 'line') assert.match(prompt, /STRICTLY BLACK AND WHITE/)
  }
  assert.match(homeResult('share', 'line').title, /2036/)
})

test('영수증 — 사진을 쓰지 않는 체험은 사진 이야기 대신 입력 이야기를 꼬리말에', () => {
  assert.match(expansionReceipt('housing-navi', naviResult(navi())).foot ?? '', /입력한 내용은 저장하지 않아요/)
  assert.match(expansionReceipt('housing-home', homeResult('smart', 'line'), { src: 'data:image/jpeg;base64,AA', caption: '그림' }).foot ?? '', /촬영 사진은 저장하지 않아요/)
})
