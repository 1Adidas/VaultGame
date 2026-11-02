Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [GameVault] KHOI DONG HE THONG DONG BO TOAN DIEN         " -ForegroundColor Green
Write-Host "   -> 1. Backend Web API (.NET 9) : http://localhost:5000 " -ForegroundColor Yellow
Write-Host "   -> 2. Frontend Web App (Next15): http://localhost:3000 " -ForegroundColor Yellow
Write-Host "   -> 3. Game Launcher Client     : WPF Desktop Client    " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Terminate old processes on ports 5000 and 3000
$ports = @(5000, 3000)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = ($conns | Select-Object -ExpandProperty OwningProcess -Unique) | Where-Object { $_ -gt 0 }
            foreach ($p in $pids) {
                Write-Host " -> Giai phong port $port (PID: $p)..." -ForegroundColor DarkGray
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        # Ignore port release error
    }
}

# Stop old background jobs
Stop-Job -Name "gv-backend", "gv-frontend" -ErrorAction SilentlyContinue
Remove-Job -Name "gv-backend", "gv-frontend" -ErrorAction SilentlyContinue

# 2. Check and start Docker MySQL if docker is running
Write-Host " -> Dang kiem tra MySQL Database Container..." -ForegroundColor Yellow
try {
    $null = docker compose up -d 2>&1
    Write-Host " -> MySQL Docker Container: Ready." -ForegroundColor Green
} catch {
    Write-Host " -> Bo qua Docker (neu da chay MySQL local san tren may)." -ForegroundColor DarkGray
}

# 3. Start Backend Web API in background job
Write-Host " -> Dang khoi dong Backend Web API (port 5000)..." -ForegroundColor Cyan
$backendJob = Start-Job -Name "gv-backend" -ArgumentList $PSScriptRoot -ScriptBlock {
    param($root)
    Set-Location "$root\backend"
    dotnet run --project src/GameVault.API 2>&1
}

# 4. Start Frontend Web in background job
Write-Host " -> Dang khoi dong Frontend Web App (port 3000)..." -ForegroundColor Cyan
$frontendJob = Start-Job -Name "gv-frontend" -ArgumentList $PSScriptRoot -ScriptBlock {
    param($root)
    Set-Location "$root\frontend"
    npm run dev 2>&1
}

# 5. Wait a few seconds for Backend to spin up
Write-Host " -> Cho he thong san sang trong 5 giay..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 6. Start Game Launcher Client
Write-Host " -> Dang khoi dong GameVault Client Launcher..." -ForegroundColor Green
$launcherCsproj = Join-Path $PSScriptRoot "launcher\GameVault.Launcher.csproj"
Start-Process dotnet -ArgumentList @("run", "--project", $launcherCsproj)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " HE THONG DA SAN SANG DONG BO 2 CHIEU!                    " -ForegroundColor Green
Write-Host " - Mo Web: http://localhost:3000/vi                       " -ForegroundColor White
Write-Host " - Mua game tren Web -> Launcher tu dong cap nhat ngay    " -ForegroundColor White
Write-Host " - Bam Choi qua Launcher tren Web -> Bat Launcher len     " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Nhan Ctrl+C de dung toan bo Backend va Frontend." -ForegroundColor Yellow

try {
    while ($true) {
        $bOut = Receive-Job -Job $backendJob
        $fOut = Receive-Job -Job $frontendJob
        if ($bOut) { foreach ($l in $bOut) { Write-Host "[Backend] $l" -ForegroundColor Gray } }
        if ($fOut) { foreach ($l in $fOut) { Write-Host "[Frontend] $l" -ForegroundColor DarkGray } }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "`nDang dung he thong..." -ForegroundColor Red
    Stop-Job -Name "gv-backend", "gv-frontend" -ErrorAction SilentlyContinue
    Remove-Job -Name "gv-backend", "gv-frontend" -ErrorAction SilentlyContinue
    Write-Host "Da dung toan bo Backend va Frontend." -ForegroundColor Green
}
