using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using api.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace api;

public sealed class SyncTmdbContent(ITmdbSyncService sync, ILogger<SyncTmdbContent> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [Function("SyncTmdbContent")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "content-admin/tmdb/sync")] HttpRequestData req,
        CancellationToken ct)
    {
        if (!HasSyncKey(req))
        {
            var principal = ClientPrincipal.FromRequest(req);
            if (principal == null) return await Error(req, HttpStatusCode.Unauthorized, "Admin authentication or X-Tmdb-Sync-Key required.");
            if (!principal.IsInRole("admin")) return await Error(req, HttpStatusCode.Forbidden, "Admin role required.");
        }

        TmdbSyncRequest? payload;
        try
        {
            // Read a bounded body, including when Content-Length is absent.
            var bytes = new byte[4097];
            var length = 0;
            while (length < bytes.Length)
            {
                var count = await req.Body.ReadAsync(bytes.AsMemory(length), ct);
                if (count == 0) break;
                length += count;
            }
            if (length > 4096) return await Error(req, HttpStatusCode.BadRequest, "Body must be at most 4 KiB.");
            payload = JsonSerializer.Deserialize<TmdbSyncRequest>(bytes.AsSpan(0, length), JsonOptions);
            if (payload == null || payload.MaxItems is < 1 or > 1000)
                return await Error(req, HttpStatusCode.BadRequest, "Expected an object with dryRun boolean and maxItems integer (1–1000).");
        }
        catch (JsonException)
        {
            return await Error(req, HttpStatusCode.BadRequest, "Invalid JSON body or unsupported fields.");
        }

        try
        {
            var result = await sync.SyncAsync(payload, ct);
            return await Json(req, HttpStatusCode.OK, result);
        }
        catch (ArgumentException)
        {
            return await Error(req, HttpStatusCode.BadRequest, "maxItems must be an integer between 1 and 1000.");
        }
        catch (TmdbSyncBusyException)
        {
            return await Error(req, HttpStatusCode.Conflict, "A TMDB sync is already running; retry later.");
        }
        catch (TmdbContinuationException ex)
        {
            return await Error(req, ex.Stale ? HttpStatusCode.Conflict : HttpStatusCode.BadRequest, ex.Message);
        }
        catch (TmdbSyncProgressException ex)
        {
            return await Json(req, ex.TimedOut ? HttpStatusCode.GatewayTimeout : HttpStatusCode.InternalServerError, new
            {
                error = $"TMDB sync stopped during {ex.Phase}. Acknowledged totals: {ex.PartialResult.Created} created, {ex.PartialResult.Replaced} replaced, {ex.PartialResult.Skipped} skipped. No content was deleted. Retry with partialResult.continuationToken, or restart if it is null.",
                retryable = true,
                phase = ex.Phase,
                partialResult = ex.PartialResult
            });
        }
        catch (InvalidOperationException)
        {
            return await Error(req, HttpStatusCode.ServiceUnavailable, "TMDB and Cosmos content settings must be configured.");
        }
        catch (TmdbSourceException ex)
        {
            return await Error(req, HttpStatusCode.BadGateway, ex.Message);
        }
        catch (OperationCanceledException)
        {
            return await Error(req, HttpStatusCode.GatewayTimeout, "TMDB sync timed out. No content was deleted; partial storage updates may remain. Retrying is safe.");
        }
        catch (Exception ex)
        {
            // Exception messages/inner exceptions may contain session-bearing URLs.
            logger.LogError("TMDB sync failed ({ExceptionType}); no content was deleted.", ex.GetType().Name);
            return await Error(req, HttpStatusCode.InternalServerError, "TMDB sync failed. No content was deleted; partial storage updates may remain. Retrying is safe.");
        }
    }

    private static bool HasSyncKey(HttpRequestData req)
    {
        var expected = Environment.GetEnvironmentVariable("TMDB_SYNC_KEY");
        if (string.IsNullOrWhiteSpace(expected) || !req.Headers.TryGetValues("X-Tmdb-Sync-Key", out var values)) return false;
        var supplied = values.ToArray();
        if (supplied.Length != 1 || supplied[0].Length > 4096) return false;
        // Compare fixed-size hashes, including when input lengths differ.
        return CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(expected)),
            SHA256.HashData(Encoding.UTF8.GetBytes(supplied[0])));
    }

    private static Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode status, string message) =>
        Json(req, status, new { error = message });

    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode status, object value)
    {
        var response = req.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(value, JsonOptions));
        return response;
    }
}
