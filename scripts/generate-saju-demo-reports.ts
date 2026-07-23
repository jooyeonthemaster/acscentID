/**
 * 상세페이지 캡처용 가상 사주 분석 보고서 생성기
 *
 * 생성 결과:
 * - 사주 분석 퍼퓸: 나 1건 + 최애 1건
 *
 * 실행:
 *   npx --yes tsx scripts/generate-saju-demo-reports.ts
 *
 * 검증:
 *   npx --yes tsx scripts/generate-saju-demo-reports.ts --verify
 *
 * 이 스크립트가 만든 데이터만 삭제:
 *   npx --yes tsx scripts/generate-saju-demo-reports.ts --cleanup
 */

import fs from 'fs'
import path from 'path'
import {
  HarmBlockThreshold,
  HarmCategory,
  type SafetySetting,
} from '@google/generative-ai'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator < 0) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

const ROOT = path.resolve(__dirname, '..')
loadEnv(path.join(ROOT, '.env.local'))

import { getModelWithConfig, withTimeout } from '../src/lib/gemini/client'
import { wrapPromptWithLocale } from '../src/lib/gemini/locale-prompt-wrapper'
import {
  buildSajuPrompt,
  buildSajuRetryPrompt,
  parseApiBirthInput,
  toEngineBirthInput,
  toSajuChartSnapshot,
} from '../src/lib/gemini/saju-prompt-builder'
import { parseSajuGeminiResponse } from '../src/lib/gemini/saju-response-parser'
import { computeSajuChart, getScentCandidates } from '../src/lib/saju'
import { createServiceRoleClient } from '../src/lib/supabase/service'
import type {
  SajuAnalysisResult,
  SajuBirthInput,
  SajuPurpose,
} from '../src/types/analysis'

const ASSET_DIR = path.join(
  ROOT,
  '상품사진',
  '07_분석보고서_샘플',
  '04_사주보고서',
)
const OUTPUT_DIR = path.join(ASSET_DIR, '01_결과목록')
const SCREENSHOT_DIR = path.join(ASSET_DIR, '02_관리자캡처')
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'report-manifest.json')
const VERIFICATION_PATH = path.join(OUTPUT_DIR, 'verification.json')
const SUMMARY_PATH = path.join(OUTPUT_DIR, 'README.md')
const FINGERPRINT = 'detail_page_saju_demo_20260723_v1'
const SERVICE_MODE = 'online'
const GEMINI_TIMEOUT_MS = 120000
const MAX_RETRIES = 1

const SAJU_SAFETY_SETTINGS: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
]

type TargetType = 'self' | 'idol'

interface SajuScenario {
  key: string
  label: string
  name: string
  roleLabel: string
  targetType: TargetType
  promptGender: '남성' | '여성'
  databaseGender: 'Male' | 'Female'
  purpose: SajuPurpose
  birth: SajuBirthInput
  wish: string
}

interface ManifestReport {
  key: string
  label: string
  name: string
  roleLabel: string
  targetType: TargetType
  purpose: SajuPurpose
  birth: SajuBirthInput
  wish: string
  resultId: string
  perfumeId: string
  perfumeName: string
  dayMaster: string
  yongsin: string
  adminDetailPath: string
  adminPrintPath: string
}

interface ReportManifest {
  generatedAt: string
  fingerprint: string
  notice: string
  reports: ManifestReport[]
}

const SCENARIOS: SajuScenario[] = [
  {
    key: 'saju-self-01',
    label: '사주 분석 퍼퓸 · 나',
    name: '윤서아',
    roleLabel: '가상 일반인 · 도예 디자이너',
    targetType: 'self',
    promptGender: '여성',
    databaseGender: 'Female',
    purpose: 'career',
    birth: {
      year: 1996,
      month: 4,
      day: 18,
      hour: 7,
      minute: 40,
      calendar: 'solar',
    },
    wish: '내가 잘하는 일을 오래 이어갈 수 있는 방향과 지금 정리해야 할 흐름을 알고 싶어요.',
  },
  {
    key: 'saju-idol-01',
    label: '사주 분석 퍼퓸 · 최애',
    name: '서이준',
    roleLabel: '가상 연예인 · 배우 겸 작곡가',
    targetType: 'idol',
    promptGender: '남성',
    databaseGender: 'Male',
    purpose: 'general',
    birth: {
      year: 1998,
      month: 11,
      day: 27,
      hour: 21,
      minute: 15,
      calendar: 'solar',
    },
    wish: '무대와 작품을 오가며 오래 사랑받는 이 사람의 숨은 결을 향으로 보고 싶어요.',
  },
]

