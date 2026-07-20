using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Domain.Entities;
using GameVault.Domain.Enums;
using GameVault.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GameVault.Infrastructure.Services;

public class NotificationService(AppDbContext db) : INotificationService
{
    public async Task<IReadOnlyList<NotificationDto>> GetAsync(Guid userId, CancellationToken ct = default)
        => await db.Notifications.AsNoTracking().Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).Take(50)
            .Select(n => new NotificationDto(n.Id, n.Type, n.Title, n.Message, n.IsRead, n.CreatedAt, n.RelatedEntityType, n.RelatedEntityId, n.Metadata)).ToListAsync(ct);

    public async Task MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId, ct);
        if (n is null) return;
        n.IsRead = true;
        n.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task CreateAsync(Guid userId, string type, string title, string message, Guid? relatedId = null, string? relatedType = null, string? metadata = null, CancellationToken ct = default)
    {
        db.Notifications.Add(new Notification
        {
            UserId = userId, Type = type, Title = title, Message = message,
            RelatedEntityId = relatedId, RelatedEntityType = relatedType ?? (relatedId.HasValue ? "Order" : null),
            Metadata = metadata
        });
        await db.SaveChangesAsync(ct);
    }

    public async Task ClearAllAsync(Guid userId, CancellationToken ct = default)
    {
        var userNotifications = await db.Notifications.Where(n => n.UserId == userId).ToListAsync(ct);
        db.Notifications.RemoveRange(userNotifications);
        await db.SaveChangesAsync(ct);
    }
}

public class AdminService(AppDbContext db, IEmailService email) : IAdminService
{
    public async Task<GameDetailDto> CreateGameAsync(CreateGameRequest request, CancellationToken ct = default)
    {
        var game = new Game
        {
            Title = request.Title, Slug = request.Slug, Description = request.Description,
            ShortDescription = request.ShortDescription,
            TitleEn = request.TitleEn, DescriptionEn = request.DescriptionEn, ShortDescriptionEn = request.ShortDescriptionEn,
            Developer = request.Developer, Publisher = request.Publisher, ReleaseDate = request.ReleaseDate,
            Price = request.Price, DiscountPrice = request.DiscountPrice, MinAge = request.MinAge,
            IsFeatured = request.IsFeatured, SystemRequirements = request.SystemRequirements,
            Status = request.Status ?? GameStatus.Draft,
            PublishedAt = (request.Status == GameStatus.Published) ? DateTime.UtcNow : null
        };
        if (request.CategoryIds is not null)
            foreach (var catId in request.CategoryIds)
                game.GameCategories.Add(new GameCategory { CategoryId = catId });
        if (request.TagIds is not null)
            foreach (var tagId in request.TagIds)
                game.GameTags.Add(new GameTag { TagId = tagId });
        db.Games.Add(game);
        await db.SaveChangesAsync(ct);
        var loaded = await db.Games.Include(g => g.GameCategories).ThenInclude(gc => gc.Category).Include(g => g.Images).Include(g => g.Videos)
            .Include(g => g.UnityDemo).Include(g => g.GameTags).ThenInclude(gt => gt.Tag)
            .FirstAsync(g => g.Id == game.Id, ct);
        return GameService.MapDetail(loaded, false, false, "vi");
    }

