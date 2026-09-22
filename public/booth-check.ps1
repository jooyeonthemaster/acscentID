# AC'SCENT 포토부스 — 매장 PC 점검 스크립트
#
# 설치하거나 설정을 바꾸지 않습니다. 정보를 읽어서 개발 서버로 보내기만 합니다.
# 행사용 카메라 설정에 영향을 주지 않도록 조회(Get-*) 명령만 사용합니다.
#
# 실행: powershell -ExecutionPolicy Bypass -Command "irm http://172.30.1.40:3000/booth-check.ps1 | iex"

$ErrorActionPreference = 'SilentlyContinue'
$server = 'http://172.30.1.40:3000'

Write-Host ''
Write-Host '  AC''SCENT 포토부스 점검' -ForegroundColor Cyan
Write-Host '  (읽기만 합니다 - 설치/설정 변경 없음)' -ForegroundColor DarkGray
Write-Host ''

# ── 기본 정보
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$report = @{
  collectedAt = (Get-Date).ToString('o')
  source      = 'booth-check.ps1'
  system      = @{
    os       = $os.Caption
    version  = $os.Version
    computer = $env:COMPUTERNAME
    model    = "$($cs.Manufacturer) $($cs.Model)"
    memoryGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
  }
}

# ── 프린터
Write-Host '  [1/4] 프린터 확인...' -ForegroundColor Yellow
$printers = @()
foreach ($p in Get-Printer) {
  $cfg = Get-PrintConfiguration -PrinterName $p.Name
  $printers += @{
    name        = $p.Name
    driver      = $p.DriverName
    port        = $p.PortName
    default     = [bool]$p.Default
    status      = "$($p.PrinterStatus)"
    paperSize   = "$($cfg.PaperSize)"
    orientation = "$($cfg.LandscapeOrientation)"
    color       = "$($cfg.Color)"
  }
  $mark = if ($p.Default) { '*' } else { ' ' }
  Write-Host "      $mark $($p.Name)  [$($cfg.PaperSize)]"
}
$report.printers = $printers

# ── 영상 장치 (웹캠/캡처보드)
Write-Host '  [2/4] 영상 장치 확인...' -ForegroundColor Yellow
$cams = @()
foreach ($d in Get-PnpDevice -Class Camera, Image -Status OK) {
  $cams += @{ name = $d.FriendlyName; class = $d.Class; id = $d.InstanceId }
  Write-Host "      - $($d.FriendlyName)  [$($d.Class)]"
}
if ($cams.Count -eq 0) { Write-Host '      (없음)' -ForegroundColor DarkGray }
$report.videoDevices = $cams

# ── 카메라로 인식되지 않은 USB 장치 (DSLR 등)
$other = @()
foreach ($d in Get-PnpDevice -Status OK | Where-Object {
    $_.FriendlyName -match 'Canon|Nikon|Sony|EOS|Capture|HDMI|Webcam|Cam Link'
  }) {
  $other += @{ name = $d.FriendlyName; class = $d.Class }
  Write-Host "      ~ $($d.FriendlyName)  [$($d.Class)]" -ForegroundColor DarkGray
}
$report.relatedDevices = $other

# ── 카메라 관련 설치 소프트웨어 (행사용 앱 파악)
Write-Host '  [3/4] 설치된 관련 소프트웨어...' -ForegroundColor Yellow
$apps = @()
$paths = @(
  'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($a in Get-ItemProperty $paths | Where-Object {
    $_.DisplayName -match 'Canon|EOS|dslr|Booth|digiCam|Capture|DNP|Photo|OBS'
  }) {
  $apps += @{ name = $a.DisplayName; version = "$($a.DisplayVersion)" }
  Write-Host "      - $($a.DisplayName) $($a.DisplayVersion)"
}
if ($apps.Count -eq 0) { Write-Host '      (해당 없음)' -ForegroundColor DarkGray }
$report.installedApps = $apps

# ── 크롬
$chrome = @('C:\Program Files\Google\Chrome\Application\chrome.exe',
            'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe') |
          Where-Object { Test-Path $_ } | Select-Object -First 1
$report.chrome = @{
  path    = "$chrome"
  version = if ($chrome) { (Get-Item $chrome).VersionInfo.ProductVersion } else { $null }
}

# ── 전송
Write-Host '  [4/4] 결과 전송...' -ForegroundColor Yellow
try {
  $json = $report | ConvertTo-Json -Depth 6
  Invoke-RestMethod -Uri "$server/api/photobooth/diag" -Method Post -Body $json -ContentType 'application/json' | Out-Null
  Write-Host ''
  Write-Host '  전송 완료. 개발 쪽에서 확인합니다.' -ForegroundColor Green
} catch {
  Write-Host ''
  Write-Host "  전송 실패: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host '  아래 내용을 복사해서 전달해 주세요:' -ForegroundColor Yellow
  $report | ConvertTo-Json -Depth 6
}
Write-Host ''
