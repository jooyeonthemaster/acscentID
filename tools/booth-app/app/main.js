/**
 * AC'SCENT WOW 포토부스 앱 (Windows exe 셸)
 *
 * 매장 PC 에 이미 있는 NEANDER LAB Photobooth 의 Electron 런타임·캐논 EDSDK·koffi 를
 * 복사해 쓰고(install.ps1), 앱 코드는 이 폴더(resources/app)만 우리 것으로 바꿨다.
 * 원본 NEANDER 앱과 dslrBooth 는 건드리지 않는다.
 *
 * 하는 일
 *   - 부스 웹(/booth)을 전체화면 키오스크로 띄운다 (주소는 exe 옆 config.json 의 appUrl)
 *   - 캐논 DSLR 을 잡아 localhost:9120 으로 넘긴다 (bridge.cjs — 부스 웹이 자동으로 DSLR 을 쓴다)
 *   - 인화는 대화상자 없이 바로 프린터로 (window.boothShell.print)
 *   - 관리자 팝업의 "앱 종료" → 카메라를 놓고 종료 (dslrBooth 가 바로 카메라를 잡을 수 있게)
 *   - 비상 종료: Ctrl+Shift+F12
 */
const { app, BrowserWindow, ipcMain, globalShortcut, session, screen } = require('electron')
const { execFile, fork } = require('child_process')
const os = require('os')
const path = require('path')
const fs = require('fs')

const EXE_DIR = path.dirname(process.execPath)
const CONFIG_PATH = path.join(EXE_DIR, 'config.json')
const LOG_PATH = path.join(EXE_DIR, 'booth.log')

// 로그는 exe 옆 파일로 — 매장 PC 원격 점검용 (카메라 프로세스도 같은 파일에 쓴다)
try {
  // 너무 커지면 새로 시작 (5MB)
  if (fs.statSync(LOG_PATH).size > 5 * 1024 * 1024) fs.unlinkSync(LOG_PATH)
} catch {
  /* 없음 */
}
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' })
const log = (...a) => {
  const line = [new Date().toISOString().slice(11, 19), '[app]']
    .concat(a.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))))
    .join(' ')
  console.log(line)
  logStream.write(line + '\n')
}

const DEFAULTS = {
  appUrl: 'https://www.acscent.co.kr/booth',
  /** 비우면 윈도우 기본 프린터 */
  printerName: '',
  /** 용지 이름 — DS-RX1 은 기본 용지가 가로 (6x4) 라서 세로 4x6 을 이름으로 지정해야 한다 */
  paperName: 'PR (4x6)',
  kiosk: true,
  /** 화면 배율 — 큰 모니터에서 글자·버튼이 작아 보이면 키운다 (관리자 팝업에서 변경) */
  zoomFactor: 1,
}
const clampZoom = (z) => Math.min(2, Math.max(1, Number(z) || 1))

function readConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8').replace(/^﻿/, '')) }
  } catch {
    return { ...DEFAULTS }
  }
}
const config = readConfig()
config.zoomFactor = clampZoom(config.zoomFactor)

/** 관리자 팝업에서 바꾼 값을 exe 옆 config.json 에 남긴다 (다른 키는 보존) */
function saveConfig(patch) {
  Object.assign(config, patch)
  let current = {}
  try {
    current = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    /* 없으면 새로 */
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...patch }, null, 2), 'utf8')
}
const appOrigin = new URL(config.appUrl).origin

// ── 카메라 브리지 (별도 프로세스)
// EDSDK 호출은 동기라 메인 프로세스에서 돌리면 라이브뷰마다 앱 전체가 멈칫한다.
// 같은 exe 를 Node 모드로 하나 더 띄워 맡기고, 죽으면 다시 띄운다.
const BRIDGE_SCRIPT = path.join(__dirname, 'bridge.cjs')
let bridgeProc = null
let bridgeRestarts = 0

