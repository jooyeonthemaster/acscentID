// 펀그라운드 B안 퍼스널 컬러 — 미리 쓴 결과 표가 8유형 모두 빠짐없는지, 판정이 숫자 규칙대로 결과 · 다시 찍기로 갈리는지
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { PERSONAL_COLOR_TYPES, PERSONAL_COLOR_TYPE_IDS } from '../../kiosk/color-types'
import type { ColorMeasure } from '../../kiosk/garment-core'
import { FG_COLOR_TEXTS } from '../color-texts'
import { FG_RETAKE_TEXTS, judgeColor } from '../color-judge'

const HEX = /^#[0-9A-F]{6}$/
/** 아이들 화면에 나오면 안 되는 말 — 점수 · 순위 · 외모 평가 */
const BANNED = /[0-9]+\s*(점|%|위)|예쁘|못생|잘생|피부\s*톤\s*업|미백|화장|메이크업|염색/

test('8유형 모두 문장 · 특징 3 · 어울리는 색 12 · 조언 2~3', () => {
  assert.deepEqual(Object.keys(FG_COLOR_TEXTS).sort(), [...PERSONAL_COLOR_TYPE_IDS].sort())
  for (const type of PERSONAL_COLOR_TYPES) {
    const t = FG_COLOR_TEXTS[type.id]
    assert.equal(t.undertone, type.undertone, `${type.id} 웜/쿨`)
    for (const text of [t.name, t.nickname, t.summary, t.metal]) assert.ok(text.trim().length > 0, `${type.id} 빈 문장`)
    assert.equal(t.features.length, 3, `${type.id} 특징 3`)
    assert.ok(t.tips.length >= 2 && t.tips.length <= 3, `${type.id} 조언 2~3`)
    assert.equal(t.colors.length, 12, `${type.id} 색 12`)
    for (const c of t.colors) {
      assert.match(c.hex, HEX, `${type.id} ${c.hex}`)
      assert.ok(c.name.trim().length > 0 && c.name.length <= 10, `${type.id} 색 이름 ${c.name}`)
    }
    assert.equal(new Set(t.colors.map((c) => c.hex)).size, 12, `${type.id} 색 겹침`)
    assert.equal(new Set(t.colors.map((c) => c.name)).size, 12, `${type.id} 색 이름 겹침`)
    // 키오스크 팔레트(best 8)를 앞에 그대로 둔다 — 같은 유형이면 키오스크와 같은 색
    assert.deepEqual(t.colors.slice(0, 8).map((c) => c.hex), type.best.map((h) => h.toUpperCase()), `${type.id} 키오스크 팔레트`)
    for (const text of [t.nickname, t.summary, ...t.features, ...t.tips]) assert.doesNotMatch(text, BANNED, `${type.id}: ${text}`)
    // 화면이 「{metal}이 잘 어울려요」로 붙인다 — 받침 있는 글자로 끝나야 한다
    const last = t.metal.charCodeAt(t.metal.length - 1) - 0xac00
    assert.ok(last >= 0 && last < 11172 && last % 28 !== 0, `${type.id} 금속 말 끝 받침: ${t.metal}`)
  }
})

const measure = (skin: [number, number, number], hair: [number, number, number] | null, skinShare = 0.08): ColorMeasure => ({
  skin: { L: skin[0], a: skin[1], b: skin[2] },
  hair: hair ? { L: hair[0], a: hair[1], b: hair[2] } : null,
  skinShare,
  hairShare: hair ? 0.05 : 0,
})

test('판정 — 측정값이 충분하면 유형, 아니면 다시 찍기 이유', () => {
  assert.deepEqual(judgeColor(null), { ok: false, reason: 'no-face' })
  assert.deepEqual(judgeColor(measure([70, 12, 16], [20, 2, 3], 0.01)), { ok: false, reason: 'small-face' })
  assert.deepEqual(judgeColor(measure([30, 10, 14], [10, 1, 1])), { ok: false, reason: 'too-dark' })
  assert.deepEqual(judgeColor(measure([94, 5, 8], [20, 1, 1])), { ok: false, reason: 'too-bright' })
  assert.deepEqual(judgeColor(measure([70, 2, 3], [20, 1, 1])), { ok: false, reason: 'odd-light' })
  // 피부가 밝아 딥이 아닌데 머리카락을 못 쟀다 — 웜/쿨만 정해진다 → 다시 찍기
  assert.deepEqual(judgeColor(measure([70, 12, 20], null)), { ok: false, reason: 'no-hair' })
  // 노란 쪽(색상각 ≥ 55) · 대비 큼 → 봄 브라이트
  assert.deepEqual(judgeColor(measure([72, 10, 18], [5, 1, 1])), { ok: true, typeId: 'spring-bright', undertone: 'warm' })
  // 붉은 쪽 · 어두운 피부 → 겨울 딥(머리카락 없이도 딥은 정해진다)
  assert.deepEqual(judgeColor(measure([55, 16, 14], null)), { ok: true, typeId: 'winter-deep', undertone: 'cool' })
  for (const reason of Object.values(FG_RETAKE_TEXTS)) assert.ok(reason.tips.length >= 2)
})
