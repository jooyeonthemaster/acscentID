/**
 * 상세페이지 캡처용 가상 인물 분석 보고서 생성기
 *
 * 생성 결과:
 * - AI 이미지 분석 퍼퓸: 나 2건 + 최애 2건
 * - 레이어링 퍼퓸: 나와 상대방 2건 + 최애 2건
 *
 * 실행:
 *   npx --yes tsx scripts/generate-detail-page-demo-reports.ts
 *
 * 이 스크립트가 만든 데이터만 삭제:
 *   npx --yes tsx scripts/generate-detail-page-demo-reports.ts --cleanup
 */

import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

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

import {
  buildGeminiPrompt,
  type FormDataInput,
} from '../src/lib/gemini/prompt-builder'
import {
  buildChemistryIndividualPrompt,
  buildChemistryProfilePrompt,
  type ChemistryUserInput,
} from '../src/lib/gemini/chemistry-prompt-builder'
import {
  parseChemistryIndividualResponse,
  parseChemistryProfileResponse,
} from '../src/lib/gemini/chemistry-response-parser'
import { parseGeminiResponse } from '../src/lib/gemini/response-parser'
import { getModel, getModelWithConfig, withTimeout } from '../src/lib/gemini/client'
import { sanitizeSelfAnalysisTone } from '../src/lib/gemini/self-tone'
import { createServiceRoleClient } from '../src/lib/supabase/service'
import type {
  ChemistryAnalysisResult,
  ImageAnalysisResult,
} from '../src/types/analysis'

const ASSET_DIR = path.join(ROOT, '상품사진', '07_분석보고서_샘플')
const INPUT_DIR = path.join(ASSET_DIR, '01_입력인물')
const OUTPUT_DIR = path.join(ASSET_DIR, '02_결과목록')
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'report-manifest.json')
const VERIFICATION_PATH = path.join(OUTPUT_DIR, 'verification.json')
const SUMMARY_PATH = path.join(OUTPUT_DIR, 'README.md')
const BUCKET_NAME = 'analysis-images'
const UPLOAD_PREFIX = 'detail-page-demo/20260723-v1'
const FINGERPRINT = 'detail_page_demo_20260723_v1'
const SERVICE_MODE = 'online'

type TargetType = 'self' | 'idol'

interface Person {
  key: string
  name: string
  roleLabel: string
  file: string
  gender: 'Male' | 'Female'
  styles: string[]
  personalities: string[]
  charmPoints: string[]
  fictionalContext: string
}

interface ChemistryScenario {
  key: string
  targetType: TargetType
  label: string
  characterAKey: string
  characterBKey: string
  relationTropes: string[]
  character1Archetypes: string[]
  character2Archetypes: string[]
  scenes: string[]
  emotionKeywords: string[]
  scentDirection: number
  message: string
}

interface UploadedPerson extends Person {
  imagePath: string
  imageUrl: string
}

interface ReportManifest {
  generatedAt: string
  fingerprint: string
  notice: string
  people: Array<{
    key: string
    name: string
    roleLabel: string
    localImage: string
    imageUrl: string
  }>
  imageAnalysisReports: Array<{
    key: string
    label: string
    targetType: TargetType
    name: string
    resultId: string
    perfumeId: string
    perfumeName: string
    adminDetailPath: string
    adminPrintPath: string
  }>
  chemistryReports: Array<{
    key: string
    label: string
    targetType: TargetType
    characterA: string
    characterB: string
    analysisAId: string
    analysisBId: string
    sessionId: string
    perfumeAId: string
    perfumeBId: string
    chemistryType: string
    chemistryTitle: string
    adminDetailPath: string
    adminPrintPath: string
  }>
}

