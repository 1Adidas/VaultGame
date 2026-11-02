using GameVault.Application.Common;
using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Domain.Entities;
using GameVault.Domain.Enums;
using GameVault.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GameVault.Infrastructure.Services;

public class ReviewService(AppDbContext db, INotificationService notifications) : IReviewService
{
    public async Task<IReadOnlyList<ReviewDto>> GetByGameSlugAsync(string slug, CancellationToken ct = default)
    {
        return await db.Reviews.AsNoTracking()
            .Include(r => r.User).ThenInclude(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(r => r.Game)
            .Where(r => r.Game.Slug == slug && r.IsApproved)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewDto(
                r.Id, r.GameId, r.UserId, r.User.FullName, r.User.AvatarUrl, r.Rating, r.Title, r.Comment,
                r.IsVerifiedPurchase, r.CreatedAt, r.ParentId,
                r.User.UserRoles.Any(ur => ur.Role.Name == RoleNames.Admin) ? "Admin" : "Customer"
            ))
            .ToListAsync(ct);
    }

    public async Task<ReviewDto> CreateAsync(Guid gameId, Guid userId, CreateReviewRequest request, CancellationToken ct = default)
    {
        var game = await db.Games.FindAsync([gameId], ct) ?? throw new AppException("GAME_NOT_FOUND", "Game not found", 404);
        var verified = await db.UserGames.AnyAsync(ug => ug.UserId == userId && ug.GameId == gameId, ct);
        var isAdmin = await db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.Role.Name == RoleNames.Admin, ct);

        // Enforce 1 root review per user per game (regular players only)
        if (!request.ParentId.HasValue && !isAdmin)
        {
            var alreadyReviewed = await db.Reviews.AnyAsync(r => r.GameId == gameId && r.UserId == userId && r.ParentId == null, ct);
            if (alreadyReviewed)
            {
                throw new AppException("ALREADY_REVIEWED", "Bạn đã có bài đánh giá cho tựa game này rồi. Vui lòng chỉnh sửa bài đánh giá hiện có của bạn.", 400);
            }

            // Only owners who bought/own the game can submit star ratings
            if (request.Rating.HasValue && !verified)
            {
                throw new AppException("PURCHASE_REQUIRED_FOR_RATING", "Bạn cần sở hữu tựa game này để chấm điểm đánh giá số sao.", 400);
            }
        }

        // Admins and sub-replies never post star ratings to preserve fair community scores
        var effectiveRating = (request.ParentId.HasValue || isAdmin) ? null : request.Rating;

        var review = new Review
        {
            GameId = gameId, UserId = userId, Rating = effectiveRating,
            Title = request.Title, Comment = (request.Comment ?? "").Trim(),
            IsVerifiedPurchase = verified, IsApproved = true,
            ParentId = request.ParentId
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync(ct);
        await RecalcRating(gameId, ct);

        // Send notification if this is a reply to another user's review
        if (review.ParentId.HasValue)
        {
            var parentReview = await db.Reviews
                .Include(r => r.User)
                .Include(r => r.Game)
                .FirstOrDefaultAsync(r => r.Id == review.ParentId.Value, ct);
            
            if (parentReview != null)
            {
                // Try to find if a specific user is mentioned at the beginning of the comment
                User? targetUser = null;
                if (!string.IsNullOrEmpty(review.Comment) && review.Comment.StartsWith('@'))
                {
                    var threadUsers = await db.Reviews
                        .Where(r => r.GameId == gameId && r.UserId != userId)
                        .Select(r => r.User)
                        .Distinct()
                        .ToListAsync(ct);

                    foreach (var u in threadUsers)
                    {
                        var cleanName = (u.FullName ?? "").Trim();
                        if (!string.IsNullOrEmpty(cleanName) && review.Comment.StartsWith($"@{cleanName}", StringComparison.OrdinalIgnoreCase))
                        {
                            targetUser = u;
                            break;
                        }
                    }
                }

                // Fallback to the root comment's author
                if (targetUser == null && parentReview.UserId != userId)
                {
                    targetUser = parentReview.User;
                }

                if (targetUser != null && targetUser.Id != userId)
                {
                    var replier = await db.Users.FindAsync([userId], ct);
                    var replierName = replier?.FullName ?? "Ai đó";
                    var title = "Đã có người phản hồi bình luận của bạn";
                    var message = $"{replierName} đã trả lời bình luận của bạn trong game \"{parentReview.Game.Title}\".";
                    
                    var metadataJson = System.Text.Json.JsonSerializer.Serialize(new { slug = parentReview.Game.Slug, reviewId = review.Id });
                    await notifications.CreateAsync(
                        targetUser.Id,
                        NotificationType.System,
                        title,
                        message,
                        parentReview.GameId,
                        "Game",
                        metadataJson,
                        ct
                    );
                }
            }
        }

        var user = await db.Users.FindAsync([userId], ct);
        return new ReviewDto(review.Id, gameId, userId, user!.FullName, user.AvatarUrl, review.Rating, review.Title, review.Comment, verified, review.CreatedAt, review.ParentId, isAdmin ? "Admin" : "Customer");
    }

