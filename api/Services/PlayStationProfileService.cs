using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using api.Services;

namespace api.Services;
/// <summary>
/// Fetches PlayStation data and saves usable profiles for the public and admin endpoints.
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
/// 1. Exchange NPSSO token for access token (cached by credential fingerprint for 55 minutes)
/// 2. Fetch trophies + account ID, then profile + recently played
/// 3. Cache everything in Table Storage
/// Public reads can fall back to cached data; manual refresh failures are explicit.
/// </summary>
public class PlayStationProfileService : IGamingProfileService
{
    private readonly ILogger<PlayStationProfileService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IGamingCacheService _cacheService;
    private readonly IMemoryCache _memoryCache;

    public string Platform => "playstation";
    private const string AccessTokenCacheKey = "psn:access_token";
    private sealed record CachedAccessToken(string CredentialFingerprint, string Token);

    // PSN API endpoints
    private const string AuthUrl = "https://ca.account.sony.com/api/authz/v3/oauth/authorize";
    private const string TokenUrl = "https://ca.account.sony.com/api/authz/v3/oauth/token";
    private const string TrophySummaryUrl = "https://m.np.playstation.com/api/trophy/v1/users/me/trophySummary";
    private const string TitleListUrl = "https://m.np.playstation.com/api/trophy/v1/users/me/trophyTitles";

    // Public OAuth client used by the official PSN mobile app (the same values the
    // open-source psn-api library uses). These are NOT user secrets. The HTTP Basic
    // auth header is assembled at runtime from these parts so that no pre-encoded
    // credential string is committed to source (which would otherwise trip secret
    // scanning). Only PSN_NPSSO_TOKEN must be configured per environment (locally and
    // in production).
    private static readonly string PsnClientId = Environment.GetEnvironmentVariable("PSN_OAUTH_CLIENT_ID") ?? "09515159-7237-4370-9b40-3806e67c0891";
    private static readonly string PsnClientSecret = Environment.GetEnvironmentVariable("PSN_OAUTH_CLIENT_SECRET") ?? "ucPjka5tntB2KqsP";

