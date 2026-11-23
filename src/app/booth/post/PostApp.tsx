'use client'

// POST! 우체통 포토부스 — 기기 화면 (1280×720 가로, 모니터에 맞춰 키움)
//
// 화면이 곧 우체통 「한통」의 얼굴: 눈은 화면 정가운데에 고정되고, 좌우 가장자리에서 남색 소매 · 흰 장갑 손이 들어와
// 사진 · 우표 · 엽서 · QR · 받는 사람 태그를 들어 보여 준다. 버튼은 없다 — 오른쪽 옆면 「귀」 마이크에 속삭이면 듣고,
// 엽서는 화면에서 위로 밀어 넣는다.
//
// 흐름: 대기 → 받는 사람 → 휴대폰 연결(QR, 건너뛰기) → 사진(그림엽서 + 얼굴 우표) → 귀에 속삭이기 → 받아 적음
//      → 위로 밀어 넣기 → 우체통 배 속 우편 처리(인쇄 시간) → 받기 + 휴대폰 배달 → 인사
// 시즌 레이어(?season=xmas): 눈썹 위 눈 · 호랑가시 · 눈발 · 초록 보조색 · 산타 받는 사람 · 북극 답장 흐름.
// 시연: ?demo=to|phone|cam|shot|say|pick|heard|post|north|reply|out|bye — 그 장면으로 바로(견본 사진 · 편지).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { domToJpeg } from 'modern-screenshot'
import { useCamera } from '../programs/use-camera'
import { getBoothShell } from '@/lib/photobooth/booth-shell'
import { preloadFaceDetect } from '@/lib/booth/face-detect'
import { Postcard, type PostcardData } from './Postcard'
import { blackHan, gowun, pen, yesteryear } from './fonts'
import { SEASONS, splitLines, type Recipient, type Season } from './content'
import { audioReady, onLevel, say, sfx, stopVoice, unlockAudio } from './sound'
import { openEar, type Ear } from './record'
import { makePhotos } from './photo'
import { Eyes, type Expression } from './Eyes'
import { Arm, Side, type Pose } from './Arms'
import LINES from './lines.json'

// 3D 광장 데모(neander-booth-idea)의 iframe 안에서 돌 때 — 장면 · 카운트 · 찰칵 · 인화를 바깥에 알려 1인칭 시점을 움직이게 한다.
// frame-ancestors(next.config)로 띄울 수 있는 곳이 정해져 있어 '*' 로 보낸다.
const inFrame = () => typeof window !== 'undefined' && window.parent !== window
const toParent = (msg: Record<string, unknown>) => { if (inFrame()) window.parent.postMessage(msg, '*') }

type Scene = 'idle' | 'to' | 'phone' | 'cam' | 'shot' | 'say' | 'pick' | 'heard' | 'post' | 'proc' | 'out' | 'bye'
// 넣은 뒤 — 기본은 바로 받기(out). 산타에게 보낼 때만 북극 → 답장 장면(proc)을 거친다(11-23 사용자: 접수 · 소인 · 분류 · 배달 준비 없앰).
type ProcStep = 'north' | 'reply'

const TEXT = LINES as Record<string, string>
const capText = (id: string) => (TEXT[id] ?? '').replace(/\[[^\]]*\]\s*/g, '')
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const STEPS: { label: string; scenes: Scene[] }[] = [
  { label: '받는 사람', scenes: ['to', 'phone'] },
  { label: '사진', scenes: ['cam', 'shot'] },
  { label: '편지', scenes: ['say', 'pick', 'heard'] },
  { label: '넣기', scenes: ['post', 'proc'] },
  { label: '배달', scenes: ['out', 'bye'] },
]
const NUDGE: Partial<Record<Scene, string>> = { to: 'to_ask', phone: 'phone_skip', say: 'say_shy', heard: 'say_check', post: 'post_ask' }

function useStageScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

function stampTime(now: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return { date: `${now.getFullYear()}.${p(now.getMonth() + 1)}.${p(now.getDate())}`, time: `${p(now.getHours())}:${p(now.getMinutes())}`, zip: `${p(now.getMonth() + 1)}${p(now.getDate())}0` }
}

/** 무대 좌표 한 점(x,y)에 물건의 기준점(ax,ay — 비율)을 맞춰 놓는다 */
function at(x: number, y: number, w: number, h: number, ax: number, ay: number, rot = 0): CSSProperties {
  return { position: 'absolute', left: x - ax * w, top: y - ay * h, width: w, height: h, transform: `rotate(${rot}deg)`, transformOrigin: `${ax * 100}% ${ay * 100}%` }
}

/** 엽서 뒷면만(편지 · 우표 · 소인) */
function PostcardBack({ data, width }: { data: PostcardData; width: number }) {
  const s = width / 1200
  return (
    <div className="po-back" style={{ width, height: 720 * s }}>
      <div style={{ position: 'absolute', left: 0, top: -1080 * s }}><Postcard data={data} scale={s} /></div>
    </div>
  )
}

/** 그림엽서 앞면(사진 + Greetings from) */
function FrontCard({ photo, script, place, style }: { photo: string | null; script: string; place: string; style: CSSProperties }) {
  return (
    <div className="po-front" style={style}>
      <div className="po-front-in" style={{ backgroundImage: photo ? `url(${photo})` : undefined }}>
        <div className="po-front-cap"><div>{script}</div><b>{place}</b></div>
      </div>
    </div>
  )
}

function Stamp({ src, value, style }: { src: string | null; value: string; style: CSSProperties }) {
  return (
    <div style={style}>
      <div className="pc-stamp po-stamp-held"><div className="pc-stamp-in" style={{ backgroundImage: src ? `url(${src})` : undefined }}><div className="pc-stamp-v">{value}</div></div></div>
    </div>
  )
}

