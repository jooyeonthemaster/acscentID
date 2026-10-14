'use client'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { ExhibitContent, HeritageConfig, ProductConfig, WallDraft, WallMessage } from '@/lib/kiosk/expansion/exhibit'
import { layoutWall } from '@/lib/kiosk/expansion/wall-layout'
import './display.css'

function Box({ width, height, depth, top, className = '' }: { width: number; height: number; depth: number; top: number; className?: string }) {
  return <div className={`ix-box ${className}`} style={{ '--box-w': `${width}px`, '--box-h': `${height}px`, '--box-d': `${depth}px`, top } as CSSProperties} aria-hidden="true">{['front', 'back', 'left', 'right', 'top', 'bottom'].map(face => <i key={face} className={`ix-box-${face}`} />)}</div>
}
/** Six-sided geometry, rotated in 3D. No flat image is used as the product. */
export function ProductScene({ config, onRotate, compact = false }: { config: ProductConfig; onRotate?: (rotation: number) => void; compact?: boolean }) {
  const drag = useRef<{ x: number; angle: number } | null>(null)
  return <div className="ix-lamp-view" data-compact={compact || undefined} style={{ '--lamp-color': config.color, '--lamp-light': config.on ? config.brightness / 100 : 0 } as CSSProperties}
    aria-label={`${config.model === 'frame' ? '사각' : '기둥'} 조명 3D 모형, ${Math.round(config.rotation)}도 회전`}
    onPointerDown={onRotate ? e => { drag.current = { x: e.clientX, angle: config.rotation }; e.currentTarget.setPointerCapture(e.pointerId) } : undefined}
    onPointerMove={onRotate ? e => { if (drag.current) onRotate(((drag.current.angle + (e.clientX - drag.current.x) * 0.8) % 360 + 360) % 360) } : undefined}
    onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
    <div className="ix-lamp-glow" />
    <div className="ix-lamp-rotor" style={{ transform: `rotateX(-9deg) rotateY(${config.rotation}deg) scale(${config.zoom / 100})` }}>
      <Box width={config.model === 'frame' ? 154 : 120} height={10} depth={config.model === 'frame' ? 118 : 100} top={284} className="ix-lamp-base" />
      {config.model === 'frame' && <Box width={17} height={176} depth={17} top={188} className="ix-lamp-stem" />}
      <Box width={config.model === 'frame' ? 168 : 86} height={config.model === 'frame' ? 116 : 240} depth={config.model === 'frame' ? 124 : 86} top={config.model === 'frame' ? 92 : 160} className="ix-lamp-shade" />
    </div>
    {onRotate && <span className="ix-drag-note">좌우로 밀어 360° 회전</span>}
  </div>
}

