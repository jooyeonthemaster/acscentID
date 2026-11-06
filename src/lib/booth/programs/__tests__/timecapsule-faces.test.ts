import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { createFaceReferences } from '../timecapsule-faces'

type Color = readonly [number, number, number]
type Block = { left: number; top: number; width: number; height: number; color: Color }
type Person = { box: { x0: number; y0: number; x1: number; y1: number } }
const RED: Color = [220, 35, 35]
const BLUE: Color = [35, 55, 220]

async function fixture(width: number, height: number, blocks: Block[], orientation?: number): Promise<string> {
  const data = Buffer.alloc(width * height * 3, 232)
  for (const block of blocks) {
    for (let y = block.top; y < block.top + block.height; y++) {
      for (let x = block.left; x < block.left + block.width; x++) {
        const offset = (y * width + x) * 3
        data[offset] = block.color[0]; data[offset + 1] = block.color[1]; data[offset + 2] = block.color[2]
      }
    }
  }
  const image = sharp(data, { raw: { width, height, channels: 3 } })
  const encoded = orientation
    ? await image.withMetadata({ orientation }).jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).toBuffer()
    : await image.png().toBuffer()
  return `data:image/${orientation ? 'jpeg' : 'png'};base64,${encoded.toString('base64')}`
}

const person = (left: number, top: number, width: number, height: number, imageWidth: number, imageHeight: number): Person => ({
  box: { x0: left / imageWidth, y0: top / imageHeight, x1: (left + width) / imageWidth, y1: (top + height) / imageHeight },
})

async function pixels(reference: string) {
  return sharp(Buffer.from(reference.slice(reference.indexOf(',') + 1), 'base64')).raw().toBuffer({ resolveWithObject: true })
}

async function assertOnlyColor(reference: string, color: 'red' | 'blue') {
  const { data, info } = await pixels(reference)
  assert.equal(info.width, 512); assert.equal(info.height, 512)
  let red = 0, blue = 0
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset] > 150 && data[offset + 1] < 100 && data[offset + 2] < 100) red++
    if (data[offset + 2] > 150 && data[offset] < 100 && data[offset + 1] < 120) blue++
  }
  assert.ok((color === 'red' ? red : blue) > 512 * 512 * 0.2, 'own head must remain visible')
  assert.equal(color === 'red' ? blue : red, 0, 'another head must not enter the reference')
}

test('가까운 두 머리 — 원래 1.7배 정사각형에서 이웃 얼굴이 들어오던 경우를 실제 픽셀로 분리', async () => {
  const width = 600, height = 400
  const photo = await fixture(width, height, [
    { left: 120, top: 80, width: 90, height: 120, color: RED },
    { left: 210, top: 80, width: 90, height: 120, color: BLUE },
  ])
  const references = await createFaceReferences(photo, [person(120, 80, 90, 120, width, height), person(210, 80, 90, 120, width, height)])
  assert.equal(references.length, 2)
  await assertOnlyColor(references[0], 'red'); await assertOnlyColor(references[1], 'blue')
})

test('안긴 아기 — 상하 머리가 조금 겹치면 작은 가장자리만 잘라 각각 보존', async () => {
  const width = 600, height = 400
  const photo = await fixture(width, height, [
    { left: 280, top: 50, width: 100, height: 150, color: RED },
    { left: 285, top: 195, width: 90, height: 110, color: BLUE },
  ])
  const references = await createFaceReferences(photo, [person(280, 50, 100, 150, width, height), person(285, 195, 90, 110, width, height)])
  assert.equal(references.length, 2)
  await assertOnlyColor(references[0], 'red'); await assertOnlyColor(references[1], 'blue')
})

test('안긴 아기의 작은 코너 겹침 — 한 변 전체를 자를 수 없으면 얼굴 중앙 밖만 가린다', async () => {
  // 실제 gen4 비전 답. 아기 머리는 엄마 머리와 왼쪽 위 코너 약 8%만 겹치지만,
  // 직사각 trim으로는 높이 17%를 잘라야 하므로 작은 코너 마스크가 필요하다.
  const width = 1536, height = 1024
  const people = [
    { box: { x0: 0.631, y0: 0.269, x1: 0.859, y1: 0.625 } },
    { box: { x0: 0.792, y0: 0.597, x1: 0.933, y1: 0.762 } },
  ]
  const blocks = people.map(({ box }, i) => ({
    left: Math.floor(box.x0 * width), top: Math.floor(box.y0 * height),
    width: Math.ceil(box.x1 * width) - Math.floor(box.x0 * width),
    height: Math.ceil(box.y1 * height) - Math.floor(box.y0 * height), color: i === 0 ? RED : BLUE,
  }))
  const references = await createFaceReferences(await fixture(width, height, blocks), people)
  assert.equal(references.length, 2)
  await assertOnlyColor(references[0], 'red'); await assertOnlyColor(references[1], 'blue')
})

