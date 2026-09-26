#!/usr/bin/env node
/**
 * AC'SCENT 포토부스 카메라 브리지 — Canon DSLR 을 브라우저 부스에 연결한다.
 *
 * 왜 필요한가
 *   매장 PC 의 Canon EOS 200D II 는 USB 로 dslrBooth 가 테더링하는 상태(WPD/PTP)라
 *   브라우저에는 웹캠으로 보이지 않는다. 드라이버를 바꾸면 dslrBooth 가 깨진다.
 *   대신 dslrBooth 와 같은 방식(캐논 EDSDK)으로 카메라를 잡아 localhost HTTP 로 넘긴다.
 *
 * 설치가 필요 없는 이유
 *   같은 PC 에 설치된 NEANDER LAB Photobooth 가 이미 EDSDK.dll, koffi(DLL 호출),
 *   Electron(=Node) 을 갖고 있다. 이 스크립트는 그것들을 빌려 쓴다.
 *   카메라 제어 로직은 그 앱의 electron/edsdk/camera-service.js (행사 8시간 무중단 검증)를
 *   HTTP 서비스로 옮긴 것이다.
 *
 * 실행 (매장 PC, PowerShell)
 *   $env:ELECTRON_RUN_AS_NODE="1"
 *   & "C:\Program Files\NEANDER LAB Photobooth\NEANDER LAB Photobooth.exe" bridge.cjs
 *
 * API (http://localhost:9120)
 *   GET  /health      { ok, connected, model, liveView, frames, error }
 *   GET  /frame.jpg   최신 라이브뷰 JPEG (요청이 오면 라이브뷰를 켜고, 15초간 없으면 끈다)
 *   POST /capture     셔터를 눌러 원본 JPEG 를 그대로 돌려준다
 *   POST /release     카메라를 놓아준다 (dslrBooth 를 켜기 전에 호출)
 *
 * ⚠️ 카메라는 한 번에 한 앱만 잡을 수 있다. dslrBooth 와 동시에 켜지 말 것.
 */

const http = require('http')
const path = require('path')
const fs = require('fs')

const PORT = Number(process.env.BOOTH_CAMERA_PORT || 9120)

/**
 * EDSDK·koffi 가 들어 있는 앱 폴더.
 * 부스 exe(ACSCENT-WOW-Booth) 안에서 불리면 그 exe 의 resources 를, 단독 실행이면 NEANDER 설치본을 쓴다.
 */
function resolveAppDir() {
  const candidates = [
    process.env.NEANDER_APP_DIR,
    process.resourcesPath ? path.dirname(process.resourcesPath) : null,
    'C:\\Program Files\\NEANDER LAB Photobooth',
  ].filter(Boolean)
  return (
    candidates.find((dir) => fs.existsSync(path.join(dir, 'resources', 'edsdk-dlls', 'EDSDK.dll'))) ||
    candidates[candidates.length - 1]
  )
}
const APP_DIR = resolveAppDir()
const DLL_DIR = path.join(APP_DIR, 'resources', 'edsdk-dlls')

// 로그 파일 (원격 점검용) — 다른 코드보다 먼저 걸어야 초기 로그도 남는다
if (process.env.BOOTH_CAMERA_LOG) {
  const out = fs.createWriteStream(process.env.BOOTH_CAMERA_LOG, { flags: 'a' })
  const orig = console.log
  console.log = (...a) => {
    orig(...a)
    out.write(a.join(' ') + '\n')
  }
}
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

// ── koffi: NEANDER 앱에 들어 있는 것을 빌린다 (asar 풀린 폴더 → asar 내부 순)
function loadKoffi() {
  const candidates = [
    path.join(APP_DIR, 'resources', 'app.asar.unpacked', 'node_modules', 'koffi'),
    path.join(APP_DIR, 'resources', 'app.asar', 'node_modules', 'koffi'),
  ]
  for (const p of candidates) {
    try {
      return require(p)
    } catch (e) {
      log('[bridge] koffi 로드 실패:', p, e.message)
    }
  }
  throw new Error('koffi 를 찾을 수 없습니다 (NEANDER LAB Photobooth 설치 확인)')
}
const koffi = loadKoffi()

