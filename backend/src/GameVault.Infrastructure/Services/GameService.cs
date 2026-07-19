using GameVault.Application.Common;
using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Domain.Enums;
using GameVault.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GameVault.Infrastructure.Services;

public class GameService(AppDbContext db) : IGameService
{
    public async Task<PagedResult<GameListDto>> GetGamesAsync(GameFilterRequest f, string locale = "vi", CancellationToken ct = default)
    {
        var targetStatus = f.Status ?? GameStatus.Published;
        var q = db.Games.AsNoTracking()
            .Include(g => g.GameCategories).ThenInclude(gc => gc.Category)
            .Include(g => g.Images)
            .Include(g => g.GameTags).ThenInclude(gt => gt.Tag)
            .Include(g => g.UnityDemo)
            .Where(g => g.Status == targetStatus);

        if (!string.IsNullOrWhiteSpace(f.Q))
        {
            var term = f.Q.Trim().ToLower();
            q = q.Where(g => g.Title.ToLower().Contains(term) || g.ShortDescription.ToLower().Contains(term)
                || g.Developer.ToLower().Contains(term));
        }
        if (f.CategoryId.HasValue) q = q.Where(g => g.GameCategories.Any(gc => gc.CategoryId == f.CategoryId));
        if (!string.IsNullOrWhiteSpace(f.Tag)) q = q.Where(g => g.GameTags.Any(gt => gt.Tag.Slug == f.Tag));
        if (f.MinPrice.HasValue) q = q.Where(g => (g.DiscountPrice ?? g.Price) >= f.MinPrice);
        if (f.MaxPrice.HasValue) q = q.Where(g => (g.DiscountPrice ?? g.Price) <= f.MaxPrice);
        if (f.MaxMinAge.HasValue) q = q.Where(g => g.MinAge <= f.MaxMinAge);
        if (f.MinRating.HasValue) q = q.Where(g => g.AvgRating <= f.MinRating);
        if (f.Featured == true) q = q.Where(g => g.IsFeatured);
        if (f.HasDemo == true) q = q.Where(g => g.UnityDemo != null && g.UnityDemo.IsActive);
        if (f.Discounted == true) q = q.Where(g => g.DiscountPrice.HasValue && g.DiscountPrice < g.Price);

        q = f.Sort switch
        {
            "price_asc" => q.OrderBy(g => g.DiscountPrice ?? g.Price),
            "price_desc" => q.OrderByDescending(g => g.DiscountPrice ?? g.Price),
            "rating" => q.OrderByDescending(g => g.AvgRating),
            "title" => q.OrderBy(g => g.Title),
            _ => q.OrderByDescending(g => g.PublishedAt ?? g.CreatedAt)
        };

        var total = await q.CountAsync(ct);
        var items = await q.Skip((f.Page - 1) * f.PageSize).Take(f.PageSize).ToListAsync(ct);
        return new PagedResult<GameListDto>
        {
            Items = items.Select(x => MapList(x, locale)).ToList(),
            Page = f.Page,
            PageSize = f.PageSize,
            Total = total
        };
    }

    public async Task<GameDetailDto?> GetBySlugAsync(string slug, Guid? userId, string locale = "vi", CancellationToken ct = default)
    {
        var game = await db.Games.AsNoTracking()
            .Include(g => g.GameCategories).ThenInclude(gc => gc.Category)
            .Include(g => g.Images)
            .Include(g => g.Videos)
            .Include(g => g.UnityDemo)
            .Include(g => g.GameTags).ThenInclude(gt => gt.Tag)
            .FirstOrDefaultAsync(g => g.Slug == slug && (g.Status == GameStatus.Published || g.Status == GameStatus.Archived), ct);
        if (game is null) return null;

        var owned = userId.HasValue && await db.UserGames.AnyAsync(ug => ug.UserId == userId && ug.GameId == game.Id, ct);
        var wished = userId.HasValue && await db.Wishlists.AnyAsync(w => w.UserId == userId && w.GameId == game.Id, ct);
        return MapDetail(game, owned, wished, locale);
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
        => await db.Categories.AsNoTracking().Where(c => c.IsActive).OrderBy(c => c.SortOrder)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Slug)).ToListAsync(ct);

    public async Task<IReadOnlyList<TagDto>> GetTagsAsync(CancellationToken ct = default)
        => await db.Tags.AsNoTracking().OrderBy(t => t.Name)
            .Select(t => new TagDto(t.Id, t.Name, t.Slug)).ToListAsync(ct);

    public static GameListDto MapList(Domain.Entities.Game g, string locale = "vi")
    {
        var title = locale == "en" && !string.IsNullOrEmpty(g.TitleEn) ? g.TitleEn : g.Title;
        var shortDesc = locale == "en" && !string.IsNullOrEmpty(g.ShortDescriptionEn) ? g.ShortDescriptionEn : g.ShortDescription;
        
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
        var title = locale == "en" && !string.IsNullOrEmpty(g.TitleEn) ? g.TitleEn : g.Title;
        var desc = locale == "en" && !string.IsNullOrEmpty(g.DescriptionEn) ? g.DescriptionEn : g.Description;
        var shortDesc = locale == "en" && !string.IsNullOrEmpty(g.ShortDescriptionEn) ? g.ShortDescriptionEn : g.ShortDescription;
        
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
            g.TitleEn, g.DescriptionEn, g.ShortDescriptionEn, g.Status, g.IsFeatured);
    }
}
