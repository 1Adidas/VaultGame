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
[Route("api/v1/users")]
[Authorize]
public class UsersController(AppDbContext db, IGoogleDriveService drive) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("profile")]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> GetProfile(CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == UserId, ct);

        if (user is null) return NotFound();

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var profile = new UserProfileDto(user.Id, user.Email, user.FullName, user.AvatarUrl, user.DateOfBirth, user.CreatedAt, roles, user.IsLibraryPublic, user.IsPurchaseHistoryPublic);
        
        return Ok(ApiResponse<UserProfileDto>.Ok(profile));
    }

    [HttpPut("profile")]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> UpdateProfile(UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == UserId, ct);

        if (user is null) return NotFound();

        user.FullName = request.FullName;
        user.DateOfBirth = request.DateOfBirth;
        if (request.AvatarUrl != null)
        {
            user.AvatarUrl = request.AvatarUrl;
        }
        user.IsLibraryPublic = request.IsLibraryPublic;
        user.IsPurchaseHistoryPublic = request.IsPurchaseHistoryPublic;

        await db.SaveChangesAsync(ct);

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var profile = new UserProfileDto(user.Id, user.Email, user.FullName, user.AvatarUrl, user.DateOfBirth, user.CreatedAt, roles, user.IsLibraryPublic, user.IsPurchaseHistoryPublic);
        
        return Ok(ApiResponse<UserProfileDto>.Ok(profile));
    }

    [HttpPost("avatar")]
    public async Task<ActionResult<ApiResponse<object>>> UploadAvatar(IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var (_, url) = await drive.UploadAsync(stream, file.FileName, file.ContentType, $"avatars/{UserId}", ct);
        
        var user = await db.Users.FindAsync([UserId], ct);
        if (user is not null)
        {
            user.AvatarUrl = url;
            await db.SaveChangesAsync(ct);
        }
        return Ok(ApiResponse<object>.Ok(new { url }));
    }

    [HttpGet("profile/{id:guid}")]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> GetPublicProfile(Guid id, CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null) return NotFound(ApiResponse<UserProfileDto>.Fail("USER_NOT_FOUND", "User not found"));

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var profile = new UserProfileDto(user.Id, user.Email, user.FullName, user.AvatarUrl, user.DateOfBirth, user.CreatedAt, roles, user.IsLibraryPublic, user.IsPurchaseHistoryPublic);
        
        return Ok(ApiResponse<UserProfileDto>.Ok(profile));
    }
}
