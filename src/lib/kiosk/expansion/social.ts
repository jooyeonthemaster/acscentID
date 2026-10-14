import type { ChoiceOption, ExperienceResult } from './types'

export type SocialId = 'team' | 'couple'
export interface Participant {
  id: string
  name: string
  role: string
  interests: string[]
  pace: string
  planning: string
  conversation: string
}

export const ROLES: ChoiceOption[] = [
  { id: 'idea', label: '아이디어', note: '새로운 생각을 제안해요' },
  { id: 'organize', label: '정리', note: '생각을 구체적인 계획으로' },
  { id: 'connect', label: '연결', note: '서로의 이야기를 이어요' },
  { id: 'finish', label: '실행', note: '계획을 행동으로 옮겨요' },
]
export const INTERESTS: ChoiceOption[] = [
  { id: 'food', label: '맛있는 발견', note: '요리·카페·새로운 맛' },
  { id: 'art', label: '창작과 감상', note: '전시·그림·만들기' },
  { id: 'nature', label: '자연과 산책', note: '공원·풍경·가벼운 걷기' },
  { id: 'games', label: '놀이와 도전', note: '보드게임·작은 미션' },
  { id: 'learning', label: '함께 배우기', note: '책·새로운 기술·체험' },
  { id: 'music', label: '음악과 이야기', note: '플레이리스트·공연' },
]
export const PACES: ChoiceOption[] = [{ id: 'calm', label: '여유롭게', note: '한곳에서 충분히' }, { id: 'active', label: '활기차게', note: '여러 곳을 탐험' }]
export const PLANS: ChoiceOption[] = [{ id: 'planned', label: '미리 정하기', note: '예약과 계획이 편해요' }, { id: 'free', label: '그날 정하기', note: '즉흥적인 발견이 좋아요' }]
export const CONVERSATIONS: ChoiceOption[] = [{ id: 'listen', label: '천천히 듣기', note: '생각할 시간을 주세요' }, { id: 'exchange', label: '바로 나누기', note: '대화하면서 생각해요' }]

export const newParticipant = (index: number): Participant => ({ id: `person-${index + 1}`, name: '', role: '', interests: [], pace: '', planning: '', conversation: '' })
export const optionLabel = (options: ChoiceOption[], id: string): string => options.find((option) => option.id === id)?.label ?? ''
const known = (options: ChoiceOption[], value: string) => options.some((option) => option.id === value)
export function participantComplete(id: SocialId, person: Participant): boolean {
  return Boolean(person.name.trim()) && person.interests.length > 0 && person.interests.length <= 2
    && new Set(person.interests).size === person.interests.length && person.interests.every((value) => known(INTERESTS, value))
    && (id === 'team' ? known(ROLES, person.role) : known(PACES, person.pace) && known(PLANS, person.planning) && known(CONVERSATIONS, person.conversation))
}
export function validateParticipants(id: SocialId, people: Participant[]): string | null {
  if (people.length < 2 || people.length > (id === 'couple' ? 2 : 6)) return id === 'couple' ? '두 사람이 함께 참여해 주세요.' : '참여자는 2명부터 6명까지예요.'
  if (new Set(people.map((person) => person.id)).size !== people.length) return '참여자 정보가 겹칩니다. 인원을 다시 확인해 주세요.'
  const incomplete = people.findIndex((person) => !participantComplete(id, person))
  return incomplete < 0 ? null : `${incomplete + 1}번째 참여자의 이름과 답변을 확인해 주세요.`
}
const ACTIVITY: Record<string, { team: string; couple: string; detail: string }> = {
  food: { team: '우리 팀 간식 지도 만들기', couple: '동네의 새로운 맛 찾기', detail: '각자 먹고 싶은 한 가지를 고르고 서로의 선택을 나누세요. 알레르기와 제외할 재료를 먼저 확인해요.' },
  art: { team: '한 장의 공동 무드보드', couple: '작은 전시와 감상 한 문장', detail: '마음에 드는 작품이나 색을 하나씩 골라 이유를 말해 보세요. 서로 다른 선택도 그대로 남겨요.' },
  nature: { team: '짧은 산책과 발견 공유', couple: '가까운 공원 산책', detail: '둘 다 편한 거리와 쉬는 곳부터 정하세요. 오늘 새로 발견한 풍경을 한 가지씩 나눠요.' },
  games: { team: '협동 보드게임 한 판', couple: '둘이 해결하는 작은 미션', detail: '경쟁보다 함께 끝내는 미션을 골라요. 중간에 역할을 바꾸고 좋았던 도움을 한 가지 말해 보세요.' },
  learning: { team: '서로 알려 주는 10분 수업', couple: '함께 배우는 하루 체험', detail: '각자 처음 해 보고 싶은 것을 하나씩 제안해요. 부담 없는 짧은 체험부터 시작하세요.' },
  music: { team: '팀 플레이리스트 만들기', couple: '서로를 위한 두 곡', detail: '각자 좋아하는 곡 한 곡과 그 이유를 나눠요. 같은 장르가 아니어도 이야기의 시작이 됩니다.' },
}
export interface SocialAnalysis { result: ExperienceResult; common: string[]; interests: { id: string; count: number }[]; missing: number[] }

