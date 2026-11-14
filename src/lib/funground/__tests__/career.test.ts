// 펀그라운드 B안 미래 직업 탐색 — 질문 여덟 개 점수(src/lib/funground/career.ts)와 축 조합 풀이 고르기(career-combos.ts)
// 키오스크 studio-career 의 결과(exploreCareers 기존 인자)가 그대로인지도 본다.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { CAREER_AXES, CAREER_INTERESTS, exploreCareers, type CareerAxis, type CareerInterest } from '../../../app/kiosk/experience/career/data'
import { FG_CAREER_EXTRA_QUESTION, FG_CAREER_QUESTION_COUNT, FG_CAREER_TOTAL, exploreFgCareers } from '../career'
import { CAREER_COMBOS, pickCareerCombo } from '../career-combos'

const sentences = (body: string[]) => body.length

test('질문은 여덟 개 — 활동 · MBTI · 상황 질문 여섯', () => {
  assert.equal(FG_CAREER_TOTAL, 8)
  assert.equal(FG_CAREER_QUESTION_COUNT, 6)
})

test('새 상황 질문은 네 축에 보기 하나씩', () => {
  assert.deepEqual(FG_CAREER_EXTRA_QUESTION.options.map((o) => o.axis).sort(), [...CAREER_AXES].sort())
})

test('축 조합 풀이는 1위 × 2위 순서 있는 짝 12개 — 모두 있고 서너 문장', () => {
  assert.equal(CAREER_COMBOS.length, 12)
  const keys = new Set(CAREER_COMBOS.map((c) => c.key))
  assert.equal(keys.size, 12)
  for (const a of CAREER_AXES) for (const b of CAREER_AXES) if (a !== b) assert.ok(keys.has(`${a}-${b}`), `${a}-${b}`)
  for (const c of CAREER_COMBOS) {
    assert.ok(sentences(c.body) >= 3 && sentences(c.body) <= 4, c.key)
    // 체험 프로그램 · 능력 판정 없음
    assert.doesNotMatch(c.title + c.body.join(' '), /AI|적성|능력|재능|잘해요|타고났/, c.key)
  }
})

test('풀이는 점수 순서의 1위 · 2위 축으로 고른다', () => {
  assert.equal(pickCareerCombo(['talk', 'make', 'solve', 'help']).title, '아이디어 PD')
  assert.equal(pickCareerCombo(['make', 'talk', 'help', 'solve']).key, 'make-talk')
  assert.throws(() => pickCareerCombo(['make', 'make'] as CareerAxis[]))
})

test('같은 답이면 늘 같은 결과', () => {
  const run = () => exploreFgCareers(['story', 'craft'], 'ENFP', [2, 2, 0, 1, 0, 3])
  assert.deepEqual(run(), run())
  assert.deepEqual(run().axes.slice(0, 2), ['talk', 'make'])
  assert.equal(pickCareerCombo(run().axes).title, '아이디어 PD')
  assert.deepEqual(run().careers, ['content-planner', 'brand-designer', 'host'])
})

test('새 질문은 기존 상황 질문과 같은 2점 — 동점을 가른다', () => {
  // 만들기 활동 + 문제 풀기 활동, 상황 질문 다섯은 답 없음 → 만들기 · 문제 풀기 동점(먼저 고른 만들기가 앞)
  const none = [null, null, null, null, null]
  assert.equal(exploreFgCareers(['craft', 'puzzle'], null, [...none, null]).axes[0], 'make')
  assert.equal(exploreFgCareers(['craft', 'puzzle'], null, [...none, 1]).axes[0], 'solve')
  assert.deepEqual(exploreFgCareers(['craft', 'puzzle'], null, [...none, 1]).axes.slice(0, 2), ['solve', 'make'])
})

test('studio-career(기존 인자) 결과는 그대로 — extra 를 넘기지 않으면 바뀌지 않는다', () => {
  const cases: [CareerInterest[], number[]][] = [[['craft'], [0, 0, 0, 0, 0]], [['care', 'teach'], [1, 1, 2, 0, 1]], [['lead', 'explore'], [2, 0, 1, 1, 2]]]
  for (const [interests, answers] of cases) {
    assert.deepEqual(exploreCareers(interests, answers, 'ISTJ', ['eyes-big']), exploreCareers(interests, answers, 'ISTJ', ['eyes-big'], []))
  }
  // 고정값(고치기 전 data.ts 로 낸 값) — 바뀌면 키오스크 결과가 바뀐 것
  assert.deepEqual(exploreCareers(['craft'], [0, 0, 0, 0, 0]), { axes: ['make', 'solve', 'help', 'talk'], careers: ['product-designer', 'developer', 'space-designer'] })
  // 펀그라운드판은 앞 다섯 답이 같고 새 질문에 답이 없으면 키오스크(관상 · MBTI 없음)와 같은 결과
  assert.deepEqual(exploreFgCareers(['care', 'teach'], null, [1, 1, 2, 0, 1, null]), exploreCareers(['care', 'teach'], [1, 1, 2, 0, 1]))
})

test('여덟 질문으로 12개 풀이가 모두 나올 수 있고 한쪽으로 쏠리지 않는다', () => {
  // 활동 하나 또는 둘 × 상황 질문 여섯의 모든 답(3^5 × 4), MBTI 없음
  const ids = CAREER_INTERESTS.map((i) => i.id)
  const sets: CareerInterest[][] = [...ids.map((a) => [a]), ...ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b]))]
  const count = new Map<string, number>()
  const first = new Map<CareerAxis, number>()
  let total = 0
  for (const interests of sets) for (let n = 0; n < 243 * 4; n++) {
    const answers = [n % 3, Math.floor(n / 3) % 3, Math.floor(n / 9) % 3, Math.floor(n / 27) % 3, Math.floor(n / 81) % 3, Math.floor(n / 243)]
    const { axes } = exploreFgCareers(interests, null, answers)
    const key = pickCareerCombo(axes).key
    count.set(key, (count.get(key) ?? 0) + 1)
    first.set(axes[0], (first.get(axes[0]) ?? 0) + 1)
    total++
  }
  assert.equal(count.size, 12)
  // 1위 축 비율 — 네 축 모두 15~35% 안
  for (const axis of CAREER_AXES) {
    const share = (first.get(axis) ?? 0) / total
    assert.ok(share > 0.15 && share < 0.35, `${axis} ${share.toFixed(3)}`)
  }
  console.log('1위 축 비율', Object.fromEntries(CAREER_AXES.map((a) => [a, ((first.get(a) ?? 0) / total).toFixed(3)])))
  console.log('조합 비율', Object.fromEntries([...count].sort().map(([k, v]) => [k, (v / total).toFixed(3)])))
})