const PURPOSE_LABELS: Record<SajuPurpose, string> = {
  general: '종합운',
  love: '연애운',
  wealth: '재물운',
  career: '직업운',
  compatibility: '궁합',
}

const YONGSIN_REASON_LABELS = {
  lacking: '결핍 보완',
  season_cold: '조후 · 한기 보완',
  season_hot: '조후 · 열기 조절',
} as const

async function analyzeScenario(scenario: SajuScenario): Promise<SajuAnalysisResult> {
  const birth = parseApiBirthInput(scenario.birth, scenario.name)
  const chart = computeSajuChart(toEngineBirthInput(birth, scenario.promptGender))
  const candidates = getScentCandidates(
    chart.yongsin.element,
    chart.lackingElements,
  )

  const basePrompt = buildSajuPrompt({
    name: scenario.name,
    gender: scenario.promptGender,
    targetType: scenario.targetType,
    purpose: scenario.purpose,
    wish: scenario.wish,
    chart,
    candidates,
    analysisYear: 2026,
  })
  const wrappedPrompt = wrapPromptWithLocale(basePrompt, 'ko')
  const model = getModelWithConfig({
    maxOutputTokens: 16384,
    temperature: 0.85,
    safetySettings: SAJU_SAFETY_SETTINGS,
  })

  let parsed: ReturnType<typeof parseSajuGeminiResponse> | null = null
  let lastError = ''

  for (let attemptIndex = 0; attemptIndex <= MAX_RETRIES && !parsed; attemptIndex += 1) {
    const prompt =
      attemptIndex === 0
        ? wrappedPrompt
        : buildSajuRetryPrompt(wrappedPrompt, lastError)

    if (attemptIndex > 0) {
      console.warn(`    교정 재시도: ${lastError}`)
    }

    try {
      const startedAt = Date.now()
      const generated = await withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
        GEMINI_TIMEOUT_MS,
        `${scenario.label} Gemini 응답 시간 초과`,
      )
      const responseText = generated.response.text()
      console.log(
        `    Gemini 응답: ${responseText.length}자 / ${Date.now() - startedAt}ms`,
      )
      parsed = parseSajuGeminiResponse(responseText, {
        locale: 'ko',
        purpose: scenario.purpose,
        isThreePillar: chart.isThreePillar,
        requireCompatibility: false,
      })
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.error(`    생성 시도 ${attemptIndex + 1} 실패: ${lastError}`)
    }
  }

  if (!parsed) {
    throw new Error(`${scenario.label} 생성 실패: ${lastError}`)
  }

  return {
    ...parsed.core,
    sajuChart: toSajuChartSnapshot(chart),
    sajuAnalysis: parsed.sajuAnalysis,
    sajuPurpose: scenario.purpose,
  }
}

async function insertReport(
  scenario: SajuScenario,
  analysis: SajuAnalysisResult,
): Promise<string> {
  const perfume = analysis.matchingPerfumes[0]
  if (!perfume) throw new Error(`${scenario.name} 추천 향수가 없습니다.`)

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('analysis_results')
    .insert({
      user_image_url: null,
      analysis_data: analysis,
      twitter_name: scenario.name,
      perfume_name: perfume.persona?.name || perfume.perfumeId,
      perfume_brand: "AC'SCENT",
      matching_keywords: analysis.matchingKeywords || [],
      user_id: null,
      user_fingerprint: FINGERPRINT,
      idol_name: scenario.name,
      idol_gender: scenario.databaseGender,
      product_type: 'saju_perfume',
      service_mode: SERVICE_MODE,
      pin: null,
      qr_code_id: null,
      locale: 'ko',
      target_type: scenario.targetType,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`${scenario.label} 저장 실패: ${error.message}`)
  }
  return data.id as string
}

async function ensureNoExistingData() {
  const supabase = createServiceRoleClient()
  const { count, error } = await supabase
    .from('analysis_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_fingerprint', FINGERPRINT)

  if (error) throw new Error(`기존 데이터 확인 실패: ${error.message}`)
  if ((count || 0) > 0) {
    throw new Error(
      `동일한 사주 샘플이 ${count}건 있습니다. 중복 생성을 피하려면 먼저 --cleanup을 실행하세요.`,
    )
  }
}

