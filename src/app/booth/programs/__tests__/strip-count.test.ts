// ANSAN 띠지 인화 장수 — 고를 수 있는 장수 · 인쇄 장수 계산(npm run test:booth-timecapsule 에 함께)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readStripAuto, readStripMax, stripCountOptions, stripPrintPlan } from '../strip-count'

test('자동 인화수 꺼짐 — 1장부터 최대까지, 처음 값은 2장', () => {
  assert.deepEqual(stripCountOptions(4, false, 3), { choices: [1, 2, 3, 4], initial: 2 })
  assert.deepEqual(stripCountOptions(1, false, 3), { choices: [1], initial: 1 })
})

test('자동 인화수 켜짐 — 찍힌 인원수까지만, 처음 값은 인원수, 최대 장수는 넘지 않는다', () => {
  assert.deepEqual(stripCountOptions(4, true, 3), { choices: [1, 2, 3], initial: 3 })
  assert.deepEqual(stripCountOptions(4, true, 1), { choices: [1], initial: 1 })
  assert.deepEqual(stripCountOptions(2, true, 4), { choices: [1, 2], initial: 2 })
})

test('자동 인화수 켜짐인데 인원수를 모르면 — 꺼진 것과 같다', () => {
  assert.deepEqual(stripCountOptions(4, true, 0), { choices: [1, 2, 3, 4], initial: 2 })
})

test('인쇄 장수 — 4×6 한 장 = 띠지 두 줄, 홀수면 한 줄만 찬 장 하나', () => {
  assert.deepEqual(stripPrintPlan(1), { fullSheets: 0, halfSheet: true })
  assert.deepEqual(stripPrintPlan(2), { fullSheets: 1, halfSheet: false })
  assert.deepEqual(stripPrintPlan(3), { fullSheets: 1, halfSheet: true })
  assert.deepEqual(stripPrintPlan(4), { fullSheets: 2, halfSheet: false })
  assert.deepEqual(stripPrintPlan(10), { fullSheets: 5, halfSheet: false })
})

test('저장소가 없어도 기본값 — 최대 4장, 자동 꺼짐', () => {
  assert.equal(readStripMax(), 4)
  assert.equal(readStripAuto(), false)
})
