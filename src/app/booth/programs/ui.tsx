'use client'

// 프로그램 화면 공통 부품 — 화면 틀(왼쪽 큰 사진 · 오른쪽 선택), 옵션 고르기, 진행 표시, 확인 창, 영상 재생기.
// 색·글꼴·장식은 programs.css 의 프로그램별 테마가 맡는다(같은 부품이라도 프로그램마다 모양이 다르다).

import { Check, Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ProgramDef, ProgramOptionGroup } from '@/lib/booth/programs/catalog'

export function Wordmark({ program, size = 'lg' }: { program: ProgramDef; size?: 'sm' | 'lg' | 'xl' }) {
  return <span className={`pg-wordmark pg-wordmark--${size}`} aria-label={program.wordmark}>{program.wordmark}</span>
}

/** 왼쪽 큰 사진 · 오른쪽 선택 */
export function Split({ visual, children, className }: { visual: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`pg-split${className ? ` ${className}` : ''}`}>
      <div className="pg-visual">{visual}</div>
      <div className="pg-panel">{children}</div>
    </div>
  )
}

export function PanelHead({ title, sub, eyebrow }: { title: string; sub?: string; eyebrow?: ReactNode }) {
  return (
    <header className="pg-head">
      {eyebrow && <div className="pg-eyebrow">{eyebrow}</div>}
      <h2>{title.split('\n').map((line, i) => <span key={i}>{line}</span>)}</h2>
      {sub && <p>{sub}</p>}
    </header>
  )
}

export function Creative({ text }: { text?: string }) {
  if (!text) return null
  return <p className="pg-creative" role="note">{text}</p>
}

export function OptionGroups({ groups, choices, onChange, disabled }: {
  groups: ProgramOptionGroup[]
  choices: Record<string, string>
  onChange: (group: string, option: string) => void
  disabled?: boolean
}) {
  return (
    <div className="pg-groups">
      {groups.map((group) => (
        <fieldset key={group.id} className={`pg-group pg-group--${group.look}`} disabled={disabled}>
          <legend>{group.label}</legend>
          <div className="pg-group-items" role="radiogroup" aria-label={group.label}>
            {group.options.map((option) => {
              const on = choices[group.id] === option.id
              return (
                <button key={option.id} type="button" role="radio" aria-checked={on} className={option.image ? 'pg-opt pg-opt--art' : 'pg-opt'} onClick={() => onChange(group.id, option.id)}>
                  {/* 그림이 있으면 타일은 사진, 칩은 작은 아이콘 — 글자 없는 그림, 이름은 아래 글자 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {option.image ? <img className="pg-opt-img" src={option.image} alt="" aria-hidden="true" /> : group.look !== 'chips' && <span className="pg-opt-swatch" style={{ background: option.swatch }} aria-hidden="true" />}
                  <span className="pg-opt-label">{option.label}{option.sub && group.look === 'tiles' && <small>{option.sub}</small>}</span>
                  {on && <span className="pg-opt-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

/** 진행 — ratio 가 있으면 실제 값, 없으면 도는 표시(가짜 % 를 만들지 않는다) */
export function Progress({ ratio, caption }: { ratio?: number | null; caption?: string }) {
  const known = typeof ratio === 'number'
  return (
    <div className={`pg-progress${known ? '' : ' pg-progress--busy'}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={known ? Math.round(ratio! * 100) : undefined} aria-busy={!known}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="pg-progress-track" cx="60" cy="60" r="52" />
        <circle className="pg-progress-bar" cx="60" cy="60" r="52" style={known ? { strokeDashoffset: 327 * (1 - ratio!) } : undefined} />
      </svg>
      <b>{known ? `${Math.round(ratio! * 100)}%` : ''}</b>
      {caption && <span>{caption}</span>}
    </div>
  )
}

export function Stages({ labels, active }: { labels: [string, string, string]; active: number }) {
  return (
    <ol className="pg-stages">
      {labels.map((label, i) => (
        <li key={label} data-state={i < active ? 'done' : i === active ? 'active' : 'todo'}>
          <i aria-hidden="true">{i < active ? <Check size={14} strokeWidth={3} /> : i + 1}</i>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  )
}

/** 흐르는 초 — 실제 지난 시간 */
export function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    const started = Date.now()
    const tick = () => setSeconds(Math.floor((Date.now() - started) / 1000))
    const first = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 500)
    return () => { window.clearTimeout(first); window.clearInterval(timer) }
  }, [running])
  return seconds
}

export function Modal({ children, onClose, label }: { children: ReactNode; onClose?: () => void; label: string }) {
  return (
    <div className="pg-modal" role="dialog" aria-modal="true" aria-label={label} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="pg-modal-card">{children}</div>
    </div>
  )
}

export const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** 영상 재생기 — 손가락으로 누르기 쉬운 큰 버튼 */
export function VideoPlayer({ src, mirror, autoPlay, className, replayKey }: { src: string; mirror?: boolean; autoPlay?: boolean; className?: string; replayKey?: number }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  useEffect(() => {
    const video = ref.current
    if (!video || !replayKey) return
    video.currentTime = 0
    void video.play().catch(() => undefined)
  }, [replayKey])
  const toggle = () => {
    const video = ref.current
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }
  return (
    <div className={`pg-player${className ? ` ${className}` : ''}`}>
      <video
        ref={ref} src={src} playsInline autoPlay={autoPlay} muted={muted}
        style={mirror ? { transform: 'scaleX(-1)' } : undefined}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onDurationChange={(e) => { if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration) }}
        onClick={toggle}
      />
      {!playing && <button type="button" className="pg-player-big" onClick={toggle} aria-label="재생"><Play size={44} fill="currentColor" /></button>}
      <div className="pg-player-bar">
        <button type="button" onClick={toggle} aria-label={playing ? '일시 정지' : '재생'}>{playing ? <Pause size={24} /> : <Play size={24} />}</button>
        <input type="range" min={0} max={duration || 1} step={0.1} value={Math.min(time, duration || 1)} aria-label="재생 위치"
          onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value) }} />
        <span>{formatTime(time)} / {formatTime(duration)}</span>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? '소리 켜기' : '소리 끄기'}>{muted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
        <button type="button" onClick={() => void ref.current?.requestFullscreen?.().catch(() => undefined)} aria-label="전체 화면"><Maximize size={22} /></button>
      </div>
    </div>
  )
}
