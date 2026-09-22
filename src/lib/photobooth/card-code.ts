/**
 * 포토카드 코드 규칙.
 *
 * 카드 QR에는 URL을 담는다 — 폰으로 찍으면 안내 페이지가 열리고, 부스 카메라로 찍으면
 * 여기서 코드만 뽑아 쓴다. QR이 긁혀 못 읽을 때를 대비해 카드에 코드를 병기하고
 * 부스에서 직접 입력할 수 있게 한다.
 */

// 혼동되는 글자(0/O, 1/I/L) 제외 — 사람이 보고 입력하는 코드라서
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** 부스 온스크린 키패드에 그대로 쓰는 문자 집합 */
export const CARD_ALPHABET = ALPHABET
export const CARD_CODE_LENGTH = 5
const CARD_CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CARD_CODE_LENGTH}}$`)

export function generateCardCode(): string {
  return Array.from(
    { length: CARD_CODE_LENGTH },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('')
}

export function isCardCode(value: string): boolean {
  return CARD_CODE_PATTERN.test(value)
}

/** 카드 QR에 담을 URL */
export function cardUrl(origin: string, code: string): string {
  return `${origin}/booth/card/${code}`
}

/**
 * 스캔 결과에서 카드 코드 추출.
 * QR(URL)·코드만 있는 QR·직접 입력 어느 쪽이든 받아준다.
 */
export function parseCardCode(scanned: string): string | null {
  const raw = scanned.trim().toUpperCase()
  if (isCardCode(raw)) return raw

  const fromPath = raw.match(new RegExp(`/BOOTH/CARD/([${ALPHABET}]{${CARD_CODE_LENGTH}})`))
  if (fromPath) return fromPath[1]

  // 끝부분에 코드만 붙어 있는 형태까지 허용
  const tail = raw.match(new RegExp(`([${ALPHABET}]{${CARD_CODE_LENGTH}})$`))
  return tail ? tail[1] : null
}
