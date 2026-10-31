import { perfumes } from '@/data/perfumes'

export interface PerfumerRotation {
  remaining: string[]
  /** 오래된 결과부터, 가장 최근 결과는 배열 끝에 둔다. */
  recent: string[]
}

const IDS = perfumes.map((perfume) => perfume.id)
const VALID_IDS = new Set(IDS)
const RECENT_COUNT = 3
const STORAGE_KEY = 'acscent-kiosk-perfumer-rotation-v1'

function validList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === 'string' && VALID_IDS.has(id))
    : []
}

/** 저장소나 요청으로 받은 순환 상태를 실제 향료 30종에 맞춰 복구한다. */
export function normalizePerfumerRotation(raw: unknown): PerfumerRotation {
  const value = raw && typeof raw === 'object' ? raw as Partial<PerfumerRotation> : {}
  const remaining = [...new Set(validList(value.remaining))]
  // 같은 향이 여러 번 남아 있으면 마지막 기록을 최근 기록으로 취급한다.
  const recent = [...new Set(validList(value.recent).reverse())].reverse().slice(-RECENT_COUNT)
  return { remaining: remaining.length ? remaining : [...IDS], recent }
}

/** 한 순환 안에서는 미사용 향만 고르고, 직전 세 향은 다음 순환에서도 피한다. */
export function perfumerCandidates(rotation: PerfumerRotation): string[] {
  const current = normalizePerfumerRotation(rotation)
  const recent = new Set(current.recent)
  const candidates = current.remaining.filter((id) => !recent.has(id))
  // 손상된 상태가 최근 향만 남겼더라도 같은 세 향으로 고착되지 않는다.
  return candidates.length ? candidates : IDS.filter((id) => !recent.has(id))
}

/** 운영 기록에서 덜 사용한 향을 먼저 선택하고, 동률만 무작위로 푼다(기기별 순환이 우선). */
export function pickPerfumerScent(
  rotation: PerfumerRotation,
  historyNewestFirst: readonly string[],
  random: () => number = Math.random,
): string {
  const current = normalizePerfumerRotation(rotation)
  const history = validList(historyNewestFirst)
  let candidates = perfumerCandidates(current)

  // 새로 설치하거나 저장소가 비워진 기기도 운영 기록의 직전 세 향부터 되풀이하지 않는다.
  if (current.recent.length === 0) {
    const recentHistory = new Set(history.slice(0, RECENT_COUNT))
    const withoutRecentHistory = candidates.filter((id) => !recentHistory.has(id))
    if (withoutRecentHistory.length) candidates = withoutRecentHistory
  }

  const counts = new Map<string, number>()
  for (const id of history) counts.set(id, (counts.get(id) ?? 0) + 1)
  const minimum = Math.min(...candidates.map((id) => counts.get(id) ?? 0))
  const leastUsed = candidates.filter((id) => (counts.get(id) ?? 0) === minimum)
  const sampled = random()
  const index = Math.max(0, Math.min(leastUsed.length - 1, Math.floor((Number.isFinite(sampled) ? sampled : 0) * leastUsed.length)))
  return leastUsed[index]
}

let memoryRotation = normalizePerfumerRotation(undefined)
let pendingStorage = false

/** 사진·이름 없이 향 ID만 기기에 보관한다. 저장소 차단 시에는 현재 실행 중 메모리를 쓴다. */
export function readPerfumerRotation(): PerfumerRotation {
  if (typeof window === 'undefined') return normalizePerfumerRotation(undefined)
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (pendingStorage) {
      // 이전 저장이 실패했다면 오래된 저장본으로 되돌리지 않는다. 접근이 복구되면 먼저 밀어 넣는다.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryRotation))
      pendingStorage = false
    } else {
      let raw: unknown
      try { raw = stored === null ? undefined : JSON.parse(stored) } catch { raw = undefined }
      memoryRotation = normalizePerfumerRotation(raw)
    }
  } catch {
    // localStorage getter 자체가 막힌 브라우저에서도 같은 실행 중에는 순환을 이어간다.
  }
  return normalizePerfumerRotation(memoryRotation)
}

/** 실제 분석이 성공한 뒤에만 호출한다. 실패한 분석은 향을 소진하지 않는다. */
export function recordPerfumerScent(id: string): void {
  if (!VALID_IDS.has(id) || typeof window === 'undefined') return
  const current = readPerfumerRotation()
  memoryRotation = {
    remaining: current.remaining.filter((candidate) => candidate !== id),
    recent: [...current.recent.filter((candidate) => candidate !== id), id].slice(-RECENT_COUNT),
  }
  pendingStorage = true
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryRotation))
    pendingStorage = false
  } catch {
    // 다음 손님은 메모리에 남긴 최신 상태를 사용한다.
  }
}
