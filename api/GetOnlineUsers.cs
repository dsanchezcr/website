using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net;
using Google.Analytics.Data.V1Beta;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Caching.Memory;

namespace api
{
    public class GetOnlineUsers
    {
        private readonly ILogger<GetOnlineUsers> _logger;
        private readonly IMemoryCache _cache;
        private static readonly Lazy<BetaAnalyticsDataClient?> _gaClient = new(() =>
        {
            var credentialsJson = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_CREDENTIALS_JSON");
            if (string.IsNullOrEmpty(credentialsJson))
                return null;
            
            var credential = GoogleCredential.FromJson(credentialsJson);
            return new BetaAnalyticsDataClientBuilder
            {
                Credential = credential
            }.Build();
        });
        
        private const string CacheKey = "online_users_count";
        private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);

        public GetOnlineUsers(ILogger<GetOnlineUsers> logger, IMemoryCache cache)
        {
            _logger = logger;
            _cache = cache;
        }

        [Function("GetOnlineUsers")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "online-users")] HttpRequestData req)
        {
            _logger.LogInformation("GetOnlineUsers Function Triggered.");

            try
            {
                // Check cache first
                if (_cache.TryGetValue(CacheKey, out object? cachedResult) && cachedResult != null)
                {
                    _logger.LogInformation("Returning cached online users data");
                    var cachedResponse = req.CreateResponse(HttpStatusCode.OK);
                    cachedResponse.Headers.Add("Content-Type", "application/json; charset=utf-8");
                    cachedResponse.Headers.Add("Cache-Control", "public, max-age=30");
                    await cachedResponse.WriteStringAsync(JsonSerializer.Serialize(cachedResult));
                    return cachedResponse;
                }

                // Get Google Analytics settings from environment variables
                var propertyId = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_PROPERTY_ID");
                var client = _gaClient.Value;

                int usersLastHour = 0;
                string source = "Fallback";

                if (!string.IsNullOrEmpty(propertyId) && client != null)
                {
                    // The GA4 API does not provide a direct way to filter for "last hour" in the standard report API.
                    // The correct way is to use the Realtime API with the "activeUsers" metric, which returns the count for the last 60 minutes.
                    var realtimeRequest = new RunRealtimeReportRequest
                    {
                        Property = $"properties/{propertyId}",
                        Metrics = { new Metric { Name = "activeUsers" } }
                    };
                    var realtimeResponse = await client.RunRealtimeReportAsync(realtimeRequest);
                    if (realtimeResponse.Rows.Count > 0 && realtimeResponse.Rows[0].MetricValues.Count > 0)
                    {
                        int.TryParse(realtimeResponse.Rows[0].MetricValues[0].Value, out usersLastHour);
                    }
                    source = "Google Analytics 4";
                    _logger.LogInformation("Retrieved {UserCount} users in the last hour from Google Analytics 4", usersLastHour);
                }
                else
                {
                    _logger.LogWarning("Google Analytics credentials not configured. Using fallback value.");
                    usersLastHour = 1; // Fallback value when credentials are not configured
                }

                var result = new
                {
                    usersLastHour = usersLastHour,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    source = source
                };

                // Cache the result
                _cache.Set(CacheKey, result, CacheDuration);

                _logger.LogInformation("Returning {UserCount} users in the last hour from {Source}", result.usersLastHour, result.source);

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                response.Headers.Add("Cache-Control", "public, max-age=30");
                // Note: CORS is handled by Azure Static Web Apps platform

                await response.WriteStringAsync(JsonSerializer.Serialize(result));
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetOnlineUsers function");
                
                // Return a default response instead of error to prevent widget from breaking
                var fallbackResult = new
                {
                    usersLastHour = 0,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    error = "Analytics temporarily unavailable",
                    source = "Fallback"
                };

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                // Note: CORS is handled by Azure Static Web Apps platform

                await response.WriteStringAsync(JsonSerializer.Serialize(fallbackResult));
                return response;
            }
        }
    }
}