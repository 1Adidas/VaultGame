using GameVault.Application.Common;
using GameVault.Application.DTOs;

namespace GameVault.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task LogoutAsync(Guid userId, CancellationToken ct = default);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct = default);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default);
    Task ResendVerificationEmailAsync(ResendVerificationRequest request, CancellationToken ct = default);
    Task<bool> VerifyResetCodeAsync(string email, string code, CancellationToken ct = default);
}

public interface IGameService
{
    Task<PagedResult<GameListDto>> GetGamesAsync(GameFilterRequest filter, string locale = "vi", CancellationToken ct = default);
    Task<GameDetailDto?> GetBySlugAsync(string slug, Guid? userId, string locale = "vi", CancellationToken ct = default);
    Task<Guid> IncrementDemoPlayAsync(string slug, Guid? userId, CancellationToken ct = default);
    Task UpdateDemoPlayDurationAsync(Guid historyId, int durationSeconds, CancellationToken ct = default);
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<TagDto>> GetTagsAsync(CancellationToken ct = default);
}

public interface IReviewService
{
    Task<IReadOnlyList<ReviewDto>> GetByGameSlugAsync(string slug, CancellationToken ct = default);
    Task<ReviewDto> CreateAsync(Guid gameId, Guid userId, CreateReviewRequest request, CancellationToken ct = default);
    Task<ReviewDto> UpdateAsync(Guid reviewId, Guid userId, UpdateReviewRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid reviewId, Guid userId, bool isAdmin, CancellationToken ct = default);
}

public interface IWishlistService
{
    Task<IReadOnlyList<GameListDto>> GetAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(Guid userId, Guid gameId, CancellationToken ct = default);
    Task RemoveAsync(Guid userId, Guid gameId, CancellationToken ct = default);
}

public interface IOrderService
{
    Task<OrderDto> CreateAsync(Guid userId, CreateOrderRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<OrderDto>> GetByUserAsync(Guid userId, CancellationToken ct = default);
    Task<OrderDto?> GetByIdAsync(Guid userId, Guid orderId, CancellationToken ct = default);
    Task ResendReceiptEmailAsync(Guid userId, Guid orderId, CancellationToken ct = default);
    Task RequestCancellationAsync(Guid userId, Guid orderId, RequestCancellationRequest request, CancellationToken ct = default);
    Task CancelPendingOrderAsync(Guid userId, Guid orderId, CancellationToken ct = default);
}

public interface IPaymentService
{
    Task<PaymentDto> InitiatePaymentAsync(Guid userId, Guid orderId, CancellationToken ct = default);
    Task<PaymentStatusDto> GetStatusAsync(Guid userId, Guid paymentId, CancellationToken ct = default);
    Task HandleWebhookAsync(SePayWebhookPayload payload, CancellationToken ct = default);
    Task SimulatePaymentAsync(Guid paymentId, CancellationToken ct = default);
}

public interface ILibraryService
{
    Task<IReadOnlyList<LibraryGameDto>> GetLibraryAsync(Guid userId, CancellationToken ct = default);
    Task<DownloadLinkDto> GetDownloadLinkAsync(Guid userId, Guid gameId, CancellationToken ct = default);
    Task RemoveFromLibraryAsync(Guid userId, Guid gameId, CancellationToken ct = default);
}

public interface IAiService
{
    Task<AiChatResponse> ChatAsync(Guid? userId, AiChatRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<object>> GetHistoryAsync(Guid? userId, Guid? sessionId, CancellationToken ct = default);
    Task DeleteSessionAsync(Guid? userId, Guid sessionId, CancellationToken ct = default);
}

public interface IAdminService
{
    Task<GameDetailDto> CreateGameAsync(CreateGameRequest request, CancellationToken ct = default);
    Task<GameDetailDto> UpdateGameAsync(Guid id, UpdateGameRequest request, CancellationToken ct = default);
    Task DeleteGameAsync(Guid id, CancellationToken ct = default);
    Task PublishGameAsync(Guid id, CancellationToken ct = default);
    Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default);
    Task ResetDataAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AdminOrderDto>> GetAdminOrdersAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AdminUserDto>> GetAdminUsersAsync(CancellationToken ct = default);
    Task ToggleUserActiveAsync(Guid userId, CancellationToken ct = default);
    Task<AdminRevenueDto> GetRevenueDetailsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AdminGameListDto>> GetAdminGamesAsync(CancellationToken ct = default);
    Task CancelOrderAsync(Guid orderId, string? reason, CancellationToken ct = default);
    Task DeleteOrderAsync(Guid orderId, CancellationToken ct = default);
    Task DeleteUserAsync(Guid userId, CancellationToken ct = default);
    Task ResetDemoPlaysAsync(CancellationToken ct = default);
    Task<AdminAnalyticsDto> GetAnalyticsAsync(string? range, DateTime? startDate, DateTime? endDate, CancellationToken ct = default);
    Task ApproveCancellationAsync(Guid orderId, string? adminNote, CancellationToken ct = default);
    Task RejectCancellationAsync(Guid orderId, string? adminNote, CancellationToken ct = default);
}

public interface IGoogleDriveService
{
    Task<(string FileId, string Url)> UploadAsync(Stream stream, string fileName, string mimeType, string folder, CancellationToken ct = default);
    Task<string> GetDownloadUrlAsync(string fileId, CancellationToken ct = default);
    Task DeleteAsync(string fileId, CancellationToken ct = default);
    /// <summary>Downloads a file from Google Drive to the local wwwroot/uploads folder. Returns the local relative URL path.</summary>
    Task<string?> DownloadFileToLocalAsync(string driveFileId, string localRelativePath, CancellationToken ct = default);
}

public interface INotificationService
{
    Task<IReadOnlyList<NotificationDto>> GetAsync(Guid userId, CancellationToken ct = default);
    Task MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default);
    Task CreateAsync(Guid userId, string type, string title, string message, Guid? relatedId = null, string? relatedType = null, string? metadata = null, CancellationToken ct = default);
    Task ClearAllAsync(Guid userId, CancellationToken ct = default);
}

public interface IJwtTokenService
{
    string GenerateAccessToken(UserDto user);
    string GenerateRefreshToken();
    (string Hash, DateTime ExpiresAt) HashRefreshToken(string token);
}
