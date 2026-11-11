using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GameVault.Launcher.Models;

namespace GameVault.Launcher.Services;

public class ApiService
{
    private HttpClient _httpClient;
    private readonly StorageService? _storageService;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private string? _currentAccessToken;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public string BaseUrl { get; private set; }

    public ApiService(string baseUrl = "http://127.0.0.1:5000", StorageService? storageService = null)
    {
        _storageService = storageService;
        // Convert localhost to 127.0.0.1 to avoid Windows IPv6 resolution issues
        if (baseUrl.Contains("localhost:5000", StringComparison.OrdinalIgnoreCase))
        {
            baseUrl = baseUrl.Replace("localhost:5000", "127.0.0.1:5000", StringComparison.OrdinalIgnoreCase);
        }
        BaseUrl = baseUrl.TrimEnd('/');
        _httpClient = CreateHttpClient(BaseUrl, null);
    }

    private static HttpClient CreateHttpClient(string baseUrl, AuthenticationHeaderValue? existingAuth)
    {
        var client = new HttpClient
        {
            BaseAddress = new Uri(baseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };
        client.DefaultRequestHeaders.TryAddWithoutValidation("ngrok-skip-browser-warning", "1");
        if (existingAuth != null)
        {
            client.DefaultRequestHeaders.Authorization = existingAuth;
        }
        return client;
    }

    public void UpdateBaseUrl(string newBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(newBaseUrl)) return;

        if (newBaseUrl.Contains("localhost:5000", StringComparison.OrdinalIgnoreCase))
        {
            newBaseUrl = newBaseUrl.Replace("localhost:5000", "127.0.0.1:5000", StringComparison.OrdinalIgnoreCase);
        }

        var cleanUrl = newBaseUrl.TrimEnd('/');
        if (string.Equals(BaseUrl, cleanUrl, StringComparison.OrdinalIgnoreCase))
        {
            return; // URL không đổi, không cần khởi tạo lại
        }

        BaseUrl = cleanUrl;
        var oldClient = _httpClient;
        var existingAuth = oldClient.DefaultRequestHeaders.Authorization;
        _httpClient = CreateHttpClient(BaseUrl, existingAuth);
        oldClient.Dispose();
    }

    public void SetAuthToken(string? token)
    {
        _currentAccessToken = token;
        if (string.IsNullOrEmpty(token))
        {
            _httpClient.DefaultRequestHeaders.Authorization = null;
        }
        else
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    public async Task<AuthResponse> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var payload = new LoginRequest(email, password);
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("/api/v1/auth/login", content, ct);
        var responseString = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            string errorMessage = $"Đăng nhập thất bại (Mã lỗi: {(int)response.StatusCode})";

            try
            {
                if (!string.IsNullOrWhiteSpace(responseString))
                {
                    var errorObj = JsonSerializer.Deserialize<ApiResponse<object>>(responseString, JsonOptions);
                    var rawMsg = errorObj?.Error?.Message ?? errorObj?.Message;
                    if (!string.IsNullOrWhiteSpace(rawMsg))
                    {
                        if (rawMsg.Contains("Invalid email or password", StringComparison.OrdinalIgnoreCase))
                        {
                            errorMessage = "Email hoặc mật khẩu không chính xác.";
                        }
                        else
                        {
                            errorMessage = rawMsg;
                        }
                    }
                }
            }
            catch { }

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized && errorMessage.StartsWith("Đăng nhập thất bại (Mã lỗi: 401)"))
            {
                errorMessage = "Email hoặc mật khẩu không chính xác.";
            }
            else if ((int)response.StatusCode == 429)
            {
                errorMessage = "Bạn đã thử đăng nhập quá nhiều lần liên tiếp. Vui lòng đợi 1 phút và thử lại.";
            }
            else if ((int)response.StatusCode == 503)
            {
                errorMessage = "Máy chủ đang bận hoặc giới hạn lượt yêu cầu. Vui lòng thử lại sau giây lát.";
            }

