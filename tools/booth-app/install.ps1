<#
  AC'SCENT WOW 포토부스 앱 설치 (매장 PC)

  NEANDER LAB Photobooth 설치본에서 Electron 런타임·캐논 EDSDK·koffi 만 복사하고,
  앱 코드(resources\app)는 우리 것으로 넣는다. 원본 NEANDER 앱·dslrBooth 는 건드리지 않는다.

  실행: powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -Base <파일 받을 주소> -AppUrl <부스 주소>
  (이 파일은 UTF-8 BOM 으로 저장해야 바로가기 한글 이름이 깨지지 않는다)
#>
param(
  [string]$Base = 'http://172.30.1.40:3000/api/photobooth/agent?token=wow-booth-2026&script=',
  [string]$AppUrl = 'https://www.acscent.co.kr/booth',
  [string]$Src = 'C:\Program Files\NEANDER LAB Photobooth',
  [string]$Dst = 'C:\ACSCENT-WOW-Booth'
)
$ErrorActionPreference = 'Stop'
$ExeName = 'ACSCENT-WOW-Booth.exe'

if (-not (Test-Path "$Src\resources\edsdk-dlls\EDSDK.dll")) { throw "NEANDER runtime not found: $Src" }

# 1) 실행 중인 부스·테스트 프로세스 정리 (카메라를 놓게 한다)
Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq $ExeName -or "$($_.CommandLine)" -match 'camera-bridge|acscent-cdp'
} | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  "stopped $($_.Name) $($_.ProcessId)"
}
Start-Sleep -Seconds 2

# 2) 런타임 복사 — 1.8GB 중 필요한 것만 (내장 서버·파이썬·설치 파일 제외)
New-Item -ItemType Directory -Force -Path $Dst | Out-Null
robocopy $Src $Dst /E /XD "$Src\resources" /XF 'Uninstall*.exe' /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy runtime failed: $LASTEXITCODE" }
robocopy "$Src\resources\edsdk-dlls" "$Dst\resources\edsdk-dlls" /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy edsdk failed: $LASTEXITCODE" }
robocopy "$Src\resources\app.asar.unpacked\node_modules\koffi" "$Dst\resources\app.asar.unpacked\node_modules\koffi" /E /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy koffi failed: $LASTEXITCODE" }

if (Test-Path "$Dst\NEANDER LAB Photobooth.exe") {
  Move-Item -Force "$Dst\NEANDER LAB Photobooth.exe" "$Dst\$ExeName"
}
# 원본 앱 코드가 섞여 들어오지 않게 (resources\app 폴더만 쓰도록)
Remove-Item -Force -ErrorAction SilentlyContinue "$Dst\resources\app.asar"

# 3) 앱 코드
$AppDir = "$Dst\resources\app"
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
$files = @{
  'package.json'  = 'package.json'
  'main.js'       = 'main.js'
  'preload.js'    = 'preload.js'
  'offline.html'  = 'offline.html'
  'booth.ico'     = 'booth.ico'
  'print-photo.ps1' = 'print-photo.ps1'
  'bridge.cjs'    = 'camera-bridge.cjs'
}
$wc = New-Object System.Net.WebClient
foreach ($name in $files.Keys) {
  $wc.DownloadFile($Base + $files[$name], "$AppDir\$name")
  "app file: $name $((Get-Item "$AppDir\$name").Length) bytes"
}

# 4) 설정 — 이미 있으면 부스 주소만 갱신 (프린터 등 현장 설정은 보존)
$configPath = "$Dst\config.json"
$config = [ordered]@{ appUrl = $AppUrl; printerName = ''; kiosk = $true; zoomFactor = 1.5 }
if (Test-Path $configPath) {
  try {
    $old = Get-Content -Raw -Encoding UTF8 $configPath | ConvertFrom-Json
    if ($old.printerName) { $config.printerName = $old.printerName }
    if ($null -ne $old.kiosk) { $config.kiosk = [bool]$old.kiosk }
    # 관리자 팝업에서 고른 화면 크기는 재설치해도 유지
    if ($old.zoomFactor) { $config.zoomFactor = [double]$old.zoomFactor }
  } catch {}
}
[System.IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))
"config: $(Get-Content -Raw $configPath)"

# 5) 바탕화면 바로가기
$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop "AC'SCENT 포토부스.lnk"
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath = "$Dst\$ExeName"
$lnk.WorkingDirectory = $Dst
$lnk.IconLocation = "$AppDir\booth.ico,0"
$lnk.Description = "AC'SCENT WOW Photobooth"
$lnk.Save()
"shortcut: ok ($((Get-ChildItem $desktop -Filter '*.lnk' | Where-Object { $_.Name -like 'AC*' }).Count) AC* shortcut)"

$size = [math]::Round(((Get-ChildItem $Dst -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 1)
"installed: $Dst ($size MB)"