function startBridge() {
  if (quitting || bridgeProc || !fs.existsSync(BRIDGE_SCRIPT)) return
  bridgeProc = fork(BRIDGE_SCRIPT, [], {
    execPath: process.execPath,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      BOOTH_CAMERA_LOG: LOG_PATH,
      // EDSDK·koffi 는 이 exe 옆 resources 에서 (원본 NEANDER 설치본에 기대지 않게)
      NEANDER_APP_DIR: EXE_DIR,
    },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    windowsHide: true,
  })
  log('카메라 브리지 시작 pid', bridgeProc.pid)
  bridgeProc.on('exit', (code, signal) => {
    log('카메라 브리지 종료', code ?? signal)
    bridgeProc = null
    if (quitting) return
    // 비정상 종료 — 잠시 뒤 다시 (연속 실패하면 간격을 늘린다)
    bridgeRestarts++
    setTimeout(startBridge, Math.min(30000, 3000 * bridgeRestarts))
  })
}

function stopBridge() {
  return new Promise((resolve) => {
    const proc = bridgeProc
    if (!proc) return resolve()
    const timer = setTimeout(() => {
      try {
        proc.kill()
      } catch {
        /* 이미 종료 */
      }
      resolve()
    }, 2500)
    proc.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    try {
      // 세션을 정상적으로 닫아야 다음 앱(dslrBooth)이 카메라를 바로 잡는다
      proc.send('stop')
    } catch {
      proc.kill()
    }
  })
}

// ── 한 대만 실행 (두 번 켜면 카메라를 다툰다)
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// 매장 개발 서버(http://172.30.x.x)에서 띄울 때도 보안 컨텍스트 전용 기능이 동작하게
if (appOrigin.startsWith('http://') && !/localhost|127\.0\.0\.1/.test(appOrigin)) {
  app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', appOrigin)
}
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
// 키오스크 — 창이 가려졌다고 판단돼도 라이브뷰·타이머를 늦추지 않는다
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
// 부스 웹 → localhost 카메라 브리지 요청에 권한 프롬프트가 뜨지 않게
app.commandLine.appendSwitch('disable-features', 'LocalNetworkAccessChecks')

let win = null
let quitting = false
let retryTimer = null

function loadBooth() {
  if (!win || win.isDestroyed()) return
  clearTimeout(retryTimer)
  win.loadURL(config.appUrl).catch(() => {
    /* did-fail-load 에서 처리 */
  })
}

function showOffline(reason) {
  if (!win || win.isDestroyed()) return
  win.loadFile(path.join(__dirname, 'offline.html'), {
    query: { reason: String(reason || ''), url: config.appUrl },
  })
  clearTimeout(retryTimer)
  retryTimer = setTimeout(loadBooth, 5000)
}

async function quitApp(reason) {
  if (quitting) return
  quitting = true
  log('종료:', reason)
  globalShortcut.unregisterAll()
  await stopBridge()
  app.exit(0)
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds
  win = new BrowserWindow({
    width,
    height,
    kiosk: config.kiosk,
    fullscreen: config.kiosk,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'booth.ico'),
    title: "AC'SCENT WOW 포토부스",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false,
      zoomFactor: config.zoomFactor,
    },
  })
  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })
  win.setMenu(null)

  const wc = win.webContents
  // 배율은 페이지마다 다시 건다 (크로미움은 사이트별로 기억해 새 로드 때 되돌아갈 수 있다)
  wc.on('dom-ready', () => wc.setZoomFactor(config.zoomFactor))
  // 터치 두 손가락 확대 금지 (키오스크)
  wc.on('did-finish-load', () => wc.setVisualZoomLevelLimits(1, 1).catch(() => {}))
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    // -3 = 사용자가 취소(다른 페이지로 이동) — 실패가 아니다
    if (!isMainFrame || code === -3 || url.startsWith('file:')) return
    log('로드 실패:', code, desc, url)
    showOffline(desc)
  })
  wc.on('render-process-gone', (_e, details) => {
    log('화면 프로세스 종료:', details.reason)
    if (!quitting) setTimeout(loadBooth, 2000)
  })
  // 부스 밖으로 나가지 못하게 — 새 창·외부 이동 차단
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  wc.on('will-navigate', (event, url) => {
    if (!url.startsWith(appOrigin) && !url.startsWith('file:')) event.preventDefault()
  })

  loadBooth()
}

// ── 부스 웹이 부르는 기능 (preload.js 의 window.boothShell)
ipcMain.handle('booth:info', () => ({
  shell: 'acscent-wow-booth',
  version: app.getVersion(),
  appUrl: config.appUrl,
  printerName: config.printerName || null,
  zoomFactor: config.zoomFactor,
}))

