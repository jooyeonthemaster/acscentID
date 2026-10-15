'use client'

// 공용 화면 조각 — 국기·가격·매운맛·알레르기 그림·AI 구슬·아래에서 올라오는 시트·수량 버튼.
// 유리(liquid glass) 질감은 order.css 의 .lg 계열이 맡는다. 누른 자리에 빛이 맺히는 건 usePressGlow.

import { AnimatePresence, motion } from 'framer-motion'
import {
  Beef, Bean, Egg, Fish, Flame, Flower2, Ham, LeafyGreen, Milk, Minus, MoonStar, Nut, Plus, Salad, Shell, Shrimp, Vegan, Wheat, WineOff, X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import type { DietId } from '@/lib/kiosk/order/diet'
import { flagSrc, homePrice, won } from '@/lib/kiosk/order/format'
import type { AllergenId, Country, OrderLang } from '@/lib/kiosk/order/types'

export function Flag({ code, size = 28, className }: { code: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagSrc(code)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`ok-flag${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    />
  )
}

export function Price({ krw, country, lang, size = 'md', strike }: { krw: number; country: Country | null; lang: OrderLang; size?: 'sm' | 'md' | 'lg' | 'xl'; strike?: boolean }) {
  const home = homePrice(krw, country, lang)
  return (
    <span className={`ok-price ok-price--${size}${strike ? ' is-strike' : ''}`}>
      <b>{won(krw)}</b>
      {home && <small>≈ {home}</small>}
    </span>
  )
}

/** 고추 다섯 개 중 몇 개 — 0 이면 '안 매움' 잎사귀 */
export function SpiceMeter({ level, label, compact }: { level: number; label?: string; compact?: boolean }) {
  return (
    <span className={`ok-spice${compact ? ' is-compact' : ''}`} data-level={level} aria-label={label}>
      <span className="ok-spice-dots" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <Flame key={n} size={compact ? 12 : 15} strokeWidth={2.4} className={n <= level ? 'is-on' : ''} />
        ))}
      </span>
      {label && <span className="ok-spice-label">{label}</span>}
    </span>
  )
}

/** 땅콩·참깨·겨자·아황산은 lucide 에 맞는 그림이 없어 직접 그린다 */
function PeanutIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.2c2.6 0 4.6 2 4.6 4.5 0 1.3-.6 2.3-1.2 3.2-.5.7-.5 1.5 0 2.2.6.9 1.2 1.9 1.2 3.2 0 2.5-2 4.5-4.6 4.5s-4.6-2-4.6-4.5c0-1.3.6-2.3 1.2-3.2.5-.7.5-1.5 0-2.2-.6-.9-1.2-1.9-1.2-3.2 0-2.5 2-4.5 4.6-4.5Z" />
      <path d="M10.2 7h.01M13.8 8.6h.01M10.4 16h.01M13.6 17.2h.01" strokeWidth="2.6" />
    </svg>
  )
}
function SesameIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <ellipse cx="8" cy="8.5" rx="2.4" ry="3.6" transform="rotate(-25 8 8.5)" />
      <ellipse cx="16" cy="9" rx="2.4" ry="3.6" transform="rotate(20 16 9)" />
      <ellipse cx="11.5" cy="16.5" rx="2.4" ry="3.6" transform="rotate(-5 11.5 16.5)" />
    </svg>
  )
}
function MustardIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.8h4l.6 3.4H9.4L10 2.8Z" />
      <path d="M8.6 6.2h6.8c.9 0 1.6.7 1.6 1.6V19a2.2 2.2 0 0 1-2.2 2.2H9.2A2.2 2.2 0 0 1 7 19V7.8c0-.9.7-1.6 1.6-1.6Z" />
      <path d="M7 11h10" />
    </svg>
  )
}
function SulphiteIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="15.5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="currentColor" fontFamily="inherit">SO₂</text>
    </svg>
  )
}

const ALLERGEN_ICON: Record<AllergenId, LucideIcon | ((p: { size?: number }) => ReactNode)> = {
  gluten: Wheat,
  crustaceans: Shrimp,
  eggs: Egg,
  fish: Fish,
  peanuts: PeanutIcon,
  soy: Bean,
  milk: Milk,
  nuts: Nut,
  celery: LeafyGreen,
  mustard: MustardIcon,
  sesame: SesameIcon,
  sulphites: SulphiteIcon,
  lupin: Flower2,
  molluscs: Shell,
}

export function AllergenIcon({ id, size = 22 }: { id: AllergenId; size?: number }) {
  const Icon = ALLERGEN_ICON[id] as (p: { size?: number; strokeWidth?: number }) => ReactNode
  return <Icon size={size} strokeWidth={1.9} />
}

const DIET_ICON: Record<DietId, LucideIcon> = {
  'no-pork': Ham,
  'no-beef': Beef,
  halal: MoonStar,
  vegetarian: Salad,
  vegan: Vegan,
  'no-alcohol': WineOff,
}

export function DietIcon({ id, size = 20 }: { id: DietId; size?: number }) {
  const Icon = DIET_ICON[id]
  return <Icon size={size} strokeWidth={1.9} />
}

/** AI 구슬 — 무지갯빛 유리구슬. thinking 이면 빨리 돈다 */
export function AiOrb({ size = 40, thinking, className }: { size?: number; thinking?: boolean; className?: string }) {
  return (
    <span className={`ok-orb${thinking ? ' is-thinking' : ''}${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <i className="ok-orb-swirl" />
      <i className="ok-orb-core" />
      <i className="ok-orb-shine" />
    </span>
  )
}

/** 아래에서 올라오는 시트 — 끌어내리거나 바깥을 누르면 닫힌다 */
export function BottomSheet({
  open, onClose, children, className, height = '92%', label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  height?: string
  label: string
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="ok-sheet-layer" key="layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <button type="button" className="ok-sheet-scrim" aria-label={label} onClick={onClose} />
          <motion.section
            role="dialog"
            aria-label={label}
            className={`ok-sheet lg lg-strong${className ? ` ${className}` : ''}`}
            style={{ height }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragSnapToOrigin
          >
            <SheetGrabber onClose={onClose} />
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** 시트 맨 위 손잡이 — 아래로 쓸어내리면 닫힌다 */
function SheetGrabber({ onClose }: { onClose: () => void }) {
  const start = useRef<number | null>(null)
  return (
    <div
      className="ok-sheet-grab"
      onPointerDown={(e) => { start.current = e.clientY }}
      onPointerUp={(e) => {
        if (start.current !== null && e.clientY - start.current > 40) onClose()
        start.current = null
      }}
    >
      <i />
    </div>
  )
}

export function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="ok-close lg lg-press" onClick={onClick} aria-label={label}>
      <X size={22} strokeWidth={2.2} />
    </button>
  )
}

export function Stepper({ value, onChange, min = 0, label }: { value: number; onChange: (n: number) => void; min?: number; label: string }) {
  return (
    <span className="ok-stepper lg" role="group" aria-label={label}>
      <button type="button" className="lg-press" onClick={() => onChange(Math.max(min, value - 1))} aria-label="−" disabled={value <= min}>
        <Minus size={18} strokeWidth={2.6} />
      </button>
      <motion.b key={value} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18 }}>
        {value}
      </motion.b>
      <button type="button" className="lg-press" onClick={() => onChange(value + 1)} aria-label="+">
        <Plus size={18} strokeWidth={2.6} />
      </button>
    </span>
  )
}

/**
 * 누른 자리에 빛이 맺히는 유리 반응 — .lg-press 요소에 --px/--py 를 심는다.
 * 터치 화면이라 hover 가 없다: pointerdown 한 번이 전부다.
 */
export function usePressGlow(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('.lg-press')
      if (!target) return
      const rect = target.getBoundingClientRect()
      const sx = target.offsetWidth ? rect.width / target.offsetWidth : 1
      const sy = target.offsetHeight ? rect.height / target.offsetHeight : 1
      target.style.setProperty('--px', `${(e.clientX - rect.left) / sx}px`)
      target.style.setProperty('--py', `${(e.clientY - rect.top) / sy}px`)
      target.classList.remove('is-glow')
      // 같은 버튼을 연달아 눌러도 빛이 다시 맺히게
      void target.offsetWidth
      target.classList.add('is-glow')
    }
    el.addEventListener('pointerdown', onDown, { passive: true })
    return () => el.removeEventListener('pointerdown', onDown)
  }, [root])
}

/** 숫자가 굴러가며 바뀐다 */
export function RollingNumber({ value, className }: { value: number | string; className?: string }) {
  return (
    <span className={`ok-roll${className ? ` ${className}` : ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ y: '70%', opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-70%', opacity: 0, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
