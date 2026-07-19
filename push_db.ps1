# push_db.ps1
# Script dong goi co so du lieu moi nhat cua du an (Chay tren May A)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[GameVault] DANG DONG GOI CO SO DU LIEU" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiem tra docker container mysql co chay khong
$containerStatus = docker ps --filter "name=gamevault-mysql" --format "{{.Status}}"
if (-not $containerStatus) {
    Write-Host "[Loi] Container 'gamevault-mysql' hien khong chay! Vui long bat Docker Desktop va khoi dong du an truoc." -ForegroundColor Red
    Exit 1
}

# 2. Xuat cau truc bang (Schema)
Write-Host "-> Dang xuat cau truc bang (Schema)..." -ForegroundColor Yellow
docker exec -i gamevault-mysql mysqldump -uroot -p1234 --no-data gamevault -r /tmp/001_init.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "[Loi] Khong the xuat Schema tu Docker!" -ForegroundColor Red
    Exit 1
}

New-Item -ItemType Directory -Force -Path "./database/schema" | Out-Null
docker cp gamevault-mysql:/tmp/001_init.sql ./database/schema/001_init.sql
docker exec -i gamevault-mysql rm /tmp/001_init.sql

# 3. Xuat du lieu mau (Seed)
Write-Host "-> Dang xuat du lieu bang (Seed)..." -ForegroundColor Yellow
docker exec -i gamevault-mysql mysqldump -uroot -p1234 --no-create-info gamevault -r /tmp/002_seed_data.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "[Loi] Khong the xuat Seed data tu Docker!" -ForegroundColor Red
    Exit 1
}

New-Item -ItemType Directory -Force -Path "./database/seeds" | Out-Null
docker cp gamevault-mysql:/tmp/002_seed_data.sql ./database/seeds/002_seed_data.sql
docker exec -i gamevault-mysql rm /tmp/002_seed_data.sql

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " OK: DA DONG GOI XONG DU LIEU MOI NHAT CUA DU AN!" -ForegroundColor Green
Write-Host "-> Vi tri dong goi:" -ForegroundColor Yellow
Write-Host "   - Schema: ./database/schema/001_init.sql" -ForegroundColor Cyan
Write-Host "   - Seeds:  ./database/seeds/002_seed_data.sql" -ForegroundColor Cyan
Write-Host "-> Tiep theo, ban co thể thuc hien git add, git commit, git push thu cong." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
