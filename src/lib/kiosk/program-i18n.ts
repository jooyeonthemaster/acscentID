// 키오스크 프로그램 고르기 화면 + AI 퍼스널 컬러 · AI 타로 흐름 문구 (5개 언어).
// 기본 문구(i18n.ts)·사주 문구(saju-i18n.ts)와 같은 계약: ProgramText 를 다섯 언어가 모두 채워야 빌드된다.
// AI가 쓰는 진단·풀이 문장은 여기가 아니라 분석 API가 손님 언어로 만든다. 타로 카드 이름은 tarot-deck.ts.

import type { KioskLang } from './i18n'
import type { KioskProgramId } from './modes'
import type { PersonalColorTypeId, TarotElement, TarotPosition, TarotTopic } from '@/types/analysis'

export type ColorGaugeKey = 'warmth' | 'brightness' | 'clarity' | 'contrast'

export interface ColorText {
  captureTitle: string
  captureDesc: string
  tips: string[]
  confirmTitle: string
  noFace: string
  /** 분석 실패 카드의 '다시 찍기' — 같은 사진으로 다시 보내면 또 실패하기 쉽다 */
  retake: string
  statusLines: string[]
  eta: string
  chapter: string
  typeLabel: string
  typeNames: Record<PersonalColorTypeId, string>
  undertone: { warm: string; cool: string }
  gaugeTitle: string
  gauges: Record<ColorGaugeKey, { label: string; low: string; high: string }>
  observeTitle: string
  observe: { skin: string; hair: string; eyes: string }
  drapeTitle: string
  drapeHint: string
  best: string
  avoid: string
  stylingTitle: string
  styling: { makeup: string; hair: string; fashion: string; accessory: string }
  metal: Record<'gold' | 'silver' | 'rose-gold', string>
  lowConfidence: string
  disclaimer: string
  receipt: { subtitle: string; title: string; tone: string; best: string; avoid: string; styling: string }
}

export interface TarotText {
  topicTitle: string
  topicDesc: string
  topics: Record<TarotTopic, { label: string; desc: string }>
  questionTitle: string
  questionDesc: string
  questionPh: string
  questionHint: string
  skip: string
  cardsTitle: string
  cardsDesc: string
  revealedTitle: string
  picked: (n: number, total: number) => string
  reveal: string
  reshuffle: string
  /** 고른 카드를 다시 눌러 한 장만 무를 수 있다는 안내 */
  undoHint: string
  readCards: string
  positions: Record<TarotPosition, { label: string; desc: string }>
  upright: string
  reversed: string
  elements: Record<TarotElement, string>
  statusLines: string[]
  eta: string
  chapter: string
  questionLabel: string
  flowTitle: string
  adviceTitle: string
  disclaimer: string
  receipt: { subtitle: string; title: string; flow: string; advice: string }
}

export interface ProgramText {
  pickTitle: string
  pickDesc: string
  programs: Record<KioskProgramId, { title: string; desc: string; note: string }>
  more: string
  less: string
  /** 퍼스널 컬러·타로 영수증을 뽑았을 때 — 이 두 프로그램은 발권 번호가 없다 */
  printed: string
  /** 데모 결과(AI 키 없음·?mock=1) 영수증 꼬리말 — 만들 제품이 없으니 '제조용' 이야기를 하지 않는다 */
  demoNote: string
  color: ColorText
  tarot: TarotText
}