// ── EDSDK 바인딩 (NEANDER 앱 electron/edsdk/bindings.js 에서 필요한 것만)
const EDS_ERR_OK = 0x00000000
const EDS_ERR_DEVICE_BUSY = 0x00000081
const PropID_SaveTo = 0x0000000b
const PropID_Evf_OutputDevice = 0x00000500
const PropID_Evf_Mode = 0x00000501
const CameraCommand_ExtendShutDownTimer = 0x00000001
const CameraCommand_PressShutterButton = 0x00000004
const ShutterButton_OFF = 0x00000000
const ShutterButton_Completely = 0x00000003
// 초점을 다시 잡지 않고 바로 셔터 — 초점을 못 잡아(어두움·민무늬 배경·너무 가까움) 셔터가 거부될 때 쓴다
const ShutterButton_Completely_NonAF = 0x00010003
const EDS_ERR_TAKE_PICTURE_AF_NG = 0x00008d01
const EdsSaveTo_Host = 2
const EvfOutputDevice_PC = 0x02
const ObjectEvent_All = 0x00000200
const ObjectEvent_DirItemRequestTransfer = 0x00000208
const StateEvent_All = 0x00000300
const StateEvent_Shutdown = 0x00000301
const StateEvent_WillSoonShutDown = 0x00000303

const EdsDeviceInfo = koffi.struct('EdsDeviceInfo', {
  szPortName: koffi.array('char', 256),
  szDeviceDescription: koffi.array('char', 256),
  DeviceSubType: 'uint32',
  reserved: 'uint32',
})
const EdsCapacity = koffi.struct('EdsCapacity', {
  NumberOfFreeClusters: 'int32',
  BytesPerSector: 'int32',
  Reset: 'int32',
})
const EdsDirectoryItemInfo = koffi.struct('EdsDirectoryItemInfo', {
  Size: 'uint64',
  isFolder: 'int32',
  GroupID: 'uint32',
  Option: 'uint32',
  szFileName: koffi.array('char', 256),
  format: 'uint32',
  dateTime: 'uint32',
})
const EdsObjectEventHandler = koffi.proto(
  'uint32 EdsObjectEventHandler(uint32 inEvent, void* inRef, void* inContext)'
)
const EdsStateEventHandler = koffi.proto(
  'uint32 EdsStateEventHandler(uint32 inEvent, uint32 inParameter, void* inContext)'
)

const ERR_NAMES = {
  0x00: 'OK',
  0x81: 'DEVICE_BUSY',
  0x80: 'DEVICE_NOT_FOUND',
  0x84: 'DEVICE_MEMORY_FULL',
  0x85: 'DEVICE_INTERNAL_ERROR',
  0x2003: 'SESSION_NOT_OPEN',
  0xa102: 'OBJECT_NOTREADY',
  0xa101: 'LOW_BATTERY',
  // 촬영 거부 — 셔터를 눌렀지만 카메라가 찍지 않은 이유
  0x8d01: 'TAKE_PICTURE_AF_NG(초점 실패)',
  0x8d03: 'TAKE_PICTURE_MIRROR_UP_NG',
  0x8d04: 'TAKE_PICTURE_SENSOR_CLEANING_NG',
  0x8d06: 'TAKE_PICTURE_NO_CARD_NG(메모리 카드 없음)',
  0x8d07: 'TAKE_PICTURE_CARD_NG(카드 오류)',
  0x8d08: 'TAKE_PICTURE_CARD_PROTECT_NG(카드 잠김)',
  0x8d0a: 'TAKE_PICTURE_LV_REL_PROHIBIT_MODE_NG(라이브뷰 촬영 불가 모드)',
}
const errName = (e) => ERR_NAMES[e] || `0x${e.toString(16)}`

