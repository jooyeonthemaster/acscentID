'use client'

// MAKEUP! 영상판(/kiosk?mode=studio-makeup&lab=video, 2026-11-18) — 패션쇼 백스테이지의 메이크업 아티스트 「이안」 영상 위에서 MAKEUP! 를 그대로 한다.
// 촬영 · 얼굴 찾기 · 화장 그리기 · 머리 모양 바꾸기(/api/kiosk/experience/hairstyle) · 저장은 기본 화면과 같은 useMakeupFlow. 기본 화면(MakeupMode)은 그대로다.
// 장면: start 커튼 → capture · edit 화장대(전구 거울 안이 카메라 · 화장한 얼굴) → 머리 모양을 바꾸는 동안 헤어 스테이션 → 화장대로 돌아옴
//       → result 팔레트를 들고 런웨이 입구로(즉석 사진 안에 완성 사진). 다시 꾸미기는 런웨이 → 화장대, 처음으로는 런웨이 → 커튼.
// 영상 · 계획: src/app/kiosk/video(plans.ts 의 makeup), 원리: .claude/skills/kiosk-video-flow. 대사는 기본 화면의 문구(5개 언어)를 그대로 쓴다.

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Camera, Check, Download, Printer, RotateCcw, Scissors, Undo2, X } from 'lucide-react'
import { HAIR_STYLES } from '@/lib/kiosk/hair-styles'
import { KxCamView, KxLang, KxReceiptSheet, KxSaveSheet, KxSpinner, useKx } from '../kx'
import { KxVideoStage, preloadPlan, rectStyle } from '@/app/kiosk/video/stage'
import { VIDEO_PROGRAMS } from '@/app/kiosk/video/plans'
import { TITLE_TAG, VideoArrive, VideoTalk, VideoTitle, VideoTop, useVideoSettle } from '@/app/kiosk/video/ui'
import { VIDEO_NOTE, useVideoStamp, videoReceipt } from '@/app/kiosk/video/video-receipt'
import '@/app/kiosk/video/stage.css'
import type { KioskLang } from '@/lib/kiosk/i18n'
import { LINERS, MAX_HAIR_AI, PALETTE, PARTS, START_LEVELS, swatches, useMakeupFlow } from './MakeupMode'
import type { MakeupPart, MakeupTool } from './text'
import './makeup.css'

const PROGRAM = VIDEO_PROGRAMS.makeup

