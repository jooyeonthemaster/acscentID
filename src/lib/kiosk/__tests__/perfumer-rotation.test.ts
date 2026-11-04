import assert from 'node:assert/strict'
import { test } from 'node:test'
import { perfumes } from '@/data/perfumes'
import {
  normalizePerfumerRotation,
  perfumerCandidates,
  pickPerfumerScent,
  readPerfumerRotation,
  recordPerfumerScent,
  type PerfumerRotation,
} from '../perfumer-rotation'

const IDS = perfumes.map((perfume) => perfume.id)
const KEY = 'acscent-kiosk-perfumer-rotation-v1'

function consume(rotation: PerfumerRotation, id: string): PerfumerRotation {
  return normalizePerfumerRotation({
    remaining: rotation.remaining.filter((candidate) => candidate !== id),
    recent: [...rotation.recent.filter((candidate) => candidate !== id), id].slice(-3),
  })
}

function browser(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } })
  return () => {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else Reflect.deleteProperty(globalThis, 'window')
  }
}

function storageWith(rotation: unknown = normalizePerfumerRotation(undefined)) {
  const values = new Map<string, string>([[KEY, JSON.stringify(rotation)]])
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

test('손상된 상태는 실제 30종만 남기고, 중복과 최근 기록 순서를 복구한다', () => {
  for (const raw of [null, undefined, 42, 'bad', [], {}, { remaining: [] }, { remaining: ['nope'] }]) {
    assert.deepEqual(normalizePerfumerRotation(raw), { remaining: IDS, recent: [] })
  }
  assert.deepEqual(normalizePerfumerRotation({
    remaining: [IDS[5], 'nope', IDS[5], 10, IDS[2]],
    recent: [IDS[1], IDS[2], IDS[1], IDS[3], IDS[4]],
  }), { remaining: [IDS[5], IDS[2]], recent: [IDS[1], IDS[3], IDS[4]] })
})

test('한 순환은 30회 각각 한 번이고, 다음 순환에서도 직전 세 향을 피한다', () => {
  let rotation = normalizePerfumerRotation(undefined)
  const firstCycle: string[] = []
  for (let index = 0; index < IDS.length; index++) {
    const id = pickPerfumerScent(rotation, [], () => 0)
    assert.ok(!rotation.recent.includes(id))
    firstCycle.push(id)
    rotation = consume(rotation, id)
  }
  assert.equal(new Set(firstCycle).size, 30)
  assert.deepEqual(new Set(firstCycle), new Set(IDS))
  const lastThree = firstCycle.slice(-3)
  for (let index = 0; index < 3; index++) {
    const id = pickPerfumerScent(rotation, [], () => 0.999999)
    assert.ok(!rotation.recent.includes(id))
    if (index === 0) assert.ok(!lastThree.includes(id))
    rotation = consume(rotation, id)
  }
})

test('같은 입력과 10·12번에 치우친 기록에서도 300회는 각 향 10회씩 사용한다', () => {
  const storage = storageWith()
  const restore = browser(storage)
  const history = Array.from({ length: 50 }, (_, index) => IDS[index % 2 ? 9 : 11])
  const counts = new Map<string, number>()
  try {
    for (let index = 0; index < 300; index++) {
      const rotation = readPerfumerRotation()
      const id = pickPerfumerScent(rotation, history, () => 0)
      assert.ok(!rotation.recent.includes(id))
      counts.set(id, (counts.get(id) ?? 0) + 1)
      recordPerfumerScent(id)
    }
    assert.equal(counts.size, 30)
    assert.ok([...counts.values()].every((count) => count === 10))
  } finally { restore() }
})

test('운영 기록의 빈도가 가장 낮은 후보를 우선하고 동률은 무작위로 고른다', () => {
  const rotation = { remaining: IDS.slice(0, 4), recent: [IDS[20]] }
  const history = [IDS[0], IDS[0], IDS[1], IDS[1]]
  assert.equal(pickPerfumerScent(rotation, history, () => 0), IDS[2])
  assert.equal(pickPerfumerScent(rotation, history, () => 0.999), IDS[3])
  assert.equal(pickPerfumerScent(rotation, history, () => 1), IDS[3])
  assert.equal(pickPerfumerScent(rotation, history, () => Number.NaN), IDS[2])
})

test('새 기기는 운영 기록 직전 세 향을 피하고 후보가 그 셋뿐이면 순환을 우선한다', () => {
  const history = IDS.slice(0, 3)
  assert.equal(pickPerfumerScent(normalizePerfumerRotation(undefined), history, () => 0), IDS[3])
  assert.equal(pickPerfumerScent({ remaining: history, recent: [] }, history, () => 0), IDS[0])
})

test('최근 향만 남은 잘못된 상태에서도 다른 실제 향으로 복구한다', () => {
  const rotation = { remaining: IDS.slice(0, 3), recent: IDS.slice(0, 3) }
  const candidates = perfumerCandidates(rotation)
  assert.equal(candidates.length, 27)
  assert.ok(candidates.every((id) => !rotation.recent.includes(id)))
  assert.equal(pickPerfumerScent(rotation, [], () => 0), IDS[3])
})

test('성공 기록만 향을 소진하고, 저장본을 다시 읽어 재시작 후에도 이어간다', () => {
  const storage = storageWith()
  const restore = browser(storage)
  try {
    const first = readPerfumerRotation()
    pickPerfumerScent(first, [], () => 0)
    assert.deepEqual(readPerfumerRotation(), first, '후보 선택만으로는 소진하지 않는다')
    recordPerfumerScent(IDS[0])
    recordPerfumerScent(IDS[1])
    const persisted = JSON.parse(storage.values.get(KEY)!) as PerfumerRotation
    assert.equal(persisted.remaining.length, 28)
    assert.deepEqual(persisted.recent, IDS.slice(0, 2))

    // 재시작 때와 같이 저장본만 주어도 미사용 목록과 최근 기록을 그대로 복구한다.
    assert.deepEqual(normalizePerfumerRotation(persisted), readPerfumerRotation())
    const resumedStorage = storageWith(persisted)
    const restoreResumed = browser(resumedStorage)
    try {
      assert.deepEqual(readPerfumerRotation(), persisted)
      recordPerfumerScent(IDS[2])
      assert.equal(readPerfumerRotation().remaining.length, 27)
      assert.deepEqual(readPerfumerRotation().recent, IDS.slice(0, 3))
    } finally { restoreResumed() }
    recordPerfumerScent('nope')
    assert.deepEqual(readPerfumerRotation(), persisted)
    assert.deepEqual(Object.keys(persisted).sort(), ['recent', 'remaining'])
  } finally { restore() }
})

test('각 성공 때 최신 저장 상태를 읽고 외부에서 반환값을 바꿔도 내부 상태는 보존한다', () => {
  const storage = storageWith({ remaining: IDS.slice(2), recent: IDS.slice(0, 2) })
  const restore = browser(storage)
  try {
    const snapshot = readPerfumerRotation()
    snapshot.remaining.length = 0
    snapshot.recent.push('nope')
    storage.values.set(KEY, JSON.stringify({ remaining: IDS.slice(4), recent: IDS.slice(1, 4) }))
    recordPerfumerScent(IDS[4])
    assert.equal(readPerfumerRotation().remaining.length, 25)
    assert.deepEqual(readPerfumerRotation().recent, IDS.slice(2, 5))
  } finally { restore() }
})

test('저장소 쓰기 실패 때 메모리로 순환을 이어가고 복구 후 최신 상태를 저장한다', () => {
  const storage = storageWith()
  let blocked = false
  const restore = browser({
    getItem: storage.getItem,
    setItem: (key, value) => {
      if (blocked) throw new Error('storage unavailable')
      storage.setItem(key, value)
    },
  })
  try {
    readPerfumerRotation()
    blocked = true
    recordPerfumerScent(IDS[0])
    recordPerfumerScent(IDS[1])
    assert.equal(readPerfumerRotation().remaining.length, 28)
    assert.deepEqual(readPerfumerRotation().recent, IDS.slice(0, 2))
    blocked = false
    const recovered = readPerfumerRotation()
    assert.deepEqual(JSON.parse(storage.values.get(KEY)!), recovered)
  } finally { restore() }
})

test('localStorage 접근 차단과 손상된 JSON도 처리하고 DOM 없는 서버에서는 상태를 공유하지 않는다', () => {
  const storage = storageWith()
  const restore = browser(storage)
  try {
    readPerfumerRotation()
    storage.values.set(KEY, '{broken')
    assert.deepEqual(readPerfumerRotation(), { remaining: IDS, recent: [] })
    const restoreBlocked = browser({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    try {
      recordPerfumerScent(IDS[0])
      assert.equal(readPerfumerRotation().remaining.length, 29)
    } finally { restoreBlocked() }
    // 미저장 메모리를 실제 저장소에 반영해 다음 호출에도 이어갈 수 있다.
    readPerfumerRotation()
  } finally { restore() }
  recordPerfumerScent(IDS[1])
  assert.deepEqual(readPerfumerRotation(), { remaining: IDS, recent: [] })
})