            throw new Exception(errorMessage);
        }

        var result = JsonSerializer.Deserialize<ApiResponse<AuthResponse>>(responseString, JsonOptions);
        if (result?.Success == true && result.Data != null)
        {
            SetAuthToken(result.Data.AccessToken);
            return result.Data;
        }

        throw new Exception(result?.Message ?? "Không thể xác thực thông tin tài khoản.");
    }

    public async Task<bool> TryRefreshTokenAsync(CancellationToken ct = default)
        => await TryRefreshTokenAsync(_currentAccessToken, ct);

    private async Task<bool> TryRefreshTokenAsync(string? failedToken, CancellationToken ct)
    {
        if (_storageService == null) return false;

        await _refreshLock.WaitAsync(ct);
        try
        {
            if (!string.IsNullOrEmpty(_currentAccessToken) &&
                !string.Equals(_currentAccessToken, failedToken, StringComparison.Ordinal))
            {
                return true;
            }

            var session = _storageService.LoadSession();
            if (string.IsNullOrEmpty(session.RefreshToken)) return false;

            var payload = new RefreshTokenRequest(session.RefreshToken);
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"));

            var response = await _httpClient.PostAsync("/api/v1/auth/refresh", content, ct);
            if (!response.IsSuccessStatusCode) return false;

            var responseString = await response.Content.ReadAsStringAsync(ct);
            var result = JsonSerializer.Deserialize<ApiResponse<AuthResponse>>(responseString, JsonOptions);
            if (result?.Success == true && result.Data != null)
            {
                SetAuthToken(result.Data.AccessToken);
                session.AccessToken = result.Data.AccessToken;
                session.RefreshToken = result.Data.RefreshToken;
                if (result.Data.User != null) session.User = result.Data.User;
                _storageService.SaveSession(session);
                return true;
            }
        }
        catch { }
        finally
        {
            _refreshLock.Release();
        }

        return false;
    }

    private async Task<HttpResponseMessage> SendWithRetryAsync(Func<Task<HttpResponseMessage>> sendFunc, CancellationToken ct = default)
    {
        var tokenUsed = _currentAccessToken;
        var response = await sendFunc();
        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            var refreshed = await TryRefreshTokenAsync(tokenUsed, ct);
            if (refreshed)
            {
                response.Dispose();
                response = await sendFunc();
            }
        }
        return response;
    }

    private static string? ExtractApiErrorMessage(string responseString)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(responseString)) return null;
            var err = JsonSerializer.Deserialize<ApiResponse<object>>(responseString, JsonOptions);
            return err?.Error?.Message ?? err?.Message;
        }
        catch
        {
            return null;
        }
    }

    public async Task<IReadOnlyList<LibraryGameDto>> GetLibraryAsync(CancellationToken ct = default)
    {
        using var response = await SendWithRetryAsync(() => _httpClient.GetAsync("/api/v1/library", ct), ct);
        var responseString = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                throw new ApiSessionExpiredException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại tài khoản trên Launcher.");
            }
            var detail = ExtractApiErrorMessage(responseString);
            throw new Exception(string.IsNullOrWhiteSpace(detail)
                ? $"Không thể tải thư viện game ({response.StatusCode})"
                : detail);
        }

        var result = JsonSerializer.Deserialize<ApiResponse<List<LibraryGameDto>>>(responseString, JsonOptions);
        if (result?.Success == true && result.Data != null)
        {
            return result.Data;
        }

        return new List<LibraryGameDto>();
    }

    public async Task<DownloadLinkDto> GetDownloadLinkAsync(Guid gameId, CancellationToken ct = default)
    {
        using var response = await SendWithRetryAsync(() => _httpClient.GetAsync($"/api/v1/library/{gameId}/download", ct), ct);
        var responseString = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                throw new ApiSessionExpiredException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại tài khoản trên Launcher.");
            }
            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                throw new Exception("Tài khoản chưa sở hữu trò chơi này. Vui lòng mua game trên Website trước khi tải.");
            }
            var detail = ExtractApiErrorMessage(responseString);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new Exception(string.IsNullOrWhiteSpace(detail)
                    ? "Trò chơi này chưa có tệp cài đặt trên máy chủ."
                    : $"Trò chơi chưa có tệp cài đặt khả dụng ({detail}).");
            }
            throw new Exception(string.IsNullOrWhiteSpace(detail)
                ? $"Không thể lấy link tải game ({response.StatusCode})"
                : detail);
        }

        var result = JsonSerializer.Deserialize<ApiResponse<DownloadLinkDto>>(responseString, JsonOptions);
        if (result?.Success == true && result.Data != null)
        {
            return result.Data;
        }

        throw new Exception(result?.Error?.Message ?? result?.Message ?? "Không tìm thấy file cài đặt của game này.");
    }

    public async Task RemoveFromLibraryAsync(Guid gameId, CancellationToken ct = default)
    {
        using var response = await SendWithRetryAsync(() => _httpClient.DeleteAsync($"/api/v1/library/{gameId}", ct), ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                throw new ApiSessionExpiredException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại tài khoản trên Launcher.");
            }
            var responseString = await response.Content.ReadAsStringAsync(ct);
            var detail = ExtractApiErrorMessage(responseString);
            throw new Exception($"Không thể xóa game khỏi thư viện ({response.StatusCode}): {detail ?? responseString}");
        }
    }

    public async Task<UserDto?> GetProfileAsync(CancellationToken ct = default)
    {
        try
        {
            using var response = await SendWithRetryAsync(() => _httpClient.GetAsync("/api/v1/users/profile", ct), ct);
            if (!response.IsSuccessStatusCode) return null;

            var responseString = await response.Content.ReadAsStringAsync(ct);
            var result = JsonSerializer.Deserialize<ApiResponse<UserDto>>(responseString, JsonOptions);
            return result?.Data;
        }
        catch
        {
            return null;
        }
    }
}