function loadEds() {
  // EdsImage.dll 이 EDSDK.dll 의 의존성이라 먼저 올린다
  koffi.load(path.join(DLL_DIR, 'EdsImage.dll'))
  const lib = koffi.load(path.join(DLL_DIR, 'EDSDK.dll'))
  return {
    EdsInitializeSDK: lib.func('uint32 EdsInitializeSDK()'),
    EdsTerminateSDK: lib.func('uint32 EdsTerminateSDK()'),
    // Node 에는 윈도우 메시지 루프가 없어 SDK 콜백을 받으려면 직접 펌프해야 한다
    EdsGetEvent: lib.func('uint32 EdsGetEvent()'),
    EdsGetCameraList: lib.func('uint32 EdsGetCameraList(_Out_ void** outCameraListRef)'),
    EdsGetChildCount: lib.func('uint32 EdsGetChildCount(void* inRef, _Out_ int32* outCount)'),
    EdsGetChildAtIndex: lib.func(
      'uint32 EdsGetChildAtIndex(void* inRef, int32 inIndex, _Out_ void** outRef)'
    ),
    EdsOpenSession: lib.func('uint32 EdsOpenSession(void* inCameraRef)'),
    EdsCloseSession: lib.func('uint32 EdsCloseSession(void* inCameraRef)'),
    EdsGetDeviceInfo: lib.func(
      'uint32 EdsGetDeviceInfo(void* inCameraRef, _Out_ EdsDeviceInfo* outDeviceInfo)'
    ),
    EdsSetPropertyData: lib.func(
      'uint32 EdsSetPropertyData(void* inRef, uint32 inPropertyID, int32 inParam, int32 inPropertySize, void* inPropertyData)'
    ),
    EdsSetCapacity: lib.func('uint32 EdsSetCapacity(void* inCameraRef, EdsCapacity inCapacity)'),
    EdsSendCommand: lib.func(
      'uint32 EdsSendCommand(void* inCameraRef, uint32 inCommand, int32 inParam)'
    ),
    EdsCreateMemoryStream: lib.func(
      'uint32 EdsCreateMemoryStream(uint64 inBufferSize, _Out_ void** outStream)'
    ),
    EdsGetPointer: lib.func('uint32 EdsGetPointer(void* inStreamRef, _Out_ void** outPointer)'),
    EdsGetLength: lib.func('uint32 EdsGetLength(void* inStreamRef, _Out_ uint64* outLength)'),
    EdsCreateEvfImageRef: lib.func(
      'uint32 EdsCreateEvfImageRef(void* inStreamRef, _Out_ void** outEvfImageRef)'
    ),
    EdsDownloadEvfImage: lib.func(
      'uint32 EdsDownloadEvfImage(void* inCameraRef, void* outEvfImageRef)'
    ),
    EdsGetDirectoryItemInfo: lib.func(
      'uint32 EdsGetDirectoryItemInfo(void* inDirItemRef, _Out_ EdsDirectoryItemInfo* outDirItemInfo)'
    ),
    EdsDownload: lib.func('uint32 EdsDownload(void* inDirItemRef, uint64 inReadSize, void* outStream)'),
    EdsDownloadComplete: lib.func('uint32 EdsDownloadComplete(void* inDirItemRef)'),
    EdsDownloadCancel: lib.func('uint32 EdsDownloadCancel(void* inDirItemRef)'),
    EdsSetObjectEventHandler: lib.func(
      'uint32 EdsSetObjectEventHandler(void* inCameraRef, uint32 inEvent, EdsObjectEventHandler* inObjectEventHandler, void* inContext)'
    ),
    EdsSetCameraStateEventHandler: lib.func(
      'uint32 EdsSetCameraStateEventHandler(void* inCameraRef, uint32 inEvent, EdsStateEventHandler* inStateEventHandler, void* inContext)'
    ),
    EdsRelease: lib.func('uint32 EdsRelease(void* inRef)'),
  }
}

// ── 카메라 상태
const EVF_POLL_MS = 50 // 최대 20fps
const EVF_IDLE_STOP_MS = 15000 // 프레임 요청이 없으면 라이브뷰를 끈다 (USB·발열 절약)
const CAPTURE_TIMEOUT_MS = 15000
const KEEPALIVE_MS = 60000

