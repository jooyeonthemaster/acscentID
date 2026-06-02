import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const messagesDir = join(__dirname, '..', 'src', 'messages')

// 로케일별 추가 키 (todayScent 네임스페이스)
const extra = {
  ko: {
    sharedBanner: "친구가 '{name}' 향을 공유했어요!",
    sharedBannerSub: '너의 오늘의 향도 뽑아봐 🎁',
    viewSharedScent: "'{name}' 향 보러가기",
  },
  en: {
    sharedBanner: "A friend shared '{name}' with you!",
    sharedBannerSub: 'Draw your own scent of the day 🎁',
    viewSharedScent: "See '{name}'",
  },
  ja: {
    sharedBanner: '友達が「{name}」をシェアしました！',
    sharedBannerSub: 'あなたも今日の香りを引いてみて 🎁',
    viewSharedScent: '「{name}」を見る',
  },
  zh: {
    sharedBanner: '朋友和你分享了「{name}」！',
    sharedBannerSub: '你也来抽今日香气吧 🎁',
    viewSharedScent: '查看「{name}」',
  },
  es: {
    sharedBanner: "¡Un amigo compartió '{name}' contigo!",
    sharedBannerSub: 'Saca tu propio aroma del día 🎁',
    viewSharedScent: "Ver '{name}'",
  },
}

for (const [locale, keys] of Object.entries(extra)) {
  const file = join(messagesDir, `${locale}.json`)
  let text = readFileSync(file, 'utf8')

  const parsed = JSON.parse(text)
  if (!parsed.todayScent) {
    console.log(`${locale}: todayScent 없음 — 건너뜀`)
    continue
  }
  if (parsed.todayScent.sharedBanner) {
    console.log(`${locale}: 이미 sharedBanner 있음 — 건너뜀`)
    continue
  }

  // todayScent 의 마지막 키(cardFooter) 뒤, 닫는 '  }' 앞에 삽입.
  // cardFooter 는 trailing comma 없는 마지막 키이므로 정규식으로 정확히 매칭.
  const re = /(\n    "cardFooter": "(?:[^"\\]|\\.)*")(\n  \})/
  if (!re.test(text)) {
    console.log(`${locale}: cardFooter 앵커를 찾지 못함 — 건너뜀`)
    continue
  }

  const block = Object.entries(keys)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n')

  const newText = text.replace(re, `$1,\n${block}$2`)
  JSON.parse(newText) // 유효성 재검증
  writeFileSync(file, newText, 'utf8')
  console.log(`${locale}: sharedBanner 외 ${Object.keys(keys).length}개 키 추가`)
}
