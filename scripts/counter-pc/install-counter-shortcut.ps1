# 카운터 PC — 이용권 발급 화면 바로가기 만들기 (바탕화면 + 시작 프로그램)
#
# 크롬을 --kiosk-printing 으로 띄워 인쇄 창 없이 '기본 프린터'로 바로 출력한다.
# 전용 프로필 폴더를 써서, 평소 크롬이 켜져 있어도 이 옵션이 항상 적용되고 기기 연결 쿠키가 유지된다.
#
# 실행: PowerShell 에서
#   powershell -ExecutionPolicy Bypass -File .\install-counter-shortcut.ps1
#   (전체 화면으로 쓰려면 -Fullscreen, 다른 주소면 -Url https://...)

param(
  [string]$Url = 'https://www.acscent.co.kr/booth/counter',
  [switch]$Fullscreen
)

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
  Write-Error '크롬을 찾지 못했습니다. https://www.google.com/chrome 에서 설치한 뒤 다시 실행하세요.'
  exit 1
}

$profileDir = Join-Path $env:LOCALAPPDATA 'AcscentCounter'
$mode = if ($Fullscreen) { '--kiosk' } else { '--start-maximized' }
$arguments = "--kiosk-printing $mode --user-data-dir=`"$profileDir`" --no-first-run --app=$Url"

$shell = New-Object -ComObject WScript.Shell
$targets = @(
  (Join-Path ([Environment]::GetFolderPath('Desktop')) '포토부스 이용권 발급.lnk'),
  (Join-Path ([Environment]::GetFolderPath('Startup')) '포토부스 이용권 발급.lnk')
)
foreach ($path in $targets) {
  $link = $shell.CreateShortcut($path)
  $link.TargetPath = $chrome
  $link.Arguments = $arguments
  $link.WorkingDirectory = Split-Path $chrome
  $link.Save()
  Write-Host "만듦: $path"
}

Write-Host ''
Write-Host '다음 단계:'
Write-Host '  1) 영수증 프린터를 [설정 > 프린터]에서 기본 프린터로 지정 (Windows 가 기본 프린터를 자동 관리하지 않게 끄기)'
Write-Host '  2) 바탕화면의 [포토부스 이용권 발급]을 열고 카운터 PIN 입력'
Write-Host '  3) 화면 아래 [시험 출력]으로 쪽지가 한 장씩 잘려 나오는지 확인'
