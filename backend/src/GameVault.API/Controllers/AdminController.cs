using System.Security.Claims;
using System.Text.Json;
using System.IO;
using System.IO.Compression;
using GameVault.Application.Common;
using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Infrastructure.Persistence;
using GameVault.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace GameVault.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
public class AdminController(IAdminService admin, IGoogleDriveService drive, AppDbContext db, ICacheService cache) : ControllerBase
{
    [HttpGet("dashboard/stats")]
    public async Task<ActionResult<ApiResponse<AdminStatsDto>>> Stats(CancellationToken ct)
        => Ok(ApiResponse<AdminStatsDto>.Ok(await admin.GetStatsAsync(ct)));


    [HttpPost("games")]
    public async Task<ActionResult<ApiResponse<GameDetailDto>>> CreateGame(CreateGameRequest request, CancellationToken ct)
        => Ok(ApiResponse<GameDetailDto>.Ok(await admin.CreateGameAsync(request, ct)));

    [HttpGet("games/{id:guid}")]
    public async Task<ActionResult<ApiResponse<GameDetailDto>>> GetGame(Guid id, CancellationToken ct)
    {
        var game = await db.Games
            .Include(g => g.GameCategories).ThenInclude(gc => gc.Category)
            .Include(g => g.Images)
            .Include(g => g.Videos)
            .Include(g => g.Files)
            .Include(g => g.UnityDemo)
            .Include(g => g.GameTags).ThenInclude(gt => gt.Tag)
            .FirstOrDefaultAsync(g => g.Id == id, ct);
        if (game is null) return NotFound(ApiResponse<GameDetailDto>.Fail("GAME_NOT_FOUND", "Game not found"));
        return Ok(ApiResponse<GameDetailDto>.Ok(GameService.MapDetail(game, false, false, "vi")));
    }

    [HttpPut("games/{id:guid}")]
    public async Task<ActionResult<ApiResponse<GameDetailDto>>> UpdateGame(Guid id, UpdateGameRequest request, CancellationToken ct)
        => Ok(ApiResponse<GameDetailDto>.Ok(await admin.UpdateGameAsync(id, request, ct)));

