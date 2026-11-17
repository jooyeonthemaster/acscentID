'use client'
/* eslint-disable @next/next/no-img-element -- 장면 그림 · 방금 찍은 data: 사진(최적화할 원격 그림이 아니다) */

// SIP! 연말 시상식 AI 소믈리에(studio-sommelier-nh) — 1인칭 미연시(비주얼 노벨) 게임(2026-11-17 사용자 지시: 실제 캐릭터, POV 게임, 3D 작화).
// 길잡이 「해나」(오리지널 소믈리에 캐릭터, public/assets/kiosk-expansion/nh-sip)가 포도밭 입구 → 포도밭 → 수확 → 와이너리 → 저장고 → 시음실로 안내한다.
//   타이틀(터치하여 시작) → 인사 → 기념사진(폴라로이드, 건너뛸 수 있음) → 단맛 · 산미 · 바디(선택지 셋씩) → 종류 → AI(저장고) → 와인 획득 연출 → 결과(인쇄 · 휴대폰)
// 장소를 옮길 때 지금 장면이 앞으로 다가오며(걸어 들어가며) 사라지고 다음 장면이 떠오른다. 대사는 한 줄씩 타자처럼, 다 찍히면 선택지가 뜬다.
// 추천 구조는 그대로 — 규칙이 후보 4병(nh-sommelier.ts) → AI 가 한 병. 맛 선택지는 1 · 3 · 5 점으로 넣는다.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, ChevronRight, Home, MapPin } from 'lucide-react'
import { applyAiAnalysis } from '@/lib/kiosk/expansion/ai'
import { PHOTO_PLANS, readingLine, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import { findNhWine, NH_DEFAULT_ANSWERS, NH_KINDS, nhCandidateSummary, recommendNhWine, type NhAnswers, type NhBundle, type PourCounts } from '@/lib/kiosk/expansion/nh-sommelier'
import { KX_IDLE, KxCamView, useKx, useKxCamera, useKxScreen } from '../kx'
import { preloadVision } from '../kx-vision'
import { useAiJob } from './ai-client'
import { readPhoto } from './read-photo'
import { TakeActions } from './shared'
import { useWineDrop, WineBottle, WineGlass } from './nh-wine-art'

const ID = 'sommelier-nh' as const
const ART = '/assets/kiosk-expansion/nh-sip'
type Scene = 'gate' | 'vineyard' | 'harvest' | 'winery' | 'cellar' | 'tasting'
const PLACE: Record<Scene, string> = { gate: '포도밭 입구', vineyard: '포도밭', harvest: '수확하는 언덕', winery: '와이너리', cellar: '오크통 저장고', tasting: '시음실' }

type Step = 'title' | 'hello' | 'photo-ask' | 'camera' | 'photo-done' | 'sweet' | 'acid' | 'body' | 'kind' | 'cellar' | 'oops' | 'reveal' | 'result'
const SCENE_OF: Record<Step, Scene> = { title: 'gate', hello: 'gate', 'photo-ask': 'vineyard', camera: 'vineyard', 'photo-done': 'vineyard', sweet: 'harvest', acid: 'harvest', body: 'harvest', kind: 'winery', cellar: 'cellar', oops: 'cellar', reveal: 'tasting', result: 'tasting' }
const LINE: Partial<Record<Step, string>> = {
  hello: '어서 오세요! 오늘 밤 당신의 한 잔을 찾아 드릴 소믈리에 해나예요.',
  'photo-ask': '여기서 기념사진 한 장 남겨 볼까요?',
  'photo-done': '멋지게 나왔어요! 이제 포도를 맛보러 가요.',
  sweet: '잘 익은 포도예요. 단맛은 어느 정도가 좋으세요?',
  acid: '산미는요?',
  body: '입안에 닿는 무게감, 바디는요?',
  kind: '와이너리에 도착했어요. 어떤 와인이 끌리세요?',
  cellar: '저장고에서 딱 맞는 한 병을 찾아볼게요…',
  oops: '앗, 잠깐 길을 잃었어요. 다시 찾아볼까요?',
}
/** 맛 선택지 — 1 · 3 · 5 점 */
const TASTE: Record<'sweet' | 'acid' | 'body', [string, string, string]> = {
  sweet: ['드라이하게', '적당히', '달콤하게'],
  acid: ['부드럽게', '적당히', '상큼하게'],
  body: ['가볍게', '적당히', '묵직하게'],
}

const countsKey = () => `nh-sommelier-pours:${new Date().toLocaleDateString('sv-SE')}`
function readCounts(): PourCounts { try { return JSON.parse(localStorage.getItem(countsKey()) ?? '{}') as PourCounts } catch { return {} } }
function addCount(no: number) { try { const c = readCounts(); c[no] = (c[no] ?? 0) + 1; localStorage.setItem(countsKey(), JSON.stringify(c)) } catch { /* 세지 않는다 */ } }

/** 한 줄 타자 — 누르면 바로 다 보인다 */
function useTyped(text: string) {
  const [n, setN] = useState(0)
  // 대사창은 줄마다 key 로 새로 만들어지므로 처음 0 에서 시작한다
  useEffect(() => {
    if (!text) return
    const t = window.setInterval(() => setN((v) => { if (v >= text.length) { window.clearInterval(t); return v } return v + 1 }), 38)
    return () => window.clearInterval(t)
  }, [text])
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length) }
}

