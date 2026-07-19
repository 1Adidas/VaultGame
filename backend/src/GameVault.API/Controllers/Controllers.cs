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

namespace GameVault.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
[EnableRateLimiting("auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register(RegisterRequest request, CancellationToken ct)
        => Ok(ApiResponse<AuthResponse>.Ok(await auth.RegisterAsync(request, ct)));

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(LoginRequest request, CancellationToken ct)
        => Ok(ApiResponse<AuthResponse>.Ok(await auth.LoginAsync(request, ct)));

    [HttpPost("google")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> GoogleLogin(GoogleLoginRequest request, CancellationToken ct)
        => Ok(ApiResponse<AuthResponse>.Ok(await auth.LoginWithGoogleAsync(request, ct)));

    [HttpPost("refresh")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Refresh(RefreshTokenRequest request, CancellationToken ct)
        => Ok(ApiResponse<AuthResponse>.Ok(await auth.RefreshAsync(request, ct)));

    [HttpPost("resend-verification")]
    public async Task<ActionResult<ApiResponse<object>>> ResendVerification(ResendVerificationRequest request, CancellationToken ct)
    {
        await auth.ResendVerificationEmailAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct)
    {
        await auth.ForgotPasswordAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("verify-reset-code")]
    public async Task<ActionResult<ApiResponse<object>>> VerifyResetCode(VerifyResetCodeRequest request, CancellationToken ct)
    {
        var isValid = await auth.VerifyResetCodeAsync(request.Email, request.Code, ct);
        if (!isValid)
        {
            return BadRequest(ApiResponse<object>.Fail("AUTH_INVALID_TOKEN", "Mã xác nhận không hợp lệ hoặc đã hết hạn!"));
        }
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword(ResetPasswordRequest request, CancellationToken ct)
    {
        await auth.ResetPasswordAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult<ApiResponse<object>>> Logout(CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await auth.LogoutAsync(userId, ct);
        return Ok(ApiResponse<object>.Ok(new { }));
    }
}

[ApiController]
[Route("api/v1/games")]
public class GamesController(IGameService games) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<GameListDto>>>> List([FromQuery] GameFilterRequest filter, [FromHeader(Name = "Accept-Language")] string? locale, CancellationToken ct)
    {
        var result = await games.GetGamesAsync(filter, locale ?? "vi", ct);
        return Ok(ApiResponse<PagedResult<GameListDto>>.Ok(result, new ApiMeta(result.Page, result.PageSize, result.Total)));
    }

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> Categories(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(await games.GetCategoriesAsync(ct)));

    [HttpGet("tags")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<TagDto>>>> Tags(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<TagDto>>.Ok(await games.GetTagsAsync(ct)));

    [HttpGet("{slug}")]
    public async Task<ActionResult<ApiResponse<GameDetailDto>>> Detail(string slug, [FromHeader(Name = "Accept-Language")] string? locale, CancellationToken ct)
    {
        Guid? userId = User.Identity?.IsAuthenticated == true ? Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!) : null;
        var game = await games.GetBySlugAsync(slug, userId, locale ?? "vi", ct);
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

[ApiController]
[Authorize]
[Route("api/v1/orders")]
public class OrdersController(IOrderService orders, IPaymentService payments) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Create(CreateOrderRequest request, CancellationToken ct)
        => Ok(ApiResponse<OrderDto>.Ok(await orders.CreateAsync(UserId, request, ct)));

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<OrderDto>>>> List(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<OrderDto>>.Ok(await orders.GetByUserAsync(UserId, ct)));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Get(Guid id, CancellationToken ct)
    {
        var order = await orders.GetByIdAsync(UserId, id, ct);
        return order is null ? NotFound() : Ok(ApiResponse<OrderDto>.Ok(order));
    }

    [HttpPost("{id:guid}/pay")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> Pay(Guid id, CancellationToken ct)
        => Ok(ApiResponse<PaymentDto>.Ok(await payments.InitiatePaymentAsync(UserId, id, ct)));

    [HttpPost("{id:guid}/resend")]
    public async Task<ActionResult<ApiResponse<object>>> ResendReceipt(Guid id, CancellationToken ct)
    {
        await orders.ResendReceiptEmailAsync(UserId, id, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("{id:guid}/cancel-request")]
    public async Task<ActionResult<ApiResponse<object>>> RequestCancellation(Guid id, RequestCancellationRequest request, CancellationToken ct)
    {
        await orders.RequestCancellationAsync(UserId, id, request, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<object>>> CancelPending(Guid id, CancellationToken ct)
    {
        await orders.CancelPendingOrderAsync(UserId, id, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}

[ApiController]
[Route("api/v1/payments")]
public class PaymentsController(IPaymentService payments, SePaySimulatorService sepay) : ControllerBase
{
    [Authorize]
    [HttpGet("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<PaymentStatusDto>>> Status(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(ApiResponse<PaymentStatusDto>.Ok(await payments.GetStatusAsync(userId, id, ct)));
    }

    // Trigger watch reload and amount validation integration..
    [HttpPost("webhooks/sepay")]
    [HttpPost("webhook/sepay")]
    [HttpPost("/api/v1/webhooks/sepay")]
    [HttpPost("/api/v1/webhook/sepay")]
    public async Task<ActionResult> Webhook(CancellationToken ct)
    {
        Request.EnableBuffering();

        using var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync(ct);
        Request.Body.Position = 0;

        if (Request.Headers.TryGetValue("X-SePay-Signature", out var signatureHeader))
        {
            Request.Headers.TryGetValue("X-SePay-Timestamp", out var timestampHeader);

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var sePayBody = JsonSerializer.Deserialize<SePayWebhookBody>(rawBody, options);
            if (sePayBody == null)
            {
                return BadRequest(ApiResponse<object>.Fail("INVALID_BODY", "Invalid SePay body"));
            }

            var isSignatureValid = sepay.VerifySePayWebhookSignature(rawBody, signatureHeader.ToString(), timestampHeader.ToString());
            if (!isSignatureValid)
            {
                return Unauthorized(ApiResponse<object>.Fail("WEBHOOK_INVALID", "Invalid signature"));
            }

            var orderCode = sePayBody.Code ?? "";
            if (string.IsNullOrEmpty(orderCode) && !string.IsNullOrEmpty(sePayBody.Content))
            {
                var match = System.Text.RegularExpressions.Regex.Match(sePayBody.Content, @"\b[A-Za-z0-9]{8,10}\b");
                if (!match.Success)
                {
                    match = System.Text.RegularExpressions.Regex.Match(sePayBody.Content, @"[A-Za-z0-9]{8,10}");
                }
                if (match.Success)
                {
                    orderCode = match.Value.ToUpper();
                }
            }

            var payload = new SePayWebhookPayload(
                TransactionId: sePayBody.Id.ToString(),
                OrderCode: orderCode,
                Amount: sePayBody.TransferAmount,
                Status: "success",
                Timestamp: DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                Signature: ""
            );

            var mockSignature = sepay.ComputeSignature(payload.TransactionId, payload.OrderCode, payload.Amount, payload.Timestamp);
            var signedPayload = payload with { Signature = mockSignature };

            await payments.HandleWebhookAsync(signedPayload, ct);
            return Ok(new { success = true, received = true });
        }
        else
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var payload = JsonSerializer.Deserialize<SePayWebhookPayload>(rawBody, options);
            if (payload == null)
            {
                return BadRequest(ApiResponse<object>.Fail("INVALID_BODY", "Invalid request payload"));
            }

            await payments.HandleWebhookAsync(payload, ct);
            return Ok(new { success = true, received = true });
        }
    }
}

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

[ApiController]
[Authorize]
[Route("api/v1/notifications")]
public class NotificationsController(INotificationService notifications) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<NotificationDto>>>> Get(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<NotificationDto>>.Ok(await notifications.GetAsync(UserId, ct)));

    [HttpPost("{id:guid}/read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkRead(Guid id, CancellationToken ct)
    {
        await notifications.MarkReadAsync(UserId, id, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete]
    public async Task<ActionResult<ApiResponse<object>>> ClearAll(CancellationToken ct)
    {
        await notifications.ClearAllAsync(UserId, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}

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

    [AllowAnonymous]
    [HttpGet("available-models")]
    public async Task<ActionResult<ApiResponse<object>>> ListModels([FromQuery] string apiKey, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(apiKey)) return BadRequest(ApiResponse<object>.Fail("KEY_MISSING", "apiKey is required"));
        using var client = new HttpClient();
        try
        {
            var response = await client.GetAsync($"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey.Trim()}", ct);
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

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
public class AdminController(IAdminService admin, IGoogleDriveService drive, AppDbContext db) : ControllerBase
{
    [HttpGet("dashboard/stats")]
    public async Task<ActionResult<ApiResponse<AdminStatsDto>>> Stats(CancellationToken ct)
        => Ok(ApiResponse<AdminStatsDto>.Ok(await admin.GetStatsAsync(ct)));

    [HttpPost("ai/avatar")]
    public async Task<ActionResult<ApiResponse<object>>> UploadAiAvatar(IFormFile file, [FromServices] IWebHostEnvironment env, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var (_, url) = await drive.UploadAsync(stream, file.FileName, file.ContentType, "ai/avatar", ct);
        
        var settingsPath = Path.Combine(env.WebRootPath, "uploads", "ai", "settings.json");
        var dir = Path.GetDirectoryName(settingsPath);
        if (dir != null && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }
        
        var settings = new AiSettings { AvatarUrl = url };
        var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await System.IO.File.WriteAllTextAsync(settingsPath, json, ct);
        
        return Ok(ApiResponse<object>.Ok(new { url }));
    }

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

    [HttpPost("games/{id:guid}/upload")]
    [RequestSizeLimit(524_288_000)]
    public async Task<ActionResult<ApiResponse<object>>> Upload(Guid id, [FromForm] string type, IFormFile file, CancellationToken ct)
    {
        var game = await db.Games.FindAsync([id], ct);
        if (game is null) return NotFound(ApiResponse<object>.Fail("GAME_NOT_FOUND", "Game not found"));
        string gameFolder = string.IsNullOrEmpty(game.Slug) ? id.ToString() : game.Slug;

        await using var stream = file.OpenReadStream();
        var (fileId, url) = await drive.UploadAsync(stream, file.FileName, file.ContentType, $"games/{gameFolder}/{type}", ct);
        
        string buildUrl = url;
        string buildPath = url;

        switch (type.ToLowerInvariant())
        {
            case "image":
                var existingImages = await db.GameImages.Where(i => i.GameId == id).ToListAsync(ct);
                foreach (var img in existingImages)
                {
                    img.IsPrimary = false;
                }
                db.GameImages.Add(new Domain.Entities.GameImage { GameId = id, GoogleDriveFileId = fileId, Url = url, IsPrimary = true });
                break;
            case "trailer":
                db.GameVideos.Add(new Domain.Entities.GameVideo { GameId = id, GoogleDriveFileId = fileId, Url = url, Title = file.FileName });
                break;
            case "installer":
                db.GameFiles.Add(new Domain.Entities.GameFile { GameId = id, GoogleDriveFileId = fileId, FileName = file.FileName, FileSizeBytes = file.Length, MimeType = file.ContentType, DownloadUrl = url });
                break;
            case "demo":
                if (Path.GetExtension(file.FileName).Equals(".zip", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        var demoDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "games", gameFolder, "demo");
                        var extractDir = Path.Combine(demoDir, "extracted");

                        if (Directory.Exists(extractDir))
                        {
                            try { Directory.Delete(extractDir, true); } catch {}
                        }
                        Directory.CreateDirectory(extractDir);

                        using (var ms = new MemoryStream())
                        {
                            await file.CopyToAsync(ms, ct);
                            ms.Position = 0;
                            using (var archive = new System.IO.Compression.ZipArchive(ms))
                            {
                                archive.ExtractToDirectory(extractDir, overwriteFiles: true);
                            }
                        }

                        var indexFiles = Directory.GetFiles(extractDir, "index.html", SearchOption.AllDirectories);
                        if (indexFiles.Length > 0)
                        {
                            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                            buildUrl = indexFiles[0].Replace(wwwrootPath, "").Replace('\\', '/');
                            buildPath = indexFiles[0];
                        }
                        else
                        {
                            buildUrl = $"/uploads/games/{gameFolder}/demo/extracted/index.html";
                            buildPath = Path.Combine(extractDir, "index.html");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error extracting Unity WebGL demo zip: {ex.Message}");
                    }
                }

                var demo = await db.UnityDemos.FirstOrDefaultAsync(d => d.GameId == id, ct);
                if (demo is null) db.UnityDemos.Add(new Domain.Entities.UnityDemo { GameId = id, GoogleDriveFileId = fileId, BuildUrl = buildUrl, BuildPath = buildPath });
                else { demo.BuildUrl = buildUrl; demo.BuildPath = buildPath; demo.GoogleDriveFileId = fileId; demo.IsActive = true; }
                break;
        }
        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { fileId, url }));
    }









    [HttpDelete("games/{id:guid}/cover")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteCover(Guid id, CancellationToken ct)
    {
        var images = await db.GameImages.Where(i => i.GameId == id).ToListAsync(ct);
        db.GameImages.RemoveRange(images);
        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("games/{id:guid}/trailer")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteTrailer(Guid id, CancellationToken ct)
    {
        var videos = await db.GameVideos.Where(v => v.GameId == id).ToListAsync(ct);
        db.GameVideos.RemoveRange(videos);
        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("games/{id:guid}/demo")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteDemo(Guid id, CancellationToken ct)
    {
        var demo = await db.UnityDemos.FirstOrDefaultAsync(d => d.GameId == id, ct);
        if (demo != null)
        {
            db.UnityDemos.Remove(demo);
            
            var demoDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "games", id.ToString(), "demo");
            if (Directory.Exists(demoDir))
            {
                try { Directory.Delete(demoDir, true); } catch {}
            }
            
            await db.SaveChangesAsync(ct);
        }
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete("games/{id:guid}/installer")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteInstaller(Guid id, CancellationToken ct)
    {
        var files = await db.GameFiles.Where(f => f.GameId == id).ToListAsync(ct);
        db.GameFiles.RemoveRange(files);
        await db.SaveChangesAsync(ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
    [HttpPost("migrate-uploads-to-drive")]
    public async Task<ActionResult<ApiResponse<object>>> MigrateUploadsToDrive([FromServices] IWebHostEnvironment env, CancellationToken ct)
    {
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

        if (imagesMigrated > 0 || videosMigrated > 0 || filesMigrated > 0 || demosMigrated > 0 || avatarsMigrated > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            success = true,
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
                            var indexFiles = Directory.GetFiles(extractDir, "index.html", SearchOption.AllDirectories);
                            if (indexFiles.Length > 0)
                            {
                                var buildUrl = indexFiles[0].Replace(env.WebRootPath, "").Replace('\\', '/');
                                demo.BuildUrl = buildUrl;
                                demo.BuildPath = indexFiles[0];
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

    [HttpGet("ai/logs")]
    public async Task<ActionResult<ApiResponse<List<object>>>> GetAiLogs(CancellationToken ct)
    {
        var logPath = Path.Combine(Directory.GetCurrentDirectory(), "logs", "groq_api_calls.json");
        var list = new List<object>();
        if (System.IO.File.Exists(logPath))
        {
            var lines = await System.IO.File.ReadAllLinesAsync(logPath, ct);
            foreach (var line in lines)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                try
                {
                    var parsed = JsonSerializer.Deserialize<object>(line);
                    if (parsed != null) list.Add(parsed);
                }
                catch { /* ignore parsing errors */ }
            }
        }
        list.Reverse(); // Newest first
        return Ok(ApiResponse<List<object>>.Ok(list));
    }

    [HttpDelete("ai/logs")]
    public async Task<ActionResult<ApiResponse<object>>> ClearAiLogs(CancellationToken ct)
    {
        var logPath = Path.Combine(Directory.GetCurrentDirectory(), "logs", "groq_api_calls.json");
        if (System.IO.File.Exists(logPath))
        {
            try
            {
                System.IO.File.Delete(logPath);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.Fail("LOG_DELETE_FAILED", $"Failed to delete logs file: {ex.Message}"));
            }
        }
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}

[ApiController]
[Route("api/v1/dev")]
public class DevController(IPaymentService payments, IHostEnvironment env) : ControllerBase
{
    [HttpPost("simulate-payment/{paymentId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> SimulatePayment(Guid paymentId, CancellationToken ct)
    {
        if (!env.IsDevelopment()) return NotFound();
        await payments.SimulatePaymentAsync(paymentId, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}

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
