import type { KioskLang } from '@/lib/kiosk/i18n'

export type MakeupPart = 'lip' | 'blush' | 'eye'

export interface MakeupText {
  brand: string
  headline: string
  sub: string
  chips: [string, string]
  cta: string
  foot: string
  steps: [string, string, string]
  captureTitle: string
  captureDesc: string
  tips: [string, string]
  captureNote: string
  shoot: string
  finding: string
  noFace: [string, string]
  editTitle: string
  original: string
  applied: string
  editNote: string
  parts: Record<MakeupPart, string>
  /** 부위마다 색 다섯 개의 이름 */
  colors: Record<MakeupPart, [string, string, string, string, string]>
  /** 입술 색에 따른 룩 이름 */
  looks: [string, string, string, string, string]
  level: string
  levelLow: string
  levelHigh: string
  toResult: string
  resultTitle: string
  resultNote: string
  paletteTitle: string
  keepFace: string
  colorNote: string
  again: string
  save: string
  saveTitle: string
  cardLabel: string
  home: string
}

const ko: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: '나에게 어울리는 오늘의 룩',
  sub: '립 · 블러셔 · 아이 메이크업을 미리 만나보세요.',
  chips: ['색은 자유롭게', '얼굴은 그대로'],
  cta: '메이크업 시작하기',
  foot: '내 사진으로 미리 보는 색조 체험',
  steps: ['촬영', '메이크업', '저장'],
  captureTitle: '정면 사진을 촬영해 주세요.',
  captureDesc: '얼굴이 잘 보이도록 머리카락을 정리해 주세요.',
  tips: ['정면 보기', '밝은 곳에서'],
  captureNote: '얼굴은 그대로, 메이크업만 바꿔요.',
  shoot: '사진 촬영',
  finding: '얼굴을 찾고 있어요…',
  noFace: ['얼굴을 찾지 못했어요.', '정면을 보고 다시 촬영해 주세요.'],
  editTitle: '메이크업을 골라보세요.',
  original: '원본',
  applied: '적용',
  editNote: '가운데 선을 좌우로 밀어 비교해 보세요.',
  parts: { lip: '립', blush: '블러셔', eye: '아이' },
  colors: {
    lip: ['누드 코랄', '로즈 핑크', '로즈 코랄', '체리 레드', '플럼'],
    blush: ['피치', '코랄', '로즈', '핑크', '모브'],
    eye: ['샴페인', '로즈 브라운', '소프트 라벤더', '모브', '브라운'],
  },
  looks: ['데일리 누드', '러블리 핑크', '소프트 로즈', '체리 포인트', '딥 플럼'],
  level: '농도',
  levelLow: '연하게',
  levelHigh: '진하게',
  toResult: '이 룩으로 선택',
  resultTitle: '오늘의 룩이 완성됐어요!',
  resultNote: '내 사진에 색만 올린 미리보기예요.',
  paletteTitle: '이 룩의 컬러',
  keepFace: '얼굴은 그대로, 메이크업만 바꿔요.',
  colorNote: '화면의 색은 실제 발색과 다를 수 있어요.',
  again: '다시 꾸미기',
  save: '룩 이미지 저장',
  saveTitle: '룩 이미지 받기',
  cardLabel: '오늘의 메이크업 룩',
  home: '홈',
}

