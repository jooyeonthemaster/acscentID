'use client'

// 추억 무비 — 휴대폰 QR 로 사진 5~20장 받기(삭제·추가·순서) → 음악·제목·길이 → 영상 만들기(브라우저) → 재생·수정 → QR 저장.
// 사진은 올린 순서대로 시작하고, 부스에서 순서를 바꾼다. 5장이 모이기 전에는 다음으로 갈 수 없다.
// 화면을 떠나면 올라온 사진은 지운다(useAlbum). AI 영상이 아니라 사진을 이어 붙인 편집 영상이다.

import { AlertTriangle, ArrowLeft, ArrowRight, Film, ImagePlus, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultChoices, optionOf } from '@/lib/booth/programs/catalog'
import { useAlbum, useCountdown, type AlbumPhoto, type FlowCtx } from './flow'
import { gowun, pen, playfair } from './fonts'
import { MusicPreview, VideoSave } from './MvFlow'
import type { MusicId } from './music'
import { Creative, OptionGroups, PanelHead, Progress, Split, Stages, VideoPlayer, formatTime } from './ui'
import { RenderCancelled, loadImage, renderMovie } from './video'

const MIN = 5
const MAX = 20

type Step = 'upload' | 'edit' | 'render' | 'result' | 'save'

export function MovieFlow({ ctx }: { ctx: FlowCtx }) {
  const { program } = ctx
  const [step, setStep] = useState<Step>('upload')
  const album = useAlbum(ctx.getTicket, true, `n=${MAX}&for=movie`)
  /** 부스에서 정한 순서(사진 이름) — 새로 올라온 사진은 뒤에 붙는다 */
  const [order, setOrder] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [choices, setChoices] = useState(() => defaultChoices(program))
  const [video, setVideo] = useState<{ blob: Blob; url: string } | null>(null)
  const [replay, setReplay] = useState(0)

  /** 부스에서 정한 순서 + 새로 올라온 사진은 뒤에 */
  const names = useMemo(() => {
    const all = album.photos.map((p) => p.name)
    const kept = order.filter((n) => all.includes(n))
    return [...kept, ...all.filter((n) => !kept.includes(n))]
  }, [order, album.photos])
  const photos = useMemo(() => names.map((n) => album.photos.find((p) => p.name === n)).filter((p): p is AlbumPhoto => !!p).slice(0, MAX), [names, album.photos])

  const { setStep: showStep, setDirty } = ctx
  useEffect(() => { showStep(step === 'upload' ? 1 : step === 'edit' ? 2 : 3) }, [step, showStep])
  useEffect(() => { setDirty(photos.length > 0) }, [photos.length, setDirty])
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url) }, [video])

  const move = (dir: -1 | 1) => {
    if (!selected) return
    setOrder(() => {
      const list = names
      const i = list.indexOf(selected)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const title = optionOf(program, 'title', choices.title)?.label ?? ''
  const seconds = Number(choices.length) || 15

  return (
    <>
      {step === 'upload' && (
        <UploadStep album={album} photos={photos} onRemove={(p) => void album.remove(p)} onNext={() => setStep('edit')} />
      )}
      {step === 'edit' && (
        <Split className="pg-options pg-movie-edit" visual={<SlidePreview photos={photos} title={title} />}>
          <PanelHead title={program.options.title} sub={program.options.sub} eyebrow="2 / 3" />
          <OptionGroups groups={program.options.groups} choices={choices} onChange={(g, o) => setChoices((c) => ({ ...c, [g]: o }))} />
          <MusicPreview key={choices.music} music={choices.music as MusicId} />
          <div className="pg-order">
            <p><b>사용할 사진 {photos.length}장</b> · 사진을 누르고 화살표로 순서를 바꿔요</p>
            <ol className="pg-order-strip">
              {photos.map((p, i) => (
                <li key={p.name}>
                  <button type="button" aria-pressed={selected === p.name} onClick={() => setSelected(selected === p.name ? null : p.name)} aria-label={`${i + 1}번째 사진`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" width={72} height={72} />
                    <i>{i + 1}</i>
                  </button>
                </li>
              ))}
            </ol>
            <div className="pg-order-tools">
              <button type="button" className="pg-btn pg-btn--chip" disabled={!selected || names.indexOf(selected) <= 0} onClick={() => move(-1)}><ArrowLeft size={20} />앞으로</button>
              <button type="button" className="pg-btn pg-btn--chip" disabled={!selected || names.indexOf(selected) >= photos.length - 1} onClick={() => move(1)}>뒤로<ArrowRight size={20} /></button>
              <button type="button" className="pg-btn pg-btn--chip" disabled={!selected || photos.length <= MIN} onClick={() => { const p = photos.find((x) => x.name === selected); if (p) void album.remove(p); setSelected(null) }}><Trash2 size={18} />빼기</button>
            </div>
          </div>
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={() => setStep('upload')}><ImagePlus size={20} />사진 수정</button>
            <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" disabled={photos.length < MIN} onClick={() => setStep('render')}>{program.options.cta}<span aria-hidden="true">→</span></button>
          </div>
        </Split>
      )}
      {step === 'render' && (
        <MovieRender
          ctx={ctx} photos={photos} title={title} music={choices.music as MusicId} seconds={seconds}
          onDone={(v) => { setVideo(v); setStep('result'); ctx.onResult() }}
          onBack={() => setStep('edit')}
        />
      )}
      {step === 'result' && video && (
        <Split className="pg-result pg-result--video" visual={<VideoPlayer src={video.url} autoPlay className="pg-player--main" />}>
          <PanelHead title={program.result.title} sub={program.result.sub} />
          <p className="pg-chip-line"><Film size={18} />사진 {photos.length}장 · {seconds}초 · {optionOf(program, 'music', choices.music)?.label}</p>
          <div className="pg-thumbs">
            {photos.slice(0, 6).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.name} src={p.url} alt="" width={80} height={80} />
            ))}
          </div>
          <Creative text={program.creative} />
          <div className="pg-actions">
            <button type="button" className="pg-btn pg-btn--line" onClick={() => { setVideo(null); setStep('edit') }}><ImagePlus size={20} />사진 · 음악 수정</button>
            <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" onClick={() => setStep('save')}>영상 저장하기<span aria-hidden="true">→</span></button>
          </div>
        </Split>
      )}
      {step === 'save' && video && (
        <VideoSave ctx={ctx} blob={video.blob} visual={<VideoPlayer src={video.url} className="pg-player--main" replayKey={replay} />} onReplay={() => setReplay((n) => n + 1)} />
      )}
    </>
  )
}

