// 두벌식 한글 조합 엔진 — 터치 키보드용.
// 브라우저 IME 없이 자모 입력을 음절로 합친다 (ㄱ→ㄱ, +ㅏ→가, +ㅁ→감, +ㅏ→가마).
// 순수 함수 + 불변 상태라서 React state로 그대로 들고 다닐 수 있다.

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const

// 0번은 '종성 없음'
const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const

const SYLLABLE_BASE = 0xac00

/** 복모음 조합: ㅗ+ㅏ=ㅘ 등 */
const JUNG_COMPOUND: Record<string, string> = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ',
}

/** 겹받침 조합: ㄱ+ㅅ=ㄳ 등 */
const JONG_COMPOUND: Record<string, string> = {
  'ㄱㅅ': 'ㄳ',
  'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ',
  'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ',
  'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ',
  'ㅂㅅ': 'ㅄ',
}

/** 복모음/겹받침 → [앞, 뒤] 역분해 (백스페이스용) */
const DECOMPOSE: Record<string, [string, string]> = {}
for (const [pair, merged] of Object.entries(JUNG_COMPOUND)) {
  DECOMPOSE[merged] = [pair[0], pair[1]]
}
for (const [pair, merged] of Object.entries(JONG_COMPOUND)) {
  DECOMPOSE[merged] = [pair[0], pair[1]]
}

export interface HangulState {
  /** 조합이 끝난 확정 문자열 */
  text: string
  /** 조합 중인 초성 인덱스 (-1 = 없음) */
  cho: number
  /** 조합 중인 중성 인덱스 (-1 = 없음) */
  jung: number
  /** 조합 중인 종성 인덱스 (0 = 없음) */
  jong: number
}

export const EMPTY_HANGUL: HangulState = { text: '', cho: -1, jung: -1, jong: 0 }

export function isVowelJamo(ch: string): boolean {
  return (JUNG as readonly string[]).includes(ch)
}

/** 조합 중인 글자 (없으면 빈 문자열) */
function composingChar(s: HangulState): string {
  if (s.cho >= 0 && s.jung >= 0) {
    return String.fromCharCode(SYLLABLE_BASE + (s.cho * 21 + s.jung) * 28 + s.jong)
  }
  if (s.cho >= 0) return CHO[s.cho]
  if (s.jung >= 0) return JUNG[s.jung]
  return ''
}

/** 화면에 보여줄 전체 문자열 (확정분 + 조합 중인 글자) */
export function hangulValue(s: HangulState): string {
  return s.text + composingChar(s)
}

/** 조합을 확정하고 조합 버퍼를 비운다 */
export function commitHangul(s: HangulState): HangulState {
  const composing = composingChar(s)
  return { text: s.text + composing, cho: -1, jung: -1, jong: 0 }
}