const en: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: 'Today’s look that suits me',
  sub: 'Preview lip, blush and eye makeup on your photo.',
  chips: ['Any color you like', 'Your face stays the same'],
  cta: 'Start makeup',
  foot: 'Try colors on your own photo',
  steps: ['Photo', 'Makeup', 'Save'],
  captureTitle: 'Take a photo facing forward.',
  captureDesc: 'Tidy your hair so your face shows clearly.',
  tips: ['Face forward', 'In good light'],
  captureNote: 'Your face stays the same. Only the makeup changes.',
  shoot: 'Take photo',
  finding: 'Finding your face…',
  noFace: ['We couldn’t find a face.', 'Please face forward and try again.'],
  editTitle: 'Choose your makeup.',
  original: 'Original',
  applied: 'Applied',
  editNote: 'Slide the center line to compare.',
  parts: { lip: 'Lip', blush: 'Blush', eye: 'Eye' },
  colors: {
    lip: ['Nude coral', 'Rose pink', 'Rose coral', 'Cherry red', 'Plum'],
    blush: ['Peach', 'Coral', 'Rose', 'Pink', 'Mauve'],
    eye: ['Champagne', 'Rose brown', 'Soft lavender', 'Mauve', 'Brown'],
  },
  looks: ['Daily nude', 'Lovely pink', 'Soft rose', 'Cherry point', 'Deep plum'],
  level: 'Intensity',
  levelLow: 'Sheer',
  levelHigh: 'Bold',
  toResult: 'Choose this look',
  resultTitle: 'Your look for today is ready!',
  resultNote: 'A preview with color added to your photo.',
  paletteTitle: 'Colors in this look',
  keepFace: 'Your face stays the same. Only the makeup changes.',
  colorNote: 'On-screen colors may differ from real products.',
  again: 'Edit again',
  save: 'Save look image',
  saveTitle: 'Get my look image',
  cardLabel: 'My makeup look',
  home: 'Home',
}

const ja: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: 'あなたに似合う今日のルック',
  sub: 'リップ · チーク · アイメイクを先に試せます。',
  chips: ['色は自由に', '顔はそのまま'],
  cta: 'メイクを始める',
  foot: '自分の写真で先に見るカラーメイク体験',
  steps: ['撮影', 'メイク', '保存'],
  captureTitle: '正面の写真を撮影してください。',
  captureDesc: '顔がよく見えるように髪を整えてください。',
  tips: ['正面を向く', '明るい場所で'],
  captureNote: '顔はそのまま、メイクだけ変えます。',
  shoot: '撮影する',
  finding: '顔を探しています…',
  noFace: ['顔が見つかりませんでした。', '正面を向いてもう一度撮影してください。'],
  editTitle: 'メイクを選んでみましょう。',
  original: '元の写真',
  applied: 'メイク後',
  editNote: '中央の線を左右に動かして比べてみてください。',
  parts: { lip: 'リップ', blush: 'チーク', eye: 'アイ' },
  colors: {
    lip: ['ヌードコーラル', 'ローズピンク', 'ローズコーラル', 'チェリーレッド', 'プラム'],
    blush: ['ピーチ', 'コーラル', 'ローズ', 'ピンク', 'モーヴ'],
    eye: ['シャンパン', 'ローズブラウン', 'ソフトラベンダー', 'モーヴ', 'ブラウン'],
  },
  looks: ['デイリーヌード', 'ラブリーピンク', 'ソフトローズ', 'チェリーポイント', 'ディーププラム'],
  level: '濃さ',
  levelLow: '薄め',
  levelHigh: '濃いめ',
  toResult: 'このルックにする',
  resultTitle: '今日のルックが完成しました！',
  resultNote: '写真に色だけをのせたプレビューです。',
  paletteTitle: 'このルックのカラー',
  keepFace: '顔はそのまま、メイクだけ変えます。',
  colorNote: '画面の色は実際の発色と異なる場合があります。',
  again: '選び直す',
  save: 'ルック画像を保存',
  saveTitle: 'ルック画像を受け取る',
  cardLabel: '今日のメイクルック',
  home: 'ホーム',
}

