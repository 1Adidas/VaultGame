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
[Route("api/v1/wishlist")]
public class WishlistController(IWishlistService wishlist) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<GameListDto>>>> Get(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<GameListDto>>.Ok(await wishlist.GetAsync(UserId, ct)));

    [HttpPost("{gameId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Add(Guid gameId, CancellationToken ct)
    {
        await wishlist.AddAsync(UserId, gameId, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }

    [HttpDelete("{gameId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Remove(Guid gameId, CancellationToken ct)
    {
        await wishlist.RemoveAsync(UserId, gameId, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}
