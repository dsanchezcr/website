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

namespace api.Services;
/// <summary>
/// Fetches Xbox profile data via OpenXBL and saves successful responses.
/// 
/// Required environment variables:
/// - XBOX_API_KEY: API key from https://xbl.io
/// - XBOX_GAMERTAG_XUID: Your Xbox User ID (XUID)
/// </summary>
public class XboxProfileService : IGamingProfileService
{
    private readonly ILogger<XboxProfileService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IGamingCacheService _cacheService;
    private string? ApiKey => Environment.GetEnvironmentVariable("XBOX_API_KEY");
    private string? Xuid => Environment.GetEnvironmentVariable("XBOX_GAMERTAG_XUID");
    private const string OpenXblBaseUrl = "https://xbl.io/api/v2";
    public string Platform => "xbox";

    private static string? EnsureHttps(string? url)
        => url?.StartsWith("http://", StringComparison.OrdinalIgnoreCase) == true
            ? "https://" + url[7..]
            : url;

    public XboxProfileService(
        ILogger<XboxProfileService> logger,
        IHttpClientFactory httpClientFactory,
        IGamingCacheService cacheService)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _cacheService = cacheService;
    }

    public async Task<GamingProfile> RefreshAsync(bool renewCredentials, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(ApiKey) || string.IsNullOrWhiteSpace(Xuid))
            throw new InvalidOperationException("Configure XBOX_API_KEY and XBOX_GAMERTAG_XUID in the server app settings.");
        var profile = await FetchXboxProfileFromApi(renewCredentials, ct)
            ?? throw new HttpRequestException("Xbox did not return a usable profile.");
        ct.ThrowIfCancellationRequested();
        await _cacheService.SaveProfileAsync(Platform, profile, ct);
        return profile;
    }

    private async Task<GamingProfile?> FetchXboxProfileFromApi(bool strict, CancellationToken ct)
    {
        using var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);
        client.DefaultRequestHeaders.Add("X-Authorization", ApiKey);
        client.DefaultRequestHeaders.Add("Accept", "application/json");

        // Fetch profile data
        using var profileResponse = await client.GetAsync($"{OpenXblBaseUrl}/account/{Xuid}", ct);
        if (!profileResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("Xbox API profile request failed: {StatusCode}", profileResponse.StatusCode);
            return null;
        }

        var profileJson = await profileResponse.Content.ReadAsStringAsync(ct);
        
        // Log raw response for debugging API format changes (debug level only to avoid leaking PII at information level)
        if (_logger.IsEnabled(LogLevel.Debug))
        {
            _logger.LogDebug(
                "Xbox API raw response length {Length}. First 500 chars: {ResponseSnippet}",
                profileJson.Length,
                profileJson.Length > 500 ? profileJson[..500] : profileJson);
        }

        using var profileDoc = JsonDocument.Parse(profileJson);
        var profileRoot = profileDoc.RootElement;

        // Check for API error responses (OpenXBL may return 200 with error in body)
        if (profileRoot.TryGetProperty("error", out var errorProp))
        {
            _logger.LogWarning("Xbox API returned error: {Error}", errorProp.ToString());
            return null;
        }
        // OpenXBL returns {"content":{},"code":401} for auth errors
        if (profileRoot.TryGetProperty("code", out var codeProp))
        {
            if (!codeProp.TryGetInt32(out var code))
                code = -1;
            if (code >= 400)
            {
                var desc = profileRoot.TryGetProperty("description", out var descProp) 
                    ? descProp.ToString() 
                    : "No description";
                _logger.LogWarning("Xbox API returned error code {Code}: {Description}. API key may be expired - renew at https://xbl.io", 
                    code, desc);
                return null;
            }
        }

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
        // Response may be at root or nested under "content"
        JsonElement? profileUsersElement = null;
        if (profileRoot.TryGetProperty("profileUsers", out var directUsers))
            profileUsersElement = directUsers;
        else if (profileRoot.TryGetProperty("content", out var content) &&
                 content.TryGetProperty("profileUsers", out var nestedUsers))
            profileUsersElement = nestedUsers;

        if (string.IsNullOrEmpty(profile.Gamertag) && 
            profileUsersElement.HasValue &&
            profileUsersElement.Value.GetArrayLength() > 0)
        {
            var user = profileUsersElement.Value[0];
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
                        case "TenureLevel":
                            if (int.TryParse(value, out var tenure))
                                profile.TenureLevel = tenure;
                            break;
                    }
                }
            }
        }

        // Fetch recently played games
        try
        {
            using var gamesResponse = await client.GetAsync($"{OpenXblBaseUrl}/achievements/player/{Xuid}", ct);
            if (strict) gamesResponse.EnsureSuccessStatusCode();
            if (gamesResponse.IsSuccessStatusCode)
            {
                var gamesJson = await gamesResponse.Content.ReadAsStringAsync(ct);
                
                // Log first part of games response for debugging
                _logger.LogInformation("Xbox Games API raw response (first 500 chars): {Response}", 
                    gamesJson.Length > 500 ? gamesJson[..500] : gamesJson);
                
                using var gamesDoc = JsonDocument.Parse(gamesJson);
                var gamesRoot = gamesDoc.RootElement;

                // Titles may be at root or nested under "content"
                JsonElement? titlesElement = null;
                if (gamesRoot.TryGetProperty("titles", out var directTitles))
                    titlesElement = directTitles;
                else if (gamesRoot.TryGetProperty("content", out var gamesContent) &&
                         gamesContent.TryGetProperty("titles", out var nestedTitles))
                    titlesElement = nestedTitles;

                if (titlesElement.HasValue)
                {
                    var titles = titlesElement.Value;
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
                    _logger.LogInformation("Parsed {GamesPlayed} total games, {RecentCount} recent games", 
                        profile.GamesPlayed, profile.RecentGames.Count);
                }
                else
                {
                    _logger.LogWarning("Xbox games response did not contain 'titles' property");
                    if (strict) throw new HttpRequestException("Xbox games response was incomplete.");
                }
            }
            else
            {
                _logger.LogWarning("Xbox games API failed: {StatusCode}", gamesResponse.StatusCode);
            }
        }
        catch (Exception ex) when (!strict && ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Failed to fetch Xbox recent games");
        }

        // Validate that we actually parsed useful data before returning
        // If gamertag is missing, the API response format may have changed or there was an auth issue
        if (string.IsNullOrEmpty(profile.Gamertag))
        {
            _logger.LogWarning("Xbox API returned response but gamertag could not be parsed - falling back to cache");
            return null;
        }

        _logger.LogInformation("Successfully parsed Xbox profile for {Gamertag} with {GamesCount} recent games",
            profile.Gamertag, profile.RecentGames.Count);

        return profile;
    }
}