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
[Route("api/v1/dev")]
public class DevController(IPaymentService payments, IHostEnvironment env) : ControllerBase
{
    [HttpPost("simulate-payment/{paymentId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> SimulatePayment(Guid paymentId, CancellationToken ct)
    {
        if (!env.IsDevelopment()) return NotFound();
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var isAdmin = User.IsInRole("Admin");
        await payments.SimulatePaymentAsync(paymentId, userId, isAdmin, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}
