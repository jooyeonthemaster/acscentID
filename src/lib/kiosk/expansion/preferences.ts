import { perfumes } from '../../../data/perfumes'
import { josa } from './korean'
import { colorDistance, expression, hexToLab, outfitLook, PALETTE_NAMES, PHOTO_PLANS, readingLine, type ColorFamily, type PhotoReading } from './photo'
import type { Answers, AnswerSummary, ChoiceOption, ExperienceResult, PreferenceDefinition, PreferenceId, Question, RecommendationBundle, ResultMetric, ResultSection } from './types'

// These experiences run locally. A recommendation is a transparent match against
// curated examples, never a fabricated AI/network response or a medical diagnosis.
// 사진(표정·옷 색)은 답변 위에 더하는 점수다 — 후보마다 몇 점을 왜 더했는지 '사진에서 읽은 것'에 그대로 적는다.
const options = (entries: readonly (readonly [string, string, string?])[]): ChoiceOption[] => entries.map(([id, label, note]) => ({ id, label, ...(note ? { note } : {}) }))
const single = (key: string, title: string, entries: readonly (readonly [string, string, string?])[], note?: string): Question => ({ key, title, type: 'single', required: true, options: options(entries), note })
const multi = (key: string, title: string, entries: readonly (readonly [string, string, string?])[], min = 1, max = 3, note?: string): Question => ({ key, title, type: 'multi', required: min > 0, min, max, options: options(entries), note: note ?? `${min ? `${min}개 이상, ` : '없으면 선택하지 않아도 돼요. '}${max}개까지 골라주세요.` })
const scale = (key: string, title: string, note: string): Question => ({ key, title, note, type: 'scale', min: 1, max: 5, step: 1, initial: 3, required: true })
const wardrobe = options([['shirt', '셔츠'], ['knit', '니트'], ['jacket', '재킷'], ['pants', '팬츠'], ['skirt', '스커트'], ['sneakers', '스니커즈'], ['loafers', '로퍼']])
const scentFamilies = [['citrus', '시트러스', '귤·레몬처럼 산뜻한 향'], ['floral', '플로럴', '꽃잎처럼 부드러운 향'], ['woody', '우디', '나무와 숲의 깊은 향'], ['musky', '머스크', '포근하고 깨끗한 잔향'], ['fruity', '프루티', '과일의 달콤한 향'], ['spicy', '스파이시', '향신료의 따뜻한 향']] as const

export const PREFERENCES: Record<PreferenceId, PreferenceDefinition> = {
  sommelier: {
    id: 'sommelier', headline: '당신의 한 잔을 찾아요', description: '맛의 균형과 즐기는 순간으로 와인 스타일을 골라보세요.', resultLabel: '와인 스타일',
    guide: ['단맛·산미·바디감을 손끝으로 조절해요.', '끌리는 향과 함께할 순간을 골라요.', '취향에 가까운 스타일을 비교하고 테이스팅 카드를 받아요.'],
    footnote: '성인을 위한 와인 취향 안내입니다. 실제 제품의 맛과 알코올 도수는 생산자·빈티지에 따라 달라요.',
    steps: [
      { title: '맛의 균형', questions: [scale('sweetness', '어느 정도 달콤한가요?', '1 드라이 · 5 달콤'), scale('acidity', '산미는 어느 정도가 좋아요?', '1 부드럽게 · 5 상큼하게'), scale('body', '바디감을 골라주세요', '1 가볍게 · 5 묵직하게')] },
      { title: '향과 순간', questions: [multi('aromas', '어떤 향에 끌리나요?', [['red-fruit', '붉은 과일'], ['floral', '꽃향'], ['spice', '향신료'], ['citrus', '상큼한 과일']], 1, 2), single('occasion', '어떤 순간에 즐길까요?', [['meal', '식사와 함께'], ['gathering', '가벼운 모임'], ['quiet', '조용한 저녁']])] },
      { title: '스타일 범위', questions: [single('wineColor', '어떤 색의 와인을 만나볼까요?', [['any', '모두 열어둘게요'], ['red', '레드 중심'], ['white', '화이트 중심'], ['rose', '로제 중심']], '선택한 색에 가중치를 주되 다른 맛의 대안도 함께 보여드려요.')] },
    ],
  },
  cocktail: {
    id: 'cocktail', headline: '오늘의 기분을 한 잔에', description: '좋아하는 맛과 재료로 나만의 한 잔을 구성해요.', resultLabel: '시그니처 음료',
    guide: ['칵테일 또는 논알코올 음료를 선택해요.', '좋아하는 맛과 피할 재료를 알려주세요.', '한 잔 분량과 만드는 순서까지 확인해요.'],
    footnote: '칵테일은 성인용입니다. 제외 재료는 레시피 구성에서 빼지만, 구입 재료의 원재료 표시와 교차 접촉 여부는 직접 확인해주세요.',
    steps: [
      { title: '어떤 한 잔', questions: [single('drinkType', '알코올을 넣을까요?', [['mocktail', '논알코올', '주류를 넣지 않는 레시피'], ['cocktail', '칵테일', '성인용 · 주류를 넣는 레시피']]), single('mood', '오늘의 기분은요?', [['fresh', '산뜻하게'], ['relax', '차분하게'], ['bold', '선명하게'], ['festive', '즐겁게']])] },
      { title: '맛과 재료', questions: [multi('flavors', '어떤 맛이 좋아요?', [['citrus', '새콤하게'], ['berry', '달콤한 과일'], ['herbal', '향긋하게'], ['spicy', '알싸하게'], ['tropical', '트로피컬']], 1, 2), multi('ingredients', '넣고 싶은 재료는요?', [['citrus', '레몬·라임'], ['berry', '베리'], ['mint', '민트'], ['ginger', '생강'], ['pineapple', '파인애플'], ['tea', '차'], ['apple', '사과'], ['cucumber', '오이']], 1, 3), single('sweetness', '단맛은 어느 정도로 할까요?', [['normal', '보통', '레시피의 시럽 그대로'], ['less', '덜 달게', '시럽 없이 재료의 단맛만'], ['more', '더 달게', '시럽 10 ml 더']])] },
      { title: '제외 재료와 탄산', questions: [multi('excluded', '빼고 싶은 재료가 있나요?', [['citrus', '레몬·라임'], ['berry', '베리'], ['mint', '민트'], ['ginger', '생강'], ['pineapple', '파인애플'], ['tea', '차'], ['apple', '사과'], ['cucumber', '오이'], ['alcohol', '알코올']], 0, 9, '선택한 재료가 들어가는 레시피는 추천에서 제외해요.'), single('sparkle', '탄산은 넣을까요?', [['yes', '탄산 있게', '톡 쏘는 탄산수'], ['no', '탄산 없이', '탄산수 대신 차가운 물']])] },
    ],
  },
  barista: {
    id: 'barista', headline: '나에게 맞는 커피 한 잔', description: '산미·고소함·추출법으로 커피 취향을 정리해요.', resultLabel: '커피 프로필',
    guide: ['평소 마시는 커피에서 출발해요.', '맛과 추출 방법을 골라요.', '원두 스타일과 직접 내려볼 가이드를 받아요.'],
    footnote: '원산지명은 맛을 탐색하기 위한 예시입니다. 농장·가공·로스팅에 따라 맛이 달라요. 디카페인도 소량의 카페인을 포함할 수 있어요.',
    steps: [
      { title: '평소의 한 잔', questions: [single('usual', '평소 어떤 커피를 마시나요?', [['black', '블랙 커피'], ['latte', '라테'], ['sweet', '달콤한 커피'], ['new', '취향을 찾는 중']]), single('caffeine', '카페인 선택', [['regular', '일반 원두'], ['decaf', '디카페인 원두']])] },
      { title: '맛의 균형', questions: [scale('acidity', '산미는 어느 정도?', '1 낮은 산미 · 5 밝은 산미'), scale('body', '바디는 어느 정도?', '1 가볍게 · 5 진하게'), single('roast', '어떤 로스팅이 끌리나요?', [['light', '라이트', '밝고 섬세하게'], ['medium', '미디엄', '균형 있게'], ['dark', '다크', '고소하고 진하게']])] },
      { title: '내리는 방법', questions: [single('brew', '어떤 도구로 내릴까요?', [['filter', '핸드드립'], ['espresso', '에스프레소 머신'], ['french', '프렌치프레스'], ['cold', '콜드브루']]), single('serve', '어떻게 마실까요?', [['hot', '따뜻한 블랙'], ['iced', '차가운 블랙'], ['milk', '우유와 함께']])] },
    ],
  },
  'taste-dna': {
    id: 'taste-dna', headline: '나의 맛 지도를 그려요', description: '좋아하는 맛과 음식 조합을 취향 지도로 보여드려요.', resultLabel: '미각 지도',
    guide: ['좋아하는 맛을 두 가지 이상 골라요.', '즐기는 조합과 식감을 알려주세요.', '선택한 답변으로 만든 맛 지도와 음식 아이디어를 비교해요.'],
    footnote: 'DNA는 취향을 표현하는 별명입니다. 유전자 검사나 생물학적·의학적 분석이 아니에요.',
    steps: [
      { title: '좋아하는 맛', questions: [multi('tastes', '어떤 맛을 좋아하나요?', [['sour', '새콤함'], ['nutty', '고소함'], ['sweet', '달콤함'], ['hot', '매콤함'], ['umami', '감칠맛']], 2, 4), scale('intensity', '맛의 강도는 어느 정도?', '1 은은하게 · 5 선명하게')] },
      { title: '조합과 식감', questions: [single('pairing', '어떤 조합에 손이 가나요?', [['fresh', '산뜻한 채소와 과일'], ['creamy', '부드러운 크림과 곡물'], ['spicy', '알싸한 양념과 채소'], ['savory', '구수한 국물과 밥']]), single('texture', '좋아하는 식감은요?', [['crisp', '아삭·바삭'], ['soft', '부드럽게'], ['chewy', '쫄깃하게']])] },
      { title: '재료 확인', questions: [multi('excluded', '피하고 싶은 재료', [['dairy', '유제품'], ['nuts', '견과'], ['seafood', '해산물'], ['chili', '고추·매운 양념']], 0, 4)] },
    ],
  },
  'style-profiler': {
    id: 'style-profiler', headline: '나의 스타일 언어 찾기', description: '상황과 색감, 실루엣으로 나만의 무드보드를 만들어요.', resultLabel: '스타일 타입',
    guide: ['옷을 입을 상황을 골라요.', '좋아하는 스타일을 한두 가지 선택해요.', '색감과 실루엣을 맞춘 아이템 제안을 비교해요.'],
    footnote: '몸이나 외모를 평가하지 않고 직접 고른 취향으로 스타일을 제안합니다.',
    steps: [
      { title: '입는 상황', questions: [single('occasion', '어떤 날의 옷인가요?', [['work', '일하는 날'], ['weekend', '편한 주말'], ['date', '소중한 만남'], ['event', '특별한 자리']])] },
      { title: '스타일 선택', questions: [multi('styles', '어떤 분위기가 좋아요?', [['minimal', '미니멀', '정돈된 선과 간결함'], ['natural', '내추럴', '자연스러운 소재와 질감'], ['classic', '클래식', '단정하고 오래가는 구성'], ['street', '스트리트', '여유로운 비율과 포인트'], ['romantic', '로맨틱', '부드러운 곡선과 디테일'], ['technical', '유틸리티', '편안한 움직임과 실용성']], 1, 2)] },
      { title: '색과 형태', questions: [single('palette', '끌리는 색감', [['neutral', '무채색'], ['earth', '어스 톤'], ['pastel', '파스텔'], ['vivid', '선명한 포인트']]), single('silhouette', '편안한 실루엣', [['slim', '몸에 가깝게'], ['regular', '적당한 여유'], ['relaxed', '넉넉하게']]), single('focus', '먼저 바꿔보고 싶은 아이템', [['top', '상의'], ['bottom', '하의'], ['outer', '겉옷'], ['shoes', '신발']])] },
    ],
  },
  coord: {
    id: 'coord', headline: '오늘의 코디를 함께 골라요', description: '날씨와 외출 상황에 맞춰 아이템을 조합해요.', resultLabel: '오늘의 코디',
    guide: ['날씨와 외출할 상황을 알려주세요.', '원하는 스타일과 색감을 골라요.', '꼭 넣을 아이템과 뺄 아이템을 반영해 코디를 비교해요.'],
    footnote: '기본 의류 조합 제안입니다. 실제 날씨·착용감·드레스코드에 맞춰 조정해주세요.',
    steps: [
      { title: '오늘의 외출', questions: [single('weather', '밖의 날씨는 어떤가요?', [['hot', '더운 날'], ['mild', '온화한 날'], ['cold', '추운 날'], ['rain', '비 오는 날']]), single('occasion', '어디에 가나요?', [['work', '출근·일'], ['weekend', '가벼운 외출'], ['date', '소중한 만남'], ['active', '많이 걷는 날']])] },
      { title: '스타일과 색', questions: [single('style', '원하는 스타일', [['minimal', '미니멀'], ['natural', '내추럴'], ['classic', '클래식'], ['sporty', '스포티']]), single('palette', '주요 색감', [['neutral', '아이보리·차콜'], ['sage', '세이지·크림'], ['blue', '블루·화이트'], ['warm', '브라운·베이지']])] },
      { title: '아이템 구성', questions: [{ key: 'included', title: '꼭 넣을 아이템', type: 'multi', options: wardrobe, min: 0, max: 3, note: '최대 세 가지. 선택하지 않아도 괜찮아요.' }, { key: 'excluded', title: '빼고 싶은 아이템', type: 'multi', options: wardrobe, min: 0, max: 7, note: '포함한 아이템과 같은 것은 고를 수 없어요.' }] },
    ],
  },
  aura: {
    id: 'aura', headline: '오늘을 닮은 색의 이야기', description: '지금 고른 기분과 색으로 나만의 컬러 카드를 만들어요.', resultLabel: '오라 컬러 카드',
    guide: ['지금의 기분은 직접 골라요.', '끌리는 분위기와 색을 더해요.', '색에 담은 이야기와 오늘의 작은 행동을 받아요.'],
    footnote: '선택한 답변으로 만드는 오락용 컬러 이야기입니다. 실제 오라·건강·성격을 측정하거나 예측하지 않아요.',
    steps: [
      { title: '지금의 기분', questions: [single('mood', '오늘은 어떤 기분인가요?', [['calm', '잔잔해요'], ['bright', '기분이 밝아요'], ['tired', '조금 쉬고 싶어요'], ['curious', '새로운 게 궁금해요']]), scale('energy', '원하는 활동의 속도', '1 천천히 · 5 활기차게')] },
      { title: '머물고 싶은 분위기', questions: [single('atmosphere', '어떤 시간이 필요하나요?', [['quiet', '조용한 나만의 시간'], ['social', '함께 웃는 시간'], ['creative', '무언가 만드는 시간'], ['grounded', '차분히 정리하는 시간']])] },
      { title: '끌리는 색', questions: [single('color', '지금 눈에 들어오는 색은요?', [['lavender', '라벤더'], ['mint', '민트'], ['peach', '피치'], ['sky', '하늘색'], ['gold', '골드'], ['rose', '로즈']])] },
    ],
  },
  travel: {
    id: 'travel', headline: '나의 여행 취향 여권', description: '좋아하는 활동과 속도에 맞춰 하루를 구성해요.', resultLabel: '여행 스타일',
    guide: ['동행과 쓸 수 있는 시간을 알려주세요.', '하고 싶은 활동과 여행 속도를 골라요.', '실내·야외 조건을 반영한 코스 예시를 비교해요.'],
    footnote: '특정 장소의 예약·영업시간을 보장하는 일정이 아닌 활동형 코스 예시입니다. 실제 방문 전 장소·날씨·이동 시간을 확인해주세요.',
    steps: [
      { title: '누구와 얼마나', questions: [single('companion', '누구와 떠나나요?', [['solo', '혼자'], ['partner', '둘이'], ['friends', '친구들과'], ['family', '가족과']]), single('duration', '여행에 쓸 시간', [['half', '반나절 · 4시간'], ['day', '하루 · 8시간'], ['two-days', '이틀 · 하루 8시간씩']])] },
      { title: '활동과 속도', questions: [multi('activities', '무엇을 하고 싶나요?', [['culture', '문화·전시'], ['nature', '자연·산책'], ['food', '맛있는 음식'], ['shopping', '구경·쇼핑'], ['craft', '만들기 체험']], 1, 3), single('pace', '어떤 속도가 편한가요?', [['slow', '천천히, 쉬면서'], ['balanced', '균형 있게'], ['active', '다양하게 둘러보기']])] },
      { title: '코스 조건', questions: [single('setting', '실내와 야외 중 어디가 좋나요?', [['indoor', '실내만'], ['mixed', '실내·야외 모두'], ['outdoor', '야외 중심']]), single('planning', '계획하는 방법', [['planned', '순서와 시간을 정해요'], ['flexible', '현장에서 바꿔요']])] },
    ],
  },
  scent: {
    id: 'scent', headline: '나를 위한 향의 아카이브', description: '직접 고른 취향으로 나에게 맞는 향을 비교해요.', resultLabel: '시향 후보',
    guide: ['좋아하는 향 계열을 한두 가지 골라요.', '사용할 순간과 원하는 분위기를 더해요.', '실제 향료 목록에서 고른 후보와 노트를 비교해요.'],
    footnote: '기존 향료 목록에서 고른 시향 후보입니다. 조향 비율·재고·피부 적합성을 뜻하지 않으며 시향 후 선택해주세요.',
    steps: [
      { title: '향 계열', questions: [multi('families', '좋아하는 향은 어떤 계열인가요?', scentFamilies, 1, 2)] },
      { title: '순간과 분위기', questions: [single('occasion', '주로 언제 사용할까요?', [['everyday', '매일 가볍게'], ['work', '일하는 시간'], ['date', '소중한 만남'], ['evening', '저녁의 여유']]), single('mood', '원하는 분위기', [['fresh', '싱그럽게'], ['soft', '포근하게'], ['warm', '깊고 따뜻하게'], ['distinct', '개성 있게']])] },
      { title: '향의 존재감', questions: [scale('intensity', '원하는 향의 느낌', '1 가볍게 · 5 깊게'), multi('avoided', '진하게 느껴지면 부담스러운 계열', scentFamilies, 0, 4, '해당 계열의 강도가 높은 향료를 후보에서 제외해요. 성분 제외나 알레르기 검사가 아닙니다.')] },
    ],
  },
}