async function cleanup() {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('analysis_results')
    .delete()
    .eq('user_fingerprint', FINGERPRINT)

  if (error) throw new Error(`사주 샘플 삭제 실패: ${error.message}`)
  if (fs.existsSync(ASSET_DIR)) {
    fs.rmSync(ASSET_DIR, { recursive: true, force: true })
  }
  console.log(`삭제 완료: ${FINGERPRINT}`)
}

async function verify() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`결과 목록이 없습니다: ${MANIFEST_PATH}`)
  }

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, 'utf8'),
  ) as ReportManifest
  const supabase = createServiceRoleClient()
  const { data: rows, error } = await supabase
    .from('analysis_results')
    .select(
      'id, product_type, target_type, twitter_name, idol_gender, user_image_url, analysis_data',
    )
    .eq('user_fingerprint', FINGERPRINT)

  if (error) throw new Error(`사주 결과 검증 조회 실패: ${error.message}`)

  const errors: string[] = []
  const rowById = new Map((rows || []).map((row) => [row.id, row]))
  const targetCounts = { self: 0, idol: 0 }

  if ((rows || []).length !== 2) {
    errors.push(`analysis_results ${(rows || []).length}건 (예상 2건)`)
  }

  for (const report of manifest.reports) {
    const row = rowById.get(report.resultId)
    if (!row) {
      errors.push(`분석 결과 누락: ${report.resultId}`)
      continue
    }

    const result = row.analysis_data as Partial<SajuAnalysisResult> | null
    if (row.product_type !== 'saju_perfume') {
      errors.push(`상품 유형 오류: ${report.resultId}`)
    }
    if (row.target_type !== report.targetType) {
      errors.push(`대상 유형 오류: ${report.resultId}`)
    } else {
      targetCounts[report.targetType] += 1
    }
    if (row.user_image_url !== null) {
      errors.push(`사주 보고서에 불필요한 인물 이미지 존재: ${report.resultId}`)
    }
    if (!result?.sajuChart?.pillars?.day) {
      errors.push(`명식 스냅샷 누락: ${report.resultId}`)
    }
    if (!result?.sajuChart?.pillars?.hour) {
      errors.push(`시주 누락: ${report.resultId}`)
    }
    if (!result?.sajuAnalysis?.dayMasterReading?.narrative) {
      errors.push(`일간 해석 누락: ${report.resultId}`)
    }
    if (!result?.sajuAnalysis?.purposeReading?.narrative) {
      errors.push(`목적별 해석 누락: ${report.resultId}`)
    }
    if (!result?.sajuAnalysis?.scentDestiny?.whyNarrative) {
      errors.push(`향 처방 서사 누락: ${report.resultId}`)
    }
    if (!result?.matchingPerfumes?.[0]?.persona?.mainScent?.name) {
      errors.push(`추천 향수 노트 누락: ${report.resultId}`)
    }
  }

  if (targetCounts.self !== 1 || targetCounts.idol !== 1) {
    errors.push(
      `대상별 건수 오류: self ${targetCounts.self}건 / idol ${targetCounts.idol}건`,
    )
  }

  const verification = {
    verifiedAt: new Date().toISOString(),
    fingerprint: FINGERPRINT,
    ok: errors.length === 0,
    counts: {
      databaseAnalysisRows: (rows || []).length,
      selfReports: targetCounts.self,
      idolReports: targetCounts.idol,
      adminVisibleRows: (rows || []).length,
    },
    printReportIds: manifest.reports.map((report) => report.resultId),
    errors,
  }

  fs.writeFileSync(
    VERIFICATION_PATH,
    JSON.stringify(verification, null, 2),
  )

  if (errors.length > 0) {
    throw new Error(`검증 실패:\n- ${errors.join('\n- ')}`)
  }
  console.log(JSON.stringify(verification, null, 2))
}