/** 선택 응답만 집계한다. 외모·심리 능력·관계의 성공을 추정하지 않는다. */
export function analyzeParticipants(id: SocialId, people: Participant[]): SocialAnalysis {
  const error = validateParticipants(id, people)
  if (error) throw new Error(error)
  const interests = INTERESTS.map((option) => ({ id: option.id, count: people.filter((person) => person.interests.includes(option.id)).length })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count)
  const common = interests.filter((item) => item.count === people.length).map((item) => item.id)
  const names = people.map((person) => person.name.trim()).join(' · ')
  const interestSummary = interests.map((item) => `${optionLabel(INTERESTS, item.id)} · ${item.count}/${people.length}명`)
  const activities = (common.length ? common : interests.slice(0, 2).map((item) => item.id)).map((key) => ({ title: ACTIVITY[key][id], body: ACTIVITY[key].detail }))
  const basic: ExperienceResult = {
    id: `${id}-${JSON.stringify(people.map(({ name, role, interests: selected, pace, planning, conversation }) => [name.trim(), role, [...selected].sort(), pace, planning, conversation]))}`,
    title: common.length ? '같이 좋아하는 것에서 시작해요' : '다른 취향이 만나 넓어지는 우리',
    subtitle: names,
    summary: common.length ? `${people.length}명 모두 고른 관심사는 ${common.map((key) => optionLabel(INTERESTS, key)).join(', ')}예요. 이 관심사로 작은 활동을 시작해 보세요.` : '모두가 함께 고른 관심사는 없어요. 각자 좋아하는 것을 한 번씩 번갈아 경험하는 것도 좋은 시작입니다.',
    tags: [id === 'team' ? `${people.length}명의 팀` : '두 사람의 선택', ...common.map((key) => optionLabel(INTERESTS, key))],
    sections: [{ title: '선택한 관심사', body: '오늘 직접 고른 응답을 집계했어요.', items: interestSummary }],
    metrics: interests.map((item) => ({ label: optionLabel(INTERESTS, item.id), value: item.count, max: people.length })),
    footnote: '오늘 직접 선택한 답변을 비교한 결과입니다. 성격 진단이나 관계의 성공을 예측하는 검사가 아닙니다.',
  }
  if (id === 'team') {
    const roles = ROLES.map((role) => ({ ...role, names: people.filter((person) => person.role === role.id).map((person) => person.name.trim()) }))
    basic.sections.push({ title: '해 보고 싶은 역할', body: '잘하는 능력을 판정한 것이 아니라 각자 고른 선호 역할이에요.', items: roles.filter((role) => role.names.length).map((role) => `${role.label} · ${role.names.join(', ')}`) })
    const unchosen = roles.filter((role) => !role.names.length).map((role) => role.label)
    basic.sections.push({ title: '다음 협업에서 정할 것', body: unchosen.length ? `아직 고르지 않은 역할(${unchosen.join(', ')})은 번갈아 맡거나 함께 맡아 보세요.` : '모든 역할에 참여자가 있어요. 진행 도중 역할을 바꿔 보고 서로에게 필요한 도움도 물어보세요.' })
  } else {
    const [first, second] = people
    const pairs = [{ key: 'pace' as const, label: '함께 보내는 속도', options: PACES }, { key: 'planning' as const, label: '계획하는 방식', options: PLANS }, { key: 'conversation' as const, label: '대화하는 방식', options: CONVERSATIONS }]
    const same = pairs.filter((item) => first[item.key] === second[item.key])
    const different = pairs.filter((item) => first[item.key] !== second[item.key])
    basic.sections.push({ title: '우리가 같은 점', body: same.length ? '오늘의 답변에서 같은 선택을 찾았어요.' : '진행 방식은 서로 다른 선택을 했어요. 공통 관심사부터 대화를 시작해 보세요.', items: same.map((item) => `${item.label} · ${optionLabel(item.options, first[item.key])}`) })
    basic.sections.push({ title: '서로에게 물어볼 점', body: different.length ? '다름은 점수가 아니에요. 이번에는 누구의 방식을 먼저 해 볼지 정해 보세요.' : '이번에는 같은 선택을 했어요. 다음 만남에도 지금의 취향이 같은지 물어보세요.', items: different.map((item) => `${item.label}: ${first.name.trim()} — ${optionLabel(item.options, first[item.key])} / ${second.name.trim()} — ${optionLabel(item.options, second[item.key])}`) })
  }
  basic.sections.push(...activities)
  return { result: basic, common, interests, missing: [] }
}

