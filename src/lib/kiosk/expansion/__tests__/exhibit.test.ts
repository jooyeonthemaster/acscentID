import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { acknowledgeExhibit, closeExhibit, createExhibitRoom, heartbeatExhibit, publishExhibit, readExhibitRoom } from '../exhibit-store'
import { EXHIBIT_LIVE_MS, isViewerLive, nextExhibitContent, parseExhibitCommand, type ExhibitCommand } from '../exhibit'
import { rgbMatches, rgbHex, rgbHint, scienceResult } from '@/app/kiosk/experience/expansion/interactive-data'
import { ExhibitRequestError } from '../exhibit-client'

test('expired or unauthorized receiver connections are terminal while a storage outage remains retryable', () => {
  for (const status of [401, 403, 404, 410]) assert.equal(new ExhibitRequestError('종료', status).terminal, true)
  for (const status of [408, 429, 500, 503]) assert.equal(new ExhibitRequestError('재시도', status).terminal, false)
})

test('RGB mission tolerance is channel-specific and exported records reflect actual attempts', () => {
  assert.equal(rgbHex([255, 255, 0]), '#FFFF00')
  assert.equal(rgbMatches([243, 243, 12], [255, 255, 0]), true)
  assert.equal(rgbMatches([242, 255, 0], [255, 255, 0]), false)
  assert.match(rgbHint([0, 0, 255], [255, 255, 0]), /빨강/)
  const result = scienceResult([{ mission: 0, rgb: [255, 255, 0], attempts: 3 }], [20, 30, 40])
  assert.match(result.sections[1].items![0], /3번/)
  assert.deepEqual(result.palette, ['#141E28', '#FFFF00'])
})
test('exhibit protocol rejects unsupported CSS values, malformed positions and oversized public text', () => {
  assert.throws(() => parseExhibitCommand({ kind: 'vision-wall', message: { text: 'a'.repeat(61), color: '#F1D481', shape: 'note', x: 50, y: 50 } }))
  assert.throws(() => parseExhibitCommand({ kind: 'vision-wall', message: { text: 'Hi', color: 'url(https://invalid.example)', shape: 'note', x: 50, y: 50 } }))
  assert.throws(() => parseExhibitCommand({ kind: 'product', config: { model: 'frame', color: '#E8DCC7', brightness: NaN, rotation: 0, zoom: 100, on: true } }))
  assert.throws(() => parseExhibitCommand({ kind: 'heritage', config: { scene: 'court', era: 'past', light: 'day', comparison: 101 } }))
  assert.equal(isViewerLive(1000, 1000 + EXHIBIT_LIVE_MS), false)
  assert.equal(isViewerLive(1000, 900), false)
})
test('wall retains a bounded history instead of replacing each previous participant', () => {
  const command: ExhibitCommand = { kind: 'vision-wall', message: { text: '우리의 내일', color: '#F1D481', shape: 'note', x: 50, y: 50 } }
  let content = nextExhibitContent(null, command, 'first', 1000)
  for (let i = 0; i < 32; i++) content = nextExhibitContent(content, command, String(i), 1000 + i)
  assert.equal(content.kind, 'vision-wall')
  if (content.kind === 'vision-wall') { assert.equal(content.messages.length, 30); assert.equal(content.messages.at(-1)!.id, '31') }
})
test('durable local transport separates capabilities, requires heartbeat, and confirms only an explicit matching render ACK', async () => {
  assert.notEqual(process.env.NODE_ENV, 'production', 'Run the local transport test only in development/test')
  const room = await createExhibitRoom('vision-wall')
  const command: ExhibitCommand = { kind: 'vision-wall', message: { text: '연결 검증용 문장', color: '#80AEA0', shape: 'arch', x: 25, y: 40 } }
  try {
    await assert.rejects(readExhibitRoom(room.id, '0'.repeat(64)), /권한/)
    await assert.rejects(heartbeatExhibit(room.id, room.controllerToken), /해당 작업/)
    await assert.rejects(publishExhibit(room.id, room.viewerToken, command, randomUUID()), /해당 작업/)
    await assert.rejects(publishExhibit(room.id, room.controllerToken, command, randomUUID()), /연결되어 있지/)
    const ready = await heartbeatExhibit(room.id, room.viewerToken)
    assert.equal(ready.connected, true)
    assert.equal('controller_hash' in ready, false)
    const requestId = randomUUID()
    const posted = await publishExhibit(room.id, room.controllerToken, command, requestId)
    assert.equal(posted.sequence, 1)
    assert.equal(posted.acknowledgedSequence, 0)
    await assert.rejects(acknowledgeExhibit(room.id, room.viewerToken, 2), /현재 화면/)
    await assert.rejects(acknowledgeExhibit(room.id, room.controllerToken, 1), /해당 작업/)
    assert.equal((await acknowledgeExhibit(room.id, room.viewerToken, 1)).acknowledgedSequence, 1)
    const retried = await publishExhibit(room.id, room.controllerToken, command, requestId)
    assert.equal(retried.sequence, 1)
    if (retried.content?.kind === 'vision-wall') assert.equal(retried.content.messages.length, 1)
    const next = await publishExhibit(room.id, room.controllerToken, { ...command, message: { ...command.message, text: '다음 참여자' } }, randomUUID())
    assert.equal(next.sequence, 2)
    assert.equal(next.acknowledgedSequence, 1)
    if (next.content?.kind === 'vision-wall') assert.equal(next.content.messages.length, 2)
    assert.equal((await readExhibitRoom(room.id, room.viewerToken)).sequence, 2)
    await closeExhibit(room.id, room.controllerToken)
    await assert.rejects(readExhibitRoom(room.id, room.viewerToken), /만료/)
  } finally { await unlink(path.join(process.cwd(), '.data/kiosk-exhibit', `${room.id}.json`)).catch(() => undefined) }
})

test('a changed product needs its own render acknowledgement and repeat publication after success is idempotent', async () => {
  assert.notEqual(process.env.NODE_ENV, 'production')
  const room = await createExhibitRoom('product')
  const command: ExhibitCommand = { kind: 'product', config: { model: 'frame', color: '#E8DCC7', brightness: 70, rotation: 40, zoom: 100, on: true } }
  try {
    await heartbeatExhibit(room.id, room.viewerToken)
    const firstId = randomUUID()
    await publishExhibit(room.id, room.controllerToken, command, firstId)
    await acknowledgeExhibit(room.id, room.viewerToken, 1)
    const repeated = await publishExhibit(room.id, room.controllerToken, command, firstId)
    assert.equal(repeated.sequence, 1)
    assert.equal(repeated.acknowledgedSequence, 1)
    const changed = await publishExhibit(room.id, room.controllerToken, { ...command, config: { ...command.config, color: '#BA715F' } }, randomUUID())
    assert.equal(changed.sequence, 2)
    assert.equal(changed.acknowledgedSequence, 1)
    await assert.rejects(acknowledgeExhibit(room.id, room.viewerToken, 1), /현재 화면/)
    assert.equal((await acknowledgeExhibit(room.id, room.viewerToken, 2)).acknowledgedSequence, 2)
  } finally { await unlink(path.join(process.cwd(), '.data/kiosk-exhibit', `${room.id}.json`)).catch(() => undefined) }
})
