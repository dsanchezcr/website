using System.Net;
using System.Text.Json;
using System.Web;
using api.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace api;

public sealed class GetOmdbMetadata(IOmdbLookupService lookup, IRateLimitService rateLimit, ILogger<GetOmdbMetadata> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Function("GetOmdbMetadata")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "content-admin/omdb")] HttpRequestData req,
        CancellationToken ct)
    {
        var principal = ClientPrincipal.FromRequest(req);
        if (principal == null) return await Error(req, HttpStatusCode.Unauthorized, "Admin authentication required.");
        if (principal.UserRoles == null || !principal.IsInRole("admin"))
            return await Error(req, HttpStatusCode.Forbidden, "Admin role required.");

        if (req.Url.Query.Length > 256)
            return await Error(req, HttpStatusCode.BadRequest, "Provide one IMDb ID (tt followed by 6–12 digits).");
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var values = query.GetValues("imdbId");
        var imdbId = values is { Length: 1 } ? values[0].Trim() : null;
        if (query.Count != 1 || query.AllKeys[0] != "imdbId" || !OmdbLookupService.IsValidId(imdbId))
            return await Error(req, HttpStatusCode.BadRequest, "Provide one IMDb ID (tt followed by 6–12 digits).");
        if (rateLimit.IsRateLimited($"omdb:admin:{principal.UserId ?? "unknown"}", 20, TimeSpan.FromMinutes(1)))
            return await Error(req, HttpStatusCode.TooManyRequests, "The metadata lookup limit was reached. Please try again later.");

        try
        {
            return await Json(req, HttpStatusCode.OK, await lookup.LookupAsync(imdbId!, ct));
        }
        catch (OmdbLookupException ex) { return await Error(req, ex.Status, ex.Message); }
        catch (OperationCanceledException)
        {
            return await Error(req, HttpStatusCode.GatewayTimeout, "The metadata lookup timed out. Please try again.");
        }
        catch
        {
            logger.LogWarning("OMDb lookup failed. Upstream details are suppressed.");
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
