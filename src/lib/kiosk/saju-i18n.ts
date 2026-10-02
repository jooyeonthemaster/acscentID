// 키오스크 사주 흐름 문구 — 입력 단계·분석 대기·결과 화면·영수증 제목. 기본 문구(i18n.ts)와 따로 둔다:
// 사주는 행사 모드(K-WAVE 등)에서 외국인 손님이 쓰는 경우가 많아 따로 늘어난다.
// 만세력 계산 값(오행 '목', 신강, 띠 '말')은 서버가 한국어로 주므로 여기서 화면용으로 바꾼다.
// AI 해석 문장은 서버가 손님 언어로 만든다(/api/kiosk/analyze/saju 의 locale).

import type { KioskLang } from './i18n'
import type { SajuElement, SajuPurpose } from '@/types/analysis'

export interface SajuText {
  // 입력 단계
  purposeTitle: string
  purposeDesc: string
  purposes: Record<SajuPurpose, { label: string; desc: string }>
  birthTitle: string
  solar: string
  lunar: string
  birthLabel: string
  birthHint: string
  leapMonth: string
  clearAll: string
  errYear: (min: number, max: number) => string
  errMonth: string
  errDay: string
  errNoDate: string
  errFuture: string
  errLunar30: string
  hourTitle: string
  hourDesc: string
  hours: string[] // 12지시 이름(자시…해시)
  hourUnknown: string
  partnerTitle: string
  relation: string
  relations: Record<string, string>
  partnerName: string
  partnerNamePh: string
  partnerGender: string
  partnerBirth: string
  wishTitle: string
  wishDesc: string
  wishPh: string
  wishHint: string
  skip: string
  statusLines: string[]
  eta: string
  /** 궁합 상대 이름을 비웠을 때 — 해석문에 그대로 들어간다 */
  partnerDefault: string
  // 결과
  chapters: [string, string, string, string]
  pillarHeads: { hour: string; day: string; month: string; year: string }
  me: string
  noHour: string
  dayMaster: string
  yongsin: string
  born: string
  lunarInput: string
  elementsTitle: string
  fill: string
  strongest: string
  elements: Record<SajuElement, string>
  noteFamily: Record<SajuElement, string>
  strength: Record<'신강' | '신약' | '중화', string>
  yinYang: Record<'양' | '음', string>
  animals: Record<string, string>
  flowTitle: string
  flow: { dominant: string; lacking: string; yongsin: string }
  pillarsTitle: string
  more: string
  less: string
  insights: string
  timing: string
  compatTitle: string
  harmony: string
  friction: string
  scentTitle: string
  layers: { top: string; middle: string; base: string }
  ritual: string
  moment: string
  why: string
  match: (pct: number) => string
  /** 한 장 결과(행사 모드) 맨 위 요약 제목 */
  summary: string
  /** 한 장 결과 아래로 더 있음 표시 */
  scrollMore: string
  // 영수증
  receipt: {
    myeongsik: string
    dayMaster: string
    yongsin: string
    born: string
    elements: string
    bridge: string
    ritual: string
    rxScent: string
    title: string
    /** 감정서형 */
    sheetSub: string
    info: [string, string, string, string, string]
    rows: [string, string, string, string]
    seal: [string, string]
  }
}

