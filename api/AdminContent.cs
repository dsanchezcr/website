using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

/// <summary>
/// Authenticated CRUD endpoints for the admin web app, over the 5 curated content containers.
/// Protected by SWA route rules (allowedRoles: ["admin"]) AND an independent in-function check of
/// the SWA-injected <c>x-ms-client-principal</c> header (defense in depth). Operates on raw JSON so
/// unknown fields are preserved, and validates every write before persisting.
/// </summary>
public class AdminContent
{
    private readonly ILogger<AdminContent> _logger;
    private readonly ICosmosAdminService _admin;

    private const int MaxBodyBytes = 2 * 1024 * 1024; // 2 MB — Cosmos item size limit

    public AdminContent(ILogger<AdminContent> logger, ICosmosAdminService admin)
    {
        _logger = logger;
        _admin = admin;
    }

    /// <summary>List (optionally filtered by <c>?pk=</c>), create, or fetch metadata
    /// (<c>?meta=sample</c> / <c>?meta=partitions</c>) for a content type.</summary>
    [Function("AdminCollection")]
    public async Task<HttpResponseData> Collection(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = "content-admin/{type}")] HttpRequestData req,
        string type,
        CancellationToken ct)
    {
        var denied = await RejectIfNotAdmin(req);
        if (denied != null) return denied;

        if (!AdminContentTypes.TryGet(type, out var contentType))
            return await Error(req, HttpStatusCode.BadRequest, $"Unknown content type '{type}'.");

        if (!_admin.IsConfigured)
            return await Error(req, HttpStatusCode.ServiceUnavailable, "Content service is not configured.");

        try
        {
            if (req.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
                return await CreateItem(req, contentType, ct);

            var meta = QueryHelpers.GetQueryParam(req.Url.Query, "meta");
            if (string.Equals(meta, "sample", StringComparison.OrdinalIgnoreCase))
            {
                var sample = await _admin.GetSampleAsync(contentType, ct);
                return await Json(req, HttpStatusCode.OK, sample?.ToJsonString() ?? "null");
            }
            if (string.Equals(meta, "partitions", StringComparison.OrdinalIgnoreCase))
            {
                var values = await _admin.GetPartitionValuesAsync(contentType, ct);
                return await Json(req, HttpStatusCode.OK, JsonSerializer.Serialize(values));
            }

            var pk = QueryHelpers.GetQueryParam(req.Url.Query, "pk");
            var items = await _admin.ListAsync(contentType, pk, ct);
            return await Json(req, HttpStatusCode.OK, JsonSerializer.Serialize(items));
        }
        catch (CosmosException ex)
        {
            return await MapCosmosError(req, ex, type);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin collection operation failed for {Type}", type);
            return await Error(req, HttpStatusCode.InternalServerError, "Operation failed.");
        }
    }

    /// <summary>Read, replace, or delete a single document by id (partition key via <c>?pk=</c>).</summary>
    [Function("AdminItem")]
    public async Task<HttpResponseData> Item(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "put", "delete", Route = "content-admin/{type}/{id}")] HttpRequestData req,
        string type,
        string id,
        CancellationToken ct)
    {
        var denied = await RejectIfNotAdmin(req);
        if (denied != null) return denied;

        if (!AdminContentTypes.TryGet(type, out var contentType))
            return await Error(req, HttpStatusCode.BadRequest, $"Unknown content type '{type}'.");

        if (!_admin.IsConfigured)
            return await Error(req, HttpStatusCode.ServiceUnavailable, "Content service is not configured.");

        try
        {
            if (req.Method.Equals("PUT", StringComparison.OrdinalIgnoreCase))
                return await ReplaceItem(req, contentType, id, ct);

            // GET and DELETE both need the partition key.
            var pk = QueryHelpers.GetQueryParam(req.Url.Query, "pk");
            if (string.IsNullOrWhiteSpace(pk))
                return await Error(req, HttpStatusCode.BadRequest, "Query parameter 'pk' (partition key) is required.");

            if (req.Method.Equals("DELETE", StringComparison.OrdinalIgnoreCase))
            {
                await _admin.DeleteAsync(contentType, id, pk, ct);
                return req.CreateResponse(HttpStatusCode.NoContent);
            }

            var (doc, etag) = await _admin.GetAsync(contentType, id, pk, ct);
            if (doc == null)
                return await Error(req, HttpStatusCode.NotFound, "Document not found.");
            return await Json(req, HttpStatusCode.OK, doc.ToJsonString(), etag);
        }
        catch (CosmosException ex)
        {
            return await MapCosmosError(req, ex, type);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin item operation failed for {Type}/{Id}", type, id);
            return await Error(req, HttpStatusCode.InternalServerError, "Operation failed.");
        }
    }

    private async Task<HttpResponseData> CreateItem(HttpRequestData req, AdminContentType type, CancellationToken ct)
    {
        var (doc, parseError) = await ReadJsonBody(req);
        if (doc == null)
            return await Error(req, HttpStatusCode.BadRequest, parseError ?? "Invalid JSON body.");

        var errors = ContentValidator.Validate(type, doc);
        if (errors.Count > 0)
            return await Error(req, HttpStatusCode.BadRequest, "Validation failed.", errors);

        var (created, etag) = await _admin.CreateAsync(type, doc, ct);
        return await Json(req, HttpStatusCode.Created, created.ToJsonString(), etag);
    }

    private async Task<HttpResponseData> ReplaceItem(HttpRequestData req, AdminContentType type, string id, CancellationToken ct)
    {
        var (doc, parseError) = await ReadJsonBody(req);
        if (doc == null)
            return await Error(req, HttpStatusCode.BadRequest, parseError ?? "Invalid JSON body.");

        var errors = ContentValidator.Validate(type, doc);
        if (errors.Count > 0)
            return await Error(req, HttpStatusCode.BadRequest, "Validation failed.", errors);

        var ifMatch = req.Headers.TryGetValues("If-Match", out var values) ? values.FirstOrDefault() : null;
        var (updated, etag) = await _admin.ReplaceAsync(type, id, doc, ifMatch, ct);
        return await Json(req, HttpStatusCode.OK, updated.ToJsonString(), etag);
    }

    private async Task<HttpResponseData?> RejectIfNotAdmin(HttpRequestData req)
    {
        var principal = ClientPrincipal.FromRequest(req);
        if (principal == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Authentication required.");
        if (!principal.IsInRole("admin"))
            return await Error(req, HttpStatusCode.Forbidden, "Admin role required.");
        return null;
    }

    private static async Task<(JsonObject? Doc, string? Error)> ReadJsonBody(HttpRequestData req)
    {
        using var reader = new StreamReader(req.Body);
        var body = await reader.ReadToEndAsync();
        if (string.IsNullOrWhiteSpace(body))
            return (null, "Request body is empty.");
        if (Encoding.UTF8.GetByteCount(body) > MaxBodyBytes)
            return (null, "Request body exceeds the maximum allowed size.");

        try
        {
            return JsonNode.Parse(body) is JsonObject obj
                ? (obj, null)
                : (null, "JSON body must be an object.");
        }
        catch (JsonException)
        {
            return (null, "Invalid JSON body.");
        }
    }

    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode status, string json, string? etag = null)
    {
        var res = req.CreateResponse(status);
        res.Headers.Add("Content-Type", "application/json; charset=utf-8");
        res.Headers.Add("Cache-Control", "no-store");
        if (!string.IsNullOrEmpty(etag))
            res.Headers.Add("ETag", etag);
        await res.WriteStringAsync(json);
        return res;
    }

    private static async Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode status, string message, IReadOnlyList<string>? details = null)
    {
        var payload = new JsonObject { ["error"] = message };
        if (details != null)
        {
            var arr = new JsonArray();
            foreach (var d in details) arr.Add(d);
            payload["details"] = arr;
        }
        return await Json(req, status, payload.ToJsonString());
    }

    private async Task<HttpResponseData> MapCosmosError(HttpRequestData req, CosmosException ex, string type)
    {
        _logger.LogError(ex, "Cosmos error during admin op for {Type}: {Status} {Message} | Diagnostics: {Diagnostics}",
            type, ex.StatusCode, ex.Message, ex.Diagnostics);

        return ex.StatusCode switch
        {
            HttpStatusCode.NotFound => await Error(req, HttpStatusCode.NotFound, "Document not found."),
            HttpStatusCode.PreconditionFailed => await Error(req, HttpStatusCode.Conflict, "The document was modified by someone else. Reload and try again."),
            HttpStatusCode.Conflict => await Error(req, HttpStatusCode.Conflict, "A document with this id already exists."),
            HttpStatusCode.TooManyRequests => await Error(req, HttpStatusCode.TooManyRequests, "Too many requests. Please retry shortly."),
            _ => await Error(req, HttpStatusCode.InternalServerError, "Database operation failed.")
        };
    }
}
