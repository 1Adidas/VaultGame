using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
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
        _downloadClient.DefaultRequestHeaders.TryAddWithoutValidation("ngrok-skip-browser-warning", "1");
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

    private static string ResolveDownloadUrl(string downloadUrl, string backendBaseUrl)
    {
        var normalizedBase = backendBaseUrl.Trim().TrimEnd('/');
        if (normalizedBase.Contains("localhost:5000", StringComparison.OrdinalIgnoreCase))
        {
            normalizedBase = normalizedBase.Replace("localhost:5000", "127.0.0.1:5000", StringComparison.OrdinalIgnoreCase);
        }

        var url = (downloadUrl ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(url))
        {
            throw new InvalidOperationException("Link tải game bị trống.");
        }

        // Fallback repair if an older server returned a local disk path containing wwwroot/uploads/
        var unifiedSlashes = url.Replace('\\', '/');
        var wwwrootUploadsIdx = unifiedSlashes.IndexOf("/wwwroot/uploads/", StringComparison.OrdinalIgnoreCase);
        if (wwwrootUploadsIdx >= 0)
        {
            url = unifiedSlashes.Substring(wwwrootUploadsIdx + "/wwwroot".Length);
        }

        if (url.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
        {
            url = "/" + url;
        }

        if (url.StartsWith("/"))
        {
            url = $"{normalizedBase}{url}";
        }

        if (url.Contains("drive.google.com", StringComparison.OrdinalIgnoreCase))
        {
            var idMatch = Regex.Match(url, @"(?:[?&]id=|/d/)([a-zA-Z0-9_-]+)");
            if (idMatch.Success && !url.Contains("export=download", StringComparison.OrdinalIgnoreCase))
            {
                url = $"https://drive.usercontent.google.com/download?id={Uri.EscapeDataString(idMatch.Groups[1].Value)}&export=download&confirm=t";
            }
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed) ||
            (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException($"Đường dẫn tải game không hợp lệ: {url}");
        }

        return url;
    }

    private static bool LooksLikeHtmlFile(string filePath)
    {
        try
        {
            var buf = new byte[512];
            using var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            int read = fs.Read(buf, 0, buf.Length);
            if (read == 0) return false;

            var prefix = Encoding.UTF8.GetString(buf, 0, read).TrimStart('\uFEFF', ' ', '\t', '\r', '\n');
            return prefix.StartsWith("<!DOCTYPE html", StringComparison.OrdinalIgnoreCase)
                || prefix.StartsWith("<html", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private async Task<HttpResponseMessage> SendDownloadRequestAsync(string resolvedUrl, CancellationToken ct)
    {
        var response = await _downloadClient.GetAsync(resolvedUrl, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            var code = (int)response.StatusCode;
            var reason = response.ReasonPhrase;
            response.Dispose();
            throw new HttpRequestException($"Máy chủ trả về lỗi HTTP {code} ({reason}) khi tải tệp game.");
        }

        var mediaType = response.Content.Headers.ContentType?.MediaType;
        if (string.Equals(mediaType, "text/html", StringComparison.OrdinalIgnoreCase))
        {
            if (resolvedUrl.Contains("drive.google.com", StringComparison.OrdinalIgnoreCase))
            {
                var idMatch = Regex.Match(resolvedUrl, @"(?:[?&]id=|/d/)([a-zA-Z0-9_-]+)");
                if (idMatch.Success)
                {
                    response.Dispose();
                    var directDriveUrl = $"https://drive.usercontent.google.com/download?id={Uri.EscapeDataString(idMatch.Groups[1].Value)}&export=download&confirm=t";
                    var retry = await _downloadClient.GetAsync(directDriveUrl, HttpCompletionOption.ResponseHeadersRead, ct);
                    if (!retry.IsSuccessStatusCode)
                    {
                        var retryCode = (int)retry.StatusCode;
                        retry.Dispose();
                        throw new HttpRequestException($"Không thể tải tệp từ Google Drive (HTTP {retryCode}).");
                    }
                    if (!string.Equals(retry.Content.Headers.ContentType?.MediaType, "text/html", StringComparison.OrdinalIgnoreCase))
                    {
                        return retry;
                    }
                    retry.Dispose();
                }
            }
            else
            {
                response.Dispose();
            }

            throw new InvalidOperationException("Máy chủ trả về trang web (HTML) thay vì tệp cài đặt game.");
        }

        return response;
    }

    private static string? SelectPrimaryExecutable(string targetDir, string sanitizedSlug, string gameTitle)
    {
        var exeFiles = Directory.GetFiles(targetDir, "*.exe", SearchOption.AllDirectories);
        if (exeFiles.Length == 0) return null;

        static bool IsHelperExe(string path)
        {
            var name = Path.GetFileName(path);
            return name.StartsWith("UnityCrashHandler", StringComparison.OrdinalIgnoreCase)
                || name.EndsWith(".console.exe", StringComparison.OrdinalIgnoreCase)
                || name.StartsWith("Uninstall", StringComparison.OrdinalIgnoreCase)
                || name.StartsWith("unins", StringComparison.OrdinalIgnoreCase)
                || name.StartsWith("CrashReport", StringComparison.OrdinalIgnoreCase)
                || name.StartsWith("UE4Prereq", StringComparison.OrdinalIgnoreCase)
                || name.StartsWith("UEPrereq", StringComparison.OrdinalIgnoreCase)
                || name.StartsWith("vc_redist", StringComparison.OrdinalIgnoreCase)
                || name.Equals("createdump.exe", StringComparison.OrdinalIgnoreCase)
                || name.Equals("DXSETUP.exe", StringComparison.OrdinalIgnoreCase);
        }

        static string NormalizeToken(string text)
            => Regex.Replace(text ?? string.Empty, @"[^a-zA-Z0-9]", "").ToLowerInvariant();

        var slugNorm = NormalizeToken(sanitizedSlug);
        var titleNorm = NormalizeToken(gameTitle);

        var primaryPool = exeFiles.Where(f => !IsHelperExe(f)).ToArray();
        if (primaryPool.Length == 0)
        {
            primaryPool = exeFiles;
        }

        return primaryPool
            .OrderByDescending(f =>
            {
                var stem = NormalizeToken(Path.GetFileNameWithoutExtension(f));
                return stem == slugNorm || (!string.IsNullOrEmpty(titleNorm) && stem == titleNorm);
            })
            .ThenBy(f => f.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar).Length)
            .ThenBy(f => f, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault();
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
        var resolvedUrl = ResolveDownloadUrl(downloadUrl, backendBaseUrl);

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
            // 2. Stream download with throttled progress tracking (0% -> 90%)
            using (var response = await SendDownloadRequestAsync(resolvedUrl, ct))
            {
                var totalBytes = response.Content.Headers.ContentLength ?? -1L;
                await using var contentStream = await response.Content.ReadAsStreamAsync(ct);
                await using var fileStream = new FileStream(tempZipPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true);

                var buffer = new byte[81920];
                long totalRead = 0;
                int bytesRead;
                double lastReportedPercent = -1;
                var sw = Stopwatch.StartNew();

                while ((bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
                {
                    await fileStream.WriteAsync(buffer, 0, bytesRead, ct);
                    totalRead += bytesRead;

                    if (totalBytes > 0)
                    {
                        var downloadPercent = (double)totalRead / totalBytes * 90.0;
                        if (downloadPercent - lastReportedPercent >= 0.5 || sw.ElapsedMilliseconds >= 150 || totalRead == totalBytes)
                        {
                            lastReportedPercent = downloadPercent;
                            sw.Restart();
                            var mbRead = totalRead / (1024.0 * 1024.0);
                            var mbTotal = totalBytes / (1024.0 * 1024.0);
                            progress.Report((downloadPercent, $"Đang tải xuống: {mbRead:F1}MB / {mbTotal:F1}MB ({downloadPercent:F0}%)"));
                        }
                    }
                    else if (sw.ElapsedMilliseconds >= 200)
                    {
                        sw.Restart();
                        var mbRead = totalRead / (1024.0 * 1024.0);
                        progress.Report((45, $"Đang tải xuống: {mbRead:F1}MB..."));
                    }
                }
            }

            if (!File.Exists(tempZipPath) || new FileInfo(tempZipPath).Length == 0)
            {
                throw new InvalidOperationException("Tệp tải về bị rỗng (0 bytes).");
            }

            if (LooksLikeHtmlFile(tempZipPath))
            {
                throw new InvalidOperationException("Tệp tải về là trang HTML lỗi thay vì gói cài đặt game.");
            }

            // 3. Extract Archive off the UI thread (90% -> 99%)
            progress.Report((90, "Đang giải nén và thiết lập thư mục game..."));

            await Task.Run(() =>
            {
                ct.ThrowIfCancellationRequested();

                if (Directory.Exists(targetDir))
                {
                    Directory.Delete(targetDir, true);
                }
                Directory.CreateDirectory(targetDir);

                bool isZip = false;
                try
                {
                    using var archive = ZipFile.OpenRead(tempZipPath);
                    var entries = archive.Entries;
                    var totalEntries = Math.Max(entries.Count, 1);
                    var targetRootFullPath = Path.GetFullPath(targetDir);
                    if (!targetRootFullPath.EndsWith(Path.DirectorySeparatorChar))
                    {
                        targetRootFullPath += Path.DirectorySeparatorChar;
                    }

                    var swExtract = Stopwatch.StartNew();
                    int processed = 0;
                    foreach (var entry in entries)
                    {
                        ct.ThrowIfCancellationRequested();
                        processed++;

                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            // Directory entry
                            if (!string.IsNullOrEmpty(entry.FullName))
                            {
                                var dirDest = Path.GetFullPath(Path.Combine(targetDir, entry.FullName));
                                if (dirDest.StartsWith(targetRootFullPath, StringComparison.OrdinalIgnoreCase))
                                {
                                    Directory.CreateDirectory(dirDest);
                                }
                            }
                            continue;
                        }

                        var destPath = Path.GetFullPath(Path.Combine(targetDir, entry.FullName));
                        if (!destPath.StartsWith(targetRootFullPath, StringComparison.OrdinalIgnoreCase))
                        {
                            continue;
                        }

                        var destParent = Path.GetDirectoryName(destPath);
                        if (!string.IsNullOrEmpty(destParent))
                        {
                            Directory.CreateDirectory(destParent);
                        }

                        entry.ExtractToFile(destPath, overwrite: true);

                        if (swExtract.ElapsedMilliseconds >= 150 || processed == totalEntries)
                        {
                            swExtract.Restart();
                            var extractPercent = 90.0 + ((double)processed / totalEntries * 9.0);
                            progress.Report((extractPercent, $"Đang giải nén ({processed}/{totalEntries})..."));
                        }
                    }
                    isZip = true;
                }
                catch (InvalidDataException)
                {
                    // Not a valid zip archive (e.g. direct single .exe installer)
                    isZip = false;
                }

                if (!isZip)
                {
                    var singleFileDest = Path.Combine(targetDir, $"{sanitizedSlug}.exe");
                    File.Copy(tempZipPath, singleFileDest, true);
                }
            }, ct);

            // 4. Locate primary executable
            var exePath = SelectPrimaryExecutable(targetDir, sanitizedSlug, game.Title)
                ?? CreateSampleDrmGameExecutable(targetDir, game.Title);

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