const definition = (id: PreferenceId): PreferenceDefinition => {
  if (!Object.prototype.hasOwnProperty.call(PREFERENCES, id)) throw new Error('지원하지 않는 취향 체험입니다.')
  return PREFERENCES[id]
}
const str = (a: Answers, key: string): string => typeof a[key] === 'string' ? a[key] as string : ''
const list = (a: Answers, key: string): string[] => Array.isArray(a[key]) ? a[key] as string[] : []
const num = (a: Answers, key: string): number => typeof a[key] === 'number' ? a[key] as number : 0
const question = (id: PreferenceId, key: string): Question | undefined => definition(id).steps.flatMap(s => s.questions).find(q => q.key === key)
const label = (id: PreferenceId, key: string, value: string): string => question(id, key)?.options?.find(o => o.id === value)?.label ?? value
const labels = (id: PreferenceId, key: string, values: string[]): string => values.map(v => label(id, key, v)).join(' · ')

export function initialAnswers(id: PreferenceId): Answers {
  return Object.fromEntries(definition(id).steps.flatMap(s => s.questions).map(q => [q.key, q.type === 'scale' ? q.initial ?? q.min ?? 0 : q.type === 'multi' ? [] : '']))
}

export function validateAnswers(id: PreferenceId, answers: Answers): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const q of definition(id).steps.flatMap(s => s.questions)) {
    const raw = answers[q.key]
    if (q.type === 'scale') {
      if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < (q.min ?? 0) || raw > (q.max ?? 100) || Math.abs((raw - (q.min ?? 0)) / (q.step ?? 1) - Math.round((raw - (q.min ?? 0)) / (q.step ?? 1))) > 1e-8) errors[q.key] = `${q.title}: ${q.min}~${q.max} 범위에서 골라주세요.`
    } else if (q.type === 'single') {
      if (typeof raw !== 'string' || !q.options?.some(o => o.id === raw)) errors[q.key] = `${q.title}: 하나를 골라주세요.`
    } else {
      const values = list(answers, q.key)
      if (raw !== undefined && !Array.isArray(raw)) errors[q.key] = `${q.title}: 선택 형식을 확인해주세요.`
      else if (values.some(v => typeof v !== 'string' || !q.options?.some(o => o.id === v)) || new Set(values).size !== values.length) errors[q.key] = `${q.title}: 유효한 항목을 중복 없이 골라주세요.`
      else if (values.length < (q.min ?? (q.required ? 1 : 0))) errors[q.key] = `${q.title}: ${q.min ?? 1}개 이상 골라주세요.`
      else if (values.length > (q.max ?? Infinity)) errors[q.key] = `${q.title}: ${q.max}개까지 고를 수 있어요.`
    }
  }
  if (id === 'cocktail') {
    const conflict = list(answers, 'ingredients').filter(x => list(answers, 'excluded').includes(x))
    if (conflict.length) errors.excluded = `${labels(id, 'ingredients', conflict)}: 넣을 재료와 제외 재료에 동시에 고를 수 없어요.`
    if (str(answers, 'drinkType') === 'cocktail' && list(answers, 'excluded').includes('alcohol')) {
      errors.drinkType = '알코올을 빼려면 논알코올을 선택해주세요.'
      // 제외 단계에서 '알코올'을 누른 그 자리에서 알린다(다음 화면을 넘긴 뒤에야 첫 단계로 돌려보내지 않게)
      errors.excluded ??= '첫 단계에서 칵테일을 골랐어요. 알코올을 빼려면 이 선택을 해제하고 첫 단계에서 논알코올을 골라주세요.'
    }
  }
  if (id === 'coord') {
    const included = list(answers, 'included'), excluded = list(answers, 'excluded')
    if (included.some(x => excluded.includes(x))) errors.excluded = '같은 아이템을 포함과 제외에 동시에 고를 수 없어요.'
    if ((included.includes('pants') && included.includes('skirt')) || (included.includes('sneakers') && included.includes('loafers'))) errors.included = '하의와 신발은 각각 한 종류만 포함해주세요.'
    if (excluded.includes('pants') && excluded.includes('skirt')) errors.excluded = '팬츠나 스커트 중 한 종류는 남겨주세요.'
  }
  if (id === 'scent' && list(answers, 'families').some(x => list(answers, 'avoided').includes(x))) errors.avoided = '좋아하는 향 계열과 부담스러운 계열을 다르게 골라주세요.'
  return errors
}

export function summarizeAnswers(id: PreferenceId, answers: Answers): AnswerSummary[] {
  return definition(id).steps.flatMap((s, step) => s.questions.map(q => {
    const value = answers[q.key]
    const selected = q.type === 'multi' ? labels(id, q.key, list(answers, q.key)) : q.type === 'scale' ? typeof value === 'number' && Number.isFinite(value) ? `${value} / ${q.max}${q.unit ?? ''}` : '' : label(id, q.key, typeof value === 'string' ? value : '')
    return { key: q.key, label: q.title, value: selected || (q.required || (q.min ?? 0) > 0 ? '아직 선택하지 않음' : '없음'), step }
  }))
}

