// 부스 웹에 앱 기능을 노출한다 — 웹은 window.boothShell 이 있으면 앱 안이라고 판단한다
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('boothShell', {
  isShell: true,
  info: () => ipcRenderer.invoke('booth:info'),
  /** 대화상자 없이 바로 인화 — 완성 원판(JPEG data URL)을 넘기면 프린터로 직접 보낸다 */
  print: (imageDataUrl) => ipcRenderer.invoke('booth:print', imageDataUrl),
  /** 카메라를 놓고 앱 종료 */
  quit: () => ipcRenderer.invoke('booth:quit'),
  reload: () => ipcRenderer.invoke('booth:reload'),
  /** 화면 배율 (1 = 100%) */
  setZoom: (factor) => ipcRenderer.invoke('booth:set-zoom', factor),
})