const state = {
  eds: null,
  camera: null,
  cameraList: null,
  connected: false,
  sdkInit: false,
  sessionOpen: false,
  tearingDown: false,
  model: '',
  liveView: false,
  lastFrame: null,
  lastFrameAt: 0,
  lastRequestAt: 0,
  frames: 0,
  /** 라이브뷰 진단 — 원격으로 "카메라가 느린지(skip 많음) USB 가 느린지(ms 큼)" 가른다 */
  evfStats: { ok: 0, skip: 0, ms: 0, since: Date.now() },
  /** 라이브뷰 그림 크기 — 사진 모드 3:2(960x640), 동영상 모드 16:9(1024x576) */
  evfSize: null,
  error: '',
  capture: null,
  timers: { pump: null, evf: null, keepAlive: null, retry: null },
  callbacks: { object: null, stateEvt: null },
}

function setUint32(propId, value) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(value)
  return state.eds.EdsSetPropertyData(state.camera, propId, 0, 4, buf)
}

async function connect() {
  if (state.connected) return
  if (!state.eds) state.eds = loadEds()
  const eds = state.eds

  let err = eds.EdsInitializeSDK()
  if (err !== EDS_ERR_OK) throw new Error(`EdsInitializeSDK: ${errName(err)}`)
  state.sdkInit = true

  const listOut = [null]
  err = eds.EdsGetCameraList(listOut)
  if (err !== EDS_ERR_OK) {
    teardown()
    throw new Error(`EdsGetCameraList: ${errName(err)}`)
  }
  state.cameraList = listOut[0]

  const countOut = [0]
  err = eds.EdsGetChildCount(state.cameraList, countOut)
  if (err !== EDS_ERR_OK || countOut[0] === 0) {
    teardown()
    throw new Error('캐논 카메라가 USB 로 연결돼 있지 않거나 꺼져 있습니다')
  }

  const camOut = [null]
  err = eds.EdsGetChildAtIndex(state.cameraList, 0, camOut)
  if (err !== EDS_ERR_OK) {
    teardown()
    throw new Error(`EdsGetChildAtIndex: ${errName(err)}`)
  }
  state.camera = camOut[0]

  const info = {}
  if (eds.EdsGetDeviceInfo(state.camera, info) === EDS_ERR_OK) {
    const d = info.szDeviceDescription
    state.model = (typeof d === 'string' ? d : String.fromCharCode(...d)).replace(/\0.*$/, '')
  }

  // 세션을 열기 전에 이벤트 핸들러를 먼저 건다 (촬영 파일 전송 이벤트)
  state.callbacks.object = koffi.register((event, ref) => {
    if (event === ObjectEvent_DirItemRequestTransfer) handleDownload(ref)
    return EDS_ERR_OK
  }, koffi.pointer(EdsObjectEventHandler))
  eds.EdsSetObjectEventHandler(state.camera, ObjectEvent_All, state.callbacks.object, null)

  state.callbacks.stateEvt = koffi.register((event) => {
    if (event === StateEvent_Shutdown) {
      if (state.tearingDown) return EDS_ERR_OK
      log('[bridge] 카메라 연결이 끊겼습니다')
      teardown('카메라 연결이 끊겼습니다')
    } else if (event === StateEvent_WillSoonShutDown && state.camera && state.connected) {
      state.eds.EdsSendCommand(state.camera, CameraCommand_ExtendShutDownTimer, 0)
    }
    return EDS_ERR_OK
  }, koffi.pointer(EdsStateEventHandler))
  eds.EdsSetCameraStateEventHandler(state.camera, StateEvent_All, state.callbacks.stateEvt, null)

  err = eds.EdsOpenSession(state.camera)
  if (err !== EDS_ERR_OK) {
    teardown()
    throw new Error(
      err === EDS_ERR_DEVICE_BUSY
        ? '다른 프로그램(dslrBooth 등)이 카메라를 쓰고 있습니다'
        : `EdsOpenSession: ${errName(err)}`
    )
  }
  state.sessionOpen = true

  eds.EdsGetEvent()
  state.timers.pump = setInterval(() => {
    try {
      state.eds && state.eds.EdsGetEvent()
    } catch {
      /* 무시 */
    }
  }, 100)

  // 촬영 파일을 카메라 카드가 아니라 PC 로 받는다. 직후엔 busy 가 날 수 있어 재시도
  for (let i = 0; i < 5; i++) {
    err = setUint32(PropID_SaveTo, EdsSaveTo_Host)
    if (err !== EDS_ERR_DEVICE_BUSY) break
    await new Promise((r) => setTimeout(r, 800))
  }
  if (err === EDS_ERR_DEVICE_BUSY) {
    teardown()
    throw new Error('카메라가 바쁩니다 — EOS Utility/dslrBooth 가 켜져 있는지 확인하세요')
  }

  // 카메라가 "디스크 가득 참"을 내지 않도록 가상 용량을 알려준다
  eds.EdsSetCapacity(state.camera, {
    NumberOfFreeClusters: 0x7fffffff,
    BytesPerSector: 0x1000,
    Reset: 1,
  })

  state.timers.keepAlive = setInterval(() => {
    if (state.connected && state.camera) {
      state.eds.EdsSendCommand(state.camera, CameraCommand_ExtendShutDownTimer, 0)
    }
  }, KEEPALIVE_MS)

  state.connected = true
  state.error = ''
  log(`[bridge] 카메라 연결됨: ${state.model}`)
}

