// ANSAN 사진 인화 장수 — 고를 수 있는 장수 · 인쇄 장수 계산(npm run test:booth-timecapsule 에 함께)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readStripAuto, readStripMax, stripCountOptions, stripSheets } from '../strip-count'

const useStoredMax = (value: string | null) => {
  (globalThis as unknown as { localStorage: unknown }).localStorage = { getItem: () => value, setItem: () => undefined }
}

test('자동 인화수 꺼짐 — 2장부터 최대까지 2장 단위, 처음 값은 2장', () => {
  assert.deepEqual(stripCountOptions(4, false, 3), { choices: [2, 4], initial: 2 })
  assert.deepEqual(stripCountOptions(2, false, 3), { choices: [2], initial: 2 })
  assert.deepEqual(stripCountOptions(10, false, 1), { choices: [2, 4, 6, 8, 10], initial: 2 })
})

test('자동 인화수 켜짐 — 인원수를 2장 단위로 올린 장수까지, 처음 값은 그 장수, 최대 장수는 넘지 않는다', () => {
  assert.deepEqual(stripCountOptions(4, true, 1), { choices: [2], initial: 2 })
  assert.deepEqual(stripCountOptions(4, true, 2), { choices: [2], initial: 2 })
  assert.deepEqual(stripCountOptions(4, true, 3), { choices: [2, 4], initial: 4 })
  assert.deepEqual(stripCountOptions(4, true, 4), { choices: [2, 4], initial: 4 })
  assert.deepEqual(stripCountOptions(2, true, 4), { choices: [2], initial: 2 })
})

test('자동 인화수 켜짐인데 인원수를 모르면 — 꺼진 것과 같다', () => {
  assert.deepEqual(stripCountOptions(4, true, 0), { choices: [2, 4], initial: 2 })
})

test('어떤 설정에서도 홀수 장수는 나오지 않는다 — 홀수면 빈 종이가 나온다', () => {
  for (const max of [2, 4, 6, 8, 10]) for (const auto of [true, false]) for (let people = 0; people <= 6; people++) {
    const { choices, initial } = stripCountOptions(max, auto, people)
    assert.ok(choices.every((n) => n % 2 === 0) && initial % 2 === 0 && choices.includes(initial), `${max}/${auto}/${people}`)
  }
})

test('인쇄 장수 — 4×6 한 장 = 사진 두 장', () => {
  assert.equal(stripSheets(2), 1)
  assert.equal(stripSheets(4), 2)
  assert.equal(stripSheets(10), 5)
  assert.equal(stripSheets(3), 2)
})

test('최대 장수 읽기 — 없으면 기본 4장, 1장 단위 시절의 홀수는 위로 올린다', () => {
  useStoredMax(null)
  assert.equal(readStripMax(), 4)
  useStoredMax('1')
  assert.equal(readStripMax(), 2)
  useStoredMax('3')
  assert.equal(readStripMax(), 4)
  useStoredMax('6')
  assert.equal(readStripMax(), 6)
  useStoredMax('99')
  assert.equal(readStripMax(), 4)
})

test('저장소가 없어도 기본값 — 최대 4장, 자동 꺼짐', () => {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage
  assert.equal(readStripMax(), 4)
  assert.equal(readStripAuto(), false)
})
