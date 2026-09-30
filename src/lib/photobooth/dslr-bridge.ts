/**
 * 매장 PC 카메라 브리지(tools/booth-camera-bridge) 클라이언트.
 *
 * 매장 DSLR(Canon EOS 200D II)은 USB 테더링 상태라 브라우저에 웹캠으로 보이지 않는다.
 * 같은 PC 에서 도는 브리지가 캐논 EDSDK 로 카메라를 잡아 localhost 로 넘겨주면,
 * 부스는 여기서 라이브뷰 프레임을 받아 그리고 셔터를 눌러 원본을 받는다.
 *
 * 브리지가 없으면(웹 미리보기·다른 기기) 부스는 기존처럼 웹캠(getUserMedia)을 쓴다.
 */

// localhost 가 아니라 127.0.0.1 — 브리지는 IPv4 에만 뜨는데, localhost 는 IPv6(::1)부터 시도해
// 요청마다 수백 ms 가 새어 라이브뷰가 반토막 난다 (부스 앱에서 실측 14fps → 8fps)
export const DSLR_BRIDGE_URL = 'http://127.0.0.1:9120'

export interface BridgeHealth {
  /** 브리지 프로그램이 응답하는지 */
  reachable: boolean
  /** 카메라까지 붙어 있는지 (전원 꺼짐·다른 앱 점유면 false) */
  connected: boolean
  model?: string
  error?: string | null
}

/** 브리지가 떠 있고 카메라가 붙어 있는지 — 짧게 물어보고 없으면 바로 포기한다 */
export async function probeDslrBridge(timeoutMs = 900): Promise<BridgeHealth> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${DSLR_BRIDGE_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) return { reachable: false, connected: false }
    const data = await res.json()
    return { reachable: true, connected: !!data.connected, model: data.model, error: data.error }
  } catch {
    return { reachable: false, connected: false }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 최신 라이브뷰 프레임. 요청이 오는 동안 브리지가 라이브뷰를 켜둔다.
 * 라이브뷰가 막 켜지는 중이면 null, 브리지나 카메라가 사라졌으면 throw.
 */
export async function fetchDslrFrame(): Promise<ImageBitmap | null> {
  const res = await fetch(`${DSLR_BRIDGE_URL}/frame.jpg`, { cache: 'no-store' })
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`라이브뷰 실패 (${res.status})`)
  return createImageBitmap(await res.blob())
}

/**
 * 셔터를 눌러 원본을 받는다 (6000x4000, 약 4초).
 * 인화는 1200x1800 이면 충분하므로 긴 변 maxEdge 로 줄여 메모리·합성 속도를 아낀다.
 */
export async function captureDslrStill(maxEdge = 2400): Promise<ImageBitmap> {
  const res = await fetch(`${DSLR_BRIDGE_URL}/capture`, { method: 'POST', cache: 'no-store' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `촬영 실패 (${res.status})`)
  }
  const blob = await res.blob()
  const probe = await createImageBitmap(blob)
  const scale = Math.min(1, maxEdge / Math.max(probe.width, probe.height))
  if (scale >= 1) return probe
  const w = Math.round(probe.width * scale)
  const h = Math.round(probe.height * scale)
  probe.close()
  return createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })
}

/**
 * 라이브뷰 자동초점 한 번 (약 1.2초). 브리지가 옛 버전(POST /af 없음)이거나 AF 가 안 되면 조용히 false.
 * 이용권 QR 처럼 가까이 댄 것은 손님 거리에 맞춘 초점으로는 흐려서 읽히지 않는다.
 */
export async function autofocusDslr(): Promise<boolean> {
  try {
    const res = await fetch(`${DSLR_BRIDGE_URL}/af`, { method: 'POST', cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return !!data.ok
  } catch {
    return false
  }
}