function teardown(reason) {
  // 세션을 닫는 도중 카메라가 "연결 끊김" 이벤트를 보내면 여기로 다시 들어온다 —
  // 같은 참조를 두 번 Release 하면 프로세스가 죽는다(0xC0000409)
  if (state.tearingDown) return
  state.tearingDown = true
  try {
    teardownInner(reason)
  } finally {
    state.tearingDown = false
  }
}

function teardownInner(reason) {
  stopLiveView()
  for (const k of ['pump', 'keepAlive']) {
    if (state.timers[k]) clearInterval(state.timers[k])
    state.timers[k] = null
  }
  if (state.capture) {
    clearTimeout(state.capture.timeout)
    state.capture.reject(new Error(reason || '카메라 연결 해제'))
    state.capture = null
  }
  const eds = state.eds
  if (eds && state.camera) {
    try {
      setUint32(PropID_Evf_OutputDevice, 0)
    } catch {
      /* 무시 */
    }
    if (state.sessionOpen) {
      try {
        eds.EdsCloseSession(state.camera)
      } catch {
        /* 무시 */
      }
      state.sessionOpen = false
      log('[bridge] 세션 닫음')
    }
    try {
      eds.EdsRelease(state.camera)
    } catch {
      /* 무시 */
    }
  }
  if (eds && state.cameraList) {
    try {
      eds.EdsRelease(state.cameraList)
    } catch {
      /* 무시 */
    }
  }
  if (eds && state.sdkInit) {
    try {
      eds.EdsTerminateSDK()
    } catch {
      /* 무시 */
    }
    state.sdkInit = false
    log('[bridge] SDK 종료')
  }
  for (const k of ['object', 'stateEvt']) {
    if (state.callbacks[k]) {
      try {
        koffi.unregister(state.callbacks[k])
      } catch {
        /* 무시 */
      }
      state.callbacks[k] = null
    }
  }
  state.camera = null
  state.cameraList = null
  state.connected = false
  if (reason) state.error = reason
}

// 200D II 의 전원 스위치는 OFF · ON(사진) · 동영상 세 칸 — 끝까지 밀면 동영상 모드가 되고,
// 그 상태에선 셔터 명령이 전부 TAKE_PICTURE_AF_NG 로 거부된다(2026-09-27 매장 장애). 라이브뷰가 16:9 면 동영상 모드로 본다.
const MOVIE_MODE_MESSAGE = '카메라가 동영상 모드입니다 — 카메라 전원 스위치를 ON(사진) 칸으로 옮겨주세요'
function jpegSize(buf) {
  for (let i = 2; i + 9 < buf.length; ) {
    if (buf[i] !== 0xff) return null
    const marker = buf[i + 1]
    if (marker >= 0xc0 && marker <= 0xc3) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) }
    i += 2 + buf.readUInt16BE(i + 2)
  }
  return null
}
const inMovieMode = () => !!state.evfSize && Math.abs(state.evfSize.w / state.evfSize.h - 16 / 9) < 0.05

