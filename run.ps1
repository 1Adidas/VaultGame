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

# Prompt user to start Ngrok automatically
$startNgrok = Read-Host "Ban co muon tu dong khoi dong Ngrok (start --all) khong? (y/N)"
$isNgrok = $startNgrok -eq "y" -or $startNgrok -eq "Y"

# Kill any existing processes holding port 5000 (Backend) or port 3000 (Frontend) to prevent 'address already in use' errors
$ports = @(5000, 3000)
foreach ($port in $ports) {
    $processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if ($processId) {
        Write-Host " -> Port $port is in use by Process ID $processId. Terminating process to free up port..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

# Stop any existing Ngrok processes if starting Ngrok
if ($isNgrok) {
    Write-Host " -> Terminating existing Ngrok processes..." -ForegroundColor Yellow
    Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
    Stop-Job -Name "gv-ngrok" -ErrorAction SilentlyContinue
    Remove-Job -Name "gv-ngrok" -ErrorAction SilentlyContinue
}

# Cleanup existing server jobs if any are running
Stop-Job -Name "gv-backend" -ErrorAction SilentlyContinue
Stop-Job -Name "gv-frontend" -ErrorAction SilentlyContinue
Remove-Job -Name "gv-backend" -ErrorAction SilentlyContinue
Remove-Job -Name "gv-frontend" -ErrorAction SilentlyContinue

# Start Ngrok in the background if selected
$apiUrl = "http://$($wifiIp):5000"
$webUrl = "http://$($wifiIp):3000"

if ($isNgrok) {
    $staticDomain = "slam-evacuee-pentagram.ngrok-free.dev"
    Write-Host " -> Starting Ngrok tunnel for Frontend (port 3000) in background..." -ForegroundColor Green
    $ngrokJob = Start-Job -Name "gv-ngrok" -ArgumentList $staticDomain -ScriptBlock {
        param($domain)
        ngrok http --url=$domain 3000 2>&1
    }
    
    # Wait for Ngrok agent to start
    Write-Host " -> Waiting for Ngrok tunnel to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    $apiUrl = "https://$staticDomain"
    $webUrl = "https://$staticDomain"
    Write-Host " -> [Ngrok Proxy] Both Frontend and Backend (proxied) will use: $webUrl" -ForegroundColor Green
    Write-Host " -> [Webhook SePay] Please set your webhook URL in SePay to: $apiUrl/api/v1/payments/webhooks/sepay" -ForegroundColor Cyan
}

# Update frontend/.env.development
$envPath = "frontend\.env.development"
$envContent = "NEXT_PUBLIC_API_URL=$apiUrl"
Set-Content -Path $envPath -Value $envContent -Force
"$webUrl/vi" | Set-Content -Path "access_link.txt" -Force

Write-Host " -> Updated frontend/.env.development API URL to: $apiUrl" -ForegroundColor Yellow

# Clean Next.js cache to avoid stale environment variable bundling
if (Test-Path "frontend\.next") {
    Write-Host " -> Clearing Next.js cache to apply new API URL..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "frontend\.next"
}

Write-Host " -> Starting Backend and Frontend servers..." -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host " Access the app at: $webUrl/vi" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Streaming logs... Press Ctrl+C to stop servers." -ForegroundColor Yellow
Write-Host ""

# Start Backend in background job
$backendJob = Start-Job -Name "gv-backend" -ArgumentList $PSScriptRoot -ScriptBlock {
    param($root)
    cd "$root\backend"
    dotnet watch run --project src/GameVault.API 2>&1
}

# Start Frontend in background job
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
                if ($line -like "*Failed to bind to address*") {
                    throw New-Object System.Exception("Port bind failed")
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
    
    if ($isNgrok) {
        Write-Host "Stopping Ngrok..." -ForegroundColor Red
        Stop-Job -Name "gv-ngrok" -ErrorAction SilentlyContinue
        Remove-Job -Name "gv-ngrok" -ErrorAction SilentlyContinue
        Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Servers stopped." -ForegroundColor Green
}