function UploadStep({ album, photos, onRemove, onNext }: {
  album: ReturnType<typeof useAlbum>
  photos: AlbumPhoto[]
  onRemove: (p: AlbumPhoto) => void
  onNext: () => void
}) {
  const left = useCountdown(album.expiresAt, album.status === 'ready')
  const [confirmClear, setConfirmClear] = useState(false)
  const visual = (
    <div className="pg-movie-qr">
      <div className="pg-phone" aria-hidden="true"><i /></div>
      <div className="pg-movie-qr-card">
        <b>QR을 스캔해 사진을 보내 주세요</b>
        {album.qr && album.status === 'ready' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.qr} alt="사진 올리기 QR" width={240} height={240} />
        ) : album.status === 'expired' ? (
          <button type="button" className="pg-btn pg-btn--accent" onClick={album.reissue}><RefreshCw size={20} />QR 다시 받기</button>
        ) : album.status === 'error' ? (
          <>
            <p className="pg-error-text" role="alert"><AlertTriangle size={18} />{album.error}</p>
            <button type="button" className="pg-btn pg-btn--line" onClick={() => void album.retry()}>다시 시도</button>
          </>
        ) : (
          <span className="pg-spin-box" aria-busy="true" />
        )}
        <span className="pg-pill">사진 {MIN}~{MAX}장</span>
        <small>{album.status === 'expired' ? '연결 시간이 지났어요. 받은 사진은 그대로예요.' : album.status === 'ready' ? `휴대폰에서 바로 사진을 보낼 수 있어요 · 연결 ${formatTime(left)} 남음` : ''}</small>
      </div>
    </div>
  )
  return (
    <Split className="pg-capture-step pg-movie-upload" visual={visual}>
      <PanelHead title="함께 담을 사진을 골라요" sub="작은 사진들이 모여, 특별한 이야기가 됩니다" />
      <p className="pg-upload-count" aria-live="polite">
        <b>{photos.length >= MIN ? `사진 ${photos.length}장 업로드 완료` : `사진 ${photos.length}장 받음 · ${MIN - photos.length}장 더 필요해요`}</b>
        <span>{photos.length} / {MAX}</span>
      </p>
      <ul className="pg-upload-grid">
        {photos.map((p, i) => (
          <li key={p.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${i + 1}번째 사진`} width={120} height={120} />
            <i>{i + 1}</i>
            <button type="button" onClick={() => onRemove(p)} aria-label={`${i + 1}번째 사진 지우기`}><X size={20} /></button>
          </li>
        ))}
        {photos.length < MAX && (
          <li className="pg-upload-add"><ImagePlus size={28} aria-hidden="true" /><span>휴대폰에서 사진 추가하기</span></li>
        )}
      </ul>
      <div className="pg-actions">
        <button type="button" className="pg-btn pg-btn--line" disabled={!photos.length} onClick={() => setConfirmClear(true)}><RotateCcw size={20} />선택 초기화</button>
        <button type="button" className="pg-btn pg-btn--accent pg-btn--grow" disabled={photos.length < MIN} onClick={onNext}>이 사진으로 만들기<span aria-hidden="true">→</span></button>
      </div>
      {confirmClear && (
        <div className="pg-inline-confirm" role="alertdialog" aria-label="사진 모두 지우기">
          <p>받은 사진 {photos.length}장을 모두 지울까요?</p>
          <button type="button" className="pg-btn pg-btn--line" onClick={() => setConfirmClear(false)}>취소</button>
          <button type="button" className="pg-btn pg-btn--accent" onClick={() => { void album.clear(); setConfirmClear(false) }}>모두 지우기</button>
        </div>
      )}
    </Split>
  )
}

function SlidePreview({ photos, title }: { photos: AlbumPhoto[]; title: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setI((n) => n + 1), 1600)
    return () => window.clearInterval(timer)
  }, [])
  const current = photos.length ? photos[i % photos.length] : null
  return (
    <div className="pg-slide">
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={current.name} src={current.url} alt="" />
      )}
      <b>{title}</b>
      <span>미리보기 · {photos.length ? `${(i % photos.length) + 1} / ${photos.length}` : ''}</span>
    </div>
  )
}

function MovieRender({ ctx, photos, title, music, seconds, onDone, onBack }: {
  ctx: FlowCtx; photos: AlbumPhoto[]; title: string; music: MusicId; seconds: number
  onDone: (v: { blob: Blob; url: string }) => void
  onBack: () => void
}) {
  const { program } = ctx
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const [stage, setStage] = useState(0)
  const [ratio, setRatio] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const done = useRef(onDone)
  done.current = onDone
  const run = useCallback(() => setAttempt((n) => n + 1), [])
  useEffect(() => {
    let cancel = () => {}
    let alive = true
    ctx.setBusy(true); setError(null); setStage(0); setRatio(null)
    ;(async () => {
      try {
        const images = await Promise.all(photos.map((p) => loadImage(p.url)))
        if (!alive || !canvas.current) return
        setStage(1); setRatio(0)
        const handle = renderMovie({
          photos: images, title, music, duration: seconds, canvas: canvas.current,
          fonts: { display: playfair.style.fontFamily, script: pen.style.fontFamily, body: gowun.style.fontFamily },
          onProgress: (r) => { setRatio(r); if (r > 0.9) setStage(2) },
        })
        cancel = handle.cancel
        const blob = await handle.result
        if (alive) done.current({ blob, url: URL.createObjectURL(blob) })
      } catch (cause) {
        if (alive && !(cause instanceof RenderCancelled)) setError(cause instanceof Error ? cause.message : '영상을 만들지 못했어요.')
      } finally {
        ctx.setBusy(false)
      }
    })()
    return () => { alive = false; cancel(); ctx.setBusy(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])
  return (
    <Split className="pg-generating" visual={<canvas ref={canvas} className="pg-render-canvas" aria-label="만들고 있는 영상" />}>
      {error ? (
        <>
          <div className="pg-error-icon" aria-hidden="true"><AlertTriangle size={44} /></div>
          <PanelHead title="잠시 문제가 생겼어요" sub="받은 사진과 고른 음악은 그대로예요" />
          <p className="pg-error-text" role="alert">{error}</p>
          <div className="pg-stack">
            <button type="button" className="pg-btn pg-btn--accent pg-btn--wide" onClick={run}><RefreshCw size={20} />다시 만들기</button>
            <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={onBack}>사진 · 음악 수정</button>
          </div>
        </>
      ) : (
        <>
          <PanelHead title={program.generating.title} sub={program.generating.sub} />
          <Progress ratio={ratio} caption={ratio === null ? '사진을 불러오는 중' : `영상 ${seconds}초를 만드는 중`} />
          <Stages labels={program.generating.stages} active={stage} />
          <Creative text={program.creative} />
          <button type="button" className="pg-btn pg-btn--line pg-btn--wide" onClick={ctx.requestHome}>처음으로</button>
        </>
      )}
    </Split>
  )
}