const PEOPLE: Person[] = [
  {
    key: 'seo-a',
    name: '윤서아',
    roleLabel: '가상 일반인 · 도예 디자이너',
    file: '01_일반인_윤서아.jpg',
    gender: 'Female',
    styles: ['청량한', '우아한', '캐주얼'],
    personalities: ['차분한', '사려 깊은', '다정한'],
    charmPoints: ['눈빛', '미소', '분위기'],
    fictionalContext: '실존 인물이 아닌 가상 일반인 도예 디자이너. 사진과 선택 정보만 분석할 것.',
  },
  {
    key: 'do-hyeon',
    name: '박도현',
    roleLabel: '가상 일반인 · 편집 디자이너',
    file: '02_일반인_박도현.jpg',
    gender: 'Male',
    styles: ['시크한', '캐주얼', '레트로'],
    personalities: ['차분한', '사려 깊은', '자신감 있는'],
    charmPoints: ['눈빛', '분위기', '말투'],
    fictionalContext: '실존 인물이 아닌 가상 일반인 편집 디자이너. 사진과 선택 정보만 분석할 것.',
  },
  {
    key: 'ga-eun',
    name: '이가은',
    roleLabel: '가상 일반인 · 플로리스트',
    file: '03_일반인_이가은.jpg',
    gender: 'Female',
    styles: ['활발한', '귀여운', '캐주얼'],
    personalities: ['밝은', '다정한', '유머러스한'],
    charmPoints: ['미소', '눈웃음', '제스처'],
    fictionalContext: '실존 인물이 아닌 가상 일반인 플로리스트. 사진과 선택 정보만 분석할 것.',
  },
  {
    key: 'min-jun',
    name: '최민준',
    roleLabel: '가상 일반인 · 커피 로스터',
    file: '04_일반인_최민준.jpg',
    gender: 'Male',
    styles: ['캐주얼', '레트로', '우아한'],
    personalities: ['차분한', '다정한', '사려 깊은'],
    charmPoints: ['미소', '눈빛', '분위기'],
    fictionalContext: '실존 인물이 아닌 가상 일반인 커피 로스터. 사진과 선택 정보만 분석할 것.',
  },
  {
    key: 'ha-rin',
    name: '류하린',
    roleLabel: '가상 연예인 · 싱어송라이터 겸 배우',
    file: '05_가상연예인_류하린.jpg',
    gender: 'Female',
    styles: ['우아한', '시크한', '청량한'],
    personalities: ['자신감 있는', '차분한', '사려 깊은'],
    charmPoints: ['눈빛', '분위기', '손'],
    fictionalContext: '실존 인물이 아닌 완전한 가상 연예인. 실제 연예인 정보나 팬덤 설정을 연결하지 말 것.',
  },
  {
    key: 'yi-jun',
    name: '서이준',
    roleLabel: '가상 연예인 · 배우 겸 작곡가',
    file: '06_가상연예인_서이준.jpg',
    gender: 'Male',
    styles: ['시크한', '섹시한', '우아한'],
    personalities: ['차분한', '자신감 있는', '사려 깊은'],
    charmPoints: ['눈빛', '손', '분위기'],
    fictionalContext: '실존 인물이 아닌 완전한 가상 연예인. 실제 연예인 정보나 팬덤 설정을 연결하지 말 것.',
  },
  {
    key: 'chae-on',
    name: '한채온',
    roleLabel: '가상 연예인 · 배우 겸 퍼포먼스 아티스트',
    file: '07_가상연예인_한채온.jpg',
    gender: 'Female',
    styles: ['활발한', '시크한', '청량한'],
    personalities: ['밝은', '자신감 있는', '유머러스한'],
    charmPoints: ['눈빛', '미소', '제스처'],
    fictionalContext: '실존 인물이 아닌 완전한 가상 연예인. 실제 연예인 정보나 팬덤 설정을 연결하지 말 것.',
  },
  {
    key: 'si-woo',
    name: '강시우',
    roleLabel: '가상 연예인 · 밴드 보컬 겸 배우',
    file: '08_가상연예인_강시우.jpg',
    gender: 'Male',
    styles: ['활발한', '레트로', '캐주얼'],
    personalities: ['밝은', '다정한', '열정적인'],
    charmPoints: ['미소', '눈웃음', '목소리'],
    fictionalContext: '실존 인물이 아닌 완전한 가상 연예인. 실제 연예인 정보나 팬덤 설정을 연결하지 말 것.',
  },
]

