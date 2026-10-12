import type { KioskLang } from '@/lib/kiosk/i18n'
import type { NailPattern } from './engine'

export type NailColor = 'rose' | 'burgundy' | 'cream' | 'nude'

export interface NailText {
  brand: string
  headline: string
  sub: string
  chips: [string, string, string]
  cta: string
  foot: string
  steps: [string, string, string]
  captureTitle: string
  captureDesc: string
  tips: [string, string, string]
  captureNote: string
  shoot: string
  finding: string
  noHand: [string, string]
  fewNails: [string, string]
  palmHint: string
  retake: string
  editTitle: string
  showOriginal: string
  showDesign: string
  editNote: string
  patterns: Record<NailPattern, string>
  baseLabel: string
  colors: Record<NailColor, string>
  finishLabel: string
  finishes: { glossy: string; matte: string }
  sizeLabel: string
  sizeDown: string
  sizeUp: string
  /** 디자인 이름 — {base} {pattern} 자리에 색·패턴 이름이 들어간다 */
  name: string
  /** 한 줄 조합 설명 — {base} · {point} */
  combo: Record<NailPattern, string>
  desc: Record<NailPattern, string>
  toResult: string
  resultTitle: string
  selectedTitle: string
  patternLabel: string
  paletteTitle: string
  baseTag: string
  pointTag: string
  glitterTag: string
  colorNote: string
  again: string
  save: string
  saveTitle: string
  cardLabel: string
}

const ko: NailText = {
  brand: 'VIRTUAL NAIL STUDIO',
  headline: '손끝에 나만의 분위기를',
  sub: '손 사진 한 장으로 디자인을 미리 입혀보세요.',
  chips: ['컬러', '패턴', '광택'],
  cta: '내 네일 디자인하기',
  foot: '내 손 사진으로 미리 보는 네일 체험',
  steps: ['촬영', '디자인', '저장'],
  captureTitle: '손 사진을 촬영해 주세요.',
  captureDesc: '손등을 위로, 손가락을 살짝 벌려 주세요.',
  tips: ['손톱이 모두 보이게', '그림자 없이', '손은 편안하게'],
  captureNote: '손톱에만 디자인을 입혀요.',
  shoot: '손 사진 촬영',
  finding: '손톱을 찾고 있어요…',
  noHand: ['손을 찾지 못했어요.', '손등이 안내선 안에 오도록 다시 촬영해 주세요.'],
  fewNails: ['손톱이 잘 보이지 않아요.', '손가락을 펴고 다시 촬영해 주세요.'],
  palmHint: '손바닥이 보이는 것 같아요. 손등으로 찍으면 더 잘 어울려요.',
  retake: '다시 촬영',
  editTitle: '손끝의 스타일을 골라보세요.',
  showOriginal: '원본 보기',
  showDesign: '디자인 보기',
  editNote: '손톱에만 색을 입혔어요.',
  patterns: { solid: '원컬러', french: '프렌치', ombre: '그라데이션', glitter: '글리터' },
  baseLabel: '베이스 컬러',
  colors: { rose: '로즈', burgundy: '버건디', cream: '크림', nude: '누드' },
  finishLabel: '마감',
  finishes: { glossy: '글로시', matte: '매트' },
  sizeLabel: '손톱 크기',
  sizeDown: '작게',
  sizeUp: '크게',
  name: '{base} {pattern}',
  combo: {
    solid: '{base} 한 가지 색',
    french: '{base} 베이스 + {point} 포인트',
    ombre: '{base}에서 {point}로',
    glitter: '{base} 베이스 + 골드 글리터',
  },
  desc: {
    solid: '깔끔하게 채운 {base} 한 가지 색',
    french: '부드러운 {base}에 {point} 한 방울',
    ombre: '{base}에서 {point}로 번지는 손끝',
    glitter: '{base} 위에 반짝이는 골드 조각',
  },
  toResult: '이 디자인으로 선택',
  resultTitle: '나만의 네일 디자인',
  selectedTitle: '선택한 디자인',
  patternLabel: '패턴',
  paletteTitle: '컬러 팔레트',
  baseTag: '베이스',
  pointTag: '포인트',
  glitterTag: '골드 글리터',
  colorNote: '색상과 광택은 실제 시술과 다를 수 있어요.',
  again: '다른 디자인 보기',
  save: '디자인 이미지 저장',
  saveTitle: '네일 디자인을 휴대폰으로',
  cardLabel: '네일 디자인',
}

