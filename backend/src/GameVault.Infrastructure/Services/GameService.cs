using GameVault.Application.Common;
using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Domain.Enums;
using GameVault.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GameVault.Infrastructure.Services;

public class GameService(AppDbContext db, ICacheService cache) : IGameService
{
    public async Task<PagedResult<GameListDto>> GetGamesAsync(GameFilterRequest f, string locale = "vi", CancellationToken ct = default)
    {
        var targetStatus = f.Status ?? GameStatus.Published;
        var hasSearchText = !string.IsNullOrWhiteSpace(f.Q);

        // Cache browse/popular queries that don't have custom search text
        if (!hasSearchText)
        {
            var v = cache.GetGamesVersion();
            var cacheKey = $"games:v{v}:{locale}:{targetStatus}:{f.CategoryId}:{f.Tag}:{f.MinPrice}:{f.MaxPrice}:{f.MaxMinAge}:{f.MinRating}:{f.Featured}:{f.HasDemo}:{f.Discounted}:{f.Sort}:{f.Page}:{f.PageSize}";
            var cached = cache.Get<PagedResult<GameListDto>>(cacheKey);
            if (cached is not null)
            {
                return cached;
            }
        }

        // 1. Lightweight count query without heavy includes
        var countQ = db.Games.AsNoTracking().Where(g => g.Status == targetStatus);

        if (hasSearchText)
        {
            var term = f.Q!.Trim();
            countQ = countQ.Where(g => EF.Functions.Like(g.Title, $"%{term}%") 
                || EF.Functions.Like(g.ShortDescription, $"%{term}%")
                || EF.Functions.Like(g.Developer, $"%{term}%"));
        }
        if (f.CategoryId.HasValue) countQ = countQ.Where(g => g.GameCategories.Any(gc => gc.CategoryId == f.CategoryId));
        if (!string.IsNullOrWhiteSpace(f.Tag)) countQ = countQ.Where(g => g.GameTags.Any(gt => gt.Tag.Slug == f.Tag));
        if (f.MinPrice.HasValue) countQ = countQ.Where(g => (g.DiscountPrice ?? g.Price) >= f.MinPrice);
        if (f.MaxPrice.HasValue) countQ = countQ.Where(g => (g.DiscountPrice ?? g.Price) <= f.MaxPrice);
        if (f.MaxMinAge.HasValue) countQ = countQ.Where(g => g.MinAge <= f.MaxMinAge);
        if (f.MinRating.HasValue) countQ = countQ.Where(g => g.AvgRating >= f.MinRating);
        if (f.Featured == true) countQ = countQ.Where(g => g.IsFeatured);
        if (f.HasDemo == true) countQ = countQ.Where(g => g.UnityDemo != null && g.UnityDemo.IsActive);
        if (f.Discounted == true) countQ = countQ.Where(g => g.DiscountPrice.HasValue && g.DiscountPrice < g.Price);

        var total = await countQ.CountAsync(ct);

        // 2. Fetch page items with navigation properties using split query
        var itemsQ = countQ
            .Include(g => g.GameCategories).ThenInclude(gc => gc.Category)
            .Include(g => g.Images)
            .Include(g => g.GameTags).ThenInclude(gt => gt.Tag)
            .Include(g => g.UnityDemo)
            .AsSplitQuery();

        itemsQ = f.Sort switch
        {
            "price_asc" => itemsQ.OrderBy(g => g.DiscountPrice ?? g.Price),
            "price_desc" => itemsQ.OrderByDescending(g => g.DiscountPrice ?? g.Price),
            "rating" => itemsQ.OrderByDescending(g => g.AvgRating),
            "title" => itemsQ.OrderBy(g => g.Title),
            _ => itemsQ.OrderByDescending(g => g.PublishedAt ?? g.CreatedAt)
        };

        var items = await itemsQ.Skip((f.Page - 1) * f.PageSize).Take(f.PageSize).ToListAsync(ct);
        var result = new PagedResult<GameListDto>
        {
            Items = items.Select(x => MapList(x, locale)).ToList(),
            Page = f.Page,
            PageSize = f.PageSize,
            Total = total
        };

        if (!hasSearchText)
        {
            var v = cache.GetGamesVersion();
            var cacheKey = $"games:v{v}:{locale}:{targetStatus}:{f.CategoryId}:{f.Tag}:{f.MinPrice}:{f.MaxPrice}:{f.MaxMinAge}:{f.MinRating}:{f.Featured}:{f.HasDemo}:{f.Discounted}:{f.Sort}:{f.Page}:{f.PageSize}";
            cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
        }

        return result;
    }

