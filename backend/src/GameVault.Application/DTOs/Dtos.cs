namespace GameVault.Application.DTOs;

public record RegisterRequest(string Email, string Password, string FullName);
public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string RefreshToken);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
public record GoogleLoginRequest(string IdToken);
public record VerifyResetCodeRequest(string Email, string Code);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    UserDto User);

public record UserDto(Guid Id, string Email, string FullName, string? AvatarUrl, IReadOnlyList<string> Roles);
public record UserProfileDto(Guid Id, string Email, string FullName, string? AvatarUrl, DateOnly? DateOfBirth, DateTime CreatedAt, IReadOnlyList<string> Roles, bool IsLibraryPublic, bool IsPurchaseHistoryPublic);
public record UpdateProfileRequest(string FullName, DateOnly? DateOfBirth, string? AvatarUrl, bool IsLibraryPublic, bool IsPurchaseHistoryPublic);

public record GameListDto(
    Guid Id, string Title, string Slug, string ShortDescription,
    decimal Price, decimal? DiscountPrice, string Currency,
    decimal AvgRating, int ReviewCount, bool IsFeatured,
    string? PrimaryImageUrl, string CategoryName, int MinAge,
    int DownloadCount, bool HasDemo);

public record GameDetailDto(
    Guid Id, string Title, string Slug, string Description, string ShortDescription,
    string Developer, string? Publisher, DateOnly? ReleaseDate,
    decimal Price, decimal? DiscountPrice, string Currency, int MinAge,
    decimal AvgRating, int ReviewCount, int DemoPlayCount, int DownloadCount,
    string? SystemRequirements, string CategoryName,
    IReadOnlyList<string> Tags,
    IReadOnlyList<GameImageDto> Images,
    IReadOnlyList<GameVideoDto> Videos,
    UnityDemoDto? Demo,
    bool IsOwned, bool IsWishlisted,
    string? TitleEn, string? DescriptionEn, string? ShortDescriptionEn,
    string Status, bool IsFeatured);

public record GameImageDto(Guid Id, string Url, string? Caption, bool IsPrimary);
public record GameVideoDto(Guid Id, string Url, string Title, string? ThumbnailUrl);
public record UnityDemoDto(Guid Id, string BuildUrl, string? BuildPath);

public record GameFilterRequest(
    string? Q, Guid? CategoryId, string? Tag, decimal? MinPrice, decimal? MaxPrice,
    int? MaxMinAge, decimal? MinRating, bool? Featured, bool? HasDemo, bool? Discounted, string? Sort = "newest",
    int Page = 1, int PageSize = 20, string? Status = null);

public record CreateGameRequest(
    string Title, string Slug, string Description, string ShortDescription,
    string? TitleEn, string? DescriptionEn, string? ShortDescriptionEn,
    IReadOnlyList<Guid> CategoryIds, string Developer, string? Publisher, DateOnly? ReleaseDate,
    decimal Price, decimal? DiscountPrice, int MinAge, bool IsFeatured,
    string? SystemRequirements, IReadOnlyList<Guid>? TagIds, string Status = "Draft");

public record UpdateGameRequest(
    string Title, string Description, string ShortDescription,
    string? TitleEn, string? DescriptionEn, string? ShortDescriptionEn,
    IReadOnlyList<Guid> CategoryIds, string Developer, string? Publisher, DateOnly? ReleaseDate,
    decimal Price, decimal? DiscountPrice, int MinAge, bool IsFeatured, string Status,
    string? SystemRequirements, IReadOnlyList<Guid>? TagIds);

public record CreateReviewRequest(byte? Rating, string? Title, string Comment, Guid? ParentId = null);
public record UpdateReviewRequest(byte? Rating, string Comment);
public record ReviewDto(Guid Id, Guid GameId, Guid UserId, string UserName, string? UserAvatarUrl, byte? Rating, string? Title, string Comment, bool IsVerifiedPurchase, DateTime CreatedAt, Guid? ParentId = null);

public record CreateOrderRequest(IReadOnlyList<Guid> GameIds);
public record OrderDto(Guid Id, string OrderCode, string Status, decimal TotalAmount, string Currency, DateTime CreatedAt, IReadOnlyList<OrderItemDto> Items, string? CancelReason = null, string? AdminNote = null);
public record OrderItemDto(Guid GameId, string GameTitle, string GameSlug, string? GameCoverUrl, decimal UnitPrice, decimal LineTotal);

public record PaymentDto(Guid Id, Guid OrderId, string Status, decimal Amount, string? QrImageUrl, string? QrContent, DateTime? ExpiresAt, string OrderCode);
public record PaymentStatusDto(Guid Id, string Status, DateTime? PaidAt);

public record LibraryGameDto(Guid GameId, string Title, string Slug, string? CoverUrl, DateTime AcquiredAt, string? Version, DateTime? LastDownloadAt);
public record DownloadLinkDto(string Url, DateTime ExpiresAt, string FileName, long FileSizeBytes);

