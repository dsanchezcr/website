using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Google.Analytics.Data.V1Beta;
using Google.Api.Gax;
using System.Text.Json;

namespace api
{
    public static class GetOnlineUsers
    {
        [FunctionName("GetOnlineUsersFunction")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("GetOnlineUsers Function Triggered.");

            try
            {
                string propertyId = Environment.GetEnvironmentVariable("GA_PROPERTY_ID");
                string serviceAccountJson = Environment.GetEnvironmentVariable("GA_SERVICE_ACCOUNT_JSON");
                
                if (string.IsNullOrEmpty(propertyId) || string.IsNullOrEmpty(serviceAccountJson))
                {
                    log.LogError("Missing Google Analytics configuration");
                    return new BadRequestObjectResult("Analytics configuration not found");
                }

                // Create credentials from service account JSON
                var credentialsJson = System.Text.Json.JsonSerializer.Deserialize<object>(serviceAccountJson);
                var credential = Google.Apis.Auth.OAuth2.GoogleCredential.FromJson(serviceAccountJson)
                    .CreateScoped(BetaAnalyticsDataClient.DefaultScopes);

                // Create the client
                var clientBuilder = new BetaAnalyticsDataClientBuilder
                {
                    Credential = credential
                };
                var client = await clientBuilder.BuildAsync();

                // Create the real-time request
                var request = new RunRealtimeReportRequest
                {
                    Property = $"properties/{propertyId}",
                    Metrics = { new Metric { Name = "activeUsers" } }
                };

                // Execute the request
                var response = await client.RunRealtimeReportAsync(request);
                
                int activeUsers = 0;
                if (response.Rows.Count > 0)
                {
                    activeUsers = int.Parse(response.Rows[0].MetricValues[0].Value);
                }

                var result = new
                {
                    activeUsers = activeUsers,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
                };

                log.LogInformation($"Active users: {activeUsers}");
                
                // Add cache and CORS headers to optimize API calls
                var response = new OkObjectResult(result);
                return response;
            }
            catch (Exception ex)
            {
                log.LogError($"Error getting analytics data: {ex.Message}");
                
                // Return a default response instead of error to prevent widget from breaking
                var fallbackResult = new
                {
                    activeUsers = 0,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    error = "Analytics temporarily unavailable"
                };
                
                return new OkObjectResult(fallbackResult);
            }
        }
    }
}