type Ranked = { score: number; result: ExperienceResult }
const metric = (label: string, value: number, max = 5, color?: string): ResultMetric => ({ label, value, max, ...(color ? { color } : {}) })
const section = (title: string, body: string, items?: string[]): ResultSection => ({ title, body, ...(items ? { items } : {}) })
const bounded = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))
const selectedText = (id: PreferenceId, a: Answers, key: string) => label(id, key, str(a, key))

/** 사진이 한 후보에 더한 점수와 그 까닭. palette 가 있으면 결과 색을 그것으로(옷 색을 앞에 둔다) */
type Boost = { points: number; reasons: string[]; notes: string[]; palette?: string[] }
const boost = (): Boost => ({ points: 0, reasons: [], notes: [] })
const add = (b: Boost, points: number, reason: string) => { if (points > 0) { b.points += points; b.reasons.push(`${reason} +${points}점`) } }
export const PHOTO_SECTION = '사진에서 읽은 것'
/** 결과 맨 끝에 붙는다(카드·영수증에도 같이). 점수를 더하지 않은 후보도 그렇다고 적는다 */
const photoSection = (id: PreferenceId, photo: PhotoReading, b: Boost): ResultSection =>
  section(PHOTO_SECTION, `${readingLine(photo, PHOTO_PLANS[id])}. 사진은 기기 안에서 읽고 바로 지웠어요.`, [...(b.reasons.length ? b.reasons : ['이 후보에는 사진으로 더한 점수가 없어요. 답변으로 고른 후보예요.']), ...b.notes])
/** 사진이 있을 때만 후보에 점수와 '사진에서 읽은 것'을 더한다 */
const withPhoto = (id: PreferenceId, photo: PhotoReading | null, ranked: Ranked, b: Boost | null): Ranked => !photo || !b ? ranked : { score: ranked.score + b.points, result: { ...ranked.result, ...(b.palette ? { palette: b.palette } : {}), sections: [...ranked.result.sections, photoSection(id, photo, b)] } }
/** 옷 색(많이 보이는 둘)을 앞에 두고 원래 색을 잇는다 — 같은 색은 한 번만 */
const outfitPalette = (photo: PhotoReading, rest: string[], size = 4) => [...new Set([...photo.outfit.slice(0, 2).map(c => c.hex), ...rest])].slice(0, size)
/** 옷 색과 가까운 순서(0 이 가장 가깝다) */
const nearestOrder = <T,>(items: T[], hex: (item: T) => string, photo: PhotoReading | null) => {
  const look = photo ? outfitLook(photo) : null
  if (!look) return new Map<T, number>()
  return new Map([...items].sort((p, q) => colorDistance(hexToLab(hex(p)), look.main.lab) - colorDistance(hexToLab(hex(q)), look.main.lab)).map((item, i) => [item, i] as const))
}

type Wine = { id: string; title: string; color: string; target: [number, number, number]; aromas: string[]; occasions: string[]; notes: string[]; pair: string; tip: string; palette: string[] }
const WINES: Wine[] = [
  { id: 'light-red', title: '가벼운 레드', color: 'red', target: [1, 4, 2], aromas: ['red-fruit', 'floral'], occasions: ['meal', 'gathering'], notes: ['체리와 라즈베리 같은 붉은 과일', '가벼운 질감과 산뜻한 마무리'], pair: '버섯 요리 · 구운 채소 · 담백한 닭 요리', tip: '피노 누아나 가메 계열에서 가벼운 바디의 예시를 찾아보세요.', palette: ['#86334D', '#E9C4CB', '#F7E9D6'] },
  { id: 'round-red', title: '둥글고 부드러운 레드', color: 'red', target: [2, 2, 4], aromas: ['red-fruit', 'spice'], occasions: ['meal', 'quiet'], notes: ['잘 익은 자두와 베리', '부드러운 질감과 둥근 여운'], pair: '토마토 파스타 · 구운 버섯 · 로스트 요리', tip: '메를로 중심의 부드러운 스타일을 시향해보세요.', palette: ['#65243D', '#AD6672', '#F0DDD2'] },
  { id: 'bold-red', title: '깊고 묵직한 레드', color: 'red', target: [1, 3, 5], aromas: ['spice', 'red-fruit'], occasions: ['quiet', 'meal'], notes: ['검은 과일과 후추를 떠올리는 향', '단단한 구조와 긴 여운'], pair: '구운 고기 · 진한 버섯 소스 · 숙성 치즈', tip: '시라나 카베르네 소비뇽 중 묵직한 예시와 비교해보세요.', palette: ['#3F2038', '#936172', '#D6B48C'] },
  { id: 'crisp-white', title: '산뜻한 화이트', color: 'white', target: [1, 5, 2], aromas: ['citrus', 'floral'], occasions: ['meal', 'gathering'], notes: ['레몬과 풋과일을 떠올리는 향', '선명한 산미와 가벼운 질감'], pair: '레몬 드레싱 샐러드 · 생선 요리 · 신선한 채소', tip: '소비뇽 블랑 계열에서 산미의 차이를 느껴보세요.', palette: ['#C8CF81', '#F0EAB2', '#FFFAED'] },
  { id: 'soft-white', title: '풍성한 화이트', color: 'white', target: [2, 2, 4], aromas: ['floral', 'spice'], occasions: ['meal', 'quiet'], notes: ['잘 익은 과일과 은은한 꽃향', '풍성하고 매끄러운 질감'], pair: '크림 파스타 · 구운 닭 · 버터 풍미의 채소', tip: '샤르도네의 산뜻한 스타일과 풍성한 스타일을 나란히 비교해보세요.', palette: ['#C8AA58', '#EEDFA7', '#FBF3DC'] },
  { id: 'floral-sweet', title: '향긋한 스위트 화이트', color: 'white', target: [5, 3, 2], aromas: ['floral', 'citrus'], occasions: ['gathering', 'quiet'], notes: ['흰 꽃과 복숭아 같은 향', '달콤함과 산미의 균형'], pair: '과일 · 가벼운 디저트 · 살짝 매콤한 요리', tip: '모스카토나 스위트 리슬링처럼 단맛이 표시된 예시를 확인하세요.', palette: ['#D5C15D', '#EDE1B7', '#FFF8E6'] },
  { id: 'dry-rose', title: '산뜻한 드라이 로제', color: 'rose', target: [1, 4, 2], aromas: ['red-fruit', 'citrus'], occasions: ['gathering', 'meal'], notes: ['딸기와 감귤의 가벼운 인상', '드라이하고 산뜻한 마무리'], pair: '샐러드 · 가벼운 피자 · 채소 타파스', tip: '로제의 색만 보고 단맛을 판단하지 말고 드라이 표기를 확인하세요.', palette: ['#C97F87', '#F3C9BA', '#FFF1DF'] },
  { id: 'sweet-rose', title: '부드러운 스위트 로제', color: 'rose', target: [4, 2, 3], aromas: ['red-fruit', 'floral'], occasions: ['gathering', 'quiet'], notes: ['붉은 과일과 꽃의 달콤한 인상', '부드럽고 친근한 질감'], pair: '베리 디저트 · 과일 플래터 · 가벼운 간식', tip: '단맛 표시를 확인하고 조금씩 비교해보세요.', palette: ['#BE677D', '#EBC0C3', '#FFF1E6'] },
]

const WINE_COLOR: Record<string, string> = { red: '레드', white: '화이트', rose: '로제' }
const WINE_MOMENT: Record<string, string> = { meal: '식사와 함께 비교해볼 스타일', gathering: '가벼운 모임에서 비교해볼 스타일', quiet: '조용한 저녁에 비교해볼 스타일' }
/** 옷 색이 떠올리게 하는 와인 색 — 무채색·파랑 계열은 어느 쪽도 아니다 */
const WINE_OF: Partial<Record<ColorFamily, string>> = { red: 'red', burgundy: 'red', brown: 'red', purple: 'red', pink: 'rose', coral: 'rose', lavender: 'rose', white: 'white', beige: 'white', yellow: 'white', khaki: 'white', green: 'white', mint: 'white' }
function wineBoost(w: Wine, photo: PhotoReading): Boost {
  const b = boost(), face = expression(photo), look = outfitLook(photo)
  if (face?.bright && (w.target[0] >= 3 || w.aromas[0] === 'red-fruit')) add(b, 6, `${face.label} → 과일향·단맛이 도는 스타일`)
  if (face?.calm && w.target[2] >= 4) add(b, 6, `${face.label} → 둥글고 깊은 스타일`)
  if (face && !face.bright && !face.calm && w.aromas.includes('floral')) add(b, 5, `${face.label} → 꽃향이 도는 스타일`)
  if (look?.depth === 'dark' && w.target[2] >= 4) add(b, 8, `짙은 옷 색(${look.main.name}) → 묵직한 바디`)
  if (look?.depth === 'light' && w.target[2] <= 2) add(b, 8, `밝은 옷 색(${look.main.name}) → 가벼운 바디`)
  if (look?.depth === 'mid' && w.target[2] === 3) add(b, 5, `중간 밝기의 옷 색(${look.main.name}) → 중간 바디`)
  if (look && WINE_OF[look.main.family] === w.color) add(b, 6, `옷 색 ${look.main.name} → ${WINE_COLOR[w.color]}`)
  return b
}
function wineResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const wanted = [num(a, 'sweetness'), num(a, 'acidity'), num(a, 'body')]
  return WINES.map(w => {
    const matches = list(a, 'aromas').filter(x => w.aromas.includes(x))
    const score = 80 - w.target.reduce((sum, x, i) => sum + Math.abs(x - wanted[i]) * 7, 0) + matches.length * 8 + (w.occasions.includes(str(a, 'occasion')) ? 5 : 0) + (str(a, 'wineColor') === w.color ? 22 : 0)
    return withPhoto('sommelier', photo, { score, result: { id: w.id, title: w.title, subtitle: WINE_MOMENT[str(a, 'occasion')], summary: `${matches.length ? labels('sommelier', 'aromas', matches) : '선택한 맛과 다른 균형'}에 초점을 둔 후보예요. 단맛 ${w.target[0]}, 산미 ${w.target[1]}, 바디 ${w.target[2]}의 스타일 예시입니다.`, tags: [WINE_COLOR[w.color], ...w.aromas.map(x => label('sommelier', 'aromas', x))], metrics: ['단맛', '산미', '바디'].map((x, i) => metric(x, w.target[i])), palette: w.palette, sections: [section('테이스팅 노트', w.notes[0], w.notes.slice(1)), section('함께 먹기', w.pair), section('비교해볼 포인트', w.tip), section('나의 취향과 비교', `선택한 값: 단맛 ${wanted[0]} · 산미 ${wanted[1]} · 바디 ${wanted[2]}. 와인 색(${selectedText('sommelier', a, 'wineColor')})과 즐길 순간(${selectedText('sommelier', a, 'occasion')})을 반영했어요.`)] } }, photo && wineBoost(w, photo))
  })
}

