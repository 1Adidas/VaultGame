using System.Threading;
using GameVault.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace GameVault.Infrastructure.Services;

public class MemoryCacheService(IMemoryCache cache) : ICacheService
{
    private static int _gamesVersion = 1;

    public async Task<T?> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null)
    {
        if (cache.TryGetValue(key, out T? value) && value is not null)
        {
            return value;
        }

        var result = await factory();
        if (result is not null)
        {
            var options = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(5)
            };
            cache.Set(key, result, options);
        }

        return result;
    }

    public T? Get<T>(string key)
    {
        return cache.TryGetValue(key, out T? value) ? value : default;
    }

    public void Set<T>(string key, T value, TimeSpan? expiration = null)
    {
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration ?? TimeSpan.FromMinutes(5)
        };
        cache.Set(key, value, options);
    }

    public void Remove(string key)
    {
        cache.Remove(key);
    }

    public void InvalidateGames()
    {
        Interlocked.Increment(ref _gamesVersion);
        cache.Remove("categories:all");
        cache.Remove("tags:all");
    }

    public int GetGamesVersion() => Volatile.Read(ref _gamesVersion);
}