    public async Task<GameDetailDto?> GetBySlugAsync(string slug, Guid? userId, string locale = "vi", CancellationToken ct = default)
    {
        var v = cache.GetGamesVersion();
        var cacheKey = $"game:v{v}:{slug}:{NormalizeLocale(locale)}";

        var baseDetail = await cache.GetOrCreateAsync(cacheKey, async () =>
        {
            var game = await db.Games.AsNoTracking()
                .Include(g => g.GameCategories).ThenInclude(gc => gc.Category)
                .Include(g => g.Images)
                .Include(g => g.Videos)
                .Include(g => g.Files)
                .Include(g => g.UnityDemo)
                .Include(g => g.GameTags).ThenInclude(gt => gt.Tag)
                .AsSplitQuery()
                .FirstOrDefaultAsync(g => g.Slug == slug && (g.Status == GameStatus.Published || g.Status == GameStatus.Archived), ct);

            return game is null ? null : MapDetail(game, false, false, locale);
        }, TimeSpan.FromMinutes(5));

        if (baseDetail is null) return null;
        if (!userId.HasValue) return baseDetail;

        // Fast user-specific checks (indexed queries)
        var owned = await db.UserGames.AnyAsync(ug => ug.UserId == userId.Value && ug.GameId == baseDetail.Id, ct)
            || await db.UserRoles.AnyAsync(ur => ur.UserId == userId.Value && ur.Role.Name == RoleNames.Admin, ct);
        var wished = await db.Wishlists.AnyAsync(w => w.UserId == userId.Value && w.GameId == baseDetail.Id, ct);

        return baseDetail with { IsOwned = owned, IsWishlisted = wished };
    }

    public async Task<Guid> IncrementDemoPlayAsync(string slug, Guid? userId, CancellationToken ct = default)
    {
        var game = await db.Games.FirstOrDefaultAsync(g => g.Slug == slug, ct);
        if (game is null) throw new Application.Common.AppException("GAME_NOT_FOUND", "Game not found", 404);
        game.DemoPlayCount++;

        var history = new Domain.Entities.DemoPlayHistory
        {
            GameId = game.Id,
            UserId = userId,
            PlayedAt = DateTime.UtcNow
        };
        db.DemoPlayHistories.Add(history);

        await db.SaveChangesAsync(ct);
        return history.Id;
    }

