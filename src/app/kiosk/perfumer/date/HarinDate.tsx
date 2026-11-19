'use client'
/* eslint-disable @next/next/no-img-element -- 방금 찍은 data: 사진 */

// SCENT! 스핀오프 「하린 루트」(모드 ai-perfumer-harin, 2026-11-19) — 조향사 하린과 향수 하우스 여덟 곳을 돌며 대화하는 미연시.
//   셸(KioskClassic)의 상태 · 동작을 그대로 쓴다: 이름 · 성별 → 스타일 · 성격 · 매력(선택지가 키워드를 고른다) → 촬영 → AI 분석 → 결과 · 영수증.
//   장면: 셸 단계마다 한 곳(../scent-plan SCENE_OF). 분석이 먼저 끝나도 랩의 마지막 질문에 답할 때까지 부티크로 가지 않는다.
//   영상: HarinStage — 듣는 대기 · 걷는 이동 · 대사(talk/<id>.mp4, 대기 영상에 입 모양만 맞춘 것 · 소리 포함)를 한 사슬로 잇는다.
//   대사창 글자는 그 줄 목소리가 나올 때 띄우고, 다 말하면 저절로 다음 박자로(선택지 · 이름 · 촬영 · 이동 단추에서는 손님을 기다린다).
//   v2 갈래(docs/scent-harin-route-v2.md): ♥(0~18) · 성향(진심 · 장난 · 호기심 대답 수) · 기억해 둔 일(이름 비밀 · 장미 · 할머니 향 · 나의 향 · 손목 · 알레르기 · 계속 보기) · 고른 꽃.
//     장면 첫마디는 들어설 때의 ♥ 결(L · M · H), 조건 박자(펜 해프닝 · 되묻기 · 덧붙임)는 닿았을 때 맞으면만, 엔딩 6개(약속 · 티격태격 · 조향 동료 · 설렘 · 단골 · 첫 손님).
//     엔딩의 손편지 한 줄은 영수증 사인 위에 찍힌다(scent-receipt setScentLetter).
//   대본: harin-script.json(v2 — design-review/scent-art/tools/harin-v2-build.py 가 만든다). 음성 · 영상은 미리 만들어 이름을 부르지 않는다 — 대사창 글자에만 {name}.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Camera, Check, Heart, LoaderCircle, RotateCcw } from 'lucide-react'
import { GENDER_OPTIONS } from '@/app/[locale]/input/constants'
import { preloadPlan } from '../../video/stage'
import { useVideoSettle } from '../../video/ui'
import { SCENE_OF, type ScentScene } from '../scent-plan'
import { setScentLetter } from '../scent-receipt'
import { CamSlot, LiveVideo } from '../CaptureScreens'
import { AnalyzeErrorScreen } from '../AnalyzeScreens'
import { ResultScreen } from '../ResultScreen'
import { ReceiptScreen, receiptPhaseOf } from '../ReceiptScreens'
import { KeyboardPop } from '../KeyboardPop'
import type { PerfumerCtx, PfPickKind } from '../types'
import { HARIN_BASE, HARIN_PLAN } from './harin-plan'
import { HarinStage, type HarinSay } from './HarinStage'
import SCRIPT from './harin-script.json'
import './harin.css'

type Line = { id: string; text: string; say?: string; tone?: string }
type Tone = 's' | 't' | 'c'
type Flower = 'sunflower' | 'lily' | 'rose' | 'wild'
/** 박자 · 줄 조건 — 그 박자에 닿았을 때 맞지 않으면 건너뛴다 */
type Cond = { flag?: string; noFlag?: string; minLove?: number }
type Option = {
  label: string; love?: number | null; loveH?: number; tone?: Tone; flag?: string; flower?: Flower; keys?: string[]
  reply?: Line; replyH?: Line; replyByFlower?: Record<Flower, Line>
}
type Beat = {
  if?: Cond; line?: Line; tiers?: Record<Tier, Line>; tier?: { M: number; H: number }; now?: boolean; first?: { if: Cond; line: Line }[]
  choice?: 'love' | PfPickKind; id?: string; options?: Option[]; name?: boolean; camera?: boolean; go?: string; wait?: boolean; ending?: boolean
}
type Tier = 'L' | 'M' | 'H'
type EndLine = Line | { if: Cond; line: Line; else?: Line }
type Ending = { key: string; title: string; hidden?: boolean; when: { minLove?: number; flags?: string[]; minT?: number; minC?: number }; letter: string; lines: EndLine[] }
type SceneDef = { place: string; beats?: Beat[]; endings?: Ending[]; after?: { if: Cond; line: Line }[] }
const SCENES = SCRIPT.scenes as unknown as Record<ScentScene, SceneDef>
const ENDINGS = SCENES.boutique.endings!
const MAX_LOVE = SCRIPT.maxLove

