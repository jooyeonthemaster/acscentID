// 연말 시상식 「2027 정미년 새해 이야기」(관상 · 사주 · 손금) — 미리 쓴 문장 · AI 응답 검사 · 운영 모드 등록.
// npm run test:nh-awards
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildReadingPrompt, FACE_TOPICS, localFaceStory, localPalmStory, localSajuStory, parseStory, sajuViewOf, storyProblem, STORY_MAX,
  type ReadingStory,
} from '../reading'
import { findProgram, PROGRAMS } from '../catalog'
import { BOOTH_MODES } from '../../modes'
import { passRequiredFor } from '../../pass-policy'
import { BOOTH_DEMOS } from '../../demo'
import { eventBrandFor, NH_BRAND } from '../../../nh-awards/brand'

function fits(story: ReadingStory, where: string) {
  assert.equal(storyProblem(story, where.startsWith('saju') ? 'nh-saju' : undefined), null, `${where}: ${storyProblem(story)}`)
  assert.ok(story.keyword.length <= STORY_MAX.keyword, `${where} keyword ${story.keyword}`)
  assert.ok(story.title.length <= STORY_MAX.title, `${where} title ${story.title}`)
  // 미리 쓴 문장은 AI 상한보다 조금 길어도 된다(인화 원판이 두 줄로 감싼다) — 세 줄 모두 120자 안
  for (const line of story.lines) assert.ok(line.length <= 120, `${where} line ${line.length}자`)
  assert.ok(story.wish.length <= STORY_MAX.wish, `${where} wish ${story.wish}`)
}

test('관상 — 주제 4 × 표정 3 × 기울기의 미리 쓴 문장이 모두 규칙을 지킨다', () => {
  for (const t of FACE_TOPICS) for (const smile of [5, 50, 90, undefined]) for (const tilt of [0, 12]) fits(localFaceStory(t.id, { smile, tilt }), `face ${t.id} ${smile} ${tilt}`)
})

test('손금 — 손 모양 3 × 엄지의 미리 쓴 문장이 규칙을 지키고 펼친 정도에 따라 달라진다', () => {
  const titles = new Set<string>()
  for (const spread of [10, 40, 80, undefined]) for (const thumb of [true, false]) { const s = localPalmStory({ spread, thumb }); fits(s, `palm ${spread} ${thumb}`); titles.add(s.title) }
  assert.equal(titles.size, 3)
})

test('사주 — 1940~2008년생 생일을 두루 돌려도 원국이 서고, 미리 쓴 문장이 규칙을 지킨다', () => {
  let n = 0
  const seen = new Set<string>()
  for (let y = 1940; y <= 2008; y += 1) for (const [m, d] of [[1, 3], [4, 17], [8, 29], [12, 30]]) {
    for (const hourIndex of [null, 6]) {
      const v = sajuViewOf({ year: y, month: m, day: d, calendar: 'solar', hourIndex })
      assert.equal(v.pillars.length, 4)
      assert.equal(v.isThreePillar, hourIndex === null)
      const s = localSajuStory(v)
      fits(s, `saju ${y}-${m}-${d}`)
      seen.add(s.title)
      n++
    }
  }
  assert.ok(n > 500)
  assert.equal(seen.size, 10, '정미년 십성 10가지가 모두 나온다')
  // 음력 · 윤달
  assert.ok(sajuViewOf({ year: 1984, month: 10, day: 5, calendar: 'lunar', isLeapMonth: true, hourIndex: null }).pillars[1].hanja)
  assert.throws(() => sajuViewOf({ year: 1990, month: 2, day: 30, calendar: 'solar', hourIndex: null }))
})

const good = { keyword: '단단한 한 걸음', title: '쌓아 온 것이 빛나는 해', lines: ['묵묵히 쌓아 온 일이 정미년에 결실로 이어지는 이야기예요.', '환하게 웃는 오늘의 표정처럼 새해에도 웃을 일이 많아요.', '새해 첫 달, 꼭 하고 싶은 일 하나를 적어 보세요.'], lucky: { color: '버건디', item: '새 수첩' }, wish: '새해에도 힘차게 나아가세요!' }

test('AI 응답 검사 — 틀 · 길이를 보고, 생김새 판정 · 손금 선 · 겁주는 말 · 약속 · 기관 이름을 거절한다', () => {
  assert.deepEqual(parseStory(good), good)
  assert.throws(() => parseStory({ ...good, lines: good.lines.slice(0, 2) }), /3개/)
  assert.throws(() => parseStory({ ...good, title: '가'.repeat(40) }), /title/)
  const bad: [string, RegExp][] = [
    ['이마가 넓어 복이 많은 상이에요.', /생김새/],
    ['감정선이 길어 정이 많은 해예요.', /손금/],
    ['생명선이 뚜렷해요.', /손금|운명/],
    ['올해는 건강운이 약하니 조심해야 해요.', /겁주는|건강/],
    ['내년에는 승진이 확정이에요.', /약속/],
    ['농협 가족 여러분 새해 복 많이 받으세요.', /기관/],
    ['얼굴형이 둥글어 사람이 따르는 해예요.', /생김새/],
  ]
  for (const [line, why] of bad) assert.throws(() => parseStory({ ...good, lines: [line, good.lines[1], good.lines[2]] }), why, line)
  // 덕담에 흔한 말은 걸리지 않는다(문턱 · 콧노래 · 귓가)
  assert.deepEqual(parseStory({ ...good, lines: ['새해 문턱이 반가운 이야기예요.', '콧노래가 절로 나는 한 해예요.', '귓가에 좋은 소식이 들려와요.'] }).lines.length, 3)
  // 사진으로 마음을 짐작하는 말 — 관상 · 손금은 거절, 사주는 원국 이야기라 통과(2026-11-17 실호출 문장)
  const guess = { ...good, lines: ['환한 미소에서 다정한 여유가 느껴져요.', good.lines[1], good.lines[2]] }
  assert.throws(() => parseStory(guess, 'nh-face'), /짐작/)
  assert.throws(() => parseStory(guess, 'nh-palm'), /짐작/)
  assert.ok(parseStory(guess, 'nh-saju'))
  // 사주는 '타고난'을 써도 된다(원국 이야기라서), 관상은 안 된다
  const innate = { ...good, lines: ['타고난 큰 나무의 기운이 쭉 뻗는 해예요.', good.lines[1], good.lines[2]] }
  assert.ok(parseStory(innate, 'nh-saju'))
  assert.throws(() => parseStory(innate, 'nh-face'), /성격/)
})

