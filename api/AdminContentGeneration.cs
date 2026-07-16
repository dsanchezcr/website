using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

/// <summary>
/// Admin-only endpoint that expands a brief prompt into localized (en/es/pt) content using
/// Microsoft Foundry. Lives under the <c>content-admin</c> prefix so it inherits the SWA
/// <c>allowedRoles: ["admin"]</c> route rule, and additionally re-verifies the caller's role from
/// the SWA-injected <c>x-ms-client-principal</c> header (defense in depth). Stateless: it never
/// persists anything — the admin reviews the result and saves through the CRUD endpoints.
/// </summary>
public class AdminContentGeneration
{
    private readonly ILogger<AdminContentGeneration> _logger;
    private readonly IContentGenerationService _generator;
    private readonly IRateLimitService _rateLimit;

    private const int MaxPromptLength = 1000;
    private const int MaxTitleLength = 200;
    private const int MaxRequestsPerIpPerMinute = 15;

    // Logical fields the generator supports, aligned with the localized fields in the admin editor.
    private static readonly HashSet<string> AllowedFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "review", "description", "recommendation", "name", "title", "introText",
    };

    public AdminContentGeneration(
        ILogger<AdminContentGeneration> logger,
        IContentGenerationService generator,
        IRateLimitService rateLimit)
    {
        _logger = logger;
        _generator = generator;
        _rateLimit = rateLimit;
    }

    [Function("AdminContentGenerate")]
    public async Task<HttpResponseData> Generate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "content-admin/ai/generate")] HttpRequestData req,
        CancellationToken ct)
    {
        // Defense in depth: verify the admin role server-side, independent of the SWA route rule.
        var principal = ClientPrincipal.FromRequest(req);
        if (principal == null)
            return await Error(req, HttpStatusCode.Unauthorized, "Authentication required.");
        if (!principal.IsInRole("admin"))
            return await Error(req, HttpStatusCode.Forbidden, "Admin role required.");

        var clientIp = GetClientIp(req);
        if (_rateLimit.IsRateLimited($"admin-generate:{clientIp}", MaxRequestsPerIpPerMinute, TimeSpan.FromMinutes(1)))
            return await Error(req, HttpStatusCode.TooManyRequests, "Too many requests. Please retry shortly.");

        if (!_generator.IsConfigured)
            return await Error(req, HttpStatusCode.ServiceUnavailable, "AI content generation is not configured.");

        GenerateRequest? body;
        try
        {
            using var reader = new StreamReader(req.Body);
            var json = await reader.ReadToEndAsync(ct);
            if (Encoding.UTF8.GetByteCount(json) > 16 * 1024)
                return await Error(req, HttpStatusCode.BadRequest, "Request body is too large.");
            if (string.IsNullOrWhiteSpace(json))
                return await Error(req, HttpStatusCode.BadRequest, "Request body is required.");
            body = JsonSerializer.Deserialize<GenerateRequest>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return await Error(req, HttpStatusCode.BadRequest, "Invalid JSON body.");
        }

        if (body == null)
            return await Error(req, HttpStatusCode.BadRequest, "Invalid request body.");

        // ── validate ──
        if (string.IsNullOrWhiteSpace(body.ContentType) || !AdminContentTypes.TryGet(body.ContentType, out _))
            return await Error(req, HttpStatusCode.BadRequest, "A valid 'contentType' is required.");

        if (string.IsNullOrWhiteSpace(body.Field) || !AllowedFields.Contains(body.Field))
            return await Error(req, HttpStatusCode.BadRequest, "A valid 'field' is required.");

        var prompt = body.Prompt?.Trim();
        if (string.IsNullOrWhiteSpace(prompt))
            return await Error(req, HttpStatusCode.BadRequest, "A non-empty 'prompt' is required.");
        if (prompt.Length > MaxPromptLength)
            return await Error(req, HttpStatusCode.BadRequest, $"'prompt' must be {MaxPromptLength} characters or fewer.");

        var title = body.Title?.Trim();
        if (!string.IsNullOrEmpty(title) && title.Length > MaxTitleLength)
            return await Error(req, HttpStatusCode.BadRequest, $"'title' must be {MaxTitleLength} characters or fewer.");

        try
        {
            var result = await _generator.GenerateLocalizedAsync(
                new ContentGenerationRequest(body.ContentType, body.Field, prompt, title), ct);

            return await Json(req, HttpStatusCode.OK, result.ToJsonObject().ToJsonString());
        }
        catch (InvalidOperationException ex)
        {
            // Model returned something unusable (empty / non-JSON). Surface as a bad gateway.
            _logger.LogWarning(ex, "AI content generation produced an unusable response for {Type}/{Field}", body.ContentType, body.Field);
            return await Error(req, HttpStatusCode.BadGateway, "The AI model returned an unexpected response. Please try again.");
        }
        catch (Azure.RequestFailedException ex)
        {
            _logger.LogWarning(ex, "AI content generation request to Foundry failed for {Type}/{Field}", body.ContentType, body.Field);
            return await Error(req, HttpStatusCode.BadGateway, "AI content generation failed upstream. Please try again.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "AI content generation request to Foundry failed for {Type}/{Field}", body.ContentType, body.Field);
            return await Error(req, HttpStatusCode.BadGateway, "AI content generation failed upstream. Please try again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI content generation failed for {Type}/{Field}", body.ContentType, body.Field);
            return await Error(req, HttpStatusCode.InternalServerError, "Content generation failed.");
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private sealed class GenerateRequest
    {
        public string? ContentType { get; set; }
        public string? Field { get; set; }
        public string? Prompt { get; set; }
        public string? Title { get; set; }
    }

    private static string GetClientIp(HttpRequestData req)
    {
        if (req.Headers.TryGetValues("X-Forwarded-For", out var forwarded))
        {
            var raw = forwarded.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(raw))
                return raw.Split(',')[0].Trim();
        }
        if (req.Headers.TryGetValues("X-Real-IP", out var realIp))
        {
            var raw = realIp.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(raw))
                return raw.Trim();
        }
        return "unknown";
    }

    private static async Task<HttpResponseData> Json(HttpRequestData req, HttpStatusCode status, string json)
    {
        var res = req.CreateResponse(status);
        res.Headers.Add("Content-Type", "application/json; charset=utf-8");
        res.Headers.Add("Cache-Control", "no-store");
        await res.WriteStringAsync(json);
        return res;
    }

    private static async Task<HttpResponseData> Error(HttpRequestData req, HttpStatusCode status, string message)
    {
        var payload = new JsonObject { ["error"] = message };
        return await Json(req, status, payload.ToJsonString());
    }
}
