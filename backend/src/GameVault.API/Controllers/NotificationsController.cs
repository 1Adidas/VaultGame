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
[Route("api/v1/notifications")]
public class NotificationsController(INotificationService notifications) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<NotificationDto>>>> Get(CancellationToken ct)
        => Ok(ApiResponse<IReadOnlyList<NotificationDto>>.Ok(await notifications.GetAsync(UserId, ct)));

    [HttpPost("{id:guid}/read")]
    public async Task<ActionResult<ApiResponse<object>>> MarkRead(Guid id, CancellationToken ct)
    {
        await notifications.MarkReadAsync(UserId, id, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }

    [HttpDelete]
    public async Task<ActionResult<ApiResponse<object>>> ClearAll(CancellationToken ct)
    {
        await notifications.ClearAllAsync(UserId, ct);
        return Ok(ApiResponse<object>.Ok(new { success = true }));
    }
}
