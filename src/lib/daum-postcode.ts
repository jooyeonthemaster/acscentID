// Daum 우편번호 검색 헬퍼 (스크립트는 루트 레이아웃에서 전역 로드됨)
// CheckoutForm.tsx에 이미 window.daum 전역 선언이 있어, 충돌 방지를 위해
// 여기서는 전역 augmentation 없이 지역 캐스팅으로 접근한다.

export interface DaumPostcodeResult {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  buildingName: string
}

interface DaumGlobal {
  Postcode: new (config: { oncomplete: (data: DaumPostcodeResult) => void }) => { open: () => void }
}

function getDaum(): DaumGlobal | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { daum?: DaumGlobal }).daum
}

// 스크립트 비동기 로드를 대비한 대기 로직
function waitForDaumPostcode(timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    if (getDaum()) return resolve(true)
    if (typeof window === 'undefined') return resolve(false)
    const start = Date.now()
    const interval = window.setInterval(() => {
      if (getDaum()) {
        window.clearInterval(interval)
        resolve(true)
      } else if (Date.now() - start > timeoutMs) {
        window.clearInterval(interval)
        resolve(false)
      }
    }, 100)
  })
}

/**
 * 우편번호 검색 팝업 열기.
 * @returns 검색 결과(선택 완료) 또는 null(스크립트 미로드/취소)
 */
export async function openDaumPostcode(): Promise<DaumPostcodeResult | null> {
  let daum = getDaum()
  if (!daum) {
    const ready = await waitForDaumPostcode()
    if (!ready) return null
    daum = getDaum()
    if (!daum) return null
  }
  return new Promise((resolve) => {
    try {
      new daum!.Postcode({
        oncomplete: (data) => resolve(data),
      }).open()
    } catch {
      resolve(null)
    }
  })
}