public record AiChatRequest(string Message, string Locale = "vi", Guid? SessionId = null);
public record AiChatResponse(Guid SessionId, string Answer, IReadOnlyList<GameListDto>? Games, string Source);

public record AdminStatsDto(
    decimal TotalRevenue, int TotalOrders, int TotalUsers, int TotalGames,
    int TotalDownloads, int TotalDemoPlays, IReadOnlyList<TopGameDto> TopGames,
    IReadOnlyList<DemoPlayHistoryDto> RecentDemoPlays);

public record DemoPlayHistoryDto(
    Guid Id, string GameTitle, string? UserFullName, string? UserEmail, DateTime PlayedAt, int? PlayDurationSeconds);

public record TopGameDto(Guid Id, string Title, int DownloadCount, decimal Revenue);

public record CategoryDto(Guid Id, string Name, string Slug);
public record TagDto(Guid Id, string Name, string Slug);
public record NotificationDto(Guid Id, string Type, string Title, string Message, bool IsRead, DateTime CreatedAt, string? RelatedEntityType = null, Guid? RelatedEntityId = null, string? Metadata = null);

public record SePayWebhookPayload(string TransactionId, string OrderCode, decimal Amount, string Status, long Timestamp, string Signature);

public record SePayWebhookBody(
    long Id,
    string Gateway,
    string TransactionDate,
    string AccountNumber,
    string SubAccount,
    string? Code,
    string Content,
    string TransferType,
    string Description,
    decimal TransferAmount,
    decimal Accumulated,
    string ReferenceCode
);

public record AdminOrderDto(
    Guid Id, string OrderCode, string BuyerEmail, string BuyerFullName,
    decimal TotalAmount, string Status, DateTime CreatedAt, IReadOnlyList<AdminOrderItemDto> Items, string? CancelReason = null, string? AdminNote = null);

public record AdminOrderItemDto(string GameTitle, decimal UnitPrice, decimal LineTotal);

public record AdminUserDto(Guid Id, string Email, string FullName, DateOnly? DateOfBirth, DateTime CreatedAt, bool IsActive, IReadOnlyList<string> Roles);

public record RevenuePointDto(string Time, decimal Amount);
public record GameRevenueDto(string GameTitle, decimal Amount);

public record AdminRevenueDto(
    decimal TotalRevenue,
    IReadOnlyList<RevenuePointDto> DailyRevenue,
    IReadOnlyList<RevenuePointDto> MonthlyRevenue,
    IReadOnlyList<GameRevenueDto> GameRevenue);

public record AdminGameListDto(
    Guid Id, string Title, string Slug, decimal Price, string Status,
    bool HasFile, int DownloadCount, int WishlistCount, decimal AvgRating, int ReviewCount,
    string? CategoryName, string? CoverUrl, int DemoPlayCount,
    bool HasCover, bool HasTrailer, bool HasDemo);

public record UpdateDemoDurationRequest(int DurationSeconds);

public record AnalyticsTimeSummaryDto(decimal Revenue, int Orders, int Downloads, int Registrations, int DemoPlays);
public record AnalyticsTrendPointDto(string Time, decimal Revenue, int Downloads, int Registrations, int DemoPlays);
public record GameDownloadStatDto(Guid GameId, string Title, int DownloadCount);
public record GameDemoStatDto(Guid GameId, string Title, int DemoPlayCount, int AveragePlayTimeSeconds);
public record GameConversionDto(Guid GameId, string Title, double PlayToPurchaseRate, double WishlistToPurchaseRate);
public record DetailedUserStatDto(
    Guid Id,
    string Email,
    string FullName,
    DateTime CreatedAt,
    int GamesPurchased,
    decimal TotalSpent,
    int DemoPlays,
    string CustomerSegment
);

public record DetailedGameStatDto(
    Guid Id,
    string Title,
    decimal Price,
    string Status,
    int Downloads,
    int DemoPlays,
    int WishlistCount,
    decimal TotalRevenue,
    double DemoToPurchaseRate
);

public record AdminAnalyticsDto(
    AnalyticsTimeSummaryDto SelectedPeriod,
    AnalyticsTimeSummaryDto PreviousPeriod,
    IReadOnlyList<AnalyticsTrendPointDto> DailyTrend,
    IReadOnlyList<AnalyticsTrendPointDto> WeeklyTrend,
    IReadOnlyList<AnalyticsTrendPointDto> MonthlyTrend,
    IReadOnlyList<GameDownloadStatDto> TopDownloadedGames,
    IReadOnlyList<GameDemoStatDto> TopDemoPlayedGames,
    IReadOnlyList<GameConversionDto> GameConversions,
    IReadOnlyList<DetailedUserStatDto> UserStats,
    IReadOnlyList<DetailedGameStatDto> GameStats
);

public record ResendVerificationRequest(string Email);
public record RequestCancellationRequest(string Reason);
public record ApproveCancellationRequest(string? AdminNote);
