# 카운터 PC 인쇄 도우미 — 이용권 발급 화면(/booth/counter)이 만든 ESC/POS 원본을 영수증 프린터로 그대로 넘긴다.
#
# 브라우저는 프린터에 원본 바이트를 보낼 수 없어서, 이 도우미가 127.0.0.1:9131 에서 받아
# 윈도우 인쇄 스풀러에 RAW 로 넣는다. 프린터는 윈도우 내장 'Generic / Text Only' 로 등록돼 있으면 되고
# (제조사 드라이버 불필요), 쪽지 모양·자르기는 화면이 만든 바이트가 전부 정한다.
#
#   GET  /health  → {"ok":true,"printer":"ACSCENT-Receipt"}  (프린터가 없거나 오프라인이면 ok:false, error)
#   POST /print   → 본문(ESC/POS 바이트)을 인쇄, 실제로 프린터가 받아 갈 때까지 기다린다
#
# install-counter-printer.ps1 이 부팅 시 자동 실행(SYSTEM)으로 등록한다. 직접 점검:
#   powershell -ExecutionPolicy Bypass -File .\counter-print-helper.ps1 -SelfTest   (시험 쪽지 한 장)

param(
  [string]$Printer = 'ACSCENT-Receipt',
  [int]$Port = 9131,
  [switch]$SelfTest
)

$ErrorActionPreference = 'Stop'
$LogFile = Join-Path $PSScriptRoot 'helper.log'

function Write-Log([string]$message) {
  try {
    if ((Test-Path $LogFile) -and (Get-Item $LogFile).Length -gt 1MB) { Move-Item $LogFile "$LogFile.old" -Force }
    Add-Content -Path $LogFile -Value ("{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $message) -Encoding UTF8
  } catch {}
}

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class AcscentRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    public string pDocName;
    public string pOutputFile;
    public string pDataType;
  }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool ClosePrinter(IntPtr handle);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern int StartDocPrinter(IntPtr handle, int level, [In] DOCINFO info);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool EndDocPrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool StartPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool EndPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool WritePrinter(IntPtr handle, byte[] data, int count, out int written);

  // 인쇄 작업 번호를 돌려준다 (스풀러에서 끝났는지 확인용)
  public static int Send(string printer, byte[] data, string title) {
    IntPtr handle;
    if (!OpenPrinter(printer, out handle, IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error());
    try {
      DOCINFO info = new DOCINFO();
      info.pDocName = title;
      info.pDataType = "RAW";
      int job = StartDocPrinter(handle, 1, info);
      if (job == 0) throw new Win32Exception(Marshal.GetLastWin32Error());
      try {
        StartPagePrinter(handle);
        int written;
        if (!WritePrinter(handle, data, data.Length, out written) || written != data.Length)
          throw new Win32Exception(Marshal.GetLastWin32Error());
        EndPagePrinter(handle);
      } finally {
        EndDocPrinter(handle);
      }
      return job;
    } finally {
      ClosePrinter(handle);
    }
  }
}
'@

function Get-PrinterProblem {
  $p = Get-Printer -Name $Printer -ErrorAction SilentlyContinue
  if (-not $p) { return "프린터 '$Printer' 가 등록돼 있지 않아요 (설치 스크립트를 다시 실행)" }
  if ($p.PrinterStatus -in 'Offline', 'Error', 'PaperOut', 'PaperJam', 'DoorOpen', 'NotAvailable') {
    return "프린터 상태: $($p.PrinterStatus)"
  }
  return $null
}

# 스풀러가 작업을 프린터로 넘길 때까지 기다린다. 전원이 꺼져 있으면 작업이 큐에 남는데,
# 그대로 두면 나중에 켰을 때 쪽지가 한꺼번에 쏟아지므로 지우고 실패로 알린다.
function Wait-PrintJob([int]$jobId) {
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    $job = Get-PrintJob -PrinterName $Printer -ErrorAction SilentlyContinue | Where-Object Id -eq $jobId
    if (-not $job) { return $null }
    if ("$($job.JobStatus)" -match 'Error|Offline|PaperOut|Blocked|UserIntervention') { break }
    Start-Sleep -Milliseconds 200
  }
  $status = (Get-PrintJob -PrinterName $Printer -ErrorAction SilentlyContinue | Where-Object Id -eq $jobId).JobStatus
  Remove-PrintJob -PrinterName $Printer -ID $jobId -ErrorAction SilentlyContinue
  return "프린터가 받지 않았어요 (전원·용지·케이블 확인$(if ($status) { ", $status" }))"
}

function Invoke-Print([byte[]]$data, [string]$title) {
  $problem = Get-PrinterProblem
  if ($problem) { return $problem }
  $job = [AcscentRawPrinter]::Send($Printer, $data, $title)
  return Wait-PrintJob $job
}

if ($SelfTest) {
  $ks = [Text.Encoding]::GetEncoding(949)
  $bytes = [byte[]](0x1b, 0x40, 0x1c, 0x26, 0x1b, 0x61, 0x01) +
    $ks.GetBytes("AC'SCENT 영수증 프린터`n인쇄 도우미 시험 출력`n") +
    [byte[]](0x1d, 0x21, 0x11) + $ks.GetBytes("OK`n") + [byte[]](0x1d, 0x21, 0x00) +
    $ks.GetBytes(("{0:yyyy-MM-dd HH:mm}`n" -f (Get-Date))) + [byte[]](0x1d, 0x56, 0x42, 0x00)
  $err = Invoke-Print $bytes 'ACSCENT self test'
  if ($err) { Write-Host "실패: $err"; exit 1 }
  Write-Host '시험 쪽지를 보냈어요'
  exit 0
}

