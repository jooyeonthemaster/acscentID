import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildStepPrompt } from '../timecapsule-prompt'
import type { StripPerson } from '../timecapsule-server'

const person = (age: number, x0: number, look: string): StripPerson => ({
  age, look, presentation: 'unclear', box: { x0, y0: 0.1, x1: x0 + 0.1, y1: 0.3 },
})

test('단체 프롬프트는 개인별 참조를 순서대로 연결하고 얼굴 유지를 나이·장면보다 앞세운다', () => {
  const group = [person(35, 0.1, 'glasses'), person(7, 0.3, 'braided hair'), person(60, 0.5, 'white shirt'), person(2, 0.7, 'blue jacket')]
  const prompt = buildStepPrompt(20, group, true)
  const personLines = prompt.split('\n').filter((line) => /^\d\. Person \d/.test(line))
  assert.equal(personLines.length, 4)
  personLines.forEach((line, i) => {
    assert.match(line, new RegExp(`Person ${i + 1} \\(`))
    assert.match(line, new RegExp(`face reference IMAGE ${i + 2}`))
    assert.match(line, new RegExp(`about ${group[i].age + 20} years old`))
  })
  assert.ok(prompt.indexOf('IDENTITY FIRST') < prompt.indexOf('NATURAL PASSAGE OF TIME'))
  assert.ok(prompt.indexOf('IDENTITY FIRST') < prompt.indexOf('SCENE:'))
  assert.match(prompt, /Never blend, average, swap/)
  assert.doesNotMatch(prompt, /AGING RULES — the most important part|do not simply retouch|defined jawline and cheekbones/)
})

test('성장하는 아이의 미래 나이는 유지하며 부모 얼굴로 대체하지 않게 한다', () => {
  const child = [person(6, 0.4, 'short black hair')]
  assert.match(buildStepPrompt(10, child, true), /about 16 years old, shown as a teenager: a teenager/)
  assert.match(buildStepPrompt(20, child, true), /about 26 years old, shown as a person: a grown young adult/)
  const thirty = buildStepPrompt(30, child, true)
  assert.match(thirty, /about 36 years old, shown as a person: an adult in their 30s/)
  assert.match(thirty, /Never replace a grown child with a parent's face/)
  assert.match(thirty, /same 30 years/)
})

test('성인은 고유 얼굴 구조·안경·특징을 보존하면서 노년까지 자연스럽게 나이 든다', () => {
  const prompt = buildStepPrompt(30, [person(70, 0.4, 'glasses and gray beard')], true)
  assert.match(prompt, /about 100 years old/)
  assert.match(prompt, /keep their existing facial structure/)
  assert.match(prompt, /Keep glasses when present/)
  assert.match(prompt, /distinctive marks and moles/)
  assert.match(prompt, /individual facial-hair pattern/)
  assert.doesNotMatch(prompt, /mostly gray or silver hair|a thinner face|nobody may look younger/)
})

test('얼굴 참고가 없거나 인원이 불명확하면 첨부되지 않은 얼굴 이미지를 지시하지 않는다', () => {
  for (const group of [null, []]) {
    const prompt = buildStepPrompt(10, group, true)
    assert.match(prompt, /count the real people posing in IMAGE 1/)
    assert.doesNotMatch(prompt, /IMAGE 2|IMAGES 2 to|face reference IMAGE/)
  }
  const prompt = buildStepPrompt(10, [person(30, 0.4, 'short hair')], false)
  assert.doesNotMatch(prompt, /IMAGE 2|IMAGES 2 to|face reference IMAGE/)
  assert.match(prompt, /exactly 1 person/)
})

// 가상 4인 아동 사진의 +10년 결과에서 짧은 머리 아이가 긴 단발로 바뀌던 회귀.
test('아이도 본인의 성별 표현과 특징적인 헤어를 유지하며 자라도록 지시한다', () => {
  const prompt = buildStepPrompt(10, [{ ...person(5, 0.4, 'short hair, red shirt'), presentation: 'boy' }], true)
  assert.match(prompt, /about 15 years old, shown as a teenage boy/)
  assert.match(prompt, /original gender presentation throughout aging/)
  assert.match(prompt, /Keep short hair short and long hair long/)
  assert.match(prompt, /including children growing into teenagers or adults/)
})