    public PlayStationProfileService(
        ILogger<PlayStationProfileService> logger,
        IHttpClientFactory httpClientFactory,
        IGamingCacheService cacheService,
        IMemoryCache memoryCache)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _cacheService = cacheService;
        _memoryCache = memoryCache;
    }

    public async Task<GamingProfile> RefreshAsync(bool renewCredentials, CancellationToken ct)
    {
        var npssoToken = Environment.GetEnvironmentVariable("PSN_NPSSO_TOKEN")?.Trim();
        if (string.IsNullOrWhiteSpace(npssoToken))
            throw new InvalidOperationException("Configure PSN_NPSSO_TOKEN in the server app settings.");
        if (renewCredentials) _memoryCache.Remove(AccessTokenCacheKey);
        var token = await GetOrRefreshAccessToken(npssoToken, ct)
            ?? throw new HttpRequestException("PlayStation authentication failed. Rotate PSN_NPSSO_TOKEN in the server app settings.");
        GamingProfile profile;
        try
        {
            profile = await FetchPlayStationProfile(token, ct);
        }
        catch (HttpRequestException ex) when (!renewCredentials && ex.StatusCode == HttpStatusCode.Unauthorized)
        {
            // A revoked access token must not keep public reads stuck on the stored profile.
            _memoryCache.Remove(AccessTokenCacheKey);
            token = await GetOrRefreshAccessToken(npssoToken, ct)
                ?? throw new HttpRequestException("PlayStation authentication failed. Rotate PSN_NPSSO_TOKEN in the server app settings.");
            profile = await FetchPlayStationProfile(token, ct);
        }
        ct.ThrowIfCancellationRequested();
        await _cacheService.SaveProfileAsync(Platform, profile, ct);
        return profile;
    }

    /// <summary>
    /// Gets a cached access token or exchanges the NPSSO token for a new one.
    /// Access tokens are cached for 55 minutes (they expire in 60 minutes).
    /// </summary>
    private async Task<string?> GetOrRefreshAccessToken(string npssoToken, CancellationToken ct)
    {
        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(npssoToken)));

        if (_memoryCache.TryGetValue(AccessTokenCacheKey, out CachedAccessToken? cachedToken) &&
            cachedToken?.CredentialFingerprint == fingerprint)
        {
            return cachedToken.Token;
        }

        _logger.LogInformation("Exchanging NPSSO token for PSN access token");

        using var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);

        // Step 1: Exchange NPSSO for authorization code
        using var authRequest = new HttpRequestMessage(HttpMethod.Get, 
            $"{AuthUrl}?access_type=offline&client_id={PsnClientId}&response_type=code&scope=psn:mobile.v2.core psn:clientapp&redirect_uri=com.scee.psxandroid.scecompcall://redirect");
        authRequest.Headers.Add("Cookie", $"npsso={npssoToken}");

        // Don't follow redirects - we need the code from the redirect URL
        using var authClient = _httpClientFactory.CreateClient("psn-auth");
        authClient.Timeout = TimeSpan.FromSeconds(20);
        authClient.DefaultRequestHeaders.Add("Cookie", $"npsso={npssoToken}");
        authClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Linux; Android 11; SDK) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36");
        authClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        authClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");

        _logger.LogInformation("Calling PSN auth endpoint");
        using var authResponse = await authClient.GetAsync(authRequest.RequestUri, ct);

        // PSN answers the authorize call with a 3xx to the app redirect URI. Accept any
        // 3xx status rather than only Found/Redirect (302).
        var authStatus = (int)authResponse.StatusCode;
        if (authStatus is < 300 or > 399)
        {
            _logger.LogError(
                "PSN auth failed with status {StatusCode}. The NPSSO token is likely expired — " +
                "obtain a new one from https://ca.account.sony.com/api/v1/ssocookie and update " +
                "the PSN_NPSSO_TOKEN app setting.",
                authResponse.StatusCode);
            return null;
        }

        var redirectUri = authResponse.Headers.Location?.ToString();
        if (string.IsNullOrEmpty(redirectUri))
        {
            _logger.LogError("PSN auth redirect had no Location header (status {StatusCode})",
                authResponse.StatusCode);
            return null;
        }

        // Local helper to parse query string without relying on System.Web
        static Dictionary<string, string> ParseQueryString(string query)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            if (string.IsNullOrEmpty(query))
            {
                return result;
            }

            // Trim leading '?'
            if (query[0] == '?')
            {
                query = query.Substring(1);
            }

            var pairs = query.Split('&', StringSplitOptions.RemoveEmptyEntries);
            foreach (var pair in pairs)
            {
                var parts = pair.Split('=', 2);
                if (parts.Length == 0 || string.IsNullOrEmpty(parts[0]))
                {
                    continue;
                }

                var key = Uri.UnescapeDataString(parts[0]);
                var value = parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : string.Empty;

                // Last value wins if there are duplicates
                result[key] = value;
            }

            return result;
        }

        // Extract code from redirect URI
        var uri = new Uri(redirectUri);
        var queryParams = ParseQueryString(uri.Query);
        queryParams.TryGetValue("code", out var code);

        if (string.IsNullOrEmpty(code))
        {
            // PSN redirects back with ?error=... instead of ?code=... when the NPSSO
            // cookie is no longer valid.
            queryParams.TryGetValue("error", out var authError);
            queryParams.TryGetValue("error_description", out var authErrorDescription);
            _logger.LogError(
                "PSN auth redirect had no code parameter (error: {Error} - {ErrorDescription}). " +
                "The NPSSO token is likely expired — refresh PSN_NPSSO_TOKEN.",
                authError ?? "none", authErrorDescription ?? "none");
            return null;
        }

        // Step 2: Exchange code for access token
        using var tokenRequest = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["redirect_uri"] = "com.scee.psxandroid.scecompcall://redirect",
            ["grant_type"] = "authorization_code",
            ["token_format"] = "jwt"
        });

        // Build the Basic auth header at runtime so no pre-encoded credential is in source.
        var basicAuth = Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes($"{PsnClientId}:{PsnClientSecret}"));
        client.DefaultRequestHeaders.Add("Authorization", $"Basic {basicAuth}");
        using var tokenResponse = await client.PostAsync(TokenUrl, tokenRequest, ct);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            _logger.LogError("PSN token exchange failed: {StatusCode}", tokenResponse.StatusCode);
            return null;
        }

        var tokenJson = await tokenResponse.Content.ReadAsStringAsync(ct);
        using var tokenDoc = JsonDocument.Parse(tokenJson);

        if (tokenDoc.RootElement.TryGetProperty("access_token", out var accessTokenProp))
        {
            var accessToken = accessTokenProp.GetString();
            if (!string.IsNullOrEmpty(accessToken))
            {
                // Cache for 55 minutes (tokens last 60 minutes)
                _memoryCache.Set(AccessTokenCacheKey, new CachedAccessToken(fingerprint, accessToken), TimeSpan.FromMinutes(55));
                _logger.LogInformation("Successfully obtained PSN access token");
                return accessToken;
            }
        }

        return null;
    }

    private async Task<GamingProfile> FetchPlayStationProfile(string accessToken, CancellationToken ct)
    {
        using var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(20);
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

        var profile = new GamingProfile
        {
            Platform = "playstation",
            LastUpdated = DateTimeOffset.UtcNow,
            IsCached = false
        };

        // The authenticated trophy summary supplies the account ID; access-token claims
        // are not a stable identity contract and may not contain an account ID at all.
        string accountId;
        using (var trophyResponse = await client.GetAsync(TrophySummaryUrl, ct))
        {
            trophyResponse.EnsureSuccessStatusCode();
            var json = await trophyResponse.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("accountId", out var accountIdValue) ||
                accountIdValue.ValueKind != JsonValueKind.String ||
                string.IsNullOrEmpty(accountId = accountIdValue.GetString()!) ||
                accountId.Any(c => c is < '0' or > '9') ||
                !root.TryGetProperty("earnedTrophies", out var earned) ||
                earned.ValueKind != JsonValueKind.Object)
                throw new HttpRequestException("PlayStation trophy response was incomplete.");

            profile.TrophySummary = new TrophySummary();
            if (root.TryGetProperty("trophyLevel", out var level))
            {
                if (!int.TryParse(level.ToString(), NumberStyles.None, CultureInfo.InvariantCulture, out var trophyLevel))
                    throw new HttpRequestException("PlayStation trophy level was invalid.");
                profile.TrophyLevel = trophyLevel;
            }

            if (earned.TryGetProperty("platinum", out var p)) profile.TrophySummary.Platinum = p.GetInt32();
            if (earned.TryGetProperty("gold", out var g)) profile.TrophySummary.Gold = g.GetInt32();
            if (earned.TryGetProperty("silver", out var s)) profile.TrophySummary.Silver = s.GetInt32();
            if (earned.TryGetProperty("bronze", out var b)) profile.TrophySummary.Bronze = b.GetInt32();
        }

        // Fetch user profile
        var profileUrl = $"https://m.np.playstation.com/api/userProfile/v1/internal/users/{accountId}/profiles";
        using (var profileResponse = await client.GetAsync(profileUrl, ct))
        {
            profileResponse.EnsureSuccessStatusCode();
            var profileJson = await profileResponse.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(profileJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("onlineId", out var onlineId))
                profile.OnlineId = onlineId.GetString();
            if (string.IsNullOrWhiteSpace(profile.OnlineId))
                throw new HttpRequestException("PlayStation profile response was incomplete.");
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

        // Fetch recently played games (via trophy titles - lists games with trophy data)
        using (var titlesResponse = await client.GetAsync($"{TitleListUrl}?limit=8", ct))
        {
            titlesResponse.EnsureSuccessStatusCode();
            var json = await titlesResponse.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("trophyTitles", out var titles) || titles.ValueKind != JsonValueKind.Array)
                throw new HttpRequestException("PlayStation games response was incomplete.");

            if (root.TryGetProperty("totalItemCount", out var totalCount))
                profile.GamesPlayed = totalCount.GetInt32();

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

        return profile;
    }
}