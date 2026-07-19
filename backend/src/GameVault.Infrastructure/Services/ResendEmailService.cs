using System.Net.Http.Json;
using GameVault.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace GameVault.Infrastructure.Services;

public class ResendEmailService(IConfiguration config) : IEmailService
{
    private static readonly HttpClient _httpClient = new();

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        var apiKey = config["Resend:ApiKey"];
        var fromEmail = config["Resend:FromEmail"] ?? "noreply@gamevault.com";
        var fromName = config["Resend:FromName"] ?? "GameVault";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_RESEND_KEY")
        {
            Console.WriteLine($"📧 [EMAIL SKIP] Resend API key not configured. Would send to: {to} | Subject: {subject}");
            return;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Add("Authorization", $"Bearer {apiKey.Trim()}");

            var body = new
            {
                from = $"{fromName} <{fromEmail}>",
                to = new[] { to },
                subject,
                html = htmlBody
            };

            request.Content = JsonContent.Create(body);
            var response = await _httpClient.SendAsync(request, ct);

            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine($"📧 [EMAIL SENT] To: {to} | Subject: {subject}");
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync(ct);
                Console.WriteLine($"📧 [EMAIL FAILED] To: {to} | Status: {(int)response.StatusCode} | Error: {error}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"📧 [EMAIL ERROR] To: {to} | Error: {ex.Message}");
        }
    }
}
