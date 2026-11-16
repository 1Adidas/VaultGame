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
[Route("api/v1/games")]
public class GamesController(IGameService games) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<GameListDto>>>> List(
        [FromQuery] GameFilterRequest filter, 
        [FromHeader(Name = "Accept-Language")] string? localeHeader, 
        [FromQuery] string? locale,
        CancellationToken ct)
    {
        var effectiveLocale = !string.IsNullOrWhiteSpace(locale) ? locale : localeHeader;
        var result = await games.GetGamesAsync(filter, effectiveLocale ?? "vi", ct);
        return Ok(ApiResponse<PagedResult<GameListDto>>.Ok(result, new ApiMeta(result.Page, result.PageSize, result.Total)));
    }

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> Categories(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(await games.GetCategoriesAsync(ct)));

    [HttpGet("tags")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TagDto>>>> Tags(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<TagDto>>.Ok(await games.GetTagsAsync(ct)));

    [HttpGet("{slug}")]
    public async Task<ActionResult<ApiResponse<GameDetailDto>>> Detail(
        string slug, 
        [FromHeader(Name = "Accept-Language")] string? localeHeader, 
        [FromQuery] string? locale,
        CancellationToken ct)
    {
        Guid? userId = User.Identity?.IsAuthenticated == true ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!) : null;
        var effectiveLocale = !string.IsNullOrWhiteSpace(locale) ? locale : localeHeader;
        var game = await games.GetBySlugAsync(slug, userId, effectiveLocale ?? "vi", ct);
        return game is null ? NotFound(ApiResponse<GameDetailDto>.Fail("GAME_NOT_FOUND", "Game not found")) : Ok(ApiResponse<GameDetailDto>.Ok(game));
    }

    [HttpPost("{slug}/demo-play")]
    public async Task<ActionResult<ApiResponse<object>>> DemoPlay(string slug, CancellationToken ct)
    {
        Guid? userId = User.Identity?.IsAuthenticated == true ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!) : null;
        var historyId = await games.IncrementDemoPlayAsync(slug, userId, ct);
        return Ok(ApiResponse<object>.Ok(new { historyId }));
    }

    [HttpPut("demo-play/{historyId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateDemoPlayDuration(Guid historyId, [FromBody] UpdateDemoDurationRequest request, CancellationToken ct)
    {
        await games.UpdateDemoPlayDurationAsync(historyId, request.DurationSeconds, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpGet("{slug}/reviews")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ReviewDto>>>> Reviews(string slug, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<ReviewDto>>.Ok(await HttpContext.RequestServices.GetRequiredService<IReviewService>().GetByGameSlugAsync(slug, ct)));
}