/** 한 판의 상태 — ♥ · 성향(진심 s · 장난 t · 호기심 c 대답 수) · 기억해 둔 일(flags) · 온실에서 고른 꽃 */
type Run = { love: number; tone: Record<Tone, number>; flags: string[]; flower: Flower | null }
const FRESH: Run = { love: 0, tone: { s: 0, t: 0, c: 0 }, flags: [], flower: null }
/** ♥ 결 — 장면 첫마디 · 일부 대답의 세기. 기준은 박자마다 바꿀 수 있다(앞 장면은 ♥ 가 아직 덜 올라서 낮게 — harin-v2-build.py) */
const tierOf = (love: number, b?: Beat): Tier => { const t = b?.tier ?? { M: 6, H: 12 }; return love >= t.H ? 'H' : love >= t.M ? 'M' : 'L' }
const holds = (c: Cond | undefined, r: Run) =>
  !c || ((!c.flag || r.flags.includes(c.flag)) && (!c.noFlag || !r.flags.includes(c.noFlag)) && (c.minLove === undefined || r.love >= c.minLove))
/** 엔딩 — 위에서부터 먼저 맞는 것(docs/scent-harin-route-v2.md 8) */
const endingOf = (r: Run): Ending => ENDINGS.find(({ when: w }) =>
  (w.minLove === undefined || r.love >= w.minLove) && (w.flags ?? []).every((f) => r.flags.includes(f))
  && (w.minT === undefined || r.tone.t >= w.minT) && (w.minC === undefined || r.tone.c >= w.minC)) ?? ENDINGS[ENDINGS.length - 1]
/** 미리 받은 대사 영상 */
const prefetched = new Set<string>()

/** 장면의 박자 — 부티크는 첫마디 → 엔딩 줄 → 덧붙임(맞는 것 모두) → 결과 */
function beatsOf(scene: ScentScene, r: Run): Beat[] {
  if (scene !== 'boutique') return SCENES[scene].beats ?? []
  const e = endingOf(r)
  const lines = e.lines.flatMap((l) => ('if' in l ? [holds(l.if, r) ? l.line : l.else].filter((x): x is Line => Boolean(x)) : [l]))
  const after = (SCENES.boutique.after ?? []).filter((a) => holds(a.if, r)).map((a) => a.line)
  return [...(SCENES.boutique.beats ?? []), ...[...lines, ...after].map((line) => ({ line })), { ending: true }]
}
/** 그 박자에서 하린이 말할 줄(변형을 푼 것) — 줄 박자가 아니면 null. enter: 장면에 들어설 때의 ♥ */
function lineOf(b: Beat | undefined, r: Run, enter: number): Line | null {
  if (!b) return null
  if (b.line) return b.line
  if (b.tiers) return b.tiers[tierOf(b.now ? r.love : enter, b)]
  if (b.first) return b.first.find((f) => holds(f.if, r))?.line ?? null
  return null
}
/** 이 박자를 지금 쓸지 — 조건이 안 맞거나, 고를 줄이 하나도 없는 '첫 하나만' 박자면 건너뛴다 */
const applies = (b: Beat, r: Run) => holds(b.if, r) && (!b.first || b.first.some((f) => holds(f.if, r)))
/** 미리 받을 줄 — 그 박자에서 나올 수 있는 줄 모두 */
const linesIn = (b: Beat): Line[] => [
  ...(b.line ? [b.line] : []), ...Object.values(b.tiers ?? {}), ...(b.first ?? []).map((f) => f.line),
  ...(b.options ?? []).flatMap((o) => [o.reply, o.replyH, ...Object.values(o.replyByFlower ?? {})].filter((x): x is Line => Boolean(x))),
]