const ko: SajuText = {
  purposeTitle: '무엇이 궁금하세요?',
  purposeDesc: '고르신 주제로 명식을 풀이합니다.',
  purposes: {
    general: { label: '종합운', desc: '내 명식 전체의 흐름' },
    love: { label: '연애운', desc: '사랑에 빠지는 방식과 인연의 결' },
    wealth: { label: '재물운', desc: '돈이 들어오는 경로와 새는 구멍' },
    career: { label: '직업운', desc: '일하는 방식의 결과 방향' },
    compatibility: { label: '궁합', desc: '두 명식이 만나는 자리' },
  },
  birthTitle: '언제 태어나셨나요?',
  solar: '양력',
  lunar: '음력',
  birthLabel: '생년월일',
  birthHint: '연도 4자리 → 월 2자리 → 일 2자리 순서로 눌러 주세요',
  leapMonth: '윤달로 계산하기',
  clearAll: '전체 지움',
  errYear: (min, max) => `${min}년부터 ${max}년까지 가능합니다`,
  errMonth: '월을 확인해 주세요',
  errDay: '일을 확인해 주세요',
  errNoDate: '없는 날짜입니다',
  errFuture: '아직 오지 않은 날짜입니다',
  errLunar30: '음력은 30일까지입니다',
  hourTitle: '태어난 시간은요?',
  hourDesc: '시간을 알면 네 기둥이 모두 서고, 모르면 세 기둥으로 봅니다.',
  hours: ['자시', '축시', '인시', '묘시', '진시', '사시', '오시', '미시', '신시', '유시', '술시', '해시'],
  hourUnknown: '태어난 시간을 몰라요 (세 기둥으로 봅니다)',
  partnerTitle: '누구와의 궁합인가요?',
  relation: '관계',
  relations: { lover: '연인', crush: '썸 · 짝사랑', spouse: '부부', friend: '친구', colleague: '동료', bias: '최애' },
  partnerName: '상대 이름',
  partnerNamePh: '이름 또는 별명',
  partnerGender: '상대 성별',
  partnerBirth: '상대 생년월일',
  wishTitle: '마음에 걸리는 것이 있나요?',
  wishDesc: '한 줄만 적어주시면 풀이에 함께 엮습니다. 건너뛰어도 됩니다.',
  wishPh: '예) 올해 이직을 해도 될까요',
  wishHint: '고민 한 줄',
  skip: '건너뛰기',
  statusLines: ['만세력에서 생시를 찾는 중...', '네 기둥을 세우는 중...', '오행의 균형을 재는 중...', '용신을 정하는 중...', '기운에 맞는 향을 고르는 중...'],
  eta: '명식을 풀이하는 데 30~60초쯤 걸립니다.',
  partnerDefault: '상대방',
  chapters: ['命式 · 명식', '解 · 풀이', '望 · 물음', '香 · 처방'],
  pillarHeads: { hour: '시', day: '일', month: '월', year: '년' },
  me: '나',
  noHour: '시 미상',
  dayMaster: '일간',
  yongsin: '용신',
  born: '생시',
  lunarInput: '음력 입력',
  elementsTitle: '오행 분포',
  fill: '채울 기운',
  strongest: '가장 강한 기운',
  elements: { 목: '목', 화: '화', 토: '토', 금: '금', 수: '수' },
  noteFamily: { 목: '그린 · 허브', 화: '스파이시 · 앰버', 토: '우디 · 스위트', 금: '시트러스 · 클린', 수: '머스크 · 딥' },
  strength: { 신강: '신강', 신약: '신약', 중화: '중화' },
  yinYang: { 양: '양', 음: '음' },
  animals: {},
  flowTitle: '기운의 흐름',
  flow: { dominant: '강한 기운', lacking: '부족한 기운', yongsin: '채울 기운' },
  pillarsTitle: '네 기둥이 말하는 것',
  more: '자세히 보기',
  less: '접기',
  insights: '핵심 세 가지',
  timing: '시기',
  compatTitle: '궁합',
  harmony: '맞물리는 자리',
  friction: '흔들어 깨우는 자리',
  scentTitle: '처방 향',
  layers: { top: '겉향', middle: '중심향', base: '잔향' },
  ritual: '언제 뿌리나요',
  moment: '이런 순간에',
  why: '왜 이 향인가요',
  match: pct => `어울림 ${pct}%`,
  summary: '나의 사주 향',
  scrollMore: '아래로 더 보기',
  receipt: { myeongsik: '四柱命式 · 명식', dayMaster: '日干 일간', yongsin: '用神 용신', born: '生時 생시', elements: '오행 분포', bridge: '命과 香 · 처방의 연유', ritual: '處方 · 쓰는 법', rxScent: '處方 香 · 처방 향', title: '사주 향 처방전', sheetSub: '사주 향 감정서', info: ['姓名', '性別', '生年月日', '生時', '鑑定日'], rows: ['十星', '天干', '地支', '十星'], seal: ['香室', '之印'] },
}

