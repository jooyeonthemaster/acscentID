// 펀그라운드 미래 신문(src/lib/funground/news-template.ts · news-ai.ts · api/funground/news) — 실제 AI 는 부르지 않는다
// 288가지 대답 조합 모두 지면 길이 · 금지어 검사를 통과 · 같은 대답이면 같은 기사 · 1면 제목 48개가 모두 다름 · AI 응답 검사 · 키 없으면 바로 대신
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  NEWS_DREAMS, NEWS_LIKES, NEWS_WISHES, allNewsAnswers, buildNewsStory, checkNewsStory, newsDateline, newsForbiddenWord,
  newsMemoRows, parseNewsAnswers, type NewsAnswers, type NewsStory,
} from '../news-template'
import { buildFgNewsPrompt, normalizeArticle, parseFgNews, requestFgNews } from '../news-ai'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/funground/news/route'

const ANSWERS: NewsAnswers = { dream: 'inventor', like: 'animals', wish: 'earth' }

test('고르기 목록 — 꿈 8 · 좋아하는 것 6 · 해 보고 싶은 일 6, id 가 겹치지 않는다', () => {
  assert.equal(NEWS_DREAMS.length, 8)
  assert.equal(NEWS_LIKES.length, 6)
  assert.equal(NEWS_WISHES.length, 6)
  for (const list of [NEWS_DREAMS, NEWS_LIKES, NEWS_WISHES]) assert.equal(new Set(list.map((o) => o.id)).size, list.length)
  // 화면 카드에 들어가는 길이
  for (const o of [...NEWS_DREAMS, ...NEWS_LIKES, ...NEWS_WISHES]) {
    assert.ok(o.label.length <= 12, `${o.id} 이름이 길다: ${o.label}`)
    assert.ok(o.line.length <= 18, `${o.id} 한 줄이 길다: ${o.line}`)
  }
})

test('288가지 조합 모두 — 지면 길이 · 문단 2~3 · 금지어 · 나이 표현 검사를 통과', () => {
  const all = allNewsAnswers()
  assert.equal(all.length, 288)
  for (const a of all) {
    const story = buildNewsStory(a)
    assert.equal(checkNewsStory(story), null, `${a.dream}/${a.like}/${a.wish}: ${checkNewsStory(story)}`)
    assert.ok(story.article[0].startsWith('(별내=미래 신문) 별내 출신 '), '첫 문단은 머리말로 시작')
    assert.ok(story.caption.startsWith('▲ '))
    // 사진 설명은 장소만 — 모습 · 표정을 말하지 않는다
    assert.doesNotMatch(story.caption, /웃|모습|표정|옷/)
  }
})

test('같은 대답이면 같은 기사 · 대답이 하나만 달라도 기사가 달라진다', () => {
  assert.deepEqual(buildNewsStory(ANSWERS), buildNewsStory({ ...ANSWERS }))
  const base = JSON.stringify(buildNewsStory(ANSWERS))
  for (const change of [{ dream: 'space' }, { like: 'books' }, { wish: 'town' }] as Partial<NewsAnswers>[]) {
    assert.notEqual(JSON.stringify(buildNewsStory({ ...ANSWERS, ...change })), base, JSON.stringify(change))
  }
})

test('1면 제목 48개(꿈 × 해 보고 싶은 일)가 모두 다르고, 대답에서 나온 호칭 · 날씨가 들어간다', () => {
  const heads = new Set<string>()
  for (const d of NEWS_DREAMS) for (const w of NEWS_WISHES) heads.add(buildNewsStory({ dream: d.id, like: 'books', wish: w.id }).headline)
  assert.equal(heads.size, 48)
  const vet = buildNewsStory({ dream: 'healer', like: 'animals', wish: 'help' })
  assert.equal(vet.kicker, '별내 출신 수의사')
  assert.match(vet.article[0], /별내 출신 수의사가 /)
  assert.equal(buildNewsStory({ dream: 'healer', like: 'stars', wish: 'help' }).kicker, '별내 출신 의사')
  assert.match(buildNewsStory({ ...ANSWERS, like: 'stars' }).sidebar.text, /별똥별/)
})