const ko: ProgramText = {
  pickTitle: '어떤 분석을 해볼까요?',
  pickDesc: '프로그램에 따라 물어보는 것이 달라집니다.',
  programs: {
    personal: { title: '내 이미지 분석', desc: '사진 속 나의 분위기에서 향을 찾습니다', note: '사진 필요' },
    idol: { title: '최애 이미지 분석', desc: '좋아하는 사람의 사진에서 향을 찾습니다', note: '사진 필요' },
    saju: { title: '사주 향 분석', desc: '태어난 시각의 기운으로 향을 처방합니다', note: '생년월일시 필요' },
    color: { title: 'AI 퍼스널 컬러 진단', desc: '얼굴빛에 어울리는 색을 찾아 드립니다', note: '촬영 필요' },
    tarot: { title: 'AI 타로', desc: '카드 세 장으로 지금의 흐름을 읽어 드립니다', note: '카드 3장' },
  },
  more: '자세히 보기',
  less: '접기',
  printed: '영수증을 인쇄했습니다',
  demoNote: '※ 데모 결과입니다 — 실제 분석이 아닙니다.',
  color: {
    captureTitle: '정면을 바라봐 주세요',
    captureDesc: '사진은 진단을 위해 AI 분석 서버로만 전송되고, 저장하지 않습니다.',
    tips: ['모자 · 마스크 · 색안경은 벗어 주세요', '앞머리를 넘겨 이마가 살짝 보이게', '얼굴이 화면 가운데에 오게 서 주세요'],
    confirmTitle: '이 사진으로 진단할까요?',
    noFace: '얼굴을 찾지 못했습니다. 정면에서 다시 찍어 주세요.',
    retake: '다시 찍기',
    statusLines: ['피부 톤의 온도를 읽는 중...', '머리카락과 눈동자 색을 비교하는 중...', '명도와 선명도를 재는 중...', '사계절 팔레트에 맞춰 보는 중...'],
    eta: '보통 10~20초 정도 걸립니다.',
    chapter: 'PERSONAL COLOR',
    typeLabel: '나의 퍼스널 컬러',
    typeNames: {
      'spring-light': '봄 라이트', 'spring-bright': '봄 브라이트', 'summer-light': '여름 라이트', 'summer-mute': '여름 뮤트',
      'autumn-mute': '가을 뮤트', 'autumn-deep': '가을 딥', 'winter-bright': '겨울 브라이트', 'winter-deep': '겨울 딥',
    },
    undertone: { warm: '웜톤', cool: '쿨톤' },
    gaugeTitle: '톤 분석',
    gauges: {
      warmth: { label: '온도', low: '쿨', high: '웜' },
      brightness: { label: '명도', low: '깊게', high: '밝게' },
      clarity: { label: '선명도', low: '부드럽게', high: '선명하게' },
      contrast: { label: '대비', low: '은은하게', high: '또렷하게' },
    },
    observeTitle: 'AI가 본 것',
    observe: { skin: '피부', hair: '머리카락', eyes: '눈동자' },
    drapeTitle: '색을 대어 보세요',
    drapeHint: '색을 누르면 얼굴 옆에 대어 봅니다.',
    best: '잘 어울리는 색',
    avoid: '피하면 좋은 색',
    stylingTitle: '스타일 가이드',
    styling: { makeup: '메이크업', hair: '헤어', fashion: '옷', accessory: '액세서리' },
    metal: { gold: '골드', silver: '실버', 'rose-gold': '로즈골드' },
    lowConfidence: '조명 때문에 정확도가 낮을 수 있어요. 밝은 곳에서 한 번 더 확인해 보세요.',
    disclaimer: 'AI가 사진 한 장으로 본 참고용 진단입니다. 조명과 화장에 따라 달라질 수 있습니다.',
    receipt: { subtitle: 'PERSONAL COLOR REPORT', title: '퍼스널 컬러 진단서', tone: '톤 분석', best: '어울리는 색', avoid: '피할 색', styling: '스타일 가이드' },
  },
  tarot: {
    topicTitle: '무엇이 궁금하세요?',
    topicDesc: '고르신 주제로 카드 세 장을 읽어 드립니다.',
    topics: {
      general: { label: '오늘의 흐름', desc: '지금 내게 흐르는 기운' },
      love: { label: '연애', desc: '마음이 향하는 곳과 인연' },
      career: { label: '일 · 진로', desc: '하는 일과 나아갈 방향' },
      money: { label: '금전', desc: '들어오고 나가는 흐름' },
      self: { label: '나 자신', desc: '요즘 내 마음의 상태' },
    },
    questionTitle: '카드에게 묻고 싶은 것이 있나요?',
    questionDesc: '한 줄만 적어 주시면 풀이에 함께 엮습니다. 건너뛰어도 됩니다.',
    questionPh: '예) 새로운 일을 시작해도 될까요',
    questionHint: '질문 한 줄',
    skip: '건너뛰기',
    cardsTitle: '마음이 가는 카드 세 장을 골라 주세요',
    cardsDesc: '질문을 떠올리며 천천히 고르세요. 고른 순서대로 과거 · 현재 · 미래가 됩니다.',
    revealedTitle: '세 장의 카드가 펼쳐졌습니다',
    picked: (n, total) => `${n} / ${total}`,
    reveal: '카드 펼치기',
    reshuffle: '다시 섞기',
    undoHint: '고른 카드를 다시 누르면 그 한 장만 취소됩니다.',
    readCards: '풀이 보기',
    positions: {
      past: { label: '과거', desc: '지나온 흐름' },
      present: { label: '현재', desc: '지금의 자리' },
      future: { label: '미래', desc: '다가오는 기운' },
    },
    upright: '정방향',
    reversed: '역방향',
    elements: { fire: '불', water: '물', air: '바람', earth: '흙' },
    statusLines: ['카드를 펼치는 중...', '세 장의 흐름을 읽는 중...', '카드의 원소를 살피는 중...'],
    eta: '보통 10~20초 정도 걸립니다.',
    chapter: 'TAROT · 세 장의 흐름',
    questionLabel: '질문',
    flowTitle: '세 장이 말하는 것',
    adviceTitle: '카드의 조언',
    disclaimer: '타로는 재미로 보는 참고용 풀이입니다.',
    receipt: { subtitle: 'TAROT READING', title: '타로 리딩', flow: '흐름', advice: '카드의 조언' },
  },
}

