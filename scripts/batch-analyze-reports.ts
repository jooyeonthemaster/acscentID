/**
 * 분석보고서용 사진 배치 분석 스크립트
 *
 * /분석보고서용 폴더의 사진들을 이미지 분석 파이프라인(Gemini)에 돌려
 * analysis_results 테이블에 저장한다. 관리자 페이지에서 검수/출력용.
 *
 * 실행: npx tsx scripts/batch-analyze-reports.ts
 * - 진행 상태는 scripts/.batch-analyze-progress.json 에 기록되어 재실행 시 이어서 진행
 * - 향수 중복 최소화: 이미 배정된 향수는 프롬프트에서 회피 지시 + 위반 시 1회 재시도
 */

import fs from 'fs'
import path from 'path'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  raw.split(/\r?\n/).forEach((line) => {
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
import { getModel, withTimeout } from '../src/lib/gemini/client'
import { createServiceRoleClient } from '../src/lib/supabase/service'
import { perfumes } from '../src/data/perfumes'

const PHOTO_DIR = '/Users/idongju/Desktop/acscent/분석보고서용'
const PROGRESS_FILE = path.join(__dirname, '.batch-analyze-progress.json')
const BUCKET_NAME = 'analysis-images'
const FINGERPRINT = 'batch_report_20260722'

interface Person {
  file: string
  name: string
  gender: 'Male' | 'Female'
  styles: string[]
  personalities: string[]
  charmPoints: string[]
  /** 분석에 사용할 이미지 경로 오버라이드 (안전 필터 오탐 시 재인코딩본 사용) */
  srcPath?: string
}

/** 응답 앞뒤 잉여 텍스트가 붙는 경우 첫 번째 완결 JSON 객체만 추출 */
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

const PEOPLE: Person[] = [
  { file: '건호:남성.jpg', name: '건호', gender: 'Male', styles: ['섹시한', '시크한', '캐주얼'], personalities: ['자신감 있는', '열정적인'], charmPoints: ['눈빛', '분위기'] },
  { file: '곤:남성.jpg', name: '곤', gender: 'Male', styles: ['귀여운', '활발한', '캐주얼'], personalities: ['밝은', '열정적인', '다정한'], charmPoints: ['눈빛', '미소', '제스처'] },
  { file: '긴토키:남성.jpg', name: '긴토키', gender: 'Male', styles: ['시크한', '캐주얼', '레트로'], personalities: ['유머러스한', '차분한', '자신감 있는'], charmPoints: ['분위기', '말투', '눈빛'] },
  { file: '김태형:남성.jpg', name: '김태형', gender: 'Male', styles: ['섹시한', '우아한', '시크한'], personalities: ['차분한', '자신감 있는', '사려 깊은'], charmPoints: ['눈빛', '분위기', '목소리'] },
  { file: '레제:여성.jpg', name: '레제', gender: 'Female', styles: ['섹시한', '시크한', '레트로'], personalities: ['자신감 있는', '열정적인', '수줍은'], charmPoints: ['눈빛', '미소', '손'] },
  { file: '리바이:남성.jpg', name: '리바이', gender: 'Male', styles: ['시크한', '섹시한'], personalities: ['차분한', '자신감 있는', '사려 깊은'], charmPoints: ['눈빛', '분위기', '말투'] },
  { file: '리쿠:남성.jpg', name: '리쿠', gender: 'Male', styles: ['청량한', '귀여운', '시크한'], personalities: ['차분한', '수줍은', '다정한'], charmPoints: ['눈빛', '미소', '분위기'] },
  { file: '명재현:남성.jpg', name: '명재현', gender: 'Male', styles: ['귀여운', '레트로', '캐주얼'], personalities: ['유머러스한', '밝은', '수줍은'], charmPoints: ['제스처', '미소', '말투'] },
  { file: '무이치로:남성.jpg', name: '무이치로', gender: 'Male', styles: ['청량한', '우아한', '시크한'], personalities: ['차분한', '사려 깊은', '열정적인'], charmPoints: ['눈빛', '분위기', '손'] },
  { file: '미나미:여성.jpg', name: '미나미', gender: 'Female', styles: ['귀여운', '활발한', '레트로'], personalities: ['밝은', '수줍은', '다정한'], charmPoints: ['눈빛', '제스처', '미소'], srcPath: '/private/tmp/claude-501/-Users-idongju-Desktop-acscent/587ea93e-2791-4626-a380-bee00ac636b7/scratchpad/minami_face.jpg' },
  { file: '바쿠고:남성.jpg', name: '바쿠고', gender: 'Male', styles: ['활발한', '캐주얼', '시크한'], personalities: ['자신감 있는', '열정적인', '유머러스한'], charmPoints: ['눈빛', '목소리', '제스처'] },
  { file: '박지훈:남성.jpg', name: '박지훈', gender: 'Male', styles: ['우아한', '귀여운', '레트로'], personalities: ['다정한', '차분한', '사려 깊은'], charmPoints: ['미소', '눈웃음', '분위기'] },
  { file: '백지헌:여성.jpg', name: '백지헌', gender: 'Female', styles: ['섹시한', '시크한', '우아한'], personalities: ['자신감 있는', '차분한', '열정적인'], charmPoints: ['눈빛', '손', '분위기'] },
  { file: '비아이:남성.jpg', name: '비아이', gender: 'Male', styles: ['시크한', '섹시한', '레트로'], personalities: ['차분한', '사려 깊은', '열정적인'], charmPoints: ['분위기', '손', '눈빛'] },
  { file: '사스케:남성.jpg', name: '사스케', gender: 'Male', styles: ['시크한', '청량한', '캐주얼'], personalities: ['차분한', '자신감 있는', '열정적인'], charmPoints: ['눈빛', '분위기', '제스처'] },
  { file: '사토루:남성.jpg', name: '사토루', gender: 'Male', styles: ['시크한', '청량한', '섹시한'], personalities: ['유머러스한', '자신감 있는', '다정한'], charmPoints: ['눈빛', '말투', '목소리'] },
  { file: '쇼타:남성.jpg', name: '쇼타', gender: 'Male', styles: ['캐주얼', '시크한'], personalities: ['차분한', '사려 깊은', '다정한'], charmPoints: ['목소리', '분위기', '말투'] },
  { file: '수빈:남성.jpg', name: '수빈', gender: 'Male', styles: ['귀여운', '청량한', '캐주얼'], personalities: ['수줍은', '다정한', '유머러스한'], charmPoints: ['미소', '손', '말투'] },
  { file: '시노부:여성.jpg', name: '시노부', gender: 'Female', styles: ['우아한', '시크한'], personalities: ['차분한', '다정한', '사려 깊은'], charmPoints: ['미소', '말투', '분위기'] },
  { file: '신이치:남성.jpg', name: '신이치', gender: 'Male', styles: ['시크한', '캐주얼'], personalities: ['자신감 있는', '사려 깊은', '열정적인'], charmPoints: ['눈빛', '말투'] },
  { file: '양정원:남성.jpg', name: '양정원', gender: 'Male', styles: ['시크한', '귀여운'], personalities: ['차분한', '사려 깊은'], charmPoints: ['눈빛', '분위기', '눈웃음'] },
  { file: '영재:남성.jpg', name: '영재', gender: 'Male', styles: ['청량한', '캐주얼', '귀여운'], personalities: ['밝은', '다정한', '유머러스한'], charmPoints: ['미소', '손', '눈웃음'] },
  { file: '원희:여성.jpg', name: '원희', gender: 'Female', styles: ['귀여운', '청량한', '레트로'], personalities: ['수줍은', '차분한'], charmPoints: ['눈빛', '목소리'] },
  { file: '이안:여성.jpg', name: '이안', gender: 'Female', styles: ['활발한', '캐주얼'], personalities: ['밝은', '유머러스한', '자신감 있는'], charmPoints: ['눈웃음', '제스처', '미소'] },
  { file: '청명:남성.jpg', name: '청명', gender: 'Male', styles: ['레트로', '시크한'], personalities: ['자신감 있는', '유머러스한', '열정적인'], charmPoints: ['말투', '미소'] },
  { file: '최산:남성.jpg', name: '최산', gender: 'Male', styles: ['섹시한', '시크한'], personalities: ['열정적인', '자신감 있는', '다정한'], charmPoints: ['눈빛', '분위기', '제스처'] },
  { file: '카게야마:남성.jpg', name: '카게야마', gender: 'Male', styles: ['청량한', '시크한'], personalities: ['열정적인', '수줍은'], charmPoints: ['눈빛', '손'] },
  { file: '카리나:여성.jpg', name: '카리나', gender: 'Female', styles: ['귀여운', '우아한', '섹시한'], personalities: ['밝은', '자신감 있는', '다정한'], charmPoints: ['눈빛', '미소', '손'] },
  { file: '키르아:남성.jpg', name: '키르아', gender: 'Male', styles: ['청량한', '캐주얼', '귀여운'], personalities: ['차분한', '자신감 있는', '유머러스한'], charmPoints: ['눈빛', '말투'] },
  { file: '태산:남성.jpg', name: '태산', gender: 'Male', styles: ['레트로', '시크한'], personalities: ['차분한', '사려 깊은', '수줍은'], charmPoints: ['분위기', '눈빛'] },
  { file: '텐겐:남성.jpg', name: '텐겐', gender: 'Male', styles: ['섹시한', '활발한'], personalities: ['자신감 있는', '열정적인', '유머러스한'], charmPoints: ['제스처', '목소리', '분위기'] },
  { file: '토모에:남성.jpg', name: '토모에', gender: 'Male', styles: ['시크한', '우아한'], personalities: ['차분한', '사려 깊은', '다정한'], charmPoints: ['손', '눈빛'] },
  { file: '프리렌:여성.jpg', name: '프리렌', gender: 'Female', styles: ['귀여운', '청량한'], personalities: ['차분한', '사려 깊은'], charmPoints: ['분위기', '말투'] },
  { file: '한지:여성.jpg', name: '한지', gender: 'Female', styles: ['캐주얼', '활발한'], personalities: ['열정적인', '유머러스한', '밝은'], charmPoints: ['미소', '목소리', '제스처'] },
  { file: '히소카:남성.jpg', name: '히소카', gender: 'Male', styles: ['섹시한', '시크한', '레트로'], personalities: ['자신감 있는', '유머러스한'], charmPoints: ['미소', '말투', '손'] },
]

interface ProgressEntry {
  name: string
  resultId: string
  perfumeId: string
  imageUrl: string
}

function loadProgress(): Record<string, ProgressEntry> {
  if (!fs.existsSync(PROGRESS_FILE)) return {}
  return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
}

function saveProgress(progress: Record<string, ProgressEntry>) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function buildDedupAddendum(usedCounts: Map<string, number>, hard: boolean): string {
  const counts = perfumes.map((p) => usedCounts.get(p.id) || 0)
  const minCount = Math.min(...counts)
  const avoid = perfumes.filter((p) => (usedCounts.get(p.id) || 0) > minCount).map((p) => p.id)
  const allowed = perfumes.filter((p) => (usedCounts.get(p.id) || 0) === minCount).map((p) => p.id)

  if (avoid.length === 0) return ''

  if (hard) {
    return `\n\n# 🚫 향수 중복 제한 (절대 규칙!)\n이번 분석에서는 반드시 다음 ID 중에서만 향수를 선택해야 합니다:\n${allowed.join(', ')}\n위 목록에 없는 향수 ID를 반환하면 안 됩니다. 목록 안에서 캐릭터와 가장 잘 어울리는 향수를 고르세요.`
  }

  return `\n\n# ⚠️ 향수 중복 회피 지시 (중요!)\n이 분석은 여러 명을 연속으로 분석하는 시리즈의 일부입니다. 아래 향수들은 이미 다른 사람에게 배정되었으므로 가능한 한 피하세요:\n${avoid.join(', ')}\n우선적으로 다음 향수들 중에서 캐릭터와 가장 잘 맞는 것을 선택하세요:\n${allowed.join(', ')}\n(정말로 위 회피 목록의 향수만이 유일하게 적합한 극단적인 경우에만 예외를 허용합니다.)`
}

async function analyzeOne(person: Person, imageBase64: string, usedCounts: Map<string, number>) {
  const formData: FormDataInput = {
    name: person.name,
    gender: person.gender,
    targetType: 'idol',
    styles: person.styles,
    customStyle: '',
    personalities: person.personalities,
    customPersonality: '',
    charmPoints: person.charmPoints,
    customCharm: '',
  }

  const model = getModel()
  let hard = false
  let lastError: unknown = null

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const prompt = buildGeminiPrompt(formData, 'ko') + buildDedupAddendum(usedCounts, hard)
      const result = await withTimeout(
        model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
              ],
            },
          ],
        }),
        90000,
        'Gemini API request timed out'
      )
      const parsed = parseGeminiResponse(extractFirstJson(result.response.text()), 'ko')
      const perfumeId = parsed.matchingPerfumes[0].perfumeId

      // 이미 더 많이 쓰인 향수를 골랐으면 1회 하드 제약으로 재시도
      const counts = perfumes.map((p) => usedCounts.get(p.id) || 0)
      const minCount = Math.min(...counts)
      const isDuplicate = (usedCounts.get(perfumeId) || 0) > minCount
      if (isDuplicate && !hard) {
        console.log(`    ↻ ${person.name}: ${perfumeId} 중복 → 하드 제약으로 재시도`)
        hard = true
        continue
      }
      return parsed
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`    ⚠ ${person.name} 시도 ${attempt} 실패:`, message)
      // OpenRouter의 Google 라우팅은 기본이 최완화 안전 설정이라 별도 완화 모델 전환이 필요 없다
      await sleep(3000)
    }
  }
  throw lastError
}