type Ingredient = { name: string; ml: number; tags: string[] }
type Drink = { id: string; name: string; flavor: string[]; mood: string; ingredients: Ingredient[]; spirit: 'gin' | 'vodka' | 'rum'; notes: string; color: string }
const ing = (name: string, ml: number, ...tags: string[]): Ingredient => ({ name, ml, tags })
const DRINKS: Drink[] = [
  { id: 'citrus-garden', name: '시트러스 가든', flavor: ['citrus', 'herbal'], mood: 'fresh', ingredients: [ing('레몬즙', 25, 'citrus'), ing('민트 우린 물', 40, 'mint'), ing('탄산수', 100), ing('설탕 시럽', 15)], spirit: 'gin', notes: '레몬의 새콤함 뒤로 민트가 산뜻하게 남아요.', color: '#CFD783' },
  { id: 'berry-spark', name: '베리 스파크', flavor: ['berry', 'citrus'], mood: 'festive', ingredients: [ing('베리 주스', 65, 'berry'), ing('라임즙', 15, 'citrus'), ing('탄산수', 90), ing('설탕 시럽', 10)], spirit: 'vodka', notes: '베리의 달콤함과 라임의 선명함을 비교해보세요.', color: '#C85173' },
  { id: 'ginger-sunset', name: '진저 선셋', flavor: ['spicy', 'citrus'], mood: 'bold', ingredients: [ing('생강 우린 물', 70, 'ginger'), ing('레몬즙', 20, 'citrus'), ing('탄산수', 70), ing('설탕 시럽', 20)], spirit: 'rum', notes: '생강의 알싸함에 산뜻한 레몬을 더한 조합이에요.', color: '#D8AC59' },
  { id: 'pineapple-cloud', name: '파인애플 클라우드', flavor: ['tropical', 'berry'], mood: 'festive', ingredients: [ing('파인애플 주스', 100, 'pineapple'), ing('탄산수', 70), ing('설탕 시럽', 10)], spirit: 'rum', notes: '열대 과일의 풍미를 가볍게 풀어요.', color: '#E6CC66' },
  { id: 'tea-breeze', name: '티 브리즈', flavor: ['herbal'], mood: 'relax', ingredients: [ing('식힌 홍차', 100, 'tea'), ing('탄산수', 65), ing('설탕 시럽', 15)], spirit: 'vodka', notes: '차의 향을 중심으로 천천히 즐기는 한 잔이에요.', color: '#B68962' },
  { id: 'apple-light', name: '애플 라이트', flavor: ['berry', 'citrus'], mood: 'fresh', ingredients: [ing('사과 주스', 100, 'apple'), ing('탄산수', 80)], spirit: 'vodka', notes: '사과 자체의 단맛을 가볍게 살려요.', color: '#E5D6A3' },
  { id: 'cucumber-calm', name: '큐컴버 캄', flavor: ['herbal'], mood: 'relax', ingredients: [ing('오이 우린 물', 110, 'cucumber'), ing('탄산수', 60), ing('설탕 시럽', 10)], spirit: 'gin', notes: '오이의 맑은 향에 여백을 둔 조합이에요.', color: '#B2D5BA' },
  { id: 'berry-still', name: '소프트 베리', flavor: ['berry'], mood: 'relax', ingredients: [ing('베리 주스', 100, 'berry'), ing('물', 70), ing('설탕 시럽', 10)], spirit: 'vodka', notes: '탄산 없이 부드럽게 마시는 베리 음료예요.', color: '#C98295' },
  { id: 'tropical-tea', name: '트로피컬 티', flavor: ['tropical', 'herbal'], mood: 'bold', ingredients: [ing('파인애플 주스', 80, 'pineapple'), ing('식힌 홍차', 90, 'tea'), ing('설탕 시럽', 10)], spirit: 'rum', notes: '달콤한 열대 과일과 차의 여운을 함께 느껴보세요.', color: '#C89154' },
  { id: 'apple-ginger', name: '애플 진저', flavor: ['spicy', 'berry'], mood: 'bold', ingredients: [ing('사과 주스', 70, 'apple'), ing('생강 우린 물', 40, 'ginger'), ing('탄산수', 60), ing('설탕 시럽', 10)], spirit: 'rum', notes: '사과의 둥근 맛과 생강의 알싸함이 만나요.', color: '#C9A85F' },
]

function drinkBoost(d: Drink, photo: PhotoReading, colorRank: number | undefined): Boost {
  const b = boost(), face = expression(photo), look = outfitLook(photo)
  if (face?.bright && (d.mood === 'festive' || d.mood === 'fresh')) add(b, 8, `${face.label} → 즐겁고 산뜻한 기분의 레시피`)
  if (face?.calm && d.mood === 'relax') add(b, 8, `${face.label} → 차분한 기분의 레시피`)
  if (face && !face.bright && !face.calm && d.mood === 'fresh') add(b, 5, `${face.label} → 산뜻한 기분의 레시피`)
  if (look && colorRank === 0) add(b, 10, `옷 색 ${josa(look.main.name, '과/와')} 가장 닮은 색의 한 잔`)
  if (look && colorRank === 1) add(b, 5, `옷 색 ${josa(look.main.name, '과/와')} 닮은 색의 한 잔`)
  return b
}
function drinkResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const excluded = list(a, 'excluded'), wanted = list(a, 'ingredients'), alcoholic = str(a, 'drinkType') === 'cocktail'
  const valid = DRINKS.filter(d => !d.ingredients.some(i => i.tags.some(t => excluded.includes(t))))
  if (!valid.length) throw new Error('제외 재료를 반영하면 만들 수 있는 레시피가 없어요. 제외할 재료를 조정해주세요.')
  const colorRank = nearestOrder(valid, d => d.color, photo)
  return valid.map(d => {
    const allTags = d.ingredients.flatMap(i => i.tags)
    const hit = wanted.filter(t => allTags.includes(t))
    let ingredients = d.ingredients.map(i => ({ ...i }))
    const sweetness = str(a, 'sweetness'), sparkle = str(a, 'sparkle') !== 'no'
    const hadSparkle = ingredients.some(i => i.name === '탄산수')
    // 단맛: 시럽을 빼거나 10 ml 더하고, 그만큼 희석 재료(탄산수·물, 없으면 가장 많은 재료)에서 맞춰 한 잔 분량을 지킨다
    const diluent = () => { const at = ingredients.findIndex(i => i.name === '탄산수' || i.name === '물'); return at >= 0 ? at : ingredients.reduce((best, x, i) => x.name !== '설탕 시럽' && x.ml > ingredients[best].ml ? i : best, 0) }
    const syrup = ingredients.findIndex(i => i.name === '설탕 시럽')
    if (sweetness === 'less' && syrup >= 0) { const ml = ingredients[syrup].ml; ingredients.splice(syrup, 1); ingredients[diluent()].ml += ml }
    if (sweetness === 'more') { ingredients[diluent()].ml -= 10; if (syrup >= 0) ingredients[syrup].ml += 10; else ingredients.push(ing('설탕 시럽', 10)) }
    // 탄산 없이: 탄산수를 같은 양의 차가운 물로
    if (!sparkle) ingredients = ingredients.map(i => i.name === '탄산수' ? { ...i, name: '차가운 물' } : i)
    if (alcoholic) {
      // Keep the one-glass liquid total at 180 ml; replace 30 ml of the longest
      // non-syrup ingredient. Every alcoholic branch is explicit in the card.
      const largest = ingredients.reduce((best, x, i) => x.ml > ingredients[best].ml ? i : best, 0)
      ingredients[largest].ml -= 30
      ingredients.push(ing({ gin: '진', vodka: '보드카', rum: '럼' }[d.spirit], 30, 'alcohol'))
    }
    const total = ingredients.reduce((s, i) => s + i.ml, 0)
    const hasSparkle = ingredients.some(i => i.name === '탄산수')
    const proportions = ingredients.map(i => `${i.name} ${i.ml} ml · ${Math.round(i.ml / total * 100)}%`)
    const sweetBase = d.ingredients.some(i => i.tags.some(t => ['berry', 'pineapple', 'apple'].includes(t)))
    const score = hit.length * 16 + list(a, 'flavors').filter(f => d.flavor.includes(f)).length * 12 + (str(a, 'mood') === d.mood ? 9 : 0)
      + (sparkle === hadSparkle ? 8 : 0) + (sweetness === 'less' && !d.ingredients.some(i => i.name === '설탕 시럽') ? 6 : 0) + (sweetness === 'more' && sweetBase ? 6 : 0)
    return withPhoto('cocktail', photo, { score, result: {
      id: `${d.id}-${alcoholic ? 'cocktail' : 'mocktail'}`, title: `${d.name}${alcoholic ? '' : ' · 논알코올'}`, subtitle: `1잔 · 액체 ${total} ml · 얼음 별도`, summary: `${d.notes} ${selectedText('cocktail', a, 'mood')} 즐기고 싶은 오늘을 위해 ${hit.length ? `${josa(labels('cocktail', 'ingredients', hit), '을/를')} 넣었어요.` : excluded.length ? '제외한 재료를 피해 비슷한 맛으로 구성했어요.' : '고른 맛에 가까운 재료로 구성했어요.'}`, tags: [alcoholic ? '주류 포함' : '주류 무첨가', ...d.flavor.map(f => label('cocktail', 'flavors', f))], palette: [d.color, '#FFF6DE', '#455B46'], metrics: [metric('한 잔 분량', total, 250), metric('주류 분량', alcoholic ? 30 : 0, total)], sections: [section('재료와 비율', '표시된 분량은 얼음을 제외한 액체 기준입니다.', proportions), section('만드는 순서', '깨끗한 잔과 계량 도구를 준비해주세요.', ['잔에 얼음을 채워요.', `${hasSparkle ? '탄산수를 제외한' : '표시된'} 재료를 분량대로 넣고 가볍게 저어요.`, hasSparkle ? '탄산수는 마지막에 넣고 한두 번만 천천히 섞어요.' : '전체가 고르게 섞이면 바로 즐겨요.']), section('선택을 반영했어요', `넣고 싶은 재료: ${labels('cocktail', 'ingredients', wanted)}. 제외한 재료: ${labels('cocktail', 'excluded', excluded) || '없음'}.`, [hit.length < wanted.length ? '모든 선호 재료를 한 잔에 넣지는 않았어요. 제외 조건을 우선해서 구성했어요.' : '선택한 선호 재료가 모두 들어 있어요.', `단맛: ${selectedText('cocktail', a, 'sweetness')}${sweetness === 'less' ? ' — 시럽을 빼고 재료 자체의 단맛으로 맞췄어요.' : sweetness === 'more' ? ' — 시럽을 10 ml 더했어요.' : ''}`, `탄산: ${selectedText('cocktail', a, 'sparkle')}${!sparkle && hadSparkle ? ' — 탄산수 대신 차가운 물을 넣었어요.' : sparkle && !hadSparkle ? ' — 이 레시피는 원래 탄산이 없어요. 마지막에 탄산수를 조금 더해도 돼요.' : ''}`]), section('대안과 조정', hasSparkle ? '탄산수는 같은 양의 물로 바꾸면 부드럽게 마실 수 있어요.' : '더 연하게 마시고 싶으면 얼음이 녹는 속도를 보며 물을 조금 더해보세요.', ['단맛은 시럽을 조금씩 넣으며 맞춰주세요.', '가공 주스·시럽의 원재료도 확인해주세요.'])],
    } }, photo && drinkBoost(d, photo, colorRank.get(d)))
  })
}

const COFFEES = [
  { id: 'bright', name: '밝은 과일향 커피', acidity: 5, body: 2, roast: 'light', note: '꽃과 감귤을 떠올리는 섬세한 향', origin: '에티오피아 워시드 같은 밝은 스타일', usual: ['black', 'new'] },
  { id: 'balanced', name: '균형 잡힌 데일리 커피', acidity: 3, body: 3, roast: 'medium', note: '견과와 과일의 균형', origin: '콜롬비아 계열의 균형 있는 스타일', usual: ['black', 'latte', 'new'] },
  { id: 'nutty', name: '고소하고 둥근 커피', acidity: 2, body: 4, roast: 'medium', note: '견과와 초콜릿을 떠올리는 둥근 풍미', origin: '브라질 계열의 고소한 스타일', usual: ['latte', 'sweet'] },
  { id: 'deep', name: '깊고 묵직한 커피', acidity: 1, body: 5, roast: 'dark', note: '구운 곡물과 진한 코코아의 여운', origin: '미디엄 다크 이상으로 볶은 블렌드', usual: ['latte', 'sweet'] },
  { id: 'soft', name: '부드럽고 가벼운 커피', acidity: 2, body: 2, roast: 'medium', note: '깨끗하고 편안한 마무리', origin: '부드러운 중배전 블렌드', usual: ['black', 'new'] },
  { id: 'juicy', name: '선명하고 풍성한 커피', acidity: 4, body: 4, roast: 'light', note: '잘 익은 과일과 긴 여운', origin: '과일향을 살린 라이트 로스트 예시', usual: ['black', 'sweet'] },
]

