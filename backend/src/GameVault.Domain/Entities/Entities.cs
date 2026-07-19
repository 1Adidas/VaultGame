using GameVault.Domain.Enums;

namespace GameVault.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsEmailVerified { get; set; }
    public string? RefreshTokenHash { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsLibraryPublic { get; set; } = false;
    public bool IsPurchaseHistoryPublic { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<Wishlist> Wishlists { get; set; } = [];
    public ICollection<UserGame> UserGames { get; set; } = [];
    public ICollection<AIChatHistory> AIChatHistories { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
}

public class Role
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; } = [];
}

public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public Guid? ParentId { get; set; }
    public Category? Parent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GameCategory> GameCategories { get; set; } = [];
}

public class Tag
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GameTag> GameTags { get; set; } = [];
}

public class Game
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string? TitleEn { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? DescriptionEn { get; set; }
    public string ShortDescription { get; set; } = string.Empty;
    public string? ShortDescriptionEn { get; set; }
    public string Developer { get; set; } = string.Empty;
    public string? Publisher { get; set; }
    public DateOnly? ReleaseDate { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public string Currency { get; set; } = "VND";
    public int MinAge { get; set; }
    public string Status { get; set; } = GameStatus.Draft;
    public bool IsFeatured { get; set; }
    public decimal AvgRating { get; set; }
    public int ReviewCount { get; set; }
    public int DemoPlayCount { get; set; }
    public int DownloadCount { get; set; }
    public string? SystemRequirements { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GameTag> GameTags { get; set; } = [];
    public ICollection<GameCategory> GameCategories { get; set; } = [];
    public ICollection<GameImage> Images { get; set; } = [];
    public ICollection<GameVideo> Videos { get; set; } = [];
    public ICollection<GameFile> Files { get; set; } = [];
    public UnityDemo? UnityDemo { get; set; }
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<Wishlist> Wishlists { get; set; } = [];
    public ICollection<OrderItem> OrderItems { get; set; } = [];
    public ICollection<UserGame> UserGames { get; set; } = [];
}

public class GameTag
{
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}

public class GameCategory
{
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;
}

public class GameImage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public string? GoogleDriveFileId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public string? Locale { get; set; }
    public int SortOrder { get; set; }
    public bool IsPrimary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class GameVideo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public string? GoogleDriveFileId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public int? DurationSeconds { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class GameFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public string? GoogleDriveFileId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public string? DownloadUrl { get; set; }
    public string Version { get; set; } = "1.0.0";
    public string? ChecksumSha256 { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class UnityDemo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public string? GoogleDriveFileId { get; set; }
    public string BuildUrl { get; set; } = string.Empty;
    public string? BuildPath { get; set; }
    public string? SceneName { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public byte? Rating { get; set; }
    public string? Title { get; set; }
    public string Comment { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public Review? Parent { get; set; }
    public bool IsApproved { get; set; } = true;
    public bool IsVerifiedPurchase { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Wishlist
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string OrderCode { get; set; } = string.Empty;
    public string Status { get; set; } = OrderStatus.Pending;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "VND";
    public string? Notes { get; set; }
    public string? CancelReason { get; set; }
    public string? AdminNote { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderItem> Items { get; set; } = [];
    public Payment? Payment { get; set; }
    public ICollection<UserGame> UserGames { get; set; } = [];
}

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal LineTotal { get; set; }
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public string? TransactionId { get; set; }
    public string Method { get; set; } = "SePay";
    public string Status { get; set; } = PaymentStatus.Pending;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string? QrContent { get; set; }
    public string? QrImageUrl { get; set; }
    public string? ProviderReference { get; set; }
    public string? WebhookPayload { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class UserGame
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public Guid? OrderId { get; set; }
    public Order? Order { get; set; }
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastDownloadAt { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public int PlayTimeMinutes { get; set; }
}

public class AIChatHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string Role { get; set; } = "user";
    public string? Question { get; set; }
    public string? GeneratedSql { get; set; }
    public string? QueryResult { get; set; }
    public string? Answer { get; set; }
    public int? TokensUsed { get; set; }
    public Guid? GameContextId { get; set; }
    public Game? GameContext { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Type { get; set; } = NotificationType.System;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public string? RelatedEntityType { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public string? Metadata { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class DemoPlayHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public Game Game { get; set; } = null!;
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;
    public int? PlayDurationSeconds { get; set; }
}

