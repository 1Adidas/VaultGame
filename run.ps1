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
    $staticDomain = $env:NGROK_DOMAIN
    if ([string]::IsNullOrWhiteSpace($staticDomain)) {
        $staticDomain = Read-Host "Nhap Ngrok static domain (de trong neu dung URL ngau nhien cua Ngrok)"
    }

    Write-Host " -> Starting Ngrok tunnel for Frontend (port 3000) in background..." -ForegroundColor Green
    if (-not [string]::IsNullOrWhiteSpace($staticDomain)) {
        $ngrokJob = Start-Job -Name "gv-ngrok" -ArgumentList $staticDomain.Trim() -ScriptBlock {
            param($domain)
            ngrok http --url=$domain 3000 2>&1
        }
        Start-Sleep -Seconds 3
        $apiUrl = "https://$($staticDomain.Trim())"
        $webUrl = "https://$($staticDomain.Trim())"
    } else {
        $ngrokJob = Start-Job -Name "gv-ngrok" -ScriptBlock {
            ngrok http 3000 2>&1
        }
        Write-Host " -> Waiting for Ngrok tunnel to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 4
        try {
            $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
            $httpsTunnel = $tunnels.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
            if ($httpsTunnel) {
                $apiUrl = $httpsTunnel.public_url.TrimEnd('/')
                $webUrl = $httpsTunnel.public_url.TrimEnd('/')
            } else {
                Write-Warning "Khong doc duoc public_url tu Ngrok API (http://127.0.0.1:4040). Tam giu URL LAN."
            }
        } catch {
            Write-Warning "Khong the ket noi Ngrok local API (4040). Hay kiem tra 'ngrok config check' hoac token Ngrok."
        }
    }

    Write-Host " -> [Ngrok Proxy] Both Frontend and Backend (proxied) will use: $webUrl" -ForegroundColor Green
    Write-Host " -> [Webhook SePay] Please set your webhook URL in SePay to: $apiUrl/api/v1/payments/webhooks/sepay" -ForegroundColor Cyan
}

# Warn if frontend/.env.local overrides NEXT_PUBLIC_API_URL from .env.development
if (Test-Path "frontend\.env.local") {
    $localEnv = Get-Content "frontend\.env.local" -Raw -ErrorAction SilentlyContinue
    if ($localEnv -match "(?m)^\s*NEXT_PUBLIC_API_URL=") {
        Write-Warning "frontend/.env.local dang chua NEXT_PUBLIC_API_URL (uu tien cao hon .env.development)."
    }
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
