using System.Security.Claims;
using System.Text.Json;
using System.IO;
using System.IO.Compression;
using GameVault.Application.Common;
using GameVault.Application.DTOs;
using GameVault.Application.Interfaces;
using GameVault.Infrastructure.Persistence;
using GameVault.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace GameVault.API.Controllers;

[ApiController]
[Route("api/v1/payments")]
public class PaymentsController(IPaymentService payments, SePaySimulatorService sepay) : ControllerBase
{
    [Authorize]
    [HttpGet("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<PaymentStatusDto>>> Status(Guid id, CancellationToken ct)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(ApiResponse<PaymentStatusDto>.Ok(await payments.GetStatusAsync(userId, id, ct)));
    }

    // SePay Webhook endpoints - supports root / (when ngrok routes root), /webhook, and /api/v1/webhooks/sepay
    [HttpPost("/")]
    [HttpPost("")]
    [HttpPost("/webhook")]
    [HttpPost("/webhooks")]
    [HttpPost("/api/webhook")]
    [HttpPost("/api/webhooks")]
    [HttpPost("/api/v1/webhooks/sepay")]
    [HttpPost("/api/v1/webhook/sepay")]
    [HttpPost("/api/v1/payments/webhook")]
    [HttpPost("/api/v1/payments/webhooks")]
    [HttpPost("webhooks/sepay")]
    [HttpPost("webhook/sepay")]
    public async Task<ActionResult> Webhook(CancellationToken ct)
    {
        if (!sepay.IsWebhookSecretConfigured)
        {
            return StatusCode(503, ApiResponse<object>.Fail("WEBHOOK_NOT_CONFIGURED", "SePay webhook secret is not configured"));
        }

        Request.EnableBuffering();

        using var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync(ct);
        Request.Body.Position = 0;

        bool isRequestAuthenticated = false;
        if (Request.Headers.TryGetValue("X-SePay-Signature", out var signatureHeader))
        {
            Request.Headers.TryGetValue("X-SePay-Timestamp", out var timestampHeader);
            if (!sepay.VerifySePayWebhookSignature(rawBody, signatureHeader.ToString(), timestampHeader.ToString()))
            {
                return Unauthorized(ApiResponse<object>.Fail("WEBHOOK_INVALID", "Invalid signature"));
            }
            isRequestAuthenticated = true;
        }
        else if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            if (!sepay.VerifyApiKey(authHeader.ToString()))
            {
                return Unauthorized(ApiResponse<object>.Fail("WEBHOOK_INVALID", "Invalid API key"));
            }
            isRequestAuthenticated = true;
        }

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        SePayWebhookBody? sePayBody = null;
        try
        {
            sePayBody = JsonSerializer.Deserialize<SePayWebhookBody>(rawBody, options);
        }
        catch { }

        if (sePayBody != null && (sePayBody.TransferAmount > 0 || !string.IsNullOrEmpty(sePayBody.Content) || !string.IsNullOrEmpty(sePayBody.Code)))
        {
            if (!isRequestAuthenticated)
            {
                return Unauthorized(ApiResponse<object>.Fail("WEBHOOK_UNAUTHORIZED", "Missing webhook signature or API key"));
            }

            if (!string.IsNullOrWhiteSpace(sePayBody.TransferType) &&
                !string.Equals(sePayBody.TransferType, "in", StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new { success = true, ignored = true });
            }

            var orderCode = sePayBody.Code ?? "";
            if (string.IsNullOrEmpty(orderCode) && !string.IsNullOrEmpty(sePayBody.Content))
            {
                var match = System.Text.RegularExpressions.Regex.Match(sePayBody.Content, @"\bGV[A-Za-z0-9]{8}\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (!match.Success)
                {
                    match = System.Text.RegularExpressions.Regex.Match(sePayBody.Content, @"\b[A-Za-z0-9]{8,10}\b");
                }
                if (match.Success)
                {
                    orderCode = match.Value.ToUpper();
                }
            }

            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var txId = sePayBody.Id > 0 ? sePayBody.Id.ToString() : (sePayBody.ReferenceCode ?? Guid.NewGuid().ToString("n")[..8].ToUpper());
            var payload = new SePayWebhookPayload(
                TransactionId: txId,
                OrderCode: orderCode,
                Amount: sePayBody.TransferAmount,
                Status: "success",
                Timestamp: timestamp,
                Signature: sepay.ComputeSignature(txId, orderCode, sePayBody.TransferAmount, timestamp)
            );

            await payments.HandleWebhookAsync(payload, ct);
            return Ok(new { success = true, received = true });
        }

        SePayWebhookPayload? directPayload = null;
        try
        {
            directPayload = JsonSerializer.Deserialize<SePayWebhookPayload>(rawBody, options);
        }
        catch { }

        if (directPayload == null || string.IsNullOrWhiteSpace(directPayload.OrderCode))
        {
            return BadRequest(ApiResponse<object>.Fail("INVALID_BODY", "Invalid request payload"));
        }

        if (!isRequestAuthenticated)
        {
            if (!sepay.VerifySignature(directPayload))
            {
                return Unauthorized(ApiResponse<object>.Fail("WEBHOOK_INVALID", "Missing or invalid webhook signature"));
            }
        }
        else if (string.IsNullOrWhiteSpace(directPayload.Signature))
        {
            directPayload = directPayload with
            {
                Signature = sepay.ComputeSignature(directPayload.TransactionId, directPayload.OrderCode, directPayload.Amount, directPayload.Timestamp)
            };
        }

        await payments.HandleWebhookAsync(directPayload, ct);
        return Ok(new { success = true, received = true });
    }
}
