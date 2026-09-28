// 한국어가 아닌 사주 해석에 섞여 나오는 한글을 줄인다 — AI가 가끔 '乙사', '계미', '時柱의', '決단'처럼 한글을 섞는다.
// 1) 한글로 쓴 천간·지지는 한자로, 2) 한자 뒤에 붙은 조사는 지운다. 그래도 남으면 호출부가 한 번 다시 받는다.

const STEMS: Record<string, string> = { 갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊', 기: '己', 경: '庚', 신: '辛', 임: '壬', 계: '癸' }
const BRANCHES: Record<string, string> = { 자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳', 오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥' }
const STEM_RE = Object.keys(STEMS).join('')
const BRANCH_RE = Object.keys(BRANCHES).join('')
const HANJA_STEMS = Object.values(STEMS).join('')

export const HANGUL = /[가-힣]/

export function fixHangul(text: string): string {
  return text
    // '계미' → 癸未 (천간+지지 한글 두 글자)
    .replace(new RegExp(`([${STEM_RE}])([${BRANCH_RE}])(?![가-힣])`, 'g'), (m, s: string, b: string) => STEMS[s] + BRANCHES[b])
    // '乙사' → 乙巳 (한자 천간 뒤 한글 지지)
    .replace(new RegExp(`([${HANJA_STEMS}])([${BRANCH_RE}])(?![가-힣])`, 'g'), (m, s: string, b: string) => s + BRANCHES[b])
    // '時柱의' '金은' → 조사 삭제 (한자·괄호 바로 뒤 한 글자 조사)
    .replace(/([㐀-鿿）)」])(?:의|은|는|이|가|을|를|에|과|와|로|으로)(?=[\s　-〿㐀-鿿＀-￯(（「,.!?]|$)/g, '$1')
}

export interface HangulLeftover { path: (string | number)[]; text: string }

/** 객체 안 모든 문자열에 fixHangul — 그래도 한글이 남은 글의 위치·전문을 leftovers 에 모은다 */
export function fixHangulDeep<T>(value: T, leftovers: HangulLeftover[] = [], path: (string | number)[] = []): T {
  if (typeof value === 'string') {
    const fixed = fixHangul(value)
    if (HANGUL.test(fixed)) leftovers.push({ path, text: fixed })
    return fixed as T
  }
  if (Array.isArray(value)) return value.map((v, i) => fixHangulDeep(v, leftovers, [...path, i])) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fixHangulDeep(v, leftovers, [...path, k])])) as T
  }
  return value
}

/** path 위치의 문자열을 바꾼다(제자리) */
export function setAtPath(root: unknown, path: (string | number)[], text: string) {
  let cur = root as Record<string | number, unknown>
  for (const key of path.slice(0, -1)) cur = cur[key] as Record<string | number, unknown>
  cur[path[path.length - 1]] = text
}