const zhHans: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: '适合你的今日妆容',
  sub: '抢先预览唇妆 · 腮红 · 眼妆。',
  chips: ['颜色随心选', '脸保持原样'],
  cta: '开始试妆',
  foot: '用自己的照片预览彩妆',
  steps: ['拍照', '试妆', '保存'],
  captureTitle: '请拍摄一张正面照片。',
  captureDesc: '请整理头发，让脸部清晰可见。',
  tips: ['正对镜头', '光线明亮处'],
  captureNote: '脸保持原样，只换妆容。',
  shoot: '拍摄照片',
  finding: '正在寻找人脸…',
  noFace: ['没有找到人脸。', '请正对镜头重新拍摄。'],
  editTitle: '来挑选妆容吧。',
  original: '原图',
  applied: '上妆后',
  editNote: '左右拖动中间的线来比较。',
  parts: { lip: '唇妆', blush: '腮红', eye: '眼妆' },
  colors: {
    lip: ['裸珊瑚', '玫瑰粉', '玫瑰珊瑚', '樱桃红', '梅子色'],
    blush: ['蜜桃色', '珊瑚色', '玫瑰色', '粉色', '藕紫色'],
    eye: ['香槟色', '玫瑰棕', '柔和薰衣草', '藕紫色', '棕色'],
  },
  looks: ['日常裸妆', '甜美粉嫩', '柔和玫瑰', '樱桃点缀', '深邃梅子'],
  level: '浓淡',
  levelLow: '淡一点',
  levelHigh: '浓一点',
  toResult: '选择这个妆容',
  resultTitle: '今日妆容完成啦！',
  resultNote: '这是只在你的照片上叠加颜色的预览。',
  paletteTitle: '这个妆容的用色',
  keepFace: '脸保持原样，只换妆容。',
  colorNote: '屏幕上的颜色可能与实际显色有所不同。',
  again: '重新试妆',
  save: '保存妆容图片',
  saveTitle: '领取妆容图片',
  cardLabel: '今日妆容',
  home: '首页',
}

const zhHant: MakeupText = {
  brand: 'VIRTUAL MAKEUP STUDIO',
  headline: '適合你的今日妝容',
  sub: '搶先預覽唇妝 · 腮紅 · 眼妝。',
  chips: ['顏色隨心選', '臉保持原樣'],
  cta: '開始試妝',
  foot: '用自己的照片預覽彩妝',
  steps: ['拍照', '試妝', '儲存'],
  captureTitle: '請拍攝一張正面照片。',
  captureDesc: '請整理頭髮，讓臉部清楚可見。',
  tips: ['正對鏡頭', '光線明亮處'],
  captureNote: '臉保持原樣，只換妝容。',
  shoot: '拍攝照片',
  finding: '正在尋找人臉…',
  noFace: ['沒有找到人臉。', '請正對鏡頭重新拍攝。'],
  editTitle: '來挑選妝容吧。',
  original: '原圖',
  applied: '上妝後',
  editNote: '左右拖曳中間的線來比較。',
  parts: { lip: '唇妝', blush: '腮紅', eye: '眼妝' },
  colors: {
    lip: ['裸珊瑚', '玫瑰粉', '玫瑰珊瑚', '櫻桃紅', '梅子色'],
    blush: ['蜜桃色', '珊瑚色', '玫瑰色', '粉色', '藕紫色'],
    eye: ['香檳色', '玫瑰棕', '柔和薰衣草', '藕紫色', '棕色'],
  },
  looks: ['日常裸妝', '甜美粉嫩', '柔和玫瑰', '櫻桃點綴', '深邃梅子'],
  level: '濃淡',
  levelLow: '淡一點',
  levelHigh: '濃一點',
  toResult: '選擇這個妝容',
  resultTitle: '今日妝容完成囉！',
  resultNote: '這是只在你的照片上疊加顏色的預覽。',
  paletteTitle: '這個妝容的用色',
  keepFace: '臉保持原樣，只換妝容。',
  colorNote: '螢幕上的顏色可能與實際顯色有所不同。',
  again: '重新試妝',
  save: '儲存妝容圖片',
  saveTitle: '領取妝容圖片',
  cardLabel: '今日妝容',
  home: '首頁',
}

export const MAKEUP_TEXT: Partial<Record<KioskLang, MakeupText>> & { ko: MakeupText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }
