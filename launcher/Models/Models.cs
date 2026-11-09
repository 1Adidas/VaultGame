using System.Text.Json.Serialization;

namespace GameVault.Launcher.Models;

public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string RefreshToken);

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? AvatarUrl,
    DateOnly? DateOfBirth,
    DateTime CreatedAt,
    IReadOnlyList<string> Roles
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record ApiErrorDto(string? Code, string? Message);

public record ApiResponse<T>(
    bool Success,
    T? Data,
    string? ErrorCode,
    string? Message,
    ApiErrorDto? Error = null
);

public record LibraryGameDto(
    Guid GameId,
    string Title,
    string Slug,
    string? CoverUrl,
    DateTime AcquiredAt,
    string? Version,
    DateTime? LastDownloadAt
);

public class DownloadLinkDto
{
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("downloadUrl")]
    public string? DownloadUrlProperty { get; set; }

    [JsonIgnore]
    public string DownloadUrl => !string.IsNullOrEmpty(Url) ? Url : (DownloadUrlProperty ?? string.Empty);

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }

    [JsonPropertyName("fileSizeBytes")]
    public long? FileSizeBytes { get; set; }

    public DownloadLinkDto() { }

    public DownloadLinkDto(string url, DateTime expiresAt, string? fileName, long? fileSizeBytes)
    {
        Url = url;
        ExpiresAt = expiresAt;
        FileName = fileName;
        FileSizeBytes = fileSizeBytes;
    }
}

public class InstalledGameMetadata
{
    public Guid GameId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string InstallPath { get; set; } = string.Empty;
    public string ExecutablePath { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
}

public class AppSession
{
    public string ApiUrl { get; set; } = "http://127.0.0.1:5000";
    public string WebUrl { get; set; } = "http://localhost:3000";
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public UserDto? User { get; set; }
    public bool RememberMe { get; set; } = true;
    public string? SavedEmail { get; set; }
    public string? PreferredInstallDirectory { get; set; }
}