const ELEMENTS_EN = { 목: 'Wood', 화: 'Fire', 토: 'Earth', 금: 'Metal', 수: 'Water' } as const
const ANIMALS: Record<Exclude<KioskLang, 'ko'>, Record<string, string>> = {
  en: { 쥐: 'Rat', 소: 'Ox', 호랑이: 'Tiger', 토끼: 'Rabbit', 용: 'Dragon', 뱀: 'Snake', 말: 'Horse', 양: 'Goat', 원숭이: 'Monkey', 닭: 'Rooster', 개: 'Dog', 돼지: 'Pig' },
  ja: { 쥐: '子(ねずみ)', 소: '丑(うし)', 호랑이: '寅(とら)', 토끼: '卯(うさぎ)', 용: '辰(たつ)', 뱀: '巳(へび)', 말: '午(うま)', 양: '未(ひつじ)', 원숭이: '申(さる)', 닭: '酉(とり)', 개: '戌(いぬ)', 돼지: '亥(いのしし)' },
  'zh-Hans': { 쥐: '鼠', 소: '牛', 호랑이: '虎', 토끼: '兔', 용: '龙', 뱀: '蛇', 말: '马', 양: '羊', 원숭이: '猴', 닭: '鸡', 개: '狗', 돼지: '猪' },
  'zh-Hant': { 쥐: '鼠', 소: '牛', 호랑이: '虎', 토끼: '兔', 용: '龍', 뱀: '蛇', 말: '馬', 양: '羊', 원숭이: '猴', 닭: '雞', 개: '狗', 돼지: '豬' },
}