test('금지어 — 외모 · 돈 · 연애 · 순위 · 실존 상표 · 나이(「세계」는 괜찮다)', () => {
  for (const bad of ['얼굴이 환했다', '상금 1억 원', '연애를 시작했다', '금메달을 땄다', '유튜브에 올렸다', '12살 때', '중학생 시절']) {
    assert.notEqual(newsForbiddenWord(bad), null, bad)
  }
  for (const ok of ['세계 친구들과 함께', '세계로 떠났다', '별내 출신 발명가']) {
    assert.equal(newsForbiddenWord(ok), null, ok)
  }
})

test('지면 날짜 — 오늘에서 20년 뒤 같은 날 · 요일 · 호수(오늘 창간, 하루 한 호)', () => {
  const line = newsDateline(new Date(2026, 10, 14))
  assert.equal(line.date, '2046년 11월 14일')
  assert.equal(line.weekday, '수요일')
  assert.equal(line.year, 2046)
  assert.equal(line.issue, '제7,306호')
  assert.equal(newsDateline(new Date(2028, 1, 29)).date, '2048년 2월 29일')
  assert.deepEqual(newsMemoRows(ANSWERS).map((r) => r.value), ['발명가 · 과학자', '동물', '지구를 깨끗하게'])
})

test('요청의 대답 — 목록에 없는 id 는 받지 않는다', () => {
  assert.deepEqual(parseNewsAnswers(ANSWERS), ANSWERS)
  assert.equal(parseNewsAnswers({ ...ANSWERS, dream: 'pilot' }), null)
  assert.equal(parseNewsAnswers({ dream: 'inventor' }), null)
  assert.equal(parseNewsAnswers('inventor'), null)
  assert.equal(parseNewsAnswers({ ...ANSWERS, like: 'toString' }), null)
})

// ── A안 AI 기자 ──
const goodAnswer = () => ({
  headline: '바다를 깨끗하게 만든 로봇 물고기',
  subhead: '동물을 아끼던 마음이 바다를 살렸다',
  article: [
    '(별내=미래 신문) 별내 출신 발명가가 바다 쓰레기를 먹는 로봇 물고기를 내놓았다.',
    '발명가는 “어릴 적 강아지를 관찰하며 아이디어를 얻었어요”라고 말했다.',
    '다음 목표는 하늘을 맑게 하는 로봇 새라고 한다.',
  ],
  caption: '미래 도시 발명 전시장에서',
  sidebar: { title: '오늘의 별내 날씨', text: '맑음 · 로봇 물고기 산책 중' },
})
const local = (): NewsStory => buildNewsStory(ANSWERS)

test('AI 응답 — 맞는 JSON 은 기사로, 호칭은 기기 안 값 · 사진 설명은 ▲ 로 시작', () => {
  const story = parseFgNews('```json\n' + JSON.stringify({ ...goodAnswer(), kicker: '홍길동' }) + '\n```', local())
  assert.equal(story.kicker, '별내 출신 발명가')
  assert.equal(story.headline, goodAnswer().headline)
  assert.equal(story.caption, '▲ 미래 도시 발명 전시장에서')
  assert.equal(story.article.length, 3)
})

test('AI 응답 — 틀린 JSON · 문단 수 · 금지어 · 너무 긴 글은 던진다', () => {
  const base = local()
  assert.throws(() => parseFgNews('not json', base), /JSON/)
  assert.throws(() => parseFgNews(JSON.stringify({ ...goodAnswer(), article: ['하나뿐'] }), base), /2~3 문단/)
  assert.throws(() => parseFgNews(JSON.stringify({ ...goodAnswer(), headline: '상금 받은 발명가' }), base), /상금/)
  assert.throws(() => parseFgNews(JSON.stringify({ ...goodAnswer(), headline: '가'.repeat(40) }), base), /너무 깁니다/)
  // 문장 하나가 문단 상한을 넘으면 줄일 수 없다 — 던진다
  assert.throws(() => parseFgNews(JSON.stringify({ ...goodAnswer(), article: ['가'.repeat(130), '나'.repeat(60)] }), base), /너무 깁니다/)
})