/** 장면 — 바뀌면 이전 장면이 앞으로 다가오며(걸어 들어가며) 사라지고 새 장면이 떠오른다. 머무는 동안은 아주 천천히 숨 쉬듯 */
function SceneLayer({ scene }: { scene: Scene }) {
  const [shown, setShown] = useState<{ now: Scene; prev: Scene | null; n: number }>({ now: scene, prev: null, n: 0 })
  // 장면이 바뀐 그 렌더에서 바로 이전 장면을 기억한다(React 의 '이전 값' 방식)
  if (shown.now !== scene) setShown({ now: scene, prev: shown.now, n: shown.n + 1 })
  return <div className="vn-scene" aria-hidden="true">
    {shown.prev && <img key={`p${shown.n}`} className="vn-bg vn-bg--out" src={`${ART}/${shown.prev}.webp`} alt="" />}
    <img key={`n${shown.n}`} className="vn-bg vn-bg--in" data-first={shown.n === 0 || undefined} src={`${ART}/${shown.now}.webp`} alt="" />
  </div>
}

export default function SommelierNhMode() {
  const { home } = useKx()
  const [step, setStep] = useState<Step>('title')
  const [answers, setAnswers] = useState<NhAnswers>(NH_DEFAULT_ANSWERS)
  const [shot, setShot] = useState<string | null>(null)
  const reading = useRef<Promise<PhotoReading | null> | null>(null)
  const [bundle, setBundle] = useState<NhBundle | null>(null)
  const [askHome, setAskHome] = useState(false)
  const ai = useAiJob()
  const drop = useWineDrop()
  const counted = useRef<string | null>(null)
  const scene = SCENE_OF[step]

  // 무입력 시간 — 타이틀은 처음 화면, 저장고는 기다림, 결과는 길게
  useKxScreen(step === 'title' ? 'start' : step === 'cellar' || step === 'reveal' ? 'busy' : step === 'result' ? KX_IDLE.result : step === 'camera' ? KX_IDLE.camera : KX_IDLE.step)
  // 그림 · 사진 도구를 미리
  useEffect(() => {
    for (const s of Object.keys(PLACE)) { const i = new Image(); i.src = `${ART}/${s}.webp` }
    const stops = [preloadVision('faces'), preloadVision('hair')]
    return () => stops.forEach((s) => s())
  }, [])

  const done = ai.state.phase === 'done' ? ai.state : null
  const pick = done?.analysis?.pick ?? null
  const list = bundle ? [bundle.primary, ...bundle.alternatives] : []
  const chosen = list.find((c) => c.id === pick) ?? list[0]
  const result = chosen && done?.analysis && chosen.id === pick ? applyAiAnalysis(chosen, done.analysis) : chosen

  const run = useCallback((made: NhBundle, read: PhotoReading | null) => {
    const candidates = [made.primary, ...made.alternatives].map((r) => ({ id: r.id, title: r.title, summary: nhCandidateSummary(findNhWine(r.id)!) }))
    void ai.run({ analysis: { id: ID, photo: shot, facts: read ? readingLine(read, PHOTO_PLANS[ID]) : '', answers: made.answers, candidates, context: '' } })
      .then((finished) => setStep(finished ? 'reveal' : 'oops'))
  }, [ai, shot])
  const find = async (kind: NhAnswers['kind']) => {
    const next = { ...answers, kind }
    setAnswers(next); setStep('cellar')
    const read = reading.current ? await Promise.race([reading.current, new Promise<null>((ok) => setTimeout(() => ok(null), 4000))]) : null
    const made = recommendNhWine(next, read, readCounts())
    setBundle(made); counted.current = null
    run(made, read)
  }
  useEffect(() => { if (step !== 'reveal') return; const t = window.setTimeout(() => setStep('result'), 2600); return () => window.clearTimeout(t) }, [step])
  useEffect(() => {
    if (step !== 'result' || !result?.pour || counted.current === result.id) return
    counted.current = result.id; addCount(result.pour.no)
  }, [step, result])

  const took = (photo: string | null) => {
    setShot(photo)
    reading.current = photo ? readPhoto(photo, PHOTO_PLANS[ID]).catch(() => null) : null
    setStep(photo ? 'photo-done' : 'sweet')
  }
  const taste = (key: 'sweet' | 'acid' | 'body', i: number) => {
    setAnswers((a) => ({ ...a, [key]: [1, 3, 5][i] }))
    setStep(key === 'sweet' ? 'acid' : key === 'acid' ? 'body' : 'kind')
  }

  let choices: ReactNode = null
  if (step === 'hello') choices = <Choice onClick={() => setStep('photo-ask')}>따라가기</Choice>
  else if (step === 'photo-ask') choices = <><Choice icon={<Camera size={22} />} onClick={() => setStep('camera')}>찍을래요</Choice><Choice onClick={() => took(null)}>다음에요</Choice></>
  else if (step === 'photo-done') choices = <Choice onClick={() => setStep('sweet')}>포도밭 안으로</Choice>
  else if (step === 'sweet' || step === 'acid' || step === 'body') { const k = step; choices = TASTE[k].map((label, i) => <Choice key={label} onClick={() => taste(k, i)}>{label}</Choice>) }
  else if (step === 'kind') choices = <div className="vn-kinds">{NH_KINDS.map((k) => <button key={k.id} type="button" className="vn-kind" onClick={() => void find(k.id)}><WineGlass kind={k.id} on size={30} /><b>{k.label}</b></button>)}</div>
  else if (step === 'oops') choices = <><Choice onClick={() => { if (bundle) { setStep('cellar'); run(bundle, null) } }}>다시 찾기</Choice><Choice onClick={() => { ai.skip(); setStep('reveal') }}>규칙대로 추천받기</Choice></>

  return <div className="vn" onPointerDown={drop}>
    <SceneLayer scene={scene} />
    {step === 'title'
      ? <button type="button" className="vn-title" onClick={() => setStep('hello')} aria-label="터치하여 시작">
        <span className="vn-logo">SIP!</span>
        <span className="vn-sub">포도밭에서 와이너리까지 · 오늘의 한 잔</span>
        <span className="vn-press">터치하여 시작</span>
      </button>
      : <>
        <header className="vn-hud">
          <button type="button" className="vn-hud-btn" onClick={() => setAskHome(true)} aria-label="처음으로"><Home size={20} /></button>
          <span key={scene} className="vn-place"><MapPin size={15} />{PLACE[scene]}</span>
          <span className="vn-hud-mark">SIP!</span>
        </header>
        {step === 'camera' && <Polaroid onShot={took} onCancel={() => took(null)} />}
        {step === 'reveal' && result?.pour && <WineCard pour={result.pour} big />}
        {step === 'result' && result
          ? <Dialogue key={`r${result.id}`} lead={result.pour && <WineCard pour={result.pour} big={false} />} text={`${(done?.analysis?.headline ?? '오늘 밤 당신을 위한 한 잔이에요').replace(/[.!?。…\s]+$/, '')}. 번호를 직원에게 보여 주세요!`}>
            <div className="vn-menu"><TakeActions result={result} /><Choice onClick={() => setAskHome(true)}>처음으로</Choice></div>
          </Dialogue>
          : LINE[step] && step !== 'camera' && <Dialogue key={step} text={LINE[step]!} busy={step === 'cellar'}>{choices}</Dialogue>}
      </>}
    {askHome && <div className="vn-confirm" role="dialog" aria-modal="true" aria-label="처음으로 돌아갈까요?">
      <div><p>처음으로 돌아갈까요?</p><Choice onClick={() => setAskHome(false)}>계속하기</Choice><Choice onClick={home}>처음으로</Choice></div>
    </div>}
  </div>
}

