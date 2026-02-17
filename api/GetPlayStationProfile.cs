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
/// Azure Function to fetch PlayStation profile data.
/// 
/// Uses the PSN internal API (same endpoints as the psn-api npm package) from C#.
/// Data is aggressively cached in Table Storage so that when the NPSSO token expires
/// (every ~60 days), the website continues to show the last known data.
/// 
/// The admin can refresh data by calling the /api/gaming/refresh endpoint
/// after obtaining a new NPSSO token.
/// 
/// Required environment variables:
/// - PSN_NPSSO_TOKEN: NPSSO token from https://ca.account.sony.com/api/v1/ssocookie
/// 
/// Flow:
/// 1. Exchange NPSSO token for access token (cached in memory for 1 hour)
/// 2. Fetch profile + trophies + recently played
/// 3. Cache everything in Table Storage
/// 4. If any step fails, return cached data
/// </summary>
public class GetPlayStationProfile
{
    private readonly ILogger<GetPlayStationProfile> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IGamingCacheService _cacheService;
    private readonly IMemoryCache _memoryCache;

    // JSON serialization with camelCase for frontend compatibility
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private const int MaxRequestsPerMinute = 10;
    private static readonly string? NpssoToken = Environment.GetEnvironmentVariable("PSN_NPSSO_TOKEN");

    // PSN API endpoints
    private const string AuthUrl = "https://ca.account.sony.com/api/authz/v3/oauth/authorize";
    private const string TokenUrl = "https://ca.account.sony.com/api/authz/v3/oauth/token";
    private const string TrophySummaryUrl = "https://m.np.playstation.com/api/trophy/v1/users/me/trophySummary";
    private const string TitleListUrl = "https://m.np.playstation.com/api/trophy/v1/users/me/trophyTitles";

