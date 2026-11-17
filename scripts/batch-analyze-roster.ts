/**
 * 명단(엑셀) + 본인 사진 배치 분석 — 행사·단체 손님용
 *
 * 명단 JSON 의 사진을 사이트와 같은 이미지 분석 파이프라인(prompt-builder → Gemini → response-parser)에
 * 본인 분석(targetType 'self') · 존댓말로 돌려 analysis_results 에 저장한다.
 * 저장한 결과는 관리자 /admin/analysis/bulk-print?ids=… 로 출력하거나 scripts/render-analysis-pdf.tsx 로 PDF 를 만든다.
 *
 * 실행: npx tsx scripts/batch-analyze-roster.ts <roster.json> <out-dir> [--locale zh] [--fingerprint batch_x] [--only 3,5] [--perfume "AC'SCENT 25"] [--redo] [--dry]
 *  - roster.json: [{ no, name, gender: 'Male'|'Female', jpg: '/abs/path.jpg', ... }]
 *  - 진행 상태는 <out-dir>/progress.json 에 남아 재실행 시 이어서 한다(다시 돌리려면 그 항목을 지운다)
 *  - 같은 단체 안에서 향이 겹치지 않게, 이미 배정된 향은 프롬프트에서 피하게 하고 어기면 한 번 더 묻는다
 *  - --perfume: 향을 미리 정해 두고 분석한다(중복 회피 대신 이 향 기준으로 설명). 한 사람만 다른 언어로 다시 만들 때 향을 그대로 두려고
 *  - --redo: --only 로 고른 사람이 이미 완료돼 있어도 새로 분석해 진행 파일의 결과 ID 를 바꾼다(이전 결과 행은 DB 에 그대로 남는다)
 *  - --dry: 저장·업로드 없이 분석 JSON 만 <out-dir>/dry/ 에 쓴다
 */

import fs from 'fs'
import path from 'path'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq < 0) return
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  })
}

loadEnv(path.join(__dirname, '..', '.env.local'))

import { buildGeminiPrompt, type FormDataInput } from '../src/lib/gemini/prompt-builder'
import { parseGeminiResponse } from '../src/lib/gemini/response-parser'
import { sanitizeSelfAnalysisTone } from '../src/lib/gemini/self-tone'
import { getModel, withTimeout } from '../src/lib/gemini/client'
import { createServiceRoleClient } from '../src/lib/supabase/service'
import { perfumes } from '../src/data/perfumes'
import type { ImageAnalysisResult } from '../src/types/analysis'
import type { Locale } from '../src/i18n/config'

interface RosterEntry {
  no: number
  name: string
  gender: 'Male' | 'Female'
  jpg: string
}

interface ProgressEntry {
  no: number
  name: string
  resultId: string
  perfumeId: string
  perfumeName: string
  imageUrl: string
}

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const [rosterPath, outDir] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const LOCALE = (flag('locale') || 'ko') as Locale
const FINGERPRINT = flag('fingerprint') || `batch_roster_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
const ONLY = flag('only')?.split(',').map(Number)
const DRY = args.includes('--dry')
const REDO = args.includes('--redo')
const ASSIGNED = flag('perfume')
const BUCKET_NAME = 'analysis-images'

if (!rosterPath || !outDir) {
  console.error('사용법: npx tsx scripts/batch-analyze-roster.ts <roster.json> <out-dir> [--locale zh] [--fingerprint x] [--only 1,2] [--dry]')
  process.exit(1)
}

// 공공 행사 키오스크(/api/kiosk/analyze POLITE_TONE_RULES)와 같은 존댓말 규칙 + 단체 손님 사진 단독 분석 안내
const ROSTER_RULES = `

[말투 — 단체 손님 결과지 · 위의 말투 지시보다 우선]
이 결과는 행사에 초대된 성인 손님에게 인쇄해 직접 드립니다.
- 위 형식 설명에 적힌 '반말', '주접 톤', '드립', '이모지 필수' 지시는 이번 요청에서 모두 무시하세요.
- 모든 문장은 정중한 존댓말로 씁니다. 한국어가 아닌 언어로 쓸 때도 그 언어의 정중한 말투를 씁니다(중국어는 「您」, 일본어는 です・ます체).
- 유행어·밈·과장된 감탄은 쓰지 않고, 차분하고 따뜻하게 설명합니다. 이모지와 특수 기호 장식은 쓰지 않습니다.
- 나이·체형·피부 결점 등 외모를 평가하거나 단정하는 표현은 쓰지 않습니다. 사진에서 보이는 분위기·스타일·색감 중심으로 씁니다.

