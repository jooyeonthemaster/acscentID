import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { build } from 'esbuild'
import { NextRequest } from 'next/server'
import type { ImageAnalysisResult } from '@/types/analysis'

type GenerationRequest = {
  contents: { role: string; parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] }[]
}
type ApiResponse = { success: boolean; data?: ImageAnalysisResult; error?: string; mocked?: boolean }
type Route = { POST: (request: NextRequest) => Promise<Response> }

const assignedId = "AC'SCENT 03"
const otherId = "AC'SCENT 12"
const photo = 'data:image/jpeg;base64,b2ZmbGluZS1waG90bw=='
const rotation = { remaining: [assignedId, "AC'SCENT 04"], recent: ["AC'SCENT 10", otherId] }
const formData = {
  name: '회귀 검증', gender: 'Female', targetType: 'self',
  styles: ['시크한'], personalities: ['차분한'], charmPoints: ['미소'],
}
const requestBody = (patch: Record<string, unknown> = {}) => ({ formData, imageBase64: photo, lang: 'ko', ...patch })
const analysis = (id: string) => ({
  traits: { sexy: 3, cute: 7, charisma: 5, darkness: 2, freshness: 8, elegance: 7, freedom: 5, luxury: 6, purity: 9, uniqueness: 5 },
  scentCategories: { citrus: 4, floral: 8, woody: 3, musky: 4, fruity: 5, spicy: 2 },
  personalColor: { season: 'spring', tone: 'light', palette: ['#112233', '#223344', '#334455', '#445566'], description: '밝고 정돈된 톤이에요.' },
  analysis: { mood: '차분한 분위기예요.', style: '깔끔한 옷차림이에요.', expression: '편안한 미소예요.', concept: '단정한 인상이에요.' },
  matchingKeywords: ['차분함', '미소'],
  matchingPerfumes: [{
    perfumeId: id, score: 0.91, matchReason: `${id}의 향과 차분한 인상이 어울려요.`,
    noteComments: { top: '맑은 첫인상이에요.', middle: '편안한 중심이에요.', base: '차분한 여운이에요.' },
    usageGuide: { situation: '차분하게 하루를 시작할 때 써 보세요.', tips: ['소량을 뿌려 보세요.'] },
  }],
})

function candidateIds(prompt: string) {
  return [...prompt.matchAll(/"id"\s*:\s*"(AC'SCENT \d{2})"/g)].map((match) => match[1])
}

