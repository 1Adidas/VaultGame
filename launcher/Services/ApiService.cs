using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GameVault.Launcher.Models;

namespace GameVault.Launcher.Services;

public class ApiService
{
    private HttpClient _httpClient;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public string BaseUrl { get; private set; }

    public ApiService(string baseUrl = "http://127.0.0.1:5000")
    {
        // Convert localhost to 127.0.0.1 to avoid Windows IPv6 resolution issues
        if (baseUrl.Contains("localhost:5000"))
        {
            baseUrl = baseUrl.Replace("localhost:5000", "127.0.0.1:5000");
        }
        BaseUrl = baseUrl.TrimEnd('/');
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(BaseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };
    }

    public void UpdateBaseUrl(string newBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(newBaseUrl)) return;

        if (newBaseUrl.Contains("localhost:5000"))
        {
            newBaseUrl = newBaseUrl.Replace("localhost:5000", "127.0.0.1:5000");
        }

        var cleanUrl = newBaseUrl.TrimEnd('/');
        if (string.Equals(BaseUrl, cleanUrl, StringComparison.OrdinalIgnoreCase))
        {
            return; // URL không đổi, không cần khởi tạo lại
        }

        BaseUrl = cleanUrl;
        var existingAuth = _httpClient.DefaultRequestHeaders.Authorization;
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(BaseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };
        if (existingAuth != null)
        {
            _httpClient.DefaultRequestHeaders.Authorization = existingAuth;
        }
    }

    public void SetAuthToken(string? token)
    {
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

    public async Task<IReadOnlyList<LibraryGameDto>> GetLibraryAsync(CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync("/api/v1/library", ct);
        var responseString = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Không thể tải thư viện game ({response.StatusCode})");
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
        var response = await _httpClient.GetAsync($"/api/v1/library/{gameId}/download", ct);
        var responseString = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Không thể lấy link tải game ({response.StatusCode})");
        }

        var result = JsonSerializer.Deserialize<ApiResponse<DownloadLinkDto>>(responseString, JsonOptions);
        if (result?.Success == true && result.Data != null)
        {
            return result.Data;
        }

        throw new Exception(result?.Message ?? "Không tìm thấy file cài đặt của game này.");
    }

    public async Task RemoveFromLibraryAsync(Guid gameId, CancellationToken ct = default)
    {
        var response = await _httpClient.DeleteAsync($"/api/v1/library/{gameId}", ct);
        if (!response.IsSuccessStatusCode)
        {
            var responseString = await response.Content.ReadAsStringAsync(ct);
            throw new Exception($"Không thể xóa game khỏi thư viện ({response.StatusCode}): {responseString}");
        }
    }

    public async Task<UserDto?> GetProfileAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("/api/v1/users/me", ct);
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
