# Automatically find the active IPv4 address of the Wi-Fi adapter
$wifiIp = (Get-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress

if (-not $wifiIp) {
    # Fallback to get any active IPv4 address that has a Gateway (excluding loopback and virtual WSL adapters)
    $wifiIp = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue | 
        Get-NetIPInterface | 
        Get-NetIPAddress -AddressFamily IPv4 | 
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "172.28.*" } | 
        Select-Object -First 1).IPAddress
}

if (-not $wifiIp) {
    $wifiIp = "localhost"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [GameVault Setup] Detected Wi-Fi IP: $wifiIp" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# Kill any existing processes holding port 5000 (Backend) or port 3000 (Frontend) to prevent 'address already in use' errors
$ports = @(5000, 3000)
foreach ($port in $ports) {
    $processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if ($processId) {
        Write-Host " -> Port $port is in use by Process ID $processId. Terminating process to free up port..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

# Update frontend/.env.development
$envPath = "frontend\.env.development"
$envContent = "NEXT_PUBLIC_API_URL=http://$($wifiIp):5000"
Set-Content -Path $envPath -Value $envContent -Force
"http://$($wifiIp):3000/vi" | Set-Content -Path "access_link.txt" -Force
Write-Host " -> Updated frontend/.env.development: http://$($wifiIp):5000" -ForegroundColor Yellow

# Clean Next.js cache to avoid stale environment variable bundling
if (Test-Path "frontend\.next") {
    Write-Host " -> Clearing Next.js cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "frontend\.next"
}

# Cleanup existing jobs if any are running
Stop-Job -Name "gv-backend" -ErrorAction SilentlyContinue
Stop-Job -Name "gv-frontend" -ErrorAction SilentlyContinue
Remove-Job -Name "gv-backend" -ErrorAction SilentlyContinue
Remove-Job -Name "gv-frontend" -ErrorAction SilentlyContinue

Write-Host " -> Starting Backend and Frontend servers..." -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host " Access the app on your phone at: http://$($wifiIp):3000/vi" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Streaming logs... Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host ""

# Start Backend in background job (redirect stderr to stdout to avoid PowerShell NativeCommandError block)
$backendJob = Start-Job -Name "gv-backend" -ArgumentList $PSScriptRoot -ScriptBlock {
    param($root)
    cd "$root\backend"
    dotnet watch run --project src/GameVault.API 2>&1
}

# Start Frontend in background job (redirect stderr to stdout to avoid PowerShell NativeCommandError block)
$frontendJob = Start-Job -Name "gv-frontend" -ArgumentList $PSScriptRoot -ScriptBlock {
    param($root)
    cd "$root\frontend"
    npm run dev 2>&1
}

# Stream logs block
try {
    while ($true) {
        $bOut = Receive-Job -Job $backendJob
        $fOut = Receive-Job -Job $frontendJob
        
        if ($bOut) {
            foreach ($line in $bOut) {
                Write-Host "[Backend] $line" -ForegroundColor Gray
                # Fast visual notification on first compile success/readiness
                if ($line -like "*Failed to bind to address*") {
                    throw new Exception("Port bind failed")
                }
            }
        }
        if ($fOut) {
            foreach ($line in $fOut) {
                Write-Host "[Frontend] $line" -ForegroundColor DarkGray
            }
        }
        Start-Sleep -Milliseconds 250
    }
}
finally {
    Write-Host "`nStopping servers..." -ForegroundColor Red
    Stop-Job -Name "gv-backend" -ErrorAction SilentlyContinue
    Stop-Job -Name "gv-frontend" -ErrorAction SilentlyContinue
    Remove-Job -Name "gv-backend" -ErrorAction SilentlyContinue
    Remove-Job -Name "gv-frontend" -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Green
}