// ── 라이브뷰
function startLiveView() {
  if (state.liveView || !state.connected) return
  setUint32(PropID_Evf_Mode, 1)
  setUint32(PropID_Evf_OutputDevice, EvfOutputDevice_PC)
  state.liveView = true
  log('[bridge] 라이브뷰 시작')
  scheduleEvf()
}

function stopLiveView() {
  if (state.timers.evf) clearTimeout(state.timers.evf)
  state.timers.evf = null
  if (state.liveView && state.connected && state.camera) {
    try {
      setUint32(PropID_Evf_OutputDevice, 0)
    } catch {
      /* 무시 */
    }
    log('[bridge] 라이브뷰 중지')
  }
  state.liveView = false
  // 다시 켤 때 몇 초 전 장면이 잠깐 비치지 않도록 버린다
  state.lastFrame = null
  state.lastFrameAt = 0
}

function scheduleEvf() {
  if (!state.liveView) return
  state.timers.evf = setTimeout(() => {
    if (Date.now() - state.lastRequestAt > EVF_IDLE_STOP_MS) {
      stopLiveView()
      return
    }
    if (!state.capture) downloadEvf()
    scheduleEvf()
  }, EVF_POLL_MS)
}

function readStream(streamRef) {
  const ptr = [null]
  const len = [BigInt(0)]
  state.eds.EdsGetPointer(streamRef, ptr)
  state.eds.EdsGetLength(streamRef, len)
  const n = Number(len[0])
  if (!n || !ptr[0]) return null
  return Buffer.from(koffi.decode(ptr[0], koffi.array('uint8', n)))
}

function downloadEvf() {
  if (!state.liveView || !state.connected) return
  const eds = state.eds
  let stream = null
  let evf = null
  try {
    const sOut = [null]
    if (eds.EdsCreateMemoryStream(0, sOut) !== EDS_ERR_OK) return
    stream = sOut[0]
    const eOut = [null]
    if (eds.EdsCreateEvfImageRef(stream, eOut) !== EDS_ERR_OK) return
    evf = eOut[0]
    // OBJECT_NOTREADY/DEVICE_BUSY 는 전환 중에 정상적으로 난다 — 이번 프레임만 건너뛴다
    const t = Date.now()
    const derr = eds.EdsDownloadEvfImage(state.camera, evf)
    state.evfStats.ms += Date.now() - t
    if (derr !== EDS_ERR_OK) {
      state.evfStats.skip++
      return
    }
    state.evfStats.ok++
    const jpeg = readStream(stream)
    if (jpeg) {
      state.lastFrame = jpeg
      state.lastFrameAt = Date.now()
      state.frames++
      if (state.frames === 1 || state.frames % 100 === 0) {
        const size = jpegSize(jpeg)
        const wasMovie = inMovieMode()
        if (size) state.evfSize = size
        if (state.frames === 1) log(`[bridge] 첫 라이브뷰 프레임 ${jpeg.length} bytes ${size ? `${size.w}x${size.h}` : ''}`)
        if (inMovieMode() && !wasMovie) log(`[bridge] ${MOVIE_MODE_MESSAGE}`)
      }
    }
  } catch {
    /* 프레임 하나 실패는 무시 */
  } finally {
    if (evf) eds.EdsRelease(evf)
    if (stream) eds.EdsRelease(stream)
  }
}