    [HttpDelete("games/{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteGame(Guid id, CancellationToken ct)
    {
        await admin.DeleteGameAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }

    [HttpPost("games/{id:guid}/publish")]
    public async Task<ActionResult<ApiResponse<object>>> Publish(Guid id, CancellationToken ct)
    {
        await admin.PublishGameAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }

    [HttpPatch("games/{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateGameStatus(Guid id, [FromBody] UpdateGameStatusRequest request, CancellationToken ct)
    {
        var game = await db.Games.FindAsync([id], ct);
        if (game is null) return NotFound(ApiResponse<object>.Fail("GAME_NOT_FOUND", "Game not found"));

        var normalizedStatus = request.Status?.Trim();
        if (string.Equals(normalizedStatus, GameVault.Domain.Enums.GameStatus.Draft, StringComparison.OrdinalIgnoreCase))
        {
            game.Status = GameVault.Domain.Enums.GameStatus.Draft;
        }
        else if (string.Equals(normalizedStatus, GameVault.Domain.Enums.GameStatus.Published, StringComparison.OrdinalIgnoreCase))
        {
            game.Status = GameVault.Domain.Enums.GameStatus.Published;
            if (game.PublishedAt is null)
            {
                game.PublishedAt = DateTime.UtcNow;
            }
        }
        else if (string.Equals(normalizedStatus, GameVault.Domain.Enums.GameStatus.Archived, StringComparison.OrdinalIgnoreCase))
        {
            game.Status = GameVault.Domain.Enums.GameStatus.Archived;
        }
        else
        {
            return BadRequest(ApiResponse<object>.Fail("INVALID_STATUS", "Invalid status value. Must be Draft, Published, or Archived."));
        }

        await db.SaveChangesAsync(ct);
        cache.InvalidateGames();
        return Ok(ApiResponse<object>.Ok(new { success = true, status = game.Status }));
    }

    [HttpPost("games/translate")]
    public async Task<ActionResult<ApiResponse<TranslateGameTextResponse>>> TranslateGameText([FromBody] TranslateGameTextRequest request, CancellationToken ct)
        => Ok(ApiResponse<TranslateGameTextResponse>.Ok(await admin.TranslateGameTextAsync(request, ct)));

    [HttpPost("games/{id:guid}/upload")]
    [RequestSizeLimit(3_221_225_472L)]
    [RequestFormLimits(MultipartBodyLengthLimit = 3_221_225_472L)]
    public async Task<ActionResult<ApiResponse<object>>> Upload(Guid id, [FromForm] string type, IFormFile file, CancellationToken ct)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.Fail("FILE_EMPTY", "Tệp tải lên không được để trống."));
            }
            if (file.Length > 3_221_225_472L)
            {
                return BadRequest(ApiResponse<object>.Fail("FILE_TOO_LARGE", "Dung lượng tệp vượt quá giới hạn tối đa là 3GB."));
            }
            var game = await db.Games.FindAsync([id], ct);
            if (game is null) return NotFound(ApiResponse<object>.Fail("GAME_NOT_FOUND", "Game not found"));
            string gameFolder = string.IsNullOrEmpty(game.Slug) ? id.ToString() : game.Slug;

            await using var stream = file.OpenReadStream();
            var (fileId, url) = await drive.UploadAsync(stream, file.FileName, file.ContentType ?? "application/octet-stream", $"games/{gameFolder}/{type}", ct);
            
            string buildUrl = url;
            string buildPath = url;

            switch (type.ToLowerInvariant())
            {
                case "image":
                case "cover":
                    var existingPrimaryCovers = await db.GameImages.Where(i => i.GameId == id && i.IsPrimary).ToListAsync(ct);
                    foreach (var oldCover in existingPrimaryCovers)
                    {
                        if (!string.IsNullOrEmpty(oldCover.GoogleDriveFileId))
                        {
                            try { await drive.DeleteAsync(oldCover.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete cover error: {ex.Message}"); }
                        }
                    }
                    db.GameImages.RemoveRange(existingPrimaryCovers);
                    db.GameImages.Add(new Domain.Entities.GameImage { GameId = id, GoogleDriveFileId = fileId, Url = url, IsPrimary = true, SortOrder = 0 });
                    break;

                case "screenshot":
                case "screenshots":
                    var maxOrder = await db.GameImages.Where(i => i.GameId == id).MaxAsync(i => (int?)i.SortOrder, ct) ?? 0;
                    db.GameImages.Add(new Domain.Entities.GameImage { GameId = id, GoogleDriveFileId = fileId, Url = url, IsPrimary = false, SortOrder = maxOrder + 1 });
                    break;

                case "trailer":
                    var existingVideos = await db.GameVideos.Where(v => v.GameId == id).ToListAsync(ct);
                    foreach (var oldVid in existingVideos)
                    {
                        if (!string.IsNullOrEmpty(oldVid.GoogleDriveFileId))
                        {
                            try { await drive.DeleteAsync(oldVid.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete trailer error: {ex.Message}"); }
                        }
                    }
                    db.GameVideos.RemoveRange(existingVideos);
                    db.GameVideos.Add(new Domain.Entities.GameVideo { GameId = id, GoogleDriveFileId = fileId, Url = url, Title = file.FileName, SortOrder = 0 });
                    break;

                case "installer":
                    var existingFiles = await db.GameFiles.Where(f => f.GameId == id).ToListAsync(ct);
                    foreach (var oldFile in existingFiles)
                    {
                        if (!string.IsNullOrEmpty(oldFile.GoogleDriveFileId))
                        {
                            try { await drive.DeleteAsync(oldFile.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete installer error: {ex.Message}"); }
                        }
                    }
                    db.GameFiles.RemoveRange(existingFiles);
                    db.GameFiles.Add(new Domain.Entities.GameFile { GameId = id, GoogleDriveFileId = fileId, FileName = file.FileName, FileSizeBytes = file.Length, MimeType = file.ContentType ?? "application/octet-stream", DownloadUrl = url });
                    break;
                case "demo":
                    if (Path.GetExtension(file.FileName).Equals(".zip", StringComparison.OrdinalIgnoreCase))
                    {
                        try
                        {
                            var uploadsRoot = GoogleDriveService.ResolveLocalUploadsRoot();
                            var wwwrootDir = Directory.GetParent(uploadsRoot)?.FullName ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                            var demoDir = Path.Combine(uploadsRoot, "games", gameFolder, "demo");
                            var extractDir = Path.Combine(demoDir, "extracted");
                            if (Directory.Exists(extractDir))
                            {
                                try { Directory.Delete(extractDir, true); } catch {}
                            }
                            Directory.CreateDirectory(extractDir);

                            var fullExtractDir = Path.GetFullPath(extractDir);
                            if (!fullExtractDir.EndsWith(Path.DirectorySeparatorChar))
                            {
                                fullExtractDir += Path.DirectorySeparatorChar;
                            }

                            using (var fileStream = file.OpenReadStream())
                            using (var archive = new System.IO.Compression.ZipArchive(fileStream, System.IO.Compression.ZipArchiveMode.Read))
                            {
                                foreach (var entry in archive.Entries)
                                {
                                    if (string.IsNullOrEmpty(entry.Name)) continue;
                                    var targetPath = Path.GetFullPath(Path.Combine(extractDir, entry.FullName));
                                    if (!targetPath.StartsWith(fullExtractDir, StringComparison.OrdinalIgnoreCase)) continue;
                                    var dir = Path.GetDirectoryName(targetPath);
                                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                                    entry.ExtractToFile(targetPath, overwrite: true);
                                }
                            }

                            var entryHtml = ResolveDemoEntryHtml(extractDir);
                            if (!string.IsNullOrEmpty(entryHtml))
                            {
                                var wwwrootPath = Path.GetFullPath(wwwrootDir);
                                var fullEntryPath = Path.GetFullPath(entryHtml);
                                var relativePath = fullEntryPath.StartsWith(wwwrootPath, StringComparison.OrdinalIgnoreCase)
                                    ? fullEntryPath.Substring(wwwrootPath.Length)
                                    : fullEntryPath;
                                buildUrl = relativePath.Replace('\\', '/');
                                if (!buildUrl.StartsWith('/')) buildUrl = "/" + buildUrl;
                                buildPath = fullEntryPath;
                            }
                            else
                            {
                                buildUrl = $"/uploads/games/{gameFolder}/demo/extracted/index.html";
                                buildPath = Path.Combine(extractDir, "index.html");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[DEMO EXTRACTION ERROR]: {ex}");
                        }
                    }

                    var demo = await db.UnityDemos.FirstOrDefaultAsync(d => d.GameId == id, ct);
                    if (demo is null)
                    {
                        db.UnityDemos.Add(new Domain.Entities.UnityDemo
                        {
                            Id = Guid.NewGuid(),
                            GameId = id,
                            GoogleDriveFileId = fileId,
                            BuildUrl = buildUrl,
                            BuildPath = buildPath,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                    else
                    {
                        if (!string.IsNullOrEmpty(demo.GoogleDriveFileId) && demo.GoogleDriveFileId != fileId)
                        {
                            try { await drive.DeleteAsync(demo.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete demo error: {ex.Message}"); }
                        }
                        demo.BuildUrl = buildUrl;
                        demo.BuildPath = buildPath;
                        demo.GoogleDriveFileId = fileId;
                        demo.IsActive = true;
                        demo.UpdatedAt = DateTime.UtcNow;
                    }
                    break;
            }
            await db.SaveChangesAsync(ct);
            cache.InvalidateGames();
            return Ok(ApiResponse<object>.Ok(new { fileId, url }));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AdminController.Upload Error]: {ex}");
            return StatusCode(500, ApiResponse<object>.Fail("UPLOAD_FAILED", ex.Message));
        }
    }









    [HttpDelete("games/{id:guid}/cover")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteCover(Guid id, CancellationToken ct)
    {
        var images = await db.GameImages.Where(i => i.GameId == id && i.IsPrimary).ToListAsync(ct);
        foreach (var img in images)
        {
            if (!string.IsNullOrEmpty(img.GoogleDriveFileId))
            {
                try { await drive.DeleteAsync(img.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete cover error: {ex.Message}"); }
            }
        }
        db.GameImages.RemoveRange(images);
        await db.SaveChangesAsync(ct);
        cache.InvalidateGames();
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("games/{id:guid}/images/{imageId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteImage(Guid id, Guid imageId, CancellationToken ct)
    {
        var img = await db.GameImages.FirstOrDefaultAsync(i => i.GameId == id && i.Id == imageId, ct);
        if (img != null)
        {
            if (!string.IsNullOrEmpty(img.GoogleDriveFileId))
            {
                try { await drive.DeleteAsync(img.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete image error: {ex.Message}"); }
            }
            db.GameImages.Remove(img);
            await db.SaveChangesAsync(ct);
            cache.InvalidateGames();
        }
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("games/{id:guid}/trailer")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteTrailer(Guid id, CancellationToken ct)
    {
        var videos = await db.GameVideos.Where(v => v.GameId == id).ToListAsync(ct);
        foreach (var vid in videos)
        {
            if (!string.IsNullOrEmpty(vid.GoogleDriveFileId))
            {
                try { await drive.DeleteAsync(vid.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete trailer error: {ex.Message}"); }
            }
        }
        db.GameVideos.RemoveRange(videos);
        await db.SaveChangesAsync(ct);
        cache.InvalidateGames();
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("games/{id:guid}/demo")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteDemo(Guid id, CancellationToken ct)
    {
        var demo = await db.UnityDemos.FirstOrDefaultAsync(d => d.GameId == id, ct);
        if (demo != null)
        {
            if (!string.IsNullOrEmpty(demo.GoogleDriveFileId))
            {
                try { await drive.DeleteAsync(demo.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete demo error: {ex.Message}"); }
            }
            db.UnityDemos.Remove(demo);
            
            var game = await db.Games.FindAsync([id], ct);
            string gameFolder = game != null && !string.IsNullOrEmpty(game.Slug) ? game.Slug : id.ToString();
            var uploadsRoot = GoogleDriveService.ResolveLocalUploadsRoot();
            var demoDir = Path.Combine(uploadsRoot, "games", gameFolder, "demo");
            if (Directory.Exists(demoDir))
            {
                try { Directory.Delete(demoDir, true); } catch {}
            }
            var demoDirId = Path.Combine(uploadsRoot, "games", id.ToString(), "demo");
            if (Directory.Exists(demoDirId))
            {
                try { Directory.Delete(demoDirId, true); } catch {}
            }
            
            await db.SaveChangesAsync(ct);
            cache.InvalidateGames();
        }
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("games/{id:guid}/installer")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteInstaller(Guid id, CancellationToken ct)
    {
        var files = await db.GameFiles.Where(f => f.GameId == id).ToListAsync(ct);
        foreach (var file in files)
        {
            if (!string.IsNullOrEmpty(file.GoogleDriveFileId))
            {
                try { await drive.DeleteAsync(file.GoogleDriveFileId, ct); } catch (Exception ex) { Console.WriteLine($"Drive delete installer error: {ex.Message}"); }
            }
        }
        db.GameFiles.RemoveRange(files);
        await db.SaveChangesAsync(ct);
        cache.InvalidateGames();
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
    [HttpPost("migrate-uploads-to-drive")]
    public async Task<ActionResult<ApiResponse<object>>> MigrateUploadsToDrive([FromServices] IWebHostEnvironment env, [FromServices] IConfiguration config, CancellationToken ct)
    {
        if (config.GetValue<bool>("GoogleDrive:UseLocalFallback", false))
        {
            return BadRequest(ApiResponse<object>.Fail("LOCAL_FALLBACK_ACTIVE", "Hệ thống đang bật chế độ 'UseLocalFallback' (lưu trữ cục bộ). Để tải tệp lên Google Drive thật sự, hãy cấu hình tài khoản Google Drive và đổi 'UseLocalFallback' thành false."));
        }

        int imagesMigrated = 0;
        int videosMigrated = 0;
        int filesMigrated = 0;
        int demosMigrated = 0;
        var details = new List<string>();

        details.Add($"Debug: ContentRootPath = {env.ContentRootPath}");
        details.Add($"Debug: WebRootPath = {env.WebRootPath}");
        details.Add($"Debug: CurrentDirectory = {Directory.GetCurrentDirectory()}");

        string GetLocalPath(string urlOrPath)
        {
            if (string.IsNullOrEmpty(urlOrPath)) return null;
            var path = urlOrPath;
            if (path.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || path.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var uri = new Uri(path);
                    path = uri.AbsolutePath;
                }
                catch { return null; }
            }
            path = path.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
            var fullPath = Path.Combine(env.WebRootPath, path);
            return System.IO.File.Exists(fullPath) ? fullPath : null;
        }

        string GetMimeType(string filePath)
        {
            var ext = Path.GetExtension(filePath).ToLowerInvariant();
            return ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".mp4" => "video/mp4",
                ".zip" => "application/zip",
                _ => "application/octet-stream"
            };
        }

        // 1. Migrate GameImages
        var localImages = await db.GameImages
            .Where(i => i.Url.Contains("/uploads/"))
            .ToListAsync(ct);
        foreach (var img in localImages)
        {
            var localPath = GetLocalPath(img.Url);
            if (localPath != null)
            {
                try
                {
                    var relativePath = img.Url.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
                    var parts = relativePath.Split(Path.DirectorySeparatorChar);
                    string gameFolder = parts.Length > 2 ? parts[2] : "unknown";

                    using var fs = System.IO.File.OpenRead(localPath);
                    var (fileId, driveUrl) = await drive.UploadAsync(fs, Path.GetFileName(localPath), GetMimeType(localPath), $"games/{gameFolder}/image", ct);
                    
                    img.GoogleDriveFileId = fileId;
                    img.Url = driveUrl;
                    imagesMigrated++;
                    details.Add($"Migrated Image: {Path.GetFileName(localPath)} -> {fileId}");
                }
                catch (Exception ex)
                {
                    details.Add($"Failed to migrate Image {img.Url}: {ex.Message}");
                }
            }
        }

        // 2. Migrate GameVideos (Trailers)
        var localVideos = await db.GameVideos
            .Where(v => v.Url.Contains("/uploads/"))
            .ToListAsync(ct);
        foreach (var vid in localVideos)
        {
            var localPath = GetLocalPath(vid.Url);
            if (localPath != null)
            {
                try
                {
                    var relativePath = vid.Url.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
                    var parts = relativePath.Split(Path.DirectorySeparatorChar);
                    string gameFolder = parts.Length > 2 ? parts[2] : "unknown";

                    using var fs = System.IO.File.OpenRead(localPath);
                    var (fileId, driveUrl) = await drive.UploadAsync(fs, Path.GetFileName(localPath), GetMimeType(localPath), $"games/{gameFolder}/trailer", ct);
                    
                    vid.GoogleDriveFileId = fileId;
                    vid.Url = driveUrl;
                    videosMigrated++;
                    details.Add($"Migrated Video: {Path.GetFileName(localPath)} -> {fileId}");
                }
                catch (Exception ex)
                {
                    details.Add($"Failed to migrate Video {vid.Url}: {ex.Message}");
                }
            }
        }

        // 3. Migrate GameFiles (Installers)
        var localFiles = await db.GameFiles
            .Where(f => f.DownloadUrl != null && f.DownloadUrl.Contains("/uploads/"))
            .ToListAsync(ct);
        foreach (var file in localFiles)
        {
            var localPath = GetLocalPath(file.DownloadUrl);
            if (localPath != null)
            {
                try
                {
                    var relativePath = file.DownloadUrl.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar);
                    var parts = relativePath.Split(Path.DirectorySeparatorChar);
                    string gameFolder = parts.Length > 2 ? parts[2] : "unknown";

                    using var fs = System.IO.File.OpenRead(localPath);
                    var (fileId, driveUrl) = await drive.UploadAsync(fs, Path.GetFileName(localPath), GetMimeType(localPath), $"games/{gameFolder}/installer", ct);
                    
                    file.GoogleDriveFileId = fileId;
                    file.DownloadUrl = driveUrl;
                    filesMigrated++;
                    details.Add($"Migrated File: {Path.GetFileName(localPath)} -> {fileId}");
                }
                catch (Exception ex)
                {
                    details.Add($"Failed to migrate File {file.DownloadUrl}: {ex.Message}");
                }
            }
        }

        // 4. Migrate UnityDemos
        var localDemos = await db.UnityDemos
            .Where(d => d.BuildUrl.Contains("/uploads/") && (d.GoogleDriveFileId == null || d.GoogleDriveFileId == ""))
            .ToListAsync(ct);
        foreach (var demo in localDemos)
        {
            try
            {
                var game = await db.Games.FindAsync([demo.GameId], ct);
                if (game != null)
                {
                    string guidFolder = game.Id.ToString();
                    var demoDir = Path.Combine(env.WebRootPath, "uploads", "games", guidFolder, "demo");
                    if (!Directory.Exists(demoDir) && !string.IsNullOrEmpty(game.Slug))
                    {
                        var altDir = Path.Combine(env.WebRootPath, "uploads", "games", game.Slug, "demo");
                        if (Directory.Exists(altDir))
                        {
                            demoDir = altDir;
                        }
                    }

                    if (Directory.Exists(demoDir))
                    {
                        var zipFiles = Directory.GetFiles(demoDir, "*.zip");
                        string driveFolder = string.IsNullOrEmpty(game.Slug) ? game.Id.ToString() : game.Slug;

                        if (zipFiles.Length > 0)
                        {
                            var localPath = zipFiles[0];
                            using var fs = System.IO.File.OpenRead(localPath);
                            var (fileId, driveUrl) = await drive.UploadAsync(fs, Path.GetFileName(localPath), "application/zip", $"games/{driveFolder}/demo", ct);
                            
                            demo.GoogleDriveFileId = fileId;
                            demosMigrated++;
                            details.Add($"Migrated UnityDemo Zip: {Path.GetFileName(localPath)} -> {fileId}");
                        }
                        else
                        {
                            var extractDir = Path.Combine(demoDir, "extracted");
                            if (Directory.Exists(extractDir))
                            {
                                var tempZip = Path.Combine(Path.GetTempPath(), $"demo-{demo.Id}.zip");
                                if (System.IO.File.Exists(tempZip)) System.IO.File.Delete(tempZip);
                                
                                System.IO.Compression.ZipFile.CreateFromDirectory(extractDir, tempZip);
                                using (var fs = System.IO.File.OpenRead(tempZip))
                                {
                                    var (fileId, driveUrl) = await drive.UploadAsync(fs, "demo.zip", "application/zip", $"games/{driveFolder}/demo", ct);
                                    demo.GoogleDriveFileId = fileId;
                                    demosMigrated++;
                                    details.Add($"Migrated UnityDemo (zipped from extracted): demo.zip -> {fileId}");
                                }
                                try { System.IO.File.Delete(tempZip); } catch {}
                            }
                        }
                    }
                    else
                    {
                        details.Add($"Skipped Demo migration: local demo folder not found for game {game.Title} ({guidFolder} or {game.Slug})");
                    }
                }
            }
            catch (Exception ex)
            {
                details.Add($"Failed to migrate Demo for Game {demo.GameId}: {ex.Message}");
            }
        }

        // 5. Migrate User Avatars by scanning local directory
        int avatarsMigrated = 0;
        var avatarsLocalRoot = Path.Combine(env.WebRootPath, "uploads", "avatars");
        if (Directory.Exists(avatarsLocalRoot))
        {
            var userDirs = Directory.GetDirectories(avatarsLocalRoot);
            foreach (var userDir in userDirs)
            {
                var folderName = Path.GetFileName(userDir); // This is the UserId
                if (Guid.TryParse(folderName, out var userId))
                {
                    var user = await db.Users.FindAsync([userId], ct);
                    var files = Directory.GetFiles(userDir);
                    foreach (var file in files)
                    {
                        try
                        {
                            var fileName = Path.GetFileName(file);
                            using var fs = System.IO.File.OpenRead(file);
                            // Upload to Drive avatars/{userId}/fileName
                            var (fileId, driveUrl) = await drive.UploadAsync(fs, fileName, GetMimeType(file), $"avatars/{userId}", ct);
                            
                            // If this user has local URL in DB, update to the new Drive URL
                            if (user != null && (string.IsNullOrEmpty(user.AvatarUrl) || user.AvatarUrl.Contains("/uploads/")))
                            {
                                user.AvatarUrl = driveUrl;
                            }
                            avatarsMigrated++;
                            details.Add($"Migrated Avatar: {fileName} for user {userId} -> {fileId}");
                        }
                        catch (Exception ex)
                        {
                            details.Add($"Failed to migrate Avatar file {Path.GetFileName(file)} for user {userId}: {ex.Message}");
                        }
                    }
                }
            }
        }

        // 6. Migrate AI chatbot avatar from settings.json or default file
        int aiAvatarsMigrated = 0;
        var settingsPath = Path.Combine(env.WebRootPath, "uploads", "ai", "settings.json");
        var aiDir = Path.Combine(env.WebRootPath, "uploads", "ai");
        
        // Determine the current avatar URL
        AiSettings? currentAiSettings = null;
        string? aiAvatarLocalUrl = null;
        
        if (System.IO.File.Exists(settingsPath))
        {
            try
            {
                var content = await System.IO.File.ReadAllTextAsync(settingsPath, ct);
                currentAiSettings = JsonSerializer.Deserialize<AiSettings>(content, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                aiAvatarLocalUrl = currentAiSettings?.AvatarUrl;
            }
            catch { }
        }
        
        // If no settings.json or avatar URL is the default, check for default-bot.png
        if (string.IsNullOrEmpty(aiAvatarLocalUrl) || aiAvatarLocalUrl.Contains("/uploads/"))
        {
            // Use current URL or fall back to default
            if (string.IsNullOrEmpty(aiAvatarLocalUrl))
                aiAvatarLocalUrl = "/uploads/ai/default-bot.png";
            
            var localPath = GetLocalPath(aiAvatarLocalUrl);
            
            // Also try scanning the ai directory for any image files
            if (localPath == null && Directory.Exists(aiDir))
            {
                var aiFiles = Directory.GetFiles(aiDir).Where(f => !f.EndsWith(".json")).ToArray();
                if (aiFiles.Length > 0)
                {
                    localPath = aiFiles[0];
                }
            }
            
            if (localPath != null)
            {
                try
                {
                    using var fs = System.IO.File.OpenRead(localPath);
                    var (fileId, driveUrl) = await drive.UploadAsync(fs, Path.GetFileName(localPath), GetMimeType(localPath), "ai/avatar", ct);
                    
                    // Write/update settings.json with the Drive URL
                    var newSettings = currentAiSettings ?? new AiSettings();
                    newSettings.AvatarUrl = driveUrl;
                    if (!Directory.Exists(aiDir)) Directory.CreateDirectory(aiDir);
                    var json = JsonSerializer.Serialize(newSettings, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                    await System.IO.File.WriteAllTextAsync(settingsPath, json, ct);
                    aiAvatarsMigrated++;
                    details.Add($"Migrated AI Avatar: {Path.GetFileName(localPath)} -> {fileId}");
                }
                catch (Exception ex)
                {
                    details.Add($"Failed to migrate AI Avatar: {ex.Message}");
                }
            }
        }

        int totalMigrated = imagesMigrated + videosMigrated + filesMigrated + demosMigrated + avatarsMigrated + aiAvatarsMigrated;
        if (totalMigrated > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        var errors = details.Where(d => d.StartsWith("Failed")).ToList();
        if (totalMigrated == 0 && errors.Any())
        {
            string firstError = errors.First();
            string friendlyMsg = "Không thể tải tệp lên Google Drive.";
            if (firstError.Contains("Service Accounts do not have storage quota") || firstError.Contains("storageQuotaExceeded"))
            {
                friendlyMsg = "Lỗi Google Drive: Tài khoản Service Account không có dung lượng lưu trữ trên 'Drive của tôi' cá nhân (Lỗi Google 403: storageQuotaExceeded). Bạn cần chuyển thư mục sang 'Bộ nhớ dùng chung' (Shared Drive) hoặc cấu hình OAuth 2.0.";
            }
            return BadRequest(ApiResponse<object>.Fail("DRIVE_UPLOAD_FAILED", friendlyMsg));
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            success = true,
            totalMigrated = totalMigrated,
            migrated = new { images = imagesMigrated, videos = videosMigrated, files = filesMigrated, demos = demosMigrated, avatars = avatarsMigrated, aiAvatars = aiAvatarsMigrated },
            details = details
        }));
    }


    [HttpPost("sync-drive-to-local")]
    public async Task<ActionResult<ApiResponse<object>>> SyncDriveToLocal([FromServices] IWebHostEnvironment env, CancellationToken ct)
    {
        int imagesSynced = 0, videosSynced = 0, filesSynced = 0, demosSynced = 0, avatarsSynced = 0;
        var details = new List<string>();

        // Helper: extract Google Drive fileId from a URL like https://drive.google.com/thumbnail?sz=w1000&id=XXXXX or webContentLink
        string? ExtractDriveId(string? url)
        {
            if (string.IsNullOrEmpty(url)) return null;
            if (!url.Contains("drive.google.com") && !url.Contains("googleusercontent.com")) return null;
            var match = System.Text.RegularExpressions.Regex.Match(url, @"[?&]id=([^&]+)");
            if (match.Success) return match.Groups[1].Value;
            // lh3 pattern: /d/{id}
            var lh3Match = System.Text.RegularExpressions.Regex.Match(url, @"/d/([^/?=]+)");
            if (lh3Match.Success) return lh3Match.Groups[1].Value;
            return null;
        }

        // Determine a sane local relative path from a URL and entity metadata
        string BuildLocalPath(string folder, string fileName)
        {
            return $"{folder}/{fileName}".Replace('\\', '/');
        }

        // 1. Sync GameImages
        var images = await db.GameImages.Include(i => i.Game).Where(i => i.GoogleDriveFileId != null && i.GoogleDriveFileId != "").ToListAsync(ct);
        foreach (var img in images)
        {
            try
            {
                var gameFolder = img.Game?.Slug ?? img.GameId.ToString();
                var ext = ".jpg";
                if (img.Url != null)
                {
                    var pathExt = Path.GetExtension(new Uri(img.Url, UriKind.RelativeOrAbsolute).LocalPath);
                    if (!string.IsNullOrEmpty(pathExt)) ext = pathExt;
                }
                var localPath = BuildLocalPath($"games/{gameFolder}/image", $"{img.GoogleDriveFileId}{ext}");
                var result = await drive.DownloadFileToLocalAsync(img.GoogleDriveFileId!, localPath, ct);
                if (result != null) { imagesSynced++; details.Add($"Image: {localPath}"); }
            }
            catch (Exception ex) { details.Add($"Failed Image {img.Id}: {ex.Message}"); }
        }

        // 2. Sync GameVideos
        var videos = await db.GameVideos.Include(v => v.Game).Where(v => v.GoogleDriveFileId != null && v.GoogleDriveFileId != "").ToListAsync(ct);
        foreach (var vid in videos)
        {
            try
            {
                var gameFolder = vid.Game?.Slug ?? vid.GameId.ToString();
                var ext = ".mp4";
                if (vid.Url != null)
                {
                    var pathExt = Path.GetExtension(vid.Title ?? "");
                    if (!string.IsNullOrEmpty(pathExt)) ext = pathExt;
                }
                var localPath = BuildLocalPath($"games/{gameFolder}/trailer", $"{vid.GoogleDriveFileId}{ext}");
                var result = await drive.DownloadFileToLocalAsync(vid.GoogleDriveFileId!, localPath, ct);
                if (result != null) { videosSynced++; details.Add($"Video: {localPath}"); }
            }
            catch (Exception ex) { details.Add($"Failed Video {vid.Id}: {ex.Message}"); }
        }

        // 3. Sync GameFiles (installers)
        var gameFiles = await db.GameFiles.Include(f => f.Game).Where(f => f.GoogleDriveFileId != null && f.GoogleDriveFileId != "").ToListAsync(ct);
        foreach (var file in gameFiles)
        {
            try
            {
                var gameFolder = file.Game?.Slug ?? file.GameId.ToString();
                var localPath = BuildLocalPath($"games/{gameFolder}/installer", $"{file.GoogleDriveFileId}_{file.FileName}");
                var result = await drive.DownloadFileToLocalAsync(file.GoogleDriveFileId!, localPath, ct);
                if (result != null) { filesSynced++; details.Add($"File: {localPath}"); }
            }
            catch (Exception ex) { details.Add($"Failed File {file.Id}: {ex.Message}"); }
        }

        // 4. Sync UnityDemos
        var demos = await db.UnityDemos.Include(d => d.Game).Where(d => d.GoogleDriveFileId != null && d.GoogleDriveFileId != "").ToListAsync(ct);
        foreach (var demo in demos)
        {
            try
            {
                var gameFolder = demo.Game?.Slug ?? demo.GameId.ToString();
                var localPath = BuildLocalPath($"games/{gameFolder}/demo", $"{demo.GoogleDriveFileId}_demo.zip");
                var result = await drive.DownloadFileToLocalAsync(demo.GoogleDriveFileId!, localPath, ct);
                if (result != null)
                {
                    // Extract zip for WebGL playback
                    var destPath = Path.Combine(env.WebRootPath, "uploads", localPath.Replace('/', Path.DirectorySeparatorChar));
                    if (System.IO.File.Exists(destPath))
                    {
                        var extractDir = Path.Combine(Path.GetDirectoryName(destPath)!, "extracted");
                        if (Directory.Exists(extractDir)) try { Directory.Delete(extractDir, true); } catch { }
                        Directory.CreateDirectory(extractDir);
                        try
                        {
                            System.IO.Compression.ZipFile.ExtractToDirectory(destPath, extractDir, overwriteFiles: true);
                            var entryHtml = ResolveDemoEntryHtml(extractDir);
                            if (!string.IsNullOrEmpty(entryHtml))
                            {
                                var wwwrootPath = Path.GetFullPath(env.WebRootPath);
                                var fullEntryPath = Path.GetFullPath(entryHtml);
                                var relativePath = fullEntryPath.StartsWith(wwwrootPath, StringComparison.OrdinalIgnoreCase)
                                    ? fullEntryPath.Substring(wwwrootPath.Length)
                                    : fullEntryPath;
                                var buildUrl = relativePath.Replace('\\', '/');
                                if (!buildUrl.StartsWith('/')) buildUrl = "/" + buildUrl;
                                demo.BuildUrl = buildUrl;
                                demo.BuildPath = fullEntryPath;
                            }
                        }
                        catch (Exception ex) { details.Add($"Failed to extract demo zip: {ex.Message}"); }
                    }
                    demosSynced++;
                    details.Add($"Demo: {localPath}");
                }
            }
            catch (Exception ex) { details.Add($"Failed Demo {demo.GameId}: {ex.Message}"); }
        }

        // 5. Sync User avatars (Drive URLs)
        var usersWithDriveAvatars = await db.Users
            .Where(u => u.AvatarUrl != null && u.AvatarUrl.Contains("drive.google.com"))
            .ToListAsync(ct);
        foreach (var user in usersWithDriveAvatars)
        {
            try
            {
                var driveId = ExtractDriveId(user.AvatarUrl);
                if (driveId != null)
                {
                    var localPath = BuildLocalPath($"avatars/{user.Id}", $"{driveId}.jpg");
                    var result = await drive.DownloadFileToLocalAsync(driveId, localPath, ct);
                    if (result != null) { avatarsSynced++; details.Add($"Avatar: {localPath}"); }
                }
            }
            catch (Exception ex) { details.Add($"Failed Avatar {user.Id}: {ex.Message}"); }
        }

        // 6. Sync AI chatbot avatar
        var settingsPath = Path.Combine(env.WebRootPath, "uploads", "ai", "settings.json");
        if (System.IO.File.Exists(settingsPath))
        {
            try
            {
                var content = await System.IO.File.ReadAllTextAsync(settingsPath, ct);
                var settings = JsonSerializer.Deserialize<AiSettings>(content, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                if (settings?.AvatarUrl != null)
                {
                    var driveId = ExtractDriveId(settings.AvatarUrl);
                    if (driveId != null)
                    {
                        var localPath = BuildLocalPath("ai/avatar", $"{driveId}.png");
                        var result = await drive.DownloadFileToLocalAsync(driveId, localPath, ct);
                        if (result != null) { avatarsSynced++; details.Add($"AI Avatar: {localPath}"); }
                    }
                }
            }
            catch (Exception ex) { details.Add($"Failed AI Avatar: {ex.Message}"); }
        }

        if (demosSynced > 0) await db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new
        {
            success = true,
            synced = new { images = imagesSynced, videos = videosSynced, files = filesSynced, demos = demosSynced, avatars = avatarsSynced },
            details
        }));
    }

    [HttpPost("reset-data")]
    public async Task<ActionResult<ApiResponse<object>>> ResetData(CancellationToken ct)
    {
        await admin.ResetDataAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpGet("orders")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AdminOrderDto>>>> GetOrders(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AdminOrderDto>>.Ok(await admin.GetAdminOrdersAsync(ct)));

    [HttpPost("orders/{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<object>>> CancelOrder(Guid id, [FromQuery] string? reason, CancellationToken ct)
    {
        await admin.CancelOrderAsync(id, reason, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("orders/{id:guid}/approve-cancellation")]
    public async Task<ActionResult<ApiResponse<object>>> ApproveCancellation(Guid id, ApproveCancellationRequest request, CancellationToken ct)
    {
        await admin.ApproveCancellationAsync(id, request.AdminNote, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("orders/{id:guid}/reject-cancellation")]
    public async Task<ActionResult<ApiResponse<object>>> RejectCancellation(Guid id, ApproveCancellationRequest request, CancellationToken ct)
    {
        await admin.RejectCancellationAsync(id, request.AdminNote, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("orders/{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteOrder(Guid id, CancellationToken ct)
    {
        await admin.DeleteOrderAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AdminUserDto>>>> GetUsers(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AdminUserDto>>.Ok(await admin.GetAdminUsersAsync(ct)));

    [HttpPost("users/{userId:guid}/toggle-active")]
    public async Task<ActionResult<ApiResponse<object>>> ToggleUserActive(Guid userId, CancellationToken ct)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (currentUserId == userId)
        {
            return BadRequest(ApiResponse<object>.Fail("CANNOT_BLOCK_SELF", "Bạn không thể tự khóa tài khoản của chính mình / You cannot lock your own account."));
        }
        await admin.ToggleUserActiveAsync(userId, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("users/{userId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteUser(Guid userId, CancellationToken ct)
    {
        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (currentUserId == userId)
        {
            return BadRequest(ApiResponse<object>.Fail("CANNOT_DELETE_SELF", "Bạn không thể tự xóa tài khoản của chính mình / You cannot delete your own account."));
        }
        await admin.DeleteUserAsync(userId, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("reset-demo-plays")]
    public async Task<ActionResult<ApiResponse<object>>> ResetDemoPlays(CancellationToken ct)
    {
        await admin.ResetDemoPlaysAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpGet("revenue")]
    public async Task<ActionResult<ApiResponse<AdminRevenueDto>>> GetRevenue(CancellationToken ct)
        => Ok(ApiResponse<AdminRevenueDto>.Ok(await admin.GetRevenueDetailsAsync(ct)));

    [HttpGet("analytics")]
    public async Task<ActionResult<ApiResponse<AdminAnalyticsDto>>> GetAnalytics(
        [FromQuery] string? range,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken ct)
        => Ok(ApiResponse<AdminAnalyticsDto>.Ok(await admin.GetAnalyticsAsync(range, startDate, endDate, ct)));

    [HttpGet("games")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AdminGameListDto>>>> GetGames(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<AdminGameListDto>>.Ok(await admin.GetAdminGamesAsync(ct)));

    private static string? ResolveDemoEntryHtml(string extractDir)
    {
        if (!Directory.Exists(extractDir)) return null;

        var htmlFiles = Directory.GetFiles(extractDir, "*.html", SearchOption.AllDirectories)
            .Concat(Directory.GetFiles(extractDir, "*.htm", SearchOption.AllDirectories))
            .Where(f => !f.Contains("__MACOSX", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (htmlFiles.Count == 0) return null;

        int GetDepth(string path) => path.Substring(extractDir.Length)
            .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            .Split([Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar], StringSplitOptions.RemoveEmptyEntries)
            .Length;

        int GetPriority(string path)
        {
            var fileName = Path.GetFileName(path);
            var baseName = Path.GetFileNameWithoutExtension(path);
            var dir = Path.GetDirectoryName(path) ?? extractDir;

            if (fileName.Equals("index.html", StringComparison.OrdinalIgnoreCase))
                return 0;

            bool hasMatchingEngineFiles =
                System.IO.File.Exists(Path.Combine(dir, baseName + ".pck")) ||
                System.IO.File.Exists(Path.Combine(dir, baseName + ".wasm")) ||
                System.IO.File.Exists(Path.Combine(dir, baseName + ".js"));

            if (hasMatchingEngineFiles)
                return 1;

            if (fileName.Equals("game.html", StringComparison.OrdinalIgnoreCase) ||
                fileName.Equals("play.html", StringComparison.OrdinalIgnoreCase) ||
                fileName.Equals("main.html", StringComparison.OrdinalIgnoreCase))
                return 2;

            return 3;
        }

        return htmlFiles
            .OrderBy(GetPriority)
            .ThenBy(GetDepth)
            .ThenBy(f => f.Length)
            .FirstOrDefault();
    }
}