function coffeeBoost(c: (typeof COFFEES)[number], photo: PhotoReading): Boost {
  const b = boost(), face = expression(photo), look = outfitLook(photo)
  const roastFor = { dark: 'dark', mid: 'medium', light: 'light' } as const
  if (look && roastFor[look.depth] === c.roast) add(b, look.depth === 'mid' ? 6 : 8, `${look.depth === 'dark' ? '짙은' : look.depth === 'light' ? '밝은' : '중간 밝기의'} 옷 색(${look.main.name}) → ${label('barista', 'roast', c.roast)} 로스팅`)
  if (face?.bright && c.acidity >= 4) add(b, 6, `${face.label} → 밝은 산미`)
  if (face?.calm && c.acidity <= 2) add(b, 6, `${face.label} → 부드러운 산미`)
  if (face && !face.bright && !face.calm && c.acidity === 3) add(b, 5, `${face.label} → 균형 잡힌 산미`)
  return b
}
function coffeeResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const brew = str(a, 'brew'), serve = str(a, 'serve'), decaf = str(a, 'caffeine') === 'decaf'
  const recipe: Record<string, { dose: number; liquid: number; lines: string[] }> = {
    filter: { dose: 15, liquid: serve === 'iced' ? 150 : 225, lines: [`원두 15 g을 중간 굵기로 갈아요.`, `뜨거운 물 ${serve === 'iced' ? '150' : '225'} ml를 나누어 부으며 맛을 확인해요.`, serve === 'iced' ? '잔의 얼음 75 g 위에 내려 빠르게 식혀요.' : '너무 진하면 뜨거운 물을 조금 더해요.'] },
    espresso: { dose: 18, liquid: 36, lines: ['원두 18 g으로 에스프레소 약 36 g을 추출하는 것부터 시작해요.', serve === 'milk' ? '우유 150 ml를 더해 원두의 풍미가 어떻게 바뀌는지 봐요.' : serve === 'iced' ? '얼음과 찬물 120 ml 위에 에스프레소를 부어요.' : '뜨거운 물 120 ml를 더해 농도를 맞춰요.', '기기와 원두에 맞춰 분쇄도·추출량을 조금씩 조절해요.'] },
    french: { dose: 15, liquid: 225, lines: ['원두 15 g을 굵게 갈아 프레스에 담아요.', '뜨거운 물 225 ml를 붓고 약 4분 뒤 천천히 눌러요.', '다른 잔에 전부 따라내고 취향에 맞게 희석해요.'] },
    cold: { dose: 25, liquid: 250, lines: ['굵게 간 원두 25 g과 물 250 ml를 깨끗한 용기에 담아요.', '뚜껑을 닫아 냉장고에서 12~16시간 우린 뒤 잘 걸러요.', '냉장 상태를 유지하고 소량씩 신선하게 준비해요.'] },
  }
  const r = recipe[brew]
  return COFFEES.map(c => withPhoto('barista', photo, { score: 70 - Math.abs(c.acidity - num(a, 'acidity')) * 9 - Math.abs(c.body - num(a, 'body')) * 7 + (c.roast === str(a, 'roast') ? 18 : 0) + (c.usual.includes(str(a, 'usual')) ? 8 : 0) + (serve === 'milk' ? c.body * 2 : 0), result: {
    id: `${c.id}-${brew}-${serve}-${decaf ? 'decaf' : 'regular'}`, title: `${decaf ? '디카페인으로 찾는 ' : ''}${c.name}`, subtitle: `${selectedText('barista', a, 'brew')} · ${selectedText('barista', a, 'serve')}`, summary: `${josa(c.note, '을/를')} 탐색해보세요. 평소 마시는 커피(${selectedText('barista', a, 'usual')})와 산미 ${num(a, 'acidity')}, 바디 ${josa(String(num(a, 'body')), '을/를')} 반영한 후보예요.`, tags: [label('barista', 'roast', c.roast), decaf ? '디카페인 원두로 찾기' : '일반 원두'], metrics: [metric('산미', c.acidity), metric('바디', c.body), metric('원두 g', r.dose, 30)], palette: ['#684333', '#B88E66', '#F0E6D6'], sections: [section('원두와 로스팅', c.origin, [label('barista', 'roast', c.roast), decaf ? '같은 풍미 방향의 디카페인 원두를 확인하세요. 카페인이 완전히 없는 것은 아닙니다.' : '로스터가 표시한 테이스팅 노트를 함께 확인하세요.']), section('추출 가이드', `${selectedText('barista', a, 'brew')}의 시작점이며 정답 비율은 아닙니다.`, r.lines), section('마시는 방법', serve === 'milk' ? brew === 'espresso' ? '위 가이드의 우유 양을 기준으로 더하거나 줄여보세요.' : '완성한 커피에 우유를 조금씩 더해 취향의 비율을 찾아보세요.' : serve === 'iced' ? '얼음이 녹으며 연해지는 것도 고려해주세요.' : brew === 'cold' ? '콜드브루는 냉장 추출한 뒤 마실 분량에만 뜨거운 물을 더해요.' : '조금 식었을 때 향과 산미가 어떻게 바뀌는지 비교해요.'), section('다음 비교', c.roast === str(a, 'roast') ? `고른 ${label('barista', 'roast', c.roast)} 로스팅 안에서도 산지와 가공 방식이 다른 원두를 같은 추출법으로 비교해보세요.` : `고른 ${selectedText('barista', a, 'roast')} 로스팅과 이 후보의 ${label('barista', 'roast', c.roast)} 로스팅을 같은 추출법으로 비교하면 차이를 알기 쉬워요.`)],
  } }, photo && coffeeBoost(c, photo)))
}

const DISHES = [
  { id: 'tomato', name: '토마토·바질 샐러드', tastes: ['sour', 'umami'], pairing: 'fresh', texture: 'crisp', excluded: [] as string[], items: ['토마토', '바질', '올리브오일'], tip: '토마토를 한입 크기로 썰고 바질과 오일을 가볍게 섞어요.' },
  { id: 'tofu', name: '두부·참깨 볼', tastes: ['nutty', 'umami'], pairing: 'creamy', texture: 'soft', excluded: [] as string[], items: ['두부', '참깨', '찐 채소'], tip: '따뜻한 두부에 채소와 참깨를 얹어 부드럽게 즐겨요.' },
  { id: 'apple', name: '사과·오트 크런치', tastes: ['sweet', 'sour'], pairing: 'fresh', texture: 'crisp', excluded: [] as string[], items: ['사과', '구운 오트', '계피'], tip: '아삭한 사과 위에 구운 오트를 조금 올려 식감을 비교해요.' },
  { id: 'rice', name: '버섯·현미 한 그릇', tastes: ['umami', 'nutty'], pairing: 'savory', texture: 'chewy', excluded: [] as string[], items: ['현미밥', '구운 버섯', '쪽파'], tip: '구운 버섯의 풍미를 현미밥에 더해 천천히 씹어보세요.' },
  { id: 'spicy', name: '매콤한 채소 누들', tastes: ['hot', 'sour'], pairing: 'spicy', texture: 'chewy', excluded: ['chili'], items: ['면', '고추 양념', '오이'], tip: '양념은 조금씩 넣고 아삭한 오이로 식감을 더해요.' },
  { id: 'yogurt', name: '요거트·베리 컵', tastes: ['sour', 'sweet'], pairing: 'creamy', texture: 'soft', excluded: ['dairy'], items: ['플레인 요거트', '베리', '오트'], tip: '요거트에 베리와 오트를 얹고 단맛은 과일로 맞춰요.' },
  { id: 'nuts', name: '견과·통밀 토스트', tastes: ['nutty', 'sweet'], pairing: 'creamy', texture: 'crisp', excluded: ['nuts'], items: ['통밀빵', '견과 버터', '바나나'], tip: '바삭한 빵과 부드러운 바나나의 대비를 느껴보세요.' },
  { id: 'shrimp', name: '새우·레몬 라이스', tastes: ['umami', 'sour'], pairing: 'savory', texture: 'chewy', excluded: ['seafood'], items: ['충분히 익힌 새우', '밥', '레몬'], tip: '완전히 익힌 새우를 밥에 올리고 레몬은 조금씩 더해요.' },
  { id: 'pumpkin', name: '단호박·곡물 볼', tastes: ['sweet', 'nutty'], pairing: 'creamy', texture: 'soft', excluded: [] as string[], items: ['찐 단호박', '익힌 곡물', '올리브오일'], tip: '잘 익은 단호박의 단맛과 곡물의 고소함을 함께 맛봐요.' },
]

function tasteBoost(d: (typeof DISHES)[number], photo: PhotoReading): Boost {
  const b = boost(), face = expression(photo), look = outfitLook(photo)
  if (face?.bright && d.tastes.some(t => t === 'sweet' || t === 'sour')) add(b, 6, `${face.label} → 새콤달콤한 조합`)
  if (face?.calm && d.tastes.some(t => t === 'umami' || t === 'nutty')) add(b, 6, `${face.label} → 구수하고 고소한 조합`)
  if (face && !face.bright && !face.calm && d.pairing === 'creamy') add(b, 5, `${face.label} → 부드러운 조합`)
  if (look?.vivid && d.tastes.some(t => t === 'hot' || t === 'sour')) add(b, 6, `선명한 옷 색(${look.main.name}) → 매콤·새콤한 조합`)
  if (look && !look.vivid && (look.palette === 'neutral' || look.palette === 'earth') && d.tastes.some(t => t === 'nutty' || t === 'umami')) add(b, 4, `차분한 옷 색(${look.main.name}) → 고소한 조합`)
  return b
}
function tasteResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const selected = list(a, 'tastes'), intensity = num(a, 'intensity')
  const axis = ['sour', 'nutty', 'sweet', 'hot', 'umami']
  const pairingBonus: Record<string, string[]> = { fresh: ['sour'], creamy: ['nutty', 'sweet'], spicy: ['hot'], savory: ['umami'] }
  const axes = axis.map(t => metric(label('taste-dna', 'tastes', t), bounded((selected.includes(t) ? 42 + intensity * 9 : 16) + (pairingBonus[str(a, 'pairing')].includes(t) ? 8 : 0)), 100, '#5D6C36'))
  return DISHES.filter(d => !d.excluded.some(x => list(a, 'excluded').includes(x))).map(d => withPhoto('taste-dna', photo, { score: d.tastes.filter(t => selected.includes(t)).length * 18 + (d.pairing === str(a, 'pairing') ? 14 : 0) + (d.texture === str(a, 'texture') ? 12 : 0), result: {
    id: d.id, title: d.name, subtitle: `${labels('taste-dna', 'tastes', selected)}의 취향 지도`, summary: `선택한 ${selectedText('taste-dna', a, 'pairing')} 조합과 ${selectedText('taste-dna', a, 'texture')} 식감을 바탕으로 비교해볼 음식이에요.`, tags: d.tastes.map(t => label('taste-dna', 'tastes', t)), metrics: axes, palette: ['#5D6C36', '#DF6846', '#FFF9DC'], sections: [section('나의 맛 지도', `선호도 ${intensity}/5를 반영한 선택 기반 지표입니다. 실제 미각 능력을 측정한 값이 아닙니다.`, axes.map(x => `${x.label}: ${x.value}/100`)), section('조합에 담긴 재료', d.tip, d.items), section('맛의 강도 조절', intensity <= 2 ? '양념을 적게 넣고 재료 자체의 맛부터 느껴보세요.' : intensity >= 4 ? '향과 양념을 조금씩 더하며 선명한 균형을 찾아보세요.' : '재료와 양념이 균형을 이루도록 조금씩 맛보며 조절해요.'), section('제외 조건', `${labels('taste-dna', 'excluded', list(a, 'excluded')) || '따로 제외한 재료 없음'}. 해당 재료가 들어가는 구성은 후보에서 뺐어요.`, ['구입 재료의 원재료 표시는 따로 확인해주세요.'])],
  } }, photo && tasteBoost(d, photo)))
}

