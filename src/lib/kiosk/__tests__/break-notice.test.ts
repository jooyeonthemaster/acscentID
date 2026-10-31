import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_BREAK_NOTICE,
  breakTimeAfter,
  getBreakNoticeSnapshot,
  getServerBreakNoticeSnapshot,
  normalizeBreakNotice,
  readBreakNotice,
  saveBreakNotice,
  subscribeBreakNotice,
  type KioskBreakNotice,
} from '../break-notice'

const KEY = 'acscent-kiosk-break-notice-v1'
const activeNotice: KioskBreakNotice = {
  active: true, title: '잠시 쉬어갑니다', message: '잠시 후 다시 만나요.\n감사합니다.', resumeTime: '14:30',
}

class StorageStub {
  values = new Map<string, string>()
  failRead = false
  failWrite = false
  ignoreWrite = false
  getItem(key: string): string | null {
    if (this.failRead) throw new Error('storage read blocked')
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    if (this.failWrite) throw new Error('storage write blocked')
    if (!this.ignoreWrite) this.values.set(key, value)
  }
}

class WindowStub extends EventTarget {
  constructor(public localStorage: StorageStub) { super() }
}

function browser(storage = new StorageStub()) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const previousCustomEvent = Object.getOwnPropertyDescriptor(globalThis, 'CustomEvent')
  const target = new WindowStub(storage)
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target })
  if (typeof CustomEvent === 'undefined') {
    Object.defineProperty(globalThis, 'CustomEvent', { configurable: true, value: class extends Event {} })
  }
  return {
    storage, target,
    restore: () => {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
      else Reflect.deleteProperty(globalThis, 'window')
      if (previousCustomEvent) Object.defineProperty(globalThis, 'CustomEvent', previousCustomEvent)
      else Reflect.deleteProperty(globalThis, 'CustomEvent')
    },
  }
}

function storageEvent(key: string | null): Event {
  const event = new Event('storage')
  Object.defineProperty(event, 'key', { value: key })
  return event
}

test('기본 공지와 손상된 입력은 안전한 inactive 상태로 복구한다', () => {
  assert.deepEqual(DEFAULT_BREAK_NOTICE, {
    active: false, title: '브레이크 타임',
    message: '더 나은 체험을 위해 잠시 쉬어갑니다.\n잠시 후 다시 찾아주세요.', resumeTime: '',
  })
  for (const value of [null, undefined, [], 'bad', 1, {}]) {
    assert.deepEqual(normalizeBreakNotice(value), DEFAULT_BREAK_NOTICE)
  }
  for (const active of ['true', 1, [], {}, false]) {
    assert.equal(normalizeBreakNotice({ active }).active, false)
  }
  assert.equal(normalizeBreakNotice({ active: true }).active, true)
})

test('문구는 공백·길이를 정리하고 줄바꿈을 보존하며 재개 시간은 HH:mm만 허용한다', () => {
  assert.deepEqual(normalizeBreakNotice({
    active: true, title: '  안내  ', message: '  첫 줄\n둘째 줄  ', resumeTime: ' 09:30 ',
  }), { active: true, title: '안내', message: '첫 줄\n둘째 줄', resumeTime: '09:30' })
  assert.equal(normalizeBreakNotice({ title: '가'.repeat(50) }).title.length, 40)
  assert.equal(normalizeBreakNotice({ message: '나'.repeat(300) }).message.length, 240)
  assert.equal(normalizeBreakNotice({ title: '  ', message: '\n ' }).title, DEFAULT_BREAK_NOTICE.title)
  assert.equal(normalizeBreakNotice({ title: '  ', message: '\n ' }).message, DEFAULT_BREAK_NOTICE.message)
  for (const resumeTime of ['00:00', '09:30', '23:59']) {
    assert.equal(normalizeBreakNotice({ resumeTime }).resumeTime, resumeTime)
  }
  for (const resumeTime of ['24:00', '12:60', '9:30', '12:3', 'tomorrow', 123, null]) {
    assert.equal(normalizeBreakNotice({ resumeTime }).resumeTime, '')
  }
})

