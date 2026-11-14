// 펀그라운드 사주(src/lib/funground/saju-reading.ts) · AI 포춘(saju-fortune.ts · api/funground/fortune) — 실제 AI 는 부르지 않는다
// 미리 쓴 문장은 정확히 55개 · 같은 생일이면 같은 풀이 · 2007~2017년생이면 55문장이 모두 쓰인다 · 금지어 없음 · AI 응답 검사 · 키 없으면 바로 대신
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { sipseongOf, type Gan } from '@/lib/saju'
import {
  DAY_MASTER_LINES, FG_ELEMENTS, FG_YEAR_GANJI, YEAR_LINES, buildFgSajuReading, fgLocalSaju, fgSajuAllLines,
  fgSajuChart, fgSajuLineCounts, fgForbiddenWord, parseFgBirth, type FgBirth,
} from '../saju-reading'
import { buildFgFortunePrompt, parseFgFortune, requestFgFortune } from '../saju-fortune'
import { fgChartView } from '../saju-reading'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/funground/fortune/route'

const BIRTH: FgBirth = { year: 2012, month: 5, day: 7, calendar: 'solar', hourIndex: 6 }

test('미리 쓴 문장은 55개 — 일간 10 · 많은 오행 5 · 적은 오행 5 · 용신 5 · 2027년 10 · 청소년 주제 15 · 행운 5', () => {
  assert.deepEqual(fgSajuLineCounts(), { dayMaster: 10, strong: 5, weak: 5, yongsin: 5, year2027: 10, topics: 15, lucky: 5 })
  const all = fgSajuAllLines()
  assert.equal(all.length, 55)
  assert.equal(new Set(all.map((l) => l.id)).size, 55, 'id 가 겹치지 않는다')
})

test('문장에 향 처방 · 연애 · 돈 · 외모 · 점수 같은 말이 없다', () => {
  for (const line of fgSajuAllLines()) {
    for (const text of [line.title, line.text]) {
      assert.equal(fgForbiddenWord(text), null, `${line.id}: ${text}`)
      assert.doesNotMatch(text, /(?<!방)향/, `${line.id} 에 '향'`) // 「방향」만 허용
      assert.ok(text.length <= 90, `${line.id} 가 너무 길다(${text.length}자)`)
    }
  }
})

test('2027년(정미) 표 — 해 천간 정(丁)이 일간에게 무엇인지(sipseongOf)와 같다', () => {
  for (const gan of Object.keys(DAY_MASTER_LINES) as Gan[]) {
    assert.equal(YEAR_LINES[gan].sipseong, sipseongOf(gan, FG_YEAR_GANJI.gan), gan)
  }
})

test('같은 생일 → 같은 풀이(시간 모름도)', () => {
  assert.deepEqual(fgLocalSaju(BIRTH), fgLocalSaju({ ...BIRTH }))
  const unknown = { ...BIRTH, hourIndex: null }
  assert.deepEqual(fgLocalSaju(unknown), fgLocalSaju(unknown))
  const r = fgLocalSaju(BIRTH)
  assert.equal(r.engine, 'local')
  assert.equal(r.fallback, false)
  assert.equal(r.reading.ids.length, 11)
})

test('검증된 원국 — 1995-08-15 04시(인시) = 을해 갑신 무인 갑인 · 무토 일간 → 2027년은 정인', () => {
  const chart = fgSajuChart({ year: 1995, month: 8, day: 15, calendar: 'solar', hourIndex: 2 })
  const p = chart.pillars
  assert.equal(`${p.year.gan}${p.year.ji} ${p.month.gan}${p.month.ji} ${p.day.gan}${p.day.ji} ${p.hour?.gan}${p.hour?.ji}`, '을해 갑신 무인 갑인')
  const reading = buildFgSajuReading(chart)
  assert.equal(reading.dayMaster.gan, '무')
  assert.equal(reading.year2027.sipseong, '정인')
  assert.ok(reading.ids.includes('day-무') && reading.ids.includes('y27-무'))
  const view = fgChartView(chart)
  assert.deepEqual(view.pillars.map((x) => x.key), ['hour', 'day', 'month', 'year'])
  assert.equal(FG_ELEMENTS.reduce((s, e) => s + view.percent[e], 0), 100)
})

