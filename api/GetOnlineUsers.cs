using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net;
using Google.Analytics.Data.V1Beta;
using Google.Apis.Auth.OAuth2;

namespace api
{
    public class GetOnlineUsers
    {
        private readonly ILogger _logger;

        public GetOnlineUsers(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<GetOnlineUsers>();
        }

        [Function("GetOnlineUsersFunction")]
        public async Task<HttpResponseData> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequestData req)
        {
            _logger.LogInformation("GetOnlineUsers Function Triggered.");

            try
            {
                // Get Google Analytics settings from environment variables
                var propertyId = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_PROPERTY_ID");
                var credentialsJson = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_CREDENTIALS_JSON");

                int usersLastHour = 0;

                if (!string.IsNullOrEmpty(propertyId) && !string.IsNullOrEmpty(credentialsJson))
                {
                    // Authenticate using service account credentials
                    var credential = GoogleCredential.FromJson(credentialsJson);
                    var client = new BetaAnalyticsDataClientBuilder
                    {
                        Credential = credential
                    }.Build();

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

                    _logger.LogInformation($"Retrieved {usersLastHour} users in the last hour from Google Analytics 4");
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
                    source = !string.IsNullOrEmpty(propertyId) && !string.IsNullOrEmpty(credentialsJson)
                        ? "Google Analytics 4"
                        : "Fallback"
                };

                _logger.LogInformation($"Returning {result.usersLastHour} users in the last hour from {result.source}");

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Cache-Control", "public, max-age=30");

                await response.WriteStringAsync(JsonSerializer.Serialize(result));
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in GetOnlineUsers function: {ex.Message}");
                
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
                response.Headers.Add("Access-Control-Allow-Origin", "*");

                await response.WriteStringAsync(JsonSerializer.Serialize(fallbackResult));
                return response;
            }
        }
    }
}