test('코너 마스크 — 얼굴 중앙을 가리거나 머리 면적 10%를 넘게 가려야 하면 실패', async () => {
  const photo = await fixture(600, 600, [])
  // 중앙을 침범하지 않아도 각 머리의 10.5%가 겹치므로 허용하지 않는다.
  assert.deepEqual(await createFaceReferences(photo, [person(100, 100, 200, 200, 600, 600), person(160, 270, 200, 200, 600, 600)]), [])
  // 작은 다른 머리가 한 사람의 눈·코·입 중심을 가리는 경우도 거부한다.
  assert.deepEqual(await createFaceReferences(photo, [person(100, 100, 200, 200, 600, 600), person(150, 180, 100, 32, 600, 600)]), [])
})

test('영상 가장자리와 직사각형 머리 — 경계 밖을 자르지 않고 종횡비를 유지해 여백으로 채운다', async () => {
  const width = 600, height = 400
  const photo = await fixture(width, height, [{ left: 0, top: 0, width: 80, height: 160, color: RED }])
  const references = await createFaceReferences(photo, [person(0, 0, 80, 160, width, height)])
  assert.equal(references.length, 1)
  const { data, info } = await pixels(references[0])
  const points: [number, number][] = []
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels
    if (data[i] > 150 && data[i + 1] < 100 && data[i + 2] < 100) points.push([x, y])
  }
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y)
  const redWidth = Math.max(...xs) - Math.min(...xs) + 1, redHeight = Math.max(...ys) - Math.min(...ys) + 1
  assert.ok(Math.abs(redWidth / redHeight - 0.5) < 0.025, 'the head must not be stretched to a square')
  assert.ok(data[0] >= 225 && data[0] <= 240 && Math.abs(data[0] - data[1]) <= 2, 'letterbox must be neutral gray')
})

test('EXIF 90도 방향 — 방향 보정한 좌표로 크기를 읽고 같은 픽셀을 자른다', async () => {
  const photo = await fixture(300, 200, [
    { left: 20, top: 20, width: 100, height: 60, color: RED },
    { left: 160, top: 100, width: 100, height: 60, color: BLUE },
  ], 6)
  // clockwise rotation: 300×200 → 200×300
  const references = await createFaceReferences(photo, [person(120, 20, 60, 100, 200, 300), person(40, 160, 60, 100, 200, 300)])
  assert.equal(references.length, 2)
  await assertOnlyColor(references[0], 'red'); await assertOnlyColor(references[1], 'blue')
})

test('참고 이미지 순서 — 위치순으로 다시 정렬하지 않고 주어진 사람 순서를 유지', async () => {
  const photo = await fixture(600, 400, [
    { left: 40, top: 80, width: 90, height: 120, color: RED },
    { left: 400, top: 80, width: 90, height: 120, color: BLUE },
  ])
  const references = await createFaceReferences(photo, [person(400, 80, 90, 120, 600, 400), person(40, 80, 90, 120, 600, 400)])
  assert.equal(references.length, 2)
  await assertOnlyColor(references[0], 'blue'); await assertOnlyColor(references[1], 'red')
})

test('분리 불가 — 머리 핵심을 잘라야 하는 겹침은 일부 참조도 보내지 않는다', async () => {
  const photo = await fixture(600, 400, [{ left: 100, top: 80, width: 160, height: 150, color: RED }])
  assert.deepEqual(await createFaceReferences(photo, [person(100, 80, 160, 150, 600, 400), person(180, 80, 160, 150, 600, 400)]), [])
})

test('원본 해상도 — 32px 머리는 허용하고 31px 머리 한 명이 섞이면 전체 실패', async () => {
  const photo = await fixture(2048, 1365, [
    { left: 100, top: 100, width: 32, height: 48, color: RED },
    { left: 400, top: 100, width: 31, height: 48, color: BLUE },
  ])
  assert.equal((await createFaceReferences(photo, [person(100, 100, 32, 48, 2048, 1365)])).length, 1)
  assert.deepEqual(await createFaceReferences(photo, [person(100, 100, 32, 48, 2048, 1365), person(400, 100, 31, 48, 2048, 1365)]), [])
})

test('손상된 입력 — 틀린 사진·비정상 좌표·빈 목록은 참조를 만들지 않는다', async () => {
  const photo = await fixture(600, 400, [])
  assert.deepEqual(await createFaceReferences('data:image/jpeg;base64,broken', [person(100, 80, 90, 120, 600, 400)]), [])
  assert.deepEqual(await createFaceReferences(photo, [{ box: { x0: 0.1, y0: 0.1, x1: Number.NaN, y1: 0.5 } }]), [])
  assert.deepEqual(await createFaceReferences(photo, [{ box: { x0: -0.1, y0: 0.1, x1: 0.2, y1: 0.5 } }]), [])
  assert.deepEqual(await createFaceReferences(photo, []), [])
})
