/**
 * IMG_8089 사주 메인 이미지 등록기
 *
 * 등록:
 *   npx --yes tsx scripts/register-saju-main-image.ts
 *
 * 이번 등록만 되돌리기:
 *   npx --yes tsx scripts/register-saju-main-image.ts --cleanup
 */

import fs from 'fs'
import path from 'path'

function loadEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator < 0) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

const ROOT = path.resolve(__dirname, '..')
loadEnv(path.join(ROOT, '.env.local'))

import { createServiceRoleClient } from '../src/lib/supabase/service'

const PRODUCT_SLUG = 'saju'
const BUCKET = 'admin-content'
const STORAGE_PATH = 'products/saju/saju-main-warm-studio-8089-v2.png'
const LOCAL_IMAGE_PATH = path.join(
  ROOT,
  'public',
  'images',
  'products',
  'saju',
  'saju-main-warm-studio-8089-v2.png',
)
const REGISTRATION_PATH = path.join(
  ROOT,
  '상품사진',
  '01_최종선정_상세페이지',
  '01_프로그램',
  '03_사주분석퍼퓸',
  'registration.json',
)
const ALT_TEXT =
  "따뜻한 오프화이트 스튜디오에서 촬영한 AC'SCENT 사주 향수, 클리커 디퓨저와 사주 분석 보고서 구성"

interface ProductImageSnapshot {
  id: string
  display_order: number
}

interface Registration {
  registeredAt: string
  updatedAt?: string
  rowId: string
  productSlug: string
  storagePath: string
  publicUrl: string
  localImagePath: string
  previousRows: ProductImageSnapshot[]
  supersededStoragePaths?: string[]
}

