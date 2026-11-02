Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [GameVault] Khoi dong Game Launcher Client (.NET 9 WPF)   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# Kiem tra dotnet
$dotnetVer = dotnet --version
Write-Host " -> .NET SDK Version: $dotnetVer" -ForegroundColor Gray

# Build & Run Launcher
Write-Host " -> Dang bien dich va khoi dong Launcher..." -ForegroundColor Yellow
dotnet run --project "$PSScriptRoot\launcher\GameVault.Launcher.csproj"
