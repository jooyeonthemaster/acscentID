import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import sharp from 'sharp'
import { generateBoothImage, IdolError } from '../../idol-generate'
import { generateSteps, planStrip, type StripPlan } from '../timecapsule-server'

const people = [
  { box_2d: [250, 220, 550, 340], age: 30, presentation: 'man', look: 'red shirt' },
  { box_2d: [250, 360, 550, 480], age: 35, presentation: 'woman', look: 'blue shirt' },
]

async function photo() {
  const image = await sharp({ create: { width: 1500, height: 1000, channels: 3, background: '#ddd' } }).jpeg().toBuffer()
  return `data:image/jpeg;base64,${image.toString('base64')}`
}

function service(t: TestContext, reply: (body: Record<string, unknown>) => Response) {
  const oldKey = process.env.OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY
  const oldModel = process.env.OPENROUTER_PHOTOBOOTH_MODEL
  process.env.OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY = 'test-key-never-sent'
  process.env.OPENROUTER_PHOTOBOOTH_MODEL = 'test/identity-model'
  t.after(() => {
    if (oldKey === undefined) delete process.env.OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY
    else process.env.OPENROUTER_ITAEWONPHOTOBOOTH_API_KEY = oldKey
    if (oldModel === undefined) delete process.env.OPENROUTER_PHOTOBOOTH_MODEL
    else process.env.OPENROUTER_PHOTOBOOTH_MODEL = oldModel
  })
  const calls: Record<string, unknown>[] = []
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
  t.after(() => {
    if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch)
    else Reflect.deleteProperty(globalThis, 'fetch')
  })
  Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    calls.push(body)
    return reply(body)
  } })
  return calls
}

const vision = (found: typeof people) => Response.json({ choices: [{ message: { content: JSON.stringify({ people: found }) } }] })
const retake = (error: unknown) => error instanceof IdolError && error.status === 422 && /다시 찍어/.test(error.message)

test('얼굴 읽기에 실패하면 참고 없이 이미지를 생성하지 않고 다시 촬영하게 한다', async (t) => {
  const calls = service(t, () => Response.json({ choices: [{ message: { content: 'not json' } }] }))
  await assert.rejects(planStrip(await photo()), retake)
  assert.equal(calls.length, 2)
  assert.ok(calls.every((call) => !call.modalities))
})

test('사람 수가 맞아도 얼굴 상자가 섞이거나 너무 작으면 다시 촬영하게 한다', async (t) => {
  const bad = people.map((person) => ({ ...person, box_2d: [250, 220, 550, 340] }))
  service(t, () => vision(bad))
  await assert.rejects(planStrip(await photo()), retake)
})

test('얼굴을 확대할 원본 픽셀이 부족하면 본 사진만으로 생성하지 않는다', async (t) => {
  service(t, () => vision([{ ...people[0], box_2d: [100, 100, 130, 112] }]))
  await assert.rejects(planStrip(await photo()), retake)
})

test('정상 단체 사진은 사람 순서와 일치하는 얼굴 참고를 모두 만든다', async (t) => {
  service(t, () => vision(people))
  const plan = await planStrip(await photo())
  assert.equal(plan.people.length, 2)
  assert.equal(plan.faces.length, 2)
  assert.deepEqual(plan.people.map((p) => p.look), ['red shirt', 'blue shirt'])
})

test('생성 단계도 얼굴 참고가 누락된 단체 요청을 모델에 보내지 않는다', async (t) => {
  const calls = service(t, () => { throw new Error('must not call the image model') })
  const plan: StripPlan = {
    people: [{ age: 30, presentation: 'man', look: 'red shirt', box: { x0: 0.22, y0: 0.25, x1: 0.34, y1: 0.55 } }],
    photo: await photo(), faces: [],
  }
  await assert.rejects(generateSteps(plan, [10]), retake)
  assert.equal(calls.length, 0)
})

test('단체 생성은 첫 시도 실패 후에도 같은 모델과 같은 개인별 참고로 재시도한다', async (t) => {
  const input = await photo()
  let imageAttempts = 0
  const calls = service(t, (body) => {
    if (!body.modalities) return vision(people)
    imageAttempts++
    return imageAttempts === 1
      ? Response.json({ error: { message: 'temporary failure' } }, { status: 503 })
      : Response.json({ choices: [{ message: { images: [{ image_url: { url: input } }] } }] })
  })
  const plan = await planStrip(input)
  const output = await generateSteps(plan, [10])
  assert.ok(output[0]?.startsWith('data:image/jpeg;base64,'))
  const images = calls.filter((call) => call.modalities)
  assert.deepEqual(images.map((call) => call.model), ['test/identity-model', 'test/identity-model'])
  assert.deepEqual(images[0].messages, images[1].messages)
})

test('기존 다른 프로그램은 빠른 예비 모델 정책을 유지한다', async (t) => {
  const input = await photo()
  let attempts = 0
  const calls = service(t, () => {
    attempts++
    return attempts === 1
      ? Response.json({ error: { message: 'temporary failure' } }, { status: 503 })
      : Response.json({ choices: [{ message: { images: [{ image_url: { url: input } }] } }] })
  })
  await generateBoothImage('test', input)
  assert.deepEqual(calls.map((call) => call.model), ['test/identity-model', 'google/gemini-2.5-flash-image'])
})
