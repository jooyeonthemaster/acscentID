// 주문 영수증(겸 주문표) — 512dot 감열 프린터 폭의 흑백 그림 한 장. 매장 키오스크 셸은 이 그림을 그대로 찍는다.
// 손님 언어 메뉴명 아래 주방이 읽는 한국어 이름을 함께 쓰고, 알레르기·식습관 메모는 한국어 상자로 넣는다.

import QRCode from 'qrcode'
import { defaultSelection, priceFor, type Profile, type Selection } from './diet'
import { homePrice, won } from './format'
import { ORDER_TEXT } from './i18n'
import { kitchenNote } from './kitchen'
import { STORE, menuItem } from './menu'
import type { Country, OrderLang } from './types'

const W = 512
const PAD = 24

export interface ReceiptInput {
  orderNo: string
  lang: OrderLang
  country: Country | null
  profile: Profile
  cart: { id: string; sel: Selection; qty: number }[]
  dineIn: boolean
  phoneUrl: string
  /** 화면에서 쓰는 글꼴 이름(next/font 가 만든 이름) */
  fonts: { base: string; ja: string }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  // 띄어쓰기가 없는 일본어는 글자 단위로 자른다
  const tokens = /\s/.test(text) ? text.split(/(\s+)/) : [...text]
  let line = ''
  for (const tok of tokens) {
    const next = line + tok
    if (ctx.measureText(next).width > max && line.trim()) {
      out.push(line.trimEnd())
      line = tok.trimStart()
    } else line = next
  }
  if (line.trim()) out.push(line.trimEnd())
  return out
}