export function PostApp({ season = 'base', place = '우리 동네', demo = null }: { season?: Season; place?: string; demo?: string | null }) {
  const S = SEASONS[season]
  const scale = useStageScale()
  const [scene, setScene] = useState<Scene>('idle')
  const [caption, setCaption] = useState<string | null>(null)
  const [led, setLed] = useState(0)
  const [listening, setListening] = useState(false)

  const [to, setTo] = useState<Recipient | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phoneUrl, setPhoneUrl] = useState<string | null>(null)
  const [qrScreen, setQrScreen] = useState<string | null>(null)
  const [qrCard, setQrCard] = useState<string | null>(null)
  const [joined, setJoined] = useState(false)

  const [photo, setPhoto] = useState<{ front: string; stamp: string } | null>(null)
  const [retakes, setRetakes] = useState(0)
  const [count, setCount] = useState<string | null>(null)
  const [flash, setFlash] = useState(0)

  const [letter, setLetter] = useState<{ lines: string[]; text: string; from: string } | null>(null)
  const [wav, setWav] = useState<string | null>(null)
  const [typed, setTyped] = useState<number | undefined>(undefined)
  const [mic, setMic] = useState(0)
  const [hearing, setHearing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const [santa, setSanta] = useState<{ lines: string[]; long: string } | null>(null)
  const [posting, setPosting] = useState(false)
  const [drag, setDrag] = useState(0)
  const [proc, setProc] = useState<ProcStep>('north')
  const jobRef = useRef<Promise<void> | null>(null)
  const [printed, setPrinted] = useState<'none' | 'sent' | 'browser' | 'failed'>('none')
  const [cardId, setCardId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  const flow = useRef(0)
  const lastTouch = useRef(Date.now())
  const nudged = useRef(false)
  const ear = useRef<Ear | null>(null)
  const stopListen = useRef<(() => void) | null>(null)
  const captureRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<Scene>('idle')
  sceneRef.current = scene

  const cam = useCamera({ enabled: scene === 'cam' })
  const isSanta = to?.key === 'santa'

  // 미리보기가 멈춰 있으면(사파리 iframe 은 자동 재생을 막기도 함) — 다음 터치에 다시 틀고, 그래도 안 되면 「눌러서 카메라 켜기」 + 상태 한 줄
  const [camStuck, setCamStuck] = useState<string | null>(null)
  const kickVideo = useCallback(() => {
    const v = cam.videoRef.current
    if (v && v.srcObject && (v.paused || v.videoWidth === 0)) void v.play().catch(() => undefined)
  }, [cam.videoRef])
  useEffect(() => {
    if (scene !== 'cam' || cam.state !== 'ready' || cam.source !== 'webcam') { setCamStuck(null); return }
    let n = 0
    const t = window.setInterval(() => {
      const v = cam.videoRef.current
      const tr = (v?.srcObject as MediaStream | null)?.getVideoTracks()[0]
      const bad = !v || v.paused || v.videoWidth === 0 || v.readyState < 2
      if (!bad) { setCamStuck(null); n = 0; return }
      if (++n < 3) { kickVideo(); return }
      setCamStuck(`${v ? (v.paused ? '정지' : '재생') : '영상 없음'} · 준비 ${v?.readyState ?? '-'} · ${v?.videoWidth ?? 0}×${v?.videoHeight ?? 0} · 트랙 ${tr ? `${tr.readyState}${tr.muted ? ' 음소거' : ''}${tr.enabled ? '' : ' 꺼짐'}` : '없음'}`)
    }, 500)
    return () => window.clearInterval(t)
  }, [scene, cam.state, cam.source, cam.videoRef, kickVideo])

  // ───────── 말하기 · 빛 ─────────
  useEffect(() => onLevel(setLed), [])
  const speak = useCallback((id: string) => say(id, (x) => setCaption(capText(x))), [])
  const speakSeq = useCallback(async (ids: string[], token = flow.current) => {
    for (const id of ids) {
      if (token !== flow.current) return
      await speak(id)
    }
  }, [speak])

  const go = useCallback((next: Scene) => {
    flow.current += 1
    lastTouch.current = Date.now()
    nudged.current = false
    setHint(null)
    setScene(next)
    return flow.current
  }, [])
  const poke = useCallback(() => { lastTouch.current = Date.now(); nudged.current = false }, [])

  const stopEar = useCallback(() => {
    stopListen.current?.()
    stopListen.current = null
    setListening(false)
    setHearing(false)
  }, [])

  const reset = useCallback(() => {
    stopVoice()
    stopEar()
    go('idle')
    setCaption(null)
    setTo(null); setSessionId(null); setPhoneUrl(null); setQrScreen(null); setQrCard(null); setJoined(false)
    setPhoto(null); setRetakes(0); setCount(null)
    setLetter(null); setWav(null); setTyped(undefined); setBusy(null)
    setSanta(null); setPosting(false); setDrag(0); setProc('north'); setPrinted('none'); setCardId(null)
    ear.current?.close(); ear.current = null
  }, [go, stopEar])

  // ───────── 대기 ─────────
  useEffect(() => {
    if (scene !== 'idle') return
    let i = 0
    const t = window.setInterval(() => {
      if (!audioReady()) return
      void speak(S.idleLines[i++ % S.idleLines.length])
    }, 22000)
    return () => window.clearInterval(t)
  }, [scene, S.idleLines, speak])

  const openSession = useCallback(async () => {
    try {
      const { id } = await (await fetch('/api/post/session', { method: 'POST' })).json()
      let base = window.location.origin
      if (/^(localhost|127\.)/.test(window.location.hostname)) {
        const { ip } = await (await fetch('/api/post/lan')).json().catch(() => ({ ip: null }))
        if (ip) base = `${window.location.protocol}//${ip}:${window.location.port}`
      }
      const url = `${base}/booth/post/m/${id}`
      setSessionId(id)
      setPhoneUrl(url)
      setQrScreen(await QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: '#1d2540', light: '#ffffff' } }))
      setQrCard(await QRCode.toDataURL(url, { margin: 0, width: 224, color: { dark: '#1d2540', light: '#0000' } }))
    } catch {
      setSessionId(null)
    }
  }, [])

  const start = useCallback(async () => {
    unlockAudio()
    preloadFaceDetect()
    setNow(new Date())
    void openSession()
    // 크리스마스판은 받는 사람 고르기 없이 산타에게 — 바로 휴대폰 연결로
    if (season === 'xmas') {
      setTo(S.recipients[0])
      const token = go('phone')
      void speakSeq(['start_santa', 'phone_ask'], token)
      return
    }
    const token = go('to')
    void speakSeq(['to_ask'], token)
  }, [go, speakSeq, openSession, season, S])

  useEffect(() => {
    if (!sessionId || scene === 'idle' || joined) return
    const t = window.setInterval(async () => {
      const r = await fetch(`/api/post/session/${sessionId}`).then((x) => x.json()).catch(() => null)
      if (r?.joined) setJoined(true)
    }, 1500)
    return () => window.clearInterval(t)
  }, [sessionId, scene, joined])

  // ───────── 받는 사람 ─────────
  const pickTo = useCallback((r: Recipient) => {
    sfx.tap()
    setTo(r)
    const token = go('phone')
    const first = r.key === 'santa' ? ['to_santa'] : r.key === 'me' ? ['to_me'] : []
    void speakSeq([...first, 'phone_ask'], token)
  }, [go, speakSeq])

  // ───────── 사진 ─────────
  const camRef = useRef(cam.state)
  camRef.current = cam.state
  const camVideo = cam.videoRef
  const camSrc = useRef(cam.source)
  camSrc.current = cam.source
  const stillRef = useRef(cam.still)
  stillRef.current = cam.still

  async function runShot(token: number, intro: boolean, faceRetry = false) {
    if (intro) await speakSeq(['cam_ask'], token)
    else await wait(900)
    // 카메라가 준비되고 미리보기가 실제로 흐를 때까지(멈춰 있으면 손님이 눌러 켤 수 있게 최대 30초)
    for (let i = 0; i < 200 && token === flow.current; i++) {
      const v = camVideo.current
      if (camRef.current === 'ready' && (camSrc.current === 'dslr' || (v && v.videoWidth > 0 && !v.paused))) break
      await wait(150)
    }
    if (token !== flow.current) return
    void speak('count')
    toParent({ type: 'post:count' })
    for (const n of ['3', '2', '1']) {
      if (token !== flow.current) return
      setCount(n)
      await wait(620)
    }
    setCount(null)
    sfx.shutter()
    setFlash((f) => f + 1)
    toParent({ type: 'post:flash' })
    let shot: HTMLCanvasElement
    try { shot = await stillRef.current() } catch { return }
    const result = await makePhotos(shot)
    if (token !== flow.current) return
    if (result.faces === 0 && !faceRetry) {
      await speakSeq(['cam_noface'], token)
      return runShot(token, false, true)
    }
    setPhoto({ front: result.front, stamp: result.stamp })
    const t2 = go('shot')
    void speakSeq(['cam_done'], t2)
  }

  const goCam = (after?: string) => {
    const token = go('cam')
    void (async () => {
      if (after) await speakSeq([after], token)
      if (token === flow.current) void runShot(token, true)
    })()
  }
  const goCamRef = useRef(goCam)
  goCamRef.current = goCam

  useEffect(() => {
    if (scene === 'phone' && joined) {
      stopVoice()
      goCamRef.current('phone_ok')
    }
  }, [scene, joined])

  const retake = () => {
    sfx.tap()
    setRetakes((n) => n + 1)
    const token = go('cam')
    void runShot(token, false)
  }

  // ───────── 귀에 속삭이기 ─────────
  const listenOnce = async (token: number) => {
    if (!ear.current) {
      try { ear.current = await openEar() } catch { setHint('마이크를 켜지 못했어요. 문장 고르기로 써 주세요.'); return }
    }
    if (token !== flow.current) return
    setListening(true)
    stopListen.current = ear.current.listen({
      onSpeechStart: () => { stopVoice(); setHearing(true); poke() },
      onEnd: (res) => {
        stopListen.current = null
        setListening(false)
        setHearing(false)
        if (res && token === flow.current) void handleHeard(res.wav, token)
      },
    })
  }

  const goSay = (speakPrompt = true) => {
    stopEar()
    const token = go('say')
    void (async () => {
      if (speakPrompt && to) await speakSeq([to.sayLine, 'ear'], token)
      if (token === flow.current) void listenOnce(token)
    })()
  }

  async function handleHeard(wavB64: string, token: number) {
    setBusy('받아 적는 중…')
    const res = await fetch('/api/post/letter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wav: wavB64, toLine: to?.toLine, santa: to?.key === 'santa' }),
    }).then((r) => r.json()).catch(() => null)
    setBusy(null)
    if (token !== flow.current) return
    if (!res || res.error || !res.heard) { await speakSeq(['say_deaf'], token); if (token === flow.current) void listenOnce(token); return }
    if (res.blocked) { await speakSeq(['say_bad'], token); if (token === flow.current) void listenOnce(token); return }
    setLetter({ lines: res.lines, text: res.text, from: res.from })
    setWav(wavB64)
    showHeard()
  }

  // 마이크 크기(귀 쪽 소리 물결)
  useEffect(() => {
    if (scene !== 'say') return
    let raf = 0
    const tick = () => { setMic(ear.current?.level() ?? 0); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scene])

  function showHeard() {
    const token = go('heard')
    setTyped(0)
    void speakSeq(['say_check'], token)
  }
  useEffect(() => {
    if (scene !== 'heard' || typed === undefined || !letter) return
    const total = letter.lines.join('').length
    if (typed >= total) return
    const t = window.setTimeout(() => setTyped((n) => (n ?? 0) + 1), 55)
    return () => window.clearTimeout(t)
  }, [scene, typed, letter])

  const pickPhrase = (p: string) => {
    sfx.tap()
    stopEar()
    setLetter({ lines: splitLines(p), text: p, from: '' })
    setWav(null)
    showHeard()
  }

  // ───────── 엽서 ─────────
  const cardData: PostcardData = useMemo(() => {
    const st = stampTime(now)
    const from = letter?.from ?? ''
    if (isSanta && santa) {
      return {
        photo: photo?.front ?? null, stamp: photo?.stamp ?? null, accent: S.accent,
        capScript: 'A Letter from', capBig: '북극',
        toLine: from ? `${from}에게` : '착한 어린이에게', letter: santa.lines, fromLine: '북극에서 산타 할아버지가',
        quote: letter ? `보낸 편지 — “${letter.text}”` : undefined,
        stampValue: '소원 1통', pmTop: '북극 · 산타 마을', pmBottom: 'SANTA EXPRESS', pmDate: st.date, pmTime: st.time,
        toShort: from || '어린이', fromShort: '산타', zip: st.zip, qr: qrCard, qrText: '산타의 긴 편지\n읽어 보기',
      }
    }
    return {
      photo: photo?.front ?? null, stamp: photo?.stamp ?? null, accent: S.accent,
      capScript: S.capScript, capBig: place,
      toLine: to?.toLine ?? '', letter: letter?.lines ?? [], fromLine: from ? `${from} 올림` : '',
      stampValue: S.stampValue, pmTop: S.pmTop(place), pmBottom: S.pmBottom, pmDate: st.date, pmTime: st.time,
      toShort: to?.toShort ?? '', fromShort: from, zip: st.zip, qr: qrCard, qrText: '휴대폰으로\n배달하기',
      typed: scene === 'heard' ? typed : undefined,
    }
  }, [now, letter, isSanta, santa, photo, S, place, to, qrCard, scene, typed])
  const cardDataRef = useRef(cardData)
  cardDataRef.current = cardData
  const joinedRef = useRef(joined)
  joinedRef.current = joined

  // ───────── 넣기 — 엽서를 위로 밀기 ─────────
  const doPost = () => {
    if (sceneRef.current !== 'post' || posting) return
    poke()
    stopVoice()
    setPosting(true)
    window.setTimeout(() => sfx.drop(), 650)
    window.setTimeout(() => {
      setProc('north')
      const token = go(isSanta ? 'proc' : 'out')
      void runProc(token)
    }, 1100)
  }
  const doPostRef = useRef(doPost)
  doPostRef.current = doPost
  const dragFrom = useRef<number | null>(null)
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => { dragFrom.current = e.clientY; (e.target as HTMLElement).setPointerCapture?.(e.pointerId) },
    onPointerMove: (e: React.PointerEvent) => { if (dragFrom.current !== null) setDrag(Math.min(0, (e.clientY - dragFrom.current) / scale)) },
    onPointerUp: () => { if (dragFrom.current === null) return; dragFrom.current = null; if (drag < -70) doPostRef.current(); else setDrag(0) },
  }

  async function makeCard(): Promise<string | null> {
    await document.fonts.ready
    await wait(80)
    const node = captureRef.current?.querySelector('.pc') as HTMLElement | null
    if (!node) return null
    return domToJpeg(node, { width: 1200, height: 1800, quality: 0.92, scale: 1, backgroundColor: '#fbf6ec' })
  }

  async function runProc(token: number) {
    const id = Math.random().toString(36).slice(2, 14).padEnd(12, '0')
    let santaDone = !isSanta
    let reply: { lines: string[]; long: string } | null = null
    const job = (async () => {
      if (isSanta) {
        const r = await fetch('/api/post/santa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wish: letter?.text || letter?.lines.join(' '), name: letter?.from }) })
          .then((x) => x.json()).catch(() => null)
        reply = r?.lines?.length ? { lines: r.lines, long: r.long } : { lines: ['편지 잘 받았단다!', '네 마음이 북극까지', '따뜻하게 전해졌구나', '메리 크리스마스!'], long: '' }
        setSanta(reply)
        santaDone = true
        await wait(120)
      }
      const jpg = await makeCard().catch(() => null)
      if (!jpg) return
      const shell = getBoothShell()
      if (shell) {
        const r = await shell.print(jpg).catch(() => ({ ok: false }))
        setPrinted(r.ok ? 'sent' : 'failed')
      } else if (inFrame()) {
        toParent({ type: 'post:print', jpg }) // 3D 광장에서는 우체통 출구로 진짜 엽서가 나온다
        setPrinted('sent')
      } else setPrinted('browser')
      if (sessionId) {
        await fetch(`/api/post/session/${sessionId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'card', cardJpg: jpg, voiceWav: wav,
            card: {
              id, season, recipient: to?.key, toLine: cardDataRef.current.toLine, fromName: letter?.from ?? '',
              letter: cardDataRef.current.letter, santa: isSanta, wish: isSanta ? letter?.text : undefined, longLetter: (reply as { long: string } | null)?.long || undefined,
            },
          }),
        }).catch(() => null)
        setCardId(id)
      }
    })()
    jobRef.current = job

    // 산타 — 북극으로 보냈다가 답장이 오면 받기로. 인화 · 업로드는 받기 · 인사 중에도 뒤에서 이어진다(finish 가 기다림)
    let t = token
    if (isSanta) {
      await speakSeq(['post_ok'], t)
      if (t !== flow.current) return
      sfx.wind()
      await speakSeq(['proc_north'], t)
      while (!santaDone && t === flow.current) await wait(300)
      if (t !== flow.current) return
      setProc('reply')
      await speakSeq(['proc_reply'], t)
      if (t !== flow.current) return
      t = go('out')
    }
    sfx.print()
    void speakSeq([...(isSanta ? [] : ['post_ok']), isSanta ? 'out_santa' : 'out_take', ...(joinedRef.current ? [] : ['out_noqr'])], t)
  }

  const finish = useCallback(async () => {
    const token = go('bye')
    sfx.bell()
    await speakSeq([season === 'xmas' ? 'bye_xmas' : 'bye'], token)
    await wait(1200)
    await jobRef.current?.catch(() => undefined) // 인화 · 업로드가 끝나야 처음으로
    if (token === flow.current) reset()
  }, [go, speakSeq, reset, season])

  useEffect(() => {
    if (scene !== 'out') return
    const t = window.setTimeout(() => void finish(), 25000)
    return () => window.clearTimeout(t)
  }, [scene, finish])

  // ───────── 시간 초과 ─────────
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = sceneRef.current
      if (!(s in NUDGE) || busy || hearing) return
      const idle = Date.now() - lastTouch.current
      if (idle > 45000) {
        void (async () => { await speak('timeout'); reset() })()
        lastTouch.current = Date.now()
      } else if (idle > 15000 && !nudged.current) {
        nudged.current = true
        void speak(NUDGE[s]!)
      }
    }, 1000)
    return () => window.clearInterval(t)
  }, [busy, hearing, speak, reset])

  useEffect(() => { toParent({ type: 'post:scene', scene }) }, [scene])

  // 3D 광장 데모의 iframe 안에서 돌 때 — Esc 는 바깥(광장)으로 넘겨 체험에서 나가게
  useEffect(() => {
    if (window.parent === window) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') window.parent.postMessage({ type: 'post:escape' }, '*') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 시험 · 시연용 키보드: Enter = 시작, ↑ = 넣기
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && sceneRef.current === 'idle') void start()
      if (e.code === 'ArrowUp') doPostRef.current()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [start])

  useEffect(() => () => { stopListen.current?.(); ear.current?.close(); stopVoice() }, [])

  // ───────── 시연(?demo=장면) — 견본 사진 · 편지로 그 장면을 바로 보여 준다 ─────────
  useEffect(() => {
    if (!demo) return
    void (async () => {
      const kid = season === 'xmas'
      const img = new Image()
      img.src = kid ? '/assets/post/demo/photo_kid.jpg' : '/assets/post/demo/photo.jpg'
      await img.decode().catch(() => undefined)
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      const ph = await makePhotos(c)
      const r = kid ? S.recipients[0] : S.recipients[0]
      setTo(r)
      await openSession()
      const after = ['shot', 'say', 'pick', 'heard', 'post', 'north', 'reply', 'out', 'bye']
      if (after.includes(demo)) setPhoto({ front: ph.front, stamp: ph.stamp })
      if (['heard', 'post', 'north', 'reply', 'out', 'bye'].includes(demo)) {
        setLetter(kid
          ? { lines: ['저 올해 동생이랑', '사이좋게 지냈어요', '레고 경찰서 갖고 싶어요'], text: '저 올해 동생이랑 사이좋게 지냈어요. 레고 경찰서 갖고 싶어요.', from: '민준' }
          : { lines: ['엄마 오늘 같이 놀러 와서', '진짜 좋았어', '맨날 일하느라 힘들지?', '사랑해'], text: '엄마 오늘 같이 놀러 와서 진짜 좋았어. 맨날 일하느라 힘들지? 사랑해.', from: '서윤' })
      }
      if (['reply', 'out', 'bye'].includes(demo) && kid) setSanta({ lines: ['민준아, 편지 고맙구나', '동생과 사이좋게 지냈다니', '정말 대견하단다', '크리스마스 아침을 기대하렴'], long: '' })
      const sceneOf: Record<string, Scene> = { north: 'proc', reply: 'proc' }
      setScene((sceneOf[demo] ?? demo) as Scene)
      if (demo === 'north') setProc('north')
      if (demo === 'reply') setProc('reply')
      if (demo === 'heard') setTyped(999)
      if (demo === 'say') setListening(true)
      setCaption(capText({ to: 'to_ask', phone: 'phone_ask', cam: 'count', shot: 'cam_done', say: 'ear', pick: 'say_shy', heard: 'say_check', post: 'post_ask', north: 'proc_north', reply: 'proc_reply', out: kid ? 'out_santa' : 'out_take', bye: kid ? 'bye_xmas' : 'bye' }[demo] ?? 'idle1'))
    })()
  }, [demo, season, S.recipients, openSession])

  // ───────── 화면 ─────────
  const stepIndex = STEPS.findIndex((s) => s.scenes.includes(scene))
  const expression: Expression = (() => {
    if (busy) return 'read'
    switch (scene) {
      case 'idle': return 'look'
      case 'to': return 'idle'
      case 'phone': return 'glance'
      case 'cam': return 'up'
      case 'shot': return 'happy'
      case 'say': return 'listen'
      case 'pick': return 'read'
      case 'heard': return 'read'
      case 'post': return 'up'
      case 'proc': return proc === 'reply' ? 'surprised' : 'happy'
      case 'out': return isSanta ? 'surprised' : 'down'
      case 'bye': return 'wink'
    }
  })()
  const title = (() => {
    switch (scene) {
      case 'idle': return S.title
      case 'to': return '누구에게 보낼까요?'
      case 'phone': return '배달은 휴대폰으로 해 드려요'
      case 'cam': return '엽서에 들어갈 사진이에요'
      case 'shot': return '우표도 하나 만들었어요'
      case 'say': return isSanta ? '산타 할아버지께 소원을 들려주세요' : `${to?.toShort ?? ''}${to?.key === 'me' ? '에게' : '께'} 하고 싶은 말을 들려주세요`
      case 'pick': return '문장을 골라 주세요'
      case 'heard': return '이렇게 받아 적었어요'
      case 'post': return '엽서를 위로 밀어 넣어 주세요'
      case 'proc': return proc === 'north' ? '자, 북극으로 보냈습니다' : '어, 벌써 답장이 왔네요?'
      case 'out': return isSanta ? '산타 할아버지 답장이에요' : '아래에서 받아 가세요'
      case 'bye': return season === 'xmas' ? '메리 크리스마스!' : '또 들러 주세요'
    }
  })()
  const K = `${scene}-${String(proc)}`

  return (
    <div className={`po-root ${pen.variable} ${blackHan.variable} ${gowun.variable} ${yesteryear.variable}`} onPointerDown={() => { poke(); kickVideo() }}>
      <div className="po-stage" data-season={season} data-scene={scene} style={{ transform: `scale(${scale})` }} onClick={scene === 'idle' ? () => void start() : undefined}>
        {season === 'xmas' && <><div className="po-bokeh" /><div className="po-snowfall" /></>}
        <div className="po-led" data-listen={listening && !hearing} data-hear={hearing} style={{ ['--led' as string]: Math.max(led, hearing ? mic : 0) }} />

        <div className="po-logo2">POST!{season === 'xmas' && <Holly className="po-holly-logo" />}</div>
        {scene !== 'idle' && (
          <div className="po-chips">
            {STEPS.map((s, i) => <span key={s.label} data-on={i === stepIndex} data-done={i < stepIndex}>{season === 'xmas' && i === 0 ? '휴대폰' : s.label}</span>)}
          </div>
        )}
        <div className="po-title2" key={`t-${K}`}>{title}</div>

        <div className="po-face">
          {season === 'xmas' && <Holly className="po-holly-brow" />}
          <Eyes expression={expression} season={season} level={led} />
        </div>

        <SceneHands
          k={K} scene={scene} proc={proc} season={season} S={S} place={place} to={to} pickTo={pickTo}
          photo={photo} cardData={cardData} qrScreen={qrScreen} joined={joined} cardId={cardId}
          isSanta={isSanta} drag={drag} posting={posting} swipe={swipe} mic={mic} hearing={hearing}
          live={(
            <>
              <video ref={cam.videoRef} autoPlay playsInline muted style={{ display: cam.source === 'dslr' ? 'none' : undefined }} />
              <canvas ref={cam.liveRef} style={{ display: cam.source === 'dslr' ? undefined : 'none' }} />
              {camStuck && (
                <button type="button" className="po-camkick" onClick={kickVideo}>
                  <b>눌러서 카메라 켜기</b><small>{camStuck}</small>
                </button>
              )}
            </>
          )} flash={flash}
          pickPhrase={pickPhrase}
        />

        {/* 가운데 아래 — 숫자 · 화살표 · 상태 */}
        <div className="po-mid">
          {scene === 'idle' && <div className="po-hint">화면을 눌러 시작해요</div>}
          {scene === 'cam' && <div className="po-count2">{count ?? ''}</div>}
          {scene === 'cam' && cam.state === 'error' && <div className="po-err">{cam.error}</div>}
          {scene === 'say' && (busy ? <div className="po-busy">{busy}</div> : <div className="po-hear" data-on={hearing}>{hearing ? '듣고 있어요…' : listening ? '오른쪽 귀에 대고 말씀해 주세요' : ''}</div>)}
          {scene === 'say' && hint && <div className="po-err">{hint}</div>}
          {scene === 'heard' && letter && <div className="po-sub2">{letter.from ? <>보내는 사람 <b>{letter.from}</b> · 이름이 틀렸으면 다시 말해 주세요</> : '이름을 말하지 않아 보내는 사람 칸은 비워 둘게요'}</div>}
          {scene === 'post' && <div className="po-up2">↑</div>}
          {scene === 'out' && <div className="po-down2">↓</div>}
          {scene === 'out' && printed === 'browser' && <div className="po-note">초안: 브라우저라 인쇄는 건너뜀</div>}
        </div>

        {/* 아래 단추줄 */}
        <div className="po-btns" key={`b-${K}`}>
          {scene === 'phone' && <Tag onClick={() => { sfx.tap(); stopVoice(); goCam('phone_skip') }}>휴대폰 없이 엽서만 받을게요</Tag>}
          {scene === 'shot' && <><Tag disabled={retakes >= 1} onClick={retake}>다시 찍기{retakes >= 1 ? ' (끝)' : ''}</Tag><span className="po-gap" /><Tag strong onClick={() => { sfx.tap(); stopVoice(); goSay() }}>이 사진으로</Tag></>}
          {scene === 'say' && <Tag ghost onClick={() => { sfx.tap(); stopEar(); go('pick') }}>말하기 쑥스러우면 문장 고르기</Tag>}
          {scene === 'pick' && <Tag ghost onClick={() => goSay(false)}>말로 쓸게요</Tag>}
          {scene === 'heard' && <><Tag onClick={() => { sfx.tap(); stopVoice(); goSay(false) }}>다시 말하기</Tag><span className="po-gap" /><Tag strong onClick={() => { sfx.tap(); stopVoice(); const t = go('post'); void speakSeq(['post_ask'], t) }}>이대로 보내기</Tag></>}
          {scene === 'post' && <Tag ghost onClick={() => doPost()}>밀기 어려우면 여기를 눌러 넣기</Tag>}
          {scene === 'out' && <Tag onClick={() => void finish()}>처음으로</Tag>}
        </div>

        <div className="po-cap2" data-show={Boolean(caption) && scene !== 'idle'}><i>우체통</i>{season === 'xmas' && <span className="po-flake">❄</span>}{caption}</div>
        {phoneUrl && scene === 'phone' && <div className="po-url">{phoneUrl}</div>}
      </div>

      <div className="po-capture" ref={captureRef} aria-hidden="true"><Postcard data={{ ...cardData, typed: undefined }} /></div>
    </div>
  )
}

function Tag({ children, onClick, strong, ghost, disabled }: { children: ReactNode; onClick: () => void; strong?: boolean; ghost?: boolean; disabled?: boolean }) {
  return <button type="button" className={`po-tag ${strong ? 'po-tag--strong' : ''} ${ghost ? 'po-tag--ghost' : ''}`} onClick={(e) => { e.stopPropagation(); onClick() }} disabled={disabled}>{children}</button>
}

function Holly({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 90 60" aria-hidden="true">
      <path d="M44 32 C30 10 12 14 4 6 C10 20 6 28 14 34 C8 36 6 42 2 46 C16 44 28 46 44 32 Z" fill="#1f4d3a" stroke="#123326" strokeWidth="2" />
      <path d="M46 32 C60 10 78 14 86 6 C80 20 84 28 76 34 C82 36 84 42 88 46 C74 44 62 46 46 32 Z" fill="#2a6249" stroke="#123326" strokeWidth="2" />
      <circle cx="40" cy="36" r="7" fill="#c62a2f" /><circle cx="50" cy="38" r="7" fill="#b3202a" /><circle cx="45" cy="28" r="6.5" fill="#d8383a" />
      <circle cx="43" cy="26" r="2" fill="#fff" opacity=".7" />
    </svg>
  )
}

/** 장면마다 좌우 손과 그 손이 든 것.
 *  눈은 가운데(무대 x 340~945, y 230~390 — 11-23 키움)에 있으니 손과 물건은 양옆이나 그 아래에 둔다.
 *  든 물건은 손끝(grip)에서 위쪽 · 화면 안쪽으로 펼쳐진다. 손 그림이 물건 위에 겹쳐 쥐는 것처럼 보인다. */
function SceneHands(p: {
  k: string; scene: Scene; proc: ProcStep; season: Season; S: (typeof SEASONS)[Season]; place: string; to: Recipient | null; pickTo: (r: Recipient) => void
  photo: { front: string; stamp: string } | null; cardData: PostcardData; qrScreen: string | null; joined: boolean; cardId: string | null
  isSanta: boolean; drag: number; posting: boolean; swipe: Record<string, (e: React.PointerEvent) => void>; mic: number; hearing: boolean
  live: ReactNode; flash: number; pickPhrase: (s: string) => void
}) {
  const { k, scene, proc, S, place } = p
  const script = p.season === 'xmas' ? 'Merry Christmas from' : S.capScript
  // 쥐는 손 — 손 그림의 쥐는 점(grip)이 물건의 아래 모서리(왼손은 왼쪽 아래, 오른손은 오른쪽 아래)다.
  // 물건은 손 그림 뒤에 깔리고 손가락이 그 모서리를 덮어 쥔다. 손도 물건과 같은 각도로 기운다.
  const side = (s: 'l' | 'r', pose: Pose, gx: number, gy: number, h: number, children: ReactNode = null, rot = 0) => (
    <Side side={s} k={`${s}-${k}-${pose}`}>{children}<Arm side={s} pose={pose} gx={gx} gy={gy} h={h} rot={rot} /></Side>
  )
  const HOLD_H = 160
  const GL = 150, GR = 1130, GY = 560 // 쥐는 손 기본 자리(= 물건 아래 모서리)
  /** 물건 하나를 쥔 손 — render 에 물건 자리 style 을 넘긴다 */
  const hold = (s: 'l' | 'r', gx: number, gy: number, w: number, h: number, rot: number, render: (st: CSSProperties) => ReactNode, hh = HOLD_H) =>
    side(s, 'hold', gx, gy, hh, render(at(gx, gy, w, h, s === 'l' ? 0 : 1, 1, rot)), rot)

  switch (scene) {
    case 'idle':
      return (
        <>
          {side('l', 'hold', GL, GY, HOLD_H, (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="po-sample" src={`/assets/post/samples/${p.season === 'xmas' ? 'santa' : 'xmas'}.jpg`} alt="" style={at(GL + 6, GY - 4, 160, 240, 0, 1, -9)} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="po-sample" src={`/assets/post/samples/${p.season === 'xmas' ? 'xmas' : 'base'}.jpg`} alt="" style={at(GL, GY, 160, 240, 0, 1, 3)} />
            </>
          ), 3)}
          {side('r', 'wave', 1080, 290, 360)}
        </>
      )
    case 'to': {
      const rs = S.recipients
      const left = rs.slice(0, rs.length - 3), right = rs.slice(rs.length - 3)
      // 손에 든 카드처럼 — 태그 안쪽 끝이 주먹 속(쥐는 점)에 모이고 바깥쪽으로 부채꼴로 펼쳐진다
      const tag = (r: Recipient, i: number, n: number, s: 'l' | 'r', gx: number, gy: number) => {
        const ang = -4 - (n > 1 ? (i * 62) / (n - 1) : 0)
        return (
          <button key={r.key} type="button" className="po-ltag po-ltag--fan" data-santa={r.key === 'santa'} data-on={p.to?.key === r.key}
            onClick={(e) => { e.stopPropagation(); p.pickTo(r) }}
            style={{ ...at(gx, gy, 270, 60, s === 'l' ? 0 : 1, 0.5, s === 'l' ? ang : -ang), zIndex: n - i }}>{r.label}</button>
        )
      }
      return (
        <>
          {side('l', 'fan', 150, 610, 210, <>{left.map((r, i) => tag(r, i, left.length, 'l', 150, 610))}</>)}
          {side('r', 'fan', 1130, 610, 210, <>{right.map((r, i) => tag(r, i, right.length, 'r', 1130, 610))}</>)}
        </>
      )
    }
    case 'phone':
      return (
        <>
          {side('l', 'phone', 200, 420, 430, <div className="po-phonelabel" style={{ left: 104, top: 236 }}>내 휴대폰으로 배달</div>)}
          {hold('r', GR + 70, GY + 60, 240, 300, 3, (st) => (
            <div className="po-qrcard" style={st}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.qrScreen ? <img src={p.qrScreen} alt="휴대폰 연결 QR" /> : <div className="po-busy">QR…</div>}
              <span>휴대폰 카메라로<br />찍어 주세요</span>
            </div>
          ))}
        </>
      )
    case 'cam':
      return (
        <>
          {side('l', 'point_up', 250, 330, 330, <div className="po-pointnote" style={{ left: 60, top: 236 }}>위쪽 카메라를<br />봐 주세요</div>)}
          {hold('r', GR + 70, 615, 270, 243, 3, (st) => (
            <div className="po-live" style={st}>
              {p.live}
              <div className="po-front-cap"><div>{script}</div><b>{place}</b></div>
              <div className="po-flash" data-on={p.flash > 0} key={p.flash} />
            </div>
          ))}
        </>
      )
    case 'shot':
      return (
        <>
          {/* 그림엽서는 오른손(손가락이 오른쪽 아래를 쥐어 왼쪽 아래 지명이 가리지 않게), 우표는 왼손 */}
          {hold('l', GL + 20, GY, 160, 194, -6, (st) => <Stamp src={p.photo?.stamp ?? null} value={S.stampValue} style={st} />, 130)}
          {hold('r', GR + 70, GY + 60, 270, 243, 4, (st) => <FrontCard photo={p.photo?.front ?? null} script={script} place={place} style={st} />)}
        </>
      )
    case 'say':
      return (
        <>
          {hold('l', GL, GY, 270, 162, -3, (st) => <div style={st}><PostcardBack data={{ ...p.cardData, letter: [] }} width={270} /></div>)}
          {side('r', 'cup', 1130, 190, 380, (
            <>
              <div className="po-waves" data-on={p.hearing} style={{ left: 930, top: 300, ['--mic' as string]: p.mic }}>{[0, 1, 2].map((i) => <span key={i} />)}</div>
              <div className="po-earnote" style={{ right: 26, top: 120 }}>오른쪽 귀에 대고<br />속삭여 주세요 →</div>
            </>
          ))}
        </>
      )
    case 'pick': {
      // 문장은 길어서 부채로 펴면 서로 가린다 — 양손이 메모 카드를 한 장씩 들고, 카드에 문장이 적혀 있다
      const memo = (list: string[], sd: 'l' | 'r') => hold(sd, sd === 'l' ? GL - 20 : GR + 20, GY + 50, 300, 236, sd === 'l' ? -3 : 3, (st) => (
        <div className="po-memo" style={st}>
          {list.map((s) => (
            <button key={s} type="button" className="po-memo-line" onClick={(e) => { e.stopPropagation(); p.pickPhrase(s) }}>{s}</button>
          ))}
        </div>
      ))
      return (
        <>
          {memo(S.phrases.slice(0, 3), 'l')}
          {memo(S.phrases.slice(3), 'r')}
        </>
      )
    }
    case 'heard':
      return (
        <>
          {hold('l', GL, GY, 270, 162, -3, (st) => <div style={st}><PostcardBack data={p.cardData} width={270} /></div>)}
          {side('r', 'pen', 1000, 470, 200)}
        </>
      )
    case 'post':
      return (
        <>
          {side('l', 'point_up', 250, 330, 330)}
          {hold('r', GR, GY + 40, 180, 270, 3, (st) => (
            <div className="po-swipe" data-posting={p.posting} {...p.swipe}
              style={{ ...st, translate: `0 ${p.posting ? -900 : p.drag}px` }}>
              <Postcard data={p.cardData} scale={0.15} />
              <div className="po-swipehint">↑ 위로 밀기</div>
            </div>
          ))}
        </>
      )
    case 'proc':
      if (proc === 'north') {
        return (
          <>
            {side('l', 'wave', 200, 290, 360)}
            <div className="po-north"><span>북극</span><div className="po-flycard" /></div>
          </>
        )
      }
      return (
        <>
          {hold('l', GL, GY, 270, 162, -4, (st) => <div className="po-replycard" style={st}><PostcardBack data={p.cardData} width={270} /></div>)}
          {side('r', 'point_down', 1030, 560, 230)}
        </>
      )
    case 'out':
      return (
        <>
          {hold('l', GL + 20, 600, 180, 270, -3, (st) => <div style={st}><Postcard data={p.cardData} scale={0.15} /></div>)}
          {side('r', 'phone', 1090, 400, 380, (
            <div className="po-phonelabel po-phonelabel--r" style={{ right: 36, top: 160 }}>
              {p.joined ? (p.cardId ? <>휴대폰에서<br />카톡으로 배달할 수 있어요</> : '엽서를 올리는 중…') : <>엽서 구석 QR로<br />나중에도 배달할 수 있어요</>}
            </div>
          ))}
        </>
      )
    case 'bye':
      return (
        <>
          {side('l', 'wave', 200, 290, 360)}
          {side('r', 'salute', 1000, 330, 200)}
        </>
      )
  }
  return null
}