const IMAGE_REPORTS: Array<{
  key: string
  label: string
  personKey: string
  targetType: TargetType
}> = [
  { key: 'image-self-01', label: 'AI 이미지 분석 퍼퓸 · 나 1', personKey: 'seo-a', targetType: 'self' },
  { key: 'image-self-02', label: 'AI 이미지 분석 퍼퓸 · 나 2', personKey: 'do-hyeon', targetType: 'self' },
  { key: 'image-idol-01', label: 'AI 이미지 분석 퍼퓸 · 최애 1', personKey: 'ha-rin', targetType: 'idol' },
  { key: 'image-idol-02', label: 'AI 이미지 분석 퍼퓸 · 최애 2', personKey: 'yi-jun', targetType: 'idol' },
]

const CHEMISTRY_REPORTS: ChemistryScenario[] = [
  {
    key: 'chemistry-self-01',
    targetType: 'self',
    label: '레이어링 퍼퓸 · 나와 상대방 1',
    characterAKey: 'seo-a',
    characterBKey: 'min-jun',
    relationTropes: ['fate_encounter', 'protective'],
    character1Archetypes: ['gentle', 'romantic'],
    character2Archetypes: ['cool', 'gentle'],
    scenes: ['cafe'],
    emotionKeywords: ['comfort', 'trust', 'flutter'],
    scentDirection: 58,
    message: '서로 다른 속도가 만나 자연스럽게 편안해지는 관계를 향으로 표현하고 싶어요.',
  },
  {
    key: 'chemistry-self-02',
    targetType: 'self',
    label: '레이어링 퍼퓸 · 나와 상대방 2',
    characterAKey: 'do-hyeon',
    characterBKey: 'ga-eun',
    relationTropes: ['opposites', 'childhood_friends'],
    character1Archetypes: ['cool', 'mysterious'],
    character2Archetypes: ['energetic', 'gentle'],
    scenes: ['library', 'city'],
    emotionKeywords: ['playful', 'trust', 'comfort'],
    scentDirection: 47,
    message: '차분함과 밝은 에너지가 일상에서 서로를 보완하는 느낌을 담아 주세요.',
  },
  {
    key: 'chemistry-idol-01',
    targetType: 'idol',
    label: '레이어링 퍼퓸 · 최애 1',
    characterAKey: 'ha-rin',
    characterBKey: 'si-woo',
    relationTropes: ['rivals', 'push_pull'],
    character1Archetypes: ['charismatic', 'cool'],
    character2Archetypes: ['energetic', 'romantic'],
    scenes: ['rooftop', 'city'],
    emotionKeywords: ['tension', 'passionate', 'playful'],
    scentDirection: 70,
    message: '가상의 두 아티스트가 무대 밖에서 경쟁하다 가까워지는 강렬한 케미.',
  },
  {
    key: 'chemistry-idol-02',
    targetType: 'idol',
    label: '레이어링 퍼퓸 · 최애 2',
    characterAKey: 'yi-jun',
    characterBKey: 'chae-on',
    relationTropes: ['fate_encounter', 'opposites'],
    character1Archetypes: ['mysterious', 'romantic'],
    character2Archetypes: ['charismatic', 'energetic'],
    scenes: ['ocean', 'library'],
    emotionKeywords: ['longing', 'flutter', 'bittersweet'],
    scentDirection: 40,
    message: '서늘한 여운과 선명한 생기가 한 장면 안에서 교차하는 영화 같은 조합.',
  },
]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(label: string, task: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`  [${label}] 시도 ${attempt}/${attempts} 실패: ${message}`)
      if (attempt < attempts) await sleep(attempt * 3000)
    }
  }

  throw lastError
}

function getUploadedPerson(people: Map<string, UploadedPerson>, key: string): UploadedPerson {
  const person = people.get(key)
  if (!person) throw new Error(`업로드 인물을 찾을 수 없습니다: ${key}`)
  return person
}

function buildFormData(person: Person, targetType: TargetType): FormDataInput {
  return {
    name: person.name,
    gender: person.gender,
    targetType,
    styles: person.styles,
    customStyle: person.fictionalContext,
    personalities: person.personalities,
    customPersonality: '',
    charmPoints: person.charmPoints,
    customCharm: '',
  }
}

