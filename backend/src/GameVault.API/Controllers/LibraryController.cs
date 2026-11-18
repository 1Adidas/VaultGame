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
[Authorize]
[Route("api/v1/library")]
public class LibraryController(ILibraryService library, AppDbContext db, IConfiguration config) : ControllerBase
{
    private const string LauncherClientHeader = "X-GameVault-Client";
    private const string LauncherClientValue = "GameVault-Launcher";
    private const string LauncherKeyHeader = "X-GameVault-Launcher-Key";
    private const string DefaultLauncherKey = "GV-Launcher-2026-Secret";

    private bool IsAuthorizedLauncherRequest()
    {
        if (!Request.Headers.TryGetValue(LauncherClientHeader, out var clientHeader) ||
            !string.Equals(clientHeader.ToString().Trim(), LauncherClientValue, StringComparison.Ordinal))
        {
            return false;
        }

        if (!Request.Headers.TryGetValue(LauncherKeyHeader, out var keyHeader))
        {
            return false;
        }

        var expectedKey = config["Launcher:DownloadClientKey"];
        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            expectedKey = DefaultLauncherKey;
        }

        return string.Equals(keyHeader.ToString().Trim(), expectedKey.Trim(), StringComparison.Ordinal);
    }
    private Guid? CurrentUserId
    {
        get
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return string.IsNullOrEmpty(idClaim) ? null : Guid.Parse(idClaim);
        }
    }

    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<LibraryGameDto>>>> Get([FromQuery] Guid? userId, CancellationToken ct)
    {
        var targetUserId = userId ?? CurrentUserId;
        if (targetUserId == null)
            return Unauthorized(ApiResponse<IReadOnlyList<LibraryGameDto>>.Fail("UNAUTHORIZED", "Not logged in"));

        var isOwn = targetUserId.Value == CurrentUserId;
        
        if (!isOwn)
        {
            var targetUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetUserId.Value, ct);
            if (targetUser == null)
                return NotFound(ApiResponse<IReadOnlyList<LibraryGameDto>>.Fail("USER_NOT_FOUND", "User not found"));

            if (!targetUser.IsLibraryPublic)
            {
                return Ok(ApiResponse<IReadOnlyList<LibraryGameDto>>.Ok(new List<LibraryGameDto>()));
            }
        }

        return Ok(ApiResponse<IReadOnlyList<LibraryGameDto>>.Ok(await library.GetLibraryAsync(targetUserId.Value, ct)));
    }

    [HttpGet("{gameId:guid}/download")]
    public async Task<ActionResult<ApiResponse<DownloadLinkDto>>> Download(Guid gameId, CancellationToken ct)
    {
        if (!IsAuthorizedLauncherRequest())
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                ApiResponse<DownloadLinkDto>.Fail(
                    "LAUNCHER_REQUIRED",
                    "Trò chơi chỉ có thể được tải xuống và cài đặt thông qua ứng dụng GameVault Launcher."
                )
            );
        }

        return Ok(ApiResponse<DownloadLinkDto>.Ok(await library.GetDownloadLinkAsync(UserId, gameId, ct)));
    }

    [HttpDelete("{gameId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Remove(Guid gameId, CancellationToken ct)
    {
        await library.RemoveFromLibraryAsync(UserId, gameId, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}
