using System;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net;

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
                // For now, return a mock response since Google Analytics packages need to be configured properly
                var result = new
                {
                    activeUsers = 1, // Mock value 
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    note = "Analytics integration temporarily disabled for build fix"
                };

                _logger.LogInformation($"Returning mock active users: {result.activeUsers}");
                
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
                    error = "Function temporarily unavailable"
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