async function analyzeImage(person: Person, targetType: TargetType): Promise<ImageAnalysisResult> {
  return withRetry(`${person.name} 이미지 분석`, async () => {
    const imagePath = path.join(INPUT_DIR, person.file)
    const imageBase64 = fs.readFileSync(imagePath).toString('base64')
    const prompt = buildGeminiPrompt(buildFormData(person, targetType), 'ko')
    const model = getModel()
    const generated = await withTimeout(
      model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          ],
        }],
      }),
      90000,
      `${person.name} 이미지 분석 시간 초과`
    )
    const parsed = parseGeminiResponse(generated.response.text(), 'ko')
    return targetType === 'self' ? sanitizeSelfAnalysisTone(parsed) : parsed
  })
}

async function analyzeChemistry(
  scenario: ChemistryScenario,
  characterA: UploadedPerson,
  characterB: UploadedPerson,
): Promise<ChemistryAnalysisResult> {
  const individualResult = await withRetry(`${scenario.label} 개별 분석`, async () => {
    const prompt = buildChemistryIndividualPrompt(
      characterA.name,
      characterB.name,
      'ko',
      scenario.targetType,
    ) + `\n\n# 가상 인물 고지\n${characterA.name}와 ${characterB.name}는 모두 상세페이지 시연을 위해 만든 가상 인물입니다. 실존 인물의 정보나 설정을 연결하지 말고, 첨부 이미지와 사용자 입력만 분석하세요.`

    const model = getModelWithConfig({ maxOutputTokens: 12288, temperature: 0.7 })
    const generated = await withTimeout(
      model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: fs.readFileSync(characterA.imagePath).toString('base64'),
              },
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: fs.readFileSync(characterB.imagePath).toString('base64'),
              },
            },
          ],
        }],
      }),
      120000,
      `${scenario.label} 개별 분석 시간 초과`
    )
    return parseChemistryIndividualResponse(generated.response.text(), 'ko')
  })

  const analysisA = individualResult.characterA
  let analysisB = individualResult.characterB
  if (
    analysisA.matchingPerfumes[0]?.perfumeId &&
    analysisA.matchingPerfumes[0]?.perfumeId === analysisB.matchingPerfumes[0]?.perfumeId &&
    analysisB.matchingPerfumes.length > 1
  ) {
    const [first, ...rest] = analysisB.matchingPerfumes
    analysisB = { ...analysisB, matchingPerfumes: [...rest, first] }
  }

  const userInput: ChemistryUserInput = {
    character1Name: characterA.name,
    character2Name: characterB.name,
    relationTropes: scenario.relationTropes,
    character1Archetypes: scenario.character1Archetypes,
    character2Archetypes: scenario.character2Archetypes,
    scenes: scenario.scenes,
    emotionKeywords: scenario.emotionKeywords,
    scentDirection: scenario.scentDirection,
    message: scenario.message,
  }

  const chemistry = await withRetry(`${scenario.label} 케미 프로필`, async () => {
    const prompt = buildChemistryProfilePrompt(
      analysisA,
      analysisB,
      userInput,
      'ko',
      scenario.targetType,
    )
    const model = getModelWithConfig({ maxOutputTokens: 6144, temperature: 0.8 })
    const generated = await withTimeout(
      model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
      90000,
      `${scenario.label} 케미 프로필 시간 초과`
    )
    return parseChemistryProfileResponse(generated.response.text(), 'ko')
  })

  const result = { characterA: analysisA, characterB: analysisB, chemistry }
  return scenario.targetType === 'self' ? sanitizeSelfAnalysisTone(result) : result
}

async function uploadPeople(): Promise<Map<string, UploadedPerson>> {
  const supabase = createServiceRoleClient()
  const uploaded = new Map<string, UploadedPerson>()

  for (const person of PEOPLE) {
    const imagePath = path.join(INPUT_DIR, person.file)
    if (!fs.existsSync(imagePath)) throw new Error(`입력 이미지가 없습니다: ${imagePath}`)

    const storagePath = `${UPLOAD_PREFIX}/${person.key}.jpg`
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fs.readFileSync(imagePath), {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      })

    if (error) throw new Error(`${person.name} 이미지 업로드 실패: ${error.message}`)

    const imageUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path).data.publicUrl
    uploaded.set(person.key, { ...person, imagePath, imageUrl })
    console.log(`  이미지 업로드: ${person.name}`)
  }

  return uploaded
}

