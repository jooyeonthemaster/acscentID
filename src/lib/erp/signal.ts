// ============================================================
//  ERP 에 보내는 신호 — "가져가라"
// ------------------------------------------------------------
//  결제가 확정되거나 환불이 처리된 직후, 본사 ERP 에 **빈 신호**를 보낸다.
//  ERP 는 그 신호를 받고 /api/erp/feed 를 끌어간다.
//
//  왜 결제 내용을 직접 밀어 넣지 않는가:
//    ① 밀어 넣으려면 이 사이트가 ERP 의 저장 규칙(판매 줄·상품 매칭·
//       이벤트 귀속)을 알아야 한다. 그건 ERP 의 일이다.
//    ② 신호가 한 번 실패하면 그 건은 영영 빠진다. 신호가 "새 것이 있다"는
//       말만 하면, 놓쳐도 다음 주기 폴링이 같은 것을 가져간다.
//    ③ 신호에 금액이 없으면 새도 잃을 것이 없다.
//
//  ⚠️ 절대 throw 하지 않는다. ERP 가 죽어 있어도 우리 결제는 끝나야 한다.
//     호출부는 await 하지 않는다 (fire-and-forget).
//
//  ⚠️ `void fetch(...)` 만 하면 서버리스 함수가 응답을 보낸 뒤 **얼어붙어**
//     신호가 나가지 못하는 일이 생긴다. 그래서 Next 의 after() 에 맡긴다 —
//     응답이 나간 뒤에도 함수가 이 일을 끝낼 때까지 살아 있다. 요청 범위
//     밖(스크립트 등)에서는 after() 가 던지므로 그때만 그냥 흘려보낸다.
// ============================================================

import { after } from 'next/server'

const TIMEOUT_MS = 3000

/**
 * ERP 에 "새 매출이 있다"고 알린다.
 *
 * 환경변수가 없으면 아무 일도 하지 않는다 — 로컬·미리보기 배포에서
 * 실수로 본사 ERP 를 두드리지 않게 하려는 것이다.
 *
 * @param reason 로그에만 쓰는 사람 말 ("결제 확정" · "환불")
 * @param opts.reconcile 주문을 지웠을 때 — ERP 가 가진 주문이 아직 있는지 되묻게 한다
 */
export function notifyErp(reason: string, opts: { reconcile?: boolean } = {}): void {
  const url = (process.env.ERP_SYNC_SIGNAL_URL || '').trim()
  const token = (process.env.ERP_SIGNAL_TOKEN || '').trim()
  if (!url || !token) return

  const task = async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        // reconcile — 주문을 지웠을 때. 지운 주문은 피드에 다시 오지 않으므로
        // ERP 가 가진 주문이 아직 있는지 되물어 봐야 한다.
        body: JSON.stringify({ source: 'acscent-online', reason, ...(opts.reconcile ? { reconcile: true } : {}) }),
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!res.ok) console.warn(`[erp/signal] ERP 가 ${res.status} 로 답했습니다 (${reason})`)
    } catch (e) {
      // 신호는 놓쳐도 된다 — 다음 폴링이 메운다. 조용히 지나가지는 않는다.
      console.warn('[erp/signal] 신호를 보내지 못했습니다:', e instanceof Error ? e.message : e)
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    after(task)
  } catch {
    void task()
  }
}
