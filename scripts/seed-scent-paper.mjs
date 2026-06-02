// 시향지 옵션 시드 — 마이그레이션 20260606_scent_paper_option.sql 과 동일한 행을
// 호스팅 Supabase(admin_product_pricing)에 idempotent 하게 INSERT 한다.
//
// 실행: node scripts/seed-scent-paper.mjs
// (.env.local 의 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 읽는다)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env.local 수동 파싱 (standalone 스크립트라 Next 자동 로딩 없음)
function loadEnv() {
  try {
    const text = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {}
}
loadEnv()

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env.local 확인)')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const rows = [
  { product_type: 'image_analysis', size: 'scent_paper', price: 4000, original_price: null, label: '시향지', sort_order: 2, is_active: true, updated_by: 'seed:scent-paper' },
  { product_type: 'chemistry_set', size: 'scent_paper', price: 4000, original_price: null, label: '시향지 2매', sort_order: 2, is_active: true, updated_by: 'seed:scent-paper' },
]

for (const row of rows) {
  const { data: existing } = await supabase
    .from('admin_product_pricing')
    .select('product_type,size')
    .eq('product_type', row.product_type)
    .eq('size', row.size)
    .maybeSingle()
  if (existing) {
    console.log(`SKIP (이미 존재): ${row.product_type}/${row.size}`)
    continue
  }
  const { error } = await supabase.from('admin_product_pricing').insert(row)
  if (error) {
    console.error(`FAIL ${row.product_type}/${row.size}:`, error.message)
    process.exitCode = 1
  } else {
    console.log(`INSERT OK: ${row.product_type}/${row.size} (₩${row.price}, "${row.label}")`)
  }
}
