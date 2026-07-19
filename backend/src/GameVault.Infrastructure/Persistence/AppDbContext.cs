using GameVault.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GameVault.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Game> Games => Set<Game>();
    public DbSet<GameTag> GameTags => Set<GameTag>();
    public DbSet<GameCategory> GameCategories => Set<GameCategory>();
    public DbSet<GameImage> GameImages => Set<GameImage>();
    public DbSet<GameVideo> GameVideos => Set<GameVideo>();
    public DbSet<GameFile> GameFiles => Set<GameFile>();
    public DbSet<UnityDemo> UnityDemos => Set<UnityDemo>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<UserGame> UserGames => Set<UserGame>();
    public DbSet<AIChatHistory> AIChatHistories => Set<AIChatHistory>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<DemoPlayHistory> DemoPlayHistories => Set<DemoPlayHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AIChatHistory>().ToTable("AIChatHistory");
        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });
        modelBuilder.Entity<GameTag>().HasKey(x => new { x.GameId, x.TagId });
        modelBuilder.Entity<GameCategory>().HasKey(x => new { x.GameId, x.CategoryId });
        modelBuilder.Entity<Wishlist>().HasKey(x => new { x.UserId, x.GameId });
        modelBuilder.Entity<UserGame>().HasKey(x => new { x.UserId, x.GameId });
        modelBuilder.Entity<Review>().HasIndex(x => new { x.UserId, x.GameId });
        modelBuilder.Entity<Order>().HasIndex(x => x.OrderCode).IsUnique();
        modelBuilder.Entity<Payment>().HasIndex(x => x.TransactionId).IsUnique();
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Game>().HasIndex(x => x.Slug).IsUnique();
        modelBuilder.Entity<Category>().HasIndex(x => x.Slug).IsUnique();
        modelBuilder.Entity<Tag>().HasIndex(x => x.Slug).IsUnique();
        modelBuilder.Entity<UnityDemo>().HasIndex(x => x.GameId).IsUnique();
        modelBuilder.Entity<Order>().HasOne(x => x.Payment).WithOne(x => x.Order).HasForeignKey<Payment>(x => x.OrderId);
        modelBuilder.Entity<DemoPlayHistory>().HasIndex(x => x.GameId);
        modelBuilder.Entity<DemoPlayHistory>().HasIndex(x => x.UserId);
    }
}

