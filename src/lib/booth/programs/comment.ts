// 포토부스 AI 사진의 '코멘트' — 2026-10-26 주거복지대전 제안서("기념인화 → 코멘트 및 사진 인쇄")에 맞춰
// 만든 사진을 AI 텍스트 모델이 보고 한 줄 축하·환영 문구를 쓴다. 인화물과 결과 화면에 들어간다(사진 안에 글자를 그리지 않는다 — 인화 디자인이 얹는다).
// 외모 평가·실존 인물·지어낸 사실은 금지(키오스크 AI 와 같은 금지어). 20초 안에 못 받거나 어긋나면 프로그램별 기본 문구로 대신한다.

import { FORBIDDEN } from '@/lib/kiosk/expansion/ai'
import type { ProgramDef } from './catalog'

const MAX = 32

/** 프로그램마다 코멘트의 역할 — catalog 의 comment 가 켜진 프로그램만 */
const ROLE: Record<string, string> = {
  'housing-movein': '새 집에 입주하는 날의 기념사진에 붙일 따뜻한 축하 한 줄. 사진 속 집과 분위기(햇살·창밖·소품)를 짚어 "우리 집 첫날"을 축하한다.',
  'housing-2046': '2046년 미래 도시에 막 입주한 주민을 맞이하는 환영 한 줄. 사진 속 도시 풍경(숲 타워·바다 마을·드론 등)을 짚는다. 실제 계획이나 예언처럼 말하지 않는다.',
  history: '역사에서 영감을 받은 상상화 속 한 장면에 붙일 한 줄. 사진 속 장면(궁궐·정원·별빛 마당)과 역할을 짚어 그 순간의 주인공이 된 것을 기념한다. 실제 역사 기록처럼 말하지 않는다.',
}

export const hasComment = (program: ProgramDef) => program.id in ROLE

export function buildCommentPrompt(program: ProgramDef, labels: Record<string, string>): string {
  return [
    `당신은 포토부스 '${program.name}'의 인화물에 들어갈 짧은 코멘트를 쓰는 카피라이터입니다. 첨부한 그림은 손님 사진으로 방금 만든 AI 사진입니다.`,
    `- 역할: ${ROLE[program.id]}`,
    `- 손님이 고른 것: ${Object.values(labels).join(' · ')}`,
    `- 한국어 한 문장, ${MAX}자 이내, 존댓말 또는 다정한 말투. 따옴표·이모지·해시태그 없이.`,
    '- 사람의 외모(얼굴·체형·나이·피부)를 평가하지 않는다. 실존 인물·연예인을 말하지 않는다. 행사·기관 이름을 넣지 않는다.',
    '# 출력 — JSON 하나만: {"comment": "코멘트"}',
  ].join('\n')
}

export function parseComment(value: unknown): string {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>).comment : null
  const comment = typeof raw === 'string' ? raw.replace(/["“”'`#]/g, '').replace(/\s+/g, ' ').trim() : ''
  if (comment.length < 6 || comment.length > MAX + 4) throw new Error(`comment 는 6~${MAX}자여야 합니다.`)
  if (!/[가-힣]/.test(comment)) throw new Error('한국어로 써야 합니다.')
  for (const [pattern, why] of FORBIDDEN) if (pattern.test(comment)) throw new Error(`규칙 위반(${why}).`)
  return comment
}

/** AI 를 못 받았을 때의 기본 코멘트 — 고른 옵션으로 */
export function fallbackComment(program: ProgramDef, labels: Record<string, string>): string {
  switch (program.id) {
    case 'housing-movein': return `${labels.home ?? '새 집'}에서 시작하는 첫날, 입주를 축하해요`
    case 'housing-2046': return `${labels.city ?? '미래 도시'}의 새 주민이 되신 걸 환영해요`
    case 'history': return `${labels.scene ?? '역사 속 한 장면'}, 그 순간의 주인공이 되었어요`
    default: return ''
  }
}
