<#
  부스 사진 인쇄 — 완성 원판(JPEG)을 프린터로 바로 보낸다.

  브라우저 인쇄(webContents.print)에 맡기면 용지를 이름으로 고를 수 없다.
  매장 DS-RX1 의 기본 용지는 가로 (6x4) 라서, 세로 4x6 페이지가 가로 용지에 얹혀
  잘리거나 축소돼 나왔다(2026-09-21 실물 확인). 그래서 용지를 이름으로 직접 지정한다.

  실행: powershell -NoProfile -ExecutionPolicy Bypass -File print-photo.ps1 -Image <jpg> [-Printer <이름>] [-Paper "PR (4x6)"] [-Cut2Inch] [-Copies 2]
  (이 파일은 UTF-8 BOM 으로 저장해야 한글 주석이 깨지지 않는다)

  -Cut2Inch: 2×6 띠지 둘을 나란히 그린 4x6 원판(ANSAN 타임캡슐)을 가운데로 잘라 띠지 두 장으로.
  매장 부스 실물 시험(2026-11-04, 네 번 인쇄)에서 잘린 조합은 하나뿐이었다 —
    용지 '(6x4)'(PrintTicket ns0000:PC) + 방향 '세로'(용지를 돌리지 않음 = 가로로 긴 6x4 페이지) + ns0000:DocumentCUTTERCONTROL = CUT_2INCH,
    원판은 90도 돌려 그 페이지에 얹는다(이 PC 의 dslrBooth 띠지 설정과 같은 조합).
  안 잘린 조합: 'PR (4x6)' + 2인치(문서 설정·프린터 기본 설정 둘 다), '(6x4)' 를 돌려(가로 방향) 쓴 것.
  'PR (4x6) x 2' 는 2인치 자르기가 아니다(6x8 용지에 두 장).
  ⚠ 같은 조합이라도 PrintTicket → DEVMODE 로 '만든' 설정은 안 잘렸다(되읽으면 CUT_2INCH 로 보이는데도) — 잘린 것은
  드라이버가 직접 만든 DEVMODE(dslrBooth 가 저장해 둔 PageDevmodeSnapshot) 뿐이다. 그래서 그 원본을 옆 파일
  strip-devmode.b64 로 두고 그대로 쓴다 → 없으면 이 PC 의 dslrBooth printer_settings.xml 에서 → 그것도 없으면 PrintTicket 으로 만든다.
  이 인쇄 한 건의 DEVMODE 에만 넣는다 — 프린터 기본값은 그대로라 매장 4x6 사진은 잘리지 않는다.
  켜지 못하면 경고만 남기고 보통으로(PR 4x6, 자르지 않고) 인쇄한다.
  -Copies: 같은 원판을 몇 장(4x6 기준) — 띠지는 장마다 두 장씩 나온다.
