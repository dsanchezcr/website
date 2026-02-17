using Azure;
using Azure.Data.Tables;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace api.Services;

/// <summary>
/// Models for gaming profile data returned by the API.
/// </summary>
public class GamingProfile
{
    public string Platform { get; set; } = string.Empty;
    public string? Gamertag { get; set; }
    public string? OnlineId { get; set; }
    public string? AvatarUrl { get; set; }
    public int? Gamerscore { get; set; }
    public int? GamesPlayed { get; set; }
    public string? AccountTier { get; set; }
    public int? TrophyLevel { get; set; }
    public TrophySummary? TrophySummary { get; set; }
    public List<RecentGame> RecentGames { get; set; } = new();
    public DateTimeOffset LastUpdated { get; set; } = DateTimeOffset.UtcNow;
    public bool IsCached { get; set; }
}

public class TrophySummary
{
    public int Platinum { get; set; }
    public int Gold { get; set; }
    public int Silver { get; set; }
    public int Bronze { get; set; }
}

public class RecentGame
{
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? LastPlayed { get; set; }
    public string? TitleId { get; set; }
    public string? Platform { get; set; }
}

/// <summary>
/// Service for caching gaming profile data in Azure Table Storage.
/// Uses Table Storage for persistence so data survives function app restarts,
/// and in-memory cache for fast reads. Falls back to cached data when APIs are unavailable.
/// </summary>
public interface IGamingCacheService
{
    Task<GamingProfile?> GetProfileAsync(string platform);
    Task SaveProfileAsync(string platform, GamingProfile profile);
    Task<(bool IsHealthy, string Message)> CheckHealthAsync();
}

/// <summary>
/// Table Storage entity for persisting gaming profile data.
/// </summary>
public class GamingProfileEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "gaming";
    public string RowKey { get; set; } = string.Empty; // platform name
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    /// <summary>JSON-serialized GamingProfile data</summary>
    public string ProfileJson { get; set; } = string.Empty;
    public DateTimeOffset LastUpdated { get; set; }
}

/// <summary>
/// Azure Table Storage implementation with in-memory cache layer.
/// </summary>
public class TableStorageGamingCacheService : IGamingCacheService
{
    private readonly TableClient _tableClient;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<TableStorageGamingCacheService> _logger;
    private const string TableName = "GamingProfiles";
    private const string PartitionKey = "gaming";
    private static readonly TimeSpan MemoryCacheDuration = TimeSpan.FromMinutes(30);

    public TableStorageGamingCacheService(
        string connectionString,
        IMemoryCache memoryCache,
        ILogger<TableStorageGamingCacheService> logger)
    {
        _memoryCache = memoryCache;
        _logger = logger;

        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task<GamingProfile?> GetProfileAsync(string platform)
    {
        var cacheKey = $"gaming:{platform}";

        // Try memory cache first (fast path)
        if (_memoryCache.TryGetValue(cacheKey, out GamingProfile? cached) && cached != null)
        {
            cached.IsCached = true;
            return cached;
        }

        // Fall back to Table Storage (persistent)
        try
        {
            var response = await _tableClient.GetEntityIfExistsAsync<GamingProfileEntity>(
                PartitionKey, platform);

            if (response.HasValue && response.Value != null)
            {
                var profile = JsonSerializer.Deserialize<GamingProfile>(
                    response.Value.ProfileJson);

                if (profile != null)
                {
                    profile.IsCached = true;
                    // Repopulate memory cache
                    _memoryCache.Set(cacheKey, profile, MemoryCacheDuration);
                    _logger.LogInformation("Loaded {Platform} profile from Table Storage (last updated: {LastUpdated})",
                        platform, response.Value.LastUpdated);
                    return profile;
                }
            }
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            _logger.LogInformation("No cached profile found for {Platform}", platform);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read {Platform} profile from Table Storage", platform);
        }

        return null;
    }

    public async Task SaveProfileAsync(string platform, GamingProfile profile)
    {
        var cacheKey = $"gaming:{platform}";
        profile.LastUpdated = DateTimeOffset.UtcNow;
        profile.IsCached = false;

        // Save to memory cache
        _memoryCache.Set(cacheKey, profile, MemoryCacheDuration);

        // Persist to Table Storage
        try
        {
            var entity = new GamingProfileEntity
            {
                PartitionKey = PartitionKey,
                RowKey = platform,
                ProfileJson = JsonSerializer.Serialize(profile),
                LastUpdated = DateTimeOffset.UtcNow
            };

            await _tableClient.UpsertEntityAsync(entity);
            _logger.LogInformation("Saved {Platform} profile to Table Storage", platform);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save {Platform} profile to Table Storage", platform);
            // Data is still in memory cache, so reads will work until next restart
        }
    }

    public async Task<(bool IsHealthy, string Message)> CheckHealthAsync()
    {
        try
        {
            await foreach (var _ in _tableClient.QueryAsync<TableEntity>(
                e => e.PartitionKey == "health_check_probe", maxPerPage: 1))
            {
                break;
            }
            return (true, "Gaming cache (Table Storage) operational");
        }
        catch (Exception ex)
        {
            return (false, $"Gaming cache error: {ex.Message}");
        }
    }
}

/// <summary>
/// In-memory fallback for local development when Table Storage is not configured.
/// </summary>
public class InMemoryGamingCacheService : IGamingCacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<InMemoryGamingCacheService> _logger;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

    public InMemoryGamingCacheService(IMemoryCache memoryCache, ILogger<InMemoryGamingCacheService> logger)
    {
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public Task<GamingProfile?> GetProfileAsync(string platform)
    {
        var cacheKey = $"gaming:{platform}";
        if (_memoryCache.TryGetValue(cacheKey, out GamingProfile? cached) && cached != null)
        {
            cached.IsCached = true;
            return Task.FromResult<GamingProfile?>(cached);
        }
        return Task.FromResult<GamingProfile?>(null);
    }

    public Task SaveProfileAsync(string platform, GamingProfile profile)
    {
        var cacheKey = $"gaming:{platform}";
        profile.LastUpdated = DateTimeOffset.UtcNow;
        profile.IsCached = false;
        _memoryCache.Set(cacheKey, profile, CacheDuration);
        _logger.LogInformation("Saved {Platform} profile to in-memory cache", platform);
        return Task.CompletedTask;
    }

    public Task<(bool IsHealthy, string Message)> CheckHealthAsync()
    {
        return Task.FromResult((true, "Gaming cache (in-memory, dev mode)"));
    }
}
