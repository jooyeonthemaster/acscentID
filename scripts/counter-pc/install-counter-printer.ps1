# 카운터 PC — 영수증 프린터(OKPOS OK30) 설치. 제조사 드라이버 없이 한 번 실행하면 끝난다.
#
#   1) USB 로 꽂힌 OK30 을 찾아 윈도우 내장 'Generic / Text Only' 로 'ACSCENT-Receipt' 등록
#      (드라이버는 이름만 빌린다 — 실제 데이터는 인쇄 도우미가 RAW 로 보낸다)
#   2) 인쇄 도우미(counter-print-helper.ps1)를 C:\ACSCENT-Counter 에 두고 부팅 시 자동 실행
#   3) 크롬이 www.acscent.co.kr 에서 이 PC 의 도우미(127.0.0.1)에 묻지 않고 접근하도록 허용
#   4) 이용권 발급 바로가기(install-counter-shortcut.ps1) 만들기
#   5) 시험 쪽지 출력
#
# 실행: 같은 폴더의 INSTALL.cmd 를 더블클릭 (관리자 권한을 스스로 요청한다)

param(
  [string]$Port = '',
  [switch]$SkipShortcut
)

$ErrorActionPreference = 'Stop'
$PrinterName = 'ACSCENT-Receipt'
$DriverName = 'Generic / Text Only'
$InstallDir = 'C:\ACSCENT-Counter'
$TaskName = 'ACSCENT_COUNTER_PRINT'
# OK30(Sewoo LK-T) 의 USB 장치 번호 — 맥에서 확인: Vendor 0x0525, Product 0xa700
$UsbId = 'VID_0525&PID_A700'

function Step([string]$text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Fail([string]$text) {
  Write-Host ''
  Write-Host "[실패] $text" -ForegroundColor Red
  Read-Host '엔터를 누르면 닫힙니다'
  exit 1
}

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  if ($Port) { $argList += " -Port $Port" }
  if ($SkipShortcut) { $argList += ' -SkipShortcut' }
  Start-Process powershell.exe -Verb RunAs -ArgumentList $argList
  exit
}

Step '영수증 프린터 찾기'
if (-not $Port) {
  if (-not (Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object InstanceId -like "USB\$UsbId*")) {
    Fail "영수증 프린터가 USB 로 보이지 않습니다. 전원을 켜고 USB 케이블(변환 젠더 말고 프린터 뒤 네모난 USB 단자)을 확인한 뒤 다시 실행하세요."
  }
  # USB 인쇄 포트(USB001…) 중 이 프린터 것 — 장치 인터페이스 레지스트리의 Port Number 로 찾는다
  $ifaces = 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceClasses\{28d78fad-5a12-11d1-ae5b-0000f803a8c2}'
  foreach ($key in Get-ChildItem $ifaces -ErrorAction SilentlyContinue) {
    if ($key.PSChildName -notlike "*$UsbId*") { continue }
    # 키 이름에 '?' 가 들어 있어 와일드카드로 읽히지 않게 LiteralPath
    $params = Get-ItemProperty -LiteralPath "$($key.PSPath)\#\Device Parameters" -ErrorAction SilentlyContinue
    if ($params -and $null -ne $params.'Port Number') {
      $Port = '{0}{1:000}' -f $params.'Base Name', [int]$params.'Port Number'
    }
  }
  $usbPorts = @(Get-PrinterPort | Where-Object Name -like 'USB*' | Select-Object -ExpandProperty Name)
  if (-not $Port -and $usbPorts.Count -eq 1) { $Port = $usbPorts[0] }
  if (-not $Port) {
    Fail ("프린터는 보이지만 USB 인쇄 포트를 찾지 못했습니다. 포트 목록: {0}`n  예) 포트를 직접 지정: .\install-counter-printer.ps1 -Port USB001" -f ($usbPorts -join ', '))
  }
}
Write-Host "  포트: $Port"

Step "윈도우 내장 드라이버로 '$PrinterName' 등록"
if (-not (Get-PrinterDriver -Name $DriverName -ErrorAction SilentlyContinue)) {
  Add-PrinterDriver -Name $DriverName
}
if (Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue) {
  Set-Printer -Name $PrinterName -PortName $Port -DriverName $DriverName
} else {
  Add-Printer -Name $PrinterName -DriverName $DriverName -PortName $Port
}
Write-Host '  완료'

Step '인쇄 도우미 설치 (부팅 시 자동 실행)'
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
  Where-Object CommandLine -like '*counter-print-helper.ps1*' |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'counter-print-helper.ps1') $InstallDir -Force
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$InstallDir\counter-print-helper.ps1`""
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger (New-ScheduledTaskTrigger -AtStartup) -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
$health = $null
foreach ($i in 1..20) {
  Start-Sleep -Milliseconds 500
  try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:9131/health' -TimeoutSec 2; break } catch {}
}
if (-not $health) { Fail "인쇄 도우미가 켜지지 않았습니다. $InstallDir\helper.log 를 확인하세요." }
if (-not $health.ok) { Write-Host "  도우미는 켜졌지만 프린터 확인 필요: $($health.error)" -ForegroundColor Yellow }
else { Write-Host '  도우미 실행 중 (127.0.0.1:9131)' }

Step '크롬 허용 (이용권 화면 → 이 PC 의 인쇄 도우미)'
# 인터넷 사이트가 이 PC(127.0.0.1)에 요청하면 크롬이 허용 여부를 묻는다 — 우리 사이트만 미리 허용
foreach ($policy in 'LocalNetworkAccessAllowedForUrls', 'InsecurePrivateNetworkRequestsAllowedForUrls') {
  $key = "HKLM:\SOFTWARE\Policies\Google\Chrome\$policy"
  New-Item -Path $key -Force | Out-Null
  Set-ItemProperty -Path $key -Name '1' -Value 'https://www.acscent.co.kr'
  Set-ItemProperty -Path $key -Name '2' -Value 'https://acscent.co.kr'
}
Write-Host '  완료 (크롬을 완전히 껐다 켜면 적용)'

if (-not $SkipShortcut -and (Test-Path (Join-Path $PSScriptRoot 'install-counter-shortcut.ps1'))) {
  Step '이용권 발급 바로가기'
  & (Join-Path $PSScriptRoot 'install-counter-shortcut.ps1')
}

Step '시험 쪽지 출력'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$InstallDir\counter-print-helper.ps1" -SelfTest
if ($LASTEXITCODE -ne 0) { Fail '시험 출력에 실패했습니다. 프린터 전원·용지·덮개를 확인하고 다시 실행하세요.' }

Write-Host ''
Write-Host '[완료] 설치가 끝났습니다. 프린터에서 "인쇄 도우미 시험 출력" 쪽지가 나왔는지 확인하세요.' -ForegroundColor Green
Write-Host '  다음: 바탕화면 [포토부스 이용권 발급] → 카운터 PIN(또는 관리자 로그인) → [시험 출력]'
Read-Host '엔터를 누르면 닫힙니다'