    public async Task<ReviewDto> UpdateAsync(Guid reviewId, Guid userId, UpdateReviewRequest request, CancellationToken ct = default)
    {
        var review = await db.Reviews.FindAsync([reviewId], ct) ?? throw new AppException("REVIEW_NOT_FOUND", "Review not found", 404);
        if (review.UserId != userId) throw new AppException("FORBIDDEN", "Not allowed", 403);
        var isAdmin = await db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.Role.Name == RoleNames.Admin, ct);

        if (review.ParentId.HasValue || isAdmin)
        {
            review.Rating = null;
        }
        else if (request.Rating.HasValue && !review.IsVerifiedPurchase)
        {
            throw new AppException("PURCHASE_REQUIRED_FOR_RATING", "Bạn cần sở hữu tựa game này để chấm điểm đánh giá số sao.", 400);
        }
        else
        {
            review.Rating = request.Rating;
        }

        review.Comment = (request.Comment ?? "").Trim();
        review.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await RecalcRating(review.GameId, ct);

        var user = await db.Users.FindAsync([userId], ct);
        return new ReviewDto(review.Id, review.GameId, userId, user!.FullName, user.AvatarUrl, review.Rating, review.Title, review.Comment, review.IsVerifiedPurchase, review.CreatedAt, review.ParentId, isAdmin ? "Admin" : "Customer");
    }

    public async Task DeleteAsync(Guid reviewId, Guid userId, bool isAdmin, CancellationToken ct = default)
    {
        var review = await db.Reviews.FindAsync([reviewId], ct) ?? throw new AppException("REVIEW_NOT_FOUND", "Review not found", 404);
        var isDbAdmin = isAdmin || await db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.Role.Name == RoleNames.Admin, ct);
        if (!isDbAdmin && review.UserId != userId) throw new AppException("FORBIDDEN", "Not allowed", 403);
        var gameId = review.GameId;

        // Cascade delete child replies if this is a parent review
        var childReplies = await db.Reviews.Where(r => r.ParentId == reviewId).ToListAsync(ct);
        if (childReplies.Count != 0)
        {
            db.Reviews.RemoveRange(childReplies);
        }

        db.Reviews.Remove(review);
        await db.SaveChangesAsync(ct);
        await RecalcRating(gameId, ct);
    }

    private async Task RecalcRating(Guid gameId, CancellationToken ct)
    {
        var game = await db.Games.FindAsync([gameId], ct);
        if (game is null) return;

        var ratings = await db.Reviews
            .Where(r => r.GameId == gameId && r.IsApproved && r.ParentId == null)
            .Select(r => r.Rating)
            .ToListAsync(ct);

        var ratedReviews = ratings.Where(r => r.HasValue).Select(r => (int)r!.Value).ToList();
        game.AvgRating = ratedReviews.Any() ? (decimal)ratedReviews.Average() : 0;
        game.ReviewCount = ratedReviews.Count;
        await db.SaveChangesAsync(ct);
    }
}

public class WishlistService(AppDbContext db) : IWishlistService
{
    public async Task<IReadOnlyList<GameListDto>> GetAsync(Guid userId, CancellationToken ct = default)
    {
        var games = await db.Wishlists.AsNoTracking()
            .Include(w => w.Game).ThenInclude(g => g.GameCategories).ThenInclude(gc => gc.Category)
            .Include(w => w.Game).ThenInclude(g => g.Images)
            .Include(w => w.Game).ThenInclude(g => g.UnityDemo)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.AddedAt)
            .Select(w => w.Game).ToListAsync(ct);
        return games.Select(g => GameService.MapList(g, "vi")).ToList();
    }

    public async Task AddAsync(Guid userId, Guid gameId, CancellationToken ct = default)
    {
        if (await db.Wishlists.AnyAsync(w => w.UserId == userId && w.GameId == gameId, ct)) return;
        db.Wishlists.Add(new Wishlist { UserId = userId, GameId = gameId });
        await db.SaveChangesAsync(ct);
    }

    public async Task RemoveAsync(Guid userId, Guid gameId, CancellationToken ct = default)
    {
        var item = await db.Wishlists.FindAsync([userId, gameId], ct);
        if (item is null) return;
        db.Wishlists.Remove(item);
        await db.SaveChangesAsync(ct);
    }
}