async function register() {
  if (!fs.existsSync(LOCAL_IMAGE_PATH)) {
    throw new Error(`보정 이미지가 없습니다: ${LOCAL_IMAGE_PATH}`)
  }

  const supabase = createServiceRoleClient()
  const { data: existingRows, error: existingError } = await supabase
    .from('admin_product_images')
    .select('id, image_url, display_order')
    .eq('product_slug', PRODUCT_SLUG)
    .order('display_order', { ascending: true })

  if (existingError) {
    throw new Error(`기존 사주 이미지 조회 실패: ${existingError.message}`)
  }

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(STORAGE_PATH, fs.readFileSync(LOCAL_IMAGE_PATH), {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
  }

  const publicUrl = supabase.storage
    .from(BUCKET)
    .getPublicUrl(uploadData.path).data.publicUrl
  const previousRegistration = fs.existsSync(REGISTRATION_PATH)
    ? JSON.parse(
        fs.readFileSync(REGISTRATION_PATH, 'utf8'),
      ) as Registration
    : null
  const registeredRow = previousRegistration
    ? existingRows?.find((row) => row.id === previousRegistration.rowId)
    : null

  if (previousRegistration && registeredRow) {
    const { error } = await supabase
      .from('admin_product_images')
      .update({
        image_url: publicUrl,
        image_type: 'gallery',
        display_order: 0,
        alt_text: ALT_TEXT,
        updated_at: new Date().toISOString(),
      })
      .eq('id', previousRegistration.rowId)

    if (error) {
      throw new Error(`메인 이미지 교체 실패: ${error.message}`)
    }

    const supersededStoragePaths = new Set(
      previousRegistration.supersededStoragePaths || [],
    )
    if (previousRegistration.storagePath !== STORAGE_PATH) {
      supersededStoragePaths.add(previousRegistration.storagePath)
    }

    const nextRegistration: Registration = {
      ...previousRegistration,
      updatedAt: new Date().toISOString(),
      storagePath: uploadData.path,
      publicUrl,
      localImagePath: path.relative(ROOT, LOCAL_IMAGE_PATH),
      supersededStoragePaths: [...supersededStoragePaths],
    }
    fs.writeFileSync(
      REGISTRATION_PATH,
      JSON.stringify(nextRegistration, null, 2),
    )

    console.log(
      JSON.stringify(
        {
          ok: true,
          replaced: true,
          rowId: previousRegistration.rowId,
          publicUrl,
          supersededStoragePaths: [...supersededStoragePaths],
        },
        null,
        2,
      ),
    )
    return
  }

  const alreadyRegistered = existingRows?.find(
    (row) => row.image_url === publicUrl,
  )

  if (alreadyRegistered) {
    const { error } = await supabase
      .from('admin_product_images')
      .update({
        image_type: 'gallery',
        display_order: 0,
        alt_text: ALT_TEXT,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alreadyRegistered.id)

    if (error) {
      throw new Error(`기존 등록 갱신 실패: ${error.message}`)
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          reused: true,
          rowId: alreadyRegistered.id,
          publicUrl,
        },
        null,
        2,
      ),
    )
    return
  }

  const previousRows: ProductImageSnapshot[] = (existingRows || []).map(
    (row) => ({
      id: row.id,
      display_order: row.display_order,
    }),
  )

  for (const row of [...previousRows].sort(
    (a, b) => b.display_order - a.display_order,
  )) {
    const { error } = await supabase
      .from('admin_product_images')
      .update({
        display_order: row.display_order + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    if (error) {
      throw new Error(`기존 이미지 순서 조정 실패: ${error.message}`)
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('admin_product_images')
    .insert({
      product_slug: PRODUCT_SLUG,
      image_url: publicUrl,
      image_type: 'gallery',
      display_order: 0,
      alt_text: ALT_TEXT,
    })
    .select('id')
    .single()

  if (insertError) {
    for (const row of previousRows) {
      await supabase
        .from('admin_product_images')
        .update({ display_order: row.display_order })
        .eq('id', row.id)
    }
    throw new Error(`사주 메인 이미지 등록 실패: ${insertError.message}`)
  }

  const registration: Registration = {
    registeredAt: new Date().toISOString(),
    rowId: inserted.id,
    productSlug: PRODUCT_SLUG,
    storagePath: uploadData.path,
    publicUrl,
    localImagePath: path.relative(ROOT, LOCAL_IMAGE_PATH),
    previousRows,
  }
  fs.writeFileSync(
    REGISTRATION_PATH,
    JSON.stringify(registration, null, 2),
  )

  console.log(JSON.stringify({ ok: true, ...registration }, null, 2))
}

async function cleanup() {
  if (!fs.existsSync(REGISTRATION_PATH)) {
    throw new Error(`등록 기록이 없습니다: ${REGISTRATION_PATH}`)
  }

  const registration = JSON.parse(
    fs.readFileSync(REGISTRATION_PATH, 'utf8'),
  ) as Registration
  const supabase = createServiceRoleClient()

  const { error: deleteError } = await supabase
    .from('admin_product_images')
    .delete()
    .eq('id', registration.rowId)
  if (deleteError) {
    throw new Error(`이미지 등록 삭제 실패: ${deleteError.message}`)
  }

  for (const row of registration.previousRows) {
    const { error } = await supabase
      .from('admin_product_images')
      .update({
        display_order: row.display_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    if (error) {
      throw new Error(`기존 이미지 순서 복원 실패: ${error.message}`)
    }
  }

  const storagePaths = [
    registration.storagePath,
    ...(registration.supersededStoragePaths || []),
  ]
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([...new Set(storagePaths)])
  if (storageError) {
    throw new Error(`스토리지 이미지 삭제 실패: ${storageError.message}`)
  }

  fs.unlinkSync(REGISTRATION_PATH)
  console.log(
    JSON.stringify(
      {
        ok: true,
        removedRowId: registration.rowId,
        restoredRows: registration.previousRows.length,
      },
      null,
      2,
    ),
  )
}

const action = process.argv.includes('--cleanup') ? cleanup : register

action()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