test('SSR은 안정된 기본 snapshot을 반환하고 저장·구독이 브라우저를 요구하지 않는다', () => {
  assert.equal(getBreakNoticeSnapshot(), DEFAULT_BREAK_NOTICE)
  assert.equal(getServerBreakNoticeSnapshot(), DEFAULT_BREAK_NOTICE)
  assert.equal(getServerBreakNoticeSnapshot(), getServerBreakNoticeSnapshot())
  assert.equal(saveBreakNotice(activeNotice), false)
  let notifications = 0
  const unsubscribe = subscribeBreakNotice(() => { notifications++ })
  unsubscribe()
  assert.equal(notifications, 0)
})

test('같은 값은 같은 snapshot 참조이며 편집용 복사본으로 구독 상태를 바꿀 수 없다', () => {
  const context = browser()
  try {
    const first = getBreakNoticeSnapshot()
    assert.equal(first, getBreakNoticeSnapshot())
    assert.equal(saveBreakNotice(activeNotice), true)
    const active = getBreakNoticeSnapshot()
    assert.notEqual(active, first)
    assert.equal(active, getBreakNoticeSnapshot())
    assert.equal(saveBreakNotice({ ...activeNotice }), true)
    assert.equal(active, getBreakNoticeSnapshot())
    // 순서나 여분 필드가 달라도 정규화된 값이 같으면 불필요한 렌더를 만들지 않는다.
    context.storage.values.set(KEY, JSON.stringify({ resumeTime: '14:30', message: activeNotice.message, title: activeNotice.title, active: true, extra: 'ignored' }))
    assert.equal(active, getBreakNoticeSnapshot())
    const draft = readBreakNotice()
    draft.active = false
    assert.equal(getBreakNoticeSnapshot().active, true)
    assert.equal(Object.isFrozen(getBreakNoticeSnapshot()), true)
  } finally { context.restore() }
})

test('현재 기기에 저장한 공지는 재시작 후 이어지고 해제도 재시작 뒤 유지한다', () => {
  const context = browser()
  try {
    assert.equal(saveBreakNotice(activeNotice), true)
    assert.deepEqual(JSON.parse(context.storage.getItem(KEY)!), activeNotice)
    const restarted = browser(context.storage)
    try {
      assert.deepEqual(readBreakNotice(), activeNotice)
      assert.equal(saveBreakNotice({ ...readBreakNotice(), active: false }), true)
    } finally { restarted.restore() }
    const restartedAgain = browser(context.storage)
    try {
      assert.equal(readBreakNotice().active, false)
      assert.equal(readBreakNotice().title, activeNotice.title)
    } finally { restartedAgain.restore() }
    const otherDevice = browser()
    try { assert.deepEqual(readBreakNotice(), DEFAULT_BREAK_NOTICE) } finally { otherDevice.restore() }
  } finally { context.restore() }
})

test('같은 창의 저장은 전용 이벤트로 갱신하며 구독 해제 후에는 알리지 않는다', () => {
  const context = browser()
  try {
    const observed: boolean[] = []
    const unsubscribe = subscribeBreakNotice(() => observed.push(getBreakNoticeSnapshot().active))
    assert.equal(saveBreakNotice(activeNotice), true)
    assert.equal(saveBreakNotice({ ...activeNotice, active: false }), true)
    assert.deepEqual(observed, [true, false])
    unsubscribe()
    assert.equal(saveBreakNotice(activeNotice), true)
    assert.deepEqual(observed, [true, false])
  } finally { context.restore() }
})

