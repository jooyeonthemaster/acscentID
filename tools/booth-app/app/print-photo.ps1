<#
  부스 사진 인쇄 — 완성 원판(JPEG)을 프린터로 바로 보낸다.

  브라우저 인쇄(webContents.print)에 맡기면 용지를 이름으로 고를 수 없다.
  매장 DS-RX1 의 기본 용지는 가로 (6x4) 라서, 세로 4x6 페이지가 가로 용지에 얹혀
  잘리거나 축소돼 나왔다(2026-09-21 실물 확인). 그래서 용지를 이름으로 직접 지정한다.

  실행: powershell -NoProfile -ExecutionPolicy Bypass -File print-photo.ps1 -Image <jpg> [-Printer <이름>] [-Paper "PR (4x6)"]
  (이 파일은 UTF-8 BOM 으로 저장해야 한글 주석이 깨지지 않는다)
#>
param(
  [Parameter(Mandatory = $true)][string]$Image,
  [string]$Printer = '',
  [string]$Paper = 'PR (4x6)'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$doc = New-Object System.Drawing.Printing.PrintDocument
if ($Printer) { $doc.PrinterSettings.PrinterName = $Printer }
if (-not $doc.PrinterSettings.IsValid) { throw "printer not valid: $($doc.PrinterSettings.PrinterName)" }

# 용지: 이름이 맞는 것 → 없으면 4x6 크기(1/100인치 413x615, 세로·가로 무관)에 맞는 것
$papers = @($doc.PrinterSettings.PaperSizes)
$size = $papers | Where-Object { $_.PaperName -eq $Paper } | Select-Object -First 1
if (-not $size) {
  $size = $papers | Where-Object {
    ($_.Width -ge 400 -and $_.Width -le 420 -and $_.Height -ge 600 -and $_.Height -le 620) -or
    ($_.Height -ge 400 -and $_.Height -le 420 -and $_.Width -ge 600 -and $_.Width -le 620)
  } | Select-Object -First 1
}
if ($size) { $doc.DefaultPageSettings.PaperSize = $size }

$img = [System.Drawing.Image]::FromFile($Image)
try {
  # 세로 사진인데 용지가 가로면 페이지를 돌려 맞춘다 (그 반대도)
  $imgPortrait = $img.Height -ge $img.Width
  $paperPortrait = $doc.DefaultPageSettings.PaperSize.Height -ge $doc.DefaultPageSettings.PaperSize.Width
  $doc.DefaultPageSettings.Landscape = ($imgPortrait -ne $paperPortrait)
  $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins 0, 0, 0, 0
  $doc.OriginAtMargins = $false
  $doc.DocumentName = 'ACSCENT WOW Photo'
  # 300dpi 가 있으면 고른다 (DS-RX1 원판이 300dpi)
  $res = $doc.PrinterSettings.PrinterResolutions | Where-Object { $_.X -eq 300 -and $_.Y -eq 300 } | Select-Object -First 1
  if ($res) { $doc.DefaultPageSettings.PrinterResolution = $res }

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
  })

  $doc.Print()
  $p = $doc.DefaultPageSettings
  "printed|$($doc.PrinterSettings.PrinterName)|$($p.PaperSize.PaperName)|$($p.PaperSize.Width)x$($p.PaperSize.Height)|landscape=$($p.Landscape)|img=$($img.Width)x$($img.Height)"
} finally {
  $img.Dispose()
}
