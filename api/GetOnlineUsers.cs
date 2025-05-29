using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net;
using Google.Apis.AnalyticsReporting.v4;
using Google.Apis.AnalyticsReporting.v4.Data;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using System.IO;

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
                var analyticsViewId = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_VIEW_ID");
                var credentialsJson = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_CREDENTIALS_JSON");

                int activeUsers = 0;

                if (!string.IsNullOrEmpty(analyticsViewId) && !string.IsNullOrEmpty(credentialsJson))
                {
                    // Initialize Google Analytics service
                    var credential = GoogleCredential.FromJson(credentialsJson)
                        .CreateScoped(AnalyticsReportingService.Scope.AnalyticsReadonly);

                    var service = new AnalyticsReportingService(new BaseClientService.Initializer()
                    {
                        HttpClientInitializer = credential,
                        ApplicationName = "DavidSanchezCR-Website",
                    });

                    // Build request for real-time active users
                    var request = new GetReportsRequest
                    {
                        ReportRequests = new[]
                        {
                            new ReportRequest
                            {
                                ViewId = analyticsViewId,
                                DateRanges = new[] { new DateRange { StartDate = "today", EndDate = "today" } },
                                Metrics = new[] { new Metric { Expression = "rt:activeUsers" } }
                            }
                        }
                    };

                    // Execute the request
                    var analyticsResponse = await service.Reports.BatchGet(request).ExecuteAsync();
                    
                    if (analyticsResponse.Reports != null && analyticsResponse.Reports.Count > 0)
                    {
                        var report = analyticsResponse.Reports[0];
                        if (report.Data?.Rows != null && report.Data.Rows.Count > 0)
                        {
                            var firstRow = report.Data.Rows[0];
                            if (firstRow.Metrics != null && firstRow.Metrics.Count > 0)
                            {
                                var metric = firstRow.Metrics[0];
                                if (metric.Values != null && metric.Values.Count > 0)
                                {
                                    int.TryParse(metric.Values[0], out activeUsers);
                                }
                            }
                        }
                    }

                    _logger.LogInformation($"Retrieved {activeUsers} active users from Google Analytics");
                }
                else
                {
                    _logger.LogWarning("Google Analytics credentials not configured. Using fallback value.");
                    activeUsers = 1; // Fallback value when credentials are not configured
                }

                var result = new
                {
                    activeUsers = activeUsers,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    source = !string.IsNullOrEmpty(analyticsViewId) && !string.IsNullOrEmpty(credentialsJson) 
                        ? "Google Analytics" 
                        : "Fallback"
                };

                _logger.LogInformation($"Returning {result.activeUsers} active users from {result.source}");
                
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
                    activeUsers = 0,
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