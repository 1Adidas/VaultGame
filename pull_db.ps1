# pull_db.ps1
# Script khoi phuc va lam moi co so du lieu y chang May A (Chay tren May B)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[GameVault] DANG THIET LAP CO SO DU LIEU" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiem tra Docker Desktop da khoi dong chua
$dockerCheck = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[Loi] Docker Desktop chua duoc bat! Vui long mo Docker Desktop truoc khi chay script nay." -ForegroundColor Red
    Exit 1
}

# 2. Xoa cac container cu va Volume cu de dam bao du lieu duoc lam sach 100%
Write-Host "-> Dang xoa du lieu cu (Volume cu) de dam bao dong bo hoan toan..." -ForegroundColor Yellow
# Tat cac tien trinh dang chay neu co
Stop-Process -Name GameVault.API, VBCSCompiler, msbuild -Force -ErrorAction SilentlyContinue | Out-Null
docker compose down -v
Write-Host "✓ Da lam sach du lieu cu." -ForegroundColor Green

# 3. Khoi dong MySQL container moi
Write-Host "-> Dang khoi dong MySQL tu Docker Compose..." -ForegroundColor Yellow
docker compose up -d mysql

# 4. Doi MySQL khoi dong va nap tu dong Schema + Seed thanh cong
Write-Host "-> Dang cho co so du lieu khoi dong va tu dong chen du lieu mau (Seed)..." -ForegroundColor Yellow
$seconds = 0
do {
    Start-Sleep -Seconds 1
    $seconds++
    $health = (docker inspect --format='{{json .State.Health.Status}}' gamevault-mysql 2>$null)
    
    if ($seconds -gt 60) {
        Write-Host "`n[Loi] Da cho qua 60 giay nhung MySQL chua san sang. Vui long kiem tra Docker Desktop!" -ForegroundColor Red
        Exit 1
    }
} while ($health -ne '"healthy"')

Write-Host "✓ Thiet lap co so du lieu hoan tat! Da nap 100% du lieu moi nhat tu may A." -ForegroundColor Green

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✓ THIET LAP DU LIEU THANH CONG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "-> Bay gio ban chi can chay lenh './run.ps1' va mo web len de tan huong!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
