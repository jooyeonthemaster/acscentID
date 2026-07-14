// 일회성: Supabase 최근 주문 + 노션 DB 최근 행을 함께 조회 (키는 .env.local에서 읽고 출력 안 함)
import { readFileSync } from 'node:fs'
const ENV = '/Users/idongju/Desktop/acscent/.env.local'
const raw = readFileSync(ENV, 'utf8')
const get = k => {
  const m = raw.match(new RegExp('^(?:export\\s+)?' + k + '\\s*=\\s*(.*)$', 'm'))
  if (!m) return ''
  let v = m[1].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  return v
}
const now = Date.now()
const kst = iso => iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '-'
const ago = iso => iso ? Math.round((now - new Date(iso).getTime()) / 60000) + '분 전' : '-'

// ===== Supabase =====
const sUrl = get('NEXT_PUBLIC_SUPABASE_URL')
const sKey = get('SUPABASE_SERVICE_ROLE_KEY')
console.log('===== Supabase 최근 주문 =====')
try {
  const res = await fetch(`${sUrl}/rest/v1/orders?select=order_number,status,payment_method,final_price,created_at,paid_at&order=created_at.desc&limit=5`, {
    headers: { apikey: sKey, Authorization: `Bearer ${sKey}` },
  })
  const rows = await res.json()
  if (!res.ok) console.log('❌ 조회 실패', res.status, JSON.stringify(rows))
  else for (const r of rows) {
    console.log(`- ${r.order_number} [${r.status}] ${r.payment_method} ${Number(r.final_price).toLocaleString()}원  생성:${kst(r.created_at)} (${ago(r.created_at)})`)
  }
} catch (e) { console.log('❌ Supabase 오류:', e.message) }

// ===== Notion =====
const nKey = get('NOTION_API_KEY')
const nDb = get('NOTION_ORDERS_DATABASE_ID')
console.log('\n===== 노션 주문 DB 최근 행 =====')
try {
  const res = await fetch(`https://api.notion.com/v1/databases/${nDb}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${nKey}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sorts: [{ timestamp: 'created_time', direction: 'descending' }], page_size: 8 }),
  })
  const j = await res.json()
  if (!res.ok) { console.log('❌ 노션 조회 실패', res.status, JSON.stringify(j)); }
  else {
    console.log(`총 ${j.results.length}행 (최신순):`)
    for (const p of j.results) {
      const title = (p.properties?.['주문번호']?.title || []).map(t => t.plain_text).join('') || '(제목없음)'
      const status = p.properties?.['상태']?.select?.name || '-'
      const pay = p.properties?.['결제수단']?.select?.name || '-'
      console.log(`- ${title} [${status}] ${pay}  추가됨:${kst(p.created_time)} (${ago(p.created_time)})`)
    }
  }
} catch (e) { console.log('❌ 노션 오류:', e.message) }