function PalaceDrawing({ config }: { config: HeritageConfig }) {
  const sky = config.light === 'night' ? '#1C2946' : config.light === 'dusk' ? '#EAB595' : '#C2DDDF'
  const ground = config.light === 'night' ? '#425264' : config.light === 'dusk' ? '#B89C77' : '#C4C39A'
  return <svg viewBox="0 0 600 400" role="img" aria-label={`${config.scene === 'court' ? '궁궐 마당' : '연못 정자'}의 ${config.era === 'past' ? '옛' : '오늘'} 풍경 개념 재현`}>
    <rect width="600" height="400" fill={sky} />
    <circle cx="472" cy="69" r={config.light === 'night' ? 20 : 30} fill={config.light === 'night' ? '#F5EED8' : '#FFF1C6'} />
    {config.light === 'night' && [[55,50],[166,78],[244,36],[372,96],[546,32],[512,130]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="2" fill="#FFF3D3" />)}
    <path d="M0 235L80 127L171 228L295 138L401 215L515 120L600 231V400H0Z" fill={config.light === 'night' ? '#34495A' : '#8DA69A'} />
    <path d="M0 271L151 193L260 250L420 185L600 255V400H0Z" fill={config.light === 'night' ? '#3F5860' : '#718F77'} />
    <rect y="260" width="600" height="140" fill={ground} />
    {config.scene === 'pond' && <><ellipse cx="372" cy="334" rx="250" ry="72" fill={config.light === 'night' ? '#344D62' : '#79A9AD'} /><path d="M214 335h232m-202 16h261m-176 18h90" stroke={sky} strokeWidth="3" opacity=".65" /></>}
    <g transform={config.scene === 'pond' ? 'translate(75,25) scale(.77)' : ''}>
      <path d="M141 274H459L478 300H121Z" fill="#A9A9A0" /><rect x="143" y="239" width="314" height="42" fill="#B5B5AA" />
      <rect x="160" y="152" width="280" height="103" fill={config.era === 'past' ? '#AC8B6B' : '#BBA080'} />
      {[172,235,300,365,427].map(x => <g key={x}><rect x={x} y="151" width="13" height="112" fill="#784F40" /><rect x={x-3} y="252" width="20" height="10" fill="#9EAAA1" /></g>)}
      {[193,257,323,387].map(x => <g key={x}><rect x={x} y="167" width="31" height="69" fill={config.light === 'night' ? '#E5C776' : '#DFD4B8'} /><path d={`M${x} 190h31m-31 23h31M${x+15} 167v69`} stroke="#806C51" strokeWidth="3" /></g>)}
      <path d="M116 156Q178 128 208 102H391Q430 135 485 156Q388 147 300 149Q202 147 116 156Z" fill="#354F50" stroke="#263F45" strokeWidth="5" />
      <path d="M180 110Q232 87 265 76H337Q370 97 421 110Q300 102 180 110Z" fill="#47615C" stroke="#263F45" strokeWidth="5" />
      <path d="M158 143H444M215 98H388" stroke="#73867B" strokeWidth="4" />
      {config.era === 'past' && <><path d="M165 173h-28m296 0h30" stroke="#544737" strokeWidth="3" /><rect x="126" y="175" width="20" height="27" rx="5" fill="#F0D48C" /><rect x="457" y="175" width="20" height="27" rx="5" fill="#F0D48C" /></>}
    </g>
    {config.era === 'present' ? <><path d={config.scene === 'pond' ? 'M0 398L160 290L221 290L83 400' : 'M224 400L276 300H326L382 400'} fill="#DFD5BB" /><path d="M68 269v57m-19-57h40v30H49Z" fill="#DBD1B6" stroke="#506261" strokeWidth="4" /><path d="M56 279h25m-25 8h17" stroke="#647876" strokeWidth="3" /></> : <path d="M0 362Q178 312 260 359T600 355" fill="none" stroke="#D8C9A4" strokeWidth="18" opacity=".6" />}
    <path d="M20 290v-86m-25 32l26-62 31 62Z" fill="#43694E" stroke="#43694E" strokeWidth="8" /><path d="M553 283v-78m-27 32l28-65 29 65Z" fill="#406550" stroke="#406550" strokeWidth="7" />
  </svg>
}
export function HeritageScene({ config }: { config: HeritageConfig }) {
  return <div className="ix-heritage-scene"><PalaceDrawing config={config.comparison === null ? config : { ...config, era: 'past' }} />
    {config.comparison !== null && <><div className="ix-heritage-after" style={{ clipPath: `inset(0 0 0 ${config.comparison}%)` }}><PalaceDrawing config={{ ...config, era: 'present' }} /></div><div className="ix-compare-line" style={{ left: `${config.comparison}%` }} /><span className="ix-era-label">옛 풍경</span><span className="ix-era-label ix-era-label--right">오늘의 풍경</span></>}
  </div>
}
/** at: 전시 화면이 겹치지 않게 다시 잡은 자리(%) — 없으면 고른 자리를 화면 안쪽으로 맞춰 쓴다 */
export function VisionTile({ message, placed = false, at, id }: { message: WallDraft; placed?: boolean; at?: [number, number]; id?: string }) {
  const long = [...message.text].length > 35
  const spot = at ? { left: `${at[0]}%`, top: `${at[1]}%` } : { left: long ? `clamp(26%, ${message.x}%, 74%)` : `clamp(16%, ${message.x}%, 84%)`, top: long ? `clamp(34%, ${message.y}%, 66%)` : `clamp(22%, ${message.y}%, 78%)` }
  return <div className="ix-vision-tile" data-message={id} data-shape={message.shape} data-placed={placed || undefined} data-long={long || undefined} style={{ backgroundColor: message.color, ...(placed ? spot : {}) }}><span>{message.text || '우리의 내일에 남길 한 문장'}</span></div>
}
/**
 * 전시 화면의 비전 월 — 방문자마다 고른 자리가 같으면(기본값 가운데) 카드가 한 자리에 겹쳐 쌓여 마지막 한 장만 보였다.
 * 그려진 카드의 실제 크기를 재서, 가장 최근 카드는 고른 자리에 두고 앞선 카드를 가까운 빈자리로 옮긴다(wall-layout.ts).
 */
function WallBoard({ messages }: { messages: WallMessage[] }) {
  const board = useRef<HTMLDivElement>(null)
  const [spots, setSpots] = useState<Record<string, [number, number]>>({})
  useLayoutEffect(() => {
    const el = board.current
    if (!el) return
    // ResizeObserver 는 observe 하자마자 한 번 부른다 — 처음 배치와 창 크기 변화를 함께 맡는다
    const observer = new ResizeObserver(() => {
      const width = el.clientWidth, height = el.clientHeight
      if (!width || !height) return
      const sizes = new Map([...el.querySelectorAll<HTMLElement>('[data-message]')].map(tile => [tile.dataset.message!, [tile.offsetWidth / width * 100, tile.offsetHeight / height * 100] as [number, number]]))
      setSpots(layoutWall(messages, sizes))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [messages])
  return <div ref={board} className="ix-wall-board ix-wall-board--display">{messages.map(message => <VisionTile key={message.id} id={message.id} message={message} placed at={spots[message.id]} />)}</div>
}
export function ExhibitVisual({ content }: { content: ExhibitContent }) {
  if (content.kind === 'product') return <ProductScene config={content.config} />
  if (content.kind === 'heritage') return <HeritageScene config={content.config} />
  return <WallBoard messages={content.messages} />
}
