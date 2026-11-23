// POST! 우체통 — 받는 사람 · 시즌 · 문장 고르기 예문. 시즌 변형은 이 표만 바꾼다.
// 기획 원문: 바탕화면 네안데르_크리스마스_부스/POST_기획/POST_대사·화면문구.md

export type Season = 'base' | 'xmas'

export interface Recipient {
  key: 'mom' | 'dad' | 'grandma' | 'grandpa' | 'friend' | 'love' | 'me' | 'santa'
  /** 단추 글자 */
  label: string
  /** 엽서 첫 줄 */
  toLine: string
  /** 받는 사람 칸 */
  toShort: string
  /** 「~께 하고 싶은 말을 해 주세요」 대사 id */
  sayLine: string
}

const BASE_RECIPIENTS: Recipient[] = [
  { key: 'mom', label: '엄마', toLine: '엄마에게', toShort: '엄마', sayLine: 'say_mom' },
  { key: 'dad', label: '아빠', toLine: '아빠에게', toShort: '아빠', sayLine: 'say_dad' },
  { key: 'grandma', label: '할머니', toLine: '할머니께', toShort: '할머니', sayLine: 'say_grandma' },
  { key: 'grandpa', label: '할아버지', toLine: '할아버지께', toShort: '할아버지', sayLine: 'say_grandpa' },
  { key: 'friend', label: '친구', toLine: '친구에게', toShort: '친구', sayLine: 'say_friend' },
  { key: 'love', label: '사랑하는 사람', toLine: '사랑하는 당신에게', toShort: '당신', sayLine: 'say_love' },
  { key: 'me', label: '나에게', toLine: '나에게', toShort: '나', sayLine: 'say_me' },
]
const SANTA: Recipient = { key: 'santa', label: '산타 할아버지', toLine: '산타 할아버지께', toShort: '산타 할아버지', sayLine: 'say_santa' }

export interface SeasonSet {
  title: string
  sub: string
  idleLines: string[]
  recipients: Recipient[]
  capScript: string
  pmTop: (place: string) => string
  pmBottom: string
  stampValue: string
  accent: string
  phrases: string[]
}

export const SEASONS: Record<Season, SeasonSet> = {
  base: {
    title: '엽서 한 장 부치고 가세요',
    sub: '사진 찍고 · 말로 쓰고 · 카톡으로 배달까지',
    idleLines: ['idle1', 'idle2'],
    recipients: BASE_RECIPIENTS,
    capScript: 'Greetings from',
    pmTop: (place) => `${place} · POST!`,
    pmBottom: 'AI 우체통',
    stampValue: '마음 1통',
    accent: '#c62a2f',
    phrases: [
      '늘 고마워요. 말로는 잘 못 했지만요.',
      '오늘 같이 와서 정말 좋았어.',
      '보고 싶어. 곧 만나자.',
      '힘든 날도 있겠지만 응원해.',
      '사랑해. 이 말 하려고 엽서 써.',
    ],
  },
  xmas: {
    // 크리스마스판은 산타에게만 보낸다 — 넣으면 북극에서 답장이 와서 그 답장이 인화된다(11-23 사용자)
    title: '산타 할아버지께 편지 부치고 가세요',
    sub: '편지를 넣으면 북극에서 답장이 와요',
    idleLines: ['idle_santa', 'idle1'],
    recipients: [SANTA],
    capScript: 'Merry Christmas from',
    pmTop: () => '북극 경유 · POST!',
    pmBottom: 'MERRY CHRISTMAS',
    stampValue: '마음 1통',
    accent: '#b3202a',
    phrases: [
      '산타 할아버지, 저 올해 착하게 지냈어요.',
      '동생이랑 사이좋게 지낼게요.',
      '우리 가족 모두 건강하게 해 주세요.',
      '올해는 편식을 조금 줄였어요.',
      '산타 할아버지도 감기 조심하세요.',
    ],
  },
}

/** 한 줄이 너무 길면 뜻 단위(띄어쓰기)로 나눈다 — 문장 고르기 · AI 실패 때 */
export function splitLines(text: string, max = 16): string[] {
  const out: string[] = []
  let cur = ''
  for (const word of text.trim().split(/\s+/)) {
    if (cur && (cur + ' ' + word).length > max) { out.push(cur); cur = word } else cur = cur ? `${cur} ${word}` : word
  }
  if (cur) out.push(cur)
  return out.slice(0, 5)
}
