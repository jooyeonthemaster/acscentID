// 키오스크 터치 키보드의 한글 조합 엔진 회귀 테스트
//   node scripts/verify-hangul-ime.mjs
// src/lib/kiosk/hangul.ts는 브라우저 IME 없이 두벌식 조합을 직접 구현한 코드라
// 조합 규칙이 깨지면 키오스크에서 이름이 엉뚱한 글자로 입력된다. 수정 시 반드시 이 스크립트를 돌릴 것.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src/lib/kiosk/hangul.ts')
const ESBUILD = path.join(ROOT, 'node_modules/.bin/esbuild')

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hangul-')), 'hangul.mjs')
execFileSync(ESBUILD, [SRC, '--format=esm', `--outfile=${out}`], { stdio: 'pipe' })
const H = await import(pathToFileUrl(out))

function pathToFileUrl(p) {
  return new URL(`file://${p}`).href
}

let pass = 0
let fail = 0

/** '<' = 백스페이스, ' ' = 공백, 그 외 자모는 순서대로 입력 */
function type(seq, maxLength = Infinity) {
  let s = H.EMPTY_HANGUL
  for (const ch of seq) {
    if (ch === '<') s = H.backspace(s)
    else if (/[ㄱ-ㅎㅏ-ㅣ]/.test(ch)) s = H.pushJamo(s, ch, maxLength)
    else s = H.pushChar(s, ch, maxLength)
  }
  return H.hangulValue(s)
}

function t(seq, expect, note = '') {
  const got = type(seq)
  if (got === expect) pass++
  else {
    fail++
    console.log(`FAIL ${note || seq}: got "${got}" expect "${expect}"`)
  }
}

function tl(seq, max, expect, note = '') {
  const got = type(seq, max)
  if (got === expect) pass++
  else {
    fail++
    console.log(`FAIL [max=${max}] ${note || seq}: got "${got}" expect "${expect}"`)
  }
}

// ── 기본 음절 조합 ────────────────────────────────────
t('ㄱ', 'ㄱ')
t('ㄱㅏ', '가')
t('ㄱㅏㅁ', '감')
t('ㅎㅏㄴㄱㅡㄹ', '한글')
t('ㅇㅏㄴㄴㅕㅇ', '안녕')

// ── 종성이 다음 음절 초성으로 이동 ─────────────────────
t('ㄱㅏㅁㅏ', '가마')
t('ㅁㅜㄱㅓ', '무거')
t('ㅇㅓㄴㅈㅣ', '언지')

// ── 겹받침 ───────────────────────────────────────────
t('ㅇㅓㅄ', '없')
t('ㅇㅓㅄㅓ', '업서')
t('ㄷㅏㄹㄱ', '닭')
t('ㄷㅏㄹㄱㅡ', '달그')
t('ㅇㅓㄴㅈ', '얹')

// ── 복모음 ───────────────────────────────────────────
t('ㄱㅗㅏ', '과')
t('ㄷㅗㅣ', '되')
t('ㅁㅜㅣ', '뮈')
t('ㅎㅡㅣ', '희')
t('ㄱㅗㅏㄴ', '관')
t('ㄱㅏㅏ', '가ㅏ', '복모음이 아닌 조합은 분리')

// ── 쌍자음은 시프트 입력이므로 연타는 분리 ──────────────
t('ㄱㄱ', 'ㄱㄱ')
t('ㄱㅏㄱㄱ', '각ㄱ')

// ── 백스페이스 (조합 한 단계씩) ────────────────────────
t('ㄱㅏㅁ<', '가')
t('ㄱㅏ<', 'ㄱ')
t('ㄱ<', '')
t('ㄷㅏㄹㄱ<', '달')
t('ㄱㅗㅏ<', '고')
t('ㅎㅏㄴㄱㅡㄹ<', '한그')
t('ㅎㅏㄴㄱㅡㄹ<<', '한ㄱ')
t('ㅎㅏㄴㄱㅡㄹ<<<', '한')
t('ㄱㅏ ㄴㅏ<', '가 ㄴ')

// ── 영문/공백 혼용 ───────────────────────────────────
t('ㄱㅏ abc', '가 abc')
t('ㄱㅏabc', '가abc')

// ── 종성 불가 자음, 모음 단독 ─────────────────────────
t('ㄱㅏㄸ', '가ㄸ')
t('ㅏ', 'ㅏ')
t('ㅏㄱ', 'ㅏㄱ')

// ── 길이 한도 ────────────────────────────────────────
// 글자 수가 늘지 않는 입력(받침/겹받침/복모음)은 한도에서도 허용
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅏㅁ', 5, '가나다라맘', '받침 붙이기')
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅗㅏ', 5, '가나다라뫄', '복모음')
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅏㄱ', 5, '가나다라막', '단일 받침')
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅏㄱㅅ', 5, '가나다라맋', '겹받침')
// 거부된 키는 조합을 끊어야 한다 (안 끊으면 뒤따르는 자음이 완성된 글자를 소급 변형)
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅏㅗㅇ', 5, '가나다라마', '거부된 ㅗ 뒤의 ㅇ')
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅏㅑㅁ', 5, '가나다라마', '거부된 ㅑ 뒤의 ㅁ')
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㄱㅗㅓㄴ', 5, '가나다라고', '거부된 ㅓ 뒤의 ㄴ')
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅏㅗㅗㅗㅗㅇ', 5, '가나다라마', '거부 여러 번 뒤의 자음')
tl('ㄱㅏㄴㅏㄷㅏㄹㅏㅁㅏㄸㅇ', 5, '가나다라마', '종성 불가 자음 거부 뒤의 ㅇ')

// ── 불변식(무작위 2만 시퀀스) ─────────────────────────
// ① 값이 한도를 넘지 않는다
// ② 한 번 거부된(값이 안 변한) 키가 나오면 그 뒤로 기존 글자가 절대 변하지 않는다
const JAMO = [...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣㅐㅔ']
let seed = 12345
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
let violations = 0
for (let i = 0; i < 20000; i++) {
  const len = 2 + Math.floor(rnd() * 10)
  let seq = ''
  for (let j = 0; j < len; j++) seq += JAMO[Math.floor(rnd() * JAMO.length)]
  const max = 1 + Math.floor(rnd() * 6)
  let st = H.EMPTY_HANGUL
  let sealed = null
  for (const ch of seq) {
    const before = H.hangulValue(st)
    st = H.pushJamo(st, ch, max)
    const after = H.hangulValue(st)
    if (after.length > max) {
      if (violations < 3) console.log(`FAIL 한도초과 [max=${max}] "${seq}": "${after}"`)
      violations++
      break
    }
    if (sealed === null && after === before) sealed = after
    else if (sealed !== null && after !== sealed) {
      if (violations < 3) console.log(`FAIL 봉인위반 [max=${max}] "${seq}": 봉인="${sealed}" 이후="${after}"`)
      violations++
      break
    }
  }
}
if (violations === 0) pass++
else {
  fail++
  console.log(`FAIL 불변식: ${violations}/20000 위반`)
}

console.log(`\n한글 조합 엔진: pass ${pass} / fail ${fail}`)
process.exit(fail ? 1 : 0)
