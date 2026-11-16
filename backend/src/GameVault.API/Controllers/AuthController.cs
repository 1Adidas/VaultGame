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
