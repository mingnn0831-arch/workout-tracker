$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$port/")
try {
    $listener.Start()
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1 -ExpandProperty IPAddress)
    Write-Host "------------------------------------------------" -ForegroundColor Cyan
    Write-Host "운동 트래커 서버가 시작되었습니다!" -ForegroundColor Green
    Write-Host "스마트폰에서 아래 주소로 접속하세요:" -ForegroundColor Yellow
    Write-Host "http://$($ip):$port/" -ForegroundColor White
    Write-Host "------------------------------------------------" -ForegroundColor Cyan
    Write-Host "종료하려면 이 창을 닫거나 Ctrl+C를 누르세요."

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $localPath = Join-Path $PSScriptRoot $path.TrimStart('/')
        
        if (Test-Path $localPath) {
            $extension = [System.IO.Path]::GetExtension($localPath)
            $contentType = switch ($extension) {
                ".html" { "text/html" }
                ".css" { "text/css" }
                ".js" { "application/javascript" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $contentType
            $buffer = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} catch {
    Write-Host "에러: 관리자 권한으로 실행하거나 포트 $port 가 사용 중인지 확인하세요." -ForegroundColor Red
    Write-Host $_.Exception.Message
    Pause
} finally {
    $listener.Stop()
}