export const STAR_MOODS = [
  { id: 'soft', name: '서아', title: '맑고 편안한 무드', words: ['담백함', '포근함'], color: '#69afd6', light: '부드러운 창가 빛', styling: '아이보리와 편안한 질감', action: '좋아하는 공간에서 편안한 표정을 기록해 보세요.' },
  { id: 'chic', name: '루미', title: '차분하고 선명한 무드', words: ['절제', '선명함'], color: '#74639a', light: '옆에서 비추는 은은한 빛', styling: '짙은 단색과 간결한 선', action: '단색 배경에서 자신이 좋아하는 포즈를 찾아보세요.' },
  { id: 'bright', name: '준', title: '밝고 경쾌한 무드', words: ['리듬', '생동감'], color: '#e5a249', light: '밝고 고르게 퍼지는 빛', styling: '산뜻한 포인트 색과 가벼운 질감', action: '좋아하는 음악을 들으며 자연스러운 움직임을 기록해 보세요.' },
] as const
export const FACE_TOPICS = [{ id: 'start', label: '새로운 시작' }, { id: 'connection', label: '따뜻한 만남' }, { id: 'rest', label: '나를 위한 쉼' }] as const
export const PALM_STORIES = [
  { id: 'heart', label: '마음의 선', keyword: '따뜻한 한마디', story: '전통 손금 이야기에서 마음을 상징하는 선에서 착안했어요. 오늘 고마웠던 사람에게 짧은 말을 전해 보는 건 어떨까요?', action: '고마운 사람 한 명에게 안부를 전해요.' },
  { id: 'head', label: '생각의 선', keyword: '호기심 한 조각', story: '생각을 상징하는 선을 이야기의 출발점으로 삼았어요. 궁금했던 것을 하나 적고 아주 작은 첫 질문을 만들어 보세요.', action: '궁금했던 질문 하나를 메모해요.' },
  { id: 'life', label: '일상의 선', keyword: '작은 쉼표', story: '일상을 상징하는 이야기예요. 수명이나 건강을 뜻하지 않아요. 오늘 편안했던 순간 하나를 떠올려 보세요.', action: '잠깐 쉬며 오늘 좋았던 장면을 떠올려요.' },
] as const