export function HarinDate({ ctx }: { ctx: PerfumerCtx }) {
  const name = ctx.name.trim()
  // 이름을 비워 두면 '{name}님' 을 통째로 '손님'(손님님이 되지 않게)
  const fill = (text: string) => (name ? text.replaceAll('{name}', name) : text.replaceAll('{name}님', '손님').replaceAll('{name}', '손님'))

  // ── 한 판의 상태(새 손님이 오면 — 셸이 첫 화면으로 돌아오면 — 지운다)
  const [run, setRun] = useState<Run>(FRESH)
  const love = run.love
  const [titled, setTitled] = useState(false)
  const [labDone, setLabDone] = useState(false)
  const [pop, setPop] = useState<{ n: number; id: number } | null>(null)
  const [seenStep, setSeenStep] = useState(ctx.step)
  if (seenStep !== ctx.step) {
    setSeenStep(ctx.step)
    if (ctx.step === 'attract') { setRun(FRESH); setTitled(false); setLabDone(false); setPop(null) }
  }
  const ending = endingOf(run)
  const addFlag = (f: string) => setRun((r) => (r.flags.includes(f) ? r : { ...r, flags: [...r.flags, f] }))

  // ── 가야 할 장소 — 결과가 나와도 랩의 마지막 질문에 답할 때까지는 랩
  const target: ScentScene = ctx.step === 'result' && !labDone ? 'lab' : SCENE_OF[ctx.step]
  const settle = useVideoSettle(target, target)
  const moving = settle.moving

  // ── 지금 장면의 몇 번째 박자인가(reply: 선택지를 고른 뒤 하린의 대답 · enter: 들어설 때의 ♥ · checked: 조건을 본 박자)
  type Pos = { scene: ScentScene; i: number; reply: Line | null; n: number; enter: number; checked: number }
  const [pos, setPos] = useState<Pos>({ scene: 'lane', i: 0, reply: null, n: 0, enter: 0, checked: -1 })
  if (!moving && pos.scene !== target) setPos({ scene: target, i: 0, reply: null, n: pos.n + 1, enter: love, checked: -1 })
  const beats = beatsOf(pos.scene, run)
  // 닿은 박자의 조건을 한 번 본다 — 안 맞으면 맞는 박자까지 건너뜀(한 번 쓴 박자는 뒤에 상태가 바뀌어도 그대로)
  if (pos.scene === target && pos.checked !== pos.i) {
    let j = pos.i
    while (beats[j] && !applies(beats[j], run)) j++
    setPos({ ...pos, i: j, checked: j })
  }
  const beat: Beat | undefined = pos.checked === pos.i ? beats[pos.i] : undefined
  const next = useCallback(() => setPos((p) => ({ ...p, i: p.i + 1, reply: null, n: p.n + 1 })), [])
  // 대사 음성이 끝나면 저절로 다음 박자로 — 그 사이 손님이 눌러 이미 넘어갔으면(n 이 바뀜) 아무것도 안 한다.
  // 다음 박자가 선택지 · 이름 · 촬영 · 장소 이동 단추면 거기서 손님을 기다린다(그 박자들은 스스로 넘어가지 않는다)
  const nextAfter = useCallback((n: number) => setPos((p) => (p.n !== n ? p : { ...p, i: p.i + 1, reply: null, n: p.n + 1 })), [])

  // 부티크에 들어서면 엔딩이 정해진다 — 영수증 손편지
  useEffect(() => { setScentLetter(ctx.step === 'result' ? ending.letter : null) }, [ctx.step, ending])
  // 첫 화면 — 영상 · 대사를 미리 받아 둔다
  useEffect(() => { if (ctx.step === 'attract') preloadPlan(HARIN_PLAN) }, [ctx.step])
  // 다음에 나올 대사 영상(다음 세 박자에서 나올 수 있는 줄 · 대답)을 미리 받아 둔다 — 누르자마자 입이 움직이게
  const ahead = beats.slice(pos.i, pos.i + 3).flatMap(linesIn).map((l) => l.id).join(',')
  useEffect(() => {
    for (const id of ahead.split(',')) if (id && !prefetched.has(id)) { prefetched.add(id); void fetch(`${HARIN_BASE}/talk/${id}.mp4`).catch(() => prefetched.delete(id)) }
  }, [ahead])
  // 랩의 마지막 질문에 답했고(wait 박자) 결과가 나왔으면 부티크로
  const waiting = !moving && pos.scene === 'lab' && Boolean(beat?.wait)
  if (waiting && ctx.step === 'result' && !labDone) setLabDone(true)

  // ── 지금 하린이 하는 말(대사창 · 립싱크 영상) — 선택지 박자에서는 바로 앞 줄을 띄워 둔다(영상은 다시 틀지 않는다)
  const prevLine = beats.slice(0, pos.i).reverse().map((b) => lineOf(b, run, pos.enter)).find(Boolean) ?? null
  const speaking: Line | null = pos.reply ?? lineOf(beat, run, pos.enter)
  const onTitle = ctx.step === 'attract' && !titled
  // 무대에 넘길 '지금 말할 줄' — n 은 박자 번호 + 1(무대는 0 을 '아직 아무 말도 안 함'으로 쓴다). 목소리가 나온 줄(voiced)만 대사창에 띄운다
  const sayN = pos.n + 1
  const say: HarinSay | null = !moving && speaking && !onTitle ? { id: speaking.id, n: sayN } : null
  const sayLines = useRef(new Map<number, { scene: ScentScene; line: Line }>())
  useEffect(() => { if (say && speaking) sayLines.current.set(say.n, { scene: pos.scene, line: speaking }) })
  const [voiced, setVoiced] = useState<{ n: number; scene: ScentScene; line: Line } | null>(null)
  // 무대가 콜백을 ref 로 들고 있어 매번 새 함수여도 된다
  const onVoice = (n: number) => { const v = sayLines.current.get(n); if (v) setVoiced({ n, ...v }) }
  const heard = voiced && voiced.scene === pos.scene ? voiced : null
  // 말하는 박자: 목소리가 나오면 그 줄, 그 전에는 바로 앞에 말한 줄을 그대로. 선택지 · 이름 · 촬영 · 이동 단추 박자: 마지막으로 말한 줄
  const shown: Line | null = speaking
    ? (heard?.n === sayN ? speaking : heard?.line ?? null)
    : (beat?.choice || beat?.name || beat?.camera || beat?.go ? heard?.line ?? prevLine : null)
  const talking = Boolean(speaking && heard?.n === sayN)

  const choose = (o: Option) => {
    if (beat?.choice && beat.choice !== 'love') {
      const kind = beat.choice
      for (const k of o.keys ?? []) if (!ctx.picks[kind].includes(k)) ctx.togglePick(kind, k)
    }
    // ♥ 가 높을 때(H)는 대답 · 오르는 몫이 달라지는 선택지가 있다(고르기 전 ♥ 로 본다)
    const high = tierOf(love, beat) === 'H'
    const gain = (high && o.loveH) || o.love || 0
    const reply = (o.replyByFlower ? o.replyByFlower[run.flower ?? 'sunflower'] : (high && o.replyH) || o.reply) ?? null
    setRun((r) => ({
      love: Math.min(MAX_LOVE, r.love + gain),
      tone: o.tone ? { ...r.tone, [o.tone]: r.tone[o.tone] + 1 } : r.tone,
      flags: o.flag && !r.flags.includes(o.flag) ? [...r.flags, o.flag] : r.flags,
      flower: o.flower ?? r.flower,
    }))
    if (gain) setPop({ n: gain, id: pos.n })
    setPos((p) => ({ ...p, reply, n: p.n + 1 }))
  }
  // 대사 다음으로 — 대답 뒤에는 다음 박자, 줄 뒤에도 다음 박자
  const advance = () => { if (speaking) next() }
  // 장소를 떠나는 단추 — 셸의 다음 단계
  const go = () => {
    if (pos.scene === 'lane') ctx.start()
    else if (pos.scene === 'studio') ctx.analyze()
    else ctx.next()
  }

  return (
    <div className="hd" data-moving={moving || undefined} data-title={onTitle || undefined}>
      <div className="scv-bg" aria-hidden="true">
        <HarinStage plan={HARIN_PLAN} scene={target} onSettle={settle.onSettle} say={say} onVoice={onVoice} onSaid={(n) => nextAfter(n - 1)} />
      </div>

      {onTitle ? (
        <button type="button" className="hd-title" onClick={() => setTitled(true)} aria-label="터치하여 시작">
          <span className="hd-logo">SCENT<em>!</em></span>
          <span className="hd-route">HARIN ROUTE · 하린 루트</span>
          <span className="hd-tag">향기로 기억해 줄래요?</span>
          <span className="hd-press">터치하여 시작</span>
        </button>
      ) : (
        <>
          <Hearts love={love} pop={pop} />
          {!moving && (
            <div className="hd-stage" key={`${pos.scene}-${pos.i}-${pos.reply?.id ?? ''}`}>
              {/* 선택지 — 대사창 위에 */}
              {beat?.choice && !pos.reply && (
                <div className="hd-choices" data-kind={beat.choice}>
                  {beat.options!.map((o, i) => (
                    <button key={o.label} type="button" style={{ '--i': i } as CSSProperties} onClick={() => choose(o)}>{o.label}</button>
                  ))}
                </div>
              )}
              {beat?.go && !pos.reply && (
                <div className="hd-choices" data-go>
                  <button type="button" data-main onClick={go}>{beat.go}</button>
                </div>
              )}

              {beat?.name && !pos.reply ? (
                <NameBox ctx={ctx} line={shown ? fill(shown.text) : ''} onDone={() => { if (!ctx.name.trim()) addFlag('secret'); next() }} />
              ) : beat?.camera && !pos.reply ? (
                <CameraBox ctx={ctx} onDone={next} />
              ) : beat?.ending && !pos.reply ? (
                <ResultBox ctx={ctx} title={ending.hidden ? `숨은 엔딩 · ${ending.title}` : ending.title} love={love} />
              ) : beat?.wait && !pos.reply ? (
                ctx.analyzeError ? <div className="hd-panel"><AnalyzeErrorScreen ctx={ctx} /></div> : (
                  <Talk line="거의 다 됐어요. 마지막으로 향을 한 번 더 맡아 보는 중이에요…" wait />
                )
              ) : shown ? (
                <Talk key={heard?.n ?? 'x'} line={fill(shown.text)} onTap={talking ? advance : undefined} more={talking} />
              ) : null}
            </div>
          )}
        </>
      )}
      {ctx.keyboardOpen && !moving && beat?.name && <KeyboardPop anchor=".hd-name .pf-field">{ctx.keyboard}</KeyboardPop>}
    </div>
  )
}