async function insertImageReport(
  person: UploadedPerson,
  targetType: TargetType,
  analysis: ImageAnalysisResult,
) {
  const supabase = createServiceRoleClient()
  const perfume = analysis.matchingPerfumes[0]
  if (!perfume) throw new Error(`${person.name} 추천 향수가 없습니다.`)

  const { data, error } = await supabase
    .from('analysis_results')
    .insert({
      user_image_url: person.imageUrl,
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
      service_mode: SERVICE_MODE,
      pin: null,
      qr_code_id: null,
      locale: 'ko',
      target_type: targetType,
    })
    .select('id')
    .single()

  if (error) throw new Error(`${person.name} 분석 결과 저장 실패: ${error.message}`)
  return data.id as string
}

async function insertChemistryReport(
  scenario: ChemistryScenario,
  characterA: UploadedPerson,
  characterB: UploadedPerson,
  result: ChemistryAnalysisResult,
) {
  const supabase = createServiceRoleClient()
  const analysisAId = randomUUID()
  const analysisBId = randomUUID()
  const sessionId = randomUUID()
  const perfumeA = result.characterA.matchingPerfumes[0]
  const perfumeB = result.characterB.matchingPerfumes[0]

  if (!perfumeA || !perfumeB) throw new Error(`${scenario.label} 추천 향수가 없습니다.`)

  const rows = [
    {
      id: analysisAId,
      user_image_url: characterA.imageUrl,
      analysis_data: result.characterA,
      twitter_name: characterA.name,
      perfume_name: perfumeA.persona?.name || perfumeA.perfumeId,
      perfume_brand: "AC'SCENT",
      matching_keywords: result.characterA.matchingKeywords || [],
      user_id: null,
      user_fingerprint: FINGERPRINT,
      idol_name: characterA.name,
      idol_gender: characterA.gender,
      product_type: 'chemistry_set',
      service_mode: SERVICE_MODE,
      pin: null,
      qr_code_id: null,
      locale: 'ko',
      target_type: scenario.targetType,
    },
    {
      id: analysisBId,
      user_image_url: characterB.imageUrl,
      analysis_data: result.characterB,
      twitter_name: characterB.name,
      perfume_name: perfumeB.persona?.name || perfumeB.perfumeId,
      perfume_brand: "AC'SCENT",
      matching_keywords: result.characterB.matchingKeywords || [],
      user_id: null,
      user_fingerprint: FINGERPRINT,
      idol_name: characterB.name,
      idol_gender: characterB.gender,
      product_type: 'chemistry_set',
      service_mode: SERVICE_MODE,
      pin: null,
      qr_code_id: null,
      locale: 'ko',
      target_type: scenario.targetType,
    },
  ]

  const { error: analysisError } = await supabase.from('analysis_results').insert(rows)
  if (analysisError) throw new Error(`${scenario.label} 인물 결과 저장 실패: ${analysisError.message}`)

  const { error: sessionError } = await supabase.from('layering_sessions').insert({
    id: sessionId,
    analysis_a_id: analysisAId,
    analysis_b_id: analysisBId,
    user_id: null,
    user_fingerprint: FINGERPRINT,
    character_a_name: characterA.name,
    character_b_name: characterB.name,
    relation_trope: scenario.relationTropes.join(', '),
    character_a_archetype: scenario.character1Archetypes.join(', '),
    character_b_archetype: scenario.character2Archetypes.join(', '),
    scene: scenario.scenes.join(', '),
    emotion_keywords: scenario.emotionKeywords,
    scent_direction: scenario.scentDirection,
    message: scenario.message,
    chemistry_data: result.chemistry,
    chemistry_type: result.chemistry.chemistryType,
    chemistry_title: result.chemistry.chemistryTitle,
    character_a_image_url: characterA.imageUrl,
    character_b_image_url: characterB.imageUrl,
    service_mode: SERVICE_MODE,
    pin: null,
    qr_code_id: null,
    locale: 'ko',
    target_type: scenario.targetType,
  })

  if (sessionError) {
    await supabase.from('analysis_results').delete().in('id', [analysisAId, analysisBId])
    throw new Error(`${scenario.label} 세션 저장 실패: ${sessionError.message}`)
  }

  return {
    analysisAId,
    analysisBId,
    sessionId,
    perfumeAId: perfumeA.perfumeId,
    perfumeBId: perfumeB.perfumeId,
  }
}

