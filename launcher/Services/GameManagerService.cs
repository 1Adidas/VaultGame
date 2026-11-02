using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using GameVault.Launcher.Models;

namespace GameVault.Launcher.Services;

public class GameManagerService
{
    private readonly StorageService _storageService;
    private readonly HttpClient _downloadClient;
    public const string DRM_AUTH_ARGUMENT = "--gv-auth-key=GameVaultSecret2026";

    public GameManagerService(StorageService storageService)
    {
        _storageService = storageService;
        _downloadClient = new HttpClient { Timeout = TimeSpan.FromMinutes(30) };
    }

    public bool IsGameInstalled(Guid gameId, out InstalledGameMetadata? metadata)
    {
        var installed = _storageService.LoadInstalledGames();
        if (installed.TryGetValue(gameId, out metadata))
        {
            if (File.Exists(metadata.ExecutablePath) || Directory.Exists(metadata.InstallPath))
            {
                return true;
            }
            // Folder or file was manually deleted by user
            _storageService.SetGameUninstalled(gameId);
        }

        metadata = null;
        return false;
    }

    public async Task DownloadAndInstallGameAsync(
        LibraryGameDto game,
        string downloadUrl,
        string backendBaseUrl,
        string? targetInstallFolder,
        IProgress<(double progressPercent, string statusText)> progress,
        CancellationToken ct = default)
    {
        // 1. Resolve full download URL
        var resolvedUrl = downloadUrl;
        if (resolvedUrl.StartsWith("/"))
        {
            resolvedUrl = $"{backendBaseUrl.TrimEnd('/')}{resolvedUrl}";
        }

        var sanitizedSlug = string.Join("_", game.Slug.Split(Path.GetInvalidFileNameChars()));
        string targetDir;

        if (!string.IsNullOrWhiteSpace(targetInstallFolder))
        {
            var cleanFolder = targetInstallFolder.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            var folderLeafName = Path.GetFileName(cleanFolder);

            if (folderLeafName.Equals(sanitizedSlug, StringComparison.OrdinalIgnoreCase) ||
                folderLeafName.Equals(game.Title, StringComparison.OrdinalIgnoreCase))
            {
                targetDir = cleanFolder;
            }
            else
            {
                targetDir = Path.Combine(cleanFolder, sanitizedSlug);
            }
        }
        else
        {
            targetDir = Path.Combine(StorageService.DefaultGamesInstallDirectory, sanitizedSlug);
        }

        // Use the selected drive's location for temporary file to prevent overflowing C: drive
        var parentDir = Directory.GetParent(targetDir)?.FullName ?? targetDir;
        if (!Directory.Exists(parentDir))
        {
            try { Directory.CreateDirectory(parentDir); } catch { }
        }

        var tempZipPath = Directory.Exists(parentDir)
            ? Path.Combine(parentDir, $".gv_temp_{game.GameId}.zip")
            : Path.Combine(Path.GetTempPath(), $"gv_temp_{game.GameId}.zip");

        progress.Report((0, "Đang kết nối tới máy chủ tải game..."));

        try
        {
            // 2. Stream download with progress tracking
            using (var response = await _downloadClient.GetAsync(resolvedUrl, HttpCompletionOption.ResponseHeadersRead, ct))
            {
                response.EnsureSuccessStatusCode();

                var totalBytes = response.Content.Headers.ContentLength ?? -1L;
                await using var contentStream = await response.Content.ReadAsStreamAsync(ct);
                await using var fileStream = new FileStream(tempZipPath, FileMode.Create, FileAccess.Write, FileShare.None, 8192, true);

                var buffer = new byte[8192];
                long totalRead = 0;
                int bytesRead;

                while ((bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
                {
                    await fileStream.WriteAsync(buffer, 0, bytesRead, ct);
                    totalRead += bytesRead;

                    if (totalBytes > 0)
                    {
                        var percent = (double)totalRead / totalBytes * 100.0;
                        var mbRead = totalRead / (1024.0 * 1024.0);
                        var mbTotal = totalBytes / (1024.0 * 1024.0);
                        progress.Report((percent, $"Đang tải xuống: {mbRead:F1}MB / {mbTotal:F1}MB ({percent:F0}%)"));
                    }
                    else
                    {
                        var mbRead = totalRead / (1024.0 * 1024.0);
                        progress.Report((50, $"Đang tải xuống: {mbRead:F1}MB..."));
                    }
                }
            }

            // 3. Extract Archive
            progress.Report((95, "Đang giải nén và thiết lập thư mục game..."));

            if (Directory.Exists(targetDir))
            {
                Directory.Delete(targetDir, true);
            }
            Directory.CreateDirectory(targetDir);

            bool isZip = false;
            try
            {
                ZipFile.ExtractToDirectory(tempZipPath, targetDir, overwriteFiles: true);
                isZip = true;
            }
            catch
            {
                // If not a valid zip archive (e.g. single executable or text test file)
                isZip = false;
            }

            if (!isZip)
            {
                // If the downloaded file was directly an exe or data file
                var singleFileDest = Path.Combine(targetDir, $"{sanitizedSlug}.exe");
                File.Copy(tempZipPath, singleFileDest, true);
            }

            // 4. Locate primary executable
            var exeFiles = Directory.GetFiles(targetDir, "*.exe", SearchOption.AllDirectories);
            string exePath;

            if (exeFiles.Length > 0)
            {
                // Prefer exe with slug or title name, otherwise take the first one
                exePath = exeFiles.FirstOrDefault(f => Path.GetFileNameWithoutExtension(f).Equals(sanitizedSlug, StringComparison.OrdinalIgnoreCase))
                          ?? exeFiles[0];
            }
            else
            {
                // Generate a standalone DRM demo executable if this is a sample/web demo game package
                exePath = CreateSampleDrmGameExecutable(targetDir, game.Title);
            }

            // 5. Save metadata
            var meta = new InstalledGameMetadata
            {
                GameId = game.GameId,
                Slug = game.Slug,
                InstallPath = targetDir,
                ExecutablePath = exePath,
                Version = game.Version ?? "1.0.0",
                InstalledAt = DateTime.UtcNow
            };

            _storageService.SetGameInstalled(meta);
            progress.Report((100, "Cài đặt hoàn tất!"));
        }
        finally
        {
            if (File.Exists(tempZipPath))
            {
                try { File.Delete(tempZipPath); } catch { }
            }
        }
    }

    public void UninstallGame(Guid gameId)
    {
        var installed = _storageService.LoadInstalledGames();
        if (installed.TryGetValue(gameId, out var metadata))
        {
            if (Directory.Exists(metadata.InstallPath))
            {
                try
                {
                    Directory.Delete(metadata.InstallPath, true);
                }
                catch { }
            }
            _storageService.SetGameUninstalled(gameId);
        }
    }

    public Process LaunchGame(InstalledGameMetadata metadata)
    {
        if (!File.Exists(metadata.ExecutablePath))
        {
            throw new FileNotFoundException("Không tìm thấy file chạy (.exe) của trò chơi. Hãy tải lại game.");
        }

        // DRM Protection: Pass secret token so the game knows it was launched from GameVault Launcher
        var psi = new ProcessStartInfo
        {
            FileName = metadata.ExecutablePath,
            Arguments = DRM_AUTH_ARGUMENT,
            WorkingDirectory = Path.GetDirectoryName(metadata.ExecutablePath) ?? string.Empty,
            UseShellExecute = true
        };

        var process = Process.Start(psi);
        if (process == null)
        {
            throw new Exception("Không thể khởi động tiến trình trò chơi.");
        }

        return process;
    }

    public static string CreateSampleDrmGameExecutable(string targetDir, string gameTitle)
    {
        // Try to locate compiled SampleGame.exe
        var appBase = AppDomain.CurrentDomain.BaseDirectory;
        var sampleCandidates = new[]
        {
            Path.Combine(appBase, "SampleGame.exe"),
            Path.Combine(appBase, "..", "..", "..", "SampleGame", "bin", "Debug", "net9.0", "SampleGame.exe"),
            Path.Combine(appBase, "..", "..", "..", "..", "launcher", "SampleGame", "bin", "Debug", "net9.0", "SampleGame.exe")
        };

        foreach (var candidate in sampleCandidates)
        {
            var fullCandidate = Path.GetFullPath(candidate);
            if (File.Exists(fullCandidate))
            {
                var exeDest = Path.Combine(targetDir, $"{Path.GetFileName(targetDir)}.exe");
                try
                {
                    File.Copy(fullCandidate, exeDest, true);
                    return exeDest;
                }
                catch { }
            }
        }

        var batPath = Path.Combine(targetDir, "PlayGame.bat");
        var script = $@"@echo off
chcp 65001 > nul
title GameVault - {gameTitle}

echo ========================================================
echo             GAMEVAULT PROTECTED CLIENT
echo ========================================================
echo.
echo Dang kiem tra xac thuc ban quyen tu Launcher...

set ""ARG1=%~1""
if not ""%ARG1%""==""{DRM_AUTH_ARGUMENT}"" (
    echo.
    echo [CANH BAO BAO MAT DRM]
    echo ----------------------------------------------------
    echo Tro choi nay bat buoc phai duoc khoi chay thong qua
    echo ung dung GameVault Launcher!
    echo Vui long mo Launcher va bam 'Choi ngay'.
    echo ----------------------------------------------------
    echo.
    pause
    exit /b 1
)

echo.
echo [XAC THUC THANH CONG] Chao mung ban den voi: {gameTitle}!
echo Phien choi game dang hoat dong thong qua GameVault Launcher.
echo.
echo Nhan phim bat ky de thoat game...
pause > nul
";
        File.WriteAllText(batPath, script);
        return batPath;
    }
}