// 화장 단계(2026-11-18 사용자 지시: 실제 메이크업 차례대로 더 잘게) — 맨얼굴에서 시작해 단계마다 한 겹씩 얹는다.
// 단계에 처음 들어오면 그 도구를 기본 세기(START_LEVELS)로 켜고, 이안이 그 단계를 말한다. 위 단계 칩으로 아무 단계나 다시 갈 수 있다.
const ORDER: MakeupTool[] = ['shape', 'brow', 'eye', 'liner', 'lash', 'blush', 'lip', 'hair']
const BARE = Object.fromEntries(ORDER.map((id) => [id, 0])) as Record<MakeupTool, number>
const STAGE_LINE: Record<MakeupTool, Record<KioskLang, string>> = {
  shape: { ko: '먼저 얼굴형부터 잡을게요. 윤곽을 살짝 살려 볼까요?', en: "Let's start with the face shape — a little contour first.", ja: 'まずは輪郭から。少しだけシェーディングを入れますね。', 'zh-Hans': '先从脸型开始，轻轻修饰一下轮廓。', 'zh-Hant': '先從臉型開始，輕輕修飾一下輪廓。' },
  brow: { ko: '다음은 눈썹이에요. 얼굴 인상을 잡아 주는 곳이죠.', en: 'Now the brows — they frame your whole face.', ja: '次は眉。顔の印象を決めるところです。', 'zh-Hans': '接下来是眉毛，它决定整张脸的印象。', 'zh-Hant': '接下來是眉毛，它決定整張臉的印象。' },
  eye: { ko: '아이섀도로 눈가에 색을 얹어요.', en: 'Eyeshadow next — a wash of color on the lids.', ja: 'アイシャドウでまぶたに色をのせます。', 'zh-Hans': '用眼影给眼皮铺上颜色。', 'zh-Hant': '用眼影給眼皮鋪上顏色。' },
  liner: { ko: '아이라인으로 눈매를 또렷하게 그려요.', en: 'Eyeliner to define the eyes.', ja: 'アイラインで目元をくっきり。', 'zh-Hans': '用眼线让眼神更清晰。', 'zh-Hant': '用眼線讓眼神更清晰。' },
  lash: { ko: '속눈썹을 올려 눈을 크게 열어 줄게요.', en: "Lashes up — let's open the eyes.", ja: 'まつげを上げて、目をぱっちり。', 'zh-Hans': '把睫毛刷翘，让眼睛更有神。', 'zh-Hant': '把睫毛刷翹，讓眼睛更有神。' },
  blush: { ko: '볼에 블러셔로 생기를 더해요.', en: 'A touch of blush to bring the cheeks to life.', ja: 'チークで頬に血色をプラス。', 'zh-Hans': '用腮红给脸颊添点气色。', 'zh-Hant': '用腮紅給臉頰添點氣色。' },
  lip: { ko: '마지막 색조는 립이에요. 오늘의 룩이 여기서 정해져요.', en: "Lips last — this is where today's look comes together.", ja: '仕上げのカラーはリップ。今日のルックがここで決まります。', 'zh-Hans': '最后是唇色，今天的妆容就在这里定下来。', 'zh-Hant': '最後是唇色，今天的妝容就在這裡定下來。' },
  hair: { ko: '머리 색까지 바꿔 볼까요? 그대로 둬도 좋아요.', en: 'Want to try a new hair color? Leaving it as is works too.', ja: '髪色も変えてみますか？そのままでも素敵です。', 'zh-Hans': '要不要换个发色？保持原样也很好。', 'zh-Hant': '要不要換個髮色？保持原樣也很好。' },
}
const PREV: Record<KioskLang, string> = { ko: '이전', en: 'Back', ja: '戻る', 'zh-Hans': '上一步', 'zh-Hant': '上一步' }
const NEXT: Record<KioskLang, string> = { ko: '다음', en: 'Next', ja: '次へ', 'zh-Hans': '下一步', 'zh-Hant': '下一步' }
/** 팔레트 위 칸 팬의 색 — 고른 색. 속눈썹은 마스카라, 얼굴형은 셰이딩 */
const panColor = (id: MakeupTool, picks: Record<Exclude<MakeupTool, 'lash' | 'shape'>, number>) => (id === 'lash' ? '#2b2523' : id === 'shape' ? '#b48467' : swatches(id)[picks[id]])

