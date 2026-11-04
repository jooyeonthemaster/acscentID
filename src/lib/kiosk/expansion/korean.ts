// 결과 문장에 바뀌는 단어를 넣을 때의 조사 — '레몬·라임를', '미디엄와' 같은 어색한 문장을 막는다.
// 마지막 글자의 받침으로 고른다. 숫자는 읽는 소리(0 영·1 일·3 삼·6 육·7 칠·8 팔은 받침 있음), 그 밖의 글자는 받침 없는 쪽.

type Pair = '을/를' | '이/가' | '은/는' | '과/와' | '으로/로' | '이에요/예요' | '이라는/라는'
const DIGIT_FINAL: Record<string, number> = { '0': 21, '1': 8, '2': 0, '3': 16, '4': 0, '5': 0, '6': 1, '7': 8, '8': 8, '9': 0 }

/** 마지막 글자의 받침 번호(0 = 받침 없음, 8 = ㄹ) */
function finalConsonant(word: string): number {
  const last = word.replace(/[\s)\]'"’”.,!?…·]+$/u, '').slice(-1)
  if (!last) return 0
  if (last in DIGIT_FINAL) return DIGIT_FINAL[last]
  const code = last.charCodeAt(0) - 0xac00
  return code >= 0 && code < 11172 ? code % 28 : 0
}

/** 단어 + 알맞은 조사 */
export function josa(word: string, pair: Pair): string {
  const [withFinal, withoutFinal] = pair.split('/')
  const final = finalConsonant(word)
  // '으로/로'는 ㄹ 받침도 '로'
  const useFinal = pair === '으로/로' ? final !== 0 && final !== 8 : final !== 0
  return word + (useFinal ? withFinal : withoutFinal)
}
