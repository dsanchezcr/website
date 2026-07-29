using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

/// <summary>
/// Admin-only endpoint to synchronize movies/series watchlist and recently watched data from IMDb
/// account pages into Cosmos DB curated content containers.
/// </summary>
public sealed class SyncImdbContent
{
    private readonly ILogger<SyncImdbContent> _logger;
    private readonly IImdbSyncService _imdbSync;

    public SyncImdbContent(ILogger<SyncImdbContent> logger, IImdbSyncService imdbSync)
    {
        _logger = logger;
        _imdbSync = imdbSync;
    }

    [Function("SyncImdbContent")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "content-admin/imdb/sync")] HttpRequestData req,
        CancellationToken ct)
    {
        var denied = await RejectIfNotAuthorized(req);
        if (denied != null) return denied;

        var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        ImdbSyncRequest payload;
        try
        {
            payload = await JsonSerializer.DeserializeAsync<ImdbSyncRequest>(req.Body, jsonOptions, ct)
                      ?? new ImdbSyncRequest();
        }
        catch (JsonException)
        {
            return await Error(req, HttpStatusCode.BadRequest, "Invalid JSON body.");
        }

        try
        {
            var result = await _imdbSync.SyncAsync(payload, ct);
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(result, cancellationToken: ct);
            return response;
        }
        catch (ArgumentException ex)
        {
            return await Error(req, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return await Error(req, HttpStatusCode.ServiceUnavailable, ex.Message);
        }
        catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized)
        {
            return await Error(req, HttpStatusCode.BadGateway, "IMDb source rejected access. Ensure the list/profile is public and reachable.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "IMDb sync operation failed.");
            return await Error(req, HttpStatusCode.InternalServerError, "Failed to sync IMDb content.");
        }
    }

    private static async Task<HttpResponseData?> RejectIfNotAuthorized(HttpRequestData req)
    {
        // GitHub Actions / automation path (shared key).
        var syncKey = Environment.GetEnvironmentVariable("IMDB_SYNC_KEY");
        if (!string.IsNullOrWhiteSpace(syncKey) &&
            req.Headers.TryGetValues("X-Imdb-Sync-Key", out var providedValues))
        {
            var provided = providedValues.FirstOrDefault() ?? string.Empty;
            var providedBytes = Encoding.UTF8.GetBytes(provided);
            var expectedBytes = Encoding.UTF8.GetBytes(syncKey);
            if (providedBytes.Length == expectedBytes.Length &&
                CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes))
            {
                return null;
            }
        }

        // Interactive admin path (/admin SPA / signed-in user).
        var principal = ClientPrincipal.FromRequest(req);
        if (principal == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Authentication required (admin role or X-Imdb-Sync-Key).");
        if (!principal.IsInRole("admin"))
            return await Error(req, HttpStatusCode.Forbidden, "Admin role required.");
        return null;
    }

    private static async Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode status, string message)
    {
        var response = req.CreateResponse(status);
        await response.WriteAsJsonAsync(new { error = message });
        return response;
    }
}
