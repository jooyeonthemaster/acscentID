// 연말 시상식 소믈리에(studio-sommelier-nh) — 시음 와인 목록 검사와 '추천이 한 병에 몰리지 않는가'.
// npm run test:nh-sommelier
import test from 'node:test'
import assert from 'node:assert/strict'
import { NH_WINES } from '../nh-wines'
import { brandWords, NH_KINDS, nhWineId, outsideWineMention, rankNhWines, recommendNhWine, type NhAnswers, type NhKindChoice, type PourCounts } from '../nh-sommelier'
import { buildAiPrompt, validateAiAnalysis, type AiRequest } from '../ai'

const SCALE = [1, 2, 3, 4, 5]
const grid = (kind: NhKindChoice): NhAnswers[] => SCALE.flatMap((sweet) => SCALE.flatMap((acid) => SCALE.map((body) => ({ sweet, acid, body, kind }))))
const share = (counts: Map<number, number>, total: number) => Object.fromEntries(NH_WINES.map((w) => [w.no, Math.round(((counts.get(w.no) ?? 0) / total) * 1000) / 10]))
const tally = (picks: number[]) => picks.reduce((m, no) => m.set(no, (m.get(no) ?? 0) + 1), new Map<number, number>())

test('시음 와인 목록 — 번호가 1부터 겹치지 않고, 점수는 1~5, 이름 · 산지 · 품종 · 한 줄이 있다', () => {
  assert.equal(NH_WINES.length, 10)
  assert.deepEqual(NH_WINES.map((w) => w.no).sort((a, b) => a - b), NH_WINES.map((_, i) => i + 1))
  for (const w of NH_WINES) {
    for (const v of [w.sweet, w.acid, w.body, ...(w.tannin == null ? [] : [w.tannin])]) assert.ok(Number.isInteger(v) && v >= 1 && v <= 5, `${w.no}번 점수`)
    assert.ok(w.name && w.en && w.region && w.grapes && w.line, `${w.no}번 글`)
    // 응답 검사에 쓰는 그 병만의 낱말이 하나는 있어야 한다(후보 밖 와인을 글에서 잡는다)
    assert.ok(brandWords(w).length, `${w.no}번 브랜드 낱말`)
  }
})

test('추천은 늘 이 10병 안에서 — 결과 맨 위 번호 · 이름이 목록과 같다', () => {
  for (const kind of NH_KINDS.map((k) => k.id)) for (const a of grid(kind)) {
    const bundle = recommendNhWine(a)
    for (const r of [bundle.primary, ...bundle.alternatives]) {
      const w = NH_WINES.find((x) => nhWineId(x) === r.id)
      assert.ok(w, r.id)
      assert.deepEqual([r.pour?.no, r.pour?.name], [w!.no, w!.name])
      if (kind !== 'any') assert.equal(w!.kind, kind, '고른 종류 안에서만')
    }
    assert.ok(bundle.alternatives.length <= 3)
  }
})

test('맛 답 전체(5×5×5)에서 첫 추천이 10병 모두에 나뉘고, 한 병이 4분의 1을 넘지 않는다', () => {
  const picks = grid('any').map((a) => rankNhWines(a)[0].wine.no)
  const counts = tally(picks)
  const s = share(counts, picks.length)
  console.log('  맛 답 125가지의 첫 추천 비율(%) —', JSON.stringify(s))
  // 같은 맛 점수(8 · 9번 보르도 · 까쇼, 둘 다 단맛1 산미3 바디4)는 맛 답만으로는 가를 수 없다 — 아래 '하루 흐름'에서 재고 균형이 나눈다
  for (const w of NH_WINES) if (w.no !== 9) assert.ok((counts.get(w.no) ?? 0) > 0, `${w.no}번이 한 번도 첫 추천이 아님`)
  for (const w of NH_WINES) assert.ok(s[w.no] <= 25, `${w.no}번 ${s[w.no]}%`)
})

test('모든 병이 어떤 답에서는 AI 후보(위 4병)에 든다', () => {
  const seen = new Set(grid('any').flatMap((a) => rankNhWines(a).slice(0, 4).map((r) => r.wine.no)))
  assert.deepEqual([...seen].sort((a, b) => a - b), NH_WINES.map((w) => w.no))
})

/** 하루 흐름 — 손님이 차례로 오고 결과를 볼 때마다 그 병을 센다(키오스크 화면과 같은 방식) */
function simulateDay(answersOf: (i: number) => NhAnswers, guests: number) {
  const counts: PourCounts = {}
  const picks: number[] = []
  for (let i = 0; i < guests; i++) {
    const no = rankNhWines(answersOf(i), null, counts)[0].wine.no
    counts[no] = (counts[no] ?? 0) + 1
    picks.push(no)
  }
  return { picks, counts }
}

test('하루 흐름 — 모두가 슬라이더를 그대로(3 · 3 · 3 · 모두 좋아요) 둬도 한 병이 동나지 않는다', () => {
  const { picks } = simulateDay(() => ({ sweet: 3, acid: 3, body: 3, kind: 'any' }), 100)
  const s = share(tally(picks), picks.length)
  console.log('  기본값 손님 100명(%) —', JSON.stringify(s))
  assert.ok(Math.max(...Object.values(s)) <= 40, '한 병이 40%를 넘음')
  assert.ok(Object.values(s).filter((v) => v > 0).length >= 3, '세 병 이상에 나뉘어야')
})