export default function MakeupVideo() {
  const { t, k, lang, step, setStep, photo, scene: face, cam, hairBusy, tool, picks, levels, analyze, build, canvasRef, final, finish, hairFail, hairMask, hairReady, hairSheet, hairUsed, lookKey, lookName, extras, noFace, restyle, saving, setHairSheet, setLevels, setNoFace, setPicks, setSaving, setScene, setTool, stage, wantHair, home } = useMakeupFlow()
  const scene = step === 'start' ? 'curtain' : step === 'result' ? 'runway' : hairBusy ? 'hair' : 'vanity'
  const view = hairBusy ? 'hair' : step
  const { moving, said, onSettle } = useVideoSettle(scene, view)
  useEffect(() => { preloadPlan(PROGRAM.plan) }, [])
  const who = lang === 'ko' ? PROGRAM.guideName : 'Ian'
  const { c, pc } = useKx()
  const [printing, setPrinting] = useState(false)
  // 시작 화면(SIP! 처럼) — 누르면 이안의 인사. 결과에서 처음으로 가면 다시 시작 화면
  const [titled, setTitled] = useState(false)
  // 영수증 맨 위 '백스테이지의 나' 도장 — 얼굴을 찾은 뒤(머리 모양을 바꾸면 그 얼굴로 다시) 그리기 시작해 영수증을 열 때 받는다
  const stampOf = useVideoStamp('makeup', face?.base ?? null, step === 'edit' || step === 'result')
  const more = extras.join(' · ')
  const receipt = useCallback(async () => videoReceipt({
    program: 'makeup', lang, stamp: await stampOf(), sections: [
      { kind: 'big', label: "TODAY'S LOOK", title: lookName, sub: more || undefined },
      { kind: 'rows', label: 'THE RECIPE', rows: PARTS.map((id) => [t.parts[id], t.colors[id][picks[id]]] as [string, string]) },
      { kind: 'note', label: "IAN'S NOTE", text: VIDEO_NOTE.makeup[lang] },
    ],
  }), [lang, stampOf, lookName, more, t, picks])
  const mirror = PROGRAM.mirror!

  // 얼굴을 찾고 편집에 들어오는 순간 — 맨얼굴에서 첫 단계(얼굴형)만 켠다(렌더 중 상태 맞추기, 한 프레임도 완성 룩이 보이지 않게)
  const [seen, setSeen] = useState<MakeupTool[]>([])
  const [was, setWas] = useState(step)
  if (was !== step) {
    setWas(step)
    if (step === 'edit' && was === 'finding') { setLevels({ ...BARE, [ORDER[0]]: START_LEVELS[ORDER[0]] }); setTool(ORDER[0]); setSeen([ORDER[0]]) }
  }
  const goStage = (id: MakeupTool) => {
    setTool(id)
    if (!seen.includes(id)) { setSeen((x) => [...x, id]); setLevels((prev) => ({ ...prev, [id]: prev[id] || START_LEVELS[id] })) }
  }
  const at = Math.max(0, ORDER.indexOf(tool))
  const toolName = (id: MakeupTool) => (id === 'lip' || id === 'blush' || id === 'eye' ? t.parts[id] : t.tools[id])

  /** 처음으로 — 결과에서는 이안이 커튼으로 걸어 돌아간다(이어지는 영상). 다른 단계는 화면 틀의 처음으로(새로 시작) */
  const restart = () => { if (step === 'result') { setPrinting(false); setStep('start'); setTitled(false) } else home() }

  const shown = moving ? said : view
  const line = shown === 'start' ? t.headline : shown === 'capture' ? t.captureTitle : shown === 'finding' ? t.finding : shown === 'edit' ? STAGE_LINE[tool][lang] : shown === 'hair' ? t.hairAiWorking : shown === 'result' ? t.resultTitle : ''

  const body = () => {
    if (shown === 'start') return (
      <button type="button" className="kv-go" onClick={() => { setNoFace(false); setStep('capture') }}>{t.cta}<ArrowRight size={24} strokeWidth={2.3} aria-hidden="true" /></button>
    )
    if (shown === 'capture') return <>
      {noFace && <p className="kv-alert" role="alert"><b>{t.noFace[0]}</b>{t.noFace[1]}</p>}
      <button type="button" className="kv-go" disabled={cam.state !== 'ready' || cam.countdown !== null} onClick={() => cam.shoot((shot) => void analyze(shot))}>
        <Camera size={24} strokeWidth={1.9} aria-hidden="true" />{t.shoot}
      </button>
    </>
    if (shown === 'edit' && face) {
      const colors = swatches(tool)
      const picked = tool === 'lash' || tool === 'shape' ? 0 : picks[tool]
      const colorName = tool === 'liner' ? t.liners[picked] : tool === 'brow' ? t.brows[picked] : tool === 'hair' ? t.hairs[picked] : tool === 'lash' ? t.lashHint : tool === 'shape' ? t.shapeHint : t.colors[tool][picked]
      const hint = tool === 'hair' && hairFail ? `${t.hairAiFailed[0]} ${t.hairAiFailed[1]}` : tool === 'hair' && wantHair && !hairReady ? t.hairFinding : tool === 'hair' && hairReady && !hairMask ? t.hairNone : colorName
      return <>
        {/* 화장 팔레트(2026-11-19 사용자 지시) — 위 칸은 단계마다 고른 색의 팬, 아래 칸은 지금 단계의 색 · 농도. 얼굴을 가리지 않게 낮게 */}
        <div className="mkv-palette">
          <div className="mkv-pans" role="tablist">
            {ORDER.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tool === id} data-on={tool === id || undefined} data-off={levels[id] === 0 || undefined} onClick={() => goStage(id)}
                style={{ '--pan': panColor(id, picks) } as CSSProperties}>
                <i data-kind={id} aria-hidden="true" /><small>{toolName(id)}</small>
              </button>
            ))}
          </div>
          <div className="mkv-tray">
            {colors.length > 0 && (
              <div className="mkv-shades" role="radiogroup" aria-label={colorName} key={tool}>
                {colors.map((hex, i) => (
                  <button key={`${hex}${i}`} type="button" role="radio" aria-checked={picked === i} aria-label={tool === 'liner' ? t.liners[i] : tool === 'brow' ? t.brows[i] : tool === 'hair' ? t.hairs[i] : t.colors[tool as MakeupPart][i]} data-on={picked === i || undefined} data-wing={(tool === 'liner' && LINERS[i].wing) || undefined} style={{ '--pan': hex, '--i': i } as CSSProperties}
                    onClick={() => { setPicks((prev) => ({ ...prev, [tool]: i })); if (levels[tool] === 0) setLevels((prev) => ({ ...prev, [tool]: tool === 'hair' ? 70 : 50 })) }}>
                    {picked === i && <Check size={18} strokeWidth={2.8} aria-hidden="true" />}
                  </button>
                ))}
                {tool === 'hair' && <button type="button" className="mkv-ai" disabled={Boolean(hairBusy)} onClick={() => setHairSheet(true)}><Scissors size={16} strokeWidth={2} aria-hidden="true" />{t.hairAi}</button>}
              </div>
            )}
            {tool === 'hair' && hint !== colorName && <p className="mkv-alert" data-alert={hairFail || undefined}>{hint}</p>}
            <label className="mkv-level">
              <span key={`${tool}${picked}`}>{colors.length > 0 ? colorName : t.level}</span>
              <input type="range" min={0} max={100} step={5} value={levels[tool]} aria-label={t.level} style={{ '--v': `${levels[tool]}%` } as CSSProperties} onChange={(event) => setLevels((prev) => ({ ...prev, [tool]: Number(event.target.value) }))} />
              <output>{levels[tool]}%</output>
            </label>
          </div>
        </div>
        <div className="kv-row mkv-row">
          <button type="button" className="kv-ghost" disabled={at === 0} aria-label={PREV[lang]} onClick={() => goStage(ORDER[at - 1])}><ArrowLeft size={22} aria-hidden="true" /></button>
          {at < ORDER.length - 1
            ? <button type="button" className="kv-go" onClick={() => goStage(ORDER[at + 1])}>{NEXT[lang]} · {toolName(ORDER[at + 1])}<ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" /></button>
            : <button type="button" className="kv-go" disabled={Boolean(hairBusy) || !stage} onClick={finish}>{t.toResult}<ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" /></button>}
        </div>
      </>
    }
    if (shown === 'result' && final) return <>
      <ul className="kv-recipe">
        {PARTS.map((id) => <li key={id}><i style={{ background: PALETTE[id][picks[id]] }} /><span>{t.parts[id]}<b>{t.colors[id][picks[id]]}</b></span></li>)}
      </ul>
      <div className="kv-row">
        <button type="button" className="kv-ghost" onClick={() => setStep('edit')}><RotateCcw size={20} aria-hidden="true" />{t.again}</button>
        {!pc && <button type="button" className="kv-ghost" onClick={() => setPrinting(true)}><Printer size={20} aria-hidden="true" />{c.receipt}</button>}
      </div>
      <button type="button" className="kv-go" onClick={() => setSaving(true)}><Download size={22} aria-hidden="true" />{t.save}</button>
    </>
    return null
  }

  // 화장대 거울 안 — 촬영은 실시간 카메라, 얼굴 찾는 동안은 방금 찍은 사진, 편집은 화장을 얹은 얼굴만(2026-11-19 사용자 지시: 전후 비교 없음)
  const atVanity = !moving && scene === 'vanity'
  // 이동 중에는 숨기기만 한다 — 빼면 편집 캔버스가 다시 붙을 때 그려지지 않는다(그리기는 값이 바뀔 때만 돈다)
  const inMirror = step === 'capture' || step === 'finding' || step === 'edit' ? (
    <div className="kv-slot kv-mirror" data-hidden={!atVanity || undefined} style={rectStyle(mirror)} key={step === 'edit' ? 'edit' : 'cam'}>
      {step === 'edit' && photo && face ? (
        <div className="mkv-after"><canvas ref={canvasRef} /></div>
      ) : (
        <KxCamView cam={step === 'capture' ? cam : null} photo={step === 'finding' ? photo : null} flash={step === 'finding'}>
          {step === 'capture' && <svg className="kx-cam-guide" viewBox="0 0 300 400" aria-hidden="true"><ellipse cx="150" cy="178" rx="92" ry="124" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeDasharray="7 7" /></svg>}
          {step === 'finding' && <p className="mku-finding" role="status"><KxSpinner size={28} />{t.finding}</p>}
        </KxCamView>
      )}
    </div>
  ) : null

  const hairLeft = MAX_HAIR_AI - hairUsed
  return (
    <div className="kv" data-program="makeup" style={{ '--kv-tone': PROGRAM.tone, '--kv-tone-light': PROGRAM.toneLight } as CSSProperties}>
      <KxVideoStage plan={PROGRAM.plan} scene={scene} onSettle={onSettle} art={step === 'result' && !moving ? final : null} inside={inMirror} front={inMirror && atVanity ? mirror : null} />
      <i className="kv-shade" aria-hidden="true" />
      {!titled && <VideoTitle mark="MAKEUP!" tag={TITLE_TAG.makeup[lang]} lang={lang} onStart={() => setTitled(true)} corner={<KxLang />} />}
      {titled && <>
      <VideoTop mark="MAKEUP!" place={moving ? null : PROGRAM.placesKo[scene]} onHome={restart} homeLabel={t.home} start={step === 'start' ? <KxLang /> : undefined} />
      {!moving && scene !== 'runway' && scene !== 'vanity' && <VideoArrive key={`a-${scene}`} en={PROGRAM.places[scene]} ko={PROGRAM.placesKo[scene]} />}
      {shown && line && (
        <VideoTalk key={moving ? `leave-${said}` : view} who={who} role={PROGRAM.guideRole} line={line} leave={moving} wait={shown === 'finding' || shown === 'hair'}
          note={shown === 'start' ? t.sub : shown === 'capture' && !noFace ? `${t.tips[0]} · ${t.tips[1]}` : shown === 'result' ? lookName : undefined}
          wide={shown === 'edit'} light={shown === 'edit'} inside={shown === 'edit'}>
          {body()}
        </VideoTalk>
      )}
      </>}
      {hairSheet && face && (
        <div className="kx-sheet" role="dialog" aria-modal="true" aria-label={t.hairAiTitle} onPointerDown={(event) => { if (event.target === event.currentTarget) setHairSheet(false) }}>
          <div className="kx-sheet-card mku-hair-sheet">
            <button type="button" className="kx-sheet-x" aria-label={k.close} onClick={() => setHairSheet(false)}><X size={24} strokeWidth={2} aria-hidden="true" /></button>
            <h2>{t.hairAiTitle}</h2>
            <p className="kx-sheet-desc">{hairLeft > 0 ? t.hairAiNote.replace('{n}', String(hairLeft)) : t.hairAiLimit}</p>
            <div className="mku-hair-grid">
              {HAIR_STYLES.map((style) => <button key={style} type="button" disabled={hairLeft <= 0} onClick={() => void restyle(style)}><Scissors size={20} strokeWidth={1.8} aria-hidden="true" />{t.hairStyles[style]}</button>)}
            </div>
            {face.base !== face.first.base && <button type="button" className="kx-btn kx-btn--ghost" onClick={() => { setScene({ ...face.first, first: face.first }); setHairSheet(false) }}><Undo2 size={20} strokeWidth={2} aria-hidden="true" />{t.hairBack}</button>}
            <p className="kx-sheet-keep">{t.hairAiPrivacy}</p>
          </div>
        </div>
      )}
      {photo && final && <>
        <KxSaveSheet open={saving} cacheKey={`${lang}|${lookKey}|${final.length}`} build={build} onClose={() => setSaving(false)} title={t.saveTitle} />
        <KxReceiptSheet open={printing} cacheKey={`${lang}|${lookKey}|${final.length}`} build={build} receipt={receipt} onClose={() => setPrinting(false)} />
      </>}
    </div>
  )
}