test('같은 기기의 다른 탭 저장과 clear는 반영하고 관계없는 key 이벤트는 무시한다', () => {
  const context = browser()
  try {
    const observed: KioskBreakNotice[] = []
    const unsubscribe = subscribeBreakNotice(() => observed.push(readBreakNotice()))
    context.storage.values.set(KEY, JSON.stringify(activeNotice))
    context.target.dispatchEvent(storageEvent('unrelated-setting'))
    assert.equal(observed.length, 0)
    context.target.dispatchEvent(storageEvent(KEY))
    assert.deepEqual(observed, [activeNotice])
    context.storage.values.clear()
    context.target.dispatchEvent(storageEvent(null))
    assert.deepEqual(observed[1], DEFAULT_BREAK_NOTICE)
    unsubscribe()
    context.target.dispatchEvent(storageEvent(KEY))
    assert.equal(observed.length, 2)
  } finally { context.restore() }
})

test('저장 실패나 무시된 쓰기는 적용·알림 없이 false이며 기존 공지를 유지한다', () => {
  const context = browser()
  try {
    assert.equal(saveBreakNotice(activeNotice), true)
    const active = getBreakNoticeSnapshot()
    let notifications = 0
    const unsubscribe = subscribeBreakNotice(() => { notifications++ })
    context.storage.failWrite = true
    assert.equal(saveBreakNotice({ ...activeNotice, active: false }), false)
    assert.equal(getBreakNoticeSnapshot(), active)
    assert.equal(notifications, 0)
    context.storage.failWrite = false
    context.storage.ignoreWrite = true
    assert.equal(saveBreakNotice({ ...activeNotice, active: false }), false)
    assert.equal(getBreakNoticeSnapshot(), active)
    assert.equal(notifications, 0)
    unsubscribe()
  } finally { context.restore() }
})

test('일시적인 읽기 실패는 마지막 active snapshot을 유지하고 처음부터 blocked면 inactive다', () => {
  const context = browser()
  try {
    assert.equal(saveBreakNotice(activeNotice), true)
    const active = getBreakNoticeSnapshot()
    context.storage.failRead = true
    assert.equal(getBreakNoticeSnapshot(), active)
    assert.equal(getBreakNoticeSnapshot().active, true)
    const savedBeforeFailure = context.storage.values.get(KEY)
    assert.equal(saveBreakNotice({ ...activeNotice, active: false }), false)
    assert.equal(context.storage.values.get(KEY), savedBeforeFailure)
    assert.equal(getBreakNoticeSnapshot(), active)
    const blockedStorage = new StorageStub()
    blockedStorage.failRead = true
    blockedStorage.failWrite = true
    const blocked = browser(blockedStorage)
    try {
      assert.deepEqual(getBreakNoticeSnapshot(), DEFAULT_BREAK_NOTICE)
      assert.equal(saveBreakNotice(activeNotice), false)
    } finally { blocked.restore() }
  } finally { context.restore() }
})

test('손상된 JSON을 inactive로 읽고 DOM getter 자체의 접근 거부도 처리한다', () => {
  const context = browser()
  try {
    context.storage.values.set(KEY, '{broken')
    assert.equal(getBreakNoticeSnapshot(), DEFAULT_BREAK_NOTICE)
    Object.defineProperty(context.target, 'localStorage', { get: () => { throw new Error('denied') } })
    assert.equal(getBreakNoticeSnapshot(), DEFAULT_BREAK_NOTICE)
    assert.equal(saveBreakNotice(activeNotice), false)
  } finally { context.restore() }
})

test('10·20·30분 재개 시간은 Asia/Seoul 기준이고 자정·연도 경계를 넘겨도 HH:mm이다', () => {
  const now = new Date('2026-10-31T04:00:00Z')
  assert.equal(breakTimeAfter(10, now), '13:10')
  assert.equal(breakTimeAfter(20, now), '13:20')
  assert.equal(breakTimeAfter(30, now), '13:30')
  assert.equal(breakTimeAfter(20, new Date('2026-10-31T14:50:00Z')), '00:10')
  assert.equal(breakTimeAfter(30, new Date('2026-12-31T14:45:00Z')), '00:15')
  assert.equal(breakTimeAfter(Number.NaN, now), '13:00')
  assert.equal(breakTimeAfter(10, new Date('invalid')), '')
})