const en: SajuText = {
  purposeTitle: 'What would you like to know?',
  purposeDesc: 'We read your chart through the topic you choose.',
  purposes: {
    general: { label: 'Overall', desc: 'The flow of your whole chart' },
    love: { label: 'Love', desc: 'How you fall in love and meet people' },
    wealth: { label: 'Wealth', desc: 'Where money comes in and leaks out' },
    career: { label: 'Career', desc: 'How you work and where you are heading' },
    compatibility: { label: 'Compatibility', desc: 'Where two charts meet' },
  },
  birthTitle: 'When were you born?',
  solar: 'Solar',
  lunar: 'Lunar',
  birthLabel: 'Date of birth',
  birthHint: 'Enter year (4 digits) → month (2) → day (2)',
  leapMonth: 'Leap month',
  clearAll: 'Clear',
  errYear: (min, max) => `Years ${min}–${max} only`,
  errMonth: 'Please check the month',
  errDay: 'Please check the day',
  errNoDate: 'This date does not exist',
  errFuture: 'This date is in the future',
  errLunar30: 'Lunar months have up to 30 days',
  hourTitle: 'What time were you born?',
  hourDesc: 'With the hour we read all four pillars; without it, three.',
  hours: ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'],
  hourUnknown: "I don't know my birth time (read with three pillars)",
  partnerTitle: 'Compatibility with whom?',
  relation: 'Relationship',
  relations: { lover: 'Partner', crush: 'Crush', spouse: 'Spouse', friend: 'Friend', colleague: 'Colleague', bias: 'My bias' },
  partnerName: 'Their name',
  partnerNamePh: 'Name or nickname',
  partnerGender: 'Their gender',
  partnerBirth: 'Their date of birth',
  wishTitle: 'Anything on your mind?',
  wishDesc: 'Write one line and we will weave it into your reading. You can skip.',
  wishPh: 'e.g. Should I change jobs this year?',
  wishHint: 'One line',
  skip: 'Skip',
  statusLines: ['Finding your birth in the calendar...', 'Raising the four pillars...', 'Weighing the five elements...', 'Choosing the element you need...', 'Picking the scent for your energy...'],
  eta: 'Reading your chart takes about 30–60 seconds.',
  partnerDefault: 'Partner',
  chapters: ['命式 · Chart', '解 · Reading', '望 · Your question', '香 · Scent'],
  pillarHeads: { hour: 'Hour', day: 'Day', month: 'Month', year: 'Year' },
  me: 'You',
  noHour: 'Unknown',
  dayMaster: 'Day master',
  yongsin: 'Needed element',
  born: 'Born',
  lunarInput: 'lunar',
  elementsTitle: 'Five elements',
  fill: 'Element to fill',
  strongest: 'Strongest',
  elements: ELEMENTS_EN,
  noteFamily: { 목: 'Green · Herbal', 화: 'Spicy · Amber', 토: 'Woody · Sweet', 금: 'Citrus · Clean', 수: 'Musk · Deep' },
  strength: { 신강: 'strong', 신약: 'gentle', 중화: 'balanced' },
  yinYang: { 양: 'Yang', 음: 'Yin' },
  animals: ANIMALS.en,
  flowTitle: 'Flow of energy',
  flow: { dominant: 'Strong', lacking: 'Lacking', yongsin: 'To fill' },
  pillarsTitle: 'What your four pillars say',
  more: 'Read more',
  less: 'Show less',
  insights: 'Three key points',
  timing: 'Timing',
  compatTitle: 'Compatibility',
  harmony: 'Where you fit',
  friction: 'Where you spark',
  scentTitle: 'Your scent',
  layers: { top: 'Top', middle: 'Heart', base: 'Base' },
  ritual: 'When to wear it',
  moment: 'A moment for it',
  why: 'Why this scent',
  match: pct => `Match ${pct}%`,
  summary: 'Your saju scent',
  scrollMore: 'Scroll for more',
  receipt: { myeongsik: '四柱命式 · CHART', dayMaster: 'DAY MASTER', yongsin: 'NEEDED', born: 'BORN', elements: 'FIVE ELEMENTS', bridge: 'WHY THIS SCENT', ritual: 'HOW TO WEAR', rxScent: '處方 香 · YOUR SCENT', title: 'SAJU SCENT PRESCRIPTION', sheetSub: 'SAJU SCENT READING', info: ['NAME', 'GENDER', 'BORN', 'HOUR', 'DATE'], rows: ['十星', '天干', '地支', '十星'], seal: ['香室', '之印'] },
}