const en: ProgramText = {
  pickTitle: 'Which one would you like to try?',
  pickDesc: 'Each program asks you different things.',
  programs: {
    personal: { title: 'My Image Analysis', desc: 'Find a scent from the mood of your photo', note: 'Photo needed' },
    idol: { title: 'Bias Image Analysis', desc: 'Find a scent from a photo of someone you love', note: 'Photo needed' },
    saju: { title: 'Saju Scent Reading', desc: 'A scent prescribed from the energy of your birth', note: 'Birth date needed' },
    color: { title: 'AI Personal Color', desc: 'Find the colors that suit your skin tone', note: 'Selfie needed' },
    tarot: { title: 'AI Tarot', desc: 'A three-card reading of where you are now', note: '3 cards' },
  },
  more: 'Read more',
  less: 'Show less',
  printed: 'Your receipt has been printed',
  demoNote: '※ Demo result — not a real analysis.',
  color: {
    captureTitle: 'Please face the camera',
    captureDesc: 'Your photo is sent only to the AI server for this diagnosis and is not stored.',
    tips: ['Take off hats, masks and tinted glasses', 'Brush your fringe aside so your forehead shows', 'Stand so your face is in the centre'],
    confirmTitle: 'Use this photo?',
    noFace: 'We could not find a face. Please face the camera and try again.',
    retake: 'Retake photo',
    statusLines: ['Reading the warmth of your skin tone...', 'Comparing hair and eye colour...', 'Measuring brightness and clarity...', 'Matching the four-season palettes...'],
    eta: 'This usually takes 10–20 seconds.',
    chapter: 'PERSONAL COLOR',
    typeLabel: 'Your personal color',
    typeNames: {
      'spring-light': 'Light Spring', 'spring-bright': 'Bright Spring', 'summer-light': 'Light Summer', 'summer-mute': 'Soft Summer',
      'autumn-mute': 'Soft Autumn', 'autumn-deep': 'Deep Autumn', 'winter-bright': 'Bright Winter', 'winter-deep': 'Deep Winter',
    },
    undertone: { warm: 'Warm tone', cool: 'Cool tone' },
    gaugeTitle: 'Tone analysis',
    gauges: {
      warmth: { label: 'Temperature', low: 'Cool', high: 'Warm' },
      brightness: { label: 'Value', low: 'Deep', high: 'Light' },
      clarity: { label: 'Clarity', low: 'Soft', high: 'Clear' },
      contrast: { label: 'Contrast', low: 'Low', high: 'High' },
    },
    observeTitle: 'What the AI saw',
    observe: { skin: 'Skin', hair: 'Hair', eyes: 'Eyes' },
    drapeTitle: 'Try the colors',
    drapeHint: 'Tap a color to hold it next to your face.',
    best: 'Colors that suit you',
    avoid: 'Colors to avoid',
    stylingTitle: 'Style guide',
    styling: { makeup: 'Makeup', hair: 'Hair', fashion: 'Clothes', accessory: 'Accessories' },
    metal: { gold: 'Gold', silver: 'Silver', 'rose-gold': 'Rose gold' },
    lowConfidence: 'The lighting may have affected accuracy. Try again somewhere brighter to confirm.',
    disclaimer: 'A reference diagnosis by AI from a single photo. Lighting and makeup can change the result.',
    receipt: { subtitle: 'PERSONAL COLOR REPORT', title: 'Personal Color Report', tone: 'Tone analysis', best: 'Best colors', avoid: 'Avoid', styling: 'Style guide' },
  },
  tarot: {
    topicTitle: 'What would you like to ask?',
    topicDesc: 'We read three cards through the topic you choose.',
    topics: {
      general: { label: 'Today', desc: 'The energy around you now' },
      love: { label: 'Love', desc: 'Where your heart is heading' },
      career: { label: 'Work', desc: 'Your work and your direction' },
      money: { label: 'Money', desc: 'What comes in and goes out' },
      self: { label: 'Myself', desc: 'The state of your mind lately' },
    },
    questionTitle: 'Anything to ask the cards?',
    questionDesc: 'One line is enough — we weave it into the reading. You can skip this.',
    questionPh: 'e.g. Should I start something new?',
    questionHint: 'Your question',
    skip: 'Skip',
    cardsTitle: 'Pick the three cards that call you',
    cardsDesc: 'Hold your question in mind. In the order you pick: past · present · future.',
    revealedTitle: 'Your three cards',
    picked: (n, total) => `${n} / ${total}`,
    reveal: 'Reveal the cards',
    reshuffle: 'Shuffle again',
    undoHint: 'Tap a chosen card again to put it back.',
    readCards: 'Read my cards',
    positions: {
      past: { label: 'Past', desc: 'What has passed' },
      present: { label: 'Present', desc: 'Where you stand' },
      future: { label: 'Future', desc: 'What is coming' },
    },
    upright: 'Upright',
    reversed: 'Reversed',
    elements: { fire: 'Fire', water: 'Water', air: 'Air', earth: 'Earth' },
    statusLines: ['Turning the cards...', 'Reading the flow of the three...', 'Looking at the elements...'],
    eta: 'This usually takes 10–20 seconds.',
    chapter: 'TAROT · THREE CARDS',
    questionLabel: 'Question',
    flowTitle: 'What the three cards say',
    adviceTitle: 'Advice from the cards',
    disclaimer: 'Tarot is a reading for fun and reflection.',
    receipt: { subtitle: 'TAROT READING', title: 'Tarot Reading', flow: 'The flow', advice: 'Advice' },
  },
}