// ── 촬영
function capture() {
  return new Promise((resolve, reject) => {
    if (!state.connected) return reject(new Error('카메라가 연결돼 있지 않습니다'))
    if (state.capture) return reject(new Error('이미 촬영 중입니다'))
    if (inMovieMode()) {
      log(`[bridge] 촬영 거부 — ${MOVIE_MODE_MESSAGE}`)
      return reject(new Error(MOVIE_MODE_MESSAGE))
    }
    const timeout = setTimeout(() => {
      state.capture = null
      log('[bridge] 촬영 시간 초과 — 셔터 후 사진이 넘어오지 않았습니다')
      reject(new Error('촬영 시간 초과 — 초점을 못 잡았거나 셔터가 눌리지 않았습니다'))
    }, CAPTURE_TIMEOUT_MS)
    state.capture = { resolve, reject, timeout }

    const press = (mode) => {
      const result = state.eds.EdsSendCommand(state.camera, CameraCommand_PressShutterButton, mode)
      state.eds.EdsSendCommand(state.camera, CameraCommand_PressShutterButton, ShutterButton_OFF)
      return result
    }
    let err = press(ShutterButton_Completely)
    // 초점을 못 잡으면 카메라가 셔터를 거부한다(초점 우선) — 손님 촬영이 멈추지 않게 AF 없이 바로 다시 누른다.
    // 부스는 서는 자리가 거의 같아 마지막 초점 그대로 찍어도 대개 선명하다.
    if (err === EDS_ERR_TAKE_PICTURE_AF_NG) {
      log('[bridge] 초점을 못 잡음 — AF 없이 다시 셔터')
      err = press(ShutterButton_Completely_NonAF)
    }
    if (err !== EDS_ERR_OK && err !== EDS_ERR_DEVICE_BUSY) {
      clearTimeout(timeout)
      state.capture = null
      log('[bridge] 셔터 실패:', errName(err))
      reject(new Error(`셔터 실패: ${errName(err)}`))
    }
  })
}

function handleDownload(dirItem) {
  const eds = state.eds
  if (!state.capture) {
    // 요청하지 않은 전송(카메라 버튼을 직접 누름 등)은 취소
    try {
      eds.EdsDownloadCancel(dirItem)
      eds.EdsRelease(dirItem)
    } catch {
      /* 무시 */
    }
    return
  }
  const { resolve, reject, timeout } = state.capture
  state.capture = null
  clearTimeout(timeout)
  let stream = null
  try {
    const info = {}
    let err = eds.EdsGetDirectoryItemInfo(dirItem, info)
    if (err !== EDS_ERR_OK) throw new Error(`파일 정보: ${errName(err)}`)
    const size = BigInt(info.Size)
    const sOut = [null]
    err = eds.EdsCreateMemoryStream(size, sOut)
    if (err !== EDS_ERR_OK) throw new Error(`메모리 스트림: ${errName(err)}`)
    stream = sOut[0]
    err = eds.EdsDownload(dirItem, size, stream)
    if (err !== EDS_ERR_OK) throw new Error(`다운로드: ${errName(err)}`)
    eds.EdsDownloadComplete(dirItem)
    const jpeg = readStream(stream)
    if (!jpeg) throw new Error('빈 파일')
    log(`[bridge] 촬영 완료 ${jpeg.length} bytes`)
    resolve(jpeg)
  } catch (e) {
    reject(e)
  } finally {
    if (stream) eds.EdsRelease(stream)
    try {
      eds.EdsRelease(dirItem)
    } catch {
      /* 무시 */
    }
  }
}

// ── 자동 연결 (카메라를 켜거나 다른 앱을 끄면 알아서 붙는다)
async function tryConnect() {
  if (state.connected) return
  try {
    await connect()
  } catch (e) {
    state.error = e.message
  }
}

// ── HTTP
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  // 공개 사이트(https)가 localhost 를 부를 때 크롬의 사설망 접근 사전확인을 통과시킨다
  res.setHeader('Access-Control-Allow-Private-Network', 'true')
  res.setHeader('Cache-Control', 'no-store')
}

function evfReport(reset) {
  const st = state.evfStats
  const sec = (Date.now() - st.since) / 1000
  const calls = st.ok + st.skip
  const report = {
    fps: sec > 0 ? +(st.ok / sec).toFixed(1) : 0,
    skipRatio: calls ? +(st.skip / calls).toFixed(2) : 0,
    avgCallMs: calls ? Math.round(st.ms / calls) : 0,
    seconds: +sec.toFixed(1),
  }
  if (reset) state.evfStats = { ok: 0, skip: 0, ms: 0, since: Date.now() }
  return report
}

