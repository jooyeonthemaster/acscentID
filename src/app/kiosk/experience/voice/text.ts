import type { KioskLang } from '@/lib/kiosk/i18n'
import type { VoiceStyle } from './audio'

export interface VoiceText {
  brand: string
  /** 두 줄 */
  headline: [string, string]
  sub: string
  note: string
  cta: string
  foot: string
  steps: [string, string, string]
  recordTitle: string
  recordDesc: string
  micReady: string
  micStarting: string
  micOff: string
  micOffDesc: string
  scriptLabel: string
  /** 읽을 문장 — 고를 수 있게 세 개 */
  scripts: [string, string, string]
  otherScript: string
  recReady: string
  recording: string
  levelLabel: string
  levels: { low: string; good: string; high: string }
  recStart: string
  recStop: string
  recHint: string
  problems: { short: [string, string]; quiet: [string, string]; failed: [string, string] }
  processing: string
  styleTitle: string
  styleDesc: string
  mySentence: string
  styles: Record<VoiceStyle, string>
  styleNotes: Record<VoiceStyle, string>
  compareTitle: string
  playOriginal: string
  playStyled: string
  converting: string
  play: string
  stop: string
  reRecord: string
  toResult: string
  resultTitle: string
  /** {style} 자리에 스타일 이름 */
  resultDesc: string
  otherStyle: string
  save: string
  saveTitle: string
  audioLabel: string
  cardLabel: string
}

const ko: VoiceText = {
  brand: 'VOICE STUDIO',
  headline: ['내 목소리로 여는', '새로운 사운드'],
  sub: '녹음하고 · 바꾸고 · 들어보세요',
  note: '본인의 목소리로만 체험해 주세요',
  cta: '목소리 체험 시작',
  foot: '내 목소리에 스타일을 입혀 듣는 체험',
  steps: ['녹음', '스타일', '완성'],
  recordTitle: '한 문장을 읽어주세요',
  recordDesc: '본인의 목소리만 녹음해 주세요',
  micReady: '마이크 연결됨',
  micStarting: '마이크 확인 중…',
  micOff: '마이크를 찾을 수 없어요',
  micOffDesc: '연결을 다시 확인하고 있어요. 계속 안 되면 직원에게 알려 주세요.',
  scriptLabel: '읽을 문장',
  scripts: [
    '안녕하세요.\n오늘도 나만의 목소리로\n새로운 이야기를 시작해요.',
    '반가워요.\n지금 이 순간을\n내 목소리로 남겨 볼게요.',
    '오늘 하루도\n반짝이는 일이\n가득하길 바라요.',
  ],
  otherScript: '다른 문장',
  recReady: '녹음 준비',
  recording: '녹음 중',
  levelLabel: '입력 레벨',
  levels: { low: '조금 더 크게', good: '적당해요', high: '조금 작게' },
  recStart: '녹음 시작',
  recStop: '녹음 정지',
  recHint: '버튼을 누르고 문장을 읽어 주세요 · 최대 15초',
  problems: {
    short: ['녹음이 너무 짧아요.', '문장을 끝까지 읽어 주세요.'],
    quiet: ['소리가 잘 들리지 않았어요.', '마이크 가까이에서 조금 더 크게 말해 주세요.'],
    failed: ['녹음을 처리하지 못했어요.', '다시 녹음해 주세요.'],
  },
  processing: '목소리를 다듬고 있어요…',
  styleTitle: '어떤 목소리로 바꿔볼까요?',
  styleDesc: '스타일을 고르고 같은 문장으로 비교해 보세요',
  mySentence: '내가 녹음한 문장',
  styles: { squirrel: '다람쥐', giant: '거인', alien: '외계인', ghost: '유령', choir: '합창단', karaoke: '노래방', reverse: '거꾸로', walkie: '무전기' },
  styleNotes: { squirrel: '헬륨을 마신 듯 높고 빠르게', giant: '땅이 울리는 굵은 목소리', alien: '떨리는 우주 교신', ghost: '으스스하게 밀려오는 울림', choir: '나 혼자 쌓는 화음', karaoke: '에코 가득한 마이크', reverse: '끝에서부터 거꾸로', walkie: '치직— 여기는 본부' },
  compareTitle: '같은 문장으로 비교하기',
  playOriginal: '원본 듣기',
  playStyled: '변환 듣기',
  converting: '변환 중…',
  play: '재생',
  stop: '정지',
  reRecord: '다시 녹음',
  toResult: '이 목소리로 완성',
  resultTitle: '내 목소리가 새로워졌어요',
  resultDesc: '{style} 스타일로 완성한 나만의 오디오',
  otherStyle: '다른 스타일 듣기',
  save: '휴대폰으로 받기',
  saveTitle: '오디오를 휴대폰으로',
  audioLabel: '{style} 스타일 오디오',
  cardLabel: '오디오 카드',
}

