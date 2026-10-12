import type { KioskLang } from '@/lib/kiosk/i18n'
import type { CardAlign, CardColor, CardFont, CardTemplate } from './design'

export interface CardText {
  brand: string
  headline: [string, string]
  sub: string
  cta: string
  foot: string
  steps: [string, string, string]
  /** 첫 화면·템플릿 견본에 넣는 가상 이름 */
  sample: { name: string; role: string; contact: string }
  infoTitle: string
  infoDesc: string
  name: string
  role: string
  contact: string
  namePh: string
  rolePh: string
  contactPh: string
  nameHint: string
  roleHint: string
  contactHint: string
  templateTitle: string
  templates: Record<CardTemplate, string>
  toDesign: string
  editTitle: string
  front: string
  back: string
  frontPreview: string
  backPreview: string
  font: string
  fonts: Record<CardFont, string>
  color: string
  colors: Record<CardColor, string>
  align: string
  aligns: Record<CardAlign, string>
  toResult: string
  resultTitle: [string, string]
  fileTitle: string
  fileDesc: string
  edit: string
  toPhone: string
  frontLabel: string
  backLabel: string
  pdfLabel: string
}

const ko: CardText = {
  brand: '명함 디자이너',
  headline: ['나를 소개하는', '한 장의 디자인'],
  sub: '이름을 담고, 스타일을 고르면 완성',
  cta: '내 명함 만들기',
  foot: '나만의 디지털 명함',
  steps: ['정보 입력', '디자인', '완성'],
  sample: { name: '김하늘', role: '디자이너', contact: 'hello@example.com' },
  infoTitle: '어떤 나를 소개할까요?',
  infoDesc: '연락처는 원할 때만 넣어 주세요.',
  name: '이름',
  role: '역할 · 직업',
  contact: '연락처 (선택)',
  namePh: '이름을 입력해 주세요',
  rolePh: '예) 디자이너, 학생, 여행가',
  contactPh: '이메일이나 SNS 아이디',
  nameHint: '명함에 크게 들어가요',
  roleHint: '나를 소개하는 한마디',
  contactHint: '넣지 않아도 괜찮아요',
  templateTitle: '템플릿 고르기',
  templates: { minimal: '미니멀', editorial: '에디토리얼', block: '컬러블록' },
  toDesign: '디자인 시작하기',
  editTitle: '한 장에, 나답게',
  front: '앞면',
  back: '뒷면',
  frontPreview: '앞면 미리보기',
  backPreview: '뒷면 미리보기',
  font: '서체',
  fonts: { sans: '산세리프', serif: '세리프' },
  color: '색상',
  colors: { blue: '블루', ivory: '아이보리', black: '블랙', lime: '라임' },
  align: '정렬',
  aligns: { left: '왼쪽', center: '가운데', right: '오른쪽' },
  toResult: '이 디자인으로 완성',
  resultTitle: ['나를 담은 명함,', '완성!'],
  fileTitle: '파일로 간직하세요',
  fileDesc: 'PNG 이미지 · PDF 파일로 받을 수 있어요.',
  edit: '다시 수정',
  toPhone: '휴대폰으로 받기',
  frontLabel: '명함 앞면 (PNG)',
  backLabel: '명함 뒷면 (PNG)',
  pdfLabel: '명함 양면 (PDF · 90×50mm)',
}

const en: CardText = {
  brand: 'CARD DESIGNER',
  headline: ['One card that', 'introduces you'],
  sub: 'Add your name, pick a style, done',
  cta: 'Make my card',
  foot: 'My own digital card',
  steps: ['Details', 'Design', 'Done'],
  sample: { name: 'Sky Kim', role: 'Designer', contact: 'hello@example.com' },
  infoTitle: 'How would you like to be introduced?',
  infoDesc: 'Add contact details only if you want to.',
  name: 'Name',
  role: 'Role · job',
  contact: 'Contact (optional)',
  namePh: 'Enter your name',
  rolePh: 'e.g. Designer, student, traveler',
  contactPh: 'Email or social handle',
  nameHint: 'Shown large on the card',
  roleHint: 'A word that introduces you',
  contactHint: 'You can leave this empty',
  templateTitle: 'Choose a template',
  templates: { minimal: 'Minimal', editorial: 'Editorial', block: 'Color block' },
  toDesign: 'Start designing',
  editTitle: 'One card, your way',
  front: 'Front',
  back: 'Back',
  frontPreview: 'Front preview',
  backPreview: 'Back preview',
  font: 'Font',
  fonts: { sans: 'Sans-serif', serif: 'Serif' },
  color: 'Color',
  colors: { blue: 'Blue', ivory: 'Ivory', black: 'Black', lime: 'Lime' },
  align: 'Align',
  aligns: { left: 'Left', center: 'Center', right: 'Right' },
  toResult: 'Finish with this design',
  resultTitle: ['Your card is', 'ready!'],
  fileTitle: 'Keep it as a file',
  fileDesc: 'Available as PNG images and a PDF.',
  edit: 'Edit again',
  toPhone: 'Send to my phone',
  frontLabel: 'Card front (PNG)',
  backLabel: 'Card back (PNG)',
  pdfLabel: 'Both sides (PDF · 90×50mm)',
}