function json(res, status, body) {
  cors(res)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (req.method === 'OPTIONS') {
    cors(res)
    res.writeHead(204)
    return res.end()
  }

  try {
    if (url.pathname === '/health') {
      return json(res, 200, {
        ok: true,
        connected: state.connected,
        model: state.model,
        liveView: state.liveView,
        frames: state.frames,
        lastFrameAgeMs: state.lastFrameAt ? Date.now() - state.lastFrameAt : null,
        evf: evfReport(url.searchParams.has('reset')),
        evfSize: state.evfSize,
        movieMode: inMovieMode(),
        error: state.error || (inMovieMode() ? MOVIE_MODE_MESSAGE : null),
      })
    }

    if (url.pathname === '/frame.jpg') {
      state.lastRequestAt = Date.now()
      if (!state.connected) await tryConnect()
      // 카메라가 빠졌는데 마지막 프레임을 계속 주면 부스는 멈춘 화면을 라이브로 착각한다
      if (!state.connected) return json(res, 503, { ok: false, error: state.error || '카메라 없음' })
      if (!state.liveView) startLiveView()
      if (!state.lastFrame) {
        cors(res)
        res.writeHead(204)
        return res.end()
      }
      cors(res)
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': state.lastFrame.length })
      return res.end(state.lastFrame)
    }

    if (url.pathname === '/capture' && req.method === 'POST') {
      if (!state.connected) await tryConnect()
      const jpeg = await capture()
      cors(res)
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': jpeg.length })
      return res.end(jpeg)
    }

    if (url.pathname === '/release' && req.method === 'POST') {
      // dslrBooth 등 다른 앱에 카메라를 넘겨줄 때. 자동 재연결도 멈춘다
      clearInterval(state.timers.retry)
      state.timers.retry = null
      teardown()
      state.error = '해제됨 — 브리지를 다시 켜면 연결합니다'
      return json(res, 200, { ok: true, released: true })
    }

    return json(res, 404, { ok: false, error: 'not found' })
  } catch (e) {
    return json(res, 503, { ok: false, error: e.message })
  }
})

// ── 시작·종료
/**
 * 포트를 먼저 잡고, 잡은 뒤에만 카메라에 붙는다.
 * 이미 다른 브리지가 떠 있으면(EADDRINUSE) 카메라를 건드리지 않고 물러난다 — 둘이 카메라를 다투면 둘 다 죽는다.
 */
function start() {
  return new Promise((resolve, reject) => {
    server.once('error', (e) => {
      log('[bridge] 포트 사용 불가:', e.code || e.message)
      reject(e)
    })
    // 로컬 전용 — 매장 네트워크의 다른 기기에서는 접근할 수 없다
    server.listen(PORT, '127.0.0.1', () => {
      log(`[bridge] http://localhost:${PORT} 대기 중 (${APP_DIR})`)
      state.timers.retry = setInterval(tryConnect, 5000)
      tryConnect()
      resolve()
    })
  })
}

/** 카메라를 놓고 포트를 닫는다 — 부스 앱 종료 시 dslrBooth 가 바로 카메라를 잡을 수 있게 */
function stop() {
  log('[bridge] 종료 중')
  if (state.timers.retry) clearInterval(state.timers.retry)
  state.timers.retry = null
  teardown()
  return new Promise((resolve) => server.close(() => resolve()))
}

module.exports = { start, stop, state }

// 단독 실행 (ELECTRON_RUN_AS_NODE=1 ... bridge.cjs)
if (require.main === module) {
  start().catch(() => process.exit(1))
  let exiting = false
  const shutdown = () => {
    if (exiting) return
    exiting = true
    stop().finally(() => {
      log('[bridge] 정리 완료 — 종료')
      // 카메라는 이미 놓았다. 정상 exit 은 EDSDK DLL 언로드 중에 죽으므로(0xC0000409)
      // 로그가 기록될 틈만 주고 프로세스를 바로 끊는다
      setTimeout(() => process.kill(process.pid, 'SIGKILL'), 100)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  // 부스 앱이 띄운 경우 — 'stop' 메시지나 부모가 사라지면 카메라를 놓고 끝낸다
  if (process.send) {
    process.on('message', (m) => m === 'stop' && shutdown())
    process.on('disconnect', shutdown)
  }
  process.on('uncaughtException', (e) => {
    log('[bridge] 예외:', e && e.message)
    state.error = e && e.message
  })
}
