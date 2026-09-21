// 키오스크 일본어 입력 — 로마자(ローマ字)를 가나로 바꾼다.
// 사전이 필요한 한자 변환은 하지 않는다: 영수증에 찍히는 것은 이름 한 칸이고,
// 일본에서 이름을 가나로 적는 것은 자연스럽다(외국인 이름은 오히려 가타카나가 표준).

/** 로마자 → 히라가나. 긴 것부터 맞춰야 하므로 길이순으로 훑는다. */
const ROMAJI: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を', nn: 'ん',
  // 요음(拗音)
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  // 외래어 표기에 필요한 조합
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
  she: 'しぇ', che: 'ちぇ', je: 'じぇ',
  ti_: 'てぃ', tsa: 'つぁ', tso: 'つぉ',
  // 작은 가나 (xa / la)
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ',
  xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', xtu: 'っ',
  la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ',
  '-': 'ー',
}

const MAX_ROMAJI = 3

/** 히라가나 → 가타카나 */
export function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
}

export interface KanaStep {
  /** 확정되어 본문에 붙일 가나 (없으면 빈 문자열) */
  emit: string
  /** 아직 변환되지 않고 남은 로마자 */
  pending: string
}

/**
 * 로마자 버퍼에 글자 하나를 더해 변환한다.
 * - 같은 자음이 겹치면 촉음(っ)으로 확정하고 한 글자를 남긴다: kka → っか
 * - 'n' 뒤에 모음·y가 아닌 글자가 오면 'ん'으로 확정한다: kanpai → かんぱい
 */
export function pushRomaji(pending: string, ch: string): KanaStep {
  const buf = pending + ch.toLowerCase()

  // 촉음: 같은 자음 반복 (nn 은 ん 이므로 제외)
  if (buf.length >= 2 && buf[0] === buf[1] && buf[0] !== 'n' && !'aiueo'.includes(buf[0])) {
    return { emit: 'っ', pending: buf.slice(1) }
  }

  // 발음(撥音): n + 자음
  if (buf.length >= 2 && buf[0] === 'n' && buf[1] !== 'n' && buf[1] !== 'y' && !'aiueo'.includes(buf[1])) {
    const rest = pushRomaji('', buf.slice(1))
    return { emit: 'ん' + rest.emit, pending: rest.pending }
  }

  // 긴 것부터 맞춘다 (kyo 가 ki+yo 로 쪼개지지 않도록)
  for (let len = Math.min(MAX_ROMAJI, buf.length); len >= 1; len--) {
    const head = buf.slice(0, len)
    const kana = ROMAJI[head]
    if (kana) return { emit: kana, pending: buf.slice(len) }
  }

  // 아직 아무것도 안 되면 더 기다린다. 더 기다려도 소용없으면(사전에 접두가 없음) 버린다
  const canGrow = Object.keys(ROMAJI).some((k) => k.startsWith(buf))
  return canGrow ? { emit: '', pending: buf } : { emit: '', pending: ch.toLowerCase() }
}

/** 입력이 끝났을 때 남은 로마자를 가나로 확정한다 ('n' 하나는 'ん') */
export function flushRomaji(pending: string): string {
  if (!pending) return ''
  if (pending === 'n') return 'ん'
  const direct = ROMAJI[pending]
  if (direct) return direct
  return ''
}
