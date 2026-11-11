Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [GameVault] Khoi dong Game Launcher Client (.NET 9 WPF)   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# Kiem tra dotnet
$dotnetVer = dotnet --version
Write-Host " -> .NET SDK Version: $dotnetVer" -ForegroundColor Gray

# Build & Run Launcher executable directly (keeps process name GameVault.Launcher.exe for DRM)
Stop-Process -Name "GameVault.Launcher" -Force -ErrorAction SilentlyContinue
Write-Host " -> Dang bien dich Launcher..." -ForegroundColor Yellow
dotnet build "$PSScriptRoot\launcher\GameVault.Launcher.csproj"
if ($LASTEXITCODE -ne 0) {
    Write-Host " -> Bien dich Launcher that bai." -ForegroundColor Red
    exit $LASTEXITCODE
}

$launcherExe = Join-Path $PSScriptRoot "launcher\bin\Debug\net9.0-windows\GameVault.Launcher.exe"
if (-not (Test-Path $launcherExe)) {
    Write-Host " -> Khong tim thay file thuc thi: $launcherExe" -ForegroundColor Red
    exit 1
}

Write-Host " -> Dang khoi dong GameVault Launcher..." -ForegroundColor Green
& $launcherExe