// 실제 라우트·프롬프트·파서를 실행하되 DB 할당과 유료 모델만 격리한다.
// 실행: esbuild <이 파일> --bundle --platform=node --format=cjs --packages=external
test('AI 조향사 분석 라우트 — 할당 향을 설명과 일치시키고 일반 분석은 유지한다', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'acscent-perfumer-route-test-'))
  const requireFromRepo = createRequire(join(process.cwd(), 'package.json'))
  const bridgeKey = `__perfumerRouteTest_${randomUUID().replaceAll('-', '')}`
  const globals = globalThis as typeof globalThis & Record<string, unknown>
  const envKeys = ['NODE_ENV', 'OPENROUTER_API_KEY', 'KIOSK_ENABLED', 'KIOSK_ALLOW_REMOTE', 'KIOSK_DEMO'] as const
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]))
  const previousFetch = globalThis.fetch
  let selected = assignedId
  let allocationError: Error | null = null
  let modelReply: string | Error = JSON.stringify(analysis(assignedId))
  let allocationCalls: unknown[] = []
  let generationCalls: GenerationRequest[] = []

  globals[bridgeKey] = {
    async allocate(raw: unknown) {
      allocationCalls.push(raw)
      if (allocationError) throw allocationError
      return selected
    },
    async generate(request: GenerationRequest) {
      generationCalls.push(request)
      if (modelReply instanceof Error) throw modelReply
      return { response: { text: () => modelReply } }
    },
  }

  // 혹시 새 네트워크 의존성이 추가되어도 외부로 빠져나가지 않는다.
  globalThis.fetch = async () => { throw new Error('이 테스트에서 실제 네트워크 호출은 금지됩니다.') }
  t.mock.method(console, 'log', () => {})
  t.mock.method(console, 'error', () => {})
  Object.assign(process.env, { NODE_ENV: 'test', OPENROUTER_API_KEY: 'offline-test-key' })

  try {
    const outfile = join(directory, 'route.cjs')
    await build({
      entryPoints: [join(process.cwd(), 'src/app/api/kiosk/analyze/route.ts')],
      outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external',
      tsconfig: join(process.cwd(), 'tsconfig.json'), logLevel: 'silent',
      plugins: [{
        name: 'offline-perfumer-dependencies',
        setup(builder) {
          builder.onResolve({ filter: /(?:^|\/)perfumer-allocation$/ }, () => ({ path: 'allocation', namespace: 'perfumer-test' }))
          builder.onResolve({ filter: /(?:^|\/)gemini\/client$/ }, () => ({ path: 'model', namespace: 'perfumer-test' }))
          builder.onResolve({ filter: /^next\/server$/ }, () => ({ path: requireFromRepo.resolve('next/server'), external: true }))
          builder.onLoad({ filter: /.*/, namespace: 'perfumer-test' }, ({ path }) => ({
            loader: 'js',
            contents: path === 'allocation'
              ? `export const allocatePerfumerScent = (raw) => globalThis[${JSON.stringify(bridgeKey)}].allocate(raw);`
              : `export const getModel = () => ({ generateContent: (request) => globalThis[${JSON.stringify(bridgeKey)}].generate(request) }); export const withTimeout = (promise) => promise;`,
          }))
        },
      }],
    })
    const { POST } = requireFromRepo(outfile) as Route
    const send = async (body: unknown, headers: Record<string, string> = {}) => {
      const response = await POST(new NextRequest('http://localhost/api/kiosk/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
      }))
      return { response, json: await response.json() as ApiResponse }
    }
    const reset = () => {
      selected = assignedId
      allocationError = null
      allocationCalls = []
      generationCalls = []
      modelReply = JSON.stringify(analysis(assignedId))
      process.env.OPENROUTER_API_KEY = 'offline-test-key'
    }
    const prompt = () => generationCalls[0].contents[0].parts.filter((part): part is { text: string } => 'text' in part).map((part) => part.text).join('\n')

    await t.test('일반 분석은 할당을 호출하지 않고 30종 후보와 AI가 고른 향을 유지한다', async () => {
      reset()
      modelReply = JSON.stringify(analysis(otherId))
      const { response, json } = await send(requestBody())
      assert.equal(response.status, 200)
      assert.equal(json.success, true)
      assert.equal(json.mocked, undefined)
      assert.equal(json.data?.matchingPerfumes[0].persona?.id, otherId)
      assert.equal(allocationCalls.length, 0)
      assert.equal(new Set(candidateIds(prompt())).size, 30)
    })

    await t.test('명시적 AI 조향사 모드는 rotation을 할당에 넘기고 해당 향 한 종만 AI에 전달한다', async () => {
      reset()
      const { response, json } = await send(requestBody({ mode: 'ai-perfumer', perfumerRotation: rotation }))
      assert.equal(response.status, 200)
      assert.equal(json.data?.matchingPerfumes[0].perfumeId, assignedId)
      assert.equal(json.data?.matchingPerfumes[0].persona?.id, assignedId)
      assert.deepEqual(allocationCalls, [rotation])
      assert.deepEqual(candidateIds(prompt()), [assignedId])
      assert.ok(prompt().slice(-1800).includes(assignedId), '마지막 우선 규칙에도 할당 ID가 있어야 한다')
      assert.match(prompt().slice(-1800), /matchingPerfumes|perfumeId/)
      assert.match(prompt(), /시크한/)
      assert.match(prompt(), /차분한/)
      assert.match(prompt(), /미소/)
      const imagePart = generationCalls[0].contents[0].parts.find((part) => 'inlineData' in part)
      assert.deepEqual(imagePart, { inlineData: { mimeType: 'image/jpeg', data: photo.split(',')[1] } })
    })

    await t.test('기존 앱의 tone=polite 요청에도 동일한 할당 정책을 적용한다', async () => {
      reset()
      const { response, json } = await send(requestBody({ tone: 'polite' }))
      assert.equal(response.status, 200)
      assert.equal(allocationCalls.length, 1)
      assert.deepEqual(candidateIds(prompt()), [assignedId])
      assert.equal(json.data?.matchingPerfumes[0].persona?.id, assignedId)
    })

    await t.test('AI가 할당과 다른 향을 설명하면 ID를 치환하지 않고 실패한다', async () => {
      reset()
      modelReply = JSON.stringify(analysis(otherId))
      const { response, json } = await send(requestBody({ mode: 'ai-perfumer', perfumerRotation: rotation }))
      assert.equal(response.status, 500)
      assert.equal(json.data, undefined)
      assert.deepEqual(json, { success: false, error: 'ANALYZE_FAILED' })
      assert.equal(generationCalls.length, 1)
    })

    for (const [lang, perfumeName, languageRule] of [
      ['en', 'Strawberry', 'OUTPUT LANGUAGE: ENGLISH ONLY'],
      ['ja', 'ストロベリー', '出力言語: 日本語のみ'],
      ['zh-Hans', '草莓', '仅限简体中文'],
      ['zh-Hant', '草莓', '繁體中文（台灣正體字）'],
    ]) {
      await t.test(`${lang}에서도 할당 한 종·출력 언어·분석 메타데이터를 유지한다`, async () => {
        reset()
        const emitted = analysis(assignedId)
        emitted.analysis.mood = `observation-${lang}`
        emitted.matchingPerfumes[0].matchReason = `reason-${lang}`
        modelReply = JSON.stringify(emitted)
        const { response, json } = await send(requestBody({ mode: 'ai-perfumer', tone: 'polite', lang, perfumerRotation: rotation }))
        assert.equal(response.status, 200)
        assert.deepEqual(candidateIds(prompt()), [assignedId])
        assert.ok(prompt().includes(languageRule))
        assert.ok(prompt().slice(-2200).includes(assignedId))
        const match = json.data?.matchingPerfumes[0]
        assert.equal(match?.perfumeId, assignedId)
        assert.equal(match?.persona?.id, assignedId)
        assert.equal(match?.persona?.name, perfumeName)
        assert.equal(match?.matchReason, `reason-${lang}`)
        assert.equal(json.data?.analysis?.mood, `observation-${lang}`)
        assert.deepEqual(json.data?.traits, emitted.traits)
        assert.deepEqual(json.data?.scentCategories, emitted.scentCategories)
        assert.deepEqual(json.data?.personalColor, emitted.personalColor)
        if (lang === 'zh-Hant') assert.match(match?.persona?.description ?? '', /香氣/)
      })
    }

    await t.test('명시적 mock도 할당한 향을 반환하고 모델은 호출하지 않는다', async () => {
      reset()
      const mockRotation = { remaining: [assignedId], recent: rotation.recent }
      const { response, json } = await send(requestBody({ mode: 'ai-perfumer', perfumerRotation: mockRotation, mock: true }))
      assert.equal(response.status, 200)
      assert.equal(json.mocked, true)
      assert.equal(json.data?.matchingPerfumes[0].persona?.id, assignedId)
      assert.equal(allocationCalls.length, 0, '데모는 운영 DB 할당을 소모하지 않는다')
      assert.equal(generationCalls.length, 0)
    })

    await t.test('API 키가 없어 mock을 반환할 때도 AI 조향사 할당은 유지한다', async () => {
      reset()
      delete process.env.OPENROUTER_API_KEY
      const mockRotation = { remaining: [assignedId], recent: rotation.recent }
      const { response, json } = await send(requestBody({ tone: 'polite', perfumerRotation: mockRotation }))
      assert.equal(response.status, 200)
      assert.equal(json.mocked, true)
      assert.equal(json.data?.matchingPerfumes[0].persona?.id, assignedId)
      assert.equal(allocationCalls.length, 0)
      assert.equal(generationCalls.length, 0)
    })

    await t.test('일반 분석의 mock은 조향사 할당을 사용하지 않는다', async () => {
      reset()
      const { response, json } = await send(requestBody({ mock: true }))
      assert.equal(response.status, 200)
      assert.equal(json.mocked, true)
      assert.equal(allocationCalls.length, 0)
      assert.equal(generationCalls.length, 0)
    })

    await t.test('잘못된 입력은 할당·모델 호출 전에 거부한다', async () => {
      reset()
      const missing = await send({ mode: 'ai-perfumer' })
      assert.equal(missing.response.status, 400)
      const invalid = await send(requestBody({ mode: 'ai-perfumer', imageBase64: 123 }))
      assert.equal(invalid.response.status, 400)
      assert.equal(invalid.json.error, 'INVALID_IMAGE')
      const tooLarge = await send(requestBody({ mode: 'ai-perfumer' }), { 'Content-Length': '4064001' })
      assert.equal(tooLarge.response.status, 413)
      assert.equal(tooLarge.json.error, 'PAYLOAD_TOO_LARGE')
      assert.equal(allocationCalls.length, 0)
      assert.equal(generationCalls.length, 0)
    })

    await t.test('할당 실패 시 임의 향·모델 호출 없이 실패를 알린다', async () => {
      reset()
      allocationError = new Error('offline allocation failure')
      const { response, json } = await send(requestBody({ mode: 'ai-perfumer' }))
      assert.equal(response.status, 500)
      assert.deepEqual(json, { success: false, error: 'ANALYZE_FAILED' })
      assert.equal(generationCalls.length, 0)
    })

    await t.test('모델 오류와 잘못된 응답은 성공·mock 레시피로 대체하지 않는다', async () => {
      for (const reply of [new Error('offline model failure'), 'not JSON']) {
        reset()
        modelReply = reply
        const { response, json } = await send(requestBody({ mode: 'ai-perfumer' }))
        assert.equal(response.status, 500)
        assert.deepEqual(json, { success: false, error: 'ANALYZE_FAILED' })
      }
    })

    await t.test('다음 요청은 새 할당과 rotation을 사용하고 이전 향을 재사용하지 않는다', async () => {
      reset()
      const first = await send(requestBody({ mode: 'ai-perfumer', perfumerRotation: rotation }))
      assert.equal(first.json.data?.matchingPerfumes[0].persona?.id, assignedId)
      selected = "AC'SCENT 04"
      modelReply = JSON.stringify(analysis(selected))
      const nextRotation = { remaining: [selected], recent: [assignedId, ...rotation.recent] }
      const second = await send(requestBody({ mode: 'ai-perfumer', perfumerRotation: nextRotation }))
      assert.equal(second.response.status, 200)
      assert.equal(second.json.data?.matchingPerfumes[0].persona?.id, selected)
      assert.deepEqual(allocationCalls, [rotation, nextRotation])
      const secondPrompt = generationCalls[1].contents[0].parts.filter((part): part is { text: string } => 'text' in part).map((part) => part.text).join('\n')
      assert.deepEqual(candidateIds(secondPrompt), [selected])
    })
  } finally {
    globalThis.fetch = previousFetch
    delete globals[bridgeKey]
    for (const key of envKeys) {
      const previous = previousEnv[key]
      if (previous === undefined) delete process.env[key]
      else Object.assign(process.env, { [key]: previous })
    }
    await rm(directory, { recursive: true, force: true })
  }
})
