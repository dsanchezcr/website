using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using api.Services;

namespace api;
/// <summary>
/// Azure Function to fetch Xbox profile data via the OpenXBL API.
/// Returns live data when available, falls back to cached data when API is unavailable.
/// 
/// Required environment variables:
/// - XBOX_API_KEY: API key from https://xbl.io
/// - XBOX_GAMERTAG_XUID: Your Xbox User ID (XUID)
/// </summary>
public class GetXboxProfile
{
    private readonly ILogger<GetXboxProfile> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IGamingCacheService _cacheService;
    private readonly IMemoryCache _memoryCache;

    // JSON serialization with camelCase for frontend compatibility
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // Rate limiting: 10 requests per minute per IP
    private const int MaxRequestsPerMinute = 10;

    private static readonly string? ApiKey = Environment.GetEnvironmentVariable("XBOX_API_KEY");
    private static readonly string? Xuid = Environment.GetEnvironmentVariable("XBOX_GAMERTAG_XUID");
    private const string OpenXblBaseUrl = "https://xbl.io/api/v2";

/// <summary>Ensures image URLs use HTTPS to comply with Content-Security-Policy.</summary>
private static string? EnsureHttps(string? url)
    => url?.StartsWith("http://", StringComparison.OrdinalIgnoreCase) == true
        ? "https://" + url[7..]
        : url;

