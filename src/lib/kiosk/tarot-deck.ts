// 키오스크 AI 타로 — 메이저 아르카나 22장. 카드 뽑기(섞기·정/역방향)는 코드가 하고 AI는 해석만 쓴다.
// 원소는 황금새벽회 대응(행성·별자리)을 네 원소로 묶은 것 — 카드 문양과 결과 화면 강조색에 쓴다.
// 키워드는 한국어 원본만 둔다: 화면에 보이는 게 아니라 프롬프트 입력이라서(선택지 값과 같은 계약).

import type { KioskLang } from './i18n'
import type { TarotDraw, TarotElement, TarotPosition, TarotTopic } from '@/types/analysis'

export interface TarotCard {
  id: number
  roman: string
  names: Record<KioskLang, string>
  element: TarotElement
  /** 정방향 · 역방향 키워드(프롬프트용, 한국어) */
  upright: string
  reversed: string
}

const card = (
  id: number, roman: string, element: TarotElement,
  en: string, ko: string, ja: string, zhHans: string, zhHant: string,
  upright: string, reversed: string,
): TarotCard => ({ id, roman, element, names: { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }, upright, reversed })

export const TAROT_DECK: readonly TarotCard[] = [
  card(0, '0', 'air', 'The Fool', '바보', '愚者', '愚者', '愚者', '새 출발 · 자유 · 순수한 믿음', '망설임 · 무모함을 돌아볼 때'),
  card(1, 'I', 'air', 'The Magician', '마법사', '魔術師', '魔术师', '魔術師', '의지 · 창조 · 시작할 힘', '흩어진 집중 · 아껴 둔 재능'),
  card(2, 'II', 'water', 'The High Priestess', '여사제', '女教皇', '女祭司', '女祭司', '직관 · 고요 · 내면의 목소리', '닫아 둔 속마음 · 미뤄 둔 직감'),
  card(3, 'III', 'earth', 'The Empress', '여황제', '女帝', '皇后', '皇后', '풍요 · 돌봄 · 감각의 기쁨', '나를 돌볼 차례 · 지나친 베풂'),
  card(4, 'IV', 'fire', 'The Emperor', '황제', '皇帝', '皇帝', '皇帝', '질서 · 책임 · 단단한 기반', '힘을 뺄 때 · 굳어진 고집'),
  card(5, 'V', 'earth', 'The Hierophant', '교황', '法王', '教皇', '教皇', '배움 · 전통 · 믿을 만한 조언', '나만의 방식 · 틀에서 벗어나기'),
  card(6, 'VI', 'air', 'The Lovers', '연인', '恋人', '恋人', '戀人', '사랑 · 선택 · 마음의 일치', '엇갈린 마음 · 미뤄 둔 선택'),
  card(7, 'VII', 'water', 'The Chariot', '전차', '戦車', '战车', '戰車', '전진 · 승리 · 의지의 조종', '방향 재정비 · 속도 조절'),
  card(8, 'VIII', 'fire', 'Strength', '힘', '力', '力量', '力量', '부드러운 용기 · 인내 · 내면의 힘', '자신감을 되찾을 때'),
  card(9, 'IX', 'earth', 'The Hermit', '은둔자', '隠者', '隐士', '隱士', '성찰 · 혼자만의 시간 · 지혜', '고립에서 나오기 · 지나친 생각'),
  card(10, 'X', 'fire', 'Wheel of Fortune', '운명의 수레바퀴', '運命の輪', '命运之轮', '命運之輪', '전환점 · 행운 · 흐름의 변화', '잠시 멈춘 흐름 · 때를 기다림'),
  card(11, 'XI', 'air', 'Justice', '정의', '正義', '正义', '正義', '균형 · 공정 · 원인과 결과', '기울어진 균형 · 솔직해질 때'),
  card(12, 'XII', 'water', 'The Hanged Man', '매달린 사람', '吊るされた男', '倒吊人', '倒吊人', '멈춤 · 다른 시선 · 내려놓음', '미뤄 둔 결정 · 움직일 때'),
  card(13, 'XIII', 'water', 'Death', '죽음', '死神', '死神', '死神', '끝과 시작 · 변화 · 비워 냄', '놓지 못한 것 · 천천히 오는 변화'),
  card(14, 'XIV', 'fire', 'Temperance', '절제', '節制', '节制', '節制', '조화 · 중용 · 섞임의 미학', '과함과 모자람 · 리듬 되찾기'),
  card(15, 'XV', 'earth', 'The Devil', '악마', '悪魔', '恶魔', '惡魔', '욕망 · 몰입 · 강한 끌림', '얽매임에서 풀려남 · 자유'),
  card(16, 'XVI', 'fire', 'The Tower', '탑', '塔', '高塔', '高塔', '급변 · 깨달음 · 낡은 것이 무너짐', '비켜 간 충격 · 서서히 바뀜'),
  card(17, 'XVII', 'air', 'The Star', '별', '星', '星星', '星星', '희망 · 치유 · 영감', '흐려진 희망 · 나를 믿기'),
  card(18, 'XVIII', 'water', 'The Moon', '달', '月', '月亮', '月亮', '직감 · 꿈 · 무의식', '걷히는 안개 · 풀리는 오해'),
  card(19, 'XIX', 'fire', 'The Sun', '태양', '太陽', '太阳', '太陽', '기쁨 · 성공 · 활력', '잠시 가려진 빛 · 소박한 기쁨'),
  card(20, 'XX', 'fire', 'Judgement', '심판', '審判', '审判', '審判', '부름 · 깨어남 · 다시 일어섬', '망설이는 대답 · 자기 의심'),
  card(21, 'XXI', 'earth', 'The World', '세계', '世界', '世界', '世界', '완성 · 성취 · 하나의 원이 닫힘', '마무리 한 걸음 · 남은 과제'),
]