/** 대사창 — 이름표 · 한 줄 타자 · 다 찍히면 선택지(위로 떠오른다) */
function Dialogue({ text, busy, lead, children }: { text: string; busy?: boolean; /** 늘 보이는 위쪽(결과의 와인 카드) */ lead?: ReactNode; children?: ReactNode }) {
  const { shown, done, finish } = useTyped(text)
  return <div className="vn-talk">
    {lead}
    {done && children && <div className="vn-choices">{children}</div>}
    <div className="vn-box" onClick={finish} role="status" aria-live="polite" aria-label={text}>
      <p className="vn-name">해나 <small>소믈리에</small></p>
      <p className="vn-line" aria-hidden="true">{shown}{busy && done && <span className="vn-dots"><i /><i /><i /></span>}</p>
      {done && !busy && <span className="vn-next" aria-hidden="true">▼</span>}
    </div>
  </div>
}

function Choice({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon?: ReactNode }) {
  return <button type="button" className="vn-choice" onClick={onClick}><span className="vn-choice-mark" aria-hidden="true">◆</span>{icon}<b>{children}</b><ChevronRight size={20} className="vn-choice-go" aria-hidden="true" /></button>
}

/** 기념사진 — 폴라로이드 안의 카메라. 준비되면 3초 뒤 저절로 찍힌다 */
function Polaroid({ onShot, onCancel }: { onShot: (photo: string) => void; onCancel: () => void }) {
  const cam = useKxCamera(true)
  const fired = useRef(false)
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => {
    if (cam.state !== 'ready' || fired.current) return
    fired.current = true
    cam.shoot((p) => { setPhoto(p); window.setTimeout(() => onShot(p), 1300) })
  }, [cam, onShot])
  return <div className="vn-polaroid" data-done={photo ? '' : undefined}>
    <div className="vn-polaroid-card">
      <div className="ex-camera-view vn-polaroid-shot">{photo ? <img src={photo} alt="방금 찍은 사진" /> : <KxCamView cam={cam}><div className="ex-face-guide" aria-hidden="true" /></KxCamView>}</div>
      <p>{photo ? '찰칵!' : cam.countdown !== null ? cam.countdown : cam.state === 'error' ? '카메라를 확인해 주세요' : '준비…'}</p>
    </div>
    {!photo && <button type="button" className="vn-skip" onClick={onCancel}>건너뛰기</button>}
  </div>
}

/** 와인 획득 — 빛이 돌며 카드가 떠오르고(reveal), 결과에서는 위로 올라가 작게 남는다 */
function WineCard({ pour, big }: { pour: NonNullable<ReturnType<typeof applyAiAnalysis>['pour']>; big: boolean }) {
  return <div className="vn-get" data-big={big || undefined}>
    {big && <i className="vn-rays" aria-hidden="true" />}
    <section className="vn-card" aria-label={`오늘의 한 잔 ${pour.no}번 ${pour.name}`}>
      <p className="vn-card-kicker">오늘의 한 잔</p>
      <div className="vn-card-main">
        <b className="vn-card-no"><small>No.</small>{pour.no}</b>
        <div><h2>{pour.name}</h2><p>{pour.en}</p><span>{pour.kind}</span></div>
        <WineBottle color={pour.color} />
      </div>
    </section>
  </div>
}