test('음력 · 윤달 — 2023년 윤2월 1일 = 양력 3월 22일, 윤달 없는 달은 오류', () => {
  const r = fgLocalSaju({ year: 2023, month: 2, day: 1, calendar: 'lunar', isLeapMonth: true, hourIndex: null })
  assert.equal(r.chart.solarLabel, '양력 2023년 3월 22일')
  assert.equal(r.chart.lunarLabel, '음력 2023년 윤2월 1일')
  assert.equal(r.chart.isThreePillar, true)
  assert.equal(r.chart.pillars[0].pillar, null)
  assert.throws(() => fgSajuChart({ year: 2024, month: 2, day: 1, calendar: 'lunar', isLeapMonth: true, hourIndex: null }))
})

test('2007~2017년생이면 55문장이 모두 한 번 이상 쓰인다', () => {
  const used = new Set<string>()
  for (let y = 2007; y <= 2017; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      for (let d = 1; d <= 28; d += 4) {
        for (const h of [null, 0, 6]) fgLocalSaju({ year: y, month: m, day: d, calendar: 'solar', hourIndex: h }).reading.ids.forEach((id) => used.add(id))
      }
    }
  }
  const missing = fgSajuAllLines().map((l) => l.id).filter((id) => !used.has(id))
  assert.deepEqual(missing, [])
})

test('API 생일 검사', () => {
  assert.deepEqual(parseFgBirth({ year: 2012, month: 5, day: 7, calendar: 'solar', hourIndex: null }), { year: 2012, month: 5, day: 7, calendar: 'solar', isLeapMonth: false, hourIndex: null })
  for (const bad of [null, {}, { year: 2012, month: 13, day: 1, calendar: 'solar' }, { year: 2012, month: 1, day: 1, calendar: 'x' }, { year: 2012, month: 1, day: 1, calendar: 'solar', hourIndex: 12 }, { year: '2012', month: 1, day: 1, calendar: 'solar' }]) {
    assert.throws(() => parseFgBirth(bad), JSON.stringify(bad))
  }
})

// ───────── A안 AI 포춘 ─────────

const local = () => fgLocalSaju(BIRTH).reading
const card = (title: string, text = '친구와 함께 새로운 걸 해 보면 즐거운 일이 생길 수 있어요.') => ({ title, text })
const goodAnswer = () => ({
  dayMaster: card('곧게 자라는 나무'), strong: card('토가 많아요'), weak: card('수가 적어요'), yongsin: card('힘이 되는 수'),
  year2027: card('배움의 해'),
  topics: { study: card('공부'), friend: card('친구'), career: card('진로'), dream: card('꿈'), mind: card('마음') },
  lucky: { ...card('파랑 기운'), color: '파랑', item: '물병', habit: '물 마시기' },
})

test('AI 응답 — 맞는 JSON 은 문장만 갈아 끼우고 원국 사실(오행 · 십성 · id)은 그대로', () => {
  const base = local()
  const merged = parseFgFortune('```json\n' + JSON.stringify(goodAnswer()) + '\n```', base)
  assert.equal(merged.topics.dream.title, '꿈')
  assert.equal(merged.dayMaster.gan, base.dayMaster.gan)
  assert.equal(merged.year2027.sipseong, base.year2027.sipseong)
  assert.equal(merged.lucky.swatch, base.lucky.swatch)
  assert.deepEqual(merged.ids, base.ids)
})