const STYLE_PALETTES: Record<string, string[]> = { neutral: ['#F2EFE8', '#8D8B87', '#292B30'], earth: ['#C6B18A', '#7D866A', '#654E40'], pastel: ['#DCCFE4', '#CADFD5', '#F2D5CA'], vivid: ['#304DB9', '#D86238', '#F3D653'] }
const STYLES = [
  { id: 'minimal', name: '정돈된 미니멀', occasions: ['work', 'date'], palettes: ['neutral'], silhouette: ['regular', 'slim'], pieces: ['단색 셔츠', '스트레이트 팬츠', '간결한 재킷', '단색 로퍼'], tip: '비슷한 색을 겹치고 소재의 질감으로 차이를 주세요.' },
  { id: 'natural', name: '편안한 내추럴', occasions: ['weekend', 'date'], palettes: ['earth'], silhouette: ['regular', 'relaxed'], pieces: ['린넨 셔츠', '코튼 팬츠', '부드러운 카디건', '단정한 스니커즈'], tip: '자연스러운 구김과 편안한 여유를 살려보세요.' },
  { id: 'classic', name: '차분한 클래식', occasions: ['work', 'event'], palettes: ['neutral', 'earth'], silhouette: ['regular', 'slim'], pieces: ['정돈된 니트', '테일러드 팬츠', '구조적인 재킷', '가죽 로퍼'], tip: '기본 아이템의 길이와 마감을 맞추면 단정한 인상이 생겨요.' },
  { id: 'street', name: '리듬 있는 스트리트', occasions: ['weekend', 'event'], palettes: ['vivid', 'neutral'], silhouette: ['relaxed'], pieces: ['그래픽 티셔츠', '와이드 팬츠', '여유 있는 점퍼', '볼륨 스니커즈'], tip: '포인트는 한 곳에 두고 나머지는 편안하게 연결해요.' },
  { id: 'romantic', name: '부드러운 로맨틱', occasions: ['date', 'event'], palettes: ['pastel'], silhouette: ['regular', 'slim'], pieces: ['부드러운 블라우스', '흐르는 실루엣의 하의', '가벼운 카디건', '섬세한 플랫 슈즈'], tip: '곡선과 부드러운 색의 농도를 맞춰 과하지 않게 표현해요.' },
  { id: 'technical', name: '움직이는 유틸리티', occasions: ['weekend', 'work'], palettes: ['earth', 'neutral'], silhouette: ['relaxed', 'regular'], pieces: ['기능성 톱', '움직이기 편한 팬츠', '가벼운 바람막이', '편안한 워킹화'], tip: '수납과 활동성을 먼저 보고 매끈한 색으로 정리해요.' },
]

const FIT: Record<string, string> = { slim: '몸에 가까운', regular: '적당히 여유 있는', relaxed: '넉넉한' }
function styleBoost(s: (typeof STYLES)[number], photo: PhotoReading, chosen: string): Boost {
  const b = boost(), look = outfitLook(photo)
  if (look && s.palettes.includes(look.palette)) add(b, 12, `옷 색 ${photo.outfit.map(c => c.name).join('·')}(${PALETTE_NAMES[look.palette]}) → ${josa(PALETTE_NAMES[look.palette], '을/를')} 쓰는 스타일`)
  if (look) { b.palette = outfitPalette(photo, STYLE_PALETTES[chosen] ?? []); b.notes.push('무드보드의 첫 색은 지금 입은 옷에서 읽은 색이에요.') }
  return b
}
function styleResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const focus = ['top', 'bottom', 'outer', 'shoes'].indexOf(str(a, 'focus'))
  return STYLES.map(s => withPhoto('style-profiler', photo, { score: (list(a, 'styles').includes(s.id) ? 40 : 0) + (s.occasions.includes(str(a, 'occasion')) ? 12 : 0) + (s.palettes.includes(str(a, 'palette')) ? 10 : 0) + (s.silhouette.includes(str(a, 'silhouette')) ? 8 : 0), result: {
    id: s.id, title: s.name, subtitle: `${josa(selectedText('style-profiler', a, 'occasion'), '을/를')} 위한 무드보드`, summary: `${labels('style-profiler', 'styles', list(a, 'styles'))} 취향을 ${josa(selectedText('style-profiler', a, 'palette'), '과/와')} ${FIT[str(a, 'silhouette')]} 실루엣으로 풀어봐요.`, tags: [selectedText('style-profiler', a, 'palette'), selectedText('style-profiler', a, 'silhouette')], palette: STYLE_PALETTES[str(a, 'palette')], sections: [section('무드보드의 원칙', s.tip, [`상황: ${selectedText('style-profiler', a, 'occasion')}`, `비율: ${selectedText('style-profiler', a, 'silhouette')}`, `색감: ${selectedText('style-profiler', a, 'palette')}`]), section('아이템 조합', '이미 가진 옷에서 비슷한 구성을 먼저 찾아보세요.', s.pieces), section('먼저 바꿔볼 하나', `${selectedText('style-profiler', a, 'focus')}부터 시작한다면 ${josa(s.pieces[focus], '을/를')} 비교해보세요.`), section('다른 시도', str(a, 'occasion') === 'work' ? '일하는 환경의 드레스코드 안에서 작은 색 포인트를 더해요.' : str(a, 'occasion') === 'event' ? '주인공 아이템 하나를 정하고 나머지 색은 두세 가지로 줄여요.' : '편안한 기본 조합에 오늘 가장 끌리는 소재 하나를 더해요.')],
  } }, photo && styleBoost(s, photo, str(a, 'palette'))))
}

const COORD_PALETTES: Record<string, string[]> = { neutral: ['#EFECE4', '#494A4E', '#B8B4AC'], sage: ['#7D9386', '#F1E9D8', '#494B46'], blue: ['#6684A5', '#F5F3ED', '#303C4F'], warm: ['#947055', '#D4C2A3', '#F3EBDD'] }
const OUTFITS = [
  { id: 'clean', name: '가볍게 정돈한 룩', style: 'minimal', shoe: 'sneakers', bottom: 'pants', top: 'shirt' },
  { id: 'easy', name: '자연스러운 산책 룩', style: 'natural', shoe: 'sneakers', bottom: 'pants', top: 'knit' },
  { id: 'smart', name: '단정한 클래식 룩', style: 'classic', shoe: 'loafers', bottom: 'pants', top: 'shirt' },
  { id: 'motion', name: '움직임이 편한 룩', style: 'sporty', shoe: 'sneakers', bottom: 'pants', top: 'tee' },
  { id: 'soft', name: '부드러운 만남 룩', style: 'natural', shoe: 'loafers', bottom: 'skirt', top: 'knit' },
  { id: 'layer', name: '색을 겹친 레이어 룩', style: 'minimal', shoe: 'loafers', bottom: 'skirt', top: 'shirt' },
]

/** 지금 입은 옷의 팔레트와 이어 입기 좋은 조합 */
const COORD_FOR: Record<string, string[]> = { neutral: ['clean', 'smart'], earth: ['easy', 'soft'], pastel: ['soft', 'layer'], vivid: ['motion', 'layer'] }
function coordBoost(o: (typeof OUTFITS)[number], photo: PhotoReading, chosen: string): Boost {
  const b = boost(), look = outfitLook(photo)
  if (!look) return b
  if (COORD_FOR[look.palette].includes(o.id)) add(b, 10, `지금 입은 옷 색 ${look.main.name}(${PALETTE_NAMES[look.palette]}) → 이어 입기 좋은 ${o.name}`)
  b.palette = outfitPalette(photo, COORD_PALETTES[chosen] ?? [], 3)
  b.notes.push(look.vivid ? `${look.main.name}처럼 선명한 색을 입었다면 나머지는 무채색으로 정리해 보세요.` : look.depth === 'dark' ? `${look.main.name}처럼 짙은 색 위에는 밝은 하의나 겉옷으로 대비를 주세요.` : look.depth === 'light' ? `${look.main.name}처럼 밝은 색에는 짙은 하의로 무게를 잡아 보세요.` : `${look.main.name}에 같은 계열의 짙고 옅은 색을 겹쳐 보세요.`)
  return b
}
function outfitResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const included = list(a, 'included'), excluded = list(a, 'excluded'), weather = str(a, 'weather'), occasion = str(a, 'occasion')
  const allowed = (item: string) => !excluded.includes(item)
  const choose = (preferred: string, candidates: string[]) => allowed(preferred) ? preferred : candidates.find(allowed)!
  return OUTFITS.map(o => {
    const topIds = included.filter(x => ['shirt', 'knit'].includes(x))
    if (!topIds.length) topIds.push(choose(o.top, ['shirt', 'knit', 'tee']))
    const bottom = included.find(x => ['pants', 'skirt'].includes(x)) ?? choose(o.bottom, ['pants', 'skirt'])
    const shoe = included.find(x => ['sneakers', 'loafers'].includes(x)) ?? choose(occasion === 'active' ? 'sneakers' : o.shoe, ['sneakers', 'loafers', weather === 'rain' ? 'rain-boots' : 'walking-shoes'])
    const outer = included.includes('jacket') ? 'jacket' : weather === 'cold' ? 'coat' : weather === 'rain' ? 'raincoat' : weather === 'mild' && allowed('jacket') ? 'jacket' : null
    const names: Record<string, string> = {
      shirt: weather === 'hot' ? '통기성 있는 얇은 셔츠' : weather === 'cold' ? '안에 겹쳐 입는 코튼 셔츠' : '코튼 셔츠',
      knit: weather === 'hot' ? '성긴 짜임의 가벼운 여름 니트' : weather === 'cold' ? '보온성 있는 니트' : '부드러운 얇은 니트',
      tee: weather === 'hot' ? '가벼운 반소매 티셔츠' : '편안한 긴소매 티셔츠',
      pants: weather === 'hot' ? '가벼운 코튼 팬츠' : weather === 'cold' ? '도톰한 스트레이트 팬츠' : weather === 'rain' ? '밑단이 끌리지 않는 팬츠' : '스트레이트 팬츠',
      skirt: weather === 'cold' ? '도톰한 스커트와 보온 레깅스' : weather === 'rain' ? '밑단이 끌리지 않는 스커트' : '움직임이 편한 스커트',
      sneakers: weather === 'rain' ? '접지력이 있는 스니커즈' : '편안한 스니커즈',
      loafers: weather === 'rain' ? '물기에 주의할 로퍼' : '단정한 로퍼',
      'rain-boots': '미끄럼을 줄이는 레인 부츠', 'walking-shoes': '편안한 워킹화',
      jacket: weather === 'hot' ? '가벼운 여름 재킷' : weather === 'cold' ? '겹쳐 입는 재킷과 보온 이너' : '가벼운 재킷',
      coat: '따뜻한 코트', raincoat: '가벼운 방수 겉옷',
    }
    const pieces = [`상의: ${topIds.map(x => names[x]).join(' + ')}`, `하의: ${names[bottom]}`, `신발: ${names[shoe]}`, ...(outer ? [`겉옷: ${names[outer]}`] : []), `가방: ${occasion === 'work' ? '문서가 들어가는 단정한 토트백' : occasion === 'active' ? '손이 자유로운 작은 크로스백' : '가벼운 캔버스백'}`]
    const tip = weather === 'hot' ? '통기성과 편안함을 우선하고, 햇빛과 실내 냉방에 맞춰 얇은 겉옷을 조절하세요.' : weather === 'cold' ? '보온 이너와 겉옷을 겹쳐 입고 실내에서는 한 겹씩 조절하세요.' : weather === 'rain' ? '빗물에 젖는 밑단과 미끄러운 바닥을 확인하고 우산을 챙겨요.' : '가벼운 겉옷으로 아침저녁 온도 차에 대응하세요.'
    return withPhoto('coord', photo, { score: (o.style === str(a, 'style') ? 30 : 0) + (occasion === 'work' && ['clean', 'smart'].includes(o.id) ? 14 : 0) + (occasion === 'date' && ['soft', 'layer'].includes(o.id) ? 14 : 0) + (occasion === 'active' && o.id === 'motion' ? 20 : 0) + (occasion === 'weekend' && o.id === 'easy' ? 14 : 0), result: {
      id: o.id, title: o.name, subtitle: `${selectedText('coord', a, 'weather')} · ${selectedText('coord', a, 'occasion')}`, summary: `${josa(selectedText('coord', a, 'palette'), '을/를')} 기본으로 ${selectedText('coord', a, 'style')} 취향을 반영한 조합이에요. ${tip}`, tags: [label('coord', 'style', o.style), selectedText('coord', a, 'palette')], palette: COORD_PALETTES[str(a, 'palette')], sections: [section('아이템 구성', '같은 종류라도 소재와 길이를 상황에 맞춰 골라주세요.', pieces), section('포함·제외 반영', `포함: ${labels('coord', 'included', included) || '지정 없음'} / 제외: ${labels('coord', 'excluded', excluded) || '지정 없음'}`), section('날씨에 맞추기', tip, weather === 'rain' && shoe === 'loafers' ? ['로퍼는 직접 포함한 선택을 유지했어요. 방수성과 접지력을 확인하거나 다른 신발로 바꿔보세요.'] : undefined), section('바꿔볼 아이템', `현재 신발은 ${names[shoe]}입니다.`, ['sneakers', 'loafers'].filter(x => x !== shoe && allowed(x)).map(x => `신발을 ${josa(names[x], '으로/로')} 바꿔 비교해보세요.`))],
    } }, photo && coordBoost(o, photo, str(a, 'palette')))
  })
}

