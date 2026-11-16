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

public class AiSettings
{
    public string AvatarUrl { get; set; } = "/uploads/ai/default-bot.png";
}

[ApiController]
[Route("api/v1/ai")]
public class AiController(IAiService ai) : ControllerBase
{
    private Guid? UserId
    {
        get
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return string.IsNullOrEmpty(idClaim) ? null : Guid.Parse(idClaim);
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("available-models")]
    public async Task<ActionResult<ApiResponse<object>>> ListModels([FromQuery] string apiKey, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return BadRequest(ApiResponse<object>.Fail("KEY_MISSING", "apiKey is required"));
        using var client = new HttpClient();
        try
        {
            var response = await client.GetAsync($"https://generativelanguage.googleapis.com/v1beta/models?key={Uri.EscapeDataString(apiKey.Trim())}", ct);
            var content = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode, ApiResponse<object>.Fail("API_ERROR", content));
            var parsed = JsonSerializer.Deserialize<object>(content);
            return Ok(ApiResponse<object>.Ok(parsed));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<object>.Fail("ERROR", ex.Message));
        }
    }

    [AllowAnonymous]
    [HttpGet("settings")]
    public async Task<ActionResult<ApiResponse<AiSettings>>> GetSettings([FromServices] IWebHostEnvironment env)
    {
        var settingsPath = Path.Combine(env.WebRootPath, "uploads", "ai", "settings.json");
        if (System.IO.File.Exists(settingsPath))
        {
            try
            {
                var content = await System.IO.File.ReadAllTextAsync(settingsPath);
                var settings = JsonSerializer.Deserialize<AiSettings>(content, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                if (settings != null) return Ok(ApiResponse<AiSettings>.Ok(settings));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error reading AI settings: {ex.Message}");
            }
        }
        return Ok(ApiResponse<AiSettings>.Ok(new AiSettings()));
    }

    [AllowAnonymous]
    [EnableRateLimiting("ai")]
    [HttpPost("chat")]
    public async Task<ActionResult<ApiResponse<AiChatResponse>>> Chat(AiChatRequest request, CancellationToken ct)
        => Ok(ApiResponse<AiChatResponse>.Ok(await ai.ChatAsync(UserId, request, ct)));

    [Authorize]
    [HttpGet("history")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<object>>>> History([FromQuery] Guid? sessionId, CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<object>>.Ok(await ai.GetHistoryAsync(UserId, sessionId, ct)));

    [Authorize]
    [HttpDelete("history/{sessionId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteSession(Guid sessionId, CancellationToken ct)
    {
        await ai.DeleteSessionAsync(UserId, sessionId, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}