const ja: ProgramText = {
  pickTitle: 'どの診断にしますか？',
  pickDesc: 'プログラムによって質問が変わります。',
  programs: {
    personal: { title: '私のイメージ診断', desc: '写真の雰囲気から香りを見つけます', note: '写真が必要' },
    idol: { title: '推しイメージ診断', desc: '好きな人の写真から香りを見つけます', note: '写真が必要' },
    saju: { title: '四柱推命の香り', desc: '生まれた時の気から香りを処方します', note: '生年月日が必要' },
    color: { title: 'AIパーソナルカラー診断', desc: '肌色に似合う色を見つけます', note: '撮影が必要' },
    tarot: { title: 'AIタロット', desc: '3枚のカードで今の流れを読み解きます', note: 'カード3枚' },
  },
  more: 'くわしく見る',
  less: '閉じる',
  printed: 'レシートを印刷しました',
  demoNote: '※ デモ結果です — 実際の分析ではありません。',
  color: {
    captureTitle: '正面を向いてください',
    captureDesc: '写真は診断のためAI分析サーバーにのみ送信され、保存されません。',
    tips: ['帽子・マスク・色付きメガネは外してください', '前髪を分けて額が少し見えるように', '顔が画面の中央に来るように立ってください'],
    confirmTitle: 'この写真で診断しますか？',
    noFace: '顔が見つかりませんでした。正面からもう一度撮影してください。',
    retake: '撮り直す',
    statusLines: ['肌トーンの温度を読み取り中...', '髪と瞳の色を比べています...', '明度と鮮やかさを測っています...', '四季のパレットに合わせています...'],
    eta: '通常10〜20秒ほどかかります。',
    chapter: 'PERSONAL COLOR · パーソナルカラー',
    typeLabel: 'あなたのパーソナルカラー',
    typeNames: {
      'spring-light': 'スプリング・ライト', 'spring-bright': 'スプリング・ブライト', 'summer-light': 'サマー・ライト', 'summer-mute': 'サマー・ミュート',
      'autumn-mute': 'オータム・ミュート', 'autumn-deep': 'オータム・ディープ', 'winter-bright': 'ウィンター・ブライト', 'winter-deep': 'ウィンター・ディープ',
    },
    undertone: { warm: 'イエローベース', cool: 'ブルーベース' },
    gaugeTitle: 'トーン分析',
    gauges: {
      warmth: { label: '温度', low: 'クール', high: 'ウォーム' },
      brightness: { label: '明度', low: '深く', high: '明るく' },
      clarity: { label: '鮮やかさ', low: 'やわらか', high: 'クリア' },
      contrast: { label: 'コントラスト', low: '控えめ', high: 'はっきり' },
    },
    observeTitle: 'AIが見たもの',
    observe: { skin: '肌', hair: '髪', eyes: '瞳' },
    drapeTitle: '色を当ててみましょう',
    drapeHint: '色を押すと顔の横に当てられます。',
    best: '似合う色',
    avoid: '避けたい色',
    stylingTitle: 'スタイルガイド',
    styling: { makeup: 'メイク', hair: 'ヘア', fashion: '服', accessory: 'アクセサリー' },
    metal: { gold: 'ゴールド', silver: 'シルバー', 'rose-gold': 'ローズゴールド' },
    lowConfidence: '照明の影響で精度が下がっているかもしれません。明るい場所でもう一度お試しください。',
    disclaimer: 'AIが写真1枚から判断した参考診断です。照明やメイクで変わることがあります。',
    receipt: { subtitle: 'PERSONAL COLOR REPORT', title: 'パーソナルカラー診断書', tone: 'トーン分析', best: '似合う色', avoid: '避けたい色', styling: 'スタイルガイド' },
  },
  tarot: {
    topicTitle: '何が気になりますか？',
    topicDesc: '選んだテーマで3枚のカードを読みます。',
    topics: {
      general: { label: '今日の流れ', desc: '今あなたに流れている気' },
      love: { label: '恋愛', desc: '心の向かう先とご縁' },
      career: { label: '仕事・進路', desc: '仕事と進む方向' },
      money: { label: '金運', desc: '入るものと出ていくもの' },
      self: { label: '自分自身', desc: '最近の心の状態' },
    },
    questionTitle: 'カードに聞きたいことはありますか？',
    questionDesc: '一行だけ書いていただければ読みに織り込みます。スキップもできます。',
    questionPh: '例）新しいことを始めてもいいですか',
    questionHint: '質問を一行',
    skip: 'スキップ',
    cardsTitle: '気になるカードを3枚選んでください',
    cardsDesc: '質問を思い浮かべながらゆっくりと。選んだ順に 過去・現在・未来 になります。',
    revealedTitle: '3枚のカードが開かれました',
    picked: (n, total) => `${n} / ${total}`,
    reveal: 'カードをめくる',
    reshuffle: '混ぜ直す',
    undoHint: '選んだカードをもう一度押すと、その1枚だけ取り消せます。',
    readCards: '結果を見る',
    positions: {
      past: { label: '過去', desc: 'これまでの流れ' },
      present: { label: '現在', desc: '今の立ち位置' },
      future: { label: '未来', desc: 'これから来る気' },
    },
    upright: '正位置',
    reversed: '逆位置',
    elements: { fire: '火', water: '水', air: '風', earth: '地' },
    statusLines: ['カードを開いています...', '3枚の流れを読んでいます...', 'カードのエレメントを見ています...'],
    eta: '通常10〜20秒ほどかかります。',
    chapter: 'TAROT · 3枚の流れ',
    questionLabel: '質問',
    flowTitle: '3枚が語ること',
    adviceTitle: 'カードからのアドバイス',
    disclaimer: 'タロットは楽しむための参考リーディングです。',
    receipt: { subtitle: 'TAROT READING', title: 'タロットリーディング', flow: '流れ', advice: 'アドバイス' },
  },
}

