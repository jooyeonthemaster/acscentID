type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

const SELF_TONE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/우리\s*애/g, '이 사람'],
  [/최애/g, '나'],
  [/아이돌/g, '인물'],
  [/캐릭터/g, '인물'],
  [/덕질|입덕|팬덤/g, '개인 취향'],
  [/포카/g, '사진'],
  [/콘서트/g, '특별한 자리'],
  [/짱짱이/g, '매력적인 사람'],
  [/비주얼\s*테러/g, '강한 인상'],
  [/심장\s*저격/g, '시선을 끄는 매력'],
  [/존잘|존예/g, '매력적'],
  [/ㄹㅇ/g, '정말'],
  [/ㅇㅈ/g, '인정'],
  [/ㄷㄷ/g, ''],
  [/개쩐다|개쩔어/g, '인상적이야'],
  [/갓벽/g, '잘 맞아'],
  [/실화냐/g, '정말 인상적이야'],
  [/씹어먹/g, '압도하'],
  [/핵인싸/g, '존재감 있는 사람'],
]

function softenExcess(text: string) {
  return SELF_TONE_REPLACEMENTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text
  )
    .replace(/([!?]){3,}/g, '$1$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function sanitizeSelfAnalysisTone<T>(value: T): T {
  if (typeof value === 'string') {
    return softenExcess(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSelfAnalysisTone(item)) as T
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, JsonValue>).map(([key, item]) => [
      key,
      sanitizeSelfAnalysisTone(item),
    ])
    return Object.fromEntries(entries) as T
  }

  return value
}
