using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using api.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace api;

/// <summary>Refreshes gaming connections without discarding the last working profile.</summary>
public class RefreshGamingProfiles(
    ILogger<RefreshGamingProfiles> logger,
    IEnumerable<IGamingProfileService> providers,
    IRateLimitService rateLimits)
{
    // Leave time to return provider outcomes before SWA's 45-second API limit.
    internal static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(35);

    [Function("RefreshGamingProfiles")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "gaming/refresh")] HttpRequestData req,
        CancellationToken ct)
    {
        var principal = ClientPrincipal.FromRequest(req);
        var secret = Environment.GetEnvironmentVariable("GAMING_REFRESH_KEY");
        var provided = req.Headers.TryGetValues("X-Gaming-Refresh-Key", out var values) ? values.FirstOrDefault() : null;
        var validKey = !string.IsNullOrWhiteSpace(secret) && !string.IsNullOrWhiteSpace(provided) &&
            CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(provided));
        if (principal?.IsInRole("admin") != true && !validKey)
            return await GamingProfileReader.Json(req,
                principal == null ? HttpStatusCode.Unauthorized : HttpStatusCode.Forbidden,
                new { error = "Admin role or a valid gaming refresh key is required." }, ct);

        RefreshRequest request;
        try
        {
            using var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync(ct);
            if (Encoding.UTF8.GetByteCount(body) > 1024)
                return await GamingProfileReader.Json(req, HttpStatusCode.BadRequest, new { error = "Request body is too large." }, ct);
            request = string.IsNullOrWhiteSpace(body) ? new() :
                JsonSerializer.Deserialize<RefreshRequest>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new JsonException();
        }
        catch (JsonException)
        {
            return await GamingProfileReader.Json(req, HttpStatusCode.BadRequest, new { error = "Invalid JSON request." }, ct);
        }
        var platform = request.Platform?.ToLowerInvariant();
        if (platform is not ("all" or "xbox" or "playstation"))
            return await GamingProfileReader.Json(req, HttpStatusCode.BadRequest, new { error = "Platform must be xbox, playstation, or all." }, ct);
        if (rateLimits.IsRateLimited("gaming:admin-refresh", 5, TimeSpan.FromMinutes(1)))
        {
            var limited = await GamingProfileReader.Json(req, HttpStatusCode.TooManyRequests, new { error = "Too many refresh requests. Try again in a minute." }, ct);
            limited.Headers.Add("Retry-After", "60");
            return limited;
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(RequestTimeout);
        var results = new Dictionary<string, RefreshResult>();
        var selected = platform == "all" ? new[] { "xbox", "playstation" } : new[] { platform };
        foreach (var name in selected)
        {
            try
            {
                var profile = await providers.Single(p => p.Platform == name).RefreshAsync(true, timeout.Token);
                results[name] = new("refreshed", "Connection refreshed and profile saved.", profile.LastUpdated);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                logger.LogError(ex, "Admin refresh failed for {Platform}; existing cache retained.", name);
                results[name] = new("failed",
                    name == "playstation"
                        ? "Refresh failed; cached profile retained. Check PSN_NPSSO_TOKEN in server settings and retry."
                        : "Refresh failed; cached profile retained. Check XBOX_API_KEY and XBOX_GAMERTAG_XUID in server settings and retry.",
                    null);
            }
        }
        var success = results.Values.All(r => r.Status == "refreshed");
        var response = await GamingProfileReader.Json(req, success ? HttpStatusCode.OK : HttpStatusCode.BadGateway,
            new { platform, results, timestamp = DateTimeOffset.UtcNow }, ct);
        response.Headers.Add("Cache-Control", "no-store");
        return response;
    }

    /// <summary>Selects which gaming connection to refresh.</summary>
    public sealed record RefreshRequest
    {
        public string? Platform { get; init; } = "all";
    }

    /// <summary>Outcome of refreshing a single gaming connection.</summary>
    public sealed record RefreshResult(string Status, string Message, DateTimeOffset? LastUpdated);
}