export async function renderReceipt(input: ReceiptInput): Promise<{ dataUrl: string; base64: string }> {
  const t = ORDER_TEXT[input.lang]
  const family = input.lang === 'ja' ? `${input.fonts.ja}, ${input.fonts.base}` : input.fonts.base
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}, sans-serif`
  const sample = input.cart.map((l) => `${menuItem(l.id)?.name[input.lang]}${menuItem(l.id)?.name.ko}`).join('') + 'MORAK모락₩0123456789'
  // 조각 글꼴이라 찍을 글자로 먼저 불러 둔다
  await Promise.all([400, 700, 800].map((w) => document.fonts.load(font(w, 20), sample).catch(() => null)))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = 2400
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, canvas.height)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'top'
  let y = PAD

  const center = (text: string, size: number, weight = 700, gap = 8) => {
    ctx.font = font(weight, size)
    ctx.textAlign = 'center'
    ctx.fillText(text, W / 2, y)
    ctx.textAlign = 'left'
    y += size + gap
  }
  const rule = (dashed = true) => {
    ctx.save()
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    if (dashed) ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.moveTo(PAD, y + 6)
    ctx.lineTo(W - PAD, y + 6)
    ctx.stroke()
    ctx.restore()
    y += 18
  }
  const row = (left: string, right: string, size: number, weight = 400) => {
    ctx.font = font(weight, size)
    ctx.fillText(left, PAD, y)
    ctx.textAlign = 'right'
    ctx.fillText(right, W - PAD, y)
    ctx.textAlign = 'left'
    y += size + 8
  }

  center(STORE.name, 46, 800, 4)
  center(`${STORE.nameKo} · ${STORE.area.en}`, 20, 400, 4)
  center('AI ORDER · Aible', 16, 700, 10)
  rule(false)

  ctx.font = font(700, 18)
  ctx.fillText(t.done.number, PAD, y)
  y += 26
  ctx.font = font(800, 92)
  ctx.fillText(input.orderNo, PAD - 4, y)
  ctx.font = font(700, 20)
  ctx.textAlign = 'right'
  ctx.fillText(input.dineIn ? '매장 / DINE-IN' : '포장 / TAKEOUT', W - PAD, y + 20)
  ctx.font = font(400, 18)
  ctx.fillText(new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }), W - PAD, y + 50)
  ctx.textAlign = 'left'
  y += 104
  rule()

  let total = 0
  for (const line of input.cart) {
    const item = menuItem(line.id)
    if (!item) continue
    const price = priceFor(item, line.sel ?? defaultSelection(item)) * line.qty
    total += price
    const opts = (item.options ?? [])
      .map((g) => g.choices.find((c) => c.id === (line.sel[g.id] ?? g.defaultChoice)))
      .filter((c, i) => c && c.id !== item.options![i].defaultChoice)
      .map((c) => c!.label.ko)
    row(`${item.name.ko}${opts.length ? ` (${opts.join(', ')})` : ''}`, `${line.qty} × ${price.toLocaleString('en-US')}`, 24, 700)
    if (input.lang !== 'ko') {
      ctx.font = font(400, 19)
      for (const l of wrap(ctx, item.name[input.lang], W - PAD * 2)) { ctx.fillText(l, PAD + 4, y); y += 25 }
    }
    y += 6
  }
  rule()
  row(t.common.total.toUpperCase(), won(total), 30, 800)
  const home = homePrice(total, input.country, input.lang)
  if (home) row('', `≈ ${home}`, 20, 400)
  y += 4

  const note = kitchenNote(input.cart, input.profile, input.country, input.dineIn)
  const lineWarns = note.lines.filter((l) => l.warn).map((l) => `${l.name} — ${l.warn}`)
  if (note.alerts.length || lineWarns.length) {
    const top = y
    y += 14
    ctx.font = font(800, 22)
    ctx.fillText('주방 확인 · KITCHEN', PAD + 14, y)
    y += 32
    ctx.font = font(700, 20)
    for (const a of [...note.alerts, ...lineWarns]) for (const l of wrap(ctx, `⚠ ${a}`, W - PAD * 2 - 28)) { ctx.fillText(l, PAD + 14, y); y += 27 }
    y += 8
    ctx.lineWidth = 3
    ctx.strokeRect(PAD, top, W - PAD * 2, y - top)
    y += 16
  }

  // 휴대폰으로 이어 보기 QR
  const qr = await QRCode.toDataURL(input.phoneUrl, { margin: 0, width: 180, errorCorrectionLevel: 'M' })
  const img = new Image()
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); img.src = qr })
  rule()
  const qrTop = y + 4
  ctx.drawImage(img, PAD, qrTop, 150, 150)
  ctx.font = font(800, 22)
  const textX = PAD + 168
  let ty = qrTop + 8
  for (const l of wrap(ctx, t.done.phone, W - textX - PAD)) { ctx.fillText(l, textX, ty); ty += 28 }
  ctx.font = font(400, 17)
  for (const l of wrap(ctx, t.done.phoneSub, W - textX - PAD)) { ctx.fillText(l, textX, ty); ty += 23 }
  y = Math.max(qrTop + 150, ty) + 18
  rule()
  center(t.done.thanks, 26, 800, 6)
  center('Wi-Fi  MORAK_GUEST  /  morak1998', 17, 400, 6)
  center('Powered by Aible · AI concierge for travelers', 14, 400, 0)
  y += PAD

  const out = document.createElement('canvas')
  out.width = W
  out.height = Math.ceil(y)
  out.getContext('2d')!.drawImage(canvas, 0, 0)
  const dataUrl = out.toDataURL('image/png')
  return { dataUrl, base64: dataUrl.split(',')[1] }
}

/** 휴대폰 페이지로 넘기는 주문 요약 — 서버에 저장하지 않고 주소에 담는다 */
export function phonePayload(input: Omit<ReceiptInput, 'phoneUrl' | 'fonts'>): string {
  const data = {
    n: input.orderNo,
    l: input.lang,
    c: input.country?.code ?? '',
    d: input.dineIn ? 1 : 0,
    t: Math.floor(Date.now() / 1000),
    i: input.cart.map((l) => [l.id, l.qty, Object.entries(l.sel).map(([k, v]) => `${k}=${v}`).join(',')]),
    a: input.profile.allergens,
    g: input.profile.diets,
    s: input.profile.spiceMax,
    p: input.profile.party,
  }
  const json = JSON.stringify(data)
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
