namespace GameVault.Domain.Enums;

public static class GameStatus
{
    public const string Draft = "Draft";
    public const string Published = "Published";
    public const string Archived = "Archived";
}

public static class OrderStatus
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";
    public const string Refunded = "Refunded";
    public const string CancellationPending = "CancellationPending";
    public const string CancellationApproved = "CancellationApproved";
}

public static class PaymentStatus
{
    public const string Pending = "Pending";
    public const string Success = "Success";
    public const string Failed = "Failed";
    public const string Expired = "Expired";
    public const string Refunded = "Refunded";
}

public static class NotificationType
{
    public const string OrderPaid = "OrderPaid";
    public const string PaymentFailed = "PaymentFailed";
    public const string ReviewApproved = "ReviewApproved";
    public const string System = "System";
    public const string Promo = "Promo";
    public const string CancellationRequest = "CancellationRequest";
    public const string CancellationApproved = "CancellationApproved";
}

public static class RoleNames
{
    public const string Customer = "Customer";
    public const string Admin = "Admin";
}