test('AI 응답 — 조금 긴 본문은 문장 단위로 줄여 살린다(2026-11-14 실측 125자 문단)', () => {
  const base = local()
  // 합계가 넘으면 마지막 문단을 뺀다(두 문단은 남는다)
  const a = parseFgNews(JSON.stringify({ ...goodAnswer(), article: ['가'.repeat(90) + '.', '나'.repeat(90) + '.', '다'.repeat(90) + '.'] }), base)
  assert.equal(a.article.length, 2)
  // 긴 문단은 끝 문장부터 덜어 낸다
  const long = `${'가'.repeat(60)}. ${'나'.repeat(40)}. ${'다'.repeat(30)}.`
  const b = parseFgNews(JSON.stringify({ ...goodAnswer(), article: [long, '라'.repeat(50) + '.'] }), base)
  assert.ok(b.article[0].length <= 120)
  assert.ok(b.article[0].startsWith('가'))
  // 앞뒤에 말이 붙은 JSON 도 읽는다
  const c = parseFgNews(`다음은 기사입니다.\n${JSON.stringify(goodAnswer())}\n끝.`, base)
  assert.equal(c.headline, goodAnswer().headline)
})

test('AI 응답 — 곁들이 칸(부제 · 사진 설명 · 작은 상자)만 걸리면 그 칸만 미리 쓴 값으로 바꿔 끼운다', () => {
  const base = local()
  // 2026-11-14 실제 응답에서 걸린 모양: 작은 상자 제목 16자
  const patched: string[] = []
  const story = parseFgNews(JSON.stringify({ ...goodAnswer(), sidebar: { title: '오늘의 별내 하늘 소식 특별판', text: '맑음' } }), base, patched)
  assert.deepEqual(story.sidebar, base.sidebar)
  assert.equal(story.headline, goodAnswer().headline)
  assert.deepEqual(patched, ['sidebar'])
  const more: string[] = []
  const s2 = parseFgNews(JSON.stringify({ ...goodAnswer(), subhead: '얼굴이 환한 발명가', caption: '가'.repeat(60), sidebar: null }), base, more)
  assert.equal(s2.subhead, base.subhead)
  assert.equal(s2.caption, base.caption)
  assert.deepEqual(more, ['subhead', 'caption', 'sidebar'])
  assert.equal(checkNewsStory(s2), null)
})

test('AI 기사 문단 — 한 글 · 줄바꿈 · 넷 이상 · {text} 모양도 2~3 문단으로 맞춘다', () => {
  const [a, b, c, d] = ['첫째 문장이다.', '둘째 문장이에요!', '“셋째 한마디예요.”라고 말했다.', '넷째 문장이다.']
  assert.deepEqual(normalizeArticle([a, b]), [a, b])
  assert.deepEqual(normalizeArticle(`${a}\n${b}\n${c}`), [a, b, c])
  assert.deepEqual(normalizeArticle(`${a} ${b} ${c}`), [a, b, c])
  assert.equal(normalizeArticle([a, b, c, d]).length, 3)
  assert.equal(normalizeArticle([a, b, c, d]).join(' '), [a, b, c, d].join(' '))
  assert.deepEqual(normalizeArticle([{ text: a }, { text: b }]), [a, b])
  assert.deepEqual(normalizeArticle(`${a} ${b}`), [a, b])
  assert.deepEqual(normalizeArticle(a), [a])
  assert.deepEqual(normalizeArticle(null), [])
  const story = parseFgNews(JSON.stringify({ ...goodAnswer(), article: goodAnswer().article.join(' ') }), local())
  assert.deepEqual(story.article, goodAnswer().article)
})