test('AI 응답 — 틀린 JSON · 빠진 주제 · 금지어 · 너무 긴 글은 던진다', () => {
  const base = local()
  assert.throws(() => parseFgFortune('not json', base))
  const noTopic = goodAnswer() as Record<string, unknown>
  delete (noTopic.topics as Record<string, unknown>).mind
  assert.throws(() => parseFgFortune(JSON.stringify(noTopic), base), /topics\.mind/)
  const romance = goodAnswer()
  romance.topics.friend = card('친구', '올해는 연애 운이 좋아요.')
  assert.throws(() => parseFgFortune(JSON.stringify(romance), base), /연애/)
  const scent = goodAnswer()
  scent.lucky.item = '향수'
  assert.throws(() => parseFgFortune(JSON.stringify(scent), base), /향수/)
  const long = goodAnswer()
  long.weak = card('길다', '가'.repeat(400))
  assert.throws(() => parseFgFortune(JSON.stringify(long), base), /너무 깁니다/)
})

test('AI 프롬프트 — 원국은 넣고 생년월일 숫자는 넣지 않는다 · 향 처방은 금지로만 나온다', () => {
  const chart = fgSajuChart(BIRTH)
  const prompt = buildFgFortunePrompt(chart, fgChartView(chart), buildFgSajuReading(chart))
  assert.doesNotMatch(prompt, /2012/)
  assert.match(prompt, /재미로 보는 풀이/)
  assert.match(prompt, /2027년/)
  const scentLines = prompt.split('\n').filter((line) => line.includes('향'))
  assert.equal(scentLines.length, 1)
  assert.match(scentLines[0], /^- 절대 쓰지 않는 것/)
})

const fakeFetch = (status: number, body: unknown, delayMs = 0): typeof fetch =>
  ((_url: unknown, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response(JSON.stringify(body), { status })), delayMs)
    init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('aborted', 'AbortError')) })
  })) as typeof fetch

test('OpenRouter 호출 — 성공이면 비용을 읽고, 오류 · 잘림 · 시간 초과는 던진다(실제 호출 없음)', async () => {
  const args = { apiKey: 'test', prompt: 'p', local: local(), timeoutMs: 200 }
  const ok = await requestFgFortune(args, fakeFetch(200, { choices: [{ message: { content: JSON.stringify(goodAnswer()) }, finish_reason: 'stop' }], usage: { cost: 0.0012 } }))
  assert.equal(ok.cost, 0.0012)
  assert.equal(ok.reading.topics.study.title, '공부')
  await assert.rejects(requestFgFortune(args, fakeFetch(500, { error: 'x' })), /OpenRouter 500/)
  await assert.rejects(requestFgFortune(args, fakeFetch(200, { choices: [{ message: { content: '{"a":' }, finish_reason: 'length' }] })), /잘렸습니다/)
  await assert.rejects(requestFgFortune(args, fakeFetch(200, {}, 1000)), /시간 초과/)
})

test('fortune API — 펀그라운드 키가 없으면 AI 를 부르지 않고 바로 미리 쓴 풀이(fallback)', async () => {
  delete process.env.OPENROUTER_FUNGROUND_API_KEY
  process.env.OPENROUTER_API_KEY = 'must-not-be-used'
  let called = false
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => { called = true; throw new Error('호출하면 안 된다') }) as typeof fetch
  try {
    const req = new NextRequest('http://localhost/api/funground/fortune', { method: 'POST', body: JSON.stringify({ birth: BIRTH }) })
    const res = await POST(req)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.success, true)
    assert.equal(data.engine, 'ai')
    assert.equal(data.fallback, true)
    assert.equal(data.reason, 'no-key')
    assert.deepEqual(data.reading, fgLocalSaju(BIRTH).reading)
    const bad = await POST(new NextRequest('http://localhost/api/funground/fortune', { method: 'POST', body: JSON.stringify({ birth: { year: 2012 } }) }))
    assert.equal(bad.status, 400)
    assert.equal(called, false)
  } finally {
    globalThis.fetch = realFetch
    delete process.env.OPENROUTER_API_KEY
  }
})