const en: VoiceText = {
  brand: 'VOICE STUDIO',
  headline: ['A new sound,', 'opened by my voice'],
  sub: 'Record · Transform · Listen',
  note: 'Please record your own voice only',
  cta: 'Start the voice studio',
  foot: 'Hear your own voice in a new style',
  steps: ['Record', 'Style', 'Done'],
  recordTitle: 'Read one sentence aloud',
  recordDesc: 'Please record your own voice only',
  micReady: 'Microphone connected',
  micStarting: 'Checking the microphone…',
  micOff: 'Microphone not found',
  micOffDesc: 'We’re checking the connection again. If it keeps failing, please tell our staff.',
  scriptLabel: 'Your sentence',
  scripts: [
    'Hello.\nToday I start a new story\nwith a voice of my own.',
    'Nice to meet you.\nI’ll keep this moment\nin my own voice.',
    'I hope today\nis full of\nbright little moments.',
  ],
  otherScript: 'Another sentence',
  recReady: 'Ready to record',
  recording: 'Recording',
  levelLabel: 'Input level',
  levels: { low: 'A bit louder', good: 'Just right', high: 'A bit softer' },
  recStart: 'Start recording',
  recStop: 'Stop recording',
  recHint: 'Tap the button and read the sentence · up to 15 sec',
  problems: {
    short: ['That was too short.', 'Please read the sentence to the end.'],
    quiet: ['We could barely hear you.', 'Speak a little louder, closer to the microphone.'],
    failed: ['We couldn’t process the recording.', 'Please record again.'],
  },
  processing: 'Polishing your voice…',
  styleTitle: 'Which voice shall we try?',
  styleDesc: 'Pick a style and compare the same sentence',
  mySentence: 'The sentence I recorded',
  styles: { squirrel: 'Chipmunk', giant: 'Giant', alien: 'Alien', ghost: 'Ghost', choir: 'Choir', karaoke: 'Karaoke', reverse: 'Reverse', walkie: 'Walkie' },
  styleNotes: { squirrel: 'High and fast, like helium', giant: 'A deep voice that shakes the ground', alien: 'A wobbly signal from space', ghost: 'An eerie echo creeping in', choir: 'A harmony of just me', karaoke: 'A mic drenched in echo', reverse: 'Backwards from the end', walkie: 'Kshh — base, do you copy?' },
  compareTitle: 'Compare the same sentence',
  playOriginal: 'Original',
  playStyled: 'Styled',
  converting: 'Converting…',
  play: 'Play',
  stop: 'Stop',
  reRecord: 'Record again',
  toResult: 'Finish with this voice',
  resultTitle: 'My voice, made new',
  resultDesc: 'My own audio, finished in the {style} style',
  otherStyle: 'Try another style',
  save: 'Send to my phone',
  saveTitle: 'Send the audio to your phone',
  audioLabel: '{style} style audio',
  cardLabel: 'Audio card',
}