const AURAS = [
  { id: 'lavender', name: '라벤더의 여백', hex: '#AD95D0', mood: 'calm', atmosphere: 'quiet', energy: 2, phrase: '서두르지 않아도 오늘은 충분해요.', action: '창가에서 잠시 먼 곳을 바라보고 좋아하는 소리를 들어보세요.' },
  { id: 'mint', name: '민트의 작은 시작', hex: '#9FCFBD', mood: 'curious', atmosphere: 'grounded', energy: 3, phrase: '작은 정리 뒤에 새로운 자리가 생겨요.', action: '손 닿는 곳 한 군데를 정리하고 마음에 드는 물건 하나를 놓아보세요.' },
  { id: 'peach', name: '피치의 온기', hex: '#EDB393', mood: 'bright', atmosphere: 'social', energy: 3, phrase: '가벼운 인사가 하루의 온도를 바꿔요.', action: '고마웠던 사람에게 짧은 안부를 전해보세요.' },
  { id: 'sky', name: '하늘색의 숨 고르기', hex: '#9FC7E6', mood: 'tired', atmosphere: 'quiet', energy: 1, phrase: '빈 시간을 조금 남겨두어도 괜찮아요.', action: '알림을 잠시 내려놓고 편하게 앉아 쉬어보세요.' },
  { id: 'gold', name: '골드의 호기심', hex: '#DFBE64', mood: 'curious', atmosphere: 'creative', energy: 5, phrase: '완성보다 첫 시도가 먼저예요.', action: '궁금했던 것을 한 줄로 적고 5분만 직접 해보세요.' },
  { id: 'rose', name: '로즈의 대화', hex: '#CB90A8', mood: 'bright', atmosphere: 'social', energy: 4, phrase: '좋아하는 것을 함께 말해보세요.', action: '함께 있는 사람에게 오늘 좋았던 순간 하나를 물어보세요.' },
]

function auraBoost(c: (typeof AURAS)[number], photo: PhotoReading, colorRank: number | undefined, chosen: string): Boost {
  const b = boost(), face = expression(photo), look = outfitLook(photo)
  if (look && colorRank === 0) add(b, 12, `옷 색 ${josa(look.main.name, '과/와')} 가장 닮은 ${c.name}`)
  if (look && colorRank === 1) add(b, 6, `옷 색 ${josa(look.main.name, '과/와')} 닮은 ${c.name}`)
  if (face) add(b, Math.max(0, 6 - Math.abs(c.energy - face.level) * 3), `${face.label}의 활기 ${face.level}/5 → 활동 속도 ${c.energy}/5`)
  if (look) b.palette = outfitPalette(photo, [chosen, c.hex], 3)
  return b
}
function auraResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const chosen = AURAS.find(x => x.id === str(a, 'color'))!
  const auraRank = nearestOrder(AURAS, x => x.hex, photo)
  return AURAS.map(c => withPhoto('aura', photo, { score: (c.id === chosen.id ? 30 : 0) + (c.mood === str(a, 'mood') ? 14 : 0) + (c.atmosphere === str(a, 'atmosphere') ? 14 : 0) - Math.abs(c.energy - num(a, 'energy')) * 4, result: {
    id: c.id, title: c.name, subtitle: `${josa(selectedText('aura', a, 'color'), '을/를')} 더한 오늘의 컬러 이야기`, summary: `‘${selectedText('aura', a, 'mood')}’라는 답변과 ${josa(selectedText('aura', a, 'atmosphere'), '을/를')} 바라는 마음을 색으로 표현했어요. ${c.phrase}`, tags: [selectedText('aura', a, 'mood'), selectedText('aura', a, 'atmosphere')], palette: [chosen.hex, c.hex, '#F9F3E9'], metrics: [metric('직접 고른 활동 속도', num(a, 'energy'))], sections: [section('색의 이야기', c.phrase, [`기본색: ${label('aura', 'color', c.id)}`, `직접 고른 포인트: ${selectedText('aura', a, 'color')}`]), section('오늘의 작은 행동', c.action), section('나에게 맞게', num(a, 'energy') <= 2 ? '오늘은 이 행동을 아주 짧게 해도 좋아요. 쉬는 시간을 먼저 남겨두세요.' : num(a, 'energy') >= 4 ? '흥미가 이어지면 한 번 더 시도해보세요. 중간의 쉬는 시간도 챙겨요.' : '부담 없는 속도로 한 가지를 먼저 해보세요.')],
  } }, photo && auraBoost(c, photo, auraRank.get(c), chosen.hex)))
}

type Activity = { id: string; title: string; interest: string; indoor: boolean; detail: string }
const ACTIVITIES: Activity[] = [
  { id: 'gallery', title: '작은 전시 관람', interest: 'culture', indoor: true, detail: '마음에 드는 작품 하나를 골라 짧게 이야기해요.' },
  { id: 'museum', title: '지역 이야기 전시', interest: 'culture', indoor: true, detail: '지역의 역사와 생활을 소개하는 자료를 살펴봐요.' },
  { id: 'sculpture', title: '야외 조각길 둘러보기', interest: 'culture', indoor: false, detail: '걷는 길에 있는 조형물의 모양을 비교해요.' },
  { id: 'garden-room', title: '실내 식물 공간', interest: 'nature', indoor: true, detail: '식물의 잎과 색을 천천히 관찰해요.' },
  { id: 'nature-exhibit', title: '자연 주제 전시', interest: 'nature', indoor: true, detail: '자연을 소개하는 실내 전시나 수목 공간을 찾아요.' },
  { id: 'park', title: '공원 산책', interest: 'nature', indoor: false, detail: '그늘과 쉬는 자리가 있는 길을 선택해요.' },
  { id: 'river', title: '물가 산책길', interest: 'nature', indoor: false, detail: '걷기 편한 열린 산책로에서 풍경을 즐겨요.' },
  { id: 'cafe', title: '동네 카페 쉬어가기', interest: 'food', indoor: true, detail: '각자 좋아하는 음료를 고르며 쉬어가요.' },
  { id: 'food-hall', title: '실내 먹거리 탐색', interest: 'food', indoor: true, detail: '서로 다른 메뉴를 보고 취향에 맞게 골라요.' },
  { id: 'picnic', title: '가벼운 야외 식사', interest: 'food', indoor: false, detail: '날씨와 취식 가능한 장소를 먼저 확인해요.' },
  { id: 'bookshop', title: '책방·소품점 구경', interest: 'shopping', indoor: true, detail: '작은 가게의 책과 물건을 천천히 둘러봐요.' },
  { id: 'market-hall', title: '실내 마켓 둘러보기', interest: 'shopping', indoor: true, detail: '지역의 물건과 선물을 비교해요.' },
  { id: 'street-market', title: '거리 마켓 구경', interest: 'shopping', indoor: false, detail: '열린 가게를 확인하며 골목의 분위기를 느껴요.' },
  { id: 'workshop', title: '실내 만들기 체험', interest: 'craft', indoor: true, detail: '예약 가능한 공방에서 작은 작품을 만들어봐요.' },
  { id: 'drawing', title: '드로잉 공간에서 한 장', interest: 'craft', indoor: true, detail: '눈에 들어온 장면을 간단한 선으로 남겨요.' },
  { id: 'sketch-walk', title: '야외 스케치 산책', interest: 'craft', indoor: false, detail: '쉬는 자리에 앉아 주변의 모양을 종이에 담아요.' },
]
const ROUTES = [
  { id: 'discover', title: '발견을 모으는 코스', first: ['culture', 'shopping', 'nature', 'craft', 'food'], pace: 'active' },
  { id: 'rest', title: '여백이 있는 코스', first: ['nature', 'food', 'culture', 'craft', 'shopping'], pace: 'slow' },
  { id: 'taste', title: '맛과 동네를 잇는 코스', first: ['food', 'shopping', 'culture', 'nature', 'craft'], pace: 'balanced' },
  { id: 'make', title: '직접 남기는 코스', first: ['craft', 'culture', 'nature', 'food', 'shopping'], pace: 'balanced' },
]

