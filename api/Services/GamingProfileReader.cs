using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace api.Services;

public class GamingProfileReader(
    IEnumerable<IGamingProfileService> providers,
    IGamingCacheService cache,
    IRateLimitService rateLimits,
    ILogger<GamingProfileReader> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task<HttpResponseData> ReadAsync(HttpRequestData req, string platform, CancellationToken ct)
    {
        var ip = req.Headers.TryGetValues("X-Forwarded-For", out var forwarded)
            ? forwarded.First().Split(',')[0].Trim()
            : req.Headers.TryGetValues("X-Real-IP", out var realIp) ? realIp.First() : "unknown";
        var key = platform == "playstation" ? "psn" : platform;
        if (rateLimits.IsRateLimited($"{key}:ratelimit:{ip}", 10, TimeSpan.FromMinutes(1)))
        {
            var limited = await Json(req, HttpStatusCode.TooManyRequests, new { error = "Too many requests." }, ct);
            limited.Headers.Add("Retry-After", "60");
            return limited;
        }

        try
        {
            try
            {
                var profile = await providers.Single(p => p.Platform == platform).RefreshAsync(false, ct);
                var response = await Json(req, HttpStatusCode.OK, profile, ct);
                response.Headers.Add("Cache-Control", platform == "xbox" ? "public, max-age=900" : "public, max-age=1800");
                return response;
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                logger.LogWarning(ex, "{Platform} live fetch failed; attempting cached profile.", platform);
            }

            var cached = await cache.GetProfileAsync(platform);
            if (cached != null)
            {
                if (DateTimeOffset.UtcNow - cached.LastUpdated > TimeSpan.FromDays(3))
                    logger.LogError("Serving stale {Platform} profile, last updated {LastUpdated}. Check provider credentials.", platform, cached.LastUpdated);
                var response = await Json(req, HttpStatusCode.OK, cached, ct);
                response.Headers.Add("Cache-Control", "public, max-age=3600");
                return response;
            }
            return await Json(req, HttpStatusCode.ServiceUnavailable, new { error = $"{platform} profile data is not available. Please try again later." }, ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Error loading {Platform} profile.", platform);
            return await Json(req, HttpStatusCode.InternalServerError, new { error = "An error occurred loading gaming profile data." }, ct);
        }
    }

    internal static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode status, object body, CancellationToken ct)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(JsonSerializer.Serialize(body, JsonOptions), ct);
        return response;
    }
}