const zhHans: ProgramText = {
  pickTitle: '想体验哪一项？',
  pickDesc: '不同项目会问不同的问题。',
  programs: {
    personal: { title: '我的形象分析', desc: '从照片的氛围中找到香气', note: '需要照片' },
    idol: { title: '本命形象分析', desc: '从喜欢的人的照片中找到香气', note: '需要照片' },
    saju: { title: '八字香气分析', desc: '根据出生时的气开出香气处方', note: '需要出生日期' },
    color: { title: 'AI 个人色彩诊断', desc: '找到适合肤色的颜色', note: '需要拍照' },
    tarot: { title: 'AI 塔罗', desc: '用三张牌解读你现在的状态', note: '3 张牌' },
  },
  more: '查看详情',
  less: '收起',
  printed: '小票已打印',
  demoNote: '※ 演示结果 — 并非真实分析。',
  color: {
    captureTitle: '请正对镜头',
    captureDesc: '照片仅发送至 AI 分析服务器用于诊断，不会保存。',
    tips: ['请摘下帽子、口罩和有色眼镜', '把刘海拨开，露出一点额头', '请站好，让脸位于画面中央'],
    confirmTitle: '用这张照片诊断吗？',
    noFace: '没有找到人脸，请正对镜头重新拍摄。',
    retake: '重新拍摄',
    statusLines: ['正在读取肤色的冷暖...', '正在比较发色与瞳色...', '正在测量明度与清晰度...', '正在对照四季色盘...'],
    eta: '通常需要 10~20 秒。',
    chapter: 'PERSONAL COLOR · 个人色彩',
    typeLabel: '你的个人色彩',
    typeNames: {
      'spring-light': '浅春型', 'spring-bright': '净春型', 'summer-light': '浅夏型', 'summer-mute': '柔夏型',
      'autumn-mute': '柔秋型', 'autumn-deep': '深秋型', 'winter-bright': '净冬型', 'winter-deep': '深冬型',
    },
    undertone: { warm: '暖色调', cool: '冷色调' },
    gaugeTitle: '色调分析',
    gauges: {
      warmth: { label: '冷暖', low: '冷', high: '暖' },
      brightness: { label: '明度', low: '深', high: '浅' },
      clarity: { label: '清晰度', low: '柔和', high: '清透' },
      contrast: { label: '对比', low: '柔', high: '强' },
    },
    observeTitle: 'AI 看到的',
    observe: { skin: '皮肤', hair: '头发', eyes: '眼睛' },
    drapeTitle: '试试这些颜色',
    drapeHint: '点击颜色，放在脸旁看看。',
    best: '适合你的颜色',
    avoid: '建议避开的颜色',
    stylingTitle: '风格指南',
    styling: { makeup: '妆容', hair: '发型发色', fashion: '穿搭', accessory: '配饰' },
    metal: { gold: '金色', silver: '银色', 'rose-gold': '玫瑰金' },
    lowConfidence: '灯光可能影响了准确度，建议在明亮处再确认一次。',
    disclaimer: '这是 AI 根据一张照片给出的参考诊断，灯光和妆容可能影响结果。',
    receipt: { subtitle: 'PERSONAL COLOR REPORT', title: '个人色彩诊断书', tone: '色调分析', best: '适合的颜色', avoid: '避开的颜色', styling: '风格指南' },
  },
  tarot: {
    topicTitle: '想问些什么？',
    topicDesc: '按你选择的主题解读三张牌。',
    topics: {
      general: { label: '今日运势', desc: '此刻围绕你的气' },
      love: { label: '爱情', desc: '心之所向与缘分' },
      career: { label: '事业', desc: '工作与前进的方向' },
      money: { label: '财运', desc: '进与出的流动' },
      self: { label: '自己', desc: '最近的内心状态' },
    },
    questionTitle: '有想问牌的事吗？',
    questionDesc: '写一句话即可，我们会融入解读。也可以跳过。',
    questionPh: '例如：可以开始新的事情吗',
    questionHint: '一句话提问',
    skip: '跳过',
    cardsTitle: '请选出三张有感觉的牌',
    cardsDesc: '想着你的问题慢慢选。按选择的顺序为 过去 · 现在 · 未来。',
    revealedTitle: '三张牌已翻开',
    picked: (n, total) => `${n} / ${total}`,
    reveal: '翻开牌',
    reshuffle: '重新洗牌',
    undoHint: '再点一次已选的牌，即可取消这一张。',
    readCards: '查看解读',
    positions: {
      past: { label: '过去', desc: '走过的路' },
      present: { label: '现在', desc: '当下的位置' },
      future: { label: '未来', desc: '将要到来的气' },
    },
    upright: '正位',
    reversed: '逆位',
    elements: { fire: '火', water: '水', air: '风', earth: '土' },
    statusLines: ['正在翻开牌...', '正在解读三张牌的流动...', '正在查看牌的元素...'],
    eta: '通常需要 10~20 秒。',
    chapter: 'TAROT · 三张牌',
    questionLabel: '问题',
    flowTitle: '三张牌想说的',
    adviceTitle: '牌的建议',
    disclaimer: '塔罗是供娱乐参考的解读。',
    receipt: { subtitle: 'TAROT READING', title: '塔罗解读', flow: '流动', advice: '牌的建议' },
  },
}

