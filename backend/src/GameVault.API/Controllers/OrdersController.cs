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
[Authorize]
[Route("api/v1/orders")]
public class OrdersController(IOrderService orders, IPaymentService payments) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Create(CreateOrderRequest request, CancellationToken ct)
        => Ok(ApiResponse<OrderDto>.Ok(await orders.CreateAsync(UserId, request, ct)));

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<OrderDto>>>> List(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<OrderDto>>.Ok(await orders.GetByUserAsync(UserId, ct)));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<OrderDto>>> Get(Guid id, CancellationToken ct)
    {
        var order = await orders.GetByIdAsync(UserId, id, ct);
        return order is null ? NotFound() : Ok(ApiResponse<OrderDto>.Ok(order));
    }

    [HttpPost("{id:guid}/pay")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> Pay(Guid id, CancellationToken ct)
        => Ok(ApiResponse<PaymentDto>.Ok(await payments.InitiatePaymentAsync(UserId, id, ct)));

    [HttpPost("{id:guid}/resend")]
    public async Task<ActionResult<ApiResponse<object>>> ResendReceipt(Guid id, CancellationToken ct)
    {
        await orders.ResendReceiptEmailAsync(UserId, id, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("{id:guid}/cancel-request")]
    public async Task<ActionResult<ApiResponse<object>>> RequestCancellation(Guid id, RequestCancellationRequest request, CancellationToken ct)
    {
        await orders.RequestCancellationAsync(UserId, id, request, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<object>>> CancelPending(Guid id, CancellationToken ct)
    {
        await orders.CancelPendingOrderAsync(UserId, id, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}
