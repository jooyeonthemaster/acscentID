import type { ExperienceResult, ResultSection } from '@/lib/kiosk/expansion/types'
import type { HeritageConfig, ProductConfig, WallDraft } from '@/lib/kiosk/expansion/exhibit'
export type RGB = [number, number, number]
export type RgbMission = { name: string; target: RGB; hint: string; from?: string }
export const RGB_MISSIONS: RgbMission[] = [
  { name: '햇살 노랑', target: [255, 255, 0], hint: '빨강과 초록 빛을 가장 밝게, 파랑 빛은 꺼 보세요.' },
  { name: '맑은 하늘', target: [0, 210, 255], hint: '빨강은 끄고, 파랑을 가장 밝게, 초록은 약 80%로 올려 보세요.' },
  { name: '보랏빛 밤', target: [180, 60, 255], hint: '파랑을 가장 밝게, 빨강은 약 70%, 초록은 약 25%로 맞춰 보세요.' },
]
export const rgbHex = (rgb: RGB) => `#${rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`
export const rgbDistance = (a: RGB, b: RGB) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0))
export const rgbMatches = (a: RGB, b: RGB) => a.every((v, i) => Math.abs(v - b[i]) <= 12)
export const rgbHint = (a: RGB, b: RGB) => a.map((v, i) => ({ label: ['빨강', '초록', '파랑'][i], difference: b[i] - v })).filter(x => Math.abs(x.difference) > 12).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, 2).map(x => `${x.label} 빛을 ${x.difference > 0 ? '더해' : '줄여'} 보세요.`).join(' ')
export interface ExperimentRecord { mission: number; rgb: RGB; attempts: number }
/** missions — 기본 셋 + 사진에서 뽑은 옷 색 미션. photo — '사진에서 읽은 것'(사진 없이 했으면 없다) */
export function scienceResult(records: ExperimentRecord[], current: RGB, missions: RgbMission[] = RGB_MISSIONS, photo: ResultSection | null = null): ExperienceResult {
  return { id: 'science', title: '내가 만든 빛의 기록', subtitle: `${records.length}개 미션 성공`, summary: `지금 만든 색은 ${rgbHex(current)}입니다. 빨강·초록·파랑 빛의 밝기를 직접 조절하며 색의 변화를 실험했습니다.`, tags: ['빛의 삼원색', '직접 실험', '가산 혼합'], palette: [rgbHex(current), ...records.map(r => rgbHex(r.rgb))], sections: [{ title: '현재 빛의 비율', body: `R ${current[0]} · G ${current[1]} · B ${current[2]} (각각 0~255)` }, { title: '완료한 미션', body: records.length ? '실제 목표 판정을 통과한 기록입니다.' : '아직 완료한 미션은 없습니다. 자유 실험으로 만든 색을 기록합니다.', items: records.map(r => `${missions[r.mission].name} · ${rgbHex(r.rgb)} · ${r.attempts}번 확인`) }, { title: '발견한 원리', body: '화면에서 빨강·초록·파랑 빛을 함께 더하면 더 밝아집니다. 세 빛이 모두 최대이면 흰색, 모두 0이면 검정입니다. 물감을 섞는 것과는 다른 원리입니다.' }, ...(photo ? [photo] : [])], footnote: '화면의 RGB 빛 혼합 실험입니다. 기기 화면 설정에 따라 색이 조금 다르게 보일 수 있습니다.' }
}
export const PRODUCTS = [
  { id: 'frame' as const, name: '모아 테이블 램프', note: '넓은 사각 갓 · 책상 위의 부드러운 빛', dimensions: '가상 크기 22 × 22 × 36 cm', material: '무광 금속 기둥 · 패브릭 갓', feature: '넓게 퍼지는 빛을 비교해 보세요.' },
  { id: 'column' as const, name: '온 기둥 램프', note: '슬림한 기둥 · 작은 공간의 포인트', dimensions: '가상 크기 14 × 14 × 42 cm', material: '무광 금속 받침 · 반투명 갓', feature: '세로로 길게 퍼지는 빛을 비교해 보세요.' },
]
export const PRODUCT_COLOR_NAMES: Record<string, string> = { '#E8DCC7': '샌드', '#627D71': '세이지', '#BA715F': '테라코타' }
export const initialProduct = (): ProductConfig => ({ model: 'frame', color: '#E8DCC7', brightness: 70, rotation: 25, zoom: 100, on: true })
export function productResult(config: ProductConfig, favorites: ProductConfig[], photo: ResultSection | null = null): ExperienceResult {
  const product = PRODUCTS.find(p => p.id === config.model)!
  return { id: 'product', title: '나의 조명 컬렉션', subtitle: product.name, summary: `${PRODUCT_COLOR_NAMES[config.color]} 색상, 밝기 ${config.brightness}%로 직접 설정한 조명입니다.`, tags: ['직접 회전', '색상 비교', '조명 체험'], palette: [config.color], sections: [{ title: '선택한 디자인', body: `${product.name} · ${product.material} · ${product.dimensions}` }, { title: '나의 설정', body: `색상 ${PRODUCT_COLOR_NAMES[config.color]} · 전원 ${config.on ? '켜짐' : '꺼짐'} · 밝기 ${config.brightness}% · 회전 ${Math.round(config.rotation)}°` }, { title: '관심 목록', body: favorites.length ? '직접 관심 목록에 담은 조명입니다.' : '아직 관심 목록에 담은 조명이 없습니다.', items: favorites.map(p => `${PRODUCTS.find(x => x.id === p.model)!.name} · ${PRODUCT_COLOR_NAMES[p.color]} · 밝기 ${p.brightness}%`) }, ...(photo ? [photo] : [])], footnote: '직접 조작할 수 있는 가상 조명 디자인입니다. 실제 판매 제품의 규격·성능·가격을 나타내지 않습니다.' }
}
export const HERITAGE_SCENES = [{ id: 'court' as const, name: '궁궐 마당', note: '지붕의 선과 열린 마당을 살펴보세요.' }, { id: 'pond' as const, name: '연못 정자', note: '물과 건축이 만나는 풍경을 찾아보세요.' }]
export const HERITAGE_POINTS = {
  court: [{ id: 'roof', name: '지붕의 선', x: 50, y: 32, text: '처마의 끝이 위로 들린 곡선을 살펴보세요. 이 장면에서는 기와와 목조 건축의 형태를 단순화해 표현했습니다.' }, { id: 'pillars', name: '기둥과 공간', x: 39, y: 55, text: '여러 기둥 사이에 열린 공간이 생깁니다. 장면의 기둥 수와 배치는 이해를 돕기 위한 개념 구성입니다.' }, { id: 'court', name: '마당의 쓰임', x: 66, y: 77, text: '건물 앞 넓은 빈 공간이 사람들의 이동과 모임을 연결합니다. 옛 모습과 오늘 모습을 움직여 비교해 보세요.' }],
  pond: [{ id: 'water', name: '물에 비친 풍경', x: 65, y: 73, text: '잔잔한 물 위에 정자와 하늘이 비칩니다. 시간대에 따라 반사되는 색이 어떻게 달라지는지 관찰해 보세요.' }, { id: 'pavilion', name: '쉬어 가는 정자', x: 52, y: 40, text: '주변 풍경을 바라볼 수 있도록 열린 건축을 표현했습니다. 실제 유적의 정확한 복원 모형은 아닙니다.' }, { id: 'path', name: '장면을 잇는 길', x: 21, y: 69, text: '사람이 걸어 들어오는 길을 찾아보세요. 오늘 모습에는 탐방 안내와 정돈된 보행로를 더했습니다.' }],
}
export const initialHeritage = (): HeritageConfig => ({ scene: 'court', era: 'past', light: 'day', comparison: null })
export function heritageResult(config: HeritageConfig, visits: string[], photo: ResultSection | null = null): ExperienceResult {
  return { id: 'heritage', title: '나의 궁궐 탐험 노트', subtitle: HERITAGE_SCENES.find(s => s.id === config.scene)!.name, summary: `${config.era === 'past' ? '옛 풍경' : '오늘의 풍경'}을 ${config.light === 'day' ? '낮' : config.light === 'dusk' ? '노을' : '밤'}의 빛으로 살펴보았습니다.`, tags: ['개념 재현', '시간의 변화', '직접 탐험'], sections: [{ title: '내가 살펴본 곳', body: `${visits.length}개 관심 지점을 열어 보았습니다.`, items: visits.length ? visits : ['아직 관심 지점을 열지 않았습니다.'] }, { title: '이어 볼 질문', body: '하늘빛이 달라지면 건물과 물의 색은 어떻게 바뀔까요? 넓은 마당과 작은 정자의 공간은 어떻게 다르게 느껴질까요?' }, { title: '장면 안내', body: '이 장면은 전통 건축의 공간 요소를 이해하기 위한 교육용 개념 재현입니다. 특정 궁궐이나 시대를 고증한 복원 자료는 아닙니다.' }, ...(photo ? [photo] : [])], footnote: '정확한 유적 정보는 해당 문화유산의 공식 안내 자료를 확인해 주세요.' }
}
export function wallResult(message: WallDraft, ackAt: number, photo: ResultSection | null = null): ExperienceResult {
  return { id: 'vision-wall', title: '우리의 비전에 남긴 한 문장', subtitle: message.text, summary: '연결된 전시 화면에서 이 메시지의 표시를 확인했습니다.', tags: ['함께 만든 비전', '전시 표시 확인'], palette: [message.color], sections: [{ title: '내 메시지', body: message.text }, { title: '카드 모양과 위치', body: `${message.shape === 'circle' ? '원' : message.shape === 'arch' ? '아치' : '메모'} 모양 · 가로 ${message.x}% · 세로 ${message.y}%` }, { title: '전시 반영 시각', body: new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(ackAt) }, ...(photo ? [photo] : [])], footnote: '이 전시 연결은 생성 후 1시간 동안 유지됩니다. 공개된 메시지에는 개인정보를 적지 마세요.' }
}