    public async Task<GameDetailDto> UpdateGameAsync(Guid id, UpdateGameRequest request, CancellationToken ct = default)
    {
        var game = await db.Games.Include(g => g.GameTags).Include(g => g.GameCategories).FirstOrDefaultAsync(g => g.Id == id, ct)
            ?? throw new Application.Common.AppException("GAME_NOT_FOUND", "Game not found", 404);

        // Price comparison logic for discount notifications
        var oldActivePrice = game.DiscountPrice ?? game.Price;
        var newActivePrice = request.DiscountPrice ?? request.Price;
        bool isDiscounted = newActivePrice < oldActivePrice;

        game.Title = request.Title; game.Description = request.Description;
        game.ShortDescription = request.ShortDescription;
        game.TitleEn = request.TitleEn; game.DescriptionEn = request.DescriptionEn;
        game.ShortDescriptionEn = request.ShortDescriptionEn;
        game.Developer = request.Developer; game.Publisher = request.Publisher;
        game.ReleaseDate = request.ReleaseDate; game.Price = request.Price;
        game.DiscountPrice = request.DiscountPrice; game.MinAge = request.MinAge;
        game.IsFeatured = request.IsFeatured; game.Status = request.Status;
        game.SystemRequirements = request.SystemRequirements; game.UpdatedAt = DateTime.UtcNow;

        if (request.CategoryIds is not null)
        {
            game.GameCategories.Clear();
            foreach (var catId in request.CategoryIds) game.GameCategories.Add(new GameCategory { CategoryId = catId });
        }
        if (request.TagIds is not null)
        {
            game.GameTags.Clear();
            foreach (var tagId in request.TagIds) game.GameTags.Add(new GameTag { TagId = tagId });
        }

        // If discounted, notify wishlisted users
        if (isDiscounted)
        {
            var wishlistedUsers = await db.Wishlists
                .AsNoTracking()
                .Where(w => w.GameId == id)
                .Select(w => w.UserId)
                .ToListAsync(ct);

            string formattedPrice = newActivePrice.ToString("N0") + " VND";
            foreach (var userId in wishlistedUsers)
            {
                db.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Type = NotificationType.Promo,
                    Title = "Game trong danh sách ước đang giảm giá! / Game in Wishlist is Discounted!",
                    Message = $"Tựa game '{game.Title}' mà bạn quan tâm hiện đang giảm giá chỉ còn {formattedPrice}! / The game '{game.Title}' you are interested in is now discounted to {formattedPrice}!",
                    RelatedEntityId = id,
                    RelatedEntityType = "Game"
                });
            }
        }

        await db.SaveChangesAsync(ct);
        var loaded = await db.Games.Include(g => g.GameCategories).ThenInclude(gc => gc.Category).Include(g => g.Images).Include(g => g.Videos)
            .Include(g => g.UnityDemo).Include(g => g.GameTags).ThenInclude(gt => gt.Tag)
            .FirstAsync(g => g.Id == id, ct);
        return GameService.MapDetail(loaded, false, false, "vi");
    }

    public async Task DeleteGameAsync(Guid id, CancellationToken ct = default)
    {
        var game = await db.Games
            .Include(g => g.GameTags)
            .Include(g => g.GameCategories)
            .Include(g => g.Images)
            .Include(g => g.Videos)
            .Include(g => g.Files)
            .Include(g => g.UnityDemo)
            .Include(g => g.Reviews)
            .Include(g => g.Wishlists)
            .Include(g => g.OrderItems)
            .Include(g => g.UserGames)
            .FirstOrDefaultAsync(g => g.Id == id, ct)
            ?? throw new Application.Common.AppException("GAME_NOT_FOUND", "Game not found", 404);

        // Fetch owners and wishlist users before deleting related entities
        var owners = await db.UserGames
            .AsNoTracking()
            .Where(ug => ug.GameId == id)
            .Select(ug => ug.UserId)
            .ToListAsync(ct);

        var wishlists = await db.Wishlists
            .AsNoTracking()
            .Where(w => w.GameId == id)
            .Select(w => w.UserId)
            .ToListAsync(ct);

        // Notify owners
        foreach (var userId in owners)
        {
            db.Notifications.Add(new Notification
            {
                UserId = userId,
                Type = NotificationType.System,
                Title = "Game đã bị gỡ khỏi cửa hàng / Game removed from store",
                Message = $"Tựa game '{game.Title}' bạn sở hữu đã bị gỡ khỏi cửa hàng GameVault. / The game '{game.Title}' you own has been removed from the GameVault store.",
                RelatedEntityId = null,
                RelatedEntityType = "System"
            });
        }

        // Notify wishlisted users
        foreach (var userId in wishlists)
        {
            db.Notifications.Add(new Notification
            {
                UserId = userId,
                Type = NotificationType.System,
                Title = "Game trong danh sách ước đã bị gỡ / Wishlisted game removed",
                Message = $"Tựa game '{game.Title}' trong danh sách ước của bạn đã bị gỡ khỏi cửa hàng GameVault. / The game '{game.Title}' in your wishlist has been removed from the GameVault store.",
                RelatedEntityId = null,
                RelatedEntityType = "System"
            });
        }

        // Xóa tất cả thực thể liên kết trong DB trước
        db.GameTags.RemoveRange(game.GameTags);
        db.GameCategories.RemoveRange(game.GameCategories);
        db.GameImages.RemoveRange(game.Images);
        db.GameVideos.RemoveRange(game.Videos);
        db.GameFiles.RemoveRange(game.Files);
        if (game.UnityDemo != null)
        {
            db.UnityDemos.Remove(game.UnityDemo);
        }
        db.Reviews.RemoveRange(game.Reviews);
        db.Wishlists.RemoveRange(game.Wishlists);
        db.OrderItems.RemoveRange(game.OrderItems);
        db.UserGames.RemoveRange(game.UserGames);

        // Xóa game chính
        db.Games.Remove(game);
        await db.SaveChangesAsync(ct);

        // Xóa thư mục chứa tệp vật lý của game trong wwwroot
        var gameFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "games", id.ToString());
        if (Directory.Exists(gameFolder))
        {
            try
            {
                Directory.Delete(gameFolder, recursive: true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to delete physical game folder: {ex.Message}");
            }
        }
    }

    public async Task PublishGameAsync(Guid id, CancellationToken ct = default)
    {
        var game = await db.Games.FindAsync([id], ct) ?? throw new Application.Common.AppException("GAME_NOT_FOUND", "Game not found", 404);
        game.Status = GameStatus.Published;
        game.PublishedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }



    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var revenue = await db.Orders.Where(o => o.Status == OrderStatus.Paid).SumAsync(o => o.TotalAmount, ct);
        var orders = await db.Orders.CountAsync(o => o.Status == OrderStatus.Paid, ct);
        var users = await db.Users.CountAsync(ct);
        var games = await db.Games.CountAsync(g => g.Status == GameStatus.Published, ct);
        var downloads = await db.Games.SumAsync(g => g.DownloadCount, ct);
        var demos = await db.Games.SumAsync(g => g.DemoPlayCount, ct);
        var top = await db.Games.OrderByDescending(g => g.DownloadCount).Take(5)
            .Select(g => new TopGameDto(g.Id, g.Title, g.DownloadCount, 0)).ToListAsync(ct);
        var recentDemos = await db.DemoPlayHistories.AsNoTracking()
            .Include(d => d.Game)
            .Include(d => d.User)
            .OrderByDescending(d => d.PlayedAt)
            .Take(20)
            .Select(d => new DemoPlayHistoryDto(
                d.Id,
                d.Game.Title,
                d.User != null ? d.User.FullName : null,
                d.User != null ? d.User.Email : null,
                d.PlayedAt,
                d.PlayDurationSeconds
            ))
            .ToListAsync(ct);
        return new AdminStatsDto(revenue, orders, users, games, downloads, demos, top, recentDemos);
    }

    public async Task ResetDataAsync(CancellationToken ct = default)
    {
        db.DemoPlayHistories.RemoveRange(db.DemoPlayHistories);
        db.AIChatHistories.RemoveRange(db.AIChatHistories);
        db.Notifications.RemoveRange(db.Notifications);
        db.UserGames.RemoveRange(db.UserGames);
        db.Payments.RemoveRange(db.Payments);
        db.OrderItems.RemoveRange(db.OrderItems);
        db.Orders.RemoveRange(db.Orders);
        db.Wishlists.RemoveRange(db.Wishlists);
        db.Reviews.RemoveRange(db.Reviews);
        db.UnityDemos.RemoveRange(db.UnityDemos);
        db.GameFiles.RemoveRange(db.GameFiles);
        db.GameVideos.RemoveRange(db.GameVideos);
        db.GameImages.RemoveRange(db.GameImages);
        db.GameTags.RemoveRange(db.GameTags);
        db.GameCategories.RemoveRange(db.GameCategories);
        db.Games.RemoveRange(db.Games);
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<AdminOrderDto>> GetAdminOrdersAsync(CancellationToken ct = default)
    {
        return await db.Orders.AsNoTracking()
            .Include(o => o.User)
            .Include(o => o.Items).ThenInclude(i => i.Game)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new AdminOrderDto(
                o.Id,
                o.OrderCode,
                o.User.Email,
                o.User.FullName,
                o.TotalAmount,
                o.Status,
                o.CreatedAt,
                o.Items.Select(i => new AdminOrderItemDto(i.Game.Title, i.UnitPrice, i.LineTotal)).ToList(),
                o.CancelReason,
                o.AdminNote
            ))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<AdminUserDto>> GetAdminUsersAsync(CancellationToken ct = default)
    {
        return await db.Users.AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserDto(
                u.Id,
                u.Email,
                u.FullName,
                u.DateOfBirth,
                u.CreatedAt,
                u.IsActive,
                u.UserRoles.Select(ur => ur.Role.Name).ToList()
            ))
            .ToListAsync(ct);
    }

    public async Task ToggleUserActiveAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct) ?? throw new Application.Common.AppException("USER_NOT_FOUND", "User not found", 404);
        user.IsActive = !user.IsActive;
        await db.SaveChangesAsync(ct);
    }

    public async Task<AdminRevenueDto> GetRevenueDetailsAsync(CancellationToken ct = default)
    {
        var paidOrders = await db.Orders.AsNoTracking()
            .Include(o => o.Items).ThenInclude(i => i.Game)
            .Where(o => o.Status == OrderStatus.Paid)
            .ToListAsync(ct);

        var totalRevenue = paidOrders.Sum(o => o.TotalAmount);

        var dailyRevenue = paidOrders
            .GroupBy(o => (o.CompletedAt ?? o.CreatedAt).Date)
            .OrderBy(g => g.Key)
            .Select(g => new RevenuePointDto(g.Key.ToString("yyyy-MM-dd"), g.Sum(o => o.TotalAmount)))
            .ToList();

        var monthlyRevenue = paidOrders
            .GroupBy(o => new DateTime((o.CompletedAt ?? o.CreatedAt).Year, (o.CompletedAt ?? o.CreatedAt).Month, 1))
            .OrderBy(g => g.Key)
            .Select(g => new RevenuePointDto(g.Key.ToString("yyyy-MM"), g.Sum(o => o.TotalAmount)))
            .ToList();

        var gameRevenueDict = new Dictionary<string, decimal>();
        foreach (var order in paidOrders)
        {
            foreach (var item in order.Items)
            {
                var title = item.Game?.Title ?? "Unknown Game";
                if (!gameRevenueDict.ContainsKey(title)) gameRevenueDict[title] = 0;
                gameRevenueDict[title] += item.LineTotal;
            }
        }
        var gameRevenue = gameRevenueDict
            .Select(kv => new GameRevenueDto(kv.Key, kv.Value))
            .OrderByDescending(x => x.Amount)
            .ToList();

        return new AdminRevenueDto(totalRevenue, dailyRevenue, monthlyRevenue, gameRevenue);
    }

    public async Task<IReadOnlyList<AdminGameListDto>> GetAdminGamesAsync(CancellationToken ct = default)
    {
        return await db.Games.AsNoTracking()
            .Include(g => g.GameCategories).ThenInclude(gc => gc.Category)
            .Include(g => g.Files)
            .Include(g => g.Wishlists)
            .Include(g => g.Images)
            .Include(g => g.UnityDemo)
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new AdminGameListDto(
                g.Id,
                g.Title,
                g.Slug,
                g.Price,
                g.Status,
                g.Files.Any(f => f.IsActive),
                g.DownloadCount,
                g.Wishlists.Count,
                g.AvgRating,
                g.ReviewCount,
                string.Join(", ", g.GameCategories.Select(gc => gc.Category.Name)),
                g.Images.Where(i => i.IsPrimary).Select(i => i.Url).FirstOrDefault()
                    ?? g.Images.Select(i => i.Url).FirstOrDefault(),
                g.DemoPlayCount,
                g.Images.Any(),
                g.Videos.Any(),
                g.UnityDemo != null && g.UnityDemo.IsActive
            ))
            .ToListAsync(ct);
    }

    public async Task CancelOrderAsync(Guid orderId, string? reason, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Items).Include(o => o.Payment).FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new Application.Common.AppException("ORDER_NOT_FOUND", "Order not found", 404);

        if (order.Status == OrderStatus.Cancelled)
            throw new Application.Common.AppException("ORDER_ALREADY_CANCELLED", "Order is already cancelled", 400);

        if (order.Status == OrderStatus.Paid)
        {
            var itemGameIds = order.Items.Select(oi => oi.GameId).ToList();
            var userGames = await db.UserGames.Where(ug => ug.UserId == order.UserId && itemGameIds.Contains(ug.GameId)).ToListAsync(ct);
            if (userGames.Count > 0)
            {
                db.UserGames.RemoveRange(userGames);
            }
        }

        order.Status = OrderStatus.Cancelled;
        order.CancelReason = reason;
        if (order.Payment is not null)
        {
            order.Payment.Status = PaymentStatus.Failed;
        }

        var msgVi = $"Đơn hàng {order.OrderCode} đã bị hủy bởi quản trị viên.{(string.IsNullOrWhiteSpace(reason) ? "" : $" Lý do: {reason}")}";
        var msgEn = $"Order {order.OrderCode} was cancelled by administrator.{(string.IsNullOrWhiteSpace(reason) ? "" : $" Reason: {reason}")}";
        var message = $"{msgVi} / {msgEn}";

        db.Notifications.Add(new Notification
        {
            UserId = order.UserId,
            Type = NotificationType.System,
            Title = "Đơn hàng bị hủy / Order Cancelled",
            Message = message,
            RelatedEntityId = order.Id,
            RelatedEntityType = "Order"
        });

        await db.SaveChangesAsync(ct);

        // Send order cancellation email
        try
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.UserId, ct);
            if (user != null)
            {
                var reasonHtml = string.IsNullOrWhiteSpace(reason)
                    ? "<p>Không có lý do cụ thể. / No specific reason provided.</p>"
                    : $"<p><strong>Lý do / Reason:</strong> {reason}</p>";

                _ = email.SendAsync(user.Email, $"Đơn hàng {order.OrderCode} đã bị hủy / Order #{order.OrderCode} Cancelled", $"""
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #ef4444, #f43f5e); padding: 32px 24px; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Đơn hàng đã bị hủy / Order Cancelled ❌</p>
                      </div>
                      <div style="padding: 32px 24px;">
                        <h2 style="color: #fda4af; margin: 0 0 16px;">Xin chào {user.FullName},</h2>
                        <p>Chúng tôi rất tiếc phải thông báo rằng đơn hàng <strong style="color:#a78bfa;">#{order.OrderCode}</strong> của bạn đã bị hủy bởi quản trị viên.</p>
                        <div style="background: #271a3c; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 4px;">
                          {reasonHtml}
                        </div>
                        <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với bộ phận hỗ trợ khách hàng. / If you have any questions, please contact customer support.</p>
                      </div>
                    </div>
                    """, ct);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send order cancellation email: {ex.Message}");
        }
    }

    public async Task ApproveCancellationAsync(Guid orderId, string? adminNote, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Items).Include(o => o.Payment).FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new Application.Common.AppException("ORDER_NOT_FOUND", "Order not found", 404);

        if (order.Status != OrderStatus.CancellationPending)
            throw new Application.Common.AppException("ORDER_NOT_PENDING_CANCELLATION", "Order is not pending cancellation", 400);

        // If the order was Paid, remove games from user's library
        var previousItems = order.Items.Select(oi => oi.GameId).ToList();
        var userGames = await db.UserGames.Where(ug => ug.UserId == order.UserId && previousItems.Contains(ug.GameId)).ToListAsync(ct);
        if (userGames.Count > 0)
        {
            db.UserGames.RemoveRange(userGames);
        }

        order.Status = OrderStatus.CancellationApproved;
        order.AdminNote = adminNote;
        order.UpdatedAt = DateTime.UtcNow;
        if (order.Payment is not null)
        {
            order.Payment.Status = PaymentStatus.Refunded;
        }

        // Notify the customer
        var noteText = string.IsNullOrWhiteSpace(adminNote) ? "" : $"\nLời nhắn từ Admin: {adminNote}";
        var msgVi = $"Yêu cầu hủy đơn hàng #{order.OrderCode} của bạn đã được xử lý thành công.{noteText}";
        var msgEn = $"Your cancellation request for order #{order.OrderCode} has been processed successfully.";

        db.Notifications.Add(new Notification
        {
            UserId = order.UserId,
            Type = NotificationType.CancellationApproved,
            Title = $"Đã xử lý yêu cầu hủy đơn #{order.OrderCode} / Cancellation Approved",
            Message = $"{msgVi} / {msgEn}",
            RelatedEntityId = order.Id,
            RelatedEntityType = "Order"
        });

        await db.SaveChangesAsync(ct);

        // Send order cancellation approval email
        try
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.UserId, ct);
            if (user != null)
            {
                var noteHtml = string.IsNullOrWhiteSpace(adminNote)
                    ? ""
                    : $"<div style=\"background: #1e293b; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 4px; color: #e2e8f0;\"><strong>Lời nhắn từ Admin / Admin Note:</strong> {adminNote}</div>";

                _ = email.SendAsync(user.Email, $"Yêu cầu hủy đơn {order.OrderCode} đã được duyệt / Order #{order.OrderCode} Cancellation Approved", $"""
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Yêu cầu hủy đơn hàng đã được duyệt / Cancellation Approved ✅</p>
                      </div>
                      <div style="padding: 32px 24px;">
                        <h2 style="color: #a7f3d0; margin: 0 0 16px;">Xin chào {user.FullName},</h2>
                        <p>Yêu cầu hủy đơn hàng và hoàn tiền cho đơn hàng <strong style="color:#a78bfa;">#{order.OrderCode}</strong> của bạn đã được phê duyệt thành công.</p>
                        {noteHtml}
                        <p>Các sản phẩm trong đơn hàng này đã được thu hồi và tiền thanh toán sẽ được hoàn trả lại cho bạn. Vui lòng kiểm tra tài khoản của mình. / The games in this order have been revoked and your payment will be refunded. Please check your account.</p>
                      </div>
                    </div>
                    """, ct);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send order cancellation approval email: {ex.Message}");
        }
    }

    public async Task RejectCancellationAsync(Guid orderId, string? adminNote, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Payment).FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new Application.Common.AppException("ORDER_NOT_FOUND", "Order not found", 404);

        if (order.Status != OrderStatus.CancellationPending)
            throw new Application.Common.AppException("ORDER_NOT_PENDING_CANCELLATION", "Order is not pending cancellation", 400);

        // Transition back to Paid or Pending based on payment status
        order.Status = (order.Payment != null && order.Payment.Status == PaymentStatus.Success) ? OrderStatus.Paid : OrderStatus.Pending;
        order.AdminNote = adminNote;
        order.UpdatedAt = DateTime.UtcNow;

        // Notify the customer
        var noteText = string.IsNullOrWhiteSpace(adminNote) ? "" : $"\nLời nhắn từ Admin: {adminNote}";
        var msgVi = $"Yêu cầu hủy đơn hàng #{order.OrderCode} của bạn đã bị từ chối.{noteText}";
        var msgEn = $"Your cancellation request for order #{order.OrderCode} has been rejected.";

        db.Notifications.Add(new Notification
        {
            UserId = order.UserId,
            Type = NotificationType.System,
            Title = $"Yêu cầu hủy đơn #{order.OrderCode} bị từ chối / Cancellation Request Rejected",
            Message = $"{msgVi} / {msgEn}",
            RelatedEntityId = order.Id,
            RelatedEntityType = "Order"
        });

        await db.SaveChangesAsync(ct);

        // Send order cancellation rejection email
        try
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.UserId, ct);
            if (user != null)
            {
                var noteHtml = string.IsNullOrWhiteSpace(adminNote)
                    ? ""
                    : $"<div style=\"background: #1e293b; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 4px; color: #e2e8f0;\"><strong>Lý do từ chối / Rejection Reason:</strong> {adminNote}</div>";

                _ = email.SendAsync(user.Email, $"Yêu cầu hủy đơn {order.OrderCode} bị từ chối / Order #{order.OrderCode} Cancellation Rejected", $"""
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 24px; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Yêu cầu hủy đơn hàng bị từ chối / Cancellation Rejected ❌</p>
                      </div>
                      <div style="padding: 32px 24px;">
                        <h2 style="color: #fca5a5; margin: 0 0 16px;">Xin chào {user.FullName},</h2>
                        <p>Yêu cầu hủy đơn hàng và hoàn tiền cho đơn hàng <strong style="color:#a78bfa;">#{order.OrderCode}</strong> của bạn đã bị từ chối.</p>
                        {noteHtml}
                        <p>Đơn hàng của bạn vẫn có hiệu lực và các tựa game vẫn nằm trong thư viện của bạn. / Your order remains valid and the games are still available in your library.</p>
                      </div>
                    </div>
                    """, ct);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send order cancellation rejection email: {ex.Message}");
        }
    }

    public async Task DeleteOrderAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Items).Include(o => o.Payment).FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new Application.Common.AppException("ORDER_NOT_FOUND", "Order not found", 404);

        var userGames = await db.UserGames.Where(ug => ug.OrderId == orderId).ToListAsync(ct);
        if (userGames.Count > 0)
        {
            db.UserGames.RemoveRange(userGames);
        }

        db.Orders.Remove(order);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
            .Include(u => u.Reviews)
            .Include(u => u.Wishlists)
            .Include(u => u.UserGames)
            .Include(u => u.AIChatHistories)
            .Include(u => u.Notifications)
            .Include(u => u.Orders)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new Application.Common.AppException("USER_NOT_FOUND", "User not found", 404);

        // Delete DemoPlayHistories related to this user
        var demoPlayHistories = await db.DemoPlayHistories.Where(d => d.UserId == userId).ToListAsync(ct);
        db.DemoPlayHistories.RemoveRange(demoPlayHistories);

        // Delete Orders, OrderItems, Payments related to this user
        var orderIds = user.Orders.Select(o => o.Id).ToList();
        if (orderIds.Count > 0)
        {
            var payments = await db.Payments.Where(p => orderIds.Contains(p.OrderId)).ToListAsync(ct);
            var orderItems = await db.OrderItems.Where(oi => orderIds.Contains(oi.OrderId)).ToListAsync(ct);
            db.Payments.RemoveRange(payments);
            db.OrderItems.RemoveRange(orderItems);
            db.Orders.RemoveRange(user.Orders);
        }

        // Delete other navigation entities
        db.UserRoles.RemoveRange(user.UserRoles);
        db.Reviews.RemoveRange(user.Reviews);
        db.Wishlists.RemoveRange(user.Wishlists);
        db.UserGames.RemoveRange(user.UserGames);
        db.AIChatHistories.RemoveRange(user.AIChatHistories);
        db.Notifications.RemoveRange(user.Notifications);

        // Finally, delete the User
        db.Users.Remove(user);

        await db.SaveChangesAsync(ct);
    }

    public async Task ResetDemoPlaysAsync(CancellationToken ct = default)
    {
        // Delete all DemoPlayHistories
        db.DemoPlayHistories.RemoveRange(db.DemoPlayHistories);

        // Reset DemoPlayCount to 0 for all games
        var games = await db.Games.ToListAsync(ct);
        foreach (var game in games)
        {
            game.DemoPlayCount = 0;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task<AdminAnalyticsDto> GetAnalyticsAsync(
        string? range, 
        DateTime? startDate, 
        DateTime? endDate, 
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        DateTime start;
        DateTime end;

        if (!string.IsNullOrEmpty(range))
        {
            switch (range.ToLower())
            {
                case "today":
                    start = now.Date;
                    end = now;
                    break;
                case "week":
                    var daysSinceMonday = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                    start = now.Date.AddDays(-daysSinceMonday);
                    end = now;
                    break;
                case "month":
                    start = new DateTime(now.Year, now.Month, 1);
                    end = now;
                    break;
                case "year":
                    start = new DateTime(now.Year, 1, 1);
                    end = now;
                    break;
                case "custom":
                    start = startDate ?? now.Date;
                    end = endDate ?? now;
                    break;
                default:
                    start = new DateTime(now.Year, now.Month, 1);
                    end = now;
                    break;
            }
        }
        else if (startDate.HasValue && endDate.HasValue)
        {
            start = startDate.Value;
            end = endDate.Value;
        }
        else
        {
            start = new DateTime(now.Year, now.Month, 1);
            end = now;
        }

        var duration = end - start;
        var prevStart = start - duration;
        var prevEnd = start;

        var selectedPeriod = await GetSummaryForRangeAsync(start, end, ct);
        var previousPeriod = await GetSummaryForRangeAsync(prevStart, prevEnd, ct);

        // Filter daily/weekly/monthly trends in range
        var dailyOrders = await db.Orders
            .AsNoTracking()
            .Where(o => o.Status == OrderStatus.Paid && (o.CompletedAt ?? o.CreatedAt) >= start && (o.CompletedAt ?? o.CreatedAt) <= end)
            .Select(o => new { Date = (o.CompletedAt ?? o.CreatedAt).Date, Amount = o.TotalAmount })
            .ToListAsync(ct);

        var dailyUserGames = await db.UserGames
            .AsNoTracking()
            .Where(ug => ug.AcquiredAt >= start && ug.AcquiredAt <= end)
            .Select(ug => ug.AcquiredAt.Date)
            .ToListAsync(ct);

        var dailyUsers = await db.Users
            .AsNoTracking()
            .Where(u => u.CreatedAt >= start && u.CreatedAt <= end)
            .Select(u => u.CreatedAt.Date)
            .ToListAsync(ct);

        var dailyDemos = await db.DemoPlayHistories
            .AsNoTracking()
            .Where(d => d.PlayedAt >= start && d.PlayedAt <= end)
            .Select(d => d.PlayedAt.Date)
            .ToListAsync(ct);

        var dailyTrend = new List<AnalyticsTrendPointDto>();
        var weeklyTrend = new List<AnalyticsTrendPointDto>();
        var monthlyTrend = new List<AnalyticsTrendPointDto>();

        if (duration.TotalDays <= 31)
        {
            var daysCount = (int)Math.Ceiling(duration.TotalDays);
            if (daysCount < 1) daysCount = 1;
            for (int i = daysCount; i >= 0; i--)
            {
                var date = end.Date.AddDays(-i);
                if (date < start.Date) continue;
                var dateStr = date.ToString("yyyy-MM-dd");
                var rev = dailyOrders.Where(o => o.Date == date).Sum(o => o.Amount);
                var dls = dailyUserGames.Count(d => d == date);
                var regs = dailyUsers.Count(d => d == date);
                var plays = dailyDemos.Count(d => d == date);
                dailyTrend.Add(new AnalyticsTrendPointDto(dateStr, rev, dls, regs, plays));
            }
        }
        else if (duration.TotalDays <= 365)
        {
            var weeksCount = (int)Math.Ceiling(duration.TotalDays / 7.0);
            for (int i = weeksCount; i >= 0; i--)
            {
                var monday = end.Date.AddDays(-((int)end.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7).AddDays(-i * 7);
                if (monday < start.Date.AddDays(-6)) continue;
                var nextMonday = monday.AddDays(7);
                var label = $"{monday:MM-dd} to {monday.AddDays(6):MM-dd}";

                var rev = dailyOrders.Where(o => o.Date >= monday && o.Date < nextMonday).Sum(o => o.Amount);
                var dls = dailyUserGames.Count(d => d >= monday && d < nextMonday);
                var regs = dailyUsers.Count(d => d >= monday && d < nextMonday);
                var plays = dailyDemos.Count(d => d >= monday && d < nextMonday);
                weeklyTrend.Add(new AnalyticsTrendPointDto(label, rev, dls, regs, plays));
            }
        }
        else
        {
            var monthsCount = (end.Year - start.Year) * 12 + end.Month - start.Month;
            for (int i = monthsCount; i >= 0; i--)
            {
                var firstOfMonth = new DateTime(end.Year, end.Month, 1).AddMonths(-i);
                if (firstOfMonth < new DateTime(start.Year, start.Month, 1)) continue;
                var firstOfNextMonth = firstOfMonth.AddMonths(1);
                var label = firstOfMonth.ToString("yyyy-MM");

                var rev = dailyOrders.Where(o => o.Date >= firstOfMonth && o.Date < firstOfNextMonth).Sum(o => o.Amount);
                var dlsCount = dailyUserGames.Count(d => d >= firstOfMonth && d < firstOfNextMonth);
                var regs = dailyUsers.Count(d => d >= firstOfMonth && d < firstOfNextMonth);
                var plays = dailyDemos.Count(d => d >= firstOfMonth && d < firstOfNextMonth);
                monthlyTrend.Add(new AnalyticsTrendPointDto(label, rev, dlsCount, regs, plays));
            }
        }

        // User Stats (calculated in period)
        var users = await db.Users.AsNoTracking().ToListAsync(ct);
        var userStatsList = new List<DetailedUserStatDto>();

        foreach (var u in users)
        {
            var purchasedCount = await db.UserGames
                .CountAsync(ug => ug.UserId == u.Id && ug.AcquiredAt >= start && ug.AcquiredAt <= end, ct);
            var spent = await db.Orders
                .Where(o => o.UserId == u.Id && o.Status == OrderStatus.Paid && (o.CompletedAt ?? o.CreatedAt) >= start && (o.CompletedAt ?? o.CreatedAt) <= end)
                .SumAsync(o => o.TotalAmount, ct);
            var demoPlaysCount = await db.DemoPlayHistories
                .CountAsync(d => d.UserId == u.Id && d.PlayedAt >= start && d.PlayedAt <= end, ct);

            string segment = "New";
            if (spent > 500000 || purchasedCount >= 3)
            {
                segment = "VIP";
            }
            else if (purchasedCount > 0)
            {
                segment = "Active";
            }
            else if (demoPlaysCount > 0)
            {
                segment = "Trial";
            }

            userStatsList.Add(new DetailedUserStatDto(u.Id, u.Email, u.FullName, u.CreatedAt, purchasedCount, spent, demoPlaysCount, segment));
        }
        userStatsList = userStatsList.OrderByDescending(us => us.TotalSpent).ThenByDescending(us => us.GamesPurchased).ToList();

        // Game Stats (calculated in period)
        var allGames = await db.Games.AsNoTracking().ToListAsync(ct);
        var gameStatsList = new List<DetailedGameStatDto>();

        foreach (var g in allGames)
        {
            var wishlistCount = await db.Wishlists
                .CountAsync(w => w.GameId == g.Id && w.AddedAt >= start && w.AddedAt <= end, ct);
            var totalRev = await db.OrderItems
                .Where(oi => oi.GameId == g.Id && oi.Order.Status == OrderStatus.Paid && (oi.Order.CompletedAt ?? oi.Order.CreatedAt) >= start && (oi.Order.CompletedAt ?? oi.Order.CreatedAt) <= end)
                .SumAsync(oi => oi.LineTotal, ct);
            var downloadsCount = await db.UserGames
                .CountAsync(ug => ug.GameId == g.Id && ug.AcquiredAt >= start && ug.AcquiredAt <= end, ct);
            var demoPlaysCount = await db.DemoPlayHistories
                .CountAsync(d => d.GameId == g.Id && d.PlayedAt >= start && d.PlayedAt <= end, ct);

            var demoUsersCount = await db.DemoPlayHistories
                .Where(d => d.GameId == g.Id && d.UserId != null && d.PlayedAt >= start && d.PlayedAt <= end)
                .Select(d => d.UserId)
                .Distinct()
                .CountAsync(ct);

            double playToPurchaseRate = 0;
            if (demoUsersCount > 0)
            {
                var convertedDemoUsers = await db.UserGames
                    .Where(ug => ug.GameId == g.Id && ug.AcquiredAt >= start && ug.AcquiredAt <= end && db.DemoPlayHistories.Any(d => d.GameId == g.Id && d.UserId == ug.UserId && d.PlayedAt >= start && d.PlayedAt <= end))
                    .Select(ug => ug.UserId)
                    .Distinct()
                    .CountAsync(ct);
                playToPurchaseRate = Math.Round((double)convertedDemoUsers / demoUsersCount * 100, 2);
            }

            gameStatsList.Add(new DetailedGameStatDto(
                g.Id,
                g.Title,
                g.Price,
                g.Status,
                downloadsCount,
                demoPlaysCount,
                wishlistCount,
                totalRev,
                playToPurchaseRate
            ));
        }
        gameStatsList = gameStatsList.OrderByDescending(gs => gs.TotalRevenue).ThenByDescending(gs => gs.Downloads).ToList();

        // Top Downloaded & Demo played in range
        var topDownloadedGames = gameStatsList
            .OrderByDescending(g => g.Downloads)
            .Take(10)
            .Select(g => new GameDownloadStatDto(g.Id, g.Title, g.Downloads))
            .ToList();

        var topDemoPlayedGames = gameStatsList
            .OrderByDescending(g => g.DemoPlays)
            .Take(10)
            .Select(g => new GameDemoStatDto(
                g.Id,
                g.Title,
                g.DemoPlays,
                (int)(db.DemoPlayHistories.Where(d => d.GameId == g.Id && d.PlayedAt >= start && d.PlayedAt <= end).Average(d => d.PlayDurationSeconds) ?? 0)
            ))
            .ToList();

        // Game Conversions in range
        var gameConversions = gameStatsList
            .OrderByDescending(g => g.Downloads)
            .Take(15)
            .Select(g => {
                var wishlistUsersCount = db.Wishlists
                    .Where(w => w.GameId == g.Id && w.AddedAt >= start && w.AddedAt <= end)
                    .Select(w => w.UserId)
                    .Distinct()
                    .Count();

                double wishlistToPurchaseRate = 0;
                if (wishlistUsersCount > 0)
                {
                    var convertedWishlistUsers = db.UserGames
                        .Where(ug => ug.GameId == g.Id && ug.AcquiredAt >= start && ug.AcquiredAt <= end && db.Wishlists.Any(w => w.GameId == g.Id && w.UserId == ug.UserId && w.AddedAt >= start && w.AddedAt <= end))
                        .Select(ug => ug.UserId)
                        .Distinct()
                        .Count();
                    wishlistToPurchaseRate = Math.Round((double)convertedWishlistUsers / wishlistUsersCount * 100, 2);
                }

                return new GameConversionDto(g.Id, g.Title, g.DemoToPurchaseRate, wishlistToPurchaseRate);
            })
            .ToList();

        return new AdminAnalyticsDto(
            selectedPeriod,
            previousPeriod,
            dailyTrend,
            weeklyTrend,
            monthlyTrend,
            topDownloadedGames,
            topDemoPlayedGames,
            gameConversions,
            userStatsList,
            gameStatsList
        );
    }

    private async Task<AnalyticsTimeSummaryDto> GetSummaryForRangeAsync(DateTime start, DateTime end, CancellationToken ct)
    {
        var revenue = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && (o.CompletedAt ?? o.CreatedAt) >= start && (o.CompletedAt ?? o.CreatedAt) <= end)
            .SumAsync(o => o.TotalAmount, ct);

        var orders = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && (o.CompletedAt ?? o.CreatedAt) >= start && (o.CompletedAt ?? o.CreatedAt) <= end)
            .CountAsync(ct);

        var downloads = await db.UserGames
            .Where(ug => ug.AcquiredAt >= start && ug.AcquiredAt <= end)
            .CountAsync(ct);

        var registrations = await db.Users
            .Where(u => u.CreatedAt >= start && u.CreatedAt <= end)
            .CountAsync(ct);

        var demoPlays = await db.DemoPlayHistories
            .Where(d => d.PlayedAt >= start && d.PlayedAt <= end)
            .CountAsync(ct);

        return new AnalyticsTimeSummaryDto(revenue, orders, downloads, registrations, demoPlays);
    }
}