# 이 주소들에서 연 화면만 인쇄를 맡길 수 있다 (다른 사이트가 몰래 인쇄하지 못하게)
$AllowedOrigin = '^(https://(www\.)?acscent\.co\.kr|http://(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|192\.168(\.\d{1,3}){2})(:\d+)?)$'
$MaxBody = 4MB

function Send-Response($stream, [int]$status, [string]$origin, $body) {
  $reason = @{ 200 = 'OK'; 204 = 'No Content'; 400 = 'Bad Request'; 403 = 'Forbidden'; 404 = 'Not Found'; 413 = 'Payload Too Large'; 500 = 'Internal Server Error' }[$status]
  $json = if ($null -ne $body) { $body | ConvertTo-Json -Compress } else { '' }
  $payload = [Text.Encoding]::UTF8.GetBytes($json)
  $headers = "HTTP/1.1 $status $reason`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($payload.Length)`r`nCache-Control: no-store`r`nConnection: close`r`nVary: Origin`r`n"
  if ($origin -and $origin -match $AllowedOrigin) {
    $headers += "Access-Control-Allow-Origin: $origin`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nAccess-Control-Allow-Private-Network: true`r`nAccess-Control-Max-Age: 600`r`n"
  }
  $head = [Text.Encoding]::ASCII.GetBytes("$headers`r`n")
  $stream.Write($head, 0, $head.Length)
  if ($payload.Length) { $stream.Write($payload, 0, $payload.Length) }
}

function Read-Request($stream) {
  $buffer = New-Object System.IO.MemoryStream
  $chunk = New-Object byte[] 65536
  $headerEnd = -1
  while ($headerEnd -lt 0) {
    $n = $stream.Read($chunk, 0, $chunk.Length)
    if ($n -le 0) { return $null }
    $buffer.Write($chunk, 0, $n)
    $text = [Text.Encoding]::ASCII.GetString($buffer.GetBuffer(), 0, [int]$buffer.Length)
    $headerEnd = $text.IndexOf("`r`n`r`n")
    if ($headerEnd -lt 0 -and $buffer.Length -gt 32KB) { return $null }
  }
  $lines = $text.Substring(0, $headerEnd) -split "`r`n"
  $method, $path = $lines[0].Split(' ')[0, 1]
  $headers = @{}
  foreach ($line in ($lines | Select-Object -Skip 1)) {
    $i = $line.IndexOf(':')
    if ($i -gt 0) { $headers[$line.Substring(0, $i).Trim().ToLower()] = $line.Substring($i + 1).Trim() }
  }
  $length = [int]("0" + $headers['content-length'])
  $request = @{ Method = $method; Path = $path; Headers = $headers; Length = $length; Body = $null }
  if ($length -gt $MaxBody) { return $request }
  $body = New-Object byte[] $length
  $have = [int]$buffer.Length - ($headerEnd + 4)
  [Array]::Copy($buffer.GetBuffer(), $headerEnd + 4, $body, 0, [Math]::Min($have, $length))
  while ($have -lt $length) {
    $n = $stream.Read($body, $have, $length - $have)
    if ($n -le 0) { break }
    $have += $n
  }
  $request.Body = $body
  return $request
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Log "포트 $Port 를 열 수 없음 (이미 실행 중?): $($_.Exception.Message)"
  exit 1
}
Write-Log "시작 — 127.0.0.1:$Port → $Printer"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 5000
    $stream = $client.GetStream()
    $req = Read-Request $stream
    if (-not $req) { continue }
    $origin = $req.Headers['origin']
    if ($req.Method -eq 'OPTIONS') {
      Send-Response $stream 204 $origin $null
    } elseif ($req.Method -eq 'GET' -and $req.Path -eq '/health') {
      $problem = Get-PrinterProblem
      Send-Response $stream 200 $origin ([ordered]@{ ok = -not $problem; printer = $Printer; error = $problem })
    } elseif ($req.Method -eq 'POST' -and $req.Path -eq '/print') {
      if (-not $origin -or $origin -notmatch $AllowedOrigin) {
        Write-Log "거부: 허용되지 않은 화면 $origin"
        Send-Response $stream 403 $origin @{ error = '허용되지 않은 화면입니다' }
      } elseif ($req.Length -gt $MaxBody -or -not $req.Body -or $req.Body.Length -eq 0) {
        Send-Response $stream 413 $origin @{ error = '인쇄 데이터가 비었거나 너무 큽니다' }
      } else {
        $err = Invoke-Print $req.Body 'ACSCENT photobooth pass'
        if ($err) {
          Write-Log "인쇄 실패 ($($req.Body.Length)B): $err"
          Send-Response $stream 500 $origin @{ error = $err }
        } else {
          Write-Log "인쇄 $($req.Body.Length)B ($origin)"
          Send-Response $stream 200 $origin @{ ok = $true }
        }
      }
    } else {
      Send-Response $stream 404 $origin @{ error = 'not found' }
    }
  } catch {
    Write-Log "오류: $($_.Exception.Message)"
    try { Send-Response $stream 500 $origin @{ error = $_.Exception.Message } } catch {}
  } finally {
    $client.Close()
  }
}
