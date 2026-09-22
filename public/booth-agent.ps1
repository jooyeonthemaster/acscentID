# AC'SCENT 포토부스 — 원격 점검 도우미
#
# 이 창이 열려 있는 동안만 동작합니다. 설치하지 않고, 자동 실행에 등록하지 않으며,
# 창을 닫거나 Ctrl+C 를 누르면 즉시 끝납니다. 남는 파일도 없습니다.
#
# 하는 일: 개발 서버에 "할 일 있나요?" 하고 2초마다 물어보고,
#          있으면 실행한 뒤 결과를 돌려줍니다.
#
# 실행: irm http://172.30.1.40:3000/booth-agent.ps1 | iex

$server = 'http://172.30.1.40:3000'
$token  = 'wow-booth-2026'
$url    = "$server/api/photobooth/agent"

Write-Host ''
Write-Host '  AC''SCENT 포토부스 원격 점검 도우미' -ForegroundColor Cyan
Write-Host "  서버: $server" -ForegroundColor DarkGray
Write-Host '  이 창을 닫으면 즉시 종료됩니다. (Ctrl+C 로도 종료)' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  연결 대기 중...' -ForegroundColor Yellow

$idle = 0
while ($true) {
  try {
    $res = Invoke-RestMethod -Uri "$url`?token=$token" -Method Get -TimeoutSec 10

    if ($res.job) {
      $job = $res.job
      $label = if ($job.label) { $job.label } else { $job.command }
      Write-Host ''
      Write-Host "  ▶ $label" -ForegroundColor Green

      $out = ''
      $err = ''
      $code = 0
      try {
        $out = (Invoke-Expression $job.command 2>&1 | Out-String)
      } catch {
        $err = $_.Exception.Message
        $code = 1
      }

      $payload = @{
        token     = $token
        id        = $job.id
        command   = $job.command
        label     = $job.label
        createdAt = $job.createdAt
        output    = $out
        error     = $err
        exitCode  = $code
      } | ConvertTo-Json -Depth 4

      Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType 'application/json' | Out-Null
      Write-Host '    완료 · 결과 전송' -ForegroundColor DarkGray
      $idle = 0
    } else {
      $idle++
      if ($idle % 30 -eq 0) { Write-Host '  ... 대기 중' -ForegroundColor DarkGray }
    }
  } catch {
    Write-Host "  서버 연결 실패: $($_.Exception.Message)" -ForegroundColor Red
    Start-Sleep -Seconds 5
  }
  Start-Sleep -Milliseconds 2000
}