// 일본어·중국어 공통 — levels 는 76px 칸이라 다섯 글자 이내, playOriginal·playStyled 는 66px 칸이라 세 글자.
// scripts 는 줄 끝을 되도록 문장부호로 맺는다(줄을 이어 붙일 때 빈칸이 문장부호 뒤에 오게).
const ja: VoiceText = {
  brand: 'VOICE STUDIO',
  headline: ['私の声でひらく', '新しいサウンド'],
  sub: '録音して · 変えて · 聴いてみましょう',
  note: 'ご自身の声だけでご体験ください',
  cta: 'ボイス体験スタート',
  foot: '自分の声にスタイルをのせて聴く体験',
  steps: ['録音', 'スタイル', '完成'],
  recordTitle: '一文を読んでください',
  recordDesc: 'ご自身の声だけ録音してください',
  micReady: 'マイク接続済み',
  micStarting: 'マイクを確認中…',
  micOff: 'マイクが見つかりません',
  micOffDesc: '接続を再確認しています。直らない場合はスタッフにお声がけください。',
  scriptLabel: '読む文章',
  scripts: [
    'こんにちは。\n今日も私だけの声で、\n新しい物語を始めます。',
    'はじめまして。\n今この瞬間を、\n私の声で残してみます。',
    '今日も一日、\nきらめく出来事が\nあふれますように。',
  ],
  otherScript: '別の文章',
  recReady: '録音準備OK',
  recording: '録音中',
  levelLabel: '入力レベル',
  levels: { low: '少し大きく', good: 'いい感じ', high: '少し小さく' },
  recStart: '録音開始',
  recStop: '録音停止',
  recHint: 'ボタンを押して文章を読んでください · 最大15秒',
  problems: {
    short: ['録音が短すぎます。', '文章を最後まで読んでください。'],
    quiet: ['声がよく聞こえませんでした。', 'マイクの近くで、もう少し大きくお話しください。'],
    failed: ['録音を処理できませんでした。', '録り直してください。'],
  },
  processing: '声を整えています…',
  styleTitle: 'どんな声に変えてみますか？',
  styleDesc: 'スタイルを選び、同じ文章で聴き比べましょう',
  mySentence: '録音した文章',
  styles: { squirrel: 'リス', giant: '巨人', alien: '宇宙人', ghost: 'おばけ', choir: '合唱団', karaoke: 'カラオケ', reverse: '逆再生', walkie: '無線機' },
  styleNotes: { squirrel: 'ヘリウムを吸ったように高く速く', giant: '地面が震える太い声', alien: 'ゆらゆら揺れる宇宙通信', ghost: 'ぞくっと迫るこだま', choir: 'ひとりで重ねるハーモニー', karaoke: 'エコーたっぷりのマイク', reverse: 'うしろから逆さまに', walkie: 'ザザッ—こちら本部' },
  compareTitle: '同じ文章で聴き比べ',
  playOriginal: '元の声',
  playStyled: '変換後',
  converting: '変換中…',
  play: '再生',
  stop: '停止',
  reRecord: '録り直す',
  toResult: 'この声で完成',
  resultTitle: '私の声が新しくなりました',
  resultDesc: '{style}スタイルで仕上げた私だけの音声',
  otherStyle: '他のスタイルを聴く',
  save: 'スマホで受け取る',
  saveTitle: '音声をスマホへ',
  audioLabel: '{style}スタイルの音声',
  cardLabel: '音声カード',
}

const zhHans: VoiceText = {
  brand: 'VOICE STUDIO',
  headline: ['用我的声音', '开启全新音色'],
  sub: '录一录 · 变一变 · 听一听',
  note: '请仅使用本人的声音体验',
  cta: '开始声音体验',
  foot: '给自己的声音换种风格听听看',
  steps: ['录音', '风格', '完成'],
  recordTitle: '请朗读一句话',
  recordDesc: '请只录制本人的声音',
  micReady: '麦克风已连接',
  micStarting: '正在检查麦克风…',
  micOff: '找不到麦克风',
  micOffDesc: '正在重新检查连接。如果仍无法使用，请联系工作人员。',
  scriptLabel: '朗读句子',
  scripts: [
    '你好。\n今天也用自己的声音，\n开启一段新的故事。',
    '很高兴见到你。\n这一刻，\n就用我的声音记录下来。',
    '希望今天一整天，\n都充满\n闪闪发光的好事。',
  ],
  otherScript: '换一句',
  recReady: '准备录音',
  recording: '录音中',
  levelLabel: '输入音量',
  levels: { low: '大声一点', good: '刚刚好', high: '小声一点' },
  recStart: '开始录音',
  recStop: '停止录音',
  recHint: '按下按钮后朗读句子 · 最长 15 秒',
  problems: {
    short: ['录音太短了。', '请把句子读完。'],
    quiet: ['声音听不太清楚。', '请靠近麦克风，再大声一点说。'],
    failed: ['录音处理失败。', '请重新录音。'],
  },
  processing: '正在调整声音…',
  styleTitle: '想换成哪种声音？',
  styleDesc: '选择风格，用同一句话对比听听看',
  mySentence: '我录下的句子',
  styles: { squirrel: '松鼠', giant: '巨人', alien: '外星人', ghost: '幽灵', choir: '合唱团', karaoke: 'KTV', reverse: '倒放', walkie: '对讲机' },
  styleNotes: { squirrel: '像吸了氦气，又高又快', giant: '震动大地的低沉嗓音', alien: '颤动的太空通讯', ghost: '阴森逼近的回声', choir: '一个人的和声', karaoke: '回声满满的麦克风', reverse: '从结尾倒着播', walkie: '嘶——这里是总部' },
  compareTitle: '用同一句话对比',
  playOriginal: '听原声',
  playStyled: '听变声',
  converting: '转换中…',
  play: '播放',
  stop: '停止',
  reRecord: '重新录音',
  toResult: '用这个声音完成',
  resultTitle: '我的声音焕然一新',
  resultDesc: '以{style}风格完成的专属音频',
  otherStyle: '听听其他风格',
  save: '发送到手机',
  saveTitle: '把音频发送到手机',
  audioLabel: '{style}风格音频',
  cardLabel: '声音卡片',
}