[입력 — 사진 단독 분석]
이번 손님은 스타일·성격·매력 키워드를 직접 고르지 않았습니다. 사용자 선택 항목이 비어 있는 것은 정상입니다.
- 이미지 관찰을 100% 반영해 분석하세요. 선택 항목이 없다는 사실을 결과 문장에 언급하지 마세요.
- comparisonAnalysis 는 '사진에서 읽힌 인상 → 향으로 옮긴 방법' 중심으로 작성하세요.`

// 결과 언어가 아닌 글자 — 한국어가 아닌 결과에서 한글이, 영어 결과에서는 한글·한자·가나가 섞이면 다시 묻는다
const FOREIGN = LOCALE === 'en' ? /[가-힣\u3040-\u30ff\u4e00-\u9fff]/ : /[가-힣]/

function extractFirstJson(text: string): string {
  const start = text.indexOf('{')
  if (start < 0) return text
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return text
}

/** 결과지에 찍히는 AI 문장에 다른 언어 글자가 섞였는지 — 한국어가 아닌 결과에서만 검사 */
function findForeign(result: ImageAnalysisResult): string[] {
  const hits: string[] = []
  const walk = (value: unknown, at: string) => {
    if (typeof value === 'string') {
      if (FOREIGN.test(value)) hits.push(`${at}: ${value.slice(0, 40)}`)
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${at}[${i}]`))
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([k, v]) => walk(v, at ? `${at}.${k}` : k))
    }
  }
  walk(result, '')
  return hits
}

function buildDedupAddendum(usedCounts: Map<string, number>, hard: boolean): string {
  const counts = perfumes.map((p) => usedCounts.get(p.id) || 0)
  const minCount = Math.min(...counts)
  const avoid = perfumes.filter((p) => (usedCounts.get(p.id) || 0) > minCount).map((p) => p.id)
  const allowed = perfumes.filter((p) => (usedCounts.get(p.id) || 0) === minCount).map((p) => p.id)
  if (avoid.length === 0) return ''
  if (hard) {
    return `\n\n# 향수 중복 제한 (절대 규칙)\n이번 분석에서는 반드시 다음 ID 중에서만 향수를 선택해야 합니다:\n${allowed.join(', ')}\n위 목록 안에서 사진 속 인물과 가장 잘 어울리는 향수를 고르세요.`
  }
  return `\n\n# 향수 중복 회피 지시\n이 분석은 같은 단체 손님 여러 명을 연속으로 분석하는 시리즈의 일부입니다. 아래 향수들은 이미 다른 분께 배정되었으므로 가능한 한 피하세요:\n${avoid.join(', ')}\n우선 다음 향수들 중에서 가장 잘 맞는 것을 선택하세요:\n${allowed.join(', ')}\n(회피 목록의 향수만이 유일하게 적합한 극단적인 경우에만 예외를 허용합니다.)`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function analyzeOne(person: RosterEntry, imageBase64: string, usedCounts: Map<string, number>) {
  const formData: FormDataInput = {
    name: person.name,
    gender: person.gender,
    targetType: 'self',
    styles: [],
    customStyle: '',
    personalities: [],
    customPersonality: '',
    charmPoints: [],
    customCharm: '',
  }

  const model = getModel()
  let hard = false
  let lastError: unknown = null

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const prompt = buildGeminiPrompt(formData, LOCALE, ASSIGNED) + ROSTER_RULES + (ASSIGNED ? '' : buildDedupAddendum(usedCounts, hard))
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }] }],
        }),
        90000,
        'Gemini API request timed out'
      )
      const parsed = sanitizeSelfAnalysisTone(parseGeminiResponse(extractFirstJson(result.response.text()), LOCALE))

      if (LOCALE !== 'ko') {
        const hits = findForeign(parsed)
        if (hits.length) throw new Error(`다른 언어 글자 섞임 ${hits.length}곳 — ${hits[0]}`)
      }

      // 결과지에 찍히는 계절·시간 코멘트 — 빠지면 파서가 기본값(봄·오후)만 채우고 칸이 비므로 다시 묻는다
      if (!parsed.scentRecommendation?.season_reason || !parsed.scentRecommendation?.time_reason) {
        throw new Error('계절·시간 추천 코멘트 없음')
      }

      const perfumeId = parsed.matchingPerfumes[0].perfumeId
      if (ASSIGNED) {
        if (perfumeId !== ASSIGNED) throw new Error(`배정 향과 다름: ${perfumeId}`)
        return parsed
      }
      const minCount = Math.min(...perfumes.map((p) => usedCounts.get(p.id) || 0))
      if ((usedCounts.get(perfumeId) || 0) > minCount && !hard) {
        console.log(`    ↻ ${person.name}: ${perfumeId} 중복 → 하드 제약으로 재시도`)
        hard = true
        continue
      }
      return parsed
    } catch (error) {
      lastError = error
      console.warn(`    ⚠ ${person.name} 시도 ${attempt} 실패:`, error instanceof Error ? error.message : String(error))
      await sleep(3000)
    }
  }
  throw lastError
}

