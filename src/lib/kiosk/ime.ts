// 병음 입력 → 한자 후보. 사전은 ime-pinyin.ts (자동 생성).

import { PINYIN_HANS, PINYIN_HANT, PINYIN_SYLLABLES } from './ime-pinyin'

const MAX_CANDIDATES = 60

/**
 * 입력한 병음으로 한자 후보를 찾는다.
 * 정확히 일치하는 음절이 먼저 오고, 그 뒤에 그 병음으로 시작하는 음절들이 붙는다
 * (zha 를 치는 중에도 zhang 후보가 보이므로 끝까지 치지 않아도 고를 수 있다).
 */
export function pinyinCandidates(input: string, traditional = false): string[] {
  const key = input.toLowerCase().replace(/[^a-z]/g, '')
  if (!key) return []
  const table = traditional ? PINYIN_HANT : PINYIN_HANS
  const out: string[] = []
  const seen = new Set<string>()
  const take = (syllable: string) => {
    for (const ch of table[syllable] ?? '') {
      if (seen.has(ch)) continue
      seen.add(ch)
      out.push(ch)
      if (out.length >= MAX_CANDIDATES) return true
    }
    return false
  }
  if (table[key] && take(key)) return out
  for (const syllable of PINYIN_SYLLABLES) {
    if (syllable === key || !syllable.startsWith(key)) continue
    if (take(syllable)) break
  }
  return out
}
