import type { KioskLang } from '@/lib/kiosk/i18n'

export type DrawStyle = 'line' | 'water' | 'comic'
export type DrawLevel = 'soft' | 'fun'

export interface DrawText {
  brand: string
  /** 두 줄 */
  headline: [string, string]
  sub: string
  cta: string
  foot: string
  steps: [string, string, string]
  back: string
  captureTitle: string
  captureDesc: string
  shoot: string
  /** 혼자 · 같이 */
  solo: string
  group: string
  groupHint: string
  hairTip: string
  receiptSub: string
  confirmTitle: string
  confirmDesc: string
  shotDone: string
  retake: string
  usePhoto: string
  styleTitle: string
  sampleTag: string
  myPhoto: string
  styles: Record<DrawStyle, string>
  levelLabel: string
  levels: Record<DrawLevel, string>
  levelNotes: Record<DrawLevel, string>
  privacy: string
  draw: string
  /** 이미 그려 둔 조합 */
  view: string
  made: string
  /** {n} 자리에 남은 장수 */
  left: string
  limit: string
  drawingTitle: string
  drawingSteps: [string, string, string]
  drawingNote: string
  failed: [string, string]
  busy: [string, string]
  resultTitle: string
  original: string
  doodles: [string, string]
  again: string
  save: string
  saveTitle: string
  posterLabel: string
  artLabel: string
}

const ko: DrawText = {
  brand: '캐리커처 스튜디오',
  headline: ['평범한 사진에,', '유쾌한 한 끗'],
  sub: '사진 한 장으로 만드는 나만의 캐리커처',
  cta: '내 캐리커처 그리기',
  foot: '사진 촬영 · 스타일 선택 · 완성',
  steps: ['사진', '스타일', '완성'],
  back: '이전',
  captureTitle: '사진을 찍어 주세요',
  captureDesc: '어깨 위가 보이게, 편하게 웃어 주세요.',
  shoot: '사진 촬영',
  solo: '혼자',
  group: '같이',
  groupHint: '모두 화면 안에 들어오게 붙어 서 주세요.',
  hairTip: '머리 모양이 다 보이면 더 닮게 그려져요.',
  receiptSub: '그림 영수증',
  confirmTitle: '사진을 확인해 주세요',
  confirmDesc: '얼굴이 잘 보이면 준비됐어요.',
  shotDone: '촬영 완료',
  retake: '다시 촬영',
  usePhoto: '이 사진으로 그리기',
  styleTitle: '어떤 그림이 나다울까요?',
  sampleTag: '스타일 예시',
  myPhoto: '내 사진',
  styles: { line: '라인아트', water: '수채화', comic: '코믹' },
  levelLabel: '과장 정도',
  levels: { soft: '은은하게', fun: '재미있게' },
  levelNotes: { soft: '닮은 느낌 그대로, 부드럽게', fun: '표정은 살리고, 개성은 한 스푼 더' },
  privacy: '사진은 그림을 그리는 데만 쓰고 저장하지 않아요.',
  draw: '이 스타일로 완성',
  view: '완성한 그림 보기',
  made: '완성',
  left: '이 사진으로 {n}장 더 그릴 수 있어요',
  limit: '이 사진으로는 다 그렸어요. 완성한 그림을 골라 보세요.',
  drawingTitle: '쓱쓱, 그리는 중이에요',
  drawingSteps: ['윤곽을 잡고 있어요', '표정을 살리고 있어요', '마무리 선을 긋고 있어요'],
  drawingNote: '20초쯤 걸려요. 잠시만 기다려 주세요.',
  failed: ['그림을 완성하지 못했어요.', '잠시 후 다시 시도해 주세요.'],
  busy: ['지금은 그릴 수 없어요.', '잠시 후 다시 시도해 주세요.'],
  resultTitle: '이런 나도, 꽤 멋진데요?',
  original: '원본',
  doodles: ['You Look Great!', '오늘도 멋진 당신!'],
  again: '다른 스타일 보기',
  save: '휴대폰에 저장',
  saveTitle: '캐리커처를 휴대폰으로',
  posterLabel: '캐리커처 포스터',
  artLabel: '캐리커처 그림',
}