async function main() {
  const roster: RosterEntry[] = JSON.parse(fs.readFileSync(rosterPath, 'utf8'))
  fs.mkdirSync(outDir, { recursive: true })
  const progressFile = path.join(outDir, 'progress.json')
  const progress: Record<string, ProgressEntry> = fs.existsSync(progressFile) ? JSON.parse(fs.readFileSync(progressFile, 'utf8')) : {}
  const saveProgress = () => fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2))
  const supabase = DRY ? null : createServiceRoleClient()

  const usedCounts = new Map<string, number>()
  Object.values(progress).filter((e) => !(REDO && ONLY?.includes(e.no))).forEach((e) => usedCounts.set(e.perfumeId, (usedCounts.get(e.perfumeId) || 0) + 1))

  const targets = roster.filter((p) => !ONLY || ONLY.includes(p.no))
  console.log(`locale=${LOCALE} fingerprint=${FINGERPRINT}${ASSIGNED ? ` perfume=${ASSIGNED}` : ''}${REDO ? ' (redo)' : ''}${DRY ? ' (dry)' : ''} · 대상 ${targets.length}명 · 완료 ${Object.keys(progress).length}명\n`)
  const failures: string[] = []

  for (const person of targets) {
    const key = String(person.no)
    const tag = `[${person.no}/${roster.length}] ${person.name}`
    if (!DRY && !REDO && progress[key]) {
      console.log(`${tag} — 이미 완료 (${progress[key].perfumeId}), 건너뜀`)
      continue
    }
    if (!fs.existsSync(person.jpg)) {
      console.error(`${tag} — 사진 없음: ${person.jpg}`)
      failures.push(person.name)
      continue
    }

    console.log(`${tag} (${person.gender === 'Male' ? '남' : '여'}) 분석 중...`)
    try {
      const buffer = fs.readFileSync(person.jpg)
      const analysis = await analyzeOne(person, buffer.toString('base64'), usedCounts)
      const perfume = analysis.matchingPerfumes[0]
      console.log(`    ✓ 향: ${perfume.perfumeId} ${perfume.persona?.name} (score ${perfume.score})`)

      if (DRY || !supabase) {
        fs.mkdirSync(path.join(outDir, 'dry'), { recursive: true })
        fs.writeFileSync(path.join(outDir, 'dry', `${String(person.no).padStart(2, '0')}.json`), JSON.stringify(analysis, null, 2))
        usedCounts.set(perfume.perfumeId, (usedCounts.get(perfume.perfumeId) || 0) + 1)
        continue
      }

      const uploadPath = `${FINGERPRINT}/${String(person.no).padStart(2, '0')}_${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uploadPath, buffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
      if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`)
      const imageUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path).data.publicUrl

      // /api/results POST 와 같은 필드 구성
      const { data: row, error: insertError } = await supabase
        .from('analysis_results')
        .insert({
          user_image_url: imageUrl,
          analysis_data: analysis,
          twitter_name: person.name,
          perfume_name: perfume.persona?.name || perfume.perfumeId,
          perfume_brand: "AC'SCENT",
          matching_keywords: analysis.matchingKeywords || [],
          user_id: null,
          user_fingerprint: FINGERPRINT,
          idol_name: person.name,
          idol_gender: person.gender,
          product_type: 'image_analysis',
          service_mode: 'offline',
          pin: null,
          qr_code_id: null,
          locale: LOCALE,
          target_type: 'self',
        })
        .select('id')
        .single()
      if (insertError) throw new Error(`DB 저장 실패: ${insertError.message}`)

      usedCounts.set(perfume.perfumeId, (usedCounts.get(perfume.perfumeId) || 0) + 1)
      progress[key] = {
        no: person.no,
        name: person.name,
        resultId: row.id,
        perfumeId: perfume.perfumeId,
        perfumeName: perfume.persona?.name || '',
        imageUrl,
      }
      saveProgress()
      console.log(`    ✓ 저장: ${row.id}`)
    } catch (error) {
      console.error(`    ✗ ${person.name} 최종 실패:`, error instanceof Error ? error.message : error)
      failures.push(person.name)
    }
    await sleep(1500)
  }

  console.log('\n===== 배치 완료 =====')
  console.log(`저장 ${Object.keys(progress).length}/${roster.length}`)
  if (failures.length) console.log(`실패: ${failures.join(', ')}`)
  const ids = roster.map((p) => progress[String(p.no)]?.resultId).filter(Boolean)
  if (ids.length) console.log(`\n출력: /admin/analysis/bulk-print?ids=${ids.join(',')}`)
}

main().catch((error) => {
  console.error('배치 실행 오류:', error)
  process.exit(1)
})