#>
param(
  [Parameter(Mandatory = $true)][string]$Image,
  [string]$Printer = '',
  [string]$Paper = 'PR (4x6)',
  [switch]$Cut2Inch,
  [ValidateRange(1, 10)][int]$Copies = 1
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$doc = New-Object System.Drawing.Printing.PrintDocument
if ($Printer) { $doc.PrinterSettings.PrinterName = $Printer }
if (-not $doc.PrinterSettings.IsValid) { throw "printer not valid: $($doc.PrinterSettings.PrinterName)" }
$papers = @($doc.PrinterSettings.PaperSizes)

# 2인치 자르기 — 잘리는 DEVMODE(용지 PC · 세로 · CUT_2INCH)를 이 문서에만 넣는다. 용지·방향은 원본 그대로(다르면만 맞춘다)
$cut = 'standard'
$cutOn = $false
if ($Cut2Inch) {
  try {
    if (-not ('AcsGMem' -as [type])) {
      Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class AcsGMem { [DllImport("kernel32.dll")] public static extern IntPtr GlobalAlloc(uint f, UIntPtr n); [DllImport("kernel32.dll")] public static extern IntPtr GlobalLock(IntPtr h); [DllImport("kernel32.dll")] public static extern bool GlobalUnlock(IntPtr h); [DllImport("kernel32.dll")] public static extern IntPtr GlobalFree(IntPtr h); }'
    }
    $pc = $papers | Where-Object { $_.PaperName -eq '(6x4)' } | Select-Object -First 1
    if (-not $pc) { throw 'no (6x4) paper in this driver' }
    $devmode = $null
    $source = ''
    # 1) 앱 폴더의 원본(이 PC 의 dslrBooth 띠지 설정에서 뽑은 것, 2026-11-04 실물로 잘림 확인)
    $saved = Join-Path $PSScriptRoot 'strip-devmode.b64'
    if (Test-Path $saved) { $devmode = [Convert]::FromBase64String((Get-Content $saved -Raw).Trim()); $source = 'saved' }
    # 2) 이 PC 의 dslrBooth 띠지 설정(자르기가 켜져 있을 때만)
    if (-not $devmode) {
      $dslr = Join-Path $env:APPDATA 'dslrBooth\printer_settings.xml'
      if (Test-Path $dslr) {
        $x = [Net.WebUtility]::HtmlDecode((Get-Content $dslr -Raw))
        $m = [regex]::Match($x, 'PageDevmodeSnapshot">\s*<psf:Value[^>]*>([^<]+)<')
        if ($m.Success -and $x -match 'CUTTERCONTROL">\s*<psf:Option name="ns0000:CUT_2INCH"') { $devmode = [Convert]::FromBase64String($m.Groups[1].Value.Trim()); $source = 'dslrbooth' }
      }
    }
    # 3) 마지막 수단 — 사용자 기본 PrintTicket 에서 만든 것(이 PC 에서는 안 잘렸다)
    if (-not $devmode) {
      Add-Type -AssemblyName System.Printing
      Add-Type -AssemblyName ReachFramework
      $name = $doc.PrinterSettings.PrinterName
      $queue = (New-Object System.Printing.LocalPrintServer).GetPrintQueue($name)
      $xml = (New-Object IO.StreamReader($queue.UserPrintTicket.GetXmlStream())).ReadToEnd()
      if ($xml -notmatch 'CUT_STANDARD|CUT_2INCH') { throw 'no 2inch cut option in this driver' }
      $xml = $xml -replace 'ns0000:CUT_STANDARD', 'ns0000:CUT_2INCH'
      $xml = [regex]::Replace($xml, '(PageMediaSize">\s*<psf:Option name=")[^"]+"', '${1}ns0000:PC"')
      $xml = [regex]::Replace($xml, '(PageOrientation">\s*<psf:Option name=")[^"]+"', '${1}psk:Portrait"')
      $ticket = New-Object System.Printing.PrintTicket((New-Object IO.MemoryStream(, [Text.Encoding]::UTF8.GetBytes($xml))))
      $converter = New-Object System.Printing.Interop.PrintTicketConverter($name, $queue.ClientPrintSchemaVersion)
      $devmode = $converter.ConvertPrintTicketToDevMode($ticket, [System.Printing.Interop.BaseDevModeType]::UserDefault)
      $source = 'ticket'
    }
    $h = [AcsGMem]::GlobalAlloc(0x0042, [UIntPtr][uint64]$devmode.Length)
    $ptr = [AcsGMem]::GlobalLock($h)
    [Runtime.InteropServices.Marshal]::Copy($devmode, 0, $ptr, $devmode.Length)
    [AcsGMem]::GlobalUnlock($h) | Out-Null
    $doc.PrinterSettings.SetHdevmode($h)
    $doc.DefaultPageSettings.SetHdevmode($h)
    [AcsGMem]::GlobalFree($h) | Out-Null
    if ($doc.DefaultPageSettings.PaperSize.PaperName -ne '(6x4)') { $doc.DefaultPageSettings.PaperSize = $pc }
    if ($doc.DefaultPageSettings.Landscape) { $doc.DefaultPageSettings.Landscape = $false }
    $cutOn = $true
    $cut = "2inch($source)"
  } catch {
    $cut = "standard(2inch failed: $($_.Exception.Message))"
    $doc = New-Object System.Drawing.Printing.PrintDocument
    if ($Printer) { $doc.PrinterSettings.PrinterName = $Printer }
  }
}

if (-not $cutOn) {
  # 용지: 이름이 맞는 것 → 없으면 4x6 크기(1/100인치 413x615, 세로·가로 무관)에 맞는 것
  $size = $papers | Where-Object { $_.PaperName -eq $Paper } | Select-Object -First 1
  if (-not $size) {
    $size = $papers | Where-Object {
      ($_.Width -ge 400 -and $_.Width -le 420 -and $_.Height -ge 600 -and $_.Height -le 620) -or
      ($_.Height -ge 400 -and $_.Height -le 420 -and $_.Width -ge 600 -and $_.Width -le 620)
    } | Select-Object -First 1
  }
  if ($size) { $doc.DefaultPageSettings.PaperSize = $size }
}

$img = [System.Drawing.Image]::FromFile($Image)
try {
  if ($cutOn) {
    # 띠지: 페이지는 가로로 긴 6x4 그대로 — 세로 원판을 90도 돌려 얹는다
    if ($img.Height -gt $img.Width) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
  } else {
    # 세로 사진인데 용지가 가로면 페이지를 돌려 맞춘다 (그 반대도)
    $imgPortrait = $img.Height -ge $img.Width
    $paperPortrait = $doc.DefaultPageSettings.PaperSize.Height -ge $doc.DefaultPageSettings.PaperSize.Width
    $doc.DefaultPageSettings.Landscape = ($imgPortrait -ne $paperPortrait)
    # 300dpi 가 있으면 고른다 (DS-RX1 원판이 300dpi) — 띠지는 잘린 조합 그대로 두려고 건드리지 않는다
    $res = $doc.PrinterSettings.PrinterResolutions | Where-Object { $_.X -eq 300 -and $_.Y -eq 300 } | Select-Object -First 1
    if ($res) { $doc.DefaultPageSettings.PrinterResolution = $res }
  }
  $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins 0, 0, 0, 0
  $doc.OriginAtMargins = $false
  $doc.DocumentName = 'ACSCENT WOW Photo'

  $script:pagesLeft = $Copies
  $doc.add_PrintPage({
    param($sender, $e)
    $b = $e.PageBounds
    $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    # 무테 인화 — 비율을 지키며 용지를 꽉 채운다(가장자리 아주 조금 잘림)
    $scale = [Math]::Max($b.Width / $img.Width, $b.Height / $img.Height)
    $w = $img.Width * $scale
    $h = $img.Height * $scale
    $e.Graphics.DrawImage($img, [float]($b.Left + ($b.Width - $w) / 2), [float]($b.Top + ($b.Height - $h) / 2), [float]$w, [float]$h)
    # 같은 원판을 장수만큼 — 한 작업 안에서 이어 인쇄(띠지는 장마다 잘려 두 장씩)
    $script:pagesLeft--
    $e.HasMorePages = $script:pagesLeft -gt 0
  })

  $doc.Print()
  $p = $doc.DefaultPageSettings
  "printed|$($doc.PrinterSettings.PrinterName)|$($p.PaperSize.PaperName)|$($p.PaperSize.Width)x$($p.PaperSize.Height)|landscape=$($p.Landscape)|img=$($img.Width)x$($img.Height)|copies=$Copies|cut=$cut"
} finally {
  $img.Dispose()
}