    public GetXboxProfile(
        ILogger<GetXboxProfile> logger,
        IHttpClientFactory httpClientFactory,
        IGamingCacheService cacheService,
        IMemoryCache memoryCache)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _cacheService = cacheService;
        _memoryCache = memoryCache;
    }

    private bool CheckRateLimit(string clientIp)
    {
        var key = $"xbox:ratelimit:{clientIp}";
        var counter = _memoryCache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return 0;
        });

        if (counter >= MaxRequestsPerMinute) return true;

        _memoryCache.Set(key, counter + 1, TimeSpan.FromMinutes(1));
        return false;
    }

    private static string GetClientIp(HttpRequestData req)
    {
        if (req.Headers.TryGetValues("X-Forwarded-For", out var forwarded))
            return forwarded.First().Split(',')[0].Trim();
        if (req.Headers.TryGetValues("X-Real-IP", out var realIp))
            return realIp.First();
        return "unknown";
    }

    [Function("GetXboxProfile")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "gaming/xbox")] HttpRequestData req)
    {
        var clientIp = GetClientIp(req);
        _logger.LogInformation("GetXboxProfile triggered from IP: {ClientIp}", clientIp);

        // Rate limiting
        if (CheckRateLimit(clientIp))
        {
            var tooMany = req.CreateResponse(HttpStatusCode.TooManyRequests);
            tooMany.Headers.Add("Content-Type", "application/json");
            tooMany.Headers.Add("Retry-After", "60");
            await tooMany.WriteStringAsync(JsonSerializer.Serialize(new { error = "Too many requests." }));
            return tooMany;
        }

        try
        {
            // Try to fetch fresh data from Xbox Live API
            if (!string.IsNullOrEmpty(ApiKey) && !string.IsNullOrEmpty(Xuid))
            {
                try
                {
                    var freshProfile = await FetchXboxProfileFromApi();
                    if (freshProfile != null)
                    {
                        // Save to cache for future fallback
                        await _cacheService.SaveProfileAsync("xbox", freshProfile);

                        var okResponse = req.CreateResponse(HttpStatusCode.OK);
                        okResponse.Headers.Add("Content-Type", "application/json");
                        okResponse.Headers.Add("Cache-Control", "public, max-age=900"); // 15 min browser cache
                        await okResponse.WriteStringAsync(JsonSerializer.Serialize(freshProfile, JsonOptions));
                        return okResponse;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Xbox Live API call failed, falling back to cache");
                }
            }

            // Fallback: return cached data
            var cachedProfile = await _cacheService.GetProfileAsync("xbox");
            if (cachedProfile != null)
            {
                _logger.LogInformation("Returning cached Xbox profile (last updated: {LastUpdated})",
                    cachedProfile.LastUpdated);

                var cachedResponse = req.CreateResponse(HttpStatusCode.OK);
                cachedResponse.Headers.Add("Content-Type", "application/json");
                cachedResponse.Headers.Add("Cache-Control", "public, max-age=3600"); // 1 hour for cached data
                await cachedResponse.WriteStringAsync(JsonSerializer.Serialize(cachedProfile, JsonOptions));
                return cachedResponse;
            }

            // No data available at all
            var notFound = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            notFound.Headers.Add("Content-Type", "application/json");
            await notFound.WriteStringAsync(JsonSerializer.Serialize(new
            {
                error = "Xbox profile data is not available. Please try again later."
            }));
            return notFound;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetXboxProfile");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            error.Headers.Add("Content-Type", "application/json");
            await error.WriteStringAsync(JsonSerializer.Serialize(new
            {
                error = "An error occurred loading Xbox profile data."
            }));
            return error;
        }
    }

    private async Task<GamingProfile?> FetchXboxProfileFromApi()
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Authorization", ApiKey);
        client.DefaultRequestHeaders.Add("Accept", "application/json");

        // Fetch profile data
        var profileResponse = await client.GetAsync($"{OpenXblBaseUrl}/account/{Xuid}");
        if (!profileResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("Xbox API profile request failed: {StatusCode}", profileResponse.StatusCode);
            return null;
        }

        var profileJson = await profileResponse.Content.ReadAsStringAsync();
        using var profileDoc = JsonDocument.Parse(profileJson);
        var profileRoot = profileDoc.RootElement;

        var profile = new GamingProfile
        {
            Platform = "xbox",
            LastUpdated = DateTimeOffset.UtcNow,
            IsCached = false
        };

        // Parse profile data from OpenXBL response
        // Try direct properties first (newer API format)
        if (profileRoot.TryGetProperty("gamertag", out var gamertagProp))
            profile.Gamertag = gamertagProp.GetString();
        if (profileRoot.TryGetProperty("gamerscore", out var gamerscoreProp))
            profile.Gamerscore = gamerscoreProp.GetInt32();
        if (profileRoot.TryGetProperty("accountTier", out var tierProp))
            profile.AccountTier = tierProp.GetString();
        if (profileRoot.TryGetProperty("displayPicRaw", out var picProp))
        profile.AvatarUrl = EnsureHttps(picProp.GetString());
        // Fallback: Try Xbox Live API format (profileUsers array)
        if (string.IsNullOrEmpty(profile.Gamertag) && 
            profileRoot.TryGetProperty("profileUsers", out var profileUsers) &&
            profileUsers.GetArrayLength() > 0)
        {
            var user = profileUsers[0];
            if (user.TryGetProperty("settings", out var settings))
            {
                foreach (var setting in settings.EnumerateArray())
                {
                    var id = setting.GetProperty("id").GetString();
                    var value = setting.GetProperty("value").GetString();

                    switch (id)
                    {
                        case "Gamertag":
                            profile.Gamertag = value;
                            break;
                        case "GameDisplayPicRaw":
                            profile.AvatarUrl = EnsureHttps(value);
                            break;
                        case "Gamerscore":
                            if (int.TryParse(value, out var gs))
                                profile.Gamerscore = gs;
                            break;
                        case "AccountTier":
                            profile.AccountTier = value;
                            break;
                    }
                }
            }
        }

        _logger.LogInformation("Parsed Xbox profile: {Gamertag}", profile.Gamertag ?? "unknown");

        // Fetch recently played games
        try
        {
            var gamesResponse = await client.GetAsync($"{OpenXblBaseUrl}/achievements/player/{Xuid}");
            if (gamesResponse.IsSuccessStatusCode)
            {
                var gamesJson = await gamesResponse.Content.ReadAsStringAsync();
                using var gamesDoc = JsonDocument.Parse(gamesJson);
                var gamesRoot = gamesDoc.RootElement;

                if (gamesRoot.TryGetProperty("titles", out var titles))
                {
                    var gameCount = 0;
                    foreach (var title in titles.EnumerateArray())
                    {
                        if (gameCount >= 8) break;

                        // Only include actual games (skip apps)
                        var type = title.TryGetProperty("type", out var typeProp) 
                            ? typeProp.GetString() : null;
                        if (type != null && type != "Game") continue;

                        var game = new RecentGame
                        {
                            Name = title.TryGetProperty("name", out var name)
                                ? name.GetString() ?? "Unknown"
                                : "Unknown",
                            Platform = "xbox"
                        };

                        if (title.TryGetProperty("displayImage", out var img))
                        game.ImageUrl = EnsureHttps(img.GetString());
                        if (title.TryGetProperty("titleHistory", out var history) &&
                            history.TryGetProperty("lastTimePlayed", out var lastPlayed))
                            game.LastPlayed = lastPlayed.GetString();

                        // Capture titleId for Xbox Store links
                        if (title.TryGetProperty("pfn", out var pfn))
                            game.TitleId = pfn.GetString();

                        profile.RecentGames.Add(game);
                        gameCount++;
                    }

                    profile.GamesPlayed = titles.GetArrayLength();
                }
            }
            else
            {
                _logger.LogWarning("Xbox games API failed: {StatusCode}", gamesResponse.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch Xbox recent games");
        }

        return profile;
    }
}