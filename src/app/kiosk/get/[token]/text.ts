import type { KioskLang } from '@/lib/kiosk/i18n'

export interface ShareText {
  title: string
  save: string
  saved: string
  saveAll: string
  hint: string
  failed: string
  /** 보관 안내 + 만료 시각 */
  keep: (until: string) => string
  expiredTitle: string
  expiredDesc: string
  missingTitle: string
  missingDesc: string
  open: string
}

export const SHARE_TEXT: Record<KioskLang, ShareText> = {
  ko: {
    title: '내 결과 받기', save: '저장하기', saved: '저장했어요', saveAll: '모두 저장',
    hint: '아이폰은 "이미지 저장"을, 안드로이드는 다운로드 폴더를 확인해 주세요.',
    failed: '저장하지 못했어요. 다시 눌러 주세요.',
    keep: (until) => `받기를 누른 결과만 24시간 보관해요. ${until}까지 받을 수 있어요.`,
    expiredTitle: '받을 수 있는 기간이 지났어요', expiredDesc: '결과는 24시간 동안만 보관하고 지워요.',
    missingTitle: '결과를 찾을 수 없어요', missingDesc: '주소가 맞는지 확인해 주세요.', open: '열기',
  },
  en: {
    title: 'Your result', save: 'Save', saved: 'Saved', saveAll: 'Save all',
    hint: 'On iPhone choose "Save Image". On Android check your Downloads folder.',
    failed: 'Could not save. Please tap again.',
    keep: (until) => `Results are kept for 24 hours only. Available until ${until}.`,
    expiredTitle: 'This link has expired', expiredDesc: 'Results are kept for 24 hours and then deleted.',
    missingTitle: 'Result not found', missingDesc: 'Please check the link.', open: 'Open',
  },
  ja: {
    title: '結果を受け取る', save: '保存する', saved: '保存しました', saveAll: 'すべて保存',
    hint: 'iPhoneは「画像を保存」を、Androidはダウンロードフォルダをご確認ください。',
    failed: '保存できませんでした。もう一度押してください。',
    keep: (until) => `結果は24時間だけ保管します。${until}まで受け取れます。`,
    expiredTitle: '受け取り期間が過ぎました', expiredDesc: '結果は24時間だけ保管し、その後削除します。',
    missingTitle: '結果が見つかりません', missingDesc: 'リンクをご確認ください。', open: '開く',
  },
  'zh-Hans': {
    title: '领取我的结果', save: '保存', saved: '已保存', saveAll: '全部保存',
    hint: 'iPhone 请选择“存储图像”，安卓请查看下载文件夹。',
    failed: '保存失败，请再试一次。',
    keep: (until) => `结果仅保存24小时，可在 ${until} 之前领取。`,
    expiredTitle: '领取期限已过', expiredDesc: '结果仅保存24小时，之后会删除。',
    missingTitle: '找不到结果', missingDesc: '请确认链接是否正确。', open: '打开',
  },
  'zh-Hant': {
    title: '領取我的結果', save: '儲存', saved: '已儲存', saveAll: '全部儲存',
    hint: 'iPhone 請選擇「儲存影像」，Android 請查看下載資料夾。',
    failed: '儲存失敗，請再試一次。',
    keep: (until) => `結果僅保存24小時，可在 ${until} 之前領取。`,
    expiredTitle: '領取期限已過', expiredDesc: '結果僅保存24小時，之後會刪除。',
    missingTitle: '找不到結果', missingDesc: '請確認連結是否正確。', open: '開啟',
  },
}