/** 대사창 — 이름표 · 한 줄씩 떠오르는 글자 · 다음 표시. 누르면 다음으로 */
function Talk({ line, onTap, more = false, wait = false }: { line: string; onTap?: () => void; more?: boolean; wait?: boolean }) {
  const chars = [...line]
  return (
    <button type="button" className="hd-box" onClick={onTap} disabled={!onTap} aria-live="polite">
      <span className="hd-who">하린<small>PERFUMER</small></span>
      <span className="hd-line">{chars.map((c, i) => <span key={i} style={{ animationDelay: `${120 + i * 28}ms` }}>{c}</span>)}</span>
      {wait && <span className="hd-dots" aria-label="기다리는 중"><i /><i /><i /></span>}
      {more && <span className="hd-more" style={{ animationDelay: `${300 + chars.length * 28}ms` }} aria-hidden="true">▼</span>}
    </button>
  )
}

/** ♥ 아홉 칸(호감 2 = 한 칸, 최대 18) · 오른 만큼 잠깐 떠오른다 */
function Hearts({ love, pop }: { love: number; pop: { n: number; id: number } | null }) {
  return (
    <div className="hd-hearts" aria-label={`호감도 ${love} / ${MAX_LOVE}`}>
      {Array.from({ length: MAX_LOVE / 2 }, (_, i) => {
        const v = Math.max(0, Math.min(2, love - i * 2))
        return <Heart key={i} size={18} strokeWidth={2} data-fill={v === 2 ? 'full' : v === 1 ? 'half' : undefined} aria-hidden="true" />
      })}
      {pop && <b key={pop.id} className="hd-pop">+{'♥'.repeat(pop.n)}</b>}
    </div>
  )
}

