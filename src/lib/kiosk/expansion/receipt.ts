// 체험 18종의 영수증 — 결과 카드와 같은 내용을 감열지 한 장에(그림은 체험 대표 그림을 점묘로). QR 은 영수증 창(KxReceiptSheet)이 붙인다.
// 감열지는 길어질수록 손님이 받기 불편하다 — 절은 앞에서 다섯까지, 목록은 일곱 줄까지. 나머지는 QR 로 받는 카드에 다 있다.
// '사진에서 읽은 것'은 뒤쪽에 있어도 빠뜨리지 않는다(사진이 결과에 무엇을 더했는지는 꼭 남긴다). 촬영 사진은 찍지 않는다.

import type { KxReceipt, KxReceiptBlock } from '@/app/kiosk/experience/kx-receipt'
import { EXPANSION_META, type ExpansionId, type ExperienceResult } from './types'

const MAX_SECTIONS = 5
const MAX_ITEMS = 7
const isPhoto = (title: string) => title === '사진에서 읽은 것' || title.startsWith('사진 속')

export function expansionReceipt(id: ExpansionId, result: ExperienceResult): KxReceipt {
  const meta = EXPANSION_META[id]
  const blocks: KxReceiptBlock[] = [{ kind: 'image', src: meta.hero, width: 320, tone: 168 }, { kind: 'text', text: result.summary }]
  if (result.tags.length) blocks.push({ kind: 'text', text: result.tags.map((tag) => `#${tag}`).join('  '), small: true, bold: true })
  if (result.metrics?.length) blocks.push({ kind: 'pairs', rows: result.metrics.map((m) => [m.label, `${m.value} / ${m.max}`]) })
  const photo = result.sections.filter((section) => isPhoto(section.title))
  const rest = result.sections.filter((section) => !isPhoto(section.title))
  const shown = rest.slice(0, Math.max(1, MAX_SECTIONS - photo.length))
  for (const section of [...shown, ...photo]) {
    blocks.push({ kind: 'rule' }, { kind: 'heading', text: section.title }, { kind: 'text', text: section.body })
    if (section.items?.length) blocks.push({ kind: 'list', items: section.items.slice(0, MAX_ITEMS) })
  }
  const cut = rest.length > shown.length || result.sections.some((section) => (section.items?.length ?? 0) > MAX_ITEMS)
  if (cut) blocks.push({ kind: 'text', text: '나머지 내용은 휴대폰으로 받는 결과 카드에 모두 있어요.', small: true, center: true })
  if (result.footnote) blocks.push({ kind: 'rule' }, { kind: 'text', text: result.footnote, small: true })
  return { tag: meta.tag, title: result.title, subtitle: result.subtitle ?? meta.name, blocks, foot: `${meta.name} · 촬영 사진은 저장하거나 인쇄하지 않아요` }
}
