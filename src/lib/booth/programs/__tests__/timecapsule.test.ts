// ANSAN 타임캡슐 서버 — 사람 읽기 답 해석 · 컷 프롬프트(npm run test:booth-timecapsule)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { boxesLookWrong, buildStepPrompt, parsePeople, type StripPerson } from '../timecapsule-server'

test('사람 읽기 — 왼쪽부터 정렬, 같은 머리 두 번은 하나로, 나이·묘사 정리', () => {
  const text = '```json\n' + JSON.stringify({
    people: [
      { box_2d: [100, 600, 300, 750], age: 35, presentation: 'woman', look: 'brown bob, beige coat' },
      { box_2d: [120, 200, 320, 350], age: 38.4, presentation: 'MAN', look: 'glasses; navy sweater <script>' },
      { box_2d: [105, 605, 305, 748], age: 34, presentation: 'woman', look: 'brown bob, beige coat' },
      { box_2d: [300, 700, 420, 820], age: -3, presentation: 'baby', look: 'white hat' },
      { box_2d: [10, 10, 10, 10], age: 20, presentation: 'man', look: 'zero box' },
    ],
  }) + '\n```'
  const people = parsePeople(text)!
  assert.equal(people.length, 3)
  assert.deepEqual(people.map((p) => p.age), [38, 35, 0])
  assert.deepEqual(people.map((p) => p.presentation), ['man', 'woman', 'unclear'])
  assert.equal(people[0].look, 'glasses navy sweater script')
  assert.ok(people[0].box.x0 < people[1].box.x0 && people[1].box.x0 < people[2].box.x0)
})

test('사람 읽기 — 상자가 겹쳐도 다른 사람은 지우지 않는다(2026-11-05 시험의 실제 답)', () => {
  // 넷째 상자가 셋째 자리에 잘못 온 답 — 예전에는 4명이 3명으로 줄었다
  const wrongPlace = parsePeople(JSON.stringify({ people: [
    { box_2d: [278, 119, 545, 249], age: 45, presentation: 'man', look: 'short black hair, blue button-up shirt' },
    { box_2d: [353, 308, 584, 463], age: 40, presentation: 'woman', look: 'short brown hair, coral long-sleeve shirt' },
    { box_2d: [326, 535, 578, 664], age: 55, presentation: 'man', look: 'short grey hair, glasses, grey suit jacket' },
    { box_2d: [353, 535, 584, 664], age: 50, presentation: 'woman', look: 'short curly brown hair, teal top and cardigan' },
  ] }))!
  assert.equal(wrongPlace.length, 4)
  assert.equal(boxesLookWrong(wrongPlace), true)
  // 옆 사람까지 덮은 넓은 상자
  const tooWide = parsePeople(JSON.stringify({ people: [
    { box_2d: [430, 100, 670, 467], age: 65, presentation: 'woman', look: 'short black hair, red jacket' },
    { box_2d: [387, 327, 580, 470], age: 68, presentation: 'man', look: 'short grey hair, beige sweater vest' },
  ] }))!
  assert.equal(tooWide.length, 2)
  assert.equal(boxesLookWrong(tooWide), true)
})

test('머리 상자 검사 — 안긴 아기처럼 조금 겹치는 정상 상자는 믿는다', () => {
  const held = parsePeople(JSON.stringify({ people: [
    { box_2d: [100, 400, 340, 540], age: 70, presentation: 'man', look: 'white hair, navy vest' },
    { box_2d: [320, 390, 520, 520], age: 1, presentation: 'girl', look: 'orange overall' },
  ] }))!
  assert.equal(boxesLookWrong(held), false)
})

test('사람 읽기 — 형식이 틀리면 null, 아무도 없으면 빈 목록', () => {
  assert.equal(parsePeople('not json'), null)
  assert.equal(parsePeople('{"persons": []}'), null)
  assert.deepEqual(parsePeople('{"people": []}'), [])
})

const person = (age: number, presentation: StripPerson['presentation'], x0: number): StripPerson => ({ box: { x0, y0: 0.1, x1: x0 + 0.1, y1: 0.3 }, age, presentation, look: 'short black hair' })

test('컷 프롬프트 — 사람마다 같은 햇수, 아기·아이는 새 나이대 생김새', () => {
  const family = [person(38, 'man', 0.1), person(1, 'unclear', 0.4), person(6, 'girl', 0.6)]
  const ten = buildStepPrompt(10, family, true)
  assert.match(ten, /exactly 3 people/)
  assert.match(ten, /Person 2 \(2nd from the left; face reference IMAGE 3; today in IMAGE 1: short black hair\): now a 1-year-old toddler → in THIS image about 11 years old, shown as a child/)
  assert.match(ten, /about 16 years old, shown as a teenage girl: a teenager/)
  assert.match(ten, /about 48 years old, shown as a man/)
  assert.match(ten, /2036/)
  const twenty = buildStepPrompt(20, family, true)
  assert.match(twenty, /about 21 years old, shown as a person: a grown young adult/)
  // 아이에게 어른 몸 비율을 강요하던 공통 문구는 쓰지 않는다
  assert.doesNotMatch(twenty, /realistic adult body proportions/)
  assert.match(buildStepPrompt(30, family, true), /space station/)
})

test('컷 프롬프트 — 나이 양 끝: 0살은 아이로, 80살은 110살까지 나이 든 모습으로', () => {
  const ends = [person(0, 'unclear', 0.1), person(80, 'woman', 0.5)]
  const ten = buildStepPrompt(10, ends, true)
  assert.match(ten, /now a baby under one year old → in THIS image about 10 years old, shown as a child/)
  assert.match(ten, /about 90 years old, shown as a woman: a very old person around 90/)
  assert.match(buildStepPrompt(30, ends, true), /about 110 years old, shown as a woman: a very old person around 110/)
  assert.match(buildStepPrompt(20, [person(30, 'man', 0.1)], true), /about 50 years old, shown as a man: a middle-aged adult in their 50s/)
})

test('컷 프롬프트 — 얼굴이 크게, 다른 사람 없이', () => {
  const prompt = buildStepPrompt(10, [person(38, 'man', 0.1), person(6, 'girl', 0.6)], true)
  assert.match(prompt, /never a full-body shot/)
  assert.match(prompt, /NOBODY ELSE in the picture/)
})

test('컷 프롬프트 — 사람 읽기 실패면 모델이 직접 세게, 참고 사진 문장 없이', () => {
  const prompt = buildStepPrompt(20, null, false)
  assert.match(prompt, /count the real people posing in IMAGE 1/)
  assert.doesNotMatch(prompt, /IMAGES 2 to/)
})