const ja: SajuText = {
  purposeTitle: '何を知りたいですか？',
  purposeDesc: '選んだテーマで命式を読み解きます。',
  purposes: {
    general: { label: '総合運', desc: '命式全体の流れ' },
    love: { label: '恋愛運', desc: '恋に落ちる形とご縁' },
    wealth: { label: '金運', desc: 'お金の入り口と漏れ口' },
    career: { label: '仕事運', desc: '働き方と進む方向' },
    compatibility: { label: '相性', desc: '二つの命式が出会うところ' },
  },
  birthTitle: 'いつ生まれましたか？',
  solar: '新暦',
  lunar: '旧暦',
  birthLabel: '生年月日',
  birthHint: '年4桁 → 月2桁 → 日2桁の順に押してください',
  leapMonth: '閏月で計算',
  clearAll: '全消去',
  errYear: (min, max) => `${min}年〜${max}年まで入力できます`,
  errMonth: '月を確認してください',
  errDay: '日を確認してください',
  errNoDate: '存在しない日付です',
  errFuture: 'まだ来ていない日付です',
  errLunar30: '旧暦は30日までです',
  hourTitle: '生まれた時間は？',
  hourDesc: '時間が分かれば四柱、分からなければ三柱で読みます。',
  hours: ['子の刻', '丑の刻', '寅の刻', '卯の刻', '辰の刻', '巳の刻', '午の刻', '未の刻', '申の刻', '酉の刻', '戌の刻', '亥の刻'],
  hourUnknown: '生まれた時間が分かりません（三柱で読みます）',
  partnerTitle: '誰との相性ですか？',
  relation: '関係',
  relations: { lover: '恋人', crush: '片思い', spouse: '夫婦', friend: '友達', colleague: '同僚', bias: '推し' },
  partnerName: '相手の名前',
  partnerNamePh: '名前またはニックネーム',
  partnerGender: '相手の性別',
  partnerBirth: '相手の生年月日',
  wishTitle: '気になっていることはありますか？',
  wishDesc: '一行書いていただければ読み解きに織り込みます。スキップもできます。',
  wishPh: '例）今年転職してもいいでしょうか',
  wishHint: '悩みを一行',
  skip: 'スキップ',
  statusLines: ['万年暦で生まれた時を探しています...', '四つの柱を立てています...', '五行のバランスを測っています...', '用神を決めています...', '気に合う香りを選んでいます...'],
  eta: '命式の読み解きには30〜60秒ほどかかります。',
  partnerDefault: 'お相手',
  chapters: ['命式', '解 · 読み解き', '望 · 問い', '香 · 処方'],
  pillarHeads: { hour: '時', day: '日', month: '月', year: '年' },
  me: '私',
  noHour: '時刻不明',
  dayMaster: '日干',
  yongsin: '用神',
  born: '生まれ',
  lunarInput: '旧暦入力',
  elementsTitle: '五行の分布',
  fill: '補う気',
  strongest: '最も強い気',
  elements: { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' },
  noteFamily: { 목: 'グリーン・ハーブ', 화: 'スパイシー・アンバー', 토: 'ウッディ・スイート', 금: 'シトラス・クリーン', 수: 'ムスク・ディープ' },
  strength: { 신강: '身強', 신약: '身弱', 중화: '中和' },
  yinYang: { 양: '陽', 음: '陰' },
  animals: ANIMALS.ja,
  flowTitle: '気の流れ',
  flow: { dominant: '強い気', lacking: '足りない気', yongsin: '補う気' },
  pillarsTitle: '四つの柱が語ること',
  more: 'もっと見る',
  less: '閉じる',
  insights: '大事な三つ',
  timing: '時期',
  compatTitle: '相性',
  harmony: '噛み合うところ',
  friction: '揺さぶり目覚めさせるところ',
  scentTitle: '処方の香り',
  layers: { top: 'トップ', middle: 'ミドル', base: 'ラスト' },
  ritual: 'いつつけるか',
  moment: 'こんな瞬間に',
  why: 'なぜこの香りか',
  match: pct => `相性 ${pct}%`,
  summary: 'あなたの四柱の香り',
  scrollMore: '下にスクロール',
  receipt: { myeongsik: '四柱命式', dayMaster: '日干', yongsin: '用神', born: '生時', elements: '五行の分布', bridge: '命と香 · 処方の理由', ritual: '處方 · 使い方', rxScent: '處方 香 · 処方の香り', title: '四柱香 処方箋', sheetSub: '四柱香 鑑定書', info: ['氏名', '性別', '生年月日', '生時', '鑑定日'], rows: ['十星', '天干', '地支', '十星'], seal: ['香室', '之印'] },
}

const zhHans: SajuText = {
  purposeTitle: '你想了解什么？',
  purposeDesc: '我们会围绕你选的主题解读命盘。',
  purposes: {
    general: { label: '综合运', desc: '整个命盘的走向' },
    love: { label: '恋爱运', desc: '恋爱的方式与缘分' },
    wealth: { label: '财运', desc: '钱从哪里来、从哪里漏' },
    career: { label: '事业运', desc: '做事的方式与方向' },
    compatibility: { label: '合盘', desc: '两个命盘相遇之处' },
  },
  birthTitle: '你是什么时候出生的？',
  solar: '阳历',
  lunar: '农历',
  birthLabel: '出生日期',
  birthHint: '依次按年份4位 → 月份2位 → 日期2位',
  leapMonth: '按闰月计算',
  clearAll: '全部清除',
  errYear: (min, max) => `仅限 ${min}–${max} 年`,
  errMonth: '请检查月份',
  errDay: '请检查日期',
  errNoDate: '这个日期不存在',
  errFuture: '这个日期还没到',
  errLunar30: '农历最多30日',
  hourTitle: '出生时辰是？',
  hourDesc: '知道时辰就看四柱，不知道就看三柱。',
  hours: ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'],
  hourUnknown: '不知道出生时间（按三柱解读）',
  partnerTitle: '和谁合盘？',
  relation: '关系',
  relations: { lover: '恋人', crush: '暧昧 · 暗恋', spouse: '夫妻', friend: '朋友', colleague: '同事', bias: '本命' },
  partnerName: '对方名字',
  partnerNamePh: '名字或昵称',
  partnerGender: '对方性别',
  partnerBirth: '对方出生日期',
  wishTitle: '有什么放不下的事吗？',
  wishDesc: '写一句话，我们会把它织进解读里。也可以跳过。',
  wishPh: '例）今年可以换工作吗',
  wishHint: '一句烦恼',
  skip: '跳过',
  statusLines: ['正在万年历中查找出生时间...', '正在立起四柱...', '正在衡量五行平衡...', '正在确定用神...', '正在挑选合适的香气...'],
  eta: '解读命盘大约需要 30–60 秒。',
  partnerDefault: '对方',
  chapters: ['命式 · 命盘', '解 · 解读', '望 · 提问', '香 · 处方'],
  pillarHeads: { hour: '时', day: '日', month: '月', year: '年' },
  me: '我',
  noHour: '时辰不明',
  dayMaster: '日干',
  yongsin: '用神',
  born: '出生',
  lunarInput: '农历输入',
  elementsTitle: '五行分布',
  fill: '需补之气',
  strongest: '最强之气',
  elements: { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' },
  noteFamily: { 목: '绿叶 · 草本', 화: '辛香 · 琥珀', 토: '木质 · 甜香', 금: '柑橘 · 清新', 수: '麝香 · 深沉' },
  strength: { 신강: '身强', 신약: '身弱', 중화: '中和' },
  yinYang: { 양: '阳', 음: '阴' },
  animals: ANIMALS['zh-Hans'],
  flowTitle: '气的流动',
  flow: { dominant: '强的气', lacking: '缺的气', yongsin: '要补的气' },
  pillarsTitle: '四柱在说什么',
  more: '查看更多',
  less: '收起',
  insights: '三个重点',
  timing: '时机',
  compatTitle: '合盘',
  harmony: '契合之处',
  friction: '激发之处',
  scentTitle: '处方香气',
  layers: { top: '前调', middle: '中调', base: '后调' },
  ritual: '什么时候用',
  moment: '适合的瞬间',
  why: '为什么是这款香',
  match: pct => `契合 ${pct}%`,
  summary: '你的四柱之香',
  scrollMore: '向下滑动查看更多',
  receipt: { myeongsik: '四柱命式 · 命盘', dayMaster: '日干', yongsin: '用神', born: '出生', elements: '五行分布', bridge: '命与香 · 处方缘由', ritual: '處方 · 用法', rxScent: '處方 香 · 处方香气', title: '四柱香 处方笺', sheetSub: '四柱香 鉴定书', info: ['姓名', '性别', '出生日期', '时辰', '鉴定日'], rows: ['十神', '天干', '地支', '十神'], seal: ['香室', '之印'] },
}

const zhHant: SajuText = {
  ...zhHans,
  purposeTitle: '你想了解什麼？',
  purposeDesc: '我們會圍繞你選的主題解讀命盤。',
  purposes: {
    general: { label: '綜合運', desc: '整個命盤的走向' },
    love: { label: '戀愛運', desc: '戀愛的方式與緣分' },
    wealth: { label: '財運', desc: '錢從哪裡來、從哪裡漏' },
    career: { label: '事業運', desc: '做事的方式與方向' },
    compatibility: { label: '合盤', desc: '兩個命盤相遇之處' },
  },
  birthTitle: '你是什麼時候出生的？',
  solar: '國曆',
  lunar: '農曆',
  birthLabel: '出生日期',
  birthHint: '依序按年份4位 → 月份2位 → 日期2位',
  leapMonth: '按閏月計算',
  clearAll: '全部清除',
  errYear: (min, max) => `僅限 ${min}–${max} 年`,
  errMonth: '請檢查月份',
  errDay: '請檢查日期',
  errNoDate: '這個日期不存在',
  errFuture: '這個日期還沒到',
  errLunar30: '農曆最多30日',
  hourTitle: '出生時辰是？',
  hourDesc: '知道時辰就看四柱，不知道就看三柱。',
  hours: ['子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時'],
  hourUnknown: '不知道出生時間（按三柱解讀）',
  partnerTitle: '和誰合盤？',
  relation: '關係',
  relations: { lover: '戀人', crush: '曖昧 · 暗戀', spouse: '夫妻', friend: '朋友', colleague: '同事', bias: '本命' },
  partnerName: '對方名字',
  partnerNamePh: '名字或暱稱',
  partnerGender: '對方性別',
  partnerBirth: '對方出生日期',
  wishTitle: '有什麼放不下的事嗎？',
  wishDesc: '寫一句話，我們會把它織進解讀裡。也可以跳過。',
  wishPh: '例）今年可以換工作嗎',
  wishHint: '一句煩惱',
  skip: '跳過',
  statusLines: ['正在萬年曆中查找出生時間...', '正在立起四柱...', '正在衡量五行平衡...', '正在確定用神...', '正在挑選合適的香氣...'],
  eta: '解讀命盤大約需要 30–60 秒。',
  partnerDefault: '對方',
  chapters: ['命式 · 命盤', '解 · 解讀', '望 · 提問', '香 · 處方'],
  pillarHeads: { hour: '時', day: '日', month: '月', year: '年' },
  noHour: '時辰不明',
  lunarInput: '農曆輸入',
  elementsTitle: '五行分佈',
  fill: '需補之氣',
  strongest: '最強之氣',
  noteFamily: { 목: '綠葉 · 草本', 화: '辛香 · 琥珀', 토: '木質 · 甜香', 금: '柑橘 · 清新', 수: '麝香 · 深沉' },
  strength: { 신강: '身強', 신약: '身弱', 중화: '中和' },
  yinYang: { 양: '陽', 음: '陰' },
  animals: ANIMALS['zh-Hant'],
  flowTitle: '氣的流動',
  flow: { dominant: '強的氣', lacking: '缺的氣', yongsin: '要補的氣' },
  pillarsTitle: '四柱在說什麼',
  more: '查看更多',
  less: '收起',
  insights: '三個重點',
  timing: '時機',
  compatTitle: '合盤',
  harmony: '契合之處',
  friction: '激發之處',
  scentTitle: '處方香氣',
  layers: { top: '前調', middle: '中調', base: '後調' },
  ritual: '什麼時候用',
  moment: '適合的瞬間',
  why: '為什麼是這款香',
  match: pct => `契合 ${pct}%`,
  summary: '你的四柱之香',
  scrollMore: '向下滑動查看更多',
  receipt: { myeongsik: '四柱命式 · 命盤', dayMaster: '日干', yongsin: '用神', born: '出生', elements: '五行分佈', bridge: '命與香 · 處方緣由', ritual: '處方 · 用法', rxScent: '處方 香 · 處方香氣', title: '四柱香 處方箋', sheetSub: '四柱香 鑑定書', info: ['姓名', '性別', '出生日期', '時辰', '鑑定日'], rows: ['十神', '天干', '地支', '十神'], seal: ['香室', '之印'] },
}

const TEXTS: Record<KioskLang, SajuText> = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }

export function sajuText(lang: KioskLang): SajuText {
  return TEXTS[lang] ?? ko
}

/** 키오스크 언어 → 사주 API 가 받는 해석 언어(사이트 locale). 번체는 zh 에 '번체로' 지시를 덧붙인다 */
export function sajuLocale(lang: KioskLang): 'ko' | 'en' | 'ja' | 'zh' | 'zh-Hant' {
  return lang === 'zh-Hans' ? 'zh' : lang
}