    public GetPlayStationProfile(
        ILogger<GetPlayStationProfile> logger,
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
        var key = $"psn:ratelimit:{clientIp}";
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

    [Function("GetPlayStationProfile")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "gaming/playstation")] HttpRequestData req)
    {
        var clientIp = GetClientIp(req);
        _logger.LogInformation("GetPlayStationProfile triggered from IP: {ClientIp}", clientIp);

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
            // Try to fetch fresh data if token is available
            if (!string.IsNullOrEmpty(NpssoToken))
            {
                try
                {
                    var accessToken = await GetOrRefreshAccessToken();
                    if (accessToken != null)
                    {
                        var freshProfile = await FetchPlayStationProfile(accessToken);
                        if (freshProfile != null)
                        {
                            await _cacheService.SaveProfileAsync("playstation", freshProfile);

                            var okResponse = req.CreateResponse(HttpStatusCode.OK);
                            okResponse.Headers.Add("Content-Type", "application/json");
                            okResponse.Headers.Add("Cache-Control", "public, max-age=1800"); // 30 min
                            await okResponse.WriteStringAsync(JsonSerializer.Serialize(freshProfile, JsonOptions));
                            return okResponse;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "PSN API call failed, falling back to cache. Token may have expired.");
                }
            }

            // Fallback: return cached data (this is the key resilience feature)
            var cachedProfile = await _cacheService.GetProfileAsync("playstation");
            if (cachedProfile != null)
            {
                _logger.LogInformation("Returning cached PlayStation profile (last updated: {LastUpdated})",
                    cachedProfile.LastUpdated);

                var cachedResponse = req.CreateResponse(HttpStatusCode.OK);
                cachedResponse.Headers.Add("Content-Type", "application/json");
                cachedResponse.Headers.Add("Cache-Control", "public, max-age=3600");
                await cachedResponse.WriteStringAsync(JsonSerializer.Serialize(cachedProfile, JsonOptions));
                return cachedResponse;
            }

            var notFound = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            notFound.Headers.Add("Content-Type", "application/json");
            await notFound.WriteStringAsync(JsonSerializer.Serialize(new
            {
                error = "PlayStation profile data is not available. Please try again later."
            }));
            return notFound;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetPlayStationProfile");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            error.Headers.Add("Content-Type", "application/json");
            await error.WriteStringAsync(JsonSerializer.Serialize(new
            {
                error = "An error occurred loading PlayStation profile data."
            }));
            return error;
        }
    }

    /// <summary>
    /// Gets a cached access token or exchanges the NPSSO token for a new one.
    /// Access tokens are cached for 55 minutes (they expire in 60 minutes).
    /// </summary>
    private async Task<string?> GetOrRefreshAccessToken()
    {
        const string cacheKey = "psn:access_token";

        if (_memoryCache.TryGetValue(cacheKey, out string? cachedToken) && !string.IsNullOrEmpty(cachedToken))
        {
            return cachedToken;
        }

        _logger.LogInformation("Exchanging NPSSO token for PSN access token");

        var client = _httpClientFactory.CreateClient();

        // Step 1: Exchange NPSSO for authorization code
        var authRequest = new HttpRequestMessage(HttpMethod.Get, 
            $"{AuthUrl}?access_type=offline&client_id=09515159-7237-4370-9b40-3806e67c0891&response_type=code&scope=psn:mobile.v2.core psn:clientapp&redirect_uri=com.scee.psxandroid.scecompcall://redirect");
        authRequest.Headers.Add("Cookie", $"npsso={NpssoToken}");

        // Don't follow redirects - we need the code from the redirect URL
        var handler = new HttpClientHandler 
        { 
            AllowAutoRedirect = false,
            UseCookies = false
        };
        using var authClient = new HttpClient(handler);
        authClient.DefaultRequestHeaders.Add("Cookie", $"npsso={NpssoToken}");
        authClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Linux; Android 11; SDK) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36");
        authClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        authClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");

        _logger.LogInformation("Calling PSN auth endpoint");
        var authResponse = await authClient.GetAsync(authRequest.RequestUri);

        if (authResponse.StatusCode != HttpStatusCode.Redirect &&
            authResponse.StatusCode != HttpStatusCode.Found)
        {
            _logger.LogWarning("PSN auth failed with status {StatusCode}. NPSSO token may be expired.",
                authResponse.StatusCode);
            return null;
        }

        var redirectUri = authResponse.Headers.Location?.ToString();
        if (string.IsNullOrEmpty(redirectUri))
        {
            _logger.LogWarning("PSN auth redirect had no Location header");
            return null;
        }

        // Extract code from redirect URI
        var uri = new Uri(redirectUri);
        var queryParams = System.Web.HttpUtility.ParseQueryString(uri.Query);
        var code = queryParams["code"];

        if (string.IsNullOrEmpty(code))
        {
            _logger.LogWarning("PSN auth redirect had no code parameter");
            return null;
        }

        // Step 2: Exchange code for access token
        var tokenRequest = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["redirect_uri"] = "com.scee.psxandroid.scecompcall://redirect",
            ["grant_type"] = "authorization_code",
            ["token_format"] = "jwt"
        });

        client.DefaultRequestHeaders.Add("Authorization",
            "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=");

        var tokenResponse = await client.PostAsync(TokenUrl, tokenRequest);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("PSN token exchange failed: {StatusCode}", tokenResponse.StatusCode);
            return null;
        }

        var tokenJson = await tokenResponse.Content.ReadAsStringAsync();
        using var tokenDoc = JsonDocument.Parse(tokenJson);

        if (tokenDoc.RootElement.TryGetProperty("access_token", out var accessTokenProp))
        {
            var accessToken = accessTokenProp.GetString();
            if (!string.IsNullOrEmpty(accessToken))
            {
                // Cache for 55 minutes (tokens last 60 minutes)
                _memoryCache.Set(cacheKey, accessToken, TimeSpan.FromMinutes(55));
                _logger.LogInformation("Successfully obtained PSN access token");
                return accessToken;
            }
        }

        return null;
    }

    private async Task<GamingProfile?> FetchPlayStationProfile(string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

        var profile = new GamingProfile
        {
            Platform = "playstation",
            LastUpdated = DateTimeOffset.UtcNow,
            IsCached = false
        };

        // Fetch user profile - extract accountId from JWT token to get profile
        try
        {
            // The access token is a JWT - extract accountId from payload
            var accountId = ExtractAccountIdFromJwt(accessToken);
            if (!string.IsNullOrEmpty(accountId))
            {
                var profileUrl = $"https://m.np.playstation.com/api/userProfile/v1/internal/users/{accountId}/profiles";
                var profileResponse = await client.GetAsync(profileUrl);
                    
                if (profileResponse.IsSuccessStatusCode)
                {
                    var profileJson = await profileResponse.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(profileJson);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("onlineId", out var onlineId))
                        profile.OnlineId = onlineId.GetString();
                    if (root.TryGetProperty("personalDetail", out var personalDetail))
                    {
                        if (personalDetail.TryGetProperty("profilePicUrl", out var profilePicUrl))
                            profile.AvatarUrl = profilePicUrl.GetString();
                    }
                    if (root.TryGetProperty("avatarUrl", out var avatar))
                        profile.AvatarUrl = avatar.GetString();
                    // Try alternative avatar fields
                    if (string.IsNullOrEmpty(profile.AvatarUrl) &&
                        root.TryGetProperty("avatars", out var avatars) &&
                        avatars.GetArrayLength() > 0)
                    {
                        profile.AvatarUrl = avatars[0].TryGetProperty("url", out var url)
                            ? url.GetString() : null;
                    }
                    if (string.IsNullOrEmpty(profile.AvatarUrl) &&
                        root.TryGetProperty("avatarUrls", out var avatarUrls) &&
                        avatarUrls.GetArrayLength() > 0)
                    {
                        profile.AvatarUrl = avatarUrls[0].TryGetProperty("avatarUrl", out var aUrl)
                            ? aUrl.GetString() : null;
                    }
                }
            }
            else
            {
                _logger.LogWarning("Could not extract accountId from PSN access token");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch PSN user profile");
        }

        // Fetch trophy summary
        try
        {
            var trophyResponse = await client.GetAsync(TrophySummaryUrl);
            if (trophyResponse.IsSuccessStatusCode)
            {
                var json = await trophyResponse.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                profile.TrophySummary = new TrophySummary();

                if (root.TryGetProperty("trophyLevel", out var level))
                    profile.TrophyLevel = level.GetInt32();

                if (root.TryGetProperty("earnedTrophies", out var earned))
                {
                    if (earned.TryGetProperty("platinum", out var p)) profile.TrophySummary.Platinum = p.GetInt32();
                    if (earned.TryGetProperty("gold", out var g)) profile.TrophySummary.Gold = g.GetInt32();
                    if (earned.TryGetProperty("silver", out var s)) profile.TrophySummary.Silver = s.GetInt32();
                    if (earned.TryGetProperty("bronze", out var b)) profile.TrophySummary.Bronze = b.GetInt32();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch PSN trophy summary");
        }

        // Fetch recently played games (via trophy titles - lists games with trophy data)
        try
        {
            var titlesResponse = await client.GetAsync($"{TitleListUrl}?limit=8");
            if (titlesResponse.IsSuccessStatusCode)
            {
                var json = await titlesResponse.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.TryGetProperty("totalItemCount", out var totalCount))
                    profile.GamesPlayed = totalCount.GetInt32();

                if (root.TryGetProperty("trophyTitles", out var titles))
                {
                    foreach (var title in titles.EnumerateArray())
                    {
                        if (profile.RecentGames.Count >= 8) break;

                        var game = new RecentGame
                        {
                            Name = title.TryGetProperty("trophyTitleName", out var name)
                                ? name.GetString() ?? "Unknown"
                                : "Unknown",
                            Platform = "playstation"
                        };

                        if (title.TryGetProperty("trophyTitleIconUrl", out var icon))
                            game.ImageUrl = icon.GetString();

                        if (title.TryGetProperty("lastUpdatedDateTime", out var lastPlayed))
                            game.LastPlayed = lastPlayed.GetString();

                        // Capture npCommunicationId for PSN Store links
                        if (title.TryGetProperty("npCommunicationId", out var npId))
                            game.TitleId = npId.GetString();

                        profile.RecentGames.Add(game);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch PSN recently played games");
        }

        return profile;
    }

    /// <summary>
    /// Extracts the accountId from a PSN JWT access token.
    /// The JWT payload contains an "account_id" claim.
    /// </summary>
    private string? ExtractAccountIdFromJwt(string jwt)
    {
        try
        {
            var parts = jwt.Split('.');
            if (parts.Length < 2) return null;

            // Add padding if needed
            var payload = parts[1];
            switch (payload.Length % 4)
            {
                case 2: payload += "=="; break;
                case 3: payload += "="; break;
            }

            var jsonBytes = Convert.FromBase64String(payload.Replace('-', '+').Replace('_', '/'));
            var json = System.Text.Encoding.UTF8.GetString(jsonBytes);
            
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Try common claim names for account ID
            if (root.TryGetProperty("account_id", out var accountId))
                return accountId.GetString();
            if (root.TryGetProperty("sub", out var sub))
                return sub.GetString();
            if (root.TryGetProperty("user_id", out var userId))
                return userId.GetString();
                
            _logger.LogInformation("JWT payload keys: {Keys}", 
                string.Join(", ", root.EnumerateObject().Select(p => p.Name)));
                
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract accountId from JWT");
            return null;
        }
    }
}