const PACE_WAY: Record<string, string> = { slow: '천천히 쉬면서', balanced: '균형 있게', active: '여러 곳을 둘러보며' }
function travelBoost(r: (typeof ROUTES)[number], photo: PhotoReading): Boost {
  const b = boost(), face = expression(photo), look = outfitLook(photo)
  const pace = face ? (face.level >= 4 ? 'active' : face.level <= 2 ? 'slow' : 'balanced') : null
  if (face && r.pace === pace) add(b, pace === 'balanced' ? 6 : 10, `${face.label}의 활기 ${face.level}/5 → ${PACE_WAY[r.pace]} 움직이는 코스`)
  const first = look ? { warm: 'food', cool: 'nature', neutral: 'culture' }[look.tone] : null
  if (look && r.first[0] === first) add(b, 5, `${look.tone === 'warm' ? '따뜻한' : look.tone === 'cool' ? '시원한' : '차분한'} 옷 색(${look.main.name}) → ${{ food: '맛있는 음식', nature: '자연', culture: '문화·전시' }[first!]}에서 시작하는 코스`)
  return b
}
function travelResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  const selected = list(a, 'activities'), setting = str(a, 'setting'), duration = str(a, 'duration'), pace = str(a, 'pace')
  const days = duration === 'two-days' ? 2 : 1, budget = duration === 'half' ? 240 : 480
  const eligible = ACTIVITIES.filter(x => setting === 'indoor' ? x.indoor : setting === 'outdoor' ? !x.indoor : true)
  const minutes = pace === 'slow' ? 75 : pace === 'active' ? 45 : 60
  const maxStops = budget === 240 ? 3 : pace === 'slow' ? 4 : pace === 'active' ? 7 : 5
  return ROUTES.map((r, routeIndex) => {
    const interests = [...selected].sort((x, y) => r.first.indexOf(x) - r.first.indexOf(y))
    const candidates = interests.flatMap(interest => {
      const matching = eligible.filter(x => x.interest === interest)
      return matching.length ? [matching[routeIndex % matching.length]] : []
    })
    if (candidates.length !== selected.length) throw new Error('선택한 실내·야외 조건에 맞는 활동이 없어요. 활동이나 공간 조건을 바꿔주세요.')
    const filler = eligible.filter(x => !candidates.some(c => c.id === x.id)).sort((x, y) => (selected.includes(y.interest) ? 1 : 0) - (selected.includes(x.interest) ? 1 : 0) || r.first.indexOf(x.interest) - r.first.indexOf(y.interest))
    const schedule: string[] = [], detail: string[] = [], picked = new Set<string>()
    let totalMinutes = 0, indoorStops = 0, totalStops = 0
    for (let day = 0; day < days; day++) {
      const pool = day === 0 ? [...candidates, ...filler] : [...filler, ...candidates]
      // A two-day outdoor trip must still contain a second day when the small
      // example catalog has been exhausted. Prefer unseen activities, then
      // revisit an activity type at a different place instead of losing a day.
      const ordered = day === 0 ? pool : [...pool.filter(x => !picked.has(x.id)), ...pool]
      const stops = ordered.filter((x, i, all) => all.findIndex(y => y.id === x.id) === i).slice(0, maxStops)
      if (!stops.length) break
      let clock = 10 * 60
      const activityMinutes = Math.min(minutes, Math.floor((budget - (stops.length - 1) * 15 - 30) / stops.length))
      for (let n = 0; n < stops.length; n++) {
        const activity = stops[n]
        const time = `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`
        schedule.push(`${days > 1 ? `${day + 1}일차 ` : ''}${time} · ${activity.title} · ${activityMinutes}분 · ${activity.indoor ? '실내' : '야외'}`)
        detail.push(`${activity.title}: ${activity.detail}${picked.has(activity.id) ? ' 같은 활동을 다른 장소에서 해보는 둘째 날의 예시예요.' : ''}`)
        clock += activityMinutes
        if (n < stops.length - 1) clock += 15
        if (n === Math.floor(stops.length / 2)) { schedule.push(`${days > 1 ? `${day + 1}일차 ` : ''}중간 휴식 · 30분 · ${setting === 'outdoor' ? '그늘과 앉을 자리에서 쉬기' : '실내에서 앉아 쉬기'}`); clock += 30 }
        picked.add(activity.id); totalStops++; if (activity.indoor) indoorStops++
      }
      totalMinutes += clock - 10 * 60
    }
    const companionNote: Record<string, string> = { solo: '혼자 정한 속도를 지켜요. 관심이 가는 곳에서는 조금 더 머물러도 좋아요.', partner: '각자 가장 기대하는 활동을 하나씩 정하고 순서를 함께 조율해요.', friends: '만날 위치와 다시 모일 시간을 미리 정해두면 편해요.', family: '쉬는 자리·화장실·이동 편의를 먼저 확인하고 동행의 속도에 맞춰요.' }
    return withPhoto('travel', photo, { score: selected.includes(r.first[0]) ? 25 + (r.pace === pace ? 12 : 0) : (r.pace === pace ? 12 : 0), result: {
      id: r.id, title: r.title, subtitle: `${selectedText('travel', a, 'duration')} · ${selectedText('travel', a, 'companion')}`, summary: `${josa(labels('travel', 'activities', selected), '을/를')} 중심으로 ‘${selectedText('travel', a, 'setting')}’ 조건을 지킨 코스예요. ${PACE_WAY[pace]} 움직일 수 있도록 ${totalMinutes}분으로 구성했어요.`, tags: [selectedText('travel', a, 'setting'), selectedText('travel', a, 'planning')], metrics: [metric('예상 소요 분', totalMinutes, budget * days), metric('실내 활동 수', indoorStops, totalStops), metric('활동 수', totalStops, 14)], palette: ['#268075', '#E7D8BC', '#ED9B78'], sections: [section('코스 순서', '10시 출발 예시 · 구간마다 이동 15분을 포함했어요. 실제 거리와 교통에 따라 조정해주세요.', schedule), section('활동 상세', '특정 상호나 장소가 아닌 활동 유형입니다.', detail), section('동행과 속도', companionNote[str(a, 'companion')]), section('바꾸는 방법', str(a, 'planning') === 'planned' ? '먼저 방문할 장소의 예약·운영시간을 확인하고 이 순서에 맞춰 조정하세요.' : '각 구간의 활동은 같은 관심사의 다른 장소로 바꿀 수 있어요. 이동 시간이 늘면 마지막 활동을 줄여요.', [`선택한 활동: ${labels('travel', 'activities', selected)}`, setting === 'indoor' ? '비가 와도 실내 활동으로 유지해요. 건물 사이 이동은 필요할 수 있어요.' : '기상 상황에 따라 실내 코스로 다시 조정해보세요.'])],
    } }, photo && travelBoost(r, photo))
  })
}

type ScentFamily = keyof (typeof perfumes)[number]['characteristics']
/** 옷 색이 떠올리게 하는 향 계열 */
const SCENT_OF: Record<ColorFamily, ScentFamily> = { yellow: 'citrus', orange: 'citrus', green: 'citrus', mint: 'citrus', sky: 'citrus', red: 'fruity', coral: 'fruity', pink: 'floral', lavender: 'floral', purple: 'floral', brown: 'woody', beige: 'woody', khaki: 'woody', burgundy: 'spicy', black: 'spicy', charcoal: 'woody', navy: 'woody', blue: 'musky', gray: 'musky', white: 'musky' }
function scentBoost(p: (typeof perfumes)[number], photo: PhotoReading): Boost {
  const b = boost(), face = expression(photo), c = p.characteristics
  const families = [...new Set(photo.outfit.filter((x, i) => i === 0 || x.share >= 0.25).slice(0, 2).map(x => SCENT_OF[x.family]))]
  for (const family of families) add(b, Math.round(c[family] * 1.2), `옷 색 ${photo.outfit.filter(x => SCENT_OF[x.family] === family).map(x => x.name).join('·')} → ${label('scent', 'families', family)} ${c[family]}/10`)
  if (face?.bright) add(b, Math.round((c.fruity + c.citrus) / 2 * 0.8), `${face.label} → 상큼한 과일·시트러스`)
  if (face?.calm) add(b, Math.round(c.musky * 0.8), `${face.label} → 포근한 머스크`)
  if (face && !face.bright && !face.calm) add(b, Math.round(c.floral * 0.8), `${face.label} → 부드러운 플로럴`)
  if (photo.outfit.length) b.palette = outfitPalette(photo, [p.primaryColor, p.secondaryColor], 3)
  return b
}
function scentResults(a: Answers, photo: PhotoReading | null): Ranked[] {
  type Family = ScentFamily
  const selected = list(a, 'families') as Family[], avoided = list(a, 'avoided') as Family[], strength = num(a, 'intensity')
  const pool = perfumes.filter(p => !avoided.some(f => p.characteristics[f] >= 7))
  if (!pool.length) throw new Error('부담스러운 향 계열을 반영하면 시향 후보가 없어요. 제외할 계열을 조금 줄여주세요.')
  return pool.map(p => {
    const c = p.characteristics
    const depth = (c.woody + c.spicy + c.musky) / 3
    const moodScore = str(a, 'mood') === 'fresh' ? c.citrus + c.fruity * .5 : str(a, 'mood') === 'soft' ? c.musky + c.floral * .5 : str(a, 'mood') === 'warm' ? c.woody + c.spicy * .5 : c.spicy + Math.abs(c.woody - c.fruity) * .5
    const occasionScore = ['work', 'everyday'].includes(str(a, 'occasion')) ? c.citrus + c.musky - c.spicy : str(a, 'occasion') === 'date' ? c.floral + c.fruity : c.woody + c.musky
    const score = selected.reduce((sum, f) => sum + c[f] * 4, 0) + moodScore * 1.5 + occasionScore - Math.abs(depth - strength * 2) * 2
    const match = selected.map(f => `${label('scent', 'families', f)} ${c[f]}/10`)
    return withPhoto('scent', photo, { score, result: {
      id: p.id, title: p.name, subtitle: `${selectedText('scent', a, 'mood')} 느껴보고 싶은 시향 후보`, summary: `${p.description} 고른 ${labels('scent', 'families', selected)} 계열, 사용할 때(${selectedText('scent', a, 'occasion')}), 원하는 분위기(${selectedText('scent', a, 'mood')})를 함께 반영했어요.`, tags: selected.map(f => label('scent', 'families', f)), metrics: scentFamilies.map(([id, name]) => metric(name, c[id], 10)), palette: [p.primaryColor, p.secondaryColor, '#F7F1E7'], sections: [section('대표·보조 노트', '대표적인 향과 함께 어우러지는 노트를 비교해보세요.', [`대표 노트: ${p.mainScent.name}`, `보조 노트 1: ${p.subScent1.name}`, `보조 노트 2: ${p.subScent2.name}`]), section('취향과 만나는 지점', `${match.join(' · ')}. 원하는 깊이 ${strength}/5와 ${selectedText('scent', a, 'mood')} 무드를 함께 비교했어요.`), section('나란히 시향하기', '서로 다른 시향지에 향 이름을 적고 첫 느낌과 잠시 뒤의 느낌을 비교해보세요.', [`사용할 때: ${selectedText('scent', a, 'occasion')}`, `강하게 느껴지는 계열 제외: ${labels('scent', 'avoided', avoided) || '없음'}`, '향의 강도 지표는 상대적인 특징이며 지속시간이나 조향 비율이 아닙니다.'])],
    } }, photo && scentBoost(p, photo))
  })
}

const ENGINES: Record<PreferenceId, (a: Answers, photo: PhotoReading | null) => Ranked[]> = { sommelier: wineResults, cocktail: drinkResults, barista: coffeeResults, 'taste-dna': tasteResults, 'style-profiler': styleResults, coord: outfitResults, aura: auraResults, travel: travelResults, scent: scentResults }

/** photo — 사진에서 읽은 것(없으면 답변만으로). 사진이 더한 점수와 까닭은 후보마다 '사진에서 읽은 것'에 적힌다 */
export function recommend(id: PreferenceId, answers: Answers, photo: PhotoReading | null = null): RecommendationBundle {
  const config = definition(id)
  const errors = validateAnswers(id, answers)
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join('\n'))
  const ranked = ENGINES[id](answers, photo).sort((a, b) => b.score - a.score || a.result.id.localeCompare(b.result.id, 'en'))
  if (!ranked.length) throw new Error('조건에 맞는 결과가 없어요. 선택 내용을 조정해주세요.')
  const seen = new Set<string>()
  const distinct = ranked.filter(({ result }) => { const key = JSON.stringify(result.sections); if (seen.has(key)) return false; seen.add(key); return true })
  const results = distinct.slice(0, 4).map(({ result }) => ({ ...result, footnote: config.footnote }))
  if (id === 'coord' && results.length === 1) {
    // 다른 조합이 없는 이유를 알린다(비교 버튼은 후보가 하나면 나타나지 않는다)
    const pinned = results[0].sections.find(x => x.title === '포함·제외 반영')
    if (pinned) pinned.items = ['꼭 넣을 아이템으로 상의·하의·신발이 모두 정해져서 다른 조합 후보가 없어요. 꼭 넣을 아이템을 줄이면 다른 조합을 비교할 수 있어요.']
  }
  return { primary: results[0], alternatives: results.slice(1), summary: summarizeAnswers(id, answers) }
}
