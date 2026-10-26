using System.Net;
using System.Text.Json;
using System.Web;
using api.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace api;

public sealed class GetTmdbMetadata(ITmdbLookupService lookup, IRateLimitService rateLimit, ILogger<GetTmdbMetadata> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Function("GetTmdbMetadata")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "content-admin/tmdb")] HttpRequestData req,
        CancellationToken ct)
    {
        var principal = ClientPrincipal.FromRequest(req);
        if (principal == null) return await Error(req, HttpStatusCode.Unauthorized, "Admin authentication required.");
        if (principal.UserRoles == null || !principal.IsInRole("admin"))
            return await Error(req, HttpStatusCode.Forbidden, "Admin role required.");

        if (req.Url.Query.Length > 256)
            return await Error(req, HttpStatusCode.BadRequest, "Provide one positive TMDB ID and a movie or tv media type.");
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var ids = query.GetValues("tmdbId");
        var types = query.GetValues("mediaType");
        var mediaType = types is { Length: 1 } ? types[0] : null;
        if (query.Count != 2 || query.AllKeys.Any(key => key is not ("tmdbId" or "mediaType")) ||
            ids is not { Length: 1 } || !TmdbLookupService.TryParseId(ids[0].Trim(), out var tmdbId) ||
            mediaType is not ("movie" or "tv"))
            return await Error(req, HttpStatusCode.BadRequest, "Provide one positive TMDB ID and a movie or tv media type.");
        if (rateLimit.IsRateLimited($"tmdb:admin:{principal.UserId ?? "unknown"}", 20, TimeSpan.FromMinutes(1)))
            return await Error(req, HttpStatusCode.TooManyRequests, "The metadata lookup limit was reached. Please try again later.");

        try
        {
            return await Json(req, HttpStatusCode.OK, await lookup.LookupAsync(tmdbId, mediaType, ct));
        }
        catch (TmdbLookupException ex)
        {
            logger.LogWarning("TMDB lookup returned status {Status}. Upstream details are suppressed.", (int)ex.Status);
            return await Error(req, ex.Status, ex.Message);
        }
        catch (OperationCanceledException)
        {
            return await Error(req, HttpStatusCode.GatewayTimeout, "The metadata lookup timed out. Please try again.");
        }
        catch
        {
            logger.LogWarning("TMDB lookup failed. Upstream details are suppressed.");
            return await Error(req, HttpStatusCode.BadGateway, "Metadata could not be retrieved. Please try again later.");
        }
    }

    private static Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode status, string message) =>
        Json(req, status, new { error = message });

    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode status, object value)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        response.Headers.Add("Cache-Control", "no-store");
        await response.WriteStringAsync(JsonSerializer.Serialize(value, JsonOptions));
        return response;
    }
}