// 번체는 대만 어휘로 따로 쓴다(錄音·麥克風·連線·音檔·傳送) — 간체를 글자만 바꾸지 않는다
const zhHant: VoiceText = {
  brand: 'VOICE STUDIO',
  headline: ['用我的聲音', '開啟全新音色'],
  sub: '錄一錄 · 變一變 · 聽一聽',
  note: '請僅使用本人的聲音體驗',
  cta: '開始聲音體驗',
  foot: '為自己的聲音換種風格聽聽看',
  steps: ['錄音', '風格', '完成'],
  recordTitle: '請朗讀一句話',
  recordDesc: '請只錄製本人的聲音',
  micReady: '麥克風已連線',
  micStarting: '正在檢查麥克風…',
  micOff: '找不到麥克風',
  micOffDesc: '正在重新檢查連線。如果仍無法使用，請聯絡工作人員。',
  scriptLabel: '朗讀句子',
  scripts: [
    '你好。\n今天也用自己的聲音，\n開啟一段新的故事。',
    '很高興見到你。\n這一刻，\n就用我的聲音記錄下來。',
    '希望今天一整天，\n都充滿\n閃閃發光的好事。',
  ],
  otherScript: '換一句',
  recReady: '準備錄音',
  recording: '錄音中',
  levelLabel: '輸入音量',
  levels: { low: '大聲一點', good: '剛剛好', high: '小聲一點' },
  recStart: '開始錄音',
  recStop: '停止錄音',
  recHint: '按下按鈕後朗讀句子 · 最長 15 秒',
  problems: {
    short: ['錄音太短了。', '請把句子讀完。'],
    quiet: ['聲音聽不太清楚。', '請靠近麥克風，再大聲一點說。'],
    failed: ['錄音處理失敗。', '請重新錄音。'],
  },
  processing: '正在調整聲音…',
  styleTitle: '想換成哪種聲音？',
  styleDesc: '選擇風格，用同一句話比較聽聽看',
  mySentence: '我錄下的句子',
  styles: { squirrel: '松鼠', giant: '巨人', alien: '外星人', ghost: '幽靈', choir: '合唱團', karaoke: 'KTV', reverse: '倒轉', walkie: '對講機' },
  styleNotes: { squirrel: '像吸了氦氣，又高又快', giant: '震動大地的低沉嗓音', alien: '顫動的太空通訊', ghost: '陰森逼近的回聲', choir: '一個人的和聲', karaoke: '回音滿滿的麥克風', reverse: '從結尾倒著播', walkie: '嘶——這裡是總部' },
  compareTitle: '用同一句話比較',
  playOriginal: '聽原聲',
  playStyled: '聽變聲',
  converting: '轉換中…',
  play: '播放',
  stop: '停止',
  reRecord: '重新錄音',
  toResult: '用這個聲音完成',
  resultTitle: '我的聲音煥然一新',
  resultDesc: '以{style}風格完成的專屬音檔',
  otherStyle: '聽聽其他風格',
  save: '傳送到手機',
  saveTitle: '把音檔傳送到手機',
  audioLabel: '{style}風格音檔',
  cardLabel: '聲音卡片',
}

export const VOICE_TEXT: Partial<Record<KioskLang, VoiceText>> & { ko: VoiceText } = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }
