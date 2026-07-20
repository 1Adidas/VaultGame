using System.Security.Cryptography;
using System.Text;
using GameVault.Application.Common;
using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Domain.Entities;
using GameVault.Domain.Enums;
using GameVault.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QRCoder;

namespace GameVault.Infrastructure.Services;

public class OrderService(AppDbContext db, IEmailService email, IConfiguration config, INotificationService notificationService) : IOrderService
{
    public async Task<OrderDto> CreateAsync(Guid userId, CreateOrderRequest request, CancellationToken ct = default)
    {
        if (request.GameIds.Count == 0) throw new AppException("ORDER_EMPTY", "No games selected", 400);

        var games = await db.Games.Where(g => request.GameIds.Contains(g.Id) && g.Status == GameStatus.Published).ToListAsync(ct);
        if (games.Count != request.GameIds.Count) throw new AppException("GAME_NOT_FOUND", "One or more games not found", 404);

        foreach (var gid in request.GameIds)
            if (await db.UserGames.AnyAsync(ug => ug.UserId == userId && ug.GameId == gid, ct))
                throw new AppException("ALREADY_OWNED", "You already own one of these games", 409);

        var order = new Order
        {
            UserId = userId,
            OrderCode = "GV" + Guid.NewGuid().ToString("n")[..8].ToUpper(),
            Status = OrderStatus.Pending,
            Currency = "VND"
        };
        decimal sub = 0;
        foreach (var game in games)
        {
            var price = game.DiscountPrice ?? game.Price;
            order.Items.Add(new OrderItem { GameId = game.Id, UnitPrice = game.Price, DiscountPrice = game.DiscountPrice, Quantity = 1, LineTotal = price });
            sub += price;
        }
        order.SubTotal = sub;
        order.TotalAmount = sub - order.DiscountAmount;

        if (order.TotalAmount == 0)
        {
            order.Status = OrderStatus.Paid;
            order.CompletedAt = DateTime.UtcNow;
            foreach (var item in order.Items)
            {
                if (!await db.UserGames.AnyAsync(ug => ug.UserId == userId && ug.GameId == item.GameId, ct))
                {
                    db.UserGames.Add(new UserGame { UserId = userId, GameId = item.GameId, OrderId = order.Id });
                }
            }
        }

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return MapOrder(order, games);
    }

    public async Task<IReadOnlyList<OrderDto>> GetByUserAsync(Guid userId, CancellationToken ct = default)
    {
        var orders = await db.Orders.AsNoTracking().Include(o => o.Items).ThenInclude(i => i.Game).ThenInclude(g => g.Images)
            .Where(o => o.UserId == userId).OrderByDescending(o => o.CreatedAt).ToListAsync(ct);
        return orders.Select(o => MapOrder(o, o.Items.Select(i => i.Game).ToList())).ToList();
    }

    public async Task<OrderDto?> GetByIdAsync(Guid userId, Guid orderId, CancellationToken ct = default)
    {
        var order = await db.Orders.AsNoTracking().Include(o => o.Items).ThenInclude(i => i.Game).ThenInclude(g => g.Images)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, ct);
        return order is null ? null : MapOrder(order, order.Items.Select(i => i.Game).ToList());
    }

    public async Task ResendReceiptEmailAsync(Guid userId, Guid orderId, CancellationToken ct = default)
    {
        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Game)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId && o.Status == OrderStatus.Paid, ct)
            ?? throw new AppException("ORDER_NOT_FOUND", "Paid order not found", 404);

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AppException("USER_NOT_FOUND", "User not found", 404);

        var gameListHtml = string.Join("", order.Items.Select(i =>
            $"<tr><td style='padding:8px 12px;border-bottom:1px solid #333;'>{i.Game?.Title ?? "Game"}</td><td style='padding:8px 12px;border-bottom:1px solid #333;text-align:right;'>{i.LineTotal:N0} VND</td></tr>"
        ));

        await email.SendAsync(user.Email, $"Gửi lại xác nhận đơn hàng {order.OrderCode} / Resend Order Receipt", $"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px 24px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Gửi lại hóa đơn thanh toán / Resent Receipt ✅</p>
              </div>
              <div style="padding: 32px 24px;">
                <h2 style="color: #6ee7b7; margin: 0 0 16px;">Xin chào {user.FullName},</h2>
                <p>Đây là hóa đơn gửi lại cho đơn hàng <strong style="color:#a78bfa;">#{order.OrderCode}</strong> của bạn.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <thead><tr style="border-bottom:2px solid #6c3ce0;"><th style="padding:8px 12px;text-align:left;color:#a78bfa;">Game</th><th style="padding:8px 12px;text-align:right;color:#a78bfa;">Giá</th></tr></thead>
                  <tbody>{gameListHtml}</tbody>
                  <tfoot><tr><td style="padding:12px;font-weight:bold;color:#6ee7b7;">Tổng cộng</td><td style="padding:12px;text-align:right;font-weight:bold;color:#6ee7b7;font-size:18px;">{order.TotalAmount:N0} VND</td></tr></tfoot>
                </table>
                <p>Trò chơi đã có sẵn trong thư viện của bạn. Chúc bạn chơi game vui vẻ! 🎉</p>
                <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                <p style="color: #888; font-size: 13px;">This is a copy of your receipt for order #{order.OrderCode}. Games are in your library. Enjoy!</p>
              </div>
            </div>
            """, ct);
    }

    public async Task RequestCancellationAsync(Guid userId, Guid orderId, RequestCancellationRequest request, CancellationToken ct = default)
    {
        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Game)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, ct)
            ?? throw new AppException("ORDER_NOT_FOUND", "Order not found", 404);

        if (order.Status == OrderStatus.Cancelled || order.Status == OrderStatus.CancellationApproved)
            throw new AppException("ORDER_ALREADY_CANCELLED", "Order is already cancelled", 400);

        if (order.Status == OrderStatus.CancellationPending)
            throw new AppException("CANCELLATION_ALREADY_PENDING", "Cancellation request is already pending", 400);

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AppException("USER_NOT_FOUND", "User not found", 404);

        // Check if Paid and enforce limits
        if (order.Status == OrderStatus.Paid)
        {
            // 1. Check if over 14 days since creation (payment)
            var diff = DateTime.UtcNow - order.CreatedAt;
            if (diff.TotalDays > 14)
            {
                throw new AppException("REFUND_TIME_EXCEEDED", "Yêu cầu hoàn tiền thất bại vì đã quá thời hạn 14 ngày kể từ ngày mua. / Refund request failed because the 14-day limit from purchase has been exceeded.", 400);
            }

            // 2. Check if any game in the order has been downloaded
            var itemGameIds = order.Items.Select(oi => oi.GameId).ToList();
            var hasDownloaded = await db.UserGames.AnyAsync(ug => 
                ug.UserId == userId && 
                itemGameIds.Contains(ug.GameId) && 
                ug.OrderId == orderId && 
                ug.LastDownloadAt != null, 
                ct);

            if (hasDownloaded)
            {
                throw new AppException("REFUND_GAME_DOWNLOADED", "Yêu cầu hoàn tiền thất bại vì bạn đã tải xuống tệp cài đặt game trong đơn hàng này. / Refund request failed because you have already downloaded the game files in this order.", 400);
            }
        }

        // Update order status
        order.Status = OrderStatus.CancellationPending;
        order.CancelReason = request.Reason;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        // Build game list for notification message
        var gameList = string.Join(", ", order.Items.Select(i => i.Game?.Title ?? "Game"));

        // Send notification to all Admin users
        var adminUserIds = await db.Users
            .Where(u => u.UserRoles.Any(ur => ur.Role.Name == RoleNames.Admin))
            .Select(u => u.Id)
            .ToListAsync(ct);

        var adminTitle = $"Yêu cầu hủy đơn #{order.OrderCode} / Cancellation Request #{order.OrderCode}";
        var adminMessage = $"Khách hàng {user.FullName} ({user.Email}) yêu cầu hủy đơn hàng #{order.OrderCode}.\n" +
                          $"Tổng tiền: {order.TotalAmount:N0} {order.Currency}\n" +
                          $"Game: {gameList}\n" +
                          $"Lý do: {request.Reason}";

        foreach (var adminId in adminUserIds)
        {
            await notificationService.CreateAsync(
                adminId,
                NotificationType.CancellationRequest,
                adminTitle,
                adminMessage,
                order.Id,
                "Order",
                null,
                ct
            );
        }

        // Send confirmation notification to the customer
        await notificationService.CreateAsync(
            userId,
            NotificationType.System,
            $"Đã gửi yêu cầu hủy đơn #{order.OrderCode} / Cancellation Request Sent",
            $"Yêu cầu hủy đơn hàng #{order.OrderCode} của bạn đang được Admin xem xét. Chúng tôi sẽ thông báo khi có kết quả. / Your cancellation request for order #{order.OrderCode} is being reviewed by Admin.",
            order.Id,
            "Order",
            null,
            ct
        );
    }

    public async Task CancelPendingOrderAsync(Guid userId, Guid orderId, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Payment).FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, ct)
            ?? throw new AppException("ORDER_NOT_FOUND", "Order not found", 404);

        if (order.Status != OrderStatus.Pending)
            throw new AppException("ORDER_NOT_PENDING", "Only pending orders can be cancelled directly", 400);

        order.Status = OrderStatus.Cancelled;
        if (order.Payment is not null)
        {
            order.Payment.Status = PaymentStatus.Failed;
        }

        await db.SaveChangesAsync(ct);
    }

    internal static OrderDto MapOrder(Order o, List<Game> games) => new(
        o.Id, o.OrderCode, o.Status, o.TotalAmount, o.Currency, o.CreatedAt,
        o.Items.Select(i => {
            var g = i.Game ?? games.FirstOrDefault(x => x.Id == i.GameId);
            var coverUrl = g?.Images?.OrderBy(img => img.SortOrder).FirstOrDefault(img => img.IsPrimary)?.Url
                ?? g?.Images?.OrderBy(img => img.SortOrder).FirstOrDefault()?.Url;
            return new OrderItemDto(i.GameId, g?.Title ?? "Unknown", g?.Slug ?? "", coverUrl, i.UnitPrice, i.LineTotal);
        }).ToList(),
        o.CancelReason,
        o.AdminNote);
}

public class SePaySimulatorService(IConfiguration config)
{
    public string BuildQrContent(string orderCode, decimal amount)
    {
        var bank = config["SePay:BankCode"] ?? "970422";
        var account = config["SePay:AccountNumber"] ?? "0123456789";
        return $"{bank}|{account}|{(long)amount}|{orderCode}";
    }

    public string BuildQrImageUrl(string orderCode, decimal amount)
    {
        var bank = config["SePay:BankCode"] ?? "970422";
        var account = config["SePay:AccountNumber"] ?? "0123456789";
        var accountName = config["SePay:AccountName"] ?? "GAME VAULT";
        return $"https://img.vietqr.io/image/{bank}-{account}-qr_only.png?amount={(long)amount}&addInfo={orderCode}&accountName={Uri.EscapeDataString(accountName)}";
    }

    public string GenerateQrImageBase64(string content)
    {
        using var gen = new QRCodeGenerator();
        using var data = gen.CreateQrCode(content, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        return $"data:image/png;base64,{Convert.ToBase64String(png.GetGraphic(10))}";
    }

    public string ComputeSignature(string transactionId, string orderCode, decimal amount, long timestamp)
    {
        var secret = config["SePay:WebhookSecret"] ?? "dev-secret";
        var payload = $"{transactionId}|{orderCode}|{amount}|{timestamp}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    public bool VerifySignature(SePayWebhookPayload payload)
    {
        var expected = ComputeSignature(payload.TransactionId, payload.OrderCode, payload.Amount, payload.Timestamp);
        return string.Equals(expected, payload.Signature, StringComparison.OrdinalIgnoreCase);
    }

    public bool VerifySePayWebhookSignature(string rawBody, string signatureHeader, string timestampHeader)
    {
        if (string.IsNullOrEmpty(signatureHeader) || !signatureHeader.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
            return false;

        var providedHash = signatureHeader.Substring(7);
        var message = $"{timestampHeader}.{rawBody}";

        var secret = config["SePay:WebhookSecret"] ?? "dev-secret";
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var messageBytes = Encoding.UTF8.GetBytes(message);

        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(messageBytes);
        var computedHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        return string.Equals(computedHash, providedHash, StringComparison.OrdinalIgnoreCase);
    }
}

public class PaymentService(AppDbContext db, SePaySimulatorService sepay, INotificationService notifications, IEmailService email, IConfiguration config) : IPaymentService
{
    public async Task<PaymentDto> InitiatePaymentAsync(Guid userId, Guid orderId, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Payment).FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId, ct)
            ?? throw new AppException("ORDER_NOT_FOUND", "Order not found", 404);
        if (order.Status != OrderStatus.Pending) throw new AppException("ORDER_INVALID", "Order is not pending", 400);
        if (order.Payment is not null && order.Payment.Status == PaymentStatus.Pending && order.Payment.ExpiresAt > DateTime.UtcNow)
            return MapPayment(order.Payment, order.OrderCode);

        var expiryMin = int.Parse(config["SePay:PaymentExpiryMinutes"] ?? "3");
        var qrContent = sepay.BuildQrContent(order.OrderCode, order.TotalAmount);
        var qrImageUrl = sepay.BuildQrImageUrl(order.OrderCode, order.TotalAmount);
        var payment = new Payment
        {
            OrderId = orderId,
            TransactionId = Guid.NewGuid().ToString("n")[..8].ToUpper(),
            Amount = order.TotalAmount,
            QrContent = qrContent,
            QrImageUrl = qrImageUrl,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMin),
            Status = PaymentStatus.Pending
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);
        return MapPayment(payment, order.OrderCode);
    }

    public async Task<PaymentStatusDto> GetStatusAsync(Guid userId, Guid paymentId, CancellationToken ct = default)
    {
        var payment = await db.Payments.Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.Id == paymentId && p.Order.UserId == userId, ct)
            ?? throw new AppException("PAYMENT_NOT_FOUND", "Payment not found", 404);
        return new PaymentStatusDto(payment.Id, payment.Status, payment.PaidAt);
    }

    public async Task HandleWebhookAsync(SePayWebhookPayload payload, CancellationToken ct = default)
    {
        if (!sepay.VerifySignature(payload)) throw new AppException("WEBHOOK_INVALID", "Invalid signature", 401);
        
        if (string.Equals(payload.OrderCode, "SEPAYTEST", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var order = await db.Orders.Include(o => o.Payment).Include(o => o.Items).ThenInclude(i => i.Game)
            .FirstOrDefaultAsync(o => o.OrderCode == payload.OrderCode, ct)
            ?? throw new AppException("ORDER_NOT_FOUND", "Order not found", 404);
        var payment = order.Payment ?? throw new AppException("PAYMENT_NOT_FOUND", "Payment not found", 404);

        if (payload.Amount < order.TotalAmount)
            throw new AppException("PAYMENT_AMOUNT_MISMATCH", $"Received amount {payload.Amount} is less than order amount {order.TotalAmount}", 400);

        if (payment.Status == PaymentStatus.Success) return;
        if (payload.Status.Equals("success", StringComparison.OrdinalIgnoreCase))
            await CompletePayment(order, payment, payload.TransactionId, ct);
        else
        {
            payment.Status = PaymentStatus.Failed;
            order.Status = OrderStatus.Failed;
            await db.SaveChangesAsync(ct);
            await notifications.CreateAsync(order.UserId, NotificationType.PaymentFailed, "Thanh toán thất bại / Payment failed", $"Giao dịch thanh toán cho đơn hàng {order.OrderCode} đã thất bại. / Payment for order {order.OrderCode} failed.", order.Id, ct: ct);
        }
    }

    public async Task SimulatePaymentAsync(Guid paymentId, CancellationToken ct = default)
    {
        var payment = await db.Payments.Include(p => p.Order).ThenInclude(o => o.Items).ThenInclude(i => i.Game)
            .FirstOrDefaultAsync(p => p.Id == paymentId, ct)
            ?? throw new AppException("PAYMENT_NOT_FOUND", "Payment not found", 404);
        if (payment.Status != PaymentStatus.Pending) throw new AppException("PAYMENT_INVALID", "Payment not pending", 400);
        await CompletePayment(payment.Order, payment, payment.TransactionId ?? Guid.NewGuid().ToString("n")[..8].ToUpper(), ct);
    }

    private async Task CompletePayment(Order order, Payment payment, string transactionId, CancellationToken ct)
    {
        if (payment.Status == PaymentStatus.Success) return;

        payment.Status = PaymentStatus.Success;
        payment.PaidAt = DateTime.UtcNow;
        payment.TransactionId = transactionId;
        order.Status = OrderStatus.Paid;
        order.CompletedAt = DateTime.UtcNow;
        foreach (var item in order.Items)
        {
            if (!await db.UserGames.AnyAsync(ug => ug.UserId == order.UserId && ug.GameId == item.GameId, ct))
                db.UserGames.Add(new UserGame { UserId = order.UserId, GameId = item.GameId, OrderId = order.Id });
        }
        
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is MySqlConnector.MySqlException mySqlEx && mySqlEx.Number == 1062)
        {
            // Ignore duplicate key error (ER_DUP_ENTRY) due to concurrent simulation or webhook calls
        }

        var msgVi = $"Đơn hàng {order.OrderCode} đã được thanh toán thành công. Trò chơi đã được thêm vào thư viện của bạn.";
        var msgEn = $"Order {order.OrderCode} has been successfully paid. Games added to your library.";
        var message = $"{msgVi} / {msgEn}";

        await notifications.CreateAsync(order.UserId, NotificationType.OrderPaid, "Thanh toán thành công / Payment successful", message, order.Id, ct: ct);

        // Send order confirmation email
        try
        {
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.UserId, ct);
            if (user != null)
            {
                var itemGameIds = order.Items.Select(i => i.GameId).ToList();
                var gamesDict = await db.Games.AsNoTracking()
                    .Where(g => itemGameIds.Contains(g.Id))
                    .ToDictionaryAsync(g => g.Id, g => g.Title, ct);

                var gameNames = string.Join(", ", order.Items.Select(i => i.Game?.Title ?? (gamesDict.TryGetValue(i.GameId, out var t) ? t : "Game")));
                var gameListHtml = string.Join("", order.Items.Select(i =>
                {
                    var title = i.Game?.Title ?? (gamesDict.TryGetValue(i.GameId, out var t) ? t : "Game");
                    return $"<tr><td style='padding:8px 12px;border-bottom:1px solid #333;'>{title}</td><td style='padding:8px 12px;border-bottom:1px solid #333;text-align:right;'>{i.LineTotal:N0} VND</td></tr>";
                }));

                _ = email.SendAsync(user.Email, $"Xác nhận đơn hàng {order.OrderCode} / Order Confirmation", $"""
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
                      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px 24px; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 28px;">🎮 GameVault</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Thanh toán thành công! ✅</p>
                      </div>
                      <div style="padding: 32px 24px;">
                        <h2 style="color: #6ee7b7; margin: 0 0 16px;">Xin chào {user.FullName},</h2>
                        <p>Đơn hàng <strong style="color:#a78bfa;">#{order.OrderCode}</strong> của bạn đã được thanh toán thành công!</p>
                        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                          <thead><tr style="border-bottom:2px solid #6c3ce0;"><th style="padding:8px 12px;text-align:left;color:#a78bfa;">Game</th><th style="padding:8px 12px;text-align:right;color:#a78bfa;">Giá</th></tr></thead>
                          <tbody>{gameListHtml}</tbody>
                          <tfoot><tr><td style="padding:12px;font-weight:bold;color:#6ee7b7;">Tổng cộng</td><td style="padding:12px;text-align:right;font-weight:bold;color:#6ee7b7;font-size:18px;">{order.TotalAmount:N0} VND</td></tr></tfoot>
                        </table>
                        <p>Trò chơi đã được thêm vào thư viện của bạn. Chúc bạn chơi game vui vẻ! 🎉</p>
                        <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;" />
                        <p style="color: #888; font-size: 13px;">Your order #{order.OrderCode} has been paid. Games added to your library. Enjoy!</p>
                      </div>
                    </div>
                    """, ct);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send order email: {ex.Message}");
        }
    }

    private static PaymentDto MapPayment(Payment p, string orderCode) => new(p.Id, p.OrderId, p.Status, p.Amount, p.QrImageUrl, p.QrContent, p.ExpiresAt, orderCode);
}

public class LibraryService(AppDbContext db, IGoogleDriveService drive) : ILibraryService
{
    public async Task<IReadOnlyList<LibraryGameDto>> GetLibraryAsync(Guid userId, CancellationToken ct = default)
    {
        return await db.UserGames.AsNoTracking()
            .Include(ug => ug.Game).ThenInclude(g => g.Images)
            .Include(ug => ug.Game).ThenInclude(g => g.Files)
            .Where(ug => ug.UserId == userId)
            .OrderByDescending(ug => ug.AcquiredAt)
            .Select(ug => new LibraryGameDto(
                ug.GameId, ug.Game.Title, ug.Game.Slug,
                ug.Game.Images.Where(i => i.IsPrimary).Select(i => i.Url).FirstOrDefault() ?? ug.Game.Images.Select(i => i.Url).FirstOrDefault(),
                ug.AcquiredAt,
                ug.Game.Files.Where(f => f.IsActive).OrderByDescending(f => f.CreatedAt).Select(f => f.Version).FirstOrDefault() ?? "1.0.0",
                ug.LastDownloadAt))
            .ToListAsync(ct);
    }

    public async Task<DownloadLinkDto> GetDownloadLinkAsync(Guid userId, Guid gameId, CancellationToken ct = default)
    {
        var owned = await db.UserGames.FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId, ct)
            ?? throw new AppException("NOT_OWNED", "Game not in library", 403);
        var file = await db.GameFiles.Where(f => f.GameId == gameId && f.IsActive).OrderByDescending(f => f.CreatedAt).FirstOrDefaultAsync(ct)
            ?? throw new AppException("FILE_NOT_FOUND", "No download file available", 404);

        var url = !string.IsNullOrEmpty(file.GoogleDriveFileId)
            ? await drive.GetDownloadUrlAsync(file.GoogleDriveFileId, ct)
            : file.DownloadUrl ?? throw new AppException("FILE_NOT_FOUND", "Download URL missing", 404);

        owned.LastDownloadAt = DateTime.UtcNow;
        var game = await db.Games.FindAsync([gameId], ct);
        if (game is not null) game.DownloadCount++;
        await db.SaveChangesAsync(ct);
        return new DownloadLinkDto(url, DateTime.UtcNow.AddMinutes(15), file.FileName, file.FileSizeBytes);
    }

    public async Task RemoveFromLibraryAsync(Guid userId, Guid gameId, CancellationToken ct = default)
    {
        var owned = await db.UserGames.FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId, ct);
        if (owned is null) return;
        db.UserGames.Remove(owned);
        await db.SaveChangesAsync(ct);
    }
}
