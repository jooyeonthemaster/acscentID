'use client'
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronRight, Lightbulb, Maximize2, Monitor, RotateCcw, ScanFace } from 'lucide-react'
import { applyAiAnalysis } from '@/lib/kiosk/expansion/ai'
import { IMAGE_LABEL, type ImageParams } from '@/lib/kiosk/expansion/image-prompts'
import { PHOTO_PLANS, readingLine, type PhotoReading } from '@/lib/kiosk/expansion/photo'
import { photoHeritage, photoMission, photoPickSection, photoProduct, photoWall, WALL_COLOR_NAMES } from '@/lib/kiosk/expansion/photo-effects'
import { KxKeyboard } from '../kx'
import { useAiJob } from './ai-client'
import { AiImage, AiWait } from './AiStep'
import { PhotoStep } from './PhotoStep'
import { ExpansionStart, ExpansionFrame, ChoiceTile, PrimaryButton, ResultPanel, TakeActions } from './shared'
import type { ExperienceResult } from '@/lib/kiosk/expansion/types'
import { EXHIBIT_COLORS, PRODUCT_COLORS, type ExhibitCommand, type HeritageConfig, type ProductConfig, type WallDraft } from '@/lib/kiosk/expansion/exhibit'
import { useExhibit } from '@/lib/kiosk/expansion/exhibit-client'
import { HeritageScene, ProductScene, VisionTile } from '@/app/kiosk-display/ExhibitVisual'
import { HERITAGE_POINTS, HERITAGE_SCENES, PRODUCTS, PRODUCT_COLOR_NAMES, RGB_MISSIONS, heritageResult, initialHeritage, initialProduct, productResult, rgbHex, rgbHint, rgbMatches, scienceResult, wallResult, type ExperimentRecord, type RGB, type RgbMission } from './interactive-data'
import './interactive.css'

