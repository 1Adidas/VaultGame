#include <windows.h>
#include <tlhelp32.h>
#include <stdio.h>
#include "exports.h"

static bool IsLauncherProcessRunning()
{
    bool found = false;
    HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnap != INVALID_HANDLE_VALUE)
    {
        PROCESSENTRY32W pe;
        pe.dwSize = sizeof(pe);
        if (Process32FirstW(hSnap, &pe))
        {
            do
            {
                // Check if GameVault Launcher or dotnet running launcher
                if (_wcsicmp(pe.szExeFile, L"GameVault.Launcher.exe") == 0 ||
                    _wcsicmp(pe.szExeFile, L"GameVault-Launcher.exe") == 0 ||
                    _wcsicmp(pe.szExeFile, L"GameVault.exe") == 0)
                {
                    found = true;
                    break;
                }
            } while (Process32NextW(hSnap, &pe));
        }
        CloseHandle(hSnap);
    }
    return found;
}

static bool CheckGameVaultAuth()
{
    LPCWSTR cmdLine = GetCommandLineW();

    // 1. Check command line for the secret DRM argument passed by GameVault Launcher
    bool hasAuthArg = (cmdLine != NULL && wcsstr(cmdLine, L"--gv-auth-key=GameVaultSecret2026") != NULL);

    // 2. Check if GameVault Launcher process is actively running
    bool hasProcess = IsLauncherProcessRunning();

    // Debug logging
    FILE* f = _wfopen(L"gv_drm_debug.log", L"a, ccs=UTF-8");
    if (f)
    {
        fwprintf(f, L"[DRM Check] Cmd: %s | Arg: %d | Proc: %d | Result: %s\n",
            cmdLine ? cmdLine : L"(null)", hasAuthArg ? 1 : 0, hasProcess ? 1 : 0,
            (hasAuthArg && hasProcess) ? L"ALLOW" : L"BLOCK");
        fclose(f);
    }

    // STRICT DRM: Must have been launched by Launcher (hasAuthArg) AND Launcher must be running (hasProcess)
    if (hasAuthArg && hasProcess)
    {
        return true;
    }

    return false;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved)
{
    if (fdwReason == DLL_PROCESS_ATTACH)
    {
        DisableThreadLibraryCalls(hinstDLL);

        if (!CheckGameVaultAuth())
        {
            MessageBoxW(
                NULL,
                L"[LỖI BẢO MẬT BẢN QUYỀN GAMEVAULT]\n\n"
                L"Trò chơi này bắt buộc phải được khởi chạy thông qua ứng dụng:\n"
                L"🎮 GAMEVAULT LAUNCHER\n\n"
                L"Bạn không thể mở trực tiếp file .exe hoặc sao chép sang máy khác mà chưa sở hữu game trên tài khoản GameVault!",
                L"GameVault DRM Protection",
                MB_OK | MB_ICONERROR | MB_TOPMOST
            );
            ExitProcess(1);
        }
    }
    return TRUE;
}
