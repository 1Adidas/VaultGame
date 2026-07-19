using System.IO;
using System.IO.Compression;
using GameVault.Application.Interfaces;
using GameVault.Domain.Entities;
using GameVault.Domain.Enums;
using GameVault.Infrastructure.Persistence;
using GameVault.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GameVault.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var conn = config.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string not found");

        services.AddDbContext<AppDbContext>(o =>
            o.UseMySql(conn, ServerVersion.AutoDetect(conn), mysqlOptions =>
                mysqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

        services.AddTransient<GroqClient>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IGameService, GameService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IWishlistService, WishlistService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<ILibraryService, LibraryService>();
        services.AddScoped<IAiService, AiService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IGoogleDriveService, GoogleDriveService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddSingleton<IEmailService, ResendEmailService>();
        services.AddSingleton<SePaySimulatorService>();

        return services;
    }

    public static async Task SeedDatabaseAsync(AppDbContext db)
    {
        try
        {
            if (!await db.Database.CanConnectAsync()) return;

            var conn = db.Database.GetDbConnection();
            var alreadyOpen = conn.State == System.Data.ConnectionState.Open;
            if (!alreadyOpen) await conn.OpenAsync();

            // 1. Dynamic schema updates for columns
            await AddColumnIfNotExistsAsync(conn, "Games", "TitleEn", "VARCHAR(255) NULL");
            await AddColumnIfNotExistsAsync(conn, "Games", "DescriptionEn", "MEDIUMTEXT NULL");
            await AddColumnIfNotExistsAsync(conn, "Games", "ShortDescriptionEn", "VARCHAR(500) NULL");
            await AddColumnIfNotExistsAsync(conn, "Reviews", "ParentId", "char(36) NULL");
            await AddColumnIfNotExistsAsync(conn, "GameImages", "Locale", "VARCHAR(10) NULL");
            await AddColumnIfNotExistsAsync(conn, "Users", "DateOfBirth", "DATE NULL");
            await AddColumnIfNotExistsAsync(conn, "Users", "IsLibraryPublic", "TINYINT(1) NOT NULL DEFAULT 0");
            await AddColumnIfNotExistsAsync(conn, "Users", "IsPurchaseHistoryPublic", "TINYINT(1) NOT NULL DEFAULT 0");
            await AddColumnIfNotExistsAsync(conn, "Orders", "CancelReason", "VARCHAR(500) NULL");
            await AddColumnIfNotExistsAsync(conn, "Orders", "AdminNote", "VARCHAR(1000) NULL");
            await AddColumnIfNotExistsAsync(conn, "DemoPlayHistories", "PlayDurationSeconds", "INT NULL");

            // 2. Modify Reviews.Rating to TINYINT NULL
            using (var cmdRating = conn.CreateCommand())
            {
                cmdRating.CommandText = @"
                    SELECT IS_NULLABLE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'Reviews' 
                      AND COLUMN_NAME = 'Rating';";
                var isNullable = Convert.ToString(await cmdRating.ExecuteScalarAsync());
                if (!string.Equals(isNullable, "YES", StringComparison.OrdinalIgnoreCase))
                {
                    using var alterCmd = conn.CreateCommand();
                    alterCmd.CommandText = "ALTER TABLE `Reviews` MODIFY COLUMN `Rating` TINYINT NULL;";
                    await alterCmd.ExecuteNonQueryAsync();
                }
            }

            // 3. Add constraint CHK_Reviews_Rating if it doesn't exist
            using (var cmdConstraint = conn.CreateCommand())
            {
                cmdConstraint.CommandText = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE CONSTRAINT_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'Reviews' 
                      AND CONSTRAINT_NAME = 'CHK_Reviews_Rating';";
                var constraintCount = Convert.ToInt32(await cmdConstraint.ExecuteScalarAsync());
                if (constraintCount == 0)
                {
                    using var alterCmd = conn.CreateCommand();
                    alterCmd.CommandText = "ALTER TABLE `Reviews` ADD CONSTRAINT `CHK_Reviews_Rating` CHECK (Rating IS NULL OR (Rating >= 1 AND Rating <= 5));";
                    await alterCmd.ExecuteNonQueryAsync();
                }
            }

            // 3.1. Recreate CHK_Orders_Status to allow new statuses
            try
            {
                using var dropCmd = conn.CreateCommand();
                dropCmd.CommandText = "ALTER TABLE `Orders` DROP CHECK `CHK_Orders_Status`;";
                await dropCmd.ExecuteNonQueryAsync();
            }
            catch {}

            try
            {
                using var alterCmd = conn.CreateCommand();
                alterCmd.CommandText = "ALTER TABLE `Orders` ADD CONSTRAINT `CHK_Orders_Status` CHECK (Status IN ('Pending', 'Paid', 'Failed', 'Cancelled', 'Expired', 'Refunded', 'CancellationPending', 'CancellationApproved'));";
                await alterCmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed updating CHK_Orders_Status: {ex.Message}");
            }

            // 3.2. Recreate CHK_Notifications_Type to allow new notification types
            try
            {
                using var dropCmd = conn.CreateCommand();
                dropCmd.CommandText = "ALTER TABLE `Notifications` DROP CHECK `CHK_Notifications_Type`;";
                await dropCmd.ExecuteNonQueryAsync();
            }
            catch {}

            try
            {
                using var alterCmd = conn.CreateCommand();
                alterCmd.CommandText = "ALTER TABLE `Notifications` ADD CONSTRAINT `CHK_Notifications_Type` CHECK (Type IN ('OrderPaid', 'PaymentFailed', 'ReviewApproved', 'System', 'Promo', 'CancellationRequest', 'CancellationApproved'));";
                await alterCmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed updating CHK_Notifications_Type: {ex.Message}");
            }

            // 4. Drop unique constraint UQ_Reviews_UserId_GameId if it exists
            using (var cmdIndex = conn.CreateCommand())
            {
                cmdIndex.CommandText = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE CONSTRAINT_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'Reviews' 
                      AND CONSTRAINT_NAME = 'UQ_Reviews_UserId_GameId';";
                var indexCount = Convert.ToInt32(await cmdIndex.ExecuteScalarAsync());
                if (indexCount > 0)
                {
                    using var dropCmd = conn.CreateCommand();
                    dropCmd.CommandText = "ALTER TABLE `Reviews` DROP INDEX `UQ_Reviews_UserId_GameId`;";
                    await dropCmd.ExecuteNonQueryAsync();
                }
            }

            // 5. Create non-unique index IX_Reviews_UserId_GameId if it doesn't exist
            using (var cmdIndex2 = conn.CreateCommand())
            {
                cmdIndex2.CommandText = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.STATISTICS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'Reviews' 
                      AND INDEX_NAME = 'IX_Reviews_UserId_GameId';";
                var indexCount2 = Convert.ToInt32(await cmdIndex2.ExecuteScalarAsync());
                if (indexCount2 == 0)
                {
                    using var createCmd = conn.CreateCommand();
                    createCmd.CommandText = "ALTER TABLE `Reviews` ADD INDEX `IX_Reviews_UserId_GameId` (`UserId`, `GameId`);";
                    await createCmd.ExecuteNonQueryAsync();
                }
            }

            // 6. Create GameCategories table if it doesn't exist
            using (var cmdTable = conn.CreateCommand())
            {
                cmdTable.CommandText = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'GameCategories';";
                var tableCount = Convert.ToInt32(await cmdTable.ExecuteScalarAsync());
                if (tableCount == 0)
                {
                    using var createCmd = conn.CreateCommand();
                    createCmd.CommandText = @"
                        CREATE TABLE `GameCategories` (
                          `GameId` CHAR(36) NOT NULL,
                          `CategoryId` CHAR(36) NOT NULL,
                          PRIMARY KEY (`GameId`, `CategoryId`),
                          KEY `IX_GameCategories_CategoryId` (`CategoryId`),
                          CONSTRAINT `FK_GameCategories_Games_GameId` FOREIGN KEY (`GameId`) REFERENCES `Games` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
                          CONSTRAINT `FK_GameCategories_Categories_CategoryId` FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
                    await createCmd.ExecuteNonQueryAsync();
                }
            }

            // 7. Migrate existing categories data
            using (var cmdData = conn.CreateCommand())
            {
                cmdData.CommandText = "SELECT COUNT(*) FROM `GameCategories`;";
                var count = Convert.ToInt32(await cmdData.ExecuteScalarAsync());
                if (count == 0)
                {
                    using var migrateCmd = conn.CreateCommand();
                    migrateCmd.CommandText = "INSERT INTO `GameCategories` (`GameId`, `CategoryId`) SELECT `Id`, `CategoryId` FROM `Games` WHERE `CategoryId` IS NOT NULL;";
                    await migrateCmd.ExecuteNonQueryAsync();
                }
            }

            // 8. Drop constraint FK_Games_Categories_CategoryId if exists
            using (var cmdFK = conn.CreateCommand())
            {
                cmdFK.CommandText = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'Games' 
                      AND CONSTRAINT_NAME = 'FK_Games_Categories_CategoryId';";
                var fkExists = Convert.ToInt32(await cmdFK.ExecuteScalarAsync());
                if (fkExists > 0)
                {
                    using var dropCmd = conn.CreateCommand();
                    dropCmd.CommandText = "ALTER TABLE `Games` DROP FOREIGN KEY `FK_Games_Categories_CategoryId`;";
                    await dropCmd.ExecuteNonQueryAsync();
                }
            }

            // 9. Make CategoryId column nullable in Games table
            using (var cmdColumn = conn.CreateCommand())
            {
                cmdColumn.CommandText = @"
                    SELECT IS_NULLABLE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'Games' 
                      AND COLUMN_NAME = 'CategoryId';";
                var isNullable = Convert.ToString(await cmdColumn.ExecuteScalarAsync());
                if (string.Equals(isNullable, "NO", StringComparison.OrdinalIgnoreCase))
                {
                    using var alterCmd = conn.CreateCommand();
                    alterCmd.CommandText = "ALTER TABLE `Games` MODIFY COLUMN `CategoryId` CHAR(36) NULL;";
                    await alterCmd.ExecuteNonQueryAsync();
                }
            }

            // 10. Create DemoPlayHistories table if it doesn't exist
            using (var cmdTable = conn.CreateCommand())
            {
                cmdTable.CommandText = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = 'DemoPlayHistories';";
                var tableCount = Convert.ToInt32(await cmdTable.ExecuteScalarAsync());
                if (tableCount == 0)
                {
                    using var createCmd = conn.CreateCommand();
                    createCmd.CommandText = @"
                        CREATE TABLE `DemoPlayHistories` (
                          `Id` CHAR(36) NOT NULL,
                          `GameId` CHAR(36) NOT NULL,
                          `UserId` CHAR(36) NULL,
                          `PlayedAt` DATETIME(6) NOT NULL,
                          `PlayDurationSeconds` INT NULL,
                          PRIMARY KEY (`Id`),
                          KEY `IX_DemoPlayHistories_GameId` (`GameId`),
                          KEY `IX_DemoPlayHistories_UserId` (`UserId`),
                          CONSTRAINT `FK_DemoPlayHistories_Games_GameId` FOREIGN KEY (`GameId`) REFERENCES `Games` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
                          CONSTRAINT `FK_DemoPlayHistories_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`) ON DELETE SET NULL ON UPDATE CASCADE
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
                    await createCmd.ExecuteNonQueryAsync();
                }
            }

            if (!alreadyOpen) await conn.CloseAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DB Migration failed: {ex.Message}");
        }

        var customerRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == RoleNames.Customer);
        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == RoleNames.Admin);

        if (customerRole == null)
        {
            customerRole = new Role { Name = RoleNames.Customer, Description = "Customer" };
            db.Roles.Add(customerRole);
        }
        if (adminRole == null)
        {
            adminRole = new Role { Name = RoleNames.Admin, Description = "Administrator" };
            db.Roles.Add(adminRole);
        }
        await db.SaveChangesAsync();

        var adminUser = await db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Email == "admin@gamevault.com");
        if (adminUser == null)
        {
            adminUser = new User
            {
                Email = "admin@gamevault.com",
                FullName = "Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
                IsEmailVerified = true
            };
            adminUser.UserRoles.Add(new UserRole { Role = adminRole });
            db.Users.Add(adminUser);
            await db.SaveChangesAsync();
        }
        else if (!adminUser.UserRoles.Any(ur => ur.Role.Name == RoleNames.Admin))
        {
            adminUser.UserRoles.Add(new UserRole { Role = adminRole });
            await db.SaveChangesAsync();
        }

        // Revert nguyenduynghia2111@gmail.com from Admin role (strip Admin, only Customer)
        var targetUser = await db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Email == "nguyenduynghia2111@gmail.com");
        if (targetUser != null)
        {
            var adminUserRole = targetUser.UserRoles.FirstOrDefault(ur => ur.Role.Name == RoleNames.Admin);
            if (adminUserRole != null)
            {
                targetUser.UserRoles.Remove(adminUserRole);
                if (!targetUser.UserRoles.Any(ur => ur.Role.Name == RoleNames.Customer))
                {
                    targetUser.UserRoles.Add(new UserRole { Role = customerRole });
                }
                await db.SaveChangesAsync();
            }
        }

        // Seed categories if not present
        if (!await db.Categories.AnyAsync())
        {
            var categories = new[]
            {
                new Category { Name = "ACTION",     Slug = "action",     SortOrder = 1, IsActive = true },
                new Category { Name = "RPG",        Slug = "rpg",        SortOrder = 2, IsActive = true },
                new Category { Name = "INDIE",      Slug = "indie",      SortOrder = 3, IsActive = true },
                new Category { Name = "KIDS",       Slug = "kids",       SortOrder = 4, IsActive = true },
                new Category { Name = "SIMULATION", Slug = "simulation", SortOrder = 5, IsActive = true },
            };
            db.Categories.AddRange(categories);
            await db.SaveChangesAsync();
        }

        // Seed tags if not present or missing
        var defaultTags = new List<Tag>
        {
            new() { Name = "Action",     Slug = "action"     },
            new() { Name = "RPG",        Slug = "rpg"        },
            new() { Name = "Indie",      Slug = "indie"      },
            new() { Name = "Kids",       Slug = "kids"       },
            new() { Name = "Simulation", Slug = "simulation" },
            new() { Name = "Top down",   Slug = "top-down"   },
            new() { Name = "Pixel 2D",   Slug = "pixel-2d"   },
            new() { Name = "Pixel",      Slug = "pixel"      },
            new() { Name = "2D",         Slug = "2d"         },
            new() { Name = "Multiplayer",Slug = "multiplayer"},
            new() { Name = "Single-player",Slug = "single-player"},
            new() { Name = "Co-op",      Slug = "co-op"      }
        };

        foreach (var tag in defaultTags)
        {
            if (!await db.Tags.AnyAsync(t => t.Slug == tag.Slug))
            {
                db.Tags.Add(tag);
            }
        }
        await db.SaveChangesAsync();

        // Self-heal/merge duplicate tags: Singleplayer -> single-player
        var duplicateTag = await db.Tags.FirstOrDefaultAsync(t => t.Slug == "singleplayer");
        var targetTag = await db.Tags.FirstOrDefaultAsync(t => t.Slug == "single-player");
        if (duplicateTag != null && targetTag != null)
        {
            var duplicateGameTags = await db.GameTags.Where(gt => gt.TagId == duplicateTag.Id).ToListAsync();
            foreach (var gt in duplicateGameTags)
            {
                var exists = await db.GameTags.AnyAsync(g => g.GameId == gt.GameId && g.TagId == targetTag.Id);
                if (!exists)
                {
                    db.GameTags.Add(new GameTag { GameId = gt.GameId, TagId = targetTag.Id });
                }
            }
            db.GameTags.RemoveRange(duplicateGameTags);
            db.Tags.Remove(duplicateTag);
            await db.SaveChangesAsync();
        }

        // 11. Self-healing for Unity WebGL Demos: Auto-extract demo zip files if missing
        try
        {
            var demos = await db.UnityDemos.ToListAsync();
            foreach (var d in demos)
            {
                if (string.IsNullOrEmpty(d.BuildUrl) || !d.BuildUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
                    continue;

                var extractDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "games", d.GameId.ToString(), "demo", "extracted");
                var buildDir = Path.Combine(extractDir, "Build");

                if (!Directory.Exists(extractDir) || !Directory.Exists(buildDir) || !System.IO.File.Exists(Path.Combine(extractDir, "index.html")))
                {
                    var demoDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "games", d.GameId.ToString(), "demo");
                    if (Directory.Exists(demoDir))
                    {
                        var zipFiles = Directory.GetFiles(demoDir, "*.zip");
                        if (zipFiles.Length > 0)
                        {
                            Console.WriteLine($"Auto-extracting demo zip for Game {d.GameId}: {zipFiles[0]}");
                            if (Directory.Exists(extractDir))
                            {
                                try { Directory.Delete(extractDir, true); } catch {}
                            }
                            Directory.CreateDirectory(extractDir);

                            ZipFile.ExtractToDirectory(zipFiles[0], extractDir, overwriteFiles: true);
                            Console.WriteLine($"Successfully extracted demo zip for Game {d.GameId}");
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to auto-extract missing Unity demos: {ex.Message}");
        }

        // Clean up mock assets we previously seeded
        try
        {
            var mockVideos = await db.GameVideos.Where(v => v.Title.EndsWith("Official Trailer") && v.GoogleDriveFileId != null).ToListAsync();
            if (mockVideos.Any()) db.GameVideos.RemoveRange(mockVideos);

            var mockFiles = await db.GameFiles.Where(f => f.FileName.EndsWith("-installer.zip") && f.GoogleDriveFileId != null).ToListAsync();
            if (mockFiles.Any()) db.GameFiles.RemoveRange(mockFiles);

            var mockDemos = await db.UnityDemos.Where(d => d.SceneName == "SampleScene" && d.BuildUrl.Contains("extracted")).ToListAsync();
            if (mockDemos.Any()) db.UnityDemos.RemoveRange(mockDemos);

            await db.SaveChangesAsync();
            Console.WriteLine("-> Mock assets cleaned up successfully.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to cleanup mock assets: {ex.Message}");
        }
    }

    private static async Task AddColumnIfNotExistsAsync(System.Data.Common.DbConnection conn, string tableName, string columnName, string columnDefinition)
    {
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $@"
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = '{tableName}' 
                  AND COLUMN_NAME = '{columnName}';";
            
            var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            if (count == 0)
            {
                using var alterCmd = conn.CreateCommand();
                alterCmd.CommandText = $"ALTER TABLE `{tableName}` ADD COLUMN `{columnName}` {columnDefinition};";
                await alterCmd.ExecuteNonQueryAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed checking/adding column {columnName} to {tableName}: {ex.Message}");
        }
    }
}