async function cleanup() {
  const supabase = createServiceRoleClient()
  console.log(`샘플 데이터 삭제 시작: ${FINGERPRINT}`)

  const { error: sessionError } = await supabase
    .from('layering_sessions')
    .delete()
    .eq('user_fingerprint', FINGERPRINT)
  if (sessionError) throw new Error(`레이어링 세션 삭제 실패: ${sessionError.message}`)

  const { error: analysisError } = await supabase
    .from('analysis_results')
    .delete()
    .eq('user_fingerprint', FINGERPRINT)
  if (analysisError) throw new Error(`분석 결과 삭제 실패: ${analysisError.message}`)

  const storagePaths = PEOPLE.map((person) => `${UPLOAD_PREFIX}/${person.key}.jpg`)
  const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove(storagePaths)
  if (storageError) console.warn(`스토리지 삭제 경고: ${storageError.message}`)

  if (fs.existsSync(MANIFEST_PATH)) fs.unlinkSync(MANIFEST_PATH)
  if (fs.existsSync(VERIFICATION_PATH)) fs.unlinkSync(VERIFICATION_PATH)
  if (fs.existsSync(SUMMARY_PATH)) fs.unlinkSync(SUMMARY_PATH)
  console.log('샘플 데이터 삭제 완료')
}

async function verify() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`결과 목록이 없습니다: ${MANIFEST_PATH}`)
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as ReportManifest
  const supabase = createServiceRoleClient()

  const { data: analyses, error: analysisError } = await supabase
    .from('analysis_results')
    .select('id, product_type, target_type, twitter_name, user_image_url, analysis_data')
    .eq('user_fingerprint', FINGERPRINT)
  if (analysisError) throw new Error(`분석 결과 검증 조회 실패: ${analysisError.message}`)

  const { data: sessions, error: sessionError } = await supabase
    .from('layering_sessions')
    .select('id, analysis_a_id, analysis_b_id, target_type, chemistry_data, character_a_image_url, character_b_image_url')
    .eq('user_fingerprint', FINGERPRINT)
  if (sessionError) throw new Error(`레이어링 세션 검증 조회 실패: ${sessionError.message}`)

  const { data: visibleRows, error: visibleError } = await supabase
    .from('analysis_results')
    .select('id, product_type, _lb:layering_sessions!analysis_b_id(analysis_b_id)')
    .eq('user_fingerprint', FINGERPRINT)
    .is('_lb', null)
  if (visibleError) throw new Error(`관리자 목록 행 검증 실패: ${visibleError.message}`)

  const errors: string[] = []
  const analysisById = new Map((analyses || []).map((row) => [row.id, row]))
  const expectedImageIds = manifest.imageAnalysisReports.map((report) => report.resultId)
  const expectedChemistryIds = manifest.chemistryReports.flatMap((report) => [
    report.analysisAId,
    report.analysisBId,
  ])

  if ((analyses || []).length !== 12) errors.push(`analysis_results ${(analyses || []).length}건 (예상 12건)`)
  if ((sessions || []).length !== 4) errors.push(`layering_sessions ${(sessions || []).length}건 (예상 4건)`)
  if ((visibleRows || []).length !== 8) errors.push(`관리자 목록 ${(visibleRows || []).length}건 (예상 8건)`)

  for (const id of [...expectedImageIds, ...expectedChemistryIds]) {
    const row = analysisById.get(id)
    if (!row) {
      errors.push(`분석 결과 누락: ${id}`)
      continue
    }

    const data = row.analysis_data as Partial<ImageAnalysisResult> | null
    if (!row.user_image_url) errors.push(`인물 이미지 URL 누락: ${id}`)
    if (!data?.traits) errors.push(`traits 누락: ${id}`)
    if (!data?.personalColor?.palette?.length) errors.push(`퍼스널 컬러 누락: ${id}`)
    if (!data?.matchingPerfumes?.[0]?.perfumeId) errors.push(`추천 향수 누락: ${id}`)
    if (!data?.matchingPerfumes?.[0]?.persona?.mainScent?.name) errors.push(`향 노트 누락: ${id}`)
  }

  for (const session of sessions || []) {
    const chemistry = session.chemistry_data as ChemistryAnalysisResult['chemistry'] | null
    const analysisA = analysisById.get(session.analysis_a_id)
    const analysisB = analysisById.get(session.analysis_b_id)
    const perfumeA = (analysisA?.analysis_data as ImageAnalysisResult | null)?.matchingPerfumes?.[0]?.perfumeId
    const perfumeB = (analysisB?.analysis_data as ImageAnalysisResult | null)?.matchingPerfumes?.[0]?.perfumeId

    if (!analysisA || !analysisB) errors.push(`세션 인물 연결 누락: ${session.id}`)
    if (!session.character_a_image_url || !session.character_b_image_url) {
      errors.push(`세션 이미지 URL 누락: ${session.id}`)
    }
    if (!chemistry?.chemistryTitle || !chemistry?.chemistryType) {
      errors.push(`케미 제목/유형 누락: ${session.id}`)
    }
    if (!chemistry?.layeringGuide?.method || !chemistry?.relationshipDynamic?.dynamicDescription) {
      errors.push(`케미 상세 필드 누락: ${session.id}`)
    }
    if (perfumeA && perfumeA === perfumeB) errors.push(`세션 향수 중복: ${session.id} (${perfumeA})`)
  }

  const verification = {
    verifiedAt: new Date().toISOString(),
    fingerprint: FINGERPRINT,
    ok: errors.length === 0,
    counts: {
      databaseAnalysisRows: (analyses || []).length,
      databaseLayeringSessions: (sessions || []).length,
      adminVisibleRows: (visibleRows || []).length,
      imageAnalysisReports: expectedImageIds.length,
      chemistryReports: manifest.chemistryReports.length,
    },
    printReportIds: [
      ...manifest.imageAnalysisReports.map((report) => report.resultId),
      ...manifest.chemistryReports.map((report) => report.analysisAId),
    ],
    errors,
  }
  fs.writeFileSync(VERIFICATION_PATH, JSON.stringify(verification, null, 2))

  if (errors.length > 0) {
    throw new Error(`검증 실패:\n- ${errors.join('\n- ')}`)
  }

  console.log(JSON.stringify(verification, null, 2))
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
      `동일한 샘플 데이터가 ${count}개 이미 존재합니다. 중복을 피하려면 먼저 --cleanup을 실행하세요.`
    )
  }
}