test('AI 프롬프트 — 대답 셋 · 호칭은 넣고, 사진 · 이름 · 나이는 넣지 않는다', () => {
  const prompt = buildFgNewsPrompt(ANSWERS, local())
  assert.match(prompt, /발명가 · 과학자/)
  assert.match(prompt, /동물/)
  assert.match(prompt, /지구를 깨끗하게/)
  assert.match(prompt, /별내 출신 발명가/)
  assert.match(prompt, /재미로 상상해 보는 미래 신문/)
  assert.doesNotMatch(prompt, /data:image|base64/)
})

const fakeFetch = (status: number, body: unknown, delayMs = 0): typeof fetch =>
  ((_url: unknown, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response(JSON.stringify(body), { status })), delayMs)
    init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('aborted', 'AbortError')) })
  })) as typeof fetch

test('OpenRouter 호출 — 성공이면 비용을 읽고, 오류 · 잘림 · 시간 초과는 던진다(실제 호출 없음)', async () => {
  const args = { apiKey: 'test', prompt: 'p', local: local(), timeoutMs: 200 }
  const ok = await requestFgNews(args, fakeFetch(200, { choices: [{ message: { content: JSON.stringify(goodAnswer()) }, finish_reason: 'stop' }], usage: { cost: 0.0019 } }))
  assert.equal(ok.cost, 0.0019)
  assert.equal(ok.story.headline, goodAnswer().headline)
  await assert.rejects(requestFgNews(args, fakeFetch(500, { error: 'x' })), /OpenRouter 500/)
  await assert.rejects(requestFgNews(args, fakeFetch(200, { choices: [{ message: { content: '{"a":' }, finish_reason: 'length' }] })), /잘렸습니다/)
  await assert.rejects(requestFgNews(args, fakeFetch(200, {}, 1000)), /시간 초과/)
  // 검사에 걸린 기사도 비용은 나갔다 — 던지는 오류에 비용이 붙는다(라우트 로그용)
  const banned = { ...goodAnswer(), headline: '상금 받은 발명가' }
  await assert.rejects(
    requestFgNews(args, fakeFetch(200, { choices: [{ message: { content: JSON.stringify(banned) }, finish_reason: 'stop' }], usage: { cost: 0.0021 } })),
    (error: Error & { cost?: number }) => /상금/.test(error.message) && error.cost === 0.0021,
  )
})

test('news API — 펀그라운드 키가 없으면 AI 를 부르지 않고 바로 미리 쓴 기사(fallback) · 틀린 대답은 400', async () => {
  const savedFg = process.env.OPENROUTER_FUNGROUND_API_KEY
  const savedSite = process.env.OPENROUTER_API_KEY
  delete process.env.OPENROUTER_FUNGROUND_API_KEY
  process.env.OPENROUTER_API_KEY = 'must-not-be-used'
  let called = false
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => { called = true; throw new Error('호출하면 안 된다') }) as typeof fetch
  try {
    const res = await POST(new NextRequest('http://localhost/api/funground/news', { method: 'POST', body: JSON.stringify({ answers: ANSWERS }) }))
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.success, true)
    assert.equal(data.engine, 'ai')
    assert.equal(data.fallback, true)
    assert.equal(data.reason, 'no-key')
    assert.deepEqual(data.story, buildNewsStory(ANSWERS))
    assert.equal(called, false)
    const bad = await POST(new NextRequest('http://localhost/api/funground/news', { method: 'POST', body: JSON.stringify({ answers: { dream: 'x' } }) }))
    assert.equal(bad.status, 400)
  } finally {
    globalThis.fetch = realFetch
    if (savedFg === undefined) delete process.env.OPENROUTER_FUNGROUND_API_KEY
    else process.env.OPENROUTER_FUNGROUND_API_KEY = savedFg
    if (savedSite === undefined) delete process.env.OPENROUTER_API_KEY
    else process.env.OPENROUTER_API_KEY = savedSite
  }
})
