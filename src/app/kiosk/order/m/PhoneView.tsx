'use client'

// 휴대폰 페이지 — 주문 상태(접수 → 조리 중 → 완료), 직원에게 보여 줄 한국어 카드, 주문한 메뉴 먹는 법, 근처 관광지.
// 주문 시각과 조리 시간으로 상태를 계산한다(데모 — 주방 연동 없음).

import { Box, Check, ChefHat, Footprints, Wifi } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { countryByCode } from '@/lib/kiosk/order/countries'
import { EMPTY_PROFILE, type DietId, type Profile, type Selection } from '@/lib/kiosk/order/diet'
import { foodSrc } from '@/lib/kiosk/order/format'
import { ORDER_TEXT } from '@/lib/kiosk/order/i18n'
import { kitchenNote } from '@/lib/kiosk/order/kitchen'
import { STORE, menuItem } from '@/lib/kiosk/order/menu'
import { ORDER_LANGS, type AllergenId, type OrderLang, type SpiceLevel } from '@/lib/kiosk/order/types'
import { notoSansJP } from '../../fonts'
import type { Dish3DId } from '../three/DishViewer'
import './phone.css'

const DishViewer = dynamic(() => import('../three/DishViewer').then((m) => m.DishViewer), { ssr: false })

interface Payload {
  n: string
  l: OrderLang
  c: string
  d: number
  t: number
  i: [string, number, string][]
  a: AllergenId[]
  g: DietId[]
  s: number
  p: number
}

function decode(code: string | null): Payload | null {
  if (!code) return null
  try {
    const json = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))))
    const data = JSON.parse(json) as Payload
    return data && typeof data.n === 'string' && Array.isArray(data.i) ? data : null
  } catch {
    return null
  }
}

function parseSel(raw: string): Selection {
  const sel: Selection = {}
  for (const part of raw.split(',').filter(Boolean)) {
    const [k, v] = part.split('=')
    if (k && v) sel[k] = v
  }
  return sel
}

function ArMode({ id, lang }: { id: string; lang: OrderLang }) {
  const t = ORDER_TEXT[lang]
  const item = menuItem(id)
  const [real, setReal] = useState(false)
  if (!item || !item.has3D) return <p className="okm-empty">—</p>
  return (
    <div className="okm-ar">
      <header>
        <span className="okm-eyebrow">{t.ar.title}</span>
        <h1>{item.name[lang]}</h1>
        <p>{item.tagline[lang]}</p>
      </header>
      <div className="okm-ar-canvas">
        <DishViewer dishId={item.id as Dish3DId} sizeCm={item.sizeCm} showReference={real} measureLabel={real ? t.ar.diameter(item.sizeCm) : undefined} autoRotate />
      </div>
      <button type="button" className={`okm-toggle${real ? ' is-on' : ''}`} onClick={() => setReal((v) => !v)}>
        {t.ar.actualSize} · {t.ar.diameter(item.sizeCm)}
        <i />
      </button>
      <p className="okm-prose">{item.description[lang]}</p>
      <p className="okm-foot">MORAK · Powered by Aible</p>
    </div>
  )
}

