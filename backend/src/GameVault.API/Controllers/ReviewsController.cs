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
[Route("api/v1")]
public class ReviewsController(IReviewService reviews) : ControllerBase
{
    [Authorize]
    [HttpPost("games/{gameId:guid}/reviews")]
    public async Task<ActionResult<ApiResponse<ReviewDto>>> Create(Guid gameId, CreateReviewRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(ApiResponse<ReviewDto>.Ok(await reviews.CreateAsync(gameId, userId, request, ct)));
    }

    [Authorize]
    [HttpPut("reviews/{reviewId:guid}")]
    public async Task<ActionResult<ApiResponse<ReviewDto>>> Update(Guid reviewId, UpdateReviewRequest request, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(ApiResponse<ReviewDto>.Ok(await reviews.UpdateAsync(reviewId, userId, request, ct)));
    }

    [Authorize]
    [HttpDelete("reviews/{reviewId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid reviewId, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isAdmin = User.IsInRole("Admin");
        await reviews.DeleteAsync(reviewId, userId, isAdmin, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}