const en: DrawText = {
  brand: 'CARICATURE STUDIO',
  headline: ['An ordinary photo,', 'with a playful twist'],
  sub: 'Your own caricature from a single photo',
  cta: 'Draw my caricature',
  foot: 'Take a photo · Pick a style · Done',
  steps: ['Photo', 'Style', 'Done'],
  back: 'Back',
  captureTitle: 'Take your photo',
  captureDesc: 'Head and shoulders in view — and smile.',
  shoot: 'Take photo',
  solo: 'Just me',
  group: 'Together',
  groupHint: 'Stand close so everyone fits in the frame.',
  hairTip: 'Keep your whole hairstyle in view for a better likeness.',
  receiptSub: 'Drawing receipt',
  confirmTitle: 'Check your photo',
  confirmDesc: 'If your face is clear, you’re ready.',
  shotDone: 'Photo taken',
  retake: 'Retake',
  usePhoto: 'Draw with this photo',
  styleTitle: 'Which drawing feels like you?',
  sampleTag: 'Style sample',
  myPhoto: 'My photo',
  styles: { line: 'Line art', water: 'Watercolor', comic: 'Comic' },
  levelLabel: 'Exaggeration',
  levels: { soft: 'Subtle', fun: 'Playful' },
  levelNotes: { soft: 'Close to the real you, softly drawn', fun: 'Your expression, plus a spoonful of character' },
  privacy: 'Your photo is used only to make the drawing and is not stored.',
  draw: 'Finish in this style',
  view: 'See the finished drawing',
  made: 'Done',
  left: 'You can draw {n} more with this photo',
  limit: 'That’s every drawing for this photo. Pick one you’ve made.',
  drawingTitle: 'Sketching away…',
  drawingSteps: ['Finding the outline', 'Bringing out your expression', 'Adding the final strokes'],
  drawingNote: 'This takes about 20 seconds.',
  failed: ['We couldn’t finish the drawing.', 'Please try again in a moment.'],
  busy: ['We can’t draw right now.', 'Please try again in a moment.'],
  resultTitle: 'Not bad at all, is it?',
  original: 'Original',
  doodles: ['You Look Great!', 'Looking good today!'],
  again: 'Try another style',
  save: 'Save to my phone',
  saveTitle: 'Send the caricature to your phone',
  posterLabel: 'Caricature poster',
  artLabel: 'Caricature drawing',
}

// 일본어·중국어 공통 — doodles[1] 은 폭 76px(다섯 글자) 칸에 쓴다. 띄어쓰기가 없으니 쉼표에서 줄이 나뉘게 쓴다.
const ja: DrawText = {
  brand: '似顔絵スタジオ',
  headline: ['いつもの写真に、', '愉快なひと味を'],
  sub: '写真1枚でつくる、私だけの似顔絵',
  cta: '私の似顔絵を描く',
  foot: '写真撮影 · スタイル選択 · 完成',
  steps: ['写真', 'スタイル', '完成'],
  back: '戻る',
  captureTitle: '写真を撮ってください',
  captureDesc: '肩から上を入れて、自然な笑顔でどうぞ。',
  shoot: '撮影する',
  solo: 'ひとりで',
  group: 'いっしょに',
  groupHint: '全員が画面に入るよう、寄って立ってください。',
  hairTip: '髪型全体が見えると、より似せて描けます。',
  receiptSub: '絵のレシート',
  confirmTitle: '写真を確認してください',
  confirmDesc: '顔がよく見えていれば準備OKです。',
  shotDone: '撮影完了',
  retake: '撮り直す',
  usePhoto: 'この写真で描く',
  styleTitle: 'どの絵が私らしいでしょう？',
  sampleTag: 'スタイル例',
  myPhoto: '私の写真',
  styles: { line: '線画', water: '水彩画', comic: 'コミック' },
  levelLabel: 'デフォルメ度',
  levels: { soft: 'ひかえめ', fun: 'おもしろく' },
  levelNotes: { soft: 'そっくりのまま、やわらかく', fun: '表情は生かして、個性をひとさじプラス' },
  privacy: '写真は絵を描くためだけに使い、保存しません。',
  draw: 'このスタイルで完成',
  view: '完成した絵を見る',
  made: '完成',
  left: 'この写真であと{n}枚描けます',
  limit: 'この写真の分は描き終えました。完成した絵からお選びください。',
  drawingTitle: 'さらさら、描いています',
  drawingSteps: ['輪郭をとっています', '表情を生かしています', '仕上げの線を引いています'],
  drawingNote: '20秒ほどかかります。少々お待ちください。',
  failed: ['絵を完成できませんでした。', '少し待ってからもう一度お試しください。'],
  busy: ['ただいま描けません。', '少し待ってからもう一度お試しください。'],
  resultTitle: 'こんな私も、なかなか素敵？',
  original: '元の写真',
  doodles: ['You Look Great!', 'きょうも、素敵！'],
  again: '他のスタイルを見る',
  save: 'スマホに保存',
  saveTitle: '似顔絵をスマホへ',
  posterLabel: '似顔絵ポスター',
  artLabel: '似顔絵イラスト',
}