export function PhoneView() {
  const [params] = useState(() => new URLSearchParams(window.location.search))
  const arId = params.get('ar')
  const qlang = params.get('l') as OrderLang | null
  const [order] = useState(() => decode(params.get('o')))
  // 주문에 담긴 언어 → 주소의 l= → 휴대폰 언어(앱 설치 없이 모국어 자동 감지) → 영어
  const phoneLang = (navigator.languages?.[0] ?? navigator.language ?? 'en').slice(0, 2) as OrderLang
  const lang: OrderLang = order?.l && ORDER_LANGS.includes(order.l) ? order.l
    : qlang && ORDER_LANGS.includes(qlang) ? qlang
      : ORDER_LANGS.includes(phoneLang) ? phoneLang : 'en'
  const t = ORDER_TEXT[lang]
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(id)
  }, [])

  const rootClass = `okm ${notoSansJP.variable}`
  if (arId) return <div className={rootClass} data-lang={lang} lang={lang}><ArMode id={arId} lang={lang} /></div>
  if (!order) {
    return (
      <div className={rootClass} data-lang={lang} lang={lang}>
        <div className="okm-hero"><h1>MORAK</h1><p>{STORE.tagline[lang]}</p></div>
      </div>
    )
  }

  const cart = order.i.map(([id, qty, sel]) => ({ id, qty, sel: parseSel(sel) })).filter((l) => menuItem(l.id))
  const profile: Profile = { ...EMPTY_PROFILE, allergens: order.a ?? [], diets: order.g ?? [], spiceMax: (order.s ?? 2) as SpiceLevel, party: order.p ?? 2 }
  const country = countryByCode(order.c) ?? null
  const note = kitchenNote(cart, profile, country, order.d === 1)
  const prep = Math.max(8, ...cart.map((l) => menuItem(l.id)?.prepMinutes ?? 0)) * 60
  const elapsed = Math.max(0, now / 1000 - order.t)
  const stage = elapsed < 45 ? 0 : elapsed < prep ? 1 : 2
  const progress = Math.min(1, elapsed / prep)
  const left = Math.max(1, Math.ceil((prep - elapsed) / 60))

  return (
    <div className={rootClass} data-lang={lang} lang={lang}>
      <header className="okm-top">
        <span className="okm-brand">MORAK <small>모락</small></span>
        <span className="okm-eyebrow">{t.phone.yourOrder}</span>
      </header>

      <section className="okm-card okm-status">
        <span className="okm-label">{t.done.number}</span>
        <b className="okm-no">{order.n}</b>
        <ol className="okm-steps">
          {t.phone.status.map((s, i) => (
            <li key={s} className={i < stage ? 'is-done' : i === stage ? 'is-now' : ''}>
              <i>{i < stage || stage === 2 ? <Check size={14} strokeWidth={3} /> : i + 1}</i>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="okm-bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <p className="okm-eta">{stage === 2 ? t.phone.readyNow : t.phone.eta(left)}</p>
      </section>

      <section className="okm-card okm-staff">
        <h2><ChefHat size={18} strokeWidth={2.2} />{t.phone.staff}</h2>
        <p className="okm-sub">{t.phone.staffSub}</p>
        <div className="okm-paper" lang="ko">
          <p className="okm-paper-no">주문 {order.n}</p>
          {note.alerts.length ? note.alerts.map((a) => <p key={a} className="is-alert">⚠ {a}</p>) : <p>{t.phone.noNeeds} · 특이 사항 없음</p>}
          {note.notes.map((n) => <p key={n}>· {n}</p>)}
          <hr />
          {note.lines.map((l, i) => <p key={i}><b>{l.name}</b>{l.options ? ` (${l.options})` : ''} × {l.qty}{l.warn ? <span className="is-alert"> — {l.warn}</span> : null}</p>)}
        </div>
      </section>

      <section className="okm-dishes">
        <h2 className="okm-h2">{t.phone.dishes}</h2>
        {cart.map((line) => {
          const item = menuItem(line.id)!
          return (
            <article key={`${line.id}-${JSON.stringify(line.sel)}`} className="okm-card okm-dish">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foodSrc(item.id, true)} alt="" />
              <div>
                <h3>{item.name[lang]} <small lang="ko">{item.name.ko}</small></h3>
                <p>{item.howToEat[lang]}</p>
                {item.has3D && <a className="okm-link" href={`/kiosk/order/m?ar=${item.id}&l=${lang}`}><Box size={14} strokeWidth={2.4} /> {t.phone.open3d}</a>}
              </div>
            </article>
          )
        })}
      </section>

      <section className="okm-nearby">
        <h2 className="okm-h2"><Footprints size={16} strokeWidth={2.4} />{t.done.nearby}</h2>
        {STORE.nearby.map((spot) => (
          <div key={spot.id} className="okm-card okm-spot">
            <em>{t.done.walk(spot.walkMin)}</em>
            <b>{spot.name[lang]}</b>
            <small>{spot.note[lang]}</small>
          </div>
        ))}
      </section>

      <p className="okm-foot"><Wifi size={13} /> MORAK_GUEST / morak1998 · Powered by Aible</p>
    </div>
  )
}