const en: NailText = {
  brand: 'VIRTUAL NAIL STUDIO',
  headline: 'A mood of your own, at your fingertips',
  sub: 'Try nail designs on with a single photo of your hand.',
  chips: ['Color', 'Pattern', 'Finish'],
  cta: 'Design my nails',
  foot: 'A nail preview on your own hand photo',
  steps: ['Photo', 'Design', 'Save'],
  captureTitle: 'Take a photo of your hand.',
  captureDesc: 'Back of the hand up, fingers slightly apart.',
  tips: ['All nails visible', 'No shadows', 'Relax your hand'],
  captureNote: 'The design goes on your nails only.',
  shoot: 'Take hand photo',
  finding: 'Finding your nails…',
  noHand: ['We couldn’t find a hand.', 'Keep the back of your hand inside the guide and try again.'],
  fewNails: ['Your nails are hard to see.', 'Straighten your fingers and try again.'],
  palmHint: 'This looks like your palm. The back of the hand works better.',
  retake: 'Retake',
  editTitle: 'Pick your fingertip style.',
  showOriginal: 'Original',
  showDesign: 'Design',
  editNote: 'Color is applied to the nails only.',
  patterns: { solid: 'Solid', french: 'French', ombre: 'Ombré', glitter: 'Glitter' },
  baseLabel: 'Base color',
  colors: { rose: 'Rose', burgundy: 'Burgundy', cream: 'Cream', nude: 'Nude' },
  finishLabel: 'Finish',
  finishes: { glossy: 'Glossy', matte: 'Matte' },
  sizeLabel: 'Nail size',
  sizeDown: 'Smaller',
  sizeUp: 'Larger',
  name: '{base} {pattern}',
  combo: {
    solid: '{base}, one color',
    french: '{base} base + {point} tip',
    ombre: '{base} into {point}',
    glitter: '{base} base + gold glitter',
  },
  desc: {
    solid: 'A clean coat of {base}',
    french: 'Soft {base} with a touch of {point}',
    ombre: '{base} fading into {point}',
    glitter: 'Gold flakes sparkling over {base}',
  },
  toResult: 'Choose this design',
  resultTitle: 'My nail design',
  selectedTitle: 'Selected design',
  patternLabel: 'Pattern',
  paletteTitle: 'Color palette',
  baseTag: 'Base',
  pointTag: 'Point',
  glitterTag: 'Gold glitter',
  colorNote: 'Color and shine may differ from a real manicure.',
  again: 'Try another design',
  save: 'Save design image',
  saveTitle: 'Send the design to your phone',
  cardLabel: 'Nail design',
}

