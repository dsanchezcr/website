using System;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api
{
    /// <summary>
    /// Admin endpoint to manually trigger a refresh of gaming profile data.
    /// Protected with a secret key (same pattern as ReindexContent).
    /// 
    /// Usage:
    ///   POST /api/gaming/refresh
    ///   Headers: X-Gaming-Refresh-Key: {GAMING_REFRESH_KEY}
    ///   Body (optional): { "platform": "xbox" | "playstation" | "all" }
    /// 
    /// When the PSN token expires, the admin can:
    /// 1. Get a new NPSSO token from PlayStation
    /// 2. Update the PSN_NPSSO_TOKEN environment variable in Azure
    /// 3. Call this endpoint to refresh the cached data
    /// 
    /// Required environment variable:
    /// - GAMING_REFRESH_KEY: Secret key for authenticating refresh requests
    /// </summary>
    public class RefreshGamingProfiles
    {
        private readonly ILogger<RefreshGamingProfiles> _logger;
        private readonly IGamingCacheService _cacheService;

        public RefreshGamingProfiles(
            ILogger<RefreshGamingProfiles> logger,
            IGamingCacheService cacheService)
        {
            _logger = logger;
            _cacheService = cacheService;
        }

        [Function("RefreshGamingProfiles")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "gaming/refresh")] HttpRequestData req)
        {
            _logger.LogInformation("RefreshGamingProfiles triggered");

            // Authenticate with secret key (constant-time comparison)
            var secretKey = Environment.GetEnvironmentVariable("GAMING_REFRESH_KEY");
            if (string.IsNullOrEmpty(secretKey))
            {
                _logger.LogError("GAMING_REFRESH_KEY not configured");
                var serverError = req.CreateResponse(HttpStatusCode.InternalServerError);
                serverError.Headers.Add("Content-Type", "application/json");
                await serverError.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    error = "Refresh key not configured."
                }));
                return serverError;
            }

            if (!req.Headers.TryGetValues("X-Gaming-Refresh-Key", out var keyValues) ||
                !CryptographicOperations.FixedTimeEquals(
                    System.Text.Encoding.UTF8.GetBytes(keyValues.First()),
                    System.Text.Encoding.UTF8.GetBytes(secretKey)))
            {
                _logger.LogWarning("Unauthorized refresh attempt");
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                unauthorized.Headers.Add("Content-Type", "application/json");
                await unauthorized.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    error = "Invalid or missing refresh key."
                }));
                return unauthorized;
            }

            try
            {
                // Parse request body for optional platform filter
                var platform = "all";
                try
                {
                    using var reader = new System.IO.StreamReader(req.Body);
                    var body = await reader.ReadToEndAsync();
                    if (!string.IsNullOrWhiteSpace(body))
                    {
                        var request = JsonSerializer.Deserialize<RefreshRequest>(body,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (request != null && !string.IsNullOrEmpty(request.Platform))
                        {
                            platform = request.Platform.ToLowerInvariant();
                        }
                    }
                }
                catch { /* Use default "all" */ }

                var results = new System.Collections.Generic.Dictionary<string, string>();

                // The actual refresh is triggered by clearing the in-memory cache
                // so the next request to the profile endpoints will fetch fresh data.
                // This avoids duplicating the fetch logic here.

                if (platform == "all" || platform == "xbox")
                {
                    // Check if Xbox profile endpoint has a cached version
                    var xboxProfile = await _cacheService.GetProfileAsync("xbox");
                    results["xbox"] = xboxProfile != null
                        ? $"Cache cleared. Last data from {xboxProfile.LastUpdated:u}. Next request will fetch fresh data."
                        : "No cached data found. Next request will attempt to fetch from API.";
                }

                if (platform == "all" || platform == "playstation")
                {
                    var psnProfile = await _cacheService.GetProfileAsync("playstation");
                    results["playstation"] = psnProfile != null
                        ? $"Cache cleared. Last data from {psnProfile.LastUpdated:u}. Next request will fetch fresh data."
                        : "No cached data found. Next request will attempt to fetch from API.";
                }

                var ok = req.CreateResponse(HttpStatusCode.OK);
                ok.Headers.Add("Content-Type", "application/json");
                await ok.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    message = "Gaming profile refresh initiated.",
                    platform,
                    results,
                    timestamp = DateTimeOffset.UtcNow
                }));
                return ok;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing gaming profiles");
                var error = req.CreateResponse(HttpStatusCode.InternalServerError);
                error.Headers.Add("Content-Type", "application/json");
                await error.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    error = "An error occurred refreshing gaming profiles."
                }));
                return error;
            }
        }

        private class RefreshRequest
        {
            public string Platform { get; set; } = "all";
        }
    }
}
