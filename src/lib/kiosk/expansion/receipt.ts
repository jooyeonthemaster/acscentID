// 체험 18종의 영수증 — 결과 카드와 같은 내용을 감열지 한 장에(그림은 AI 합성 그림, 없으면 체험 대표 그림을 점묘로). QR 은 영수증 창(KxReceiptSheet)이 붙인다.
// 감열지는 길어질수록 손님이 받기 불편하다 — 절은 앞에서 넷까지, 목록은 다섯 줄까지(AI 분석이 붙자 33cm 까지 길어졌다, 2026-10-14). 나머지는 QR 로 받는 카드에 다 있다.
// 'AI 분석'은 맨 앞 절이라 늘 들어가고, '사진에서 읽은 것'은 뒤쪽에 있어도 빠뜨리지 않는다. 촬영 사진 자체는 찍지 않는다.

import type { KxReceipt, KxReceiptBlock } from '@/app/kiosk/experience/kx-receipt'
import { NO_PHOTO_IDS } from './housing'
import { noteAmount, noteLabel, RECIPE_COUNTER, RECIPE_PRODUCT } from './recipe'
import { EXPANSION_META, type ExpansionId, type ExperienceResult } from './types'

const MAX_SECTIONS = 4
const MAX_ITEMS = 5
const isPhoto = (title: string) => title === '사진에서 읽은 것' || title.startsWith('사진 속')

export function expansionReceipt(id: ExpansionId, result: ExperienceResult, art: { src: string; caption: string } | null = null): KxReceipt {
  const meta = EXPANSION_META[id]
  // 합성 그림은 어두운 배경(오라)이 많아 밝게 찍는다
  const picture: KxReceiptBlock = art ? { kind: 'image', src: art.src, width: 360, frame: true, tone: 172, caption: art.caption } : { kind: 'image', src: meta.hero, width: 300, tone: 168 }
  const blocks: KxReceiptBlock[] = [picture, { kind: 'text', text: result.summary }]
  if (result.tags.length) blocks.push({ kind: 'text', text: result.tags.map((tag) => `#${tag}`).join('  '), small: true, bold: true })
  const recipe = result.recipe
  if (recipe) {
    // 조향 레시피가 영수증의 주인공 — 향료 · 비율 · 용량을 계열 점수 대신 크게 싣고, 절은 둘까지(길이를 맞춘다)
    blocks.push(
      { kind: 'rule' }, { kind: 'heading', text: `조향 레시피 · ${recipe.name}` },
      { kind: 'text', text: `${recipe.product} · 향료 ${RECIPE_PRODUCT.fragranceMl}ml + 퍼퓸 베이스 ${recipe.baseMl}ml${recipe.ai ? '' : ' · 기본 레시피'}`, small: true },
      { kind: 'pairs', rows: [...recipe.notes.map((n): [string, string] => [noteLabel(n), noteAmount(n)]), ['퍼퓸 베이스', `${recipe.baseMl.toFixed(1)}ml`]] },
      { kind: 'list', items: recipe.notes.map((n) => `${n.name} — ${n.reason}`) },
      { kind: 'text', text: RECIPE_COUNTER, bold: true, center: true },
    )
  } else if (result.metrics?.length) blocks.push({ kind: 'pairs', rows: result.metrics.map((m) => [m.label, `${m.value} / ${m.max}`]) })
  const photo = result.sections.filter((section) => isPhoto(section.title))
  const rest = result.sections.filter((section) => !isPhoto(section.title))
  const shown = rest.slice(0, Math.max(1, (recipe ? MAX_SECTIONS - 2 : MAX_SECTIONS) - photo.length))
  for (const section of [...shown, ...photo]) {
    blocks.push({ kind: 'rule' }, { kind: 'heading', text: section.title }, { kind: 'text', text: section.body })
    if (section.items?.length) blocks.push({ kind: 'list', items: section.items.slice(0, MAX_ITEMS) })
  }
  const cut = rest.length > shown.length || result.sections.some((section) => (section.items?.length ?? 0) > MAX_ITEMS)
  if (cut) blocks.push({ kind: 'text', text: '나머지 내용은 휴대폰으로 받는 결과 카드에 모두 있어요.', small: true, center: true })
  if (result.footnote) blocks.push({ kind: 'rule' }, { kind: 'text', text: result.footnote, small: true })
  // 사진을 쓰지 않는 체험(주거복지 내비게이터·성향 테스트)은 사진 이야기 대신 입력 이야기
  const noPhoto = (NO_PHOTO_IDS as readonly string[]).includes(id)
  return { tag: meta.tag, title: result.title, subtitle: result.subtitle ?? meta.name, blocks, foot: noPhoto ? `${meta.name} · 입력한 내용은 저장하지 않아요` : art ? `${meta.name} · AI가 새로 만든 그림만 인쇄했어요 · 촬영 사진은 저장하지 않아요` : `${meta.name} · 촬영 사진은 저장하거나 인쇄하지 않아요` }
}
