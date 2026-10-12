// 체험 모드 공용 문구 — 촬영 · 휴대폰으로 받기 · 준비 중. 모드별 문구는 각 모드 폴더의 text.ts.
// 한국어가 원본이다. 다른 언어에 없는 칸은 영어 → 한국어 순으로 채운다(kxText).

import type { KioskLang } from '@/lib/kiosk/i18n'

export interface KxCommonText {
  home: string
  /** 사진 다시 찍기 */
  retake: string
  cameraOff: string
  cameraChecking: string
  /** 휴대폰으로 받기 창 */
  saveTitle: string
  saveDesc: string
  savePreparing: string
  saveFailed: string
  saveRetry: string
  /** 보관 기간 안내 — 손님이 요청한 것만 24시간 */
  saveKeep: string
  saveDone: string
  /** 얼굴·손 인식 엔진을 받는 중 */
  enginePreparing: string
  engineFailed: string
  retry: string
  /** 예시 화면 아래 한 줄 대신 쓰는 안내(색은 실제와 다를 수 있음 등)는 모드가 따로 둔다 */
  langLabel: string
  langClose: string
}

const ko: KxCommonText = {
  home: '처음으로',
  retake: '다시 촬영',
  cameraOff: '카메라를 찾을 수 없어요',
  cameraChecking: '연결을 확인하는 중…',
  saveTitle: '휴대폰으로 받기',
  saveDesc: '휴대폰 카메라로 QR을 비추면 바로 받을 수 있어요.',
  savePreparing: '파일을 준비하고 있어요…',
  saveFailed: '파일을 올리지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
  saveRetry: '다시 시도',
  saveKeep: '받기를 누른 결과만 24시간 보관한 뒤 지워요.',
  saveDone: '다 받았어요',
  enginePreparing: '인식 도구를 준비하고 있어요…',
  engineFailed: '준비하지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
  retry: '다시 시도',
  langLabel: '언어 선택',
  langClose: '언어 메뉴 닫기',
}

const en: KxCommonText = {
  home: 'Start over',
  retake: 'Retake',
  cameraOff: 'Camera not found',
  cameraChecking: 'Checking the connection…',
  saveTitle: 'Send to my phone',
  saveDesc: 'Point your phone camera at the QR code to get it right away.',
  savePreparing: 'Preparing your file…',
  saveFailed: 'Could not upload the file. Check the connection and try again.',
  saveRetry: 'Try again',
  saveKeep: 'Only results you choose to save are kept, for 24 hours.',
  saveDone: 'Got it',
  enginePreparing: 'Getting things ready…',
  engineFailed: 'Could not get ready. Check the connection and try again.',
  retry: 'Try again',
  langLabel: 'Language',
  langClose: 'Close language menu',
}

const ja: KxCommonText = {
  home: '最初に戻る',
  retake: '撮り直す',
  cameraOff: 'カメラが見つかりません',
  cameraChecking: '接続を確認しています…',
  saveTitle: 'スマホで受け取る',
  saveDesc: 'スマホのカメラでQRコードを読み取ると、すぐに受け取れます。',
  savePreparing: 'ファイルを準備しています…',
  saveFailed: 'アップロードできませんでした。接続を確認してもう一度お試しください。',
  saveRetry: 'もう一度',
  saveKeep: '保存を選んだ結果だけを24時間保管し、その後削除します。',
  saveDone: '受け取りました',
  enginePreparing: '準備しています…',
  engineFailed: '準備できませんでした。接続を確認してもう一度お試しください。',
  retry: 'もう一度',
  langLabel: '言語',
  langClose: '言語メニューを閉じる',
}

const zhHans: KxCommonText = {
  home: '回到首页',
  retake: '重新拍摄',
  cameraOff: '找不到摄像头',
  cameraChecking: '正在检查连接…',
  saveTitle: '发送到手机',
  saveDesc: '用手机相机扫描二维码，即可立即保存。',
  savePreparing: '正在准备文件…',
  saveFailed: '上传失败。请检查连接后重试。',
  saveRetry: '重试',
  saveKeep: '仅保存您选择保存的结果，24小时后删除。',
  saveDone: '已收到',
  enginePreparing: '正在准备…',
  engineFailed: '准备失败。请检查连接后重试。',
  retry: '重试',
  langLabel: '语言',
  langClose: '关闭语言菜单',
}

const zhHant: KxCommonText = {
  home: '回到首頁',
  retake: '重新拍攝',
  cameraOff: '找不到攝影機',
  cameraChecking: '正在檢查連線…',
  saveTitle: '傳送到手機',
  saveDesc: '用手機相機掃描 QR 碼，即可立即儲存。',
  savePreparing: '正在準備檔案…',
  saveFailed: '上傳失敗。請檢查連線後再試一次。',
  saveRetry: '再試一次',
  saveKeep: '僅保存您選擇儲存的結果，24小時後刪除。',
  saveDone: '已收到',
  enginePreparing: '正在準備…',
  engineFailed: '準備失敗。請檢查連線後再試一次。',
  retry: '再試一次',
  langLabel: '語言',
  langClose: '關閉語言選單',
}

export const KX_COMMON: Record<KioskLang, KxCommonText> = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant }

/** 모드 문구 고르기 — 그 언어가 없으면 영어, 영어도 없으면 한국어 */
export function kxText<T>(table: Partial<Record<KioskLang, T>> & { ko: T }, lang: KioskLang): T {
  return table[lang] ?? table.en ?? table.ko
}