// 일본어 — 네일숍에서 쓰는 말(グラデ·ラメ·ツヤ). 버건디는 ボルドー, 골드 글리터는 金ラメ:
// 저장 카드 색상표('ポイント · …', 30px)가 카드 폭 294px 안에 들어가야 한다.
const ja: NailText = {
  brand: 'VIRTUAL NAIL STUDIO',
  headline: '指先に、私だけのムードを',
  sub: '手の写真1枚で、デザインを試せます。',
  chips: ['カラー', 'パターン', 'ツヤ'],
  cta: 'ネイルをデザインする',
  foot: '自分の手の写真で試すネイル体験',
  steps: ['撮影', 'デザイン', '保存'],
  captureTitle: '手の写真を撮ってください。',
  captureDesc: '手の甲を上に、指を少し開いてください。',
  tips: ['爪を全部見せて', '影なしで', '手は楽に'],
  captureNote: '爪にだけデザインします。',
  shoot: '手を撮影する',
  finding: '爪を探しています…',
  noHand: ['手が見つかりません。', '手の甲をガイド内に収めて撮り直してください。'],
  fewNails: ['爪がよく見えません。', '指を伸ばして撮り直してください。'],
  palmHint: '手のひらのようです。手の甲で撮るとよりきれいです。',
  retake: '撮り直す',
  editTitle: '指先のスタイルを選びましょう。',
  showOriginal: '元の写真',
  showDesign: 'デザイン',
  editNote: '爪にだけ色をのせました。',
  patterns: { solid: 'ワンカラー', french: 'フレンチ', ombre: 'グラデ', glitter: 'ラメ' },
  baseLabel: 'ベースカラー',
  colors: { rose: 'ローズ', burgundy: 'ボルドー', cream: 'クリーム', nude: 'ヌード' },
  finishLabel: '仕上げ',
  finishes: { glossy: 'ツヤ', matte: 'マット' },
  sizeLabel: '爪のサイズ',
  sizeDown: '小さく',
  sizeUp: '大きく',
  name: '{base}{pattern}',
  combo: {
    solid: '{base}一色',
    french: '{base}ベース + {point}ポイント',
    ombre: '{base}から{point}へ',
    glitter: '{base}ベース + 金ラメ',
  },
  desc: {
    solid: 'すっきり塗った{base}一色',
    french: '柔らかな{base}に{point}をひとしずく',
    ombre: '{base}から{point}へにじむ指先',
    glitter: '{base}にきらめく金のかけら',
  },
  toResult: 'このデザインにする',
  resultTitle: '私だけのネイルデザイン',
  selectedTitle: '選んだデザイン',
  patternLabel: 'パターン',
  paletteTitle: 'カラーパレット',
  baseTag: 'ベース',
  pointTag: 'ポイント',
  glitterTag: '金ラメ',
  colorNote: '色やツヤは実際の施術と異なる場合があります。',
  again: '他のデザインを見る',
  save: 'デザイン画像を保存',
  saveTitle: 'ネイルデザインをスマホへ',
  cardLabel: 'ネイルデザイン',
}

const zhHans: NailText = {
  brand: 'VIRTUAL NAIL STUDIO',
  headline: '指尖上的专属氛围',
  sub: '一张手部照片，先试试美甲效果。',
  chips: ['颜色', '款式', '光泽'],
  cta: '设计我的美甲',
  foot: '用自己的手部照片预览美甲效果',
  steps: ['拍摄', '设计', '保存'],
  captureTitle: '请拍一张手部照片。',
  captureDesc: '手背朝上，手指稍微张开。',
  tips: ['露出全部指甲', '避免阴影', '手部放松'],
  captureNote: '只会在指甲上添加设计。',
  shoot: '拍摄手部照片',
  finding: '正在识别指甲…',
  noHand: ['没有找到手部。', '请将手背放在引导线内，重新拍摄。'],
  fewNails: ['指甲看不太清楚。', '请伸直手指，重新拍摄。'],
  palmHint: '好像拍到了手心。换成手背，效果会更好。',
  retake: '重新拍摄',
  editTitle: '挑选你的指尖风格吧。',
  showOriginal: '查看原图',
  showDesign: '查看设计',
  editNote: '只给指甲上了色。',
  patterns: { solid: '纯色', french: '法式', ombre: '渐变', glitter: '闪粉' },
  baseLabel: '底色',
  colors: { rose: '玫瑰', burgundy: '酒红', cream: '奶油', nude: '裸色' },
  finishLabel: '质感',
  finishes: { glossy: '亮面', matte: '哑光' },
  sizeLabel: '指甲大小',
  sizeDown: '缩小',
  sizeUp: '放大',
  name: '{base}{pattern}',
  combo: {
    solid: '只用{base}一色',
    french: '{base}底色 + {point}点缀',
    ombre: '从{base}到{point}',
    glitter: '{base}底色 + 金色闪粉',
  },
  desc: {
    solid: '干净利落，只涂{base}一色',
    french: '柔和的{base}，点上一抹{point}',
    ombre: '从{base}晕染到{point}的指尖',
    glitter: '{base}上闪烁的金色亮片',
  },
  toResult: '选择这款设计',
  resultTitle: '我的专属美甲设计',
  selectedTitle: '已选设计',
  patternLabel: '款式',
  paletteTitle: '色彩搭配',
  baseTag: '底色',
  pointTag: '点缀',
  glitterTag: '金色闪粉',
  colorNote: '颜色和光泽可能与实际美甲效果不同。',
  again: '看看其他设计',
  save: '保存设计图片',
  saveTitle: '把美甲设计发送到手机',
  cardLabel: '美甲设计',
}