test('하루 흐름 — 맛 답이 고르게 섞인 손님 1,000명(종류는 모두 좋아요)이면 10병 모두 나가고 어느 병도 20%를 넘지 않는다', () => {
  // 맛 답 125가지를 정해진 순서로 섞어 돈다(시험이 매번 같게). 같은 맛 점수인 8 · 9번(보르도 · 까쇼)도 재고 균형으로 나뉜다
  const all = grid('any')
  const order = all.map((_, i) => (i * 47) % all.length)
  const { picks } = simulateDay((i) => all[order[i % all.length]], 1000)
  const s = share(tally(picks), picks.length)
  console.log('  섞인 답 1,000명(%) —', JSON.stringify(s))
  for (const w of NH_WINES) assert.ok(s[w.no] >= 3, `${w.no}번 ${s[w.no]}%`)
  for (const w of NH_WINES) assert.ok(s[w.no] <= 20, `${w.no}번 ${s[w.no]}%`)
  assert.ok(Math.abs(s[8] - s[9]) <= 3, `8번 ${s[8]}% · 9번 ${s[9]}%`)
})

test('하루 흐름 — 종류를 고른 손님은 그 종류 안에서 병마다 나뉜다(로제는 한 병뿐이라 로제를 고르면 늘 6번)', () => {
  for (const kind of ['sparkling', 'white', 'red'] as const) {
    const all = grid(kind)
    const { picks } = simulateDay((i) => all[(i * 47) % all.length], 300)
    const s = share(tally(picks), picks.length)
    const mine = NH_WINES.filter((w) => w.kind === kind)
    console.log(`  ${kind} 300명(%) —`, JSON.stringify(Object.fromEntries(mine.map((w) => [w.no, s[w.no]]))))
    for (const w of mine) assert.ok(s[w.no] >= 100 / mine.length / 3, `${kind} ${w.no}번 ${s[w.no]}%`)
  }
})

test('재고 균형은 맛과 먼 병을 억지로 고르지 않는다 — 단맛 5 · 바디 1 손님은 많이 나가도 1번 모스카토', () => {
  const counts: PourCounts = { 1: 40 }
  assert.equal(rankNhWines({ sweet: 5, acid: 3, body: 1, kind: 'any' }, null, counts)[0].wine.no, 1)
  // 레드를 골랐으면 레드 안에서만
  assert.ok(rankNhWines({ sweet: 5, acid: 3, body: 1, kind: 'red' }).every((r) => r.wine.kind === 'red'))
})

const request = (candidates: string[]): AiRequest => ({
  id: 'sommelier-nh', photo: null, facts: '', answers: [{ label: '단맛', value: '3 / 5' }],
  candidates: candidates.map((id) => { const w = NH_WINES.find((x) => nhWineId(x) === id)!; return { id, title: `${w.no}번 · ${w.name}`, summary: w.line } }), context: '',
})
const reply = (pick: string, insight: string) => ({ pick, headline: '오늘의 산뜻한 한 잔', insight, photo: [], tips: ['한 모금 머금고 향을 느껴 보세요.', '천천히 즐겨 보세요.'] })

test('AI 응답 검사 — 후보 밖 병을 고르거나 글에서 권하면 거절, 후보 안이면 통과', () => {
  const req = request(['nh-wine-3', 'nh-wine-6', 'nh-wine-5', 'nh-wine-2'])
  const ok = '단맛과 산미를 가운데로 고르셔서 은은한 단맛에 상큼함이 살아 있는 리슬링이 잘 어울려요. 로제와 견주어 마셔 보셔도 좋아요.'
  assert.equal(validateAiAnalysis(reply('nh-wine-3', ok), req).pick, 'nh-wine-3')
  assert.throws(() => validateAiAnalysis(reply('nh-wine-10', ok), req), /pick/)
  assert.throws(() => validateAiAnalysis(reply('nh-wine-3', `${ok} 더 진한 맛을 원하시면 몰리두커 더 복서도 좋아요.`), req), /후보가 아닌 와인/)
  // 품종 이름(소비뇽 블랑)은 후보 2번에도 있으니 막지 않는다
  assert.equal(validateAiAnalysis(reply('nh-wine-2', `${ok} 소비뇽 블랑의 상큼함도 느껴 보세요.`), req).pick, 'nh-wine-2')
  assert.equal(outsideWineMention('코노의 자몽 향', ['nh-wine-3']), '4번 코노 소비뇽 블랑(코노)')
})

test('AI 지시문 — 후보만 고르고 재고 순서를 따르라는 규칙이 들어간다', () => {
  const prompt = buildAiPrompt(request(['nh-wine-7', 'nh-wine-8']))
  assert.match(prompt, /첫 후보를 고른다/)
  assert.match(prompt, /후보 밖의 와인 이름/)
  assert.match(prompt, /nh-wine-7/)
})

test('미연시 선택지(맛은 1 · 3 · 5 세 칸)만으로도 10병이 모두 나오고 고르게 나뉜다', () => {
  const three = [1, 3, 5]
  const all = NH_KINDS.flatMap((k) => three.flatMap((sweet) => three.flatMap((acid) => three.map((body) => ({ sweet, acid, body, kind: k.id })))))
  const counts: PourCounts = {}
  const picks: number[] = []
  for (let i = 0; i < 1350; i++) { const no = rankNhWines(all[(i * 37) % all.length], null, counts)[0].wine.no; counts[no] = (counts[no] ?? 0) + 1; picks.push(no) }
  const s = share(tally(picks), picks.length)
  console.log('  1·3·5 선택지 1,350명(%) —', JSON.stringify(s))
  for (const w of NH_WINES) assert.ok(s[w.no] >= 3, `${w.no}번 ${s[w.no]}%`)
})