const zhHans: DrawText = {
  brand: '漫画肖像工作室',
  headline: ['给平凡的照片，', '添一分趣味'],
  sub: '一张照片，画出你的专属漫画肖像',
  cta: '画我的漫画肖像',
  foot: '拍摄照片 · 选择风格 · 完成',
  steps: ['照片', '风格', '完成'],
  back: '上一步',
  captureTitle: '请拍一张照片',
  captureDesc: '请露出肩膀以上，自然地笑一笑。',
  shoot: '拍摄照片',
  solo: '单人',
  group: '多人',
  groupHint: '请大家靠近一点，都进到画面里。',
  hairTip: '发型完整入镜，画得会更像。',
  receiptSub: '画作小票',
  confirmTitle: '请确认照片',
  confirmDesc: '脸部清晰可见，就准备好了。',
  shotDone: '拍摄完成',
  retake: '重新拍摄',
  usePhoto: '用这张照片画',
  styleTitle: '哪种画风最像你？',
  sampleTag: '风格示例',
  myPhoto: '我的照片',
  styles: { line: '线条画', water: '水彩画', comic: '卡通画' },
  levelLabel: '夸张程度',
  levels: { soft: '柔和一点', fun: '有趣一点' },
  levelNotes: { soft: '保留相似感，柔和呈现', fun: '保留表情，再添一勺个性' },
  privacy: '照片仅用于绘制，不会保存。',
  draw: '用这个风格完成',
  view: '查看完成的作品',
  made: '完成',
  left: '这张照片还能再画 {n} 张',
  limit: '这张照片的绘制次数已用完。请从完成的作品中挑选。',
  drawingTitle: '唰唰唰，正在作画',
  drawingSteps: ['正在勾勒轮廓', '正在刻画表情', '正在画最后几笔'],
  drawingNote: '大约需要 20 秒，请稍候。',
  failed: ['没能完成这幅画。', '请稍后再试。'],
  busy: ['现在暂时无法作画。', '请稍后再试。'],
  resultTitle: '这样的我，也挺不错吧？',
  original: '原图',
  doodles: ['You Look Great!', '今天的你，也很棒！'],
  again: '看看其他风格',
  save: '保存到手机',
  saveTitle: '把漫画肖像发送到手机',
  posterLabel: '漫画肖像海报',
  artLabel: '漫画肖像作品',
}

// 번체는 대만 어휘로 따로 쓴다(似顏繪·範例·儲存·傳送) — 간체를 글자만 바꾸지 않는다
const zhHant: DrawText = {
  brand: '似顏繪工作室',
  headline: ['為平凡的照片，', '添一分趣味'],
  sub: '一張照片，畫出你的專屬似顏繪',
  cta: '畫我的似顏繪',
  foot: '拍攝照片 · 選擇風格 · 完成',
  steps: ['照片', '風格', '完成'],
  back: '上一步',
  captureTitle: '請拍一張照片',
  captureDesc: '請露出肩膀以上，自然地笑一笑。',
  shoot: '拍攝照片',
  solo: '單人',
  group: '多人',
  groupHint: '請大家靠近一點，都進到畫面裡。',
  hairTip: '髮型完整入鏡，畫得會更像。',
  receiptSub: '畫作收據',
  confirmTitle: '請確認照片',
  confirmDesc: '臉部清楚可見，就準備好了。',
  shotDone: '拍攝完成',
  retake: '重新拍攝',
  usePhoto: '用這張照片畫',
  styleTitle: '哪種畫風最像你？',
  sampleTag: '風格範例',
  myPhoto: '我的照片',
  styles: { line: '線條畫', water: '水彩畫', comic: '卡通畫' },
  levelLabel: '誇張程度',
  levels: { soft: '柔和一點', fun: '有趣一點' },
  levelNotes: { soft: '保留相似感，柔和呈現', fun: '保留表情，再添一匙個性' },
  privacy: '照片僅用於繪製，不會儲存。',
  draw: '用這個風格完成',
  view: '查看完成的作品',
  made: '完成',
  left: '這張照片還能再畫 {n} 張',
  limit: '這張照片的繪製次數已用完。請從完成的作品中挑選。',
  drawingTitle: '唰唰唰，正在作畫',
  drawingSteps: ['正在勾勒輪廓', '正在刻畫表情', '正在畫最後幾筆'],
  drawingNote: '大約需要 20 秒，請稍候。',
  failed: ['沒能完成這幅畫。', '請稍後再試。'],
  busy: ['現在暫時無法作畫。', '請稍後再試。'],
  resultTitle: '這樣的我，也挺不錯吧？',
  original: '原圖',
  doodles: ['You Look Great!', '今天的你，也很棒！'],
  again: '看看其他風格',
  save: '儲存到手機',
  saveTitle: '把似顏繪傳送到手機',
  posterLabel: '似顏繪海報',
  artLabel: '似顏繪作品',
}

export const DRAW_TEXT: Partial<Record<KioskLang, DrawText>> & { ko: DrawText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }
