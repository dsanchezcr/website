using Microsoft.Extensions.Caching.Memory;

namespace api.Services;

/// <summary>
/// Thread-safe rate limiting service using atomic operations on counters.
/// Prevents race conditions by using a dedicated counter class with interlocked increment.
/// </summary>
public interface IRateLimitService
{
    /// <summary>
    /// Checks if the request should be rate limited.
    /// Atomically increments the counter if the limit has not been exceeded.
    /// </summary>
    /// <param name="key">The rate limit key (e.g., "xbox:ratelimit:{clientIp}")</param>
    /// <param name="maxRequests">Maximum requests allowed in the window</param>
    /// <param name="window">Time window for the rate limit</param>
    /// <returns>True if rate limited, false if request allowed</returns>
    bool IsRateLimited(string key, int maxRequests, TimeSpan window);
}

/// <summary>
/// Thread-safe counter for atomic increments.
/// </summary>
internal sealed class AtomicCounter
{
    private int _count;
    public int Count => _count;

    public int Increment() => Interlocked.Increment(ref _count);
}

/// <summary>
/// Memory cache-based rate limiter with atomic operations to prevent race conditions.
/// </summary>
public class MemoryCacheRateLimitService : IRateLimitService
{
    private readonly IMemoryCache _cache;

    public MemoryCacheRateLimitService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public bool IsRateLimited(string key, int maxRequests, TimeSpan window)
    {
        // Get or create an atomic counter for this key
        var counter = _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = window;
            return new AtomicCounter();
        })!;

        // Atomically increment and check limit
        var newCount = counter.Increment();
        return newCount > maxRequests;
    }
}