/** 자모 한 글자 입력 */
export function pushJamo(s: HangulState, jamo: string, maxLength = Infinity): HangulState {
  // 길이 제한: 한도에 도달하면 글자 수가 늘어나는 입력만 거부한다(받침·복모음은 허용).
  // 거부할 때는 반드시 조합을 확정해서 끊는다 — 버퍼를 살려두면 버려진 키 다음에 온 자음이
  // 이미 완성된 글자에 받침으로 달라붙어(마 → 맘) 확정된 음절이 소급 변형된다.
  const atLimit = hangulValue(s).length >= maxLength

  if (isVowelJamo(jamo)) {
    const v = JUNG.indexOf(jamo as (typeof JUNG)[number])

    // 종성이 있으면 그 종성을 다음 글자의 초성으로 넘긴다 (감 + ㅏ → 가마)
    if (s.cho >= 0 && s.jung >= 0 && s.jong > 0) {
      if (atLimit) return commitHangul(s)
      const jongChar = JONG[s.jong]
      const split = DECOMPOSE[jongChar]
      const keep = split ? JONG.indexOf(split[0] as (typeof JONG)[number]) : 0
      const moved = split ? split[1] : jongChar
      const movedCho = CHO.indexOf(moved as (typeof CHO)[number])
      const settled = String.fromCharCode(SYLLABLE_BASE + (s.cho * 21 + s.jung) * 28 + keep)
      // 초성이 될 수 없는 받침(ㄳ 등 분해 후는 항상 가능)은 그대로 확정
      if (movedCho < 0) {
        return { text: s.text + settled + moved, cho: -1, jung: v, jong: 0 }
      }
      return { text: s.text + settled, cho: movedCho, jung: v, jong: 0 }
    }

    // 중성만/초성+중성 상태에서 복모음 시도 (ㅗ + ㅏ → ㅘ)
    if (s.jung >= 0) {
      const merged = JUNG_COMPOUND[JUNG[s.jung] + jamo]
      if (merged) {
        return { ...s, jung: JUNG.indexOf(merged as (typeof JUNG)[number]) }
      }
      // 복모음이 안 되면 현재 글자를 확정하고 새 모음으로 시작 (가 + ㅏ → 가ㅏ)
      if (atLimit) return commitHangul(s)
      const committed = commitHangul(s)
      return { ...committed, jung: v }
    }

    // 초성만 있으면 음절 완성 (ㄱ + ㅏ → 가)
    if (s.cho >= 0) return { ...s, jung: v }

    // 아무것도 없으면 모음 단독 조합 시작
    if (atLimit) return commitHangul(s)
    return { ...s, jung: v }
  }

  // ── 자음 ──────────────────────────────────────────────
  const asCho = CHO.indexOf(jamo as (typeof CHO)[number])
  const asJong = JONG.indexOf(jamo as (typeof JONG)[number])

  // 초성 + 중성 상태 → 종성으로 붙이기 (가 + ㅁ → 감)
  if (s.cho >= 0 && s.jung >= 0) {
    if (s.jong === 0) {
      if (asJong > 0) return { ...s, jong: asJong }
    } else {
      const merged = JONG_COMPOUND[JONG[s.jong] + jamo]
      if (merged) return { ...s, jong: JONG.indexOf(merged as (typeof JONG)[number]) }
    }
    // 종성이 될 수 없으면(ㄸㅃㅉ) 또는 겹받침이 안 되면 확정하고 새 초성
    if (atLimit) return commitHangul(s)
    const committed = commitHangul(s)
    return asCho >= 0 ? { ...committed, cho: asCho } : { ...committed, text: committed.text + jamo }
  }

  // 그 외(초성만 / 모음만 / 빈 상태)는 확정하고 새 초성 시작
  if (atLimit) return commitHangul(s)
  const committed = commitHangul(s)
  return asCho >= 0 ? { ...committed, cho: asCho } : { ...committed, text: committed.text + jamo }
}

/** 일반 문자(영문/숫자/공백) 입력 — 조합을 끊고 그대로 덧붙인다 */
export function pushChar(s: HangulState, ch: string, maxLength = Infinity): HangulState {
  const committed = commitHangul(s)
  if (committed.text.length >= maxLength) return committed
  return { ...committed, text: committed.text + ch }
}

/** 한 글자(또는 조합 한 단계) 지우기 */
export function backspace(s: HangulState): HangulState {
  if (s.jong > 0) {
    const split = DECOMPOSE[JONG[s.jong]]
    return { ...s, jong: split ? JONG.indexOf(split[0] as (typeof JONG)[number]) : 0 }
  }
  if (s.jung >= 0) {
    const split = DECOMPOSE[JUNG[s.jung]]
    if (split) return { ...s, jung: JUNG.indexOf(split[0] as (typeof JUNG)[number]) }
    return { ...s, jung: -1 }
  }
  if (s.cho >= 0) {
    return { ...s, cho: -1 }
  }
  return { ...s, text: [...s.text].slice(0, -1).join('') }
}

/** 완성된 문자열 → 조합 상태 (외부에서 값을 주입할 때) */
export function fromText(text: string): HangulState {
  return { text, cho: -1, jung: -1, jong: 0 }
}
