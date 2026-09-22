'use client'

/**
 * 부스 기기 진단 (매장 PC에서 연다)
 *
 * 원격에서는 매장 기기의 카메라 해상도·QR 인식 지원 여부·프린터 여백을 알 수 없다.
 * 이 화면을 매장 PC에서 한 번 열면 그 정보가 서버로 모이고, 4x6 보정 인쇄로
 * 프린터가 실제로 어디까지 찍는지 눈으로 확인할 수 있다.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Camera, Printer, Send, Check, X, Loader2, Ruler } from 'lucide-react'
import { getBoothShell } from '@/lib/photobooth/booth-shell'

interface CameraResult {
  label: string
  deviceId: string
  requested: string
  actual: string
  megapixel: string
  /** 인화(2:3 세로)로 잘라낸 뒤 실제로 남는 픽셀 */
  printableCrop: string
  enough: boolean
}

// 4x6인치 @300dpi 인화 원판
const PRINT_W = 1200
const PRINT_H = 1800

export default function BoothDiagPage() {
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [sent, setSent] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)

  // 원격 인쇄 테스트용 — ?autoprint=1(보정 시험지) / ?printphoto=1(실사 품질)
  const [photoMode] = useState(
    () => typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('printphoto') === '1'
  )
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const photo = q.get('printphoto') === '1'
    if (!photo && q.get('autoprint') !== '1') return
    // 사진 모드는 이미지 로드를 기다린 뒤 인쇄
    // 부스 앱에서는 앱의 무음 인쇄 경로로 (부스 결과물과 같은 조건이어야 보정이 의미가 있다)
    const print = () => {
      const shell = getBoothShell()
      if (shell) shell.print().catch(() => window.print())
      else window.print()
    }
    const timer = window.setTimeout(print, photo ? 2500 : 1200)
    return () => window.clearTimeout(timer)
  }, [])

  const run = useCallback(async () => {
    setRunning(true)
    setSent('idle')
    const out: Record<string, unknown> = {}

    // 화면
    out.screen = {
      viewport: `${window.innerWidth} x ${window.innerHeight}`,
      screen: `${window.screen.width} x ${window.screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      touch: navigator.maxTouchPoints > 0,
    }
    out.platform = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      secureContext: window.isSecureContext,
      origin: window.location.origin,
    }

    // QR 인식 (윈도우 크롬에는 없을 수 있다)
    const Detector = (window as unknown as { BarcodeDetector?: { getSupportedFormats: () => Promise<string[]> } })
      .BarcodeDetector
    if (Detector) {
      try {
        const formats = await Detector.getSupportedFormats()
        out.barcodeDetector = { supported: true, qr: formats.includes('qr_code'), formats }
      } catch (e) {
        out.barcodeDetector = { supported: true, error: String(e) }
      }
    } else {
      out.barcodeDetector = { supported: false }
    }

    // 카메라 — 요청 가능한 최대 해상도를 실제로 받아본다
    const cameras: CameraResult[] = []
    try {
      await navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        s.getTracks().forEach((t) => t.stop())
      })
      const devices = await navigator.mediaDevices.enumerateDevices()
      // 영상 장치가 없을 때 원인을 좁히기 위해 오디오까지 전부 기록한다
      // (캡처보드가 꽂혀 있으면 보통 오디오 입력으로도 같이 잡힌다)
      out.allDevices = devices.map((d) => ({ kind: d.kind, label: d.label || '(권한 없음/이름없음)' }))
      const videoInputs = devices.filter((d) => d.kind === 'videoinput')

      for (const device of videoInputs) {
        for (const req of [
          { w: 3840, h: 2160, label: '4K' },
          { w: 1920, h: 1080, label: '1080p' },
        ]) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: device.deviceId },
                width: { ideal: req.w },
                height: { ideal: req.h },
              },
            })
            const track = stream.getVideoTracks()[0]
            const s = track.getSettings()
            stream.getTracks().forEach((t) => t.stop())
            const w = s.width ?? 0
            const h = s.height ?? 0
            // 2:3 세로로 잘라내면 가로가 h*(2/3) 만 남는다
            const cropW = Math.round(h * (PRINT_W / PRINT_H))
            cameras.push({
              label: device.label || '(이름 없음)',
              deviceId: device.deviceId.slice(0, 12),
              requested: req.label,
              actual: `${w} x ${h}`,
              megapixel: `${((w * h) / 1_000_000).toFixed(1)}MP`,
              printableCrop: `${cropW} x ${h}`,
              enough: cropW >= PRINT_W && h >= PRINT_H,
            })
            if (req.label === '4K') break // 4K가 되면 1080p는 확인 불필요
          } catch {
            // 이 해상도는 지원하지 않음 — 다음으로
          }
        }
      }
      out.cameras = cameras
    } catch (e) {
      out.cameras = { error: String(e) }
    }

    setReport(out)
    setRunning(false)
  }, [])

  /** 부스 핵심 기능 실측 — 매장 PC 성능으로 실제 돌려본다 */
  const runSelfTest = useCallback(async () => {
    setRunning(true)
    const out: Record<string, unknown> = { source: 'selftest' }
    const t = () => performance.now()

    const load = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image()
        i.onload = () => res(i)
        i.onerror = rej
        i.src = src
      })

    // 1) 인물 오려내기 (MediaPipe WASM + 16MB 모델)
    try {
      const img = await load('/assets/photobooth/templates/blossom-date.png')
      const { cutoutPerson } = await import('@/lib/photobooth/segmentation')
      const t0 = t()
      const first = await cutoutPerson(img)
      const t1 = t()
      await cutoutPerson(img)
      const t2 = t()
      out.segmentation = {
        ok: true,
        firstRunMs: Math.round(t1 - t0),
        secondRunMs: Math.round(t2 - t1),
        coverage: Number(first.coverage.toFixed(3)),
        cutoutSize: `${first.canvas.width} x ${first.canvas.height}`,
      }
    } catch (e) {
      out.segmentation = { ok: false, error: String(e).slice(0, 300) }
    }

    // 2) QR 폴백 디코딩 (윈도우에는 내장 인식이 없다)
    try {
      const qrImg = await load('/assets/photobooth/selftest-qr.png')
      const c = document.createElement('canvas')
      c.width = qrImg.naturalWidth
      c.height = qrImg.naturalHeight
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(qrImg, 0, 0)
      const data = ctx.getImageData(0, 0, c.width, c.height)
      const jsQR = (await import('jsqr')).default
      const t0 = t()
      const r = jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' })
      out.jsQR = { ok: !!r, decoded: r?.data ?? null, ms: Math.round(t() - t0) }
    } catch (e) {
      out.jsQR = { ok: false, error: String(e).slice(0, 300) }
    }

    // 3) 인화 원판 캔버스 생성 속도
    try {
      const c = document.createElement('canvas')
      c.width = 1200
      c.height = 1800
      const ctx = c.getContext('2d')!
      const img = await load('/assets/photobooth/print-test.jpg')
      const t0 = t()
      ctx.drawImage(img, 0, 0, 1200, 1800)
      const url = c.toDataURL('image/jpeg', 0.95)
      out.canvas = { ok: true, ms: Math.round(t() - t0), dataUrlKB: Math.round(url.length / 1024) }
    } catch (e) {
      out.canvas = { ok: false, error: String(e).slice(0, 300) }
    }

    setReport(out)
    setRunning(false)
    try {
      await fetch('/api/photobooth/diag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(out),
      })
      setSent('done')
    } catch {
      setSent('failed')
    }
  }, [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('selftest') === '1') {
      const timer = window.setTimeout(() => runSelfTest(), 800)
      return () => window.clearTimeout(timer)
    }
  }, [runSelfTest])

  const send = useCallback(async () => {
    if (!report) return
    setSent('sending')
    try {
      const res = await fetch('/api/photobooth/diag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      setSent(res.ok ? 'done' : 'failed')
    } catch {
      setSent('failed')
    }
  }, [report])

  const cameras = Array.isArray(report?.cameras) ? (report!.cameras as CameraResult[]) : []
  const barcode = report?.barcodeDetector as { supported: boolean; qr?: boolean } | undefined

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      {/* 4x6 보정 인쇄 — 프린터가 실제로 어디까지 찍는지 확인용 */}
      <style>{`
        .diag-print { display: none; }
        @media print {
          @page { size: 4in 6in; margin: 0; }
          html, body { background: #ffffff !important; }
          /* display:none 은 자식이 되살릴 수 없다. 부스 인쇄와 동일하게 visibility 로 처리한다 */
          body { visibility: hidden; }
          .diag-print {
            display: block;
            visibility: visible;
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: #fff;
            color: #000;
          }
          .diag-print * { visibility: visible; }
        }
      `}</style>
      <div className="diag-print">
        {photoMode ? (
          // 부스 결과 화면과 동일한 마크업 — 실제 인화 경로를 그대로 재현한다
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/assets/photobooth/print-test.jpg"
            alt="인화 품질 테스트"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
        <svg viewBox="0 0 1200 1800" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="1200" height="1800" fill="#fff" />
          {/* 가장자리에서 1/3/5/10mm 지점 (300dpi 기준 1mm = 11.81px) */}
          {[1, 3, 5, 10].map((mm) => {
            const p = Math.round(mm * 11.81)
            return (
              <rect
                key={mm}
                x={p}
                y={p}
                width={1200 - p * 2}
                height={1800 - p * 2}
                fill="none"
                stroke="#000"
                strokeWidth="2"
                strokeDasharray={mm === 5 ? '0' : '12 10'}
              />
            )
          })}
          {[1, 3, 5, 10].map((mm) => {
            const p = Math.round(mm * 11.81)
            return (
              <text key={`t${mm}`} x={p + 10} y={p + 34} fontSize="26" fill="#000">
                {mm}mm
              </text>
            )
          })}
          <line x1="600" y1="820" x2="600" y2="980" stroke="#000" strokeWidth="3" />
          <line x1="520" y1="900" x2="680" y2="900" stroke="#000" strokeWidth="3" />
          <text x="600" y="1060" fontSize="34" textAnchor="middle" fill="#000">
            4 x 6 in · 1200 x 1800 px
          </text>
          <text x="600" y="1110" fontSize="26" textAnchor="middle" fill="#000">
            바깥 실선이 안 보이면 그만큼 잘린 것입니다
          </text>
        </svg>
        )}
      </div>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">부스 기기 진단</h1>
        <p className="text-sm text-slate-500 mb-6">
          매장 PC에서 이 화면을 열고 아래 순서대로 눌러주세요. 카메라 권한을 물으면 허용해야
          합니다.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-3 font-bold disabled:opacity-40"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            1. 기기 확인
          </button>
          <button
            onClick={send}
            disabled={!report || sent === 'sending'}
            className="flex items-center gap-2 rounded-xl border-2 border-slate-900 px-5 py-3 font-bold disabled:opacity-30"
          >
            {sent === 'done' ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            2. 결과 보내기
            {sent === 'done' && ' (완료)'}
            {sent === 'failed' && ' (실패)'}
          </button>
          <button
            onClick={() => {
              const shell = getBoothShell()
              if (shell) shell.print().catch(() => window.print())
              else window.print()
            }}
            className="flex items-center gap-2 rounded-xl border-2 border-slate-300 px-5 py-3 font-bold"
          >
            <Printer className="w-4 h-4" />
            3. 4x6 보정 인쇄
          </button>
        </div>

        {report && (
          <div className="space-y-4">
            {/* 카메라 */}
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" /> 카메라
              </h2>
              {cameras.length === 0 ? (
                <div className="text-sm">
                  <p className="text-red-500 font-semibold mb-2">
                    웹캠으로 인식되는 영상 장치가 없습니다.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    DSLR을 USB로만 연결하면 브라우저가 쓸 수 없습니다(사진 전송 모드로 잡힘).
                    HDMI 캡처보드를 연결하거나, 윈도우 설정 → 개인 정보 → 카메라에서
                    &lsquo;앱이 카메라에 액세스하도록 허용&rsquo;이 켜져 있는지 확인해 주세요.
                  </p>
                  {Array.isArray(report?.allDevices) && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="font-semibold mb-1 text-slate-700">
                        브라우저가 본 장치 목록
                      </p>
                      <ul className="text-xs text-slate-500 space-y-0.5">
                        {(report!.allDevices as { kind: string; label: string }[]).map((d, i) => (
                          <li key={i}>
                            {d.kind} · {d.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {cameras.map((c, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-3 last:border-0">
                      <p className="font-semibold">{c.label}</p>
                      <p className="text-slate-500">
                        최대 해상도 {c.actual} ({c.megapixel})
                      </p>
                      <p className="text-slate-500">
                        인화용(2:3)으로 자른 뒤 남는 크기 {c.printableCrop}
                      </p>
                      <p
                        className={`mt-1 font-bold ${c.enough ? 'text-green-600' : 'text-amber-600'}`}
                      >
                        {c.enough
                          ? '✓ 1200 x 1800 인화 해상도를 충족합니다'
                          : '△ 인화 시 확대되어 화질이 떨어집니다 (4K 카메라 권장)'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* QR */}
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-bold mb-2">카드 QR 인식</h2>
              <p className={`text-sm font-semibold ${barcode?.qr ? 'text-green-600' : 'text-amber-600'}`}>
                {barcode?.qr
                  ? '✓ 브라우저가 QR 인식을 지원합니다 (카메라로 카드 스캔 가능)'
                  : '△ 이 기기는 QR 자동 인식을 지원하지 않습니다 (카드 번호 수동 입력으로 동작)'}
              </p>
            </section>

            {/* 인쇄 안내 */}
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-bold mb-2 flex items-center gap-2">
                <Ruler className="w-4 h-4" /> 인쇄 확인 방법
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                &lsquo;4x6 보정 인쇄&rsquo;를 누르면 가장자리에서 1·3·5·10mm 지점에 선이 그려진
                시험지가 나옵니다. <strong>인화지에서 어느 선까지 보이는지</strong> 알려주시면
                프린터가 실제로 찍는 영역에 맞춰 여백을 조정하겠습니다. 용지 설정은 4x6인치,
                여백 없음(무테)으로 두세요.
              </p>
            </section>

            <details className="bg-white rounded-xl border border-slate-200 p-4">
              <summary className="font-bold cursor-pointer text-sm">원본 데이터</summary>
              <pre className="mt-3 text-xs overflow-auto text-slate-600">
                {JSON.stringify(report, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {!report && !running && (
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <X className="w-4 h-4" /> 아직 진단하지 않았습니다.
          </p>
        )}
      </div>

      <video ref={videoRef} className="hidden" />
    </div>
  )
}
