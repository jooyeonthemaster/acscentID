import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyzeParticipants, cameraStory, newParticipant, participantComplete, validateParticipants, type Participant } from '../social'

const participant = (index: number, patch: Partial<Participant> = {}): Participant => ({ ...newParticipant(index), name: `참여자 ${index + 1}`, role: index % 2 ? 'finish' : 'idea', interests: ['art'], pace: 'calm', planning: 'planned', conversation: 'listen', ...patch })

test('팀 전체 공통 관심사와 일부의 관심사를 구분한다', () => {
  const people = [participant(0, { interests: ['art', 'food'] }), participant(1, { interests: ['art', 'food'] }), participant(2, { interests: ['art', 'nature'] })]
  const result = analyzeParticipants('team', people)
  assert.deepEqual(result.common, ['art'])
  assert.deepEqual(result.interests, [{ id: 'art', count: 3 }, { id: 'food', count: 2 }, { id: 'nature', count: 1 }])
  assert.ok(result.result.sections.some((section) => section.title === '한 장의 공동 무드보드'))
  assert.equal(result.result.metrics?.find((metric) => metric.label === '맛있는 발견')?.value, 2)
})

test('팀 역할에는 해당 역할을 직접 선택한 이름만 포함한다', () => {
  const result = analyzeParticipants('team', [participant(0, { name: '하늘', role: 'idea' }), participant(1, { name: '수아', role: 'finish' })]).result
  assert.deepEqual(result.sections.find((section) => section.title === '해 보고 싶은 역할')?.items, ['아이디어 · 하늘', '실행 · 수아'])
  assert.match(result.sections.find((section) => section.title === '다음 협업에서 정할 것')!.body, /정리, 연결/)
})

test('공통 관심사가 없으면 있다고 표시하지 않고 각자 취향 활동을 제안한다', () => {
  const result = analyzeParticipants('couple', [participant(0, { interests: ['food'] }), participant(1, { interests: ['nature'] })])
  assert.deepEqual(result.common, [])
  assert.match(result.result.summary, /모두가 함께 고른 관심사는 없어요/)
  assert.ok(result.result.sections.some((section) => section.title === '동네의 새로운 맛 찾기'))
  assert.ok(result.result.sections.some((section) => section.title === '가까운 공원 산책'))
})

test('커플의 같은 응답과 다른 응답을 실제로 비교한다', () => {
  const people = [participant(0), participant(1, { pace: 'active', planning: 'free' })]
  const result = analyzeParticipants('couple', people).result
  assert.deepEqual(result.sections.find((section) => section.title === '우리가 같은 점')?.items, ['대화하는 방식 · 천천히 듣기'])
  const differences = result.sections.find((section) => section.title === '서로에게 물어볼 점')!.items!
  assert.equal(differences.length, 2)
  assert.match(differences[0], /참여자 1 — 여유롭게 \/ 참여자 2 — 활기차게/)
})

test('응답 수정은 결과에 반영되며 원본 응답을 변경하지 않는다', () => {
  const people = [participant(0), participant(1)]
  const original = JSON.stringify(people)
  const first = analyzeParticipants('couple', people)
  assert.equal(JSON.stringify(people), original)
  const second = analyzeParticipants('couple', [people[0], { ...people[1], interests: ['music'], pace: 'active' }])
  assert.notEqual(first.result.id, second.result.id)
  assert.notDeepEqual(first.common, second.common)
})

test('2~6명 팀 및 정확히 두 사람 커플 인원 제한을 적용한다', () => {
  assert.ok(validateParticipants('team', [participant(0)]))
  assert.equal(validateParticipants('team', Array.from({ length: 6 }, (_, i) => participant(i))), null)
  assert.ok(validateParticipants('team', Array.from({ length: 7 }, (_, i) => participant(i))))
  assert.ok(validateParticipants('couple', [participant(0), participant(1), participant(2)]))
})

test('미응답·이름 공백·잘못된 옵션으로 성공 결과를 만들지 않는다', () => {
  for (const patch of [{ name: '  ' }, { interests: [] }, { interests: ['unknown'] }, { interests: ['art', 'art'] }, { role: '' }]) {
    const people = [participant(0), participant(1, patch)]
    assert.equal(participantComplete('team', people[1]), false)
    assert.throws(() => analyzeParticipants('team', people))
  }
  assert.equal(participantComplete('couple', participant(0, { conversation: '' })), false)
  assert.equal(participantComplete('couple', participant(0, { role: '' })), true)
})

test('참여자 ID가 겹치면 독립 응답으로 집계하지 않는다', () => {
  assert.throws(() => analyzeParticipants('team', [participant(0), participant(0)]), /겹칩니다/)
})

test('가상 스타 결과는 고른 무드를 반영하며 없는 선택을 거절한다', () => {
  const soft = cameraStory('lookalike', 'soft')
  const bright = cameraStory('lookalike', 'bright')
  assert.match(soft.title, /서아/)
  assert.match(bright.title, /준/)
  assert.notEqual(soft.sections[0].body, bright.sections[0].body)
  assert.throws(() => cameraStory('lookalike', 'unknown'))
  assert.match(soft.footnote!, /가상 인물/)
})

test('관상 이야기는 선택 주제를 반영하며 손금은 설명용임을 표시한다', () => {
  assert.notEqual(cameraStory('face', 'rest').summary, cameraStory('face', 'connection').summary)
  assert.throws(() => cameraStory('face', ''))
  const palm = cameraStory('palm', '')
  assert.equal(palm.sections.length, 3)
  assert.match(palm.summary, /실제 사진에서 손금을 추출하거나 해석한 결과가 아니/)
  assert.match(palm.footnote!, /수명을 예측하지 않/)
})

test('출력 결과에는 사진·랜드마크·바이너리가 포함되지 않는다', () => {
  for (const result of [cameraStory('face', 'start'), cameraStory('lookalike', 'chic'), cameraStory('palm', '')]) {
    assert.equal(Object.hasOwn(result, 'photo'), false)
    assert.equal(Object.hasOwn(result, 'landmarks'), false)
    assert.doesNotMatch(JSON.stringify(result), /data:image|base64|blob:/)
  }
})
