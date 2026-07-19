using System.Security.Cryptography;
using DnsClient;
using GameVault.Application.Common;
using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Domain.Entities;
using GameVault.Domain.Enums;
using GameVault.Infrastructure.Persistence;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace GameVault.Infrastructure.Services;

public class AuthService(AppDbContext db, IJwtTokenService jwt, IEmailService email, IConfiguration config) : IAuthService
{
    private static bool IsRealEmailDomain(string emailAddress)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(emailAddress);
            var domain = addr.Host;

            if (domain.Equals("gamevault.com", StringComparison.OrdinalIgnoreCase) || 
                domain.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var lookup = new LookupClient();
            var result = lookup.Query(domain, QueryType.MX);
            return result.Answers.MxRecords().Any();
        }
        catch
        {
            return false;
        }
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.Email == request.Email, ct))
            throw new AppException("AUTH_EMAIL_EXISTS", "Email already registered", 409);

        if (!IsRealEmailDomain(request.Email))
            throw new AppException("AUTH_EMAIL_FAKE", "Địa chỉ email không tồn tại hoặc không hợp lệ. Vui lòng sử dụng email thật! / Invalid or non-existent email domain. Please use a real email!", 400);

        var customerRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == RoleNames.Customer, ct)
            ?? throw new AppException("AUTH_ROLE_MISSING", "Customer role not found", 500);

        var user = new User
        {
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            IsEmailVerified = false
        };
        user.UserRoles.Add(new UserRole { Role = customerRole, User = user });
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        // Send welcome email (fire-and-forget, don't block registration)
        _ = email.SendAsync(user.Email, "Chào mừng bạn đến với GameVault! / Welcome to GameVault!", $"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #6c3ce0, #8b5cf6); padding: 32px 24px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Nền tảng game hàng đầu</p>
              </div>
              <div style="padding: 32px 24px;">
                <h2 style="color: #a78bfa; margin: 0 0 16px;">Xin chào {user.FullName}! 👋</h2>
                <p>Chào mừng bạn đã đăng ký tài khoản GameVault thành công!</p>
                <p>Bạn có thể bắt đầu khám phá kho game phong phú, chơi thử các bản demo WebGL ngay trên trình duyệt và mua game yêu thích.</p>
                <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                <p style="color: #888; font-size: 13px;">Welcome to GameVault, {user.FullName}! Start exploring our game catalog, play WebGL demos in your browser, and purchase your favorite titles.</p>
              </div>
            </div>
            """, ct);

        return await BuildAuthResponse(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant() && u.IsActive, ct)
            ?? throw new AppException("AUTH_INVALID", "Invalid email or password", 401);

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new AppException("AUTH_INVALID", "Invalid email or password", 401);

        return await BuildAuthResponse(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var hash = Convert.ToBase64String(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(request.RefreshToken)));
        var user = await db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.RefreshTokenHash == hash && u.RefreshTokenExpiresAt > DateTime.UtcNow, ct)
            ?? throw new AppException("AUTH_INVALID_REFRESH", "Invalid refresh token", 401);

        return await BuildAuthResponse(user, ct);
    }

    public async Task LogoutAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return;
        user.RefreshTokenHash = null;
        user.RefreshTokenExpiresAt = null;
        await db.SaveChangesAsync(ct);
    }

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (string Token, DateTime ExpiresAt)> _passwordResetTokens = new();

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant(), ct);
        if (user is null) return; // Don't reveal if email exists

        // Generate an 8-character reset code
        var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32))[..8];
        
        // Store code in memory with 15 minutes expiry
        _passwordResetTokens[user.Email] = (resetToken, DateTime.UtcNow.AddMinutes(15));
        Console.WriteLine($"🔑 [RESET TOKEN] Email: {user.Email} | Token: {resetToken}");

        await email.SendAsync(user.Email, "Đặt lại mật khẩu GameVault / Reset Your GameVault Password", $"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #6c3ce0, #8b5cf6); padding: 32px 24px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Đặt lại mật khẩu</p>
              </div>
              <div style="padding: 32px 24px;">
                <h2 style="color: #a78bfa; margin: 0 0 16px;">Xin chào {user.FullName},</h2>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
                <p style="margin: 24px 0; text-align: center;">
                  <span style="display: inline-block; background: #6c3ce0; color: #fff; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; letter-spacing: 2px;">{resetToken}</span>
                </p>
                <p style="color: #888; font-size: 13px; text-align: center;">Mã xác nhận có hiệu lực trong 15 phút.</p>
                <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                <p style="color: #888; font-size: 13px;">We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
              </div>
            </div>
            """, ct);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var parts = request.Token.Split('|');
        if (parts.Length != 2) throw new AppException("AUTH_INVALID_TOKEN", "Invalid token format", 400);
        var email = parts[0].ToLowerInvariant();
        var code = parts[1];

        if (!_passwordResetTokens.TryGetValue(email, out var stored) || stored.Token != code || stored.ExpiresAt < DateTime.UtcNow)
        {
            throw new AppException("AUTH_INVALID_TOKEN", "Invalid or expired reset token", 400);
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null) throw new AppException("AUTH_INVALID_TOKEN", "User not found", 400);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await db.SaveChangesAsync(ct);
        
        // Remove token after successful reset
        _passwordResetTokens.TryRemove(email, out _);
    }

    public Task<bool> VerifyResetCodeAsync(string email, string code, CancellationToken ct = default)
    {
        email = email.ToLowerInvariant();
        if (_passwordResetTokens.TryGetValue(email, out var stored) && stored.Token == code && stored.ExpiresAt >= DateTime.UtcNow)
        {
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public async Task<AuthResponse> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var validationSettings = new GoogleJsonWebSignature.ValidationSettings();
            var clientId = config["Authentication:Google:ClientId"];
            if (!string.IsNullOrEmpty(clientId) && 
                clientId != "YOUR_GOOGLE_CLIENT_ID" && 
                clientId != "YOUR_GOOGLE_CLIENT_ID_HERE")
            {
                validationSettings.Audience = [clientId];
            }
            
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, validationSettings);
        }
        catch (Exception ex)
        {
            throw new AppException("AUTH_GOOGLE_INVALID", $"Invalid Google ID token: {ex.Message}", 400);
        }

        if (string.IsNullOrEmpty(payload.Email))
            throw new AppException("AUTH_GOOGLE_INVALID", "Google ID token does not contain an email address", 400);

        var emailAddress = payload.Email.ToLowerInvariant();
        var user = await db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == emailAddress, ct);

        if (user == null)
        {
            var customerRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == RoleNames.Customer, ct)
                ?? throw new AppException("AUTH_ROLE_MISSING", "Customer role not found", 500);

            user = new User
            {
                Email = emailAddress,
                FullName = payload.Name ?? emailAddress.Split('@')[0],
                AvatarUrl = payload.Picture,
                IsEmailVerified = payload.EmailVerified,
                PasswordHash = string.Empty, // Google authenticated users do not use local password
                IsActive = true
            };
            user.UserRoles.Add(new UserRole { Role = customerRole, User = user });
            db.Users.Add(user);
            await db.SaveChangesAsync(ct);

            // Send welcome email (fire-and-forget, don't block registration)
            _ = email.SendAsync(user.Email, "Chào mừng bạn đến với GameVault! / Welcome to GameVault!", $"""
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #6c3ce0, #8b5cf6); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Nền tảng game hàng đầu</p>
                  </div>
                  <div style="padding: 32px 24px;">
                    <h2 style="color: #a78bfa; margin: 0 0 16px;">Xin chào {user.FullName}! 👋</h2>
                    <p>Chào mừng bạn đã đăng ký tài khoản GameVault thành công bằng liên kết Google!</p>
                    <p>Bạn có thể bắt đầu khám phá kho game phong phú, chơi thử các bản demo WebGL ngay trên trình duyệt và mua game yêu thích.</p>
                    <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                    <p style="color: #888; font-size: 13px;">Welcome to GameVault, {user.FullName}! Start exploring our game catalog, play WebGL demos in your browser, and purchase your favorite titles.</p>
                  </div>
                </div>
                """, ct);
        }
        else
        {
            if (!user.IsActive)
                throw new AppException("AUTH_INACTIVE", "Your account is disabled", 403);

            // Update user details if Google verified them and local state is not updated yet
            bool updated = false;
            if (string.IsNullOrEmpty(user.AvatarUrl) && !string.IsNullOrEmpty(payload.Picture))
            {
                user.AvatarUrl = payload.Picture;
                updated = true;
            }
            if (payload.EmailVerified && !user.IsEmailVerified)
            {
                user.IsEmailVerified = true;
                updated = true;
            }
            if (updated)
            {
                user.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
        }

        return await BuildAuthResponse(user, ct);
    }

    private async Task<AuthResponse> BuildAuthResponse(User user, CancellationToken ct)
    {
        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var dto = new UserDto(user.Id, user.Email, user.FullName, user.AvatarUrl, roles);
        var refresh = jwt.GenerateRefreshToken();
        var (hash, expires) = jwt.HashRefreshToken(refresh);
        user.RefreshTokenHash = hash;
        user.RefreshTokenExpiresAt = expires;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        var access = jwt.GenerateAccessToken(dto);
        return new AuthResponse(access, refresh, DateTime.UtcNow.AddMinutes(15), dto);
    }

    public async Task ResendVerificationEmailAsync(ResendVerificationRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant(), ct);
        if (user is null)
        {
            throw new AppException("AUTH_USER_NOT_FOUND", "Email not registered", 404);
        }

        await email.SendAsync(user.Email, "Chào mừng bạn đến với GameVault! / Welcome to GameVault!", $"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #6c3ce0, #8b5cf6); padding: 32px 24px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Nền tảng game hàng đầu</p>
              </div>
              <div style="padding: 32px 24px;">
                <h2 style="color: #a78bfa; margin: 0 0 16px;">Xin chào {user.FullName}! 👋</h2>
                <p>Chào mừng bạn đã đăng ký tài khoản GameVault thành công!</p>
                <p>Bạn có thể bắt đầu khám phá kho game phong phú, chơi thử các bản demo WebGL ngay trên trình duyệt và mua game yêu thích.</p>
                <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                <p style="color: #888; font-size: 13px;">Welcome to GameVault, {user.FullName}! Start exploring our game catalog, play WebGL demos in your browser, and purchase your favorite titles.</p>
              </div>
            </div>
            """, ct);
    }
}