/** 사진/랜드마크를 받지 않는다. 사진 유무 검증 이후 선택 주제만으로 이야기를 구성한다. */
export function cameraStory(id: 'lookalike' | 'face' | 'palm', choice: string): ExperienceResult {
  if (id === 'lookalike') {
    const mood = STAR_MOODS.find((item) => item.id === choice)
    if (!mood) throw new Error('원하는 분위기를 골라 주세요.')
    return { id: `${id}-${choice}`, title: `${mood.name} · ${mood.title}`, subtitle: '내가 선택한 가상 스타 무드', summary: `직접 고른 ${mood.title}를 사진 연출 아이디어로 정리했어요.`, tags: [...mood.words], palette: [mood.color, '#eef5fa', '#203e63'], sections: [{ title: '사진 분위기', body: mood.light }, { title: '스타일 힌트', body: mood.styling }, { title: '직접 해 보기', body: mood.action }], footnote: '서아·루미·준은 가상 인물입니다. 실존 연예인 식별·얼굴 유사도 비교를 하지 않습니다. 결과는 선택한 분위기로 만들며 촬영 사진은 업로드하지 않습니다.' }
  }
  if (id === 'palm') return { id: 'palm-stories', title: '손 위에 펼치는 오늘의 이야기', subtitle: '선 세 개, 작은 행동 세 가지', summary: '손 모양을 확인했어요. 아래 선은 설명을 위한 그림이며, 실제 사진에서 손금을 추출하거나 해석한 결과가 아니에요.', tags: PALM_STORIES.map((item) => item.keyword), sections: PALM_STORIES.map((item) => ({ title: item.label, body: item.story, items: [item.action] })), footnote: '전통 손금에서 착안한 창작 이야기입니다. 실제 손금 선을 추출하지 않으며 미래·건강·수명을 예측하지 않습니다. 촬영 사진은 업로드하지 않습니다.' }
  const topic = FACE_TOPICS.find((item) => item.id === choice)
  if (!topic) throw new Error('이야기 주제를 골라 주세요.')
  const stories: Record<string, [string, string, string]> = {
    start: ['한 걸음의 용기', '새로운 시작을 고른 당신에게, 작게 시작하는 이야기를 전해요. 준비가 완벽하지 않아도 첫 단계를 아주 작게 만들 수 있어요.', '오늘 해 보고 싶은 일의 첫 단계 하나를 적어 보세요.'],
    connection: ['따뜻한 연결', '따뜻한 만남을 고른 오늘, 말을 건네고 듣는 순간을 떠올려 봐요. 상대에게 궁금한 질문 하나가 대화의 문을 열 수 있어요.', '만나고 싶은 사람에게 안부를 물어보세요.'],
    rest: ['내 안의 쉼표', '나를 위한 쉼을 고른 오늘, 해야 하는 일 사이에 작은 빈칸을 남겨 보세요. 잠깐의 여유도 소중한 선택이에요.', '나를 편안하게 하는 장소나 음악 한 가지를 골라 보세요.'],
  }
  const [title, body, action] = stories[choice]
  return { id: `${id}-${choice}`, title, subtitle: topic.label, summary: body, tags: [topic.label, '재미로 보는 이야기'], sections: [{ title: '오늘의 이야기', body }, { title: '오늘의 한마디', body: '나의 선택은 내가 만들어 갈 수 있어요.' }, { title: '작은 행동', body: action }], footnote: '얼굴의 존재만 기기에서 확인합니다. 이야기는 선택한 주제로 만들며 외모에서 성격·능력·건강·운명을 추정하지 않습니다. 촬영 사진은 업로드하지 않습니다.' }
}