function writeSummary(manifest: ReportManifest) {
  const lines = [
    '# 상세페이지용 가상 사주 분석 보고서',
    '',
    '> 모든 인물, 생년월일, 시각과 설정은 상세페이지 시연을 위해 만든 가상 데이터입니다.',
    '',
    `- 생성 시각: ${manifest.generatedAt}`,
    `- 식별자: \`${manifest.fingerprint}\``,
    '- 관리자 목록: https://www.acscent.co.kr/admin/analysis',
    '',
    '## 보고서 2건',
    '',
    '| 구분 | 가상 인물 | 생년월일시 | 분석 목적 | 일간 / 용신 | 추천 향수 | 관리자 출력 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...manifest.reports.map((report) => {
      const birth = report.birth
      const birthText = `${birth.year}.${String(birth.month).padStart(2, '0')}.${String(birth.day).padStart(2, '0')} ${String(birth.hour).padStart(2, '0')}:${String(birth.minute).padStart(2, '0')} 양력`
      return `| ${report.label} | ${report.name} (${report.roleLabel}) | ${birthText} | ${PURPOSE_LABELS[report.purpose]} | ${report.dayMaster} / ${report.yongsin} | ${report.perfumeName} (${report.perfumeId}) | [열기](https://www.acscent.co.kr${report.adminPrintPath}) |`
    }),
    '',
    '## 입력 설정',
    '',
    ...manifest.reports.map(
      (report) =>
        `- **${report.label} · ${report.name}**: ${report.wish}`,
    ),
    '',
    '## 검수 자료',
    '',
    '- 관리자 목록 및 인쇄물 캡처: `../02_관리자캡처/`',
    '- DB 필드 검증: `verification.json`',
    '- 브라우저 렌더링 검증: `visual-verification.json`',
    '',
    '## 되돌리기',
    '',
    '이 스크립트가 만든 사주 샘플 2건과 정리 파일만 삭제합니다.',
    '',
    '```bash',
    'npx --yes tsx scripts/generate-saju-demo-reports.ts --cleanup',
    '```',
    '',
  ]

  fs.writeFileSync(SUMMARY_PATH, lines.join('\n'))
}

async function main() {
  if (process.argv.includes('--cleanup')) {
    await cleanup()
    return
  }

  if (process.argv.includes('--verify')) {
    await verify()
    return
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await ensureNoExistingData()

  const manifest: ReportManifest = {
    generatedAt: new Date().toISOString(),
    fingerprint: FINGERPRINT,
    notice:
      '모든 인물, 생년월일, 시각과 설정은 상세페이지 시연을 위해 만든 가상 데이터입니다.',
    reports: [],
  }

  console.log('사주 분석 보고서 2건 생성 시작')
  for (let index = 0; index < SCENARIOS.length; index += 1) {
    const scenario = SCENARIOS[index]
    console.log(
      `\n[${index + 1}/${SCENARIOS.length}] ${scenario.label}: ${scenario.name} / ${PURPOSE_LABELS[scenario.purpose]}`,
    )

    const analysis = await analyzeScenario(scenario)
    const resultId = await insertReport(scenario, analysis)
    const perfume = analysis.matchingPerfumes[0]
    const dayMaster = analysis.sajuChart.dayMaster
    const yongsin = analysis.sajuChart.yongsin

    manifest.reports.push({
      key: scenario.key,
      label: scenario.label,
      name: scenario.name,
      roleLabel: scenario.roleLabel,
      targetType: scenario.targetType,
      purpose: scenario.purpose,
      birth: scenario.birth,
      wish: scenario.wish,
      resultId,
      perfumeId: perfume.perfumeId,
      perfumeName: perfume.persona?.name || perfume.perfumeId,
      dayMaster: `${dayMaster.gan}(${dayMaster.hanja})`,
      yongsin: `${yongsin.element}(${YONGSIN_REASON_LABELS[yongsin.reason]})`,
      adminDetailPath: `/admin/analysis/${resultId}`,
      adminPrintPath: `/admin/analysis/${resultId}/print`,
    })
    manifest.generatedAt = new Date().toISOString()
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    console.log(
      `    저장 완료: ${resultId} / ${perfume.perfumeId} / 일간 ${dayMaster.hanja}`,
    )
  }

  writeSummary(manifest)
  await verify()

  console.log('\n===== 생성 완료 =====')
  console.log(`사주 보고서: ${manifest.reports.length}건`)
  console.log(`결과 목록: ${path.relative(ROOT, SUMMARY_PATH)}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      '\n생성 실패:',
      error instanceof Error ? error.message : error,
    )
    console.error(
      '부분 생성 데이터는 다음 명령으로 정리할 수 있습니다:\n  npx --yes tsx scripts/generate-saju-demo-reports.ts --cleanup',
    )
    process.exit(1)
  })
