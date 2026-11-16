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
public class LibraryController(ILibraryService library, AppDbContext db) : ControllerBase
{
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
        => Ok(ApiResponse<DownloadLinkDto>.Ok(await library.GetDownloadLinkAsync(UserId, gameId, ct)));

    [HttpDelete("{gameId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Remove(Guid gameId, CancellationToken ct)
    {
        await library.RemoveFromLibraryAsync(UserId, gameId, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}