function writeSummary(manifest: ReportManifest) {
  const lines = [
    '# 상세페이지용 가상 분석 보고서',
    '',
    '> 모든 인물과 설정은 상세페이지 시연을 위해 생성한 가상 데이터입니다.',
    '',
    `- 생성 시각: ${manifest.generatedAt}`,
    `- 식별자: \`${manifest.fingerprint}\``,
    `- 관리자 검색어: \`${PEOPLE[0].name}\` 또는 각 인물 이름`,
    '- 관리자 목록: https://www.acscent.co.kr/admin/analysis',
    '',
    '## AI 이미지 분석 퍼퓸',
    '',
    '| 구분 | 인물 | 추천 향수 | 관리자 출력 경로 |',
    '| --- | --- | --- | --- |',
    ...manifest.imageAnalysisReports.map(
      (report) => `| ${report.label} | ${report.name} | ${report.perfumeName} (${report.perfumeId}) | [열기](https://www.acscent.co.kr${report.adminPrintPath}) |`
    ),
    '',
    '## 레이어링 퍼퓸',
    '',
    '| 구분 | 인물 | 케미 | 추천 향수 | 관리자 출력 경로 |',
    '| --- | --- | --- | --- | --- |',
    ...manifest.chemistryReports.map(
      (report) => `| ${report.label} | ${report.characterA} × ${report.characterB} | ${report.chemistryTitle} (${report.chemistryType}) | ${report.perfumeAId} + ${report.perfumeBId} | [열기](https://www.acscent.co.kr${report.adminPrintPath}) |`
    ),
    '',
    '## 검수 자료',
    '',
    '- 관리자 목록 및 인쇄물 8개 캡처: `../03_관리자캡처/`',
    '- DB 필드 검증: `verification.json`',
    '- 브라우저 렌더링 검증: `visual-verification.json`',
    '- 입력에 사용한 가상 인물 이미지: `../01_입력인물/`',
    '',
    '## 삭제',
    '',
    '이 스크립트가 만든 샘플만 삭제하려면:',
    '',
    '```bash',
    'npx --yes tsx scripts/generate-detail-page-demo-reports.ts --cleanup',
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
  await ensureNoExistingData()

  console.log('1/4 가상 인물 이미지 업로드')
  const people = await uploadPeople()

  const manifest: ReportManifest = {
    generatedAt: new Date().toISOString(),
    fingerprint: FINGERPRINT,
    notice: '모든 인물과 설정은 상세페이지 시연을 위해 생성한 가상 데이터입니다.',
    people: [...people.values()].map((person) => ({
      key: person.key,
      name: person.name,
      roleLabel: person.roleLabel,
      localImage: path.relative(ROOT, person.imagePath),
      imageUrl: person.imageUrl,
    })),
    imageAnalysisReports: [],
    chemistryReports: [],
  }

  console.log('\n2/4 AI 이미지 분석 퍼퓸 4건 생성')
  for (let index = 0; index < IMAGE_REPORTS.length; index += 1) {
    const report = IMAGE_REPORTS[index]
    const person = getUploadedPerson(people, report.personKey)
    console.log(`  [${index + 1}/${IMAGE_REPORTS.length}] ${report.label}: ${person.name}`)

    const analysis = await analyzeImage(person, report.targetType)
    const resultId = await insertImageReport(person, report.targetType, analysis)
    const perfume = analysis.matchingPerfumes[0]

    manifest.imageAnalysisReports.push({
      key: report.key,
      label: report.label,
      targetType: report.targetType,
      name: person.name,
      resultId,
      perfumeId: perfume.perfumeId,
      perfumeName: perfume.persona?.name || perfume.perfumeId,
      adminDetailPath: `/admin/analysis/${resultId}`,
      adminPrintPath: `/admin/analysis/${resultId}/print`,
    })
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    console.log(`    저장 완료: ${resultId} / ${perfume.perfumeId}`)
    await sleep(1500)
  }

  console.log('\n3/4 레이어링 퍼퓸 4건 생성')
  for (let index = 0; index < CHEMISTRY_REPORTS.length; index += 1) {
    const scenario = CHEMISTRY_REPORTS[index]
    const characterA = getUploadedPerson(people, scenario.characterAKey)
    const characterB = getUploadedPerson(people, scenario.characterBKey)
    console.log(`  [${index + 1}/${CHEMISTRY_REPORTS.length}] ${scenario.label}: ${characterA.name} × ${characterB.name}`)

    const result = await analyzeChemistry(scenario, characterA, characterB)
    const inserted = await insertChemistryReport(scenario, characterA, characterB, result)

    manifest.chemistryReports.push({
      key: scenario.key,
      label: scenario.label,
      targetType: scenario.targetType,
      characterA: characterA.name,
      characterB: characterB.name,
      ...inserted,
      chemistryType: result.chemistry.chemistryType,
      chemistryTitle: result.chemistry.chemistryTitle,
      adminDetailPath: `/admin/analysis/${inserted.analysisAId}`,
      adminPrintPath: `/admin/analysis/${inserted.analysisAId}/print`,
    })
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    console.log(`    저장 완료: ${inserted.sessionId} / ${result.chemistry.chemistryTitle}`)
    await sleep(1500)
  }

  console.log('\n4/4 결과 파일 정리')
  manifest.generatedAt = new Date().toISOString()
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  writeSummary(manifest)

  console.log('\n===== 생성 완료 =====')
  console.log(`관리자 목록에 표시되는 보고서: ${manifest.imageAnalysisReports.length + manifest.chemistryReports.length}건`)
  console.log(`분석 결과 DB 행: ${manifest.imageAnalysisReports.length + manifest.chemistryReports.length * 2}건`)
  console.log(`레이어링 세션: ${manifest.chemistryReports.length}건`)
  console.log(`결과 목록: ${path.relative(ROOT, SUMMARY_PATH)}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n생성 실패:', error instanceof Error ? error.message : error)
    console.error(`부분 생성 데이터는 다음 명령으로 정리할 수 있습니다:\n  npx --yes tsx scripts/generate-detail-page-demo-reports.ts --cleanup`)
    process.exit(1)
  })