// 번체는 대만 어휘로 따로 쓴다(單色·漸層·亮粉·霧面·儲存·傳送) — 간체를 글자만 바꾸지 않는다
const zhHant: NailText = {
  brand: 'VIRTUAL NAIL STUDIO',
  headline: '指尖上的專屬氛圍',
  sub: '一張手部照片，先試試美甲效果。',
  chips: ['顏色', '款式', '光澤'],
  cta: '設計我的美甲',
  foot: '用自己的手部照片預覽美甲效果',
  steps: ['拍攝', '設計', '儲存'],
  captureTitle: '請拍一張手部照片。',
  captureDesc: '手背朝上，手指稍微張開。',
  tips: ['露出全部指甲', '避免陰影', '手部放鬆'],
  captureNote: '只會在指甲上套用設計。',
  shoot: '拍攝手部照片',
  finding: '正在辨識指甲…',
  noHand: ['沒有找到手部。', '請將手背放在引導線內，重新拍攝。'],
  fewNails: ['指甲看不太清楚。', '請伸直手指，重新拍攝。'],
  palmHint: '好像拍到了手心。換成手背，效果會更好。',
  retake: '重新拍攝',
  editTitle: '挑選你的指尖風格吧。',
  showOriginal: '查看原圖',
  showDesign: '查看設計',
  editNote: '只為指甲上了色。',
  patterns: { solid: '單色', french: '法式', ombre: '漸層', glitter: '亮粉' },
  baseLabel: '底色',
  colors: { rose: '玫瑰', burgundy: '酒紅', cream: '奶油', nude: '裸色' },
  finishLabel: '質感',
  finishes: { glossy: '亮面', matte: '霧面' },
  sizeLabel: '指甲大小',
  sizeDown: '縮小',
  sizeUp: '放大',
  name: '{base}{pattern}',
  combo: {
    solid: '只用{base}一色',
    french: '{base}底色 + {point}點綴',
    ombre: '從{base}到{point}',
    glitter: '{base}底色 + 金色亮粉',
  },
  desc: {
    solid: '乾淨俐落，只塗{base}一色',
    french: '柔和的{base}，點上一抹{point}',
    ombre: '從{base}暈染到{point}的指尖',
    glitter: '{base}上閃爍的金色亮片',
  },
  toResult: '選擇這款設計',
  resultTitle: '我的專屬美甲設計',
  selectedTitle: '已選設計',
  patternLabel: '款式',
  paletteTitle: '色彩搭配',
  baseTag: '底色',
  pointTag: '點綴',
  glitterTag: '金色亮粉',
  colorNote: '顏色和光澤可能與實際美甲效果不同。',
  again: '看看其他設計',
  save: '儲存設計圖片',
  saveTitle: '把美甲設計傳送到手機',
  cardLabel: '美甲設計',
}

export const NAIL_TEXT: Partial<Record<KioskLang, NailText>> & { ko: NailText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }

/** '{base} 베이스 + {point} 포인트' 같은 틀에 이름을 채운다 */
export const fillNames = (template: string, names: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => names[key] ?? '')