export const TAROT_POSITIONS: readonly TarotPosition[] = ['past', 'present', 'future']
export const TAROT_TOPICS: readonly TarotTopic[] = ['general', 'love', 'career', 'money', 'self']
/** 원소 대표색 — 카드 문양·결과 화면 강조색 */
export const TAROT_ELEMENT_COLORS: Record<TarotElement, string> = { fire: '#B5452F', water: '#2F5D8A', air: '#6F93B5', earth: '#6B7A45' }
export const TAROT_PICK_COUNT = TAROT_POSITIONS.length

/** 앞면 원화(Rider–Waite–Smith) — public/assets/kiosk-programs/tarot-major/README.md */
export function tarotArtSrc(id: number): string {
  return `/assets/kiosk-programs/tarot-major/m${String(id).padStart(2, '0')}.webp`
}

// 받아 둔 원화 — 참조를 쥐고 있어야 같은 문서 안에서 다시 그릴 때 서버에 묻지 않고 바로 쓴다(HTML '사용 가능한 이미지 목록')
const preloadedArt: HTMLImageElement[] = []

/**
 * 원화 22장을 미리 받아 둔다(약 2MB). 매장 망이 느려서, 카드를 고르는 순간에 받기 시작하면 펼칠 때 앞면이 비어 보였다.
 * 타로 모드의 첫 화면에서 부른다 — 한 번만 받는다. 브라우저 밖(서버)에서는 아무것도 하지 않는다.
 */
export function preloadTarotArt(): void {
  if (typeof window === 'undefined' || preloadedArt.length) return
  for (const src of [...TAROT_DECK.map((card) => tarotArtSrc(card.id)), '/assets/kiosk-programs/tarot-back-art.svg']) {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    preloadedArt.push(img)
  }
}

/** 역방향이 나올 확률 — 반반이면 화면이 뒤집힌 카드투성이라 읽는 재미보다 불안이 앞선다 */
const REVERSED_CHANCE = 0.3

export function tarotCard(id: number): TarotCard | undefined {
  return TAROT_DECK[id]
}

function randomUnit(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

/** 섞은 덱 — 자리마다 카드와 방향이 미리 정해져 있고, 손님은 뒷면만 보고 자리를 고른다 */
export function shuffleTarotDeck(): TarotDraw[] {
  const ids = TAROT_DECK.map((c) => c.id)
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomUnit() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids.map((id) => ({ id, reversed: randomUnit() < REVERSED_CHANCE }))
}

/** 요청으로 받은 카드 세 장 검증 — 0~21, 서로 다른 세 장 */
export function parseTarotDraws(raw: unknown): TarotDraw[] | null {
  if (!Array.isArray(raw) || raw.length !== TAROT_PICK_COUNT) return null
  const draws: TarotDraw[] = []
  for (const item of raw) {
    const id = (item as { id?: unknown } | null)?.id
    if (typeof id !== 'number' || !Number.isInteger(id) || !TAROT_DECK[id]) return null
    if (draws.some((d) => d.id === id)) return null
    draws.push({ id, reversed: (item as { reversed?: unknown }).reversed === true })
  }
  return draws
}