type InteractiveId = 'science' | 'product' | 'vision-wall' | 'heritage'
function Slider({ label, value, min = 0, max = 100, suffix = '', onChange, color }: { label: string; value: number; min?: number; max?: number; suffix?: string; onChange: (value: number) => void; color?: string }) {
  const id = useId()
  return <div className="ix-slider"><label htmlFor={id}>{label}<output>{Math.round(value)}{suffix}</output></label><input id={id} type="range" min={min} max={max} step={1} value={value} onChange={e => onChange(Number(e.target.value))} style={color ? { accentColor: color } : undefined} /></div>
}
function Pill({ children }: { children: ReactNode }) { return <span className="ix-pill">{children}</span> }
/** 사진으로 고른 첫 설정 — 무엇을 읽어 무엇을 골랐는지 */
function PhotoPicks({ reasons }: { reasons: string[] }) {
  return <section className="ex-panel ex-photo-note" aria-label="사진으로 고른 첫 설정"><h3><ScanFace size={20} aria-hidden="true" />사진으로 고른 첫 설정</h3><ul className="ex-detail-list">{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="ex-note">마음에 들지 않으면 그대로 바꿔도 돼요.</p></section>
}
/** AI 분석 한 번(사진·잰 값·맥락) — 터치 전시 네 가지가 같이 쓴다 */
function useInteractiveAi(id: InteractiveId, photo: PhotoReading | null, shot: string | null) {
  const ai = useAiJob()
  const done = ai.state.phase === 'done' ? ai.state : null
  const start = (context: string, image: ImageParams | null, onDone: () => void) => {
    void ai.run({ analysis: { id, photo: shot, facts: photo ? readingLine(photo, PHOTO_PLANS[id]) : '', answers: [], candidates: [], context }, image: image && shot ? () => ({ params: image, photo: shot }) : null })
      .then((finished) => { if (finished) onDone() })
  }
  return { ai, done, start, apply: (result: ExperienceResult) => done?.analysis ? applyAiAnalysis(result, done.analysis) : result }
}
function BackNext({ back, next, nextLabel = '다음', disabled = false }: { back: () => void; next: () => void; nextLabel?: string; disabled?: boolean }) { return <><PrimaryButton secondary onClick={back}>이전</PrimaryButton><PrimaryButton disabled={disabled} onClick={next}>{nextLabel} <ChevronRight size={19} /></PrimaryButton></> }

function ExhibitLink({ exhibit, command, onSent, label = '이 화면을 전시에 보내기' }: { exhibit: ReturnType<typeof useExhibit>; command: ExhibitCommand; onSent?: (at: number) => void; label?: string }) {
  const [qr, setQr] = useState('')
  const url = exhibit.connection?.viewerUrl
  useEffect(() => {
    if (!url) return
    let alive = true
    void import('qrcode').then(m => m.default.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: 'M' })).then(value => { if (alive) setQr(value) }).catch(() => { if (alive) setQr('') })
    return () => { alive = false }
  }, [url])
  const expired = !!exhibit.connection && exhibit.connection.expiresAt <= Date.now()
  const confirmedHere = exhibit.confirmed !== null && exhibit.confirmedCommandKey === JSON.stringify(command) && exhibit.state?.connected && exhibit.state.sequence === exhibit.confirmed && exhibit.state.acknowledgedSequence === exhibit.confirmed
  return <section className="ix-exhibit ex-panel" aria-label="전시 연결">
    <div className="ix-exhibit-heading"><Monitor size={23} /><strong>함께 보는 전시 화면</strong><span className="ix-live" data-live={exhibit.state?.connected || undefined}>{exhibit.state?.connected ? '연결됨' : '미연결'}</span></div>
    {!exhibit.connection || expired ? <><p className="ex-note">전시용 화면에서 연결 주소를 열면 지금 만든 내용을 함께 볼 수 있어요. 연결은 1시간 동안 유지됩니다.</p><PrimaryButton disabled={exhibit.creating} onClick={() => void exhibit.connect()}>{exhibit.creating ? '연결 주소 준비 중…' : expired ? '새 연결 만들기' : '전시 연결 만들기'}</PrimaryButton></> : <>
      {/* The QR is a local data URL, not an optimizable remote image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="ix-exhibit-connect">{qr && <img src={qr} alt="전시 화면을 여는 QR" />}<div><p>전시 기기에서 QR을 스캔하거나 아래 주소를 새 창으로 열어 주세요.</p><a className="ix-open-display" href={url} target="_blank" rel="noopener noreferrer">전시 화면 열기 <Maximize2 size={17} /></a><small>전시 창을 화면에 열어 두어야 연결이 유지돼요.</small></div></div>
      <PrimaryButton disabled={exhibit.sending || !exhibit.state?.connected} onClick={() => { void exhibit.send(command).then(result => { if (result?.acknowledgedAt) onSent?.(result.acknowledgedAt) }) }}>{exhibit.sending ? '전시 화면의 표시를 확인하는 중…' : label}</PrimaryButton>
      {confirmedHere && <p className="ix-confirmed" role="status"><Check size={18} /> 전시 화면에 표시된 것을 확인했어요.</p>}
    </>}
    {exhibit.error && <p className="ex-alert" role="alert">{exhibit.error}</p>}
  </section>
}

function ScienceMode() {
  const [step, setStep] = useState<'start' | 'guide' | 'photo' | 'mix' | 'mission' | 'ai' | 'result'>('start')
  const [rgb, setRgb] = useState<RGB>([90, 70, 160])
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const [shot, setShot] = useState<string | null>(null)
  const { ai, start, apply } = useInteractiveAi('science', photo, shot)
  // 사진에서 뽑은 옷 색은 네 번째 미션이 된다
  const own = useMemo(() => photo ? photoMission(photo) : null, [photo])
  const missions = useMemo<RgbMission[]>(() => own ? [...RGB_MISSIONS, own] : RGB_MISSIONS, [own])
  const [mission, setMission] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'try' | null>(null)
  const [hint, setHint] = useState(false)
  const [records, setRecords] = useState<ExperimentRecord[]>([])
  const [reset, setReset] = useState(false)
  const result = useMemo(() => scienceResult(records, rgb, missions, photo ? photoPickSection('science', photo, own ? [`옷 색 ${own.color} ${own.from} → 빛 미션 ‘${own.name}’ (R ${own.target[0]} · G ${own.target[1]} · B ${own.target[2]})`, records.some(r => r.mission === missions.length - 1) ? '내 옷 색 미션을 성공했어요.' : '내 옷 색 미션은 아직 성공하지 않았어요.'] : ['옷 색을 읽지 못해 내 옷 색 미션은 열리지 않았어요.'], '빛으로 만든 색은 화면 설정에 따라 실제 옷과 조금 다르게 보일 수 있어요.') : null), [records, rgb, missions, photo, own])
  const change = (index: number, value: number) => { setRgb(current => current.map((v, i) => i === index ? value : v) as RGB); setFeedback(null) }
  const sliders = <div className="ix-rgb-sliders">{['빨강 R', '초록 G', '파랑 B'].map((label, i) => <Slider key={label} label={label} value={rgb[i]} max={255} color={['#C4544C', '#4A966B', '#4C71BD'][i]} onChange={value => change(i, value)} />)}</div>
  if (step === 'start') return <ExpansionStart id="science" headline="빛을 더하면, 어떤 색이 될까요?" description="손끝으로 빨강·초록·파랑 빛을 섞고 나만의 실험 기록을 남겨요." onStart={() => setStep('guide')} />
  const finish = () => { setStep('ai'); start(`지금 만든 색 ${rgbHex(rgb)} (빨강 ${rgb[0]} · 초록 ${rgb[1]} · 파랑 ${rgb[2]}). 성공한 미션: ${records.map(r => `${missions[r.mission].name} ${rgbHex(r.rgb)} (${r.attempts}번 확인)`).join(', ') || '없음'}. ${own ? `사진의 옷 색으로 만든 미션: ${own.name} ${own.from} (빨강 ${own.target[0]} · 초록 ${own.target[1]} · 파랑 ${own.target[2]}).` : ''}`, null, () => setStep('result')) }
  if (step === 'ai') return <AiWait id="science" state={ai.state} onRetry={finish} onSkip={() => { ai.skip(); setStep('result') }} onBack={() => { ai.reset(); setStep('mission') }} />
  if (step === 'result') { const final = apply(result); return <ExpansionFrame title="나의 빛 실험 기록" onBack={() => setStep('mission')} screen={120} actions={<TakeActions result={final} />}><ResultPanel result={final} /></ExpansionFrame> }
  if (step === 'photo') return <PhotoStep id="science" reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); ai.reset(); const next = photoMission(made); setRecords(list => list.filter(r => r.mission < RGB_MISSIONS.length)); if (next) setMission(RGB_MISSIONS.length); else setMission(0) }} onNext={() => setStep('mix')} onBack={() => setStep('guide')} onSkip={() => { setPhoto(null); setShot(null); setRecords(list => list.filter(r => r.mission < RGB_MISSIONS.length)); setMission(0); setStep('mix') }} />
  if (step === 'guide') return <ExpansionFrame title="오늘은 빛을 섞어 볼까요?" subtitle="빛의 삼원색 · RGB 실험" onBack={() => setStep('start')} actions={<BackNext back={() => setStep('start')} next={() => setStep('photo')} nextLabel="옷 색 찍고 시작" />}><div className="ix-science-guide"><div className="ix-rgb-orbits" aria-hidden="true"><i /><i /><i /></div><h2>빨강 + 초록 + 파랑</h2><p>각 빛의 밝기를 조절하면 새로운 색이 나타나요.<br />모두 더하면 흰색, 모두 끄면 검정이 됩니다.</p></div><div className="ex-panel"><h3>이렇게 실험해요</h3><ol className="ix-instructions"><li>슬라이더를 움직여 빛의 밝기를 바꿔요.</li><li>목표 색을 보고 비슷한 색을 만들어 봐요.</li><li>사진을 찍으면 내 옷 색을 빛으로 만드는 미션이 하나 더 열려요.</li><li>직접 만든 색과 성공한 미션을 기록해요.</li></ol><p className="ex-note">이 실험은 화면의 빛을 섞는 실험이에요. 물감을 섞는 것과는 달라요.</p></div></ExpansionFrame>
  const target = missions[mission] ?? missions[0]
  return <ExpansionFrame title={step === 'mix' ? '손끝으로 빛을 섞어 보세요' : '이 색을 만들어 볼까요?'} subtitle={step === 'mix' ? '세 가지 빛의 밝기를 자유롭게 바꿔 보세요.' : `${target.name} · 성공한 미션 ${records.length} / ${missions.length}`} onBack={() => setStep(step === 'mix' ? 'photo' : 'mix')} actions={step === 'mix' ? <BackNext back={() => setStep('photo')} next={() => { setStep('mission'); setFeedback(null) }} nextLabel="색 만들기 미션" /> : <><PrimaryButton secondary onClick={() => setStep('mix')}>자유 실험</PrimaryButton><PrimaryButton onClick={finish}>실험 기록 보기</PrimaryButton></>}>
    <div className="ix-color-samples"><div className="ix-color-sample" style={{ background: rgbHex(rgb) }}><span>내가 만든 색</span><b>{rgbHex(rgb)}</b></div>{step === 'mission' && <div className="ix-color-sample" style={{ background: rgbHex(target.target) }}><span>목표 색</span><b>{target.name}</b></div>}</div>
    {sliders}
    {step === 'mission' && <><div className="ix-mission-tabs">{missions.map((item, i) => <button type="button" key={item.name} aria-pressed={i === mission} onClick={() => { setMission(i); setAttempts(0); setFeedback(null); setHint(false) }}>{records.some(r => r.mission === i) ? <Check size={15} /> : item.from ? <i className="ix-color-dot" style={{ background: item.from }} aria-hidden="true" /> : i + 1} {item.name}</button>)}</div><div className="ix-check-actions"><PrimaryButton onClick={() => { const count = attempts + 1; setAttempts(count); if (rgbMatches(rgb, target.target)) { setFeedback('correct'); setRecords(previous => [...previous.filter(r => r.mission !== mission), { mission, rgb: [...rgb] as RGB, attempts: count }]) } else setFeedback('try') }}>지금 색 확인하기</PrimaryButton><PrimaryButton secondary onClick={() => setHint(value => !value)}><Lightbulb size={19} /> 힌트</PrimaryButton></div>{feedback && <div className={`ex-panel ix-feedback ${feedback === 'correct' ? 'ix-feedback--correct' : ''}`} role="status"><strong>{feedback === 'correct' ? '목표 색을 만들었어요!' : '조금만 더 바꿔 볼까요?'}</strong><p>{feedback === 'correct' ? `각 빛의 오차가 12 이내예요. ${attempts}번 확인한 기록을 남겼어요.` : rgbHint(rgb, target.target)}</p></div>}{hint && <p className="ex-note ix-hint">{target.hint}</p>}</>}
    <button type="button" className="ix-text-button" onClick={() => setReset(true)}><RotateCcw size={17} /> 실험 초기화</button>
    {reset && <div className="ix-modal" role="dialog" aria-modal="true" aria-labelledby="science-reset-title"><div className="ex-panel"><h2 id="science-reset-title">실험을 처음부터 할까요?</h2><p>지금 만든 색과 성공한 미션 기록이 지워집니다.</p><div className="ex-actions"><PrimaryButton secondary onClick={() => setReset(false)}>계속 실험하기</PrimaryButton><PrimaryButton onClick={() => { setRgb([0,0,0]); setRecords([]); setAttempts(0); setMission(own ? RGB_MISSIONS.length : 0); setFeedback(null); setHint(false); setReset(false); setStep('mix') }}>초기화</PrimaryButton></div></div></div>}
  </ExpansionFrame>
}

function ProductMode() {
  const [step, setStep] = useState<'start' | 'photo' | 'choose' | 'inspect' | 'compare' | 'exhibit' | 'collection' | 'ai' | 'result'>('start')
  const [config, setConfig] = useState<ProductConfig>(initialProduct)
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const pick = useMemo(() => photo ? photoProduct(photo) : null, [photo])
  const [shot, setShot] = useState<string | null>(null)
  const { ai, start, apply } = useInteractiveAi('product', photo, shot)
  const [favorites, setFavorites] = useState<ProductConfig[]>([])
  const exhibit = useExhibit('product')
  const product = PRODUCTS.find(item => item.id === config.model)!
  const result = useMemo(() => productResult(config, favorites, photo && pick ? photoPickSection('product', photo, pick.reasons) : null), [config, favorites, photo, pick])
  const update = (patch: Partial<ProductConfig>) => setConfig(value => ({ ...value, ...patch }))
  const saved = favorites.some(item => item.model === config.model && item.color === config.color && item.brightness === config.brightness && item.on === config.on)
  if (step === 'start') return <ExpansionStart id="product" headline="돌려 보고, 빛을 켜 보세요" description="직접 조작하는 가상 조명 두 가지. 색과 밝기를 바꿔 내 공간의 분위기를 찾아요." onStart={() => setStep('photo')} />
  if (step === 'photo') return <PhotoStep id="product" reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); ai.reset(); setConfig(value => ({ ...value, ...photoProduct(made).patch })) }} onNext={() => setStep('choose')} onBack={() => setStep('start')} onSkip={() => { setPhoto(null); setShot(null); setConfig(initialProduct()); setStep('choose') }} />
  const finish = () => { setStep('ai'); start(`고른 조명: ${product.name}(${product.material}). 설정: 색 ${PRODUCT_COLOR_NAMES[config.color]} · 밝기 ${config.brightness}% · 전원 ${config.on ? '켜짐' : '꺼짐'} · 회전 ${Math.round(config.rotation)}°. 관심 목록: ${favorites.map(f => `${PRODUCTS.find(p => p.id === f.model)!.name} ${PRODUCT_COLOR_NAMES[f.color]} ${f.brightness}%`).join(', ') || '없음'}.${pick ? ` 사진으로 고른 첫 설정: ${pick.reasons.join(', ')}.` : ''}`, null, () => setStep('result')) }
  if (step === 'ai') return <AiWait id="product" state={ai.state} onRetry={finish} onSkip={() => { ai.skip(); setStep('result') }} onBack={() => { ai.reset(); setStep('collection') }} />
  if (step === 'result') { const final = apply(result); return <ExpansionFrame title="나의 조명 컬렉션" onBack={() => setStep('collection')} screen={120} actions={<TakeActions result={final} />}><ProductScene config={config} compact /><ResultPanel result={final} /></ExpansionFrame> }
  if (step === 'choose') return <ExpansionFrame title="어떤 조명을 살펴볼까요?" subtitle="조작 가능한 가상 제품 · 두 가지 디자인" onBack={() => setStep('photo')} actions={<BackNext back={() => setStep('photo')} next={() => setStep('inspect')} nextLabel="직접 체험하기" />}><div className="ex-grid ix-visual-choices">{PRODUCTS.map(item => <ChoiceTile key={item.id} label={item.name} note={item.note} selected={config.model === item.id} onClick={() => update({ model: item.id })}><ProductScene config={{ ...config, model: item.id }} compact /></ChoiceTile>)}</div>{pick && <PhotoPicks reasons={pick.reasons} />}<p className="ex-note">실제 판매 상품이 아닌 체험용 가상 디자인입니다. 회전·색상·조명은 직접 조작할 수 있어요.</p></ExpansionFrame>
  if (step === 'compare') return <ExpansionFrame title="두 가지 빛을 나란히" subtitle="같은 색상·밝기로 형태의 차이를 비교해요." onBack={() => setStep('inspect')} actions={<BackNext back={() => setStep('inspect')} next={() => setStep('collection')} nextLabel="관심 목록 보기" />}><div className="ix-product-compare">{PRODUCTS.map(item => <div className="ex-panel" key={item.id}><ProductScene config={{ ...config, model: item.id }} compact /><h3>{item.name}</h3><p>{item.feature}</p><p className="ex-note">{item.material}<br />{item.dimensions}</p><PrimaryButton secondary onClick={() => { update({ model: item.id }); setStep('inspect') }}>이 조명 선택</PrimaryButton></div>)}</div><Slider label="두 조명의 밝기" value={config.brightness} suffix="%" onChange={brightness => update({ brightness, on: true })} /><p className="ex-note">공통 설정을 바꾸면 두 모형에 함께 적용됩니다.</p></ExpansionFrame>
  if (step === 'exhibit') return <ExpansionFrame title="더 큰 화면으로 함께 보기" onBack={() => setStep('inspect')} busy={exhibit.sending} actions={<PrimaryButton onClick={() => setStep('inspect')}>키오스크에서 계속 체험하기</PrimaryButton>}><ProductScene config={config} /><ExhibitLink exhibit={exhibit} command={{ kind: 'product', config }} /><p className="ex-note">전시가 연결되지 않아도 이 화면에서 계속 체험할 수 있어요.</p></ExpansionFrame>
  if (step === 'collection') return <ExpansionFrame title="마음에 담은 조명" subtitle={`${favorites.length}개 설정을 담았어요.`} onBack={() => setStep('inspect')} actions={<BackNext back={() => setStep('inspect')} next={finish} nextLabel="나의 컬렉션 정리" />}><div className="ex-stack">{favorites.length ? favorites.map((item, i) => <div className="ex-panel ix-favorite" key={`${item.model}-${item.color}-${item.brightness}-${i}`}><span className="ix-color-dot" style={{ background: item.color }} /><div><strong>{PRODUCTS.find(p => p.id === item.model)!.name}</strong><p>{PRODUCT_COLOR_NAMES[item.color]} · 밝기 {item.brightness}% · {item.on ? '켜짐' : '꺼짐'}</p></div><button type="button" className="ix-text-button" onClick={() => setFavorites(list => list.filter((_, index) => index !== i))} aria-label={`${i + 1}번째 관심 설정 삭제`}>삭제</button></div>) : <div className="ex-panel"><h3>아직 담은 조명이 없어요</h3><p>체험 화면의 ‘관심 목록에 담기’를 눌러 보세요. 현재 선택한 설정만으로도 카드로 정리할 수 있어요.</p></div>}</div></ExpansionFrame>
  return <ExpansionFrame title={product.name} subtitle={product.feature} onBack={() => setStep('choose')} actions={<BackNext back={() => setStep('choose')} next={() => setStep('collection')} nextLabel={`관심 목록 · ${favorites.length}`} />}>
    <ProductScene config={config} onRotate={rotation => update({ rotation })} />
    <div className="ix-control-row"><Pill>{product.material}</Pill><button type="button" className="ix-power" aria-pressed={config.on} onClick={() => update({ on: !config.on })}>{config.on ? '조명 켜짐' : '조명 꺼짐'}</button></div>
    <div className="ix-swatches" aria-label="제품 색상">{PRODUCT_COLORS.map(color => <button type="button" key={color} className="ix-swatch" aria-pressed={config.color === color} onClick={() => update({ color })}><i style={{ background: color }} />{PRODUCT_COLOR_NAMES[color]}</button>)}</div>
    <div className="ix-product-controls"><Slider label="회전" value={config.rotation} max={360} suffix="°" onChange={rotation => update({ rotation })} /><Slider label="확대" value={config.zoom} min={60} max={140} suffix="%" onChange={zoom => update({ zoom })} /><Slider label="밝기" value={config.brightness} suffix="%" onChange={brightness => update({ brightness })} /></div>
    <div className="ix-button-grid"><PrimaryButton secondary onClick={() => setStep('compare')}>두 디자인 비교</PrimaryButton><PrimaryButton secondary disabled={saved || favorites.length >= 6} onClick={() => setFavorites(items => [...items, { ...config }])}>{saved ? '관심 목록에 담았어요' : '관심 목록에 담기'}</PrimaryButton><PrimaryButton secondary onClick={() => setStep('exhibit')}><Monitor size={17} /> 전시에 보내기</PrimaryButton><PrimaryButton secondary onClick={() => setConfig(initialProduct())}>기본 설정</PrimaryButton></div>
    <p className="ex-note">가상 디자인 체험 · 실제 판매 제품의 규격이나 성능을 나타내지 않습니다.</p>
  </ExpansionFrame>
}

function HeritageMode() {
  const [step, setStep] = useState<'start' | 'photo' | 'space' | 'era' | 'light' | 'explore' | 'compare' | 'exhibit' | 'ai' | 'notes'>('start')
  const [config, setConfig] = useState<HeritageConfig>(initialHeritage)
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const pick = useMemo(() => photo ? photoHeritage(photo) : null, [photo])
  const [shot, setShot] = useState<string | null>(null)
  const [imageParams, setImageParams] = useState<ImageParams | null>(null)
  const { ai, done, start, apply } = useInteractiveAi('heritage', photo, shot)
  const [point, setPoint] = useState<string | null>(null)
  const [visits, setVisits] = useState<string[]>([])
  const exhibit = useExhibit('heritage')
  const result = useMemo(() => heritageResult(config, visits, photo && pick ? photoPickSection('heritage', photo, pick.reasons) : null), [config, visits, photo, pick])
  const update = (patch: Partial<HeritageConfig>) => setConfig(value => ({ ...value, ...patch }))
  const scene = HERITAGE_SCENES.find(item => item.id === config.scene)!
  const points = HERITAGE_POINTS[config.scene]
  const selectedPoint = points.find(item => item.id === point)
  const toExplore = () => { update({ comparison: null }); setStep('explore') }
  if (step === 'start') return <ExpansionStart id="heritage" headline="시간과 빛을 따라 걷는 궁궐" description="장면을 바꾸고 관심 지점을 열어 보는, 전통 공간의 작은 탐험입니다." onStart={() => setStep('photo')} />
  if (step === 'photo') return <PhotoStep id="heritage" reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); ai.reset(); setPoint(null); setConfig(value => ({ ...value, ...photoHeritage(made).patch })) }} onNext={() => setStep('space')} onBack={() => setStep('start')} onSkip={() => { setPhoto(null); setShot(null); setPoint(null); setConfig(initialHeritage()); setStep('space') }} />
  // 탐험 노트 — AI 해설과 타임머신 사진(고른 장면·시대·빛으로)
  const finish = () => {
    const params: ImageParams | null = shot ? { id: 'heritage', scene: config.scene, era: config.era, light: config.light } : null
    setImageParams(params)
    setStep('ai')
    start(`고른 장면: ${scene.name} · ${config.era === 'past' ? '옛 풍경' : '오늘의 풍경'} · ${config.light === 'day' ? '맑은 낮' : config.light === 'dusk' ? '해 질 녘' : '고요한 밤'}. 살펴본 곳: ${visits.join(', ') || '없음'}.${pick ? ` 사진으로 고른 첫 설정: ${pick.reasons.join(', ')}.` : ''}`, params, () => setStep('notes'))
  }
  if (step === 'ai') return <AiWait id="heritage" state={ai.state} onRetry={finish} onSkip={() => { ai.skip(); setStep('notes') }} onBack={() => { ai.reset(); toExplore() }} />
  if (step === 'notes') return <ExpansionFrame title="나의 탐험 노트" onBack={toExplore} screen={120} actions={<TakeActions result={apply(result)} image={imageParams ? done?.image ?? null : null} imageLabel={IMAGE_LABEL.heritage} />}>{imageParams && shot && done && <AiImage src={done.image} label={IMAGE_LABEL.heritage} failed={done.imageFailed} retrying={done.imageRetrying} onRetry={() => void ai.retryImage(imageParams, shot)} />}<ResultPanel result={apply(result)} /></ExpansionFrame>
  if (step === 'space') return <ExpansionFrame title="어디를 탐험해 볼까요?" subtitle="교육용 개념 재현 · 특정 유적의 복원 자료가 아닙니다." onBack={() => setStep('photo')} actions={<BackNext back={() => setStep('photo')} next={() => setStep('era')} />}>{pick && <PhotoPicks reasons={pick.reasons} />}<div className="ex-stack ix-visual-choices">{HERITAGE_SCENES.map(item => <ChoiceTile key={item.id} label={item.name} note={item.note} selected={config.scene === item.id} onClick={() => { update({ scene: item.id }); setPoint(null) }}><HeritageScene config={{ ...config, scene: item.id, comparison: null }} /></ChoiceTile>)}</div></ExpansionFrame>
  if (step === 'era') return <ExpansionFrame title="어떤 풍경으로 들어갈까요?" subtitle="전통 공간의 옛 풍경과 오늘의 탐방 풍경을 비교해요." onBack={() => setStep('space')} actions={<BackNext back={() => setStep('space')} next={() => setStep('light')} />}><HeritageScene config={config} /><div className="ex-grid"><ChoiceTile label="옛 풍경" note="등불과 열린 마당" selected={config.era === 'past'} onClick={() => update({ era: 'past' })} /><ChoiceTile label="오늘의 풍경" note="탐방 안내와 보행로" selected={config.era === 'present'} onClick={() => update({ era: 'present' })} /></div><p className="ex-note">실제 시대별 사진이 아니라 공간의 변화에 주목한 개념 장면입니다.</p></ExpansionFrame>
  if (step === 'light') return <ExpansionFrame title="어떤 빛으로 바라볼까요?" onBack={() => setStep('era')} actions={<BackNext back={() => setStep('era')} next={toExplore} nextLabel="탐험 시작" />}><HeritageScene config={config} /><div className="ex-grid">{([['day', '맑은 낮', '건축의 선과 색'], ['dusk', '해 질 녘', '따뜻한 하늘빛'], ['night', '고요한 밤', '달과 창의 불빛']] as const).map(([id, label, note]) => <ChoiceTile key={id} label={label} note={note} selected={config.light === id} onClick={() => update({ light: id })} />)}</div></ExpansionFrame>
  if (step === 'exhibit') return <ExpansionFrame title="탐험 장면을 함께 보기" onBack={() => setStep('explore')} busy={exhibit.sending} actions={<PrimaryButton onClick={() => setStep('explore')}>키오스크에서 탐험 계속</PrimaryButton>}><HeritageScene config={config} /><ExhibitLink exhibit={exhibit} command={{ kind: 'heritage', config }} /><p className="ex-note">연결 전시 없이도 모든 장면을 여기에서 살펴볼 수 있어요.</p></ExpansionFrame>
  if (step === 'compare') return <ExpansionFrame title="옛 모습과 오늘 모습을 나란히" subtitle="가운데 경계를 밀어 달라진 공간을 찾아보세요." onBack={toExplore} actions={<BackNext back={toExplore} next={finish} nextLabel="탐험 기록 보기" />}><HeritageScene config={config} /><Slider label="비교 경계" value={config.comparison ?? 50} suffix="%" onChange={comparison => update({ comparison })} /><div className="ex-panel"><h3>같은 공간, 다른 쓰임</h3><p>건물과 자연의 형태는 유지하고 등불·안내판·길을 다르게 표현했어요. 어떤 요소가 눈에 들어오나요?</p></div><PrimaryButton secondary onClick={() => setStep('exhibit')}>이 비교 장면 전시에 보내기</PrimaryButton><p className="ex-note">두 장면 모두 교육용 개념 재현입니다.</p></ExpansionFrame>
  return <ExpansionFrame title={scene.name} subtitle="동그란 표시를 눌러 공간의 이야기를 열어 보세요." onBack={() => setStep('light')} actions={<BackNext back={() => setStep('space')} next={finish} nextLabel={`탐험 기록 · ${visits.length}`} />}>
    <div className="ix-hotspot-scene"><HeritageScene config={config} />{points.map((item, index) => <button type="button" className="ix-hotspot" key={item.id} style={{ left: `${item.x}%`, top: `${item.y}%` }} aria-label={item.name} aria-pressed={point === item.id} onClick={() => { setPoint(item.id); const visit = `${scene.name} · ${item.name}`; setVisits(list => list.includes(visit) ? list : [...list, visit]) }}>{index + 1}</button>)}</div>
    <div className="ex-panel ix-hotspot-story" aria-live="polite"><h3>{selectedPoint?.name ?? '이 장면에서 무엇이 보이나요?'}</h3><p>{selectedPoint?.text ?? '1·2·3 표시를 열면 탐험 노트에 내가 살펴본 곳이 기록됩니다.'}</p></div>
    <div className="ix-mission-tabs">{(['day', 'dusk', 'night'] as const).map((light, index) => <button type="button" key={light} aria-pressed={config.light === light} onClick={() => update({ light })}>{['낮', '노을', '밤'][index]}</button>)}</div>
    <div className="ix-button-grid"><PrimaryButton secondary onClick={() => { update({ comparison: 50 }); setStep('compare') }}>옛 모습 · 오늘 비교</PrimaryButton><PrimaryButton secondary onClick={() => setStep('exhibit')}><Monitor size={18} /> 전시에 보내기</PrimaryButton></div><p className="ex-note">교육용 개념 재현 · 특정 궁궐을 고증한 복원 자료가 아닙니다.</p>
  </ExpansionFrame>
}

const emptyWall = (): WallDraft => ({ text: '', color: '#F1D481', shape: 'note', x: 50, y: 50 })
function VisionWallMode() {
  const [step, setStep] = useState<'start' | 'guide' | 'photo' | 'message' | 'design' | 'place' | 'confirm' | 'send' | 'ai' | 'result'>('start')
  const [draft, setDraft] = useState<WallDraft>(emptyWall)
  const [photo, setPhoto] = useState<PhotoReading | null>(null)
  const pick = useMemo(() => photo ? photoWall(photo) : null, [photo])
  const [shot, setShot] = useState<string | null>(null)
  const { ai, start, apply } = useInteractiveAi('vision-wall', photo, shot)
  const [keyboard, setKeyboard] = useState(false)
  const [consent, setConsent] = useState(false)
  const [result, setResult] = useState<ExperienceResult | null>(null)
  const exhibit = useExhibit('vision-wall')
  const update = (patch: Partial<WallDraft>) => { setDraft(value => ({ ...value, ...patch })); setConsent(false) }
  const valid = draft.text.trim().length > 0 && [...draft.text].length <= 60
  if (step === 'start') return <ExpansionStart id="vision-wall" headline="한 문장이 모여, 우리의 내일로" description="마음속 비전을 적고 모양을 골라 함께 보는 전시 화면에 남겨요." onStart={() => setStep('guide')} />
  const analyze = () => { setStep('ai'); start(`손님이 쓴 비전 문장: ${draft.text}. 카드 색 ${WALL_COLOR_NAMES[(EXHIBIT_COLORS as readonly string[]).indexOf(draft.color)] ?? ''} · 모양 ${draft.shape === 'circle' ? '원' : draft.shape === 'arch' ? '아치' : '메모'}. 전시 화면에 게시를 확인했다.`, null, () => setStep('result')) }
  if (step === 'ai') return <AiWait id="vision-wall" state={ai.state} onRetry={analyze} onSkip={() => { ai.skip(); setStep('result') }} onBack={() => { ai.reset(); setStep('send') }} />
  if (step === 'result' && result) { const final = apply(result); return <ExpansionFrame title="전시 화면에 내 문장이 나타났어요" subtitle="수신 화면의 실제 표시를 확인했습니다." onBack={() => setStep('send')} screen={120} actions={<TakeActions result={final} />}><div className="ix-wall-board"><VisionTile message={draft} placed /></div><ResultPanel result={final} /></ExpansionFrame> }
  if (step === 'guide') return <ExpansionFrame title="우리는 어떤 내일을 꿈꾸나요?" subtitle="짧은 문장으로 함께 만드는 비전 월" onBack={() => setStep('start')} actions={<BackNext back={() => setStep('start')} next={() => setStep('photo')} nextLabel="사진 찍고 쓰기" />}><div className="ix-wall-guide"><VisionTile message={{ ...emptyWall(), text: '서로의 작은 시작을 응원해요', x: 30, y: 35 }} /><Pill>미리보기 예시 · 아직 게시되지 않았어요</Pill></div><div className="ex-panel"><h3>내 문장은 이렇게 전해져요</h3><ol className="ix-instructions"><li>60자 안으로 함께 나누고 싶은 말을 적어요.</li><li>색상·모양·위치를 고르고 공개 내용을 확인해요.</li><li>전시 화면에서 표시가 확인되면 참여 카드를 받을 수 있어요.</li></ol><p className="ex-note">공개되는 문장에는 이름·연락처 같은 개인정보를 적지 마세요.</p></div></ExpansionFrame>
  if (step === 'photo') return <PhotoStep id="vision-wall" reading={photo} onRead={(made, taken) => { setPhoto(made); setShot(taken); ai.reset(); update(photoWall(made).patch) }} onNext={() => setStep('message')} onBack={() => setStep('guide')} onSkip={() => { setPhoto(null); setShot(null); update({ color: emptyWall().color, shape: emptyWall().shape }); setStep('message') }} />
  if (step === 'message') return <ExpansionFrame title="마음속 한 문장을 적어 주세요" subtitle="우리의 내일에 보태고 싶은 말 · 최대 60자" onBack={() => setStep('photo')} actions={!keyboard ? <BackNext back={() => setStep('photo')} next={() => setStep('design')} disabled={!valid} /> : undefined}>
    <button type="button" className="ix-message-input" onClick={() => setKeyboard(true)} aria-label="비전 메시지 입력" aria-haspopup="dialog"><span>{draft.text || '함께 만들어 갈 내일은 어떤 모습인가요?'}</span><small>{[...draft.text].length} / 60 · 눌러서 입력</small></button><p className="ex-note">다음 단계에서 색상과 모양을 고를 수 있어요.</p>{keyboard && <KxKeyboard value={draft.text} onChange={text => update({ text: [...text].slice(0, 60).join('') })} onClose={() => setKeyboard(false)} maxLength={60} hint="함께 나눌 비전 메시지" />}
  </ExpansionFrame>
  if (step === 'design') return <ExpansionFrame title="내 문장에 어울리는 모양" onBack={() => setStep('message')} actions={<BackNext back={() => setStep('message')} next={() => setStep('place')} />}><div className="ix-wall-guide"><VisionTile message={draft} /></div><div className="ix-swatches ix-swatches--wall" aria-label="메시지 색상">{EXHIBIT_COLORS.map((color, index) => <button type="button" key={color} className="ix-swatch" aria-label={`${['햇살', '코럴', '세이지', '라벤더', '라일락', '아이보리'][index]} 색상`} aria-pressed={draft.color === color} onClick={() => update({ color })}><i style={{ background: color }} /></button>)}</div><div className="ex-grid">{([['note', '메모'], ['circle', '원'], ['arch', '아치']] as const).map(([shape, label]) => <ChoiceTile key={shape} label={label} selected={draft.shape === shape} onClick={() => update({ shape })} />)}</div>{pick && <PhotoPicks reasons={pick.reasons} />}</ExpansionFrame>
  if (step === 'place') return <ExpansionFrame title="어디에 내 문장을 놓을까요?" subtitle="미리보기의 빈 곳을 누르거나 위치를 조절해 보세요." onBack={() => setStep('design')} actions={<BackNext back={() => setStep('design')} next={() => setStep('confirm')} nextLabel="공개 전 확인" />}><div className="ix-wall-board" onPointerDown={e => { const bounds = e.currentTarget.getBoundingClientRect(); update({ x: Math.round(Math.max(10, Math.min(90, (e.clientX - bounds.left) / bounds.width * 100))), y: Math.round(Math.max(15, Math.min(85, (e.clientY - bounds.top) / bounds.height * 100))) }) }}><VisionTile message={draft} placed /></div><Slider label="가로 위치" value={draft.x} min={10} max={90} suffix="%" onChange={x => update({ x })} /><Slider label="세로 위치" value={draft.y} min={15} max={85} suffix="%" onChange={y => update({ y })} /><p className="ex-note">전시의 다른 문장과 겹칠 수 있어요. 위치는 화면 안쪽으로 맞춰 표시됩니다.</p></ExpansionFrame>
  if (step === 'confirm') return <ExpansionFrame title="이 문장을 함께 볼까요?" subtitle="전송하기 전에 공개할 내용을 확인해 주세요." onBack={() => setStep('place')} actions={<BackNext back={() => setStep('message')} next={() => setStep('send')} disabled={!valid || !consent} nextLabel="전시에 보내기" />}><div className="ix-wall-guide"><VisionTile message={draft} /></div><label className="ix-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>이 문장이 연결된 전시 화면에 공개되는 것을 확인했어요.</span></label><p className="ex-note">개인정보나 다른 사람을 불편하게 하는 내용이 없는지 한 번 더 살펴보세요.</p></ExpansionFrame>
  return <ExpansionFrame title="내 문장을 전시에 보내기" subtitle="전시 화면의 표시를 확인한 뒤 완료됩니다." onBack={() => setStep('confirm')} busy={exhibit.sending} actions={<PrimaryButton secondary disabled={exhibit.sending} onClick={() => setStep('confirm')}>작성 내용 확인하기</PrimaryButton>}><div className="ix-wall-guide"><VisionTile message={draft} /></div><ExhibitLink exhibit={exhibit} command={{ kind: 'vision-wall', message: draft }} label="확인한 문장 게시하기" onSent={at => { if (!consent || !valid) return; setResult(wallResult(draft, at, photo && pick ? photoPickSection('vision-wall', photo, pick.reasons, '사진은 전시 화면에 보내지 않았어요. 문장과 카드 색·모양만 게시했어요.') : null)); analyze() }} /><p className="ex-note">전시가 연결되지 않으면 문장은 게시되지 않아요. 연결을 확인하는 동안 작성 내용은 유지됩니다.</p></ExpansionFrame>
}

export default function InteractiveModes({ id }: { id: InteractiveId }) {
  if (id === 'science') return <ScienceMode />
  if (id === 'product') return <ProductMode />
  if (id === 'heritage') return <HeritageMode />
  return <VisionWallMode />
}