async function main() {
  const supabase = createServiceRoleClient()
  const progress = loadProgress()

  // 재실행 시 기존 배정 향수 카운트 복원
  const usedCounts = new Map<string, number>()
  Object.values(progress).forEach((entry) => {
    usedCounts.set(entry.perfumeId, (usedCounts.get(entry.perfumeId) || 0) + 1)
  })

  console.log(`총 ${PEOPLE.length}명 / 완료 ${Object.keys(progress).length}명부터 이어서 시작\n`)

  const failures: string[] = []

  for (let i = 0; i < PEOPLE.length; i++) {
    const person = PEOPLE[i]
    if (progress[person.file]) {
      console.log(`[${i + 1}/${PEOPLE.length}] ${person.name} — 이미 완료 (${progress[person.file].perfumeId}), 스킵`)
      continue
    }

    const filePath = person.srcPath || path.join(PHOTO_DIR, person.file)
    if (!fs.existsSync(filePath)) {
      console.error(`[${i + 1}/${PEOPLE.length}] ${person.name} — 파일 없음: ${filePath}`)
      failures.push(person.name)
      continue
    }

    console.log(`[${i + 1}/${PEOPLE.length}] ${person.name} (${person.gender === 'Male' ? '남성' : '여성'}) 분석 중...`)

    try {
      // 분석에는 srcPath(오버라이드)를 쓰고, 업로드는 항상 원본 사진을 사용
      const imageBase64 = fs.readFileSync(filePath).toString('base64')
      const buffer = fs.readFileSync(path.join(PHOTO_DIR, person.file))

      const analysis = await analyzeOne(person, imageBase64, usedCounts)
      const perfume = analysis.matchingPerfumes[0]
      console.log(`    ✓ 향수: ${perfume.perfumeId} (score ${perfume.score})`)

      // 이미지 업로드
      const uploadPath = `${FINGERPRINT}/${String(i + 1).padStart(2, '0')}_${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uploadPath, buffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })

      let imageUrl: string | null = null
      if (uploadError) {
        console.warn(`    ⚠ 이미지 업로드 실패 (이미지 없이 저장): ${uploadError.message}`)
      } else {
        imageUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path).data.publicUrl
      }

      // 결과 저장 (/api/results POST 와 동일한 필드 구성)
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
          locale: 'ko',
          target_type: 'idol',
        })
        .select('id')
        .single()

      if (insertError) throw new Error(`DB insert 실패: ${insertError.message}`)

      usedCounts.set(perfume.perfumeId, (usedCounts.get(perfume.perfumeId) || 0) + 1)
      progress[person.file] = {
        name: person.name,
        resultId: row.id,
        perfumeId: perfume.perfumeId,
        imageUrl: imageUrl || '',
      }
      saveProgress(progress)
      console.log(`    ✓ 저장 완료: ${row.id}`)
    } catch (error) {
      console.error(`    ✗ ${person.name} 최종 실패:`, error instanceof Error ? error.message : error)
      failures.push(person.name)
    }

    await sleep(2000)
  }

  console.log('\n===== 배치 완료 =====')
  console.log(`성공: ${Object.keys(progress).length}/${PEOPLE.length}`)
  if (failures.length) console.log(`실패: ${failures.join(', ')}`)

  // 향수 배정 요약
  console.log('\n향수 배정 결과:')
  Object.values(progress)
    .sort((a, b) => a.perfumeId.localeCompare(b.perfumeId))
    .forEach((e) => console.log(`  ${e.perfumeId} → ${e.name}`))
}

main().catch((error) => {
  console.error('배치 실행 오류:', error)
  process.exit(1)
})
