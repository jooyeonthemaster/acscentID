'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 카운터 이용권 발급 화면 (/booth/counter)
 *
 * 직원이 결제 후 장수 버튼을 누르면 이용권이 발급되고 곧바로 영수증 프린터로 쪽지가 나온다.
 * 카운터 PC 크롬을 --kiosk-printing 으로 띄우면 인쇄 창 없이 기본 프린터로 바로 출력된다
 * (docs/photobooth-counter-pass.md). 쪽지 한 장 = 인쇄 한 페이지라, 프린터 드라이버의
 * '페이지마다 자르기'를 켜 두면 한 장씩 잘려 나온다.
 */

/** 쪽지 한 장 높이 — 프린터에서 여백이 남거나 잘리면 이 값만 조정 */
const SLIP_HEIGHT_MM = 90
const ISSUE_COUNTS = [1, 2, 3, 4]
const REFRESH_MS = 20_000

interface CounterPass {
  id: string
  code: string
  status: 'issued' | 'used' | 'void'
  created_at: string
  used_at?: string | null
  expires_at: string | null
}

interface PrintJob {
  id: number
  passes: CounterPass[]
  event: string | null
  test?: boolean
}

type Access = 'counter' | 'admin' | null

const kst = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', ...options })

/** 자정 만료는 '23:59까지'로 보여 준다 (자정 = 다음 날 0시라 날짜가 헷갈린다) */
function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return '기한 없음'
  const last = new Date(Date.parse(expiresAt) - 60_000).toISOString()
  return `${kst(last, { month: 'long', day: 'numeric', weekday: 'short' })} ${kst(last, { hour: '2-digit', minute: '2-digit', hour12: false })}까지`
}

const spacedCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`
const expired = (pass: CounterPass) => !!pass.expires_at && Date.parse(pass.expires_at) <= Date.now()

export function CounterClient() {
  const [access, setAccess] = useState<Access | 'loading'>('loading')
  const [configured, setConfigured] = useState(true)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [passes, setPasses] = useState<CounterPass[]>([])
  const [stats, setStats] = useState({ issued: 0, used: 0, voided: 0 })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [printJob, setPrintJob] = useState<PrintJob | null>(null)
  const jobSeq = useRef(0)

  const say = useCallback((tone: 'ok' | 'error', text: string) => {
    setNotice({ tone, text })
    window.setTimeout(() => setNotice((current) => (current?.text === text ? null : current)), 5000)
  }, [])

  const checkAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/photobooth/counter', { cache: 'no-store' })
      const data = await res.json()
      setConfigured(!!data.configured)
      setAccess(data.access ?? null)
    } catch {
      setAccess(null)
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/photobooth/counter/passes', { cache: 'no-store' })
      if (res.status === 401) {
        setAccess(null)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPasses(data.passes ?? [])
      setStats(data.stats ?? { issued: 0, used: 0, voided: 0 })
    } catch {
      // 네트워크가 잠깐 끊겨도 화면은 그대로 두고 다음 새로고침에 다시 읽는다
    }
  }, [])

  useEffect(() => {
    void checkAccess()
  }, [checkAccess])

  useEffect(() => {
    if (access !== 'counter' && access !== 'admin') return
    void load()
    const timer = window.setInterval(() => { if (!document.hidden) void load() }, REFRESH_MS)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [access, load])

  // 쪽지가 화면(인쇄 영역)에 그려진 다음 인쇄한다
  useEffect(() => {
    if (!printJob) return
    const frame = window.requestAnimationFrame(() => window.setTimeout(() => window.print(), 50))
    return () => window.cancelAnimationFrame(frame)
  }, [printJob])

  const pair = async (event: React.FormEvent) => {
    event.preventDefault()
    setPinError('')
    try {
      const res = await fetch('/api/photobooth/counter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '연결에 실패했습니다')
      setPin('')
      await checkAccess()
    } catch (error) {
      setPinError(error instanceof Error ? error.message : '연결에 실패했습니다')
    }
  }

  const unpair = async () => {
    if (!window.confirm('이 기기의 카운터 연결을 해제할까요? 다시 쓰려면 PIN 을 입력해야 합니다.')) return
    await fetch('/api/photobooth/counter', { method: 'DELETE' }).catch(() => null)
    await checkAccess()
  }

  const issue = async (count: number) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/photobooth/counter/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '발급에 실패했습니다')
      setPrintJob({ id: ++jobSeq.current, passes: data.passes, event: data.event ?? null })
      say('ok', `이용권 ${count}장을 출력했어요`)
      void load()
    } catch (error) {
      say('error', error instanceof Error ? error.message : '발급에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  const reprint = (pass: CounterPass) => {
    setPrintJob({ id: ++jobSeq.current, passes: [pass], event: null })
    say('ok', `${spacedCode(pass.code)} 다시 출력했어요`)
  }

  const testPrint = () => {
    const now = new Date()
    const midnight = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    setPrintJob({
      id: ++jobSeq.current,
      test: true,
      event: null,
      passes: [{ id: 'test', code: '000000', status: 'issued', created_at: now.toISOString(), expires_at: midnight }],
    })
  }

  const voidPass = async (pass: CounterPass) => {
    if (!window.confirm(`${spacedCode(pass.code)} 이용권을 취소할까요? 취소하면 부스에서 쓸 수 없습니다.`)) return
    const res = await fetch('/api/photobooth/counter/passes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pass.id }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    if (!res?.ok) say('error', data.error || '취소에 실패했습니다')
    else say('ok', `${spacedCode(pass.code)} 취소했어요`)
    void load()
  }

  return (
    <>
      <style>{`
        @media screen { .counter-print { display: none; } }
        @media print {
          @page { size: 80mm ${SLIP_HEIGHT_MM}mm; margin: 0; }
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          .counter-screen { display: none !important; }
          .counter-print, .counter-print * { visibility: visible; }
          .counter-print { position: absolute; left: 0; top: 0; width: 80mm; }
        }
        .counter-slip {
          box-sizing: border-box; width: 80mm; height: ${SLIP_HEIGHT_MM}mm; padding: 5mm 4mm 0;
          break-after: page; page-break-after: always; overflow: hidden;
          color: #000; text-align: center; font-family: var(--font-heading-serif), 'Malgun Gothic', sans-serif;
        }
        .counter-slip:last-child { break-after: auto; page-break-after: auto; }
      `}</style>

      <main className="counter-screen min-h-svh bg-neutral-100 text-neutral-900">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] text-neutral-500">AC&apos;SCENT PHOTO</p>
              <h1 className="text-2xl font-black">포토부스 이용권 발급</h1>
            </div>
            {access === 'counter' && (
              <button type="button" onClick={unpair} className="text-sm text-neutral-500 underline">
                기기 연결 해제
              </button>
            )}
            {access === 'admin' && <span className="text-sm text-neutral-500">관리자 계정으로 사용 중</span>}
          </header>

          {access === 'loading' && <p className="py-20 text-center text-neutral-500">확인 중…</p>}

          {access === null && (
            <form onSubmit={pair} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">이 기기를 카운터로 연결</h2>
              {configured ? (
                <>
                  <p className="text-sm text-neutral-600">
                    처음 한 번만 카운터 PIN 을 입력하면 이 기기에서 이용권을 발급할 수 있어요(180일 유지).
                  </p>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="카운터 PIN"
                    aria-label="카운터 PIN"
                    className="h-14 rounded-xl border-2 border-neutral-300 px-4 text-xl tracking-widest"
                  />
                  {pinError && <p className="text-sm font-semibold text-red-600">{pinError}</p>}
                  <button type="submit" disabled={!pin} className="h-14 rounded-xl bg-neutral-900 text-lg font-bold text-white disabled:opacity-40">
                    연결하기
                  </button>
                </>
              ) : (
                <p className="text-sm text-neutral-600">
                  카운터 PIN 이 아직 설정되지 않았어요. 서버 환경변수 <code className="font-mono">PHOTOBOOTH_COUNTER_PIN</code>
                  (6자리 이상)을 설정한 뒤 다시 열어 주세요. 관리자 계정으로 로그인한 상태라면 바로 쓸 수 있어요.
                </p>
              )}
            </form>
          )}

          {(access === 'counter' || access === 'admin') && (
            <>
              <section className="grid grid-cols-3 gap-3 text-center">
                {[
                  ['오늘 발급', stats.issued],
                  ['사용됨', stats.used],
                  ['남은 이용권', Math.max(0, stats.issued - stats.used)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white py-4 shadow-sm">
                    <p className="text-xs font-semibold text-neutral-500">{label}</p>
                    <p className="text-3xl font-black tabular-nums">{value}</p>
                  </div>
                ))}
              </section>

              <section className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">결제한 인원만큼 누르세요</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ISSUE_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      disabled={busy}
                      onClick={() => issue(count)}
                      className="flex h-28 flex-col items-center justify-center rounded-2xl bg-neutral-900 text-white transition active:scale-[0.98] disabled:opacity-40"
                    >
                      <span className="text-4xl font-black tabular-nums">{count}</span>
                      <span className="text-sm font-semibold opacity-80">장 출력</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">
                  이용권은 오늘 자정까지 한 번 쓸 수 있어요. 인쇄가 안 됐으면 아래 목록에서 다시 출력하세요.
                </p>
              </section>

              {notice && (
                <p
                  role="status"
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                >
                  {notice.text}
                </p>
              )}

              <section className="rounded-2xl bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 pt-4">
                  <h2 className="font-bold">오늘 발급한 이용권</h2>
                  <button type="button" onClick={testPrint} className="text-sm text-neutral-500 underline">
                    시험 출력
                  </button>
                </div>
                {passes.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-neutral-400">아직 발급한 이용권이 없어요.</p>
                ) : (
                  <ul className="divide-y divide-neutral-100">
                    {passes.map((pass) => {
                      const open = pass.status === 'issued' && !expired(pass)
                      const label =
                        pass.status === 'used' ? '사용됨' : pass.status === 'void' ? '취소' : expired(pass) ? '기간 만료' : '미사용'
                      return (
                        <li key={pass.id} className="flex items-center gap-3 px-5 py-3">
                          <span className="font-mono text-lg font-bold tracking-widest">{spacedCode(pass.code)}</span>
                          <span className="text-sm text-neutral-400">{kst(pass.created_at, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${open ? 'bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-500'}`}
                          >
                            {label}
                          </span>
                          {open && (
                            <span className="ml-auto flex gap-2">
                              <button type="button" onClick={() => reprint(pass)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold">
                                다시 출력
                              </button>
                              <button type="button" onClick={() => voidPass(pass)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600">
                                취소
                              </button>
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {printJob && (
        <div className="counter-print" key={printJob.id} aria-hidden="true">
          {printJob.passes.map((pass) => (
            <div key={pass.id} className="counter-slip">
              <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '0.3em' }}>AC&apos;SCENT PHOTO</div>
              <div style={{ fontSize: '15pt', fontWeight: 800, marginTop: '1.5mm' }}>
                {printJob.test ? '시험 출력 — 사용할 수 없음' : '포토부스 이용권'}
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '4mm 0 3mm' }} />
              <div style={{ fontSize: '9pt' }}>이용권 번호</div>
              <div style={{ fontSize: '34pt', fontWeight: 900, letterSpacing: '0.08em', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                {spacedCode(pass.code)}
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '3mm 0 3mm' }} />
              <div style={{ fontSize: '10.5pt', fontWeight: 700 }}>1회 사용 · {expiryLabel(pass.expires_at)}</div>
              <div style={{ fontSize: '9.5pt', marginTop: '2mm', lineHeight: 1.45 }}>
                포토부스 화면에서 촬영 방식을 고른 뒤
                <br />
                번호 6자리를 입력하세요.
              </div>
              {printJob.event && <div style={{ fontSize: '9pt', marginTop: '2mm' }}>♥ {printJob.event}</div>}
              <div style={{ fontSize: '8pt', marginTop: '3mm' }}>
                발급 {kst(pass.created_at, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