    public async Task UpdateDemoPlayDurationAsync(Guid historyId, int durationSeconds, CancellationToken ct = default)
    {
        var history = await db.DemoPlayHistories.FirstOrDefaultAsync(h => h.Id == historyId, ct);
        if (history is null) return;
        history.PlayDurationSeconds = durationSeconds;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        return await cache.GetOrCreateAsync("categories:all", async () =>
        {
            return await db.Categories.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.SortOrder)
                .Select(c => new CategoryDto(c.Id, c.Name, c.Slug)).ToListAsync(ct);
        }, TimeSpan.FromHours(1)) ?? [];
    }

    public async Task<IReadOnlyList<TagDto>> GetTagsAsync(CancellationToken ct = default)
    {
        return await cache.GetOrCreateAsync("tags:all", async () =>
        {
            return await db.Tags.AsNoTracking().OrderBy(t => t.Name)
                .Select(t => new TagDto(t.Id, t.Name, t.Slug)).ToListAsync(ct);
        }, TimeSpan.FromHours(1)) ?? [];
    }

    private static string NormalizeLocale(string? locale)
    {
        if (string.IsNullOrWhiteSpace(locale)) return "vi";
        locale = locale.Trim().ToLowerInvariant();
        if (locale.StartsWith("zh")) return "zh";
        if (locale.StartsWith("en")) return "en";
        return "vi";
    }

    public static GameListDto MapList(Domain.Entities.Game g, string locale = "vi")
    {
        locale = NormalizeLocale(locale);
        var title = locale == "zh" && !string.IsNullOrEmpty(g.TitleZh) ? g.TitleZh : (locale == "en" && !string.IsNullOrEmpty(g.TitleEn) ? g.TitleEn : g.Title);
        var shortDesc = locale == "zh" && !string.IsNullOrEmpty(g.ShortDescriptionZh) ? g.ShortDescriptionZh : (locale == "en" && !string.IsNullOrEmpty(g.ShortDescriptionEn) ? g.ShortDescriptionEn : g.ShortDescription);
        
        var primaryImage = g.Images.Where(i => i.Locale == null || i.Locale == locale)
                                   .OrderBy(i => i.SortOrder)
                                   .FirstOrDefault(i => i.IsPrimary)?.Url
                           ?? g.Images.Where(i => i.Locale == null || i.Locale == locale)
                                     .OrderBy(i => i.SortOrder)
                                     .FirstOrDefault()?.Url;
        
        return new GameListDto(
            g.Id, title, g.Slug, shortDesc,
            g.Price, g.DiscountPrice, g.Currency,
            g.AvgRating, g.ReviewCount, g.IsFeatured,
            primaryImage, string.Join(", ", g.GameCategories.Select(gc => gc.Category.Name)), g.MinAge, g.DownloadCount,
            g.UnityDemo is { IsActive: true });
    }

    public static GameDetailDto MapDetail(Domain.Entities.Game g, bool owned, bool wished, string locale = "vi")
    {
        locale = NormalizeLocale(locale);
        var title = locale == "zh" && !string.IsNullOrEmpty(g.TitleZh) ? g.TitleZh : (locale == "en" && !string.IsNullOrEmpty(g.TitleEn) ? g.TitleEn : g.Title);
        var desc = locale == "zh" && !string.IsNullOrEmpty(g.DescriptionZh) ? g.DescriptionZh : (locale == "en" && !string.IsNullOrEmpty(g.DescriptionEn) ? g.DescriptionEn : g.Description);
        var shortDesc = locale == "zh" && !string.IsNullOrEmpty(g.ShortDescriptionZh) ? g.ShortDescriptionZh : (locale == "en" && !string.IsNullOrEmpty(g.ShortDescriptionEn) ? g.ShortDescriptionEn : g.ShortDescription);
        
        var images = g.Images.Where(i => i.Locale == null || i.Locale == locale)
                             .OrderByDescending(i => i.IsPrimary)
                             .ThenBy(i => i.SortOrder)
                             .Select(i => new GameImageDto(i.Id, i.Url, i.Caption, i.IsPrimary))
                             .ToList();
        
        return new GameDetailDto(
            g.Id, title, g.Slug, desc, shortDesc,
            g.Developer, g.Publisher, g.ReleaseDate,
            g.Price, g.DiscountPrice, g.Currency, g.MinAge,
            g.AvgRating, g.ReviewCount, g.DemoPlayCount, g.DownloadCount,
            g.SystemRequirements, string.Join(", ", g.GameCategories.Select(gc => gc.Category.Name)),
            g.GameTags.Select(gt => gt.Tag.Name).ToList(),
            images,
            g.Videos.OrderBy(v => v.SortOrder).Select(v => new GameVideoDto(v.Id, v.Url, v.Title, v.ThumbnailUrl)).ToList(),
            g.UnityDemo is { IsActive: true } d ? new UnityDemoDto(d.Id, d.BuildUrl, d.BuildPath) : null,
            owned, wished,
            g.TitleEn, g.DescriptionEn, g.ShortDescriptionEn,
            g.TitleZh, g.DescriptionZh, g.ShortDescriptionZh,
            g.Status, g.IsFeatured,
            g.Files != null && g.Files.Count > 0);
    }
}