const zhHant: ProgramText = {
  pickTitle: '想體驗哪一項？',
  pickDesc: '不同項目會問不同的問題。',
  programs: {
    personal: { title: '我的形象分析', desc: '從照片的氛圍中找到香氣', note: '需要照片' },
    idol: { title: '本命形象分析', desc: '從喜歡的人的照片中找到香氣', note: '需要照片' },
    saju: { title: '八字香氣分析', desc: '根據出生時的氣開出香氣處方', note: '需要出生日期' },
    color: { title: 'AI 個人色彩診斷', desc: '找到適合膚色的顏色', note: '需要拍照' },
    tarot: { title: 'AI 塔羅', desc: '用三張牌解讀你現在的狀態', note: '3 張牌' },
  },
  more: '查看詳情',
  less: '收起',
  printed: '收據已列印',
  demoNote: '※ 示範結果 — 並非真實分析。',
  color: {
    captureTitle: '請正對鏡頭',
    captureDesc: '照片僅傳送至 AI 分析伺服器用於診斷，不會保存。',
    tips: ['請摘下帽子、口罩和有色眼鏡', '把瀏海撥開，露出一點額頭', '請站好，讓臉位於畫面中央'],
    confirmTitle: '用這張照片診斷嗎？',
    noFace: '沒有找到人臉，請正對鏡頭重新拍攝。',
    retake: '重新拍攝',
    statusLines: ['正在讀取膚色的冷暖...', '正在比較髮色與瞳色...', '正在測量明度與清晰度...', '正在對照四季色盤...'],
    eta: '通常需要 10~20 秒。',
    chapter: 'PERSONAL COLOR · 個人色彩',
    typeLabel: '你的個人色彩',
    typeNames: {
      'spring-light': '淺春型', 'spring-bright': '淨春型', 'summer-light': '淺夏型', 'summer-mute': '柔夏型',
      'autumn-mute': '柔秋型', 'autumn-deep': '深秋型', 'winter-bright': '淨冬型', 'winter-deep': '深冬型',
    },
    undertone: { warm: '暖色調', cool: '冷色調' },
    gaugeTitle: '色調分析',
    gauges: {
      warmth: { label: '冷暖', low: '冷', high: '暖' },
      brightness: { label: '明度', low: '深', high: '淺' },
      clarity: { label: '清晰度', low: '柔和', high: '清透' },
      contrast: { label: '對比', low: '柔', high: '強' },
    },
    observeTitle: 'AI 看到的',
    observe: { skin: '皮膚', hair: '頭髮', eyes: '眼睛' },
    drapeTitle: '試試這些顏色',
    drapeHint: '點選顏色，放在臉旁看看。',
    best: '適合你的顏色',
    avoid: '建議避開的顏色',
    stylingTitle: '風格指南',
    styling: { makeup: '妝容', hair: '髮型髮色', fashion: '穿搭', accessory: '配飾' },
    metal: { gold: '金色', silver: '銀色', 'rose-gold': '玫瑰金' },
    lowConfidence: '燈光可能影響了準確度，建議在明亮處再確認一次。',
    disclaimer: '這是 AI 根據一張照片給出的參考診斷，燈光和妝容可能影響結果。',
    receipt: { subtitle: 'PERSONAL COLOR REPORT', title: '個人色彩診斷書', tone: '色調分析', best: '適合的顏色', avoid: '避開的顏色', styling: '風格指南' },
  },
  tarot: {
    topicTitle: '想問些什麼？',
    topicDesc: '依你選擇的主題解讀三張牌。',
    topics: {
      general: { label: '今日運勢', desc: '此刻圍繞你的氣' },
      love: { label: '愛情', desc: '心之所向與緣分' },
      career: { label: '事業', desc: '工作與前進的方向' },
      money: { label: '財運', desc: '進與出的流動' },
      self: { label: '自己', desc: '最近的內心狀態' },
    },
    questionTitle: '有想問牌的事嗎？',
    questionDesc: '寫一句話即可，我們會融入解讀。也可以跳過。',
    questionPh: '例如：可以開始新的事情嗎',
    questionHint: '一句話提問',
    skip: '跳過',
    cardsTitle: '請選出三張有感覺的牌',
    cardsDesc: '想著你的問題慢慢選。依選擇的順序為 過去 · 現在 · 未來。',
    revealedTitle: '三張牌已翻開',
    picked: (n, total) => `${n} / ${total}`,
    reveal: '翻開牌',
    reshuffle: '重新洗牌',
    undoHint: '再點一次已選的牌，即可取消這一張。',
    readCards: '查看解讀',
    positions: {
      past: { label: '過去', desc: '走過的路' },
      present: { label: '現在', desc: '當下的位置' },
      future: { label: '未來', desc: '將要到來的氣' },
    },
    upright: '正位',
    reversed: '逆位',
    elements: { fire: '火', water: '水', air: '風', earth: '土' },
    statusLines: ['正在翻開牌...', '正在解讀三張牌的流動...', '正在查看牌的元素...'],
    eta: '通常需要 10~20 秒。',
    chapter: 'TAROT · 三張牌',
    questionLabel: '問題',
    flowTitle: '三張牌想說的',
    adviceTitle: '牌的建議',
    disclaimer: '塔羅是供娛樂參考的解讀。',
    receipt: { subtitle: 'TAROT READING', title: '塔羅解讀', flow: '流動', advice: '牌的建議' },
  },
}

const TEXTS: Record<KioskLang, ProgramText> = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }

export function programText(lang: KioskLang): ProgramText {
  return TEXTS[lang] ?? ko
}
