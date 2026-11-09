@echo off
chcp 65001 > nul
echo Dang bien dich GameVault DRM steam_api64.dll...
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
cl.exe /O2 /LD /Fe:steam_api64.dll drm_main.cpp user32.lib
if %ERRORLEVEL% EQU 0 (
    echo [THANH CONG] Da tao xong file steam_api64.dll!
) else (
    echo [THAT BAI] Co loi trong qua trinh bien dich.
)
pause

