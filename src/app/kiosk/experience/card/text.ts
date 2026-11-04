import type { KioskLang } from '@/lib/kiosk/i18n'
import type { CardMood } from '@/lib/kiosk/card-moods'
import type { CardColor, CardFont, CardLayout, CardPaper } from './design'

export interface CardText {
  brand: string
  headline: [string, string]
  sub: string
  cta: string
  foot: string
  steps: [string, string, string]
  /** 첫 화면·템플릿 견본에 넣는 가상 이름 */
  sample: { name: string; role: string; contact: string; tagline: string }
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
  /** 한 줄 소개(선택) — 명함에 작게 들어간다 */
  tagline: string
  taglinePh: string
  taglineHint: string
  /** AI 로 디자인하기 */
  moodTitle: string
  moods: Record<CardMood, string>
  customMood: string
  customMoodTitle: string
  customMoodPh: string
  withFace: string
  withFaceOn: string
  faceTitle: string
  faceDesc: string
  faceShoot: string
  faceSkip: string
  toAi: string
  basic: string
  makingTitle: string
  makingSteps: [string, string, string]
  makingNote: string
  artFailed: [string, string]
  redraw: string
  /** {n} 자리에 남은 횟수 */
  redrawLeft: string
  redrawLimit: string
  aiNote: string
  receiptSub: string
  editTitle: string
  front: string
  back: string
  frontPreview: string
  backPreview: string
  font: string
  fonts: Record<CardFont, string>
  /** 편집 — 구성(레이아웃) · 그림 위치 · 종이 색 */
  layout: string
  layouts: Record<CardLayout, string>
  artSide: string
  artSides: { left: string; right: string; top: string; bottom: string }
  paper: string
  papers: Record<CardPaper, string>
  color: string
  colors: Record<CardColor, string>
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
  sub: '원하는 느낌을 고르면 AI가 디자인해요',
  cta: '내 명함 만들기',
  foot: '나만의 디지털 명함',
  steps: ['정보 입력', '디자인', '완성'],
  sample: { name: '김하늘', role: '디자이너', contact: 'hello@example.com', tagline: '좋은 하루를 디자인합니다' },
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
  tagline: '한 줄 소개 (선택)',
  taglinePh: '예) 좋은 향을 찾는 사람',
  taglineHint: '명함에 작게 들어가요',
  moodTitle: '어떤 느낌으로 만들까요?',
  moods: { minimal: '미니멀 라인', pastel: '파스텔', pattern: '패턴', blueprint: '블루프린트', luxury: '블랙 & 골드', retro: '레트로 팝', holo: '홀로그램', nature: '보태니컬' },
  customMood: '직접 적기',
  customMoodTitle: '원하는 느낌을 짧게 적어 주세요',
  customMoodPh: '예) 벚꽃 바다, 고양이, 재즈 바',
  withFace: '내 얼굴 넣기',
  withFaceOn: '얼굴 사진 넣음',
  faceTitle: '명함에 넣을 얼굴을 찍어 주세요',
  faceDesc: '사진은 명함을 그리는 데만 쓰고 저장하지 않아요.',
  faceShoot: '사진 촬영',
  faceSkip: '넣지 않기',
  toAi: 'AI로 디자인하기',
  basic: 'AI 없이 기본 디자인으로',
  makingTitle: 'AI가 명함을 그리고 있어요',
  makingSteps: ['느낌을 읽고 있어요', '그래픽을 그리고 있어요', '색과 글자를 맞추고 있어요'],
  makingNote: '10초쯤 걸려요. 잠시만 기다려 주세요.',
  artFailed: ['명함을 그리지 못했어요.', '다시 시도하거나 기본 디자인으로 만들어 보세요.'],
  redraw: '다시 그리기',
  redrawLeft: '{n}번 더 그릴 수 있어요',
  redrawLimit: '이번에는 다 그려 봤어요',
  aiNote: 'AI가 그린 그래픽에 색과 글자를 맞춰 디자인했어요.',
  receiptSub: '명함 미리보기 영수증',
  editTitle: '한 장에, 나답게',
  front: '앞면',
  back: '뒷면',
  frontPreview: '앞면 미리보기',
  backPreview: '뒷면 미리보기',
  font: '서체',
  fonts: { modern: '모던', classic: '명조', bold: '굵게', hand: '손글씨', round: '둥글게' },
  layout: '구성',
  layouts: { split: '분할', band: '띠', frame: '액자', full: '전면', type: '큰 글자' },
  artSide: '그림 위치',
  artSides: { left: '왼쪽', right: '오른쪽', top: '위', bottom: '아래' },
  paper: '종이',
  papers: { auto: '자동', light: '밝게', dark: '어둡게' },
  color: '색상',
  colors: { blue: '블루', ivory: '아이보리', black: '블랙', lime: '라임' },
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
  sub: 'Pick a feeling and AI designs it',
  cta: 'Make my card',
  foot: 'My own digital card',
  steps: ['Details', 'Design', 'Done'],
  sample: { name: 'Sky Kim', role: 'Designer', contact: 'hello@example.com', tagline: 'Designing good days' },
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
  tagline: 'One-line intro (optional)',
  taglinePh: 'e.g. Always chasing good scents',
  taglineHint: 'Printed small on the card',
  moodTitle: 'What feeling shall we go for?',
  moods: { minimal: 'Minimal line', pastel: 'Pastel', pattern: 'Pattern', blueprint: 'Blueprint', luxury: 'Black & gold', retro: 'Retro pop', holo: 'Hologram', nature: 'Botanical' },
  customMood: 'Type my own',
  customMoodTitle: 'Describe the feeling in a few words',
  customMoodPh: 'e.g. cherry blossoms, cats, jazz bar',
  withFace: 'Add my face',
  withFaceOn: 'Face photo added',
  faceTitle: 'Take the photo for your card',
  faceDesc: 'Your photo is used only to draw the card and is not stored.',
  faceShoot: 'Take photo',
  faceSkip: 'No photo',
  toAi: 'Design with AI',
  basic: 'Use a basic design without AI',
  makingTitle: 'AI is drawing your card',
  makingSteps: ['Reading the feeling', 'Drawing the artwork', 'Matching colors and type'],
  makingNote: 'This takes about 10 seconds.',
  artFailed: ['We couldn’t draw the card.', 'Try again, or use a basic design.'],
  redraw: 'Draw again',
  redrawLeft: '{n} more to draw',
  redrawLimit: 'That’s every drawing for now',
  aiNote: 'Designed around artwork drawn by AI, with matching colors and type.',
  receiptSub: 'Card preview receipt',
  editTitle: 'One card, your way',
  front: 'Front',
  back: 'Back',
  frontPreview: 'Front preview',
  backPreview: 'Back preview',
  font: 'Font',
  fonts: { modern: 'Modern', classic: 'Serif', bold: 'Bold', hand: 'Script', round: 'Round' },
  layout: 'Layout',
  layouts: { split: 'Split', band: 'Band', frame: 'Frame', full: 'Full', type: 'Big letter' },
  artSide: 'Art side',
  artSides: { left: 'Left', right: 'Right', top: 'Top', bottom: 'Bottom' },
  paper: 'Paper',
  papers: { auto: 'Auto', light: 'Light', dark: 'Dark' },
  color: 'Color',
  colors: { blue: 'Blue', ivory: 'Ivory', black: 'Black', lime: 'Lime' },
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
  sub: '好きな雰囲気を選ぶと、AIがデザインします',
  cta: '名刺をつくる',
  foot: '自分だけのデジタル名刺',
  steps: ['情報入力', 'デザイン', '完成'],
  sample: { name: '佐藤 そら', role: 'デザイナー', contact: 'hello@example.com', tagline: 'いい一日をデザインします' },
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
  tagline: 'ひとこと紹介（任意）',
  taglinePh: '例）いい香りを探す人',
  taglineHint: '名刺に小さく入ります',
  moodTitle: 'どんな雰囲気でつくりますか？',
  moods: { minimal: 'ミニマルライン', pastel: 'パステル', pattern: 'パターン', blueprint: 'ブループリント', luxury: 'ブラック & ゴールド', retro: 'レトロポップ', holo: 'ホログラム', nature: 'ボタニカル' },
  customMood: '自分で入力',
  customMoodTitle: '好きな雰囲気を短くどうぞ',
  customMoodPh: '例）桜の海、ねこ、ジャズバー',
  withFace: '自分の顔を入れる',
  withFaceOn: '顔写真あり',
  faceTitle: '名刺に入れる顔を撮ってください',
  faceDesc: '写真は名刺を描くためだけに使い、保存しません。',
  faceShoot: '撮影する',
  faceSkip: '入れない',
  toAi: 'AIでデザイン',
  basic: 'AIを使わず基本デザインで',
  makingTitle: 'AIが名刺を描いています',
  makingSteps: ['雰囲気を読み取っています', 'グラフィックを描いています', '色と文字を合わせています'],
  makingNote: '10秒ほどかかります。少々お待ちください。',
  artFailed: ['名刺を描けませんでした。', 'もう一度試すか、基本デザインでお作りください。'],
  redraw: '描き直す',
  redrawLeft: 'あと{n}回描けます',
  redrawLimit: '今回の分は描き終えました',
  aiNote: 'AIが描いたグラフィックに、色と文字を合わせてデザインしました。',
  receiptSub: '名刺プレビューレシート',
  editTitle: '1枚に、自分らしく',
  front: '表面',
  back: '裏面',
  frontPreview: '表面プレビュー',
  backPreview: '裏面プレビュー',
  font: '書体',
  fonts: { modern: 'モダン', classic: '明朝', bold: '太字', hand: '手書き', round: '丸文字' },
  layout: 'レイアウト',
  layouts: { split: '分割', band: '帯', frame: 'フレーム', full: '全面', type: '大きな文字' },
  artSide: '絵の位置',
  artSides: { left: '左', right: '右', top: '上', bottom: '下' },
  paper: '紙',
  papers: { auto: '自動', light: '明るく', dark: '暗く' },
  color: 'カラー',
  colors: { blue: 'ブルー', ivory: 'アイボリー', black: 'ブラック', lime: 'ライム' },
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
  sub: '选好想要的感觉，AI来设计',
  cta: '制作你的名片',
  foot: '专属于你的电子名片',
  steps: ['填写信息', '设计', '完成'],
  sample: { name: '林天晴', role: '设计师', contact: 'hello@example.com', tagline: '设计美好的每一天' },
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
  tagline: '一句话介绍（可选）',
  taglinePh: '例）寻找好香气的人',
  taglineHint: '会小小地印在名片上',
  moodTitle: '想做成什么感觉？',
  moods: { minimal: '极简线条', pastel: '粉彩', pattern: '图案', blueprint: '蓝图', luxury: '黑 & 金', retro: '复古波普', holo: '镭射', nature: '植物' },
  customMood: '自己输入',
  customMoodTitle: '请简短写下想要的感觉',
  customMoodPh: '例：樱花海、猫咪、爵士酒吧',
  withFace: '加入我的人像',
  withFaceOn: '已加入人像',
  faceTitle: '请拍一张放进名片的人像',
  faceDesc: '照片仅用于绘制名片，不会保存。',
  faceShoot: '拍摄照片',
  faceSkip: '不加入',
  toAi: '用AI设计',
  basic: '不用AI，使用基础设计',
  makingTitle: 'AI正在绘制名片',
  makingSteps: ['正在读取感觉', '正在绘制图案', '正在搭配颜色与文字'],
  makingNote: '大约需要 10 秒，请稍候。',
  artFailed: ['没能画出名片。', '请重试，或改用基础设计制作。'],
  redraw: '重新绘制',
  redrawLeft: '还能再画 {n} 次',
  redrawLimit: '这次的绘制次数已用完',
  aiNote: '以AI绘制的图案为主，配好了颜色与文字。',
  receiptSub: '名片预览小票',
  editTitle: '一张名片，展现自我',
  front: '正面',
  back: '背面',
  frontPreview: '正面预览',
  backPreview: '背面预览',
  font: '字体',
  fonts: { modern: '现代', classic: '宋体', bold: '粗体', hand: '手写', round: '圆体' },
  layout: '版式',
  layouts: { split: '分栏', band: '横条', frame: '画框', full: '满版', type: '大字' },
  artSide: '图案位置',
  artSides: { left: '左侧', right: '右侧', top: '上方', bottom: '下方' },
  paper: '纸张',
  papers: { auto: '自动', light: '浅色', dark: '深色' },
  color: '颜色',
  colors: { blue: '蓝色', ivory: '象牙白', black: '黑色', lime: '青柠绿' },
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
  sub: '選好想要的感覺，AI來設計',
  cta: '製作你的名片',
  foot: '專屬於你的數位名片',
  steps: ['填寫資訊', '設計', '完成'],
  sample: { name: '林天晴', role: '設計師', contact: 'hello@example.com', tagline: '設計美好的每一天' },
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
  tagline: '一句話介紹（選填）',
  taglinePh: '例）尋找好香氣的人',
  taglineHint: '會小小地印在名片上',
  moodTitle: '想做成什麼感覺？',
  moods: { minimal: '極簡線條', pastel: '粉彩', pattern: '圖案', blueprint: '藍圖', luxury: '黑 & 金', retro: '復古普普', holo: '鐳射', nature: '植物' },
  customMood: '自行輸入',
  customMoodTitle: '請簡短寫下想要的感覺',
  customMoodPh: '例：櫻花海、貓咪、爵士酒吧',
  withFace: '加入我的人像',
  withFaceOn: '已加入人像',
  faceTitle: '請拍一張放進名片的人像',
  faceDesc: '照片僅用於繪製名片，不會儲存。',
  faceShoot: '拍攝照片',
  faceSkip: '不加入',
  toAi: '用AI設計',
  basic: '不用AI，使用基本設計',
  makingTitle: 'AI正在繪製名片',
  makingSteps: ['正在讀取感覺', '正在繪製圖案', '正在搭配顏色與文字'],
  makingNote: '大約需要 10 秒，請稍候。',
  artFailed: ['沒能畫出名片。', '請再試一次，或改用基本設計製作。'],
  redraw: '重新繪製',
  redrawLeft: '還能再畫 {n} 次',
  redrawLimit: '這次的繪製次數已用完',
  aiNote: '以AI繪製的圖案為主，配好了顏色與文字。',
  receiptSub: '名片預覽收據',
  editTitle: '一張名片，展現自我',
  front: '正面',
  back: '背面',
  frontPreview: '正面預覽',
  backPreview: '背面預覽',
  font: '字型',
  fonts: { modern: '現代', classic: '明體', bold: '粗體', hand: '手寫', round: '圓體' },
  layout: '版式',
  layouts: { split: '分欄', band: '橫條', frame: '畫框', full: '滿版', type: '大字' },
  artSide: '圖案位置',
  artSides: { left: '左側', right: '右側', top: '上方', bottom: '下方' },
  paper: '紙張',
  papers: { auto: '自動', light: '淺色', dark: '深色' },
  color: '顏色',
  colors: { blue: '藍色', ivory: '象牙白', black: '黑色', lime: '萊姆綠' },
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
