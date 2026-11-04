// 비전 월 배치 — 카드끼리 겹치지 않는 자리를 고른다(전시 화면 전용, 순수 계산이라 시험할 수 있다).
// 가장 최근 카드부터 놓는다: 방금 보낸 사람의 카드는 고른 자리에 남고, 앞선 카드가 가까운 빈자리로 비켜선다.
// 빈자리가 없으면(카드가 아주 많으면) 가장 덜 겹치는 자리에 둔다.

export interface WallSpotInput { id: string; x: number; y: number }
type Box = { x: number; y: number; w: number; h: number }

const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) *
  Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2))

/** sizes: 카드 id → [가로, 세로] (판 크기 대비 %). 결과: 카드 id → [가운데 x, 가운데 y] (%) */
export function layoutWall(messages: WallSpotInput[], sizes: Map<string, [number, number]>, gap = 1.5): Record<string, [number, number]> {
  const placed: Box[] = []
  const spots: Record<string, [number, number]> = {}
  for (const message of [...messages].reverse()) {
    const [rawW, rawH] = sizes.get(message.id) ?? [24, 16]
    const w = Math.min(rawW + gap, 96), h = Math.min(rawH + gap, 96)
    const clamp = (x: number, y: number): Box => ({ x: Math.min(100 - w / 2 - 1, Math.max(w / 2 + 1, x)), y: Math.min(100 - h / 2 - 1, Math.max(h / 2 + 1, y)), w, h })
    const cost = (box: Box) => placed.reduce((sum, other) => sum + overlapArea(box, other), 0)
    let best = clamp(message.x, message.y), bestCost = cost(best)
    // 고른 자리에서 시작해 점점 넓은 원을 돌며 덜 겹치는 자리를 찾는다
    for (let ring = 1; ring <= 24 && bestCost > 0; ring++) {
      const steps = ring * 8
      for (let k = 0; k < steps && bestCost > 0; k++) {
        const angle = (k / steps) * Math.PI * 2
        const box = clamp(message.x + Math.cos(angle) * ring * 4, message.y + Math.sin(angle) * ring * 4)
        const c = cost(box)
        if (c < bestCost - 1e-6) { best = box; bestCost = c }
      }
    }
    placed.push(best)
    spots[message.id] = [Math.round(best.x * 10) / 10, Math.round(best.y * 10) / 10]
  }
  return spots
}