/** 살롱 — 방명록에 이름 · 성별. 자판은 이름 칸 위 말풍선(KeyboardPop) */
function NameBox({ ctx, line, onDone }: { ctx: PerfumerCtx; line: string; onDone: () => void }) {
  const { t } = ctx
  return (
    <div className="hd-box hd-name" role="group">
      <span className="hd-who">하린<small>PERFUMER</small></span>
      <span className="hd-line hd-line--still">{line}</span>
      <button type="button" className="pf-field" data-focus={ctx.keyboardOpen || undefined} onClick={ctx.openKeyboard}>
        {ctx.name ? <span className="pf-field-value">{ctx.name}</span> : !ctx.keyboardOpen && <em>방명록에 이름 쓰기 (선택)</em>}
        {ctx.keyboardOpen && <i className="pf-caret" aria-hidden="true" />}
      </button>
      <div className="pf-gender" role="radiogroup" aria-label={t.genderLabel}>
        {GENDER_OPTIONS.map((g) => {
          const on = ctx.gender === g.key
          return (
            <button key={g.key} type="button" role="radio" aria-checked={on} className="pf-option" data-on={on || undefined} onClick={() => ctx.setGender(g.key)}>
              {on && <span className="pf-check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>}
              {t.gender[g.key as keyof typeof t.gender] ?? g.label}
            </button>
          )
        })}
      </div>
      <button type="button" className="hd-ok" disabled={!ctx.gender || ctx.keyboardOpen} onClick={onDone}>방명록에 남기기</button>
    </div>
  )
}

/** 스튜디오 — 카메라 · 카운트다운 · 찍은 사진(다시 찍기 · 이 사진으로) */
function CameraBox({ ctx, onDone }: { ctx: PerfumerCtx; onDone: () => void }) {
  const counting = ctx.countdown !== null
  return (
    <div className="hd-box hd-camera">
      <span className="hd-who">하린<small>PERFUMER</small></span>
      <span className="hd-line hd-line--still">{ctx.photo ? '이 사진, 마음에 들어요?' : counting ? '하나, 둘…' : '카메라 보고, 편하게 웃어 주세요.'}</span>
      <CamSlot slotRef={ctx.frame.slotRef} size={ctx.frame.size} photo={Boolean(ctx.photo)}>
        {ctx.photo ? <img src={ctx.photo} alt={ctx.t.selectedPhotoAlt} onLoad={ctx.frame.onPhotoLoad} /> : <>
          <LiveVideo bind={ctx.videoRef} />
          {counting && <div className="pf-count" role="timer"><span>{ctx.countdown}</span></div>}
          {!ctx.camReady && !ctx.camError && <div className="pf-cam-state" role="status"><LoaderCircle className="pf-spin" size={36} strokeWidth={1.4} aria-hidden="true" /></div>}
          {ctx.camError && <div className="pf-cam-state" data-error="true" role="alert"><b>{ctx.p.camFailTitle}</b><p>{ctx.t.callStaff}</p></div>}
        </>}
      </CamSlot>
      <div className="hd-row">
        {ctx.photo ? <>
          <button type="button" className="hd-ok" data-ghost onClick={ctx.retake}><RotateCcw size={18} aria-hidden="true" />다시 찍기</button>
          <button type="button" className="hd-ok" onClick={onDone}>이 사진으로</button>
        </> : (
          <button type="button" className="hd-ok" disabled={counting || !ctx.camReady || Boolean(ctx.camError)} onClick={ctx.shoot}><Camera size={20} aria-hidden="true" />{counting ? '찍는 중' : '촬영하기'}</button>
        )}
      </div>
    </div>
  )
}

/** 부티크 — 엔딩 표 · 기존 결과 화면(나의 향 · 프로필 · 해석 · 레시피 출력) · 영수증 */
function ResultBox({ ctx, title, love }: { ctx: PerfumerCtx; title: string; love: number }) {
  const [tab, setTab] = useState(0)
  const phase = receiptPhaseOf(ctx)
  return (
    <div className="hd-panel hd-result">
      <p className="hd-ending">ENDING · {title} <span>♥ {love}</span></p>
      {phase ? <ReceiptScreen ctx={ctx} phase={phase} /> : <ResultScreen ctx={ctx} tab={tab} onTab={setTab} />}
    </div>
  )
}