test('지시문 — 관상 · 손금은 사진을 근거로, 사주는 사진 없이 원국 사실만', () => {
  const face = buildReadingPrompt({ program: 'nh-face', topic: 'people', facts: { smile: 90 }, photo: true })
  assert.match(face, /사람과 인연/)
  assert.match(face, /환한 미소/)
  assert.match(face, /생김새/)
  assert.doesNotMatch(face, /90/)
  const saju = buildReadingPrompt({ program: 'nh-saju', facts: {}, photo: false, saju: sajuViewOf({ year: 1975, month: 3, day: 8, calendar: 'solar', hourIndex: null }) })
  assert.match(saju, /사진은 보내지 않았다/)
  assert.match(saju, /정미\(丁未\)년/)
  assert.match(saju, /다시 계산하지 않는다/)
})

test('운영 모드 · 이용권 · 랜딩 — 세 프로그램은 행사 모드(이용권 없음)로, 영업용 랜딩에는 행사 맞춤 묶음에만', () => {
  for (const id of ['nh-face', 'nh-saju', 'nh-palm']) {
    const p = findProgram(id)!
    assert.equal(p.kind, 'reading')
    assert.equal(p.event, true)
    assert.ok(BOOTH_MODES.some((m) => m.id === id && m.program === id))
    assert.equal(passRequiredFor(id), false)
    assert.deepEqual(BOOTH_DEMOS.filter((d) => d.mode === id).map((d) => d.group), ['event'])
    assert.ok(p.creative && p.designs.length === 2)
  }
  assert.equal(PROGRAMS.filter((p) => p.kind === 'reading').length, 3)
})

test('브랜드 자리 — 꺼 두면 어디에도 나오지 않는다', () => {
  assert.equal(NH_BRAND.booth.enabled, false)
  assert.equal(NH_BRAND.kiosk.enabled, false)
  for (const id of ['nh-face', 'nh-saju', 'nh-palm', 'sommelier-nh', 'sommelier']) assert.equal(eventBrandFor(id), null)
})

test('관상 동양풍 초상 — 지시문이 얼굴 · 안경을 지키고 글씨를 넣지 않는다, 빠른 모델이 먼저', async () => {
  const { buildFacePortraitPrompt, PORTRAIT_ATTEMPTS, PORTRAIT_USES, portraitPeople } = await import('../portrait')
  const prompt = buildFacePortraitPrompt()
  assert.match(prompt, /IDENTITY LOCK/)
  assert.match(prompt, /GLASSES/)
  assert.match(prompt, /DO NOT add any text/)
  assert.match(prompt, /not .*resemble any real celebrity or actor/)
  // 얼굴 닮음이 먼저 — Seedream 먼저(2026-11-17 시험), 여럿이면 단체 지시문
  assert.equal(PORTRAIT_ATTEMPTS[0][0], 'seedream-5-flash')
  const group = buildFacePortraitPrompt(3)
  assert.match(group, /Show ALL 3 of them/)
  assert.doesNotMatch(group, /strictly frontal and symmetrical close-up/)
  assert.equal(portraitPeople(undefined), 1)
  assert.equal(portraitPeople(9), 6)
  // 라우트 maxDuration 60초 안
  assert.ok(PORTRAIT_ATTEMPTS.reduce((a, [, ms]) => a + ms, 0) <= 55_000)
  assert.equal(PORTRAIT_USES, 2)
  const face = findProgram('nh-face')!
  assert.deepEqual(face.designs, ['초상 포스터', '족자'])
})

test('세로쓰기 줄 나누기 — 낱말을 끊지 않고, 부호는 뺀다', async () => {
  const { verticalColumns } = await import('../../../../app/booth/programs/portrait-print')
  assert.deepEqual(verticalColumns('단단한 한 걸음', 4), ['단단한', '한 걸음'])
  assert.deepEqual(verticalColumns('꾸준히 타는 불씨', 5), ['꾸준히', '타는 불씨'])
  assert.deepEqual(verticalColumns('쌓아 온 것이, 빛나는 해!', 9), ['쌓아 온 것이', '빛나는 해'])
  assert.deepEqual(verticalColumns('가나다라마바사', 3), ['가나다', '라마바', '사'])
})