ipcMain.handle('booth:set-zoom', (event, factor) => {
  const zoomFactor = clampZoom(factor)
  event.sender.setZoomFactor(zoomFactor)
  try {
    saveConfig({ zoomFactor })
  } catch (e) {
    log('설정 저장 실패:', e.message)
  }
  log('화면 배율 →', zoomFactor)
  return { ok: true, zoomFactor }
})

/**
 * 인쇄 — 완성 원판(JPEG)을 프린터로 바로 보낸다.
 *
 * 브라우저 인쇄에 맡기면 용지를 이름으로 고를 수 없어, 기본 용지가 가로 (6x4) 인 DS-RX1 에서
 * 세로 원판이 잘리거나 축소돼 나왔다. 그래서 파일로 저장한 뒤 print-photo.ps1 로 인쇄한다.
 * 실패하면 예전 방식(화면 인쇄)으로 물러난다 — 부스가 사진을 못 뽑는 상황은 없어야 한다.
 */
ipcMain.handle('booth:print', async (event, imageDataUrl) => {
  const viaPage = () =>
    new Promise((resolve) => {
      log('화면 인쇄로 폴백')
      event.sender.print(
        { silent: true, printBackground: false, margins: { marginType: 'none' }, copies: 1 },
        (success, failureReason) => resolve({ ok: success, error: success ? null : failureReason, printer: null })
      )
    })

  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return viaPage()
  }

  const file = path.join(os.tmpdir(), `acscent-booth-print-${Date.now()}.jpg`)
  try {
    fs.writeFileSync(file, Buffer.from(imageDataUrl.split(',')[1], 'base64'))
  } catch (e) {
    log('인쇄 파일 저장 실패:', e.message)
    return viaPage()
  }

  const args = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    path.join(__dirname, 'print-photo.ps1'),
    '-Image',
    file,
    '-Paper',
    config.paperName || 'PR (4x6)',
  ]
  if (config.printerName) args.push('-Printer', config.printerName)

  return new Promise((resolve) => {
    execFile('powershell.exe', args, { windowsHide: true, timeout: 60000 }, (error, stdout, stderr) => {
      fs.unlink(file, () => {})
      const out = String(stdout || '').trim()
      if (!error && /^printed\|/m.test(out)) {
        const [, printer, paper, size, landscape] = out.match(/printed\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)/) || []
        log('인쇄 완료:', printer, paper, size, landscape)
        resolve({ ok: true, error: null, printer })
        return
      }
      log('인쇄 실패:', (String(stderr || '') + out).slice(0, 300))
      viaPage().then(resolve)
    })
  })
})

ipcMain.handle('booth:quit', () => {
  // 응답을 먼저 돌려주고 끈다
  setTimeout(() => quitApp('관리자 종료'), 150)
  return { ok: true }
})

ipcMain.handle('booth:reload', () => {
  loadBooth()
  return { ok: true }
})

app.whenReady().then(async () => {
  log('시작', { appUrl: config.appUrl, kiosk: config.kiosk, exe: process.execPath })

  // 매장망에 프록시는 없다 — 윈도우 프록시 자동 검색(WPAD)이 요청마다 끼어들지 않게
  await session.defaultSession.setProxy({ mode: 'direct' })
  // 카메라(웹캠 폴백)·알림 등 권한은 이 앱 안에서는 모두 허용 — 물어볼 사람이 없다
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true))
  session.defaultSession.setPermissionCheckHandler(() => true)
  // "이미지 저장"은 대화상자 없이 사진 폴더로
  session.defaultSession.on('will-download', (_e, item) => {
    const dir = path.join(app.getPath('pictures'), 'ACSCENT Booth')
    fs.mkdirSync(dir, { recursive: true })
    item.setSavePath(path.join(dir, item.getFilename()))
  })

  startBridge()

  globalShortcut.register('Control+Shift+F12', () => quitApp('비상 단축키'))
  createWindow()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

// Alt+F4 등으로 창이 닫혀도 카메라는 반드시 놓는다
app.on('window-all-closed', () => quitApp('창 닫힘'))