const ja: CardText = {
  brand: '名刺デザイナー',
  headline: ['あなたを紹介する', '1枚のデザイン'],
  sub: '名前を入れて、スタイルを選べば完成',
  cta: '名刺をつくる',
  foot: '自分だけのデジタル名刺',
  steps: ['情報入力', 'デザイン', '完成'],
  sample: { name: '佐藤 そら', role: 'デザイナー', contact: 'hello@example.com' },
  infoTitle: '自分をどう紹介しますか？',
  infoDesc: '連絡先は入れたいときだけどうぞ。',
  name: 'お名前',
  role: '肩書き · 職業',
  contact: '連絡先（任意）',
  namePh: 'お名前を入力してください',
  rolePh: '例）デザイナー、学生、旅行家',
  contactPh: 'メールアドレスやSNSのID',
  nameHint: '名刺に大きく入ります',
  roleHint: '自分を紹介するひとこと',
  contactHint: '入れなくても大丈夫です',
  templateTitle: 'テンプレートを選ぶ',
  templates: { minimal: 'ミニマル', editorial: 'エディトリアル', block: 'カラーブロック' },
  toDesign: 'デザインを始める',
  editTitle: '1枚に、自分らしく',
  front: '表面',
  back: '裏面',
  frontPreview: '表面プレビュー',
  backPreview: '裏面プレビュー',
  font: '書体',
  fonts: { sans: 'ゴシック体', serif: '明朝体' },
  color: 'カラー',
  colors: { blue: 'ブルー', ivory: 'アイボリー', black: 'ブラック', lime: 'ライム' },
  align: '揃え',
  aligns: { left: '左', center: '中央', right: '右' },
  toResult: 'このデザインで完成',
  resultTitle: ['自分らしい名刺、', '完成！'],
  fileTitle: 'ファイルで残しましょう',
  fileDesc: 'PNG画像 · PDFファイルで受け取れます。',
  edit: '編集に戻る',
  toPhone: 'スマホで受け取る',
  frontLabel: '名刺 表面（PNG）',
  backLabel: '名刺 裏面（PNG）',
  pdfLabel: '名刺 両面（PDF · 90×50mm）',
}

const zhHans: CardText = {
  brand: '名片设计师',
  headline: ['用一张设计', '介绍你自己'],
  sub: '填上名字，选好风格就完成',
  cta: '制作你的名片',
  foot: '专属于你的电子名片',
  steps: ['填写信息', '设计', '完成'],
  sample: { name: '林天晴', role: '设计师', contact: 'hello@example.com' },
  infoTitle: '想介绍怎样的自己？',
  infoDesc: '联系方式可按需填写。',
  name: '姓名',
  role: '身份 · 职业',
  contact: '联系方式（可选）',
  namePh: '请输入姓名',
  rolePh: '例：设计师、学生、旅行家',
  contactPh: '邮箱或社交账号',
  nameHint: '将以大字显示在名片上',
  roleHint: '介绍自己的一句话',
  contactHint: '不填也没关系',
  templateTitle: '选择模板',
  templates: { minimal: '极简', editorial: '杂志风', block: '色块' },
  toDesign: '开始设计',
  editTitle: '一张名片，展现自我',
  front: '正面',
  back: '背面',
  frontPreview: '正面预览',
  backPreview: '背面预览',
  font: '字体',
  fonts: { sans: '黑体', serif: '宋体' },
  color: '颜色',
  colors: { blue: '蓝色', ivory: '象牙白', black: '黑色', lime: '青柠绿' },
  align: '对齐',
  aligns: { left: '靠左', center: '居中', right: '靠右' },
  toResult: '用这个设计完成',
  resultTitle: ['属于你的名片，', '完成！'],
  fileTitle: '存为文件珍藏',
  fileDesc: '可领取 PNG 图片 · PDF 文件。',
  edit: '重新编辑',
  toPhone: '发送到手机',
  frontLabel: '名片正面（PNG）',
  backLabel: '名片背面（PNG）',
  pdfLabel: '名片双面（PDF · 90×50mm）',
}

const zhHant: CardText = {
  brand: '名片設計師',
  headline: ['用一張設計', '介紹你自己'],
  sub: '填上名字，選好風格就完成',
  cta: '製作你的名片',
  foot: '專屬於你的數位名片',
  steps: ['填寫資訊', '設計', '完成'],
  sample: { name: '林天晴', role: '設計師', contact: 'hello@example.com' },
  infoTitle: '想介紹怎樣的自己？',
  infoDesc: '聯絡方式可視需要填寫。',
  name: '姓名',
  role: '身分 · 職業',
  contact: '聯絡方式（選填）',
  namePh: '請輸入姓名',
  rolePh: '例：設計師、學生、旅行家',
  contactPh: '電子郵件或社群帳號',
  nameHint: '會以大字顯示在名片上',
  roleHint: '介紹自己的一句話',
  contactHint: '不填也沒關係',
  templateTitle: '選擇範本',
  templates: { minimal: '極簡', editorial: '雜誌風', block: '色塊' },
  toDesign: '開始設計',
  editTitle: '一張名片，展現自我',
  front: '正面',
  back: '背面',
  frontPreview: '正面預覽',
  backPreview: '背面預覽',
  font: '字型',
  fonts: { sans: '黑體', serif: '明體' },
  color: '顏色',
  colors: { blue: '藍色', ivory: '象牙白', black: '黑色', lime: '萊姆綠' },
  align: '對齊',
  aligns: { left: '靠左', center: '置中', right: '靠右' },
  toResult: '用這個設計完成',
  resultTitle: ['屬於你的名片，', '完成！'],
  fileTitle: '存成檔案珍藏',
  fileDesc: '可領取 PNG 圖片 · PDF 檔案。',
  edit: '重新編輯',
  toPhone: '傳送到手機',
  frontLabel: '名片正面（PNG）',
  backLabel: '名片背面（PNG）',
  pdfLabel: '名片雙面（PDF · 90×50mm）',
}

export const CARD_TEXT: Partial<Record<KioskLang, CardText>> & { ko: CardText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }
