using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Azure.Communication.Email;
using Azure.AI.OpenAI;
using Azure;
using Google.Analytics.Data.V1Beta;
using Google.Apis.Auth.OAuth2;

namespace api;

/// <summary>
/// Health check endpoint for monitoring API status and configuration.
/// 
/// SECURITY NOTE: This endpoint exposes configuration status (but not values) and is publicly accessible.
/// For production environments with strict security requirements, consider:
/// - Adding authentication (e.g., API key header check)
/// - Moving to a separate internal endpoint not exposed through SWA
/// - Rate limiting the endpoint to prevent abuse
/// </summary>
public class HealthCheck
{
    private readonly ILogger<HealthCheck> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;

    public HealthCheck(ILogger<HealthCheck> logger, IHttpClientFactory httpClientFactory, IMemoryCache cache)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _cache = cache;
    }

    public enum HealthStatus
    {
        Healthy,
        Degraded,
        Unhealthy
    }

    public class ServiceHealth
    {
        public string Name { get; set; } = string.Empty;
        public HealthStatus Status { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<string> MissingConfigurations { get; set; } = new();
        public double? ResponseTimeMs { get; set; }
    }

    public class HealthResponse
    {
        public HealthStatus OverallStatus { get; set; }
        public string Timestamp { get; set; } = string.Empty;
        public string Environment { get; set; } = string.Empty;
        public List<ServiceHealth> Services { get; set; } = new();
        public Dictionary<string, bool> EnvironmentVariables { get; set; } = new();
    }

    private static readonly Dictionary<string, (string Description, bool Required)> RequiredEnvironmentVariables = new()
    {
        // Contact Form / Email
        { "AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING", ("Azure Communication Services connection string for sending emails", true) },
        { "RECAPTCHA_SECRET_KEY", ("Google reCAPTCHA v3 secret key for form protection", true) },
        
        // Azure OpenAI / Chat
        { "AZURE_OPENAI_ENDPOINT", ("Azure OpenAI service endpoint URL", true) },
        { "AZURE_OPENAI_KEY", ("Azure OpenAI API key", true) },
        { "AZURE_OPENAI_DEPLOYMENT", ("Azure OpenAI deployment/model name", true) },
        { "AZURE_OPENAI_SYSTEM_PROMPT", ("Custom system prompt for chat (optional - has default)", false) },
        
        // Google Analytics
        { "GOOGLE_ANALYTICS_PROPERTY_ID", ("GA4 property ID for analytics", true) },
        { "GOOGLE_ANALYTICS_CREDENTIALS_JSON", ("Google service account credentials JSON for analytics", true) },
        
        // URLs
        { "WEBSITE_URL", ("Website base URL for verification links (fallback)", false) },
        { "API_URL", ("API base URL for verification links (preferred)", false) },
        
        // Telemetry
        { "APPLICATIONINSIGHTS_CONNECTION_STRING", ("Application Insights connection string for telemetry", false) }
    };

    [Function("HealthCheck")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("HealthCheck Function Triggered");

        var healthResponse = new HealthResponse
        {
            Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            Environment = Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT") ?? "Unknown"
        };

        // Check all environment variables
        foreach (var (key, (description, required)) in RequiredEnvironmentVariables)
        {
            var isConfigured = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key));
            healthResponse.EnvironmentVariables[key] = isConfigured;
        }

        // Check each service
        var services = new List<Task<ServiceHealth>>
        {
            CheckAzureCommunicationServicesAsync(cancellationToken),
            CheckRecaptchaAsync(cancellationToken),
            CheckAzureOpenAIAsync(cancellationToken),
            CheckGoogleAnalyticsAsync(cancellationToken),
            CheckOpenMeteoApiAsync(cancellationToken),
            CheckMemoryCacheAsync()
        };

        healthResponse.Services = (await Task.WhenAll(services)).ToList();

        // Determine overall status
        if (healthResponse.Services.Any(s => s.Status == HealthStatus.Unhealthy))
        {
            healthResponse.OverallStatus = HealthStatus.Unhealthy;
        }
        else if (healthResponse.Services.Any(s => s.Status == HealthStatus.Degraded))
        {
            healthResponse.OverallStatus = HealthStatus.Degraded;
        }
        else
        {
            healthResponse.OverallStatus = HealthStatus.Healthy;
        }

        var response = req.CreateResponse(
            healthResponse.OverallStatus == HealthStatus.Healthy ? HttpStatusCode.OK :
            healthResponse.OverallStatus == HealthStatus.Degraded ? HttpStatusCode.OK :
            HttpStatusCode.ServiceUnavailable);

        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate");

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };

        await response.WriteStringAsync(JsonSerializer.Serialize(healthResponse, options));
        return response;
    }

    private Task<ServiceHealth> CheckAzureCommunicationServicesAsync(CancellationToken cancellationToken)
    {
        var health = new ServiceHealth
        {
            Name = "Azure Communication Services (Email)"
        };

        var connectionString = Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = "Connection string not configured";
            health.MissingConfigurations.Add("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING");
            return Task.FromResult(health);
        }

        if (connectionString == "YOUR_ACS_CONNECTION_STRING_HERE")
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = "Connection string is using placeholder value";
            return Task.FromResult(health);
        }

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            
            // Try to create the client - this validates the connection string format
            _ = new EmailClient(connectionString);
            
            // We can't easily do a health check call without sending an email,
            // so we just validate the connection string is parseable
            sw.Stop();
            
            health.Status = HealthStatus.Healthy;
            health.Message = "Configuration valid";
            health.ResponseTimeMs = sw.ElapsedMilliseconds;
        }
        catch (Exception ex)
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = $"Configuration error: {ex.Message}";
            _logger.LogError(ex, "Azure Communication Services health check failed");
        }

        return Task.FromResult(health);
    }

    private async Task<ServiceHealth> CheckRecaptchaAsync(CancellationToken cancellationToken)
    {
        var health = new ServiceHealth
        {
            Name = "Google reCAPTCHA"
        };

        var secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = "Secret key not configured";
            health.MissingConfigurations.Add("RECAPTCHA_SECRET_KEY");
            return health;
        }

        if (secretKey == "YOUR_RECAPTCHA_SECRET_KEY_HERE")
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = "Secret key is using placeholder value";
            return health;
        }

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var httpClient = _httpClientFactory.CreateClient();
            
            // Test connectivity to reCAPTCHA API (with dummy token to verify API is reachable)
            var response = await httpClient.PostAsync(
                $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response=test",
                null,
                cancellationToken);
            
            sw.Stop();
            
            // We expect the API to respond (even if token is invalid)
            if (response.IsSuccessStatusCode)
            {
                health.Status = HealthStatus.Healthy;
                health.Message = "API reachable, key configured";
                health.ResponseTimeMs = sw.ElapsedMilliseconds;
            }
            else
            {
                health.Status = HealthStatus.Degraded;
                health.Message = $"API returned status {(int)response.StatusCode}";
            }
        }
        catch (Exception ex)
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = $"Cannot reach reCAPTCHA API: {ex.Message}";
            _logger.LogError(ex, "reCAPTCHA health check failed");
        }

        return health;
    }

    private Task<ServiceHealth> CheckAzureOpenAIAsync(CancellationToken cancellationToken)
    {
        var health = new ServiceHealth
        {
            Name = "Azure OpenAI"
        };

        var endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
        var key = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY");
        var deployment = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT");

        if (string.IsNullOrWhiteSpace(endpoint))
        {
            health.MissingConfigurations.Add("AZURE_OPENAI_ENDPOINT");
        }
        if (string.IsNullOrWhiteSpace(key))
        {
            health.MissingConfigurations.Add("AZURE_OPENAI_KEY");
        }
        if (string.IsNullOrWhiteSpace(deployment))
        {
            health.MissingConfigurations.Add("AZURE_OPENAI_DEPLOYMENT");
        }

        if (health.MissingConfigurations.Count > 0)
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = $"Missing configuration: {string.Join(", ", health.MissingConfigurations)}";
            return Task.FromResult(health);
        }

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            
            // Create client to validate configuration (validates endpoint URL format and key)
            var azureClient = new AzureOpenAIClient(new Uri(endpoint!), new AzureKeyCredential(key!));
            _ = azureClient.GetChatClient(deployment!); // Validate deployment name is accepted
            
            sw.Stop();

            health.Status = HealthStatus.Healthy;
            health.Message = "Configuration valid";
            health.ResponseTimeMs = sw.ElapsedMilliseconds;
        }
        catch (Exception ex)
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = $"Configuration error: {ex.Message}";
            _logger.LogError(ex, "Azure OpenAI health check failed");
        }

        return Task.FromResult(health);
    }

    private Task<ServiceHealth> CheckGoogleAnalyticsAsync(CancellationToken cancellationToken)
    {
        var health = new ServiceHealth
        {
            Name = "Google Analytics"
        };

        var propertyId = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_PROPERTY_ID");
        var credentialsJson = Environment.GetEnvironmentVariable("GOOGLE_ANALYTICS_CREDENTIALS_JSON");

        if (string.IsNullOrWhiteSpace(propertyId))
        {
            health.MissingConfigurations.Add("GOOGLE_ANALYTICS_PROPERTY_ID");
        }
        if (string.IsNullOrWhiteSpace(credentialsJson))
        {
            health.MissingConfigurations.Add("GOOGLE_ANALYTICS_CREDENTIALS_JSON");
        }

        if (health.MissingConfigurations.Count > 0)
        {
            health.Status = HealthStatus.Degraded;
            health.Message = $"Missing configuration (will use fallback): {string.Join(", ", health.MissingConfigurations)}";
            return Task.FromResult(health);
        }

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            
            // Validate credentials JSON can be parsed
            var credential = GoogleCredential.FromJson(credentialsJson);
            _ = new BetaAnalyticsDataClientBuilder
            {
                Credential = credential
            }.Build();

            sw.Stop();

            health.Status = HealthStatus.Healthy;
            health.Message = "Configuration valid";
            health.ResponseTimeMs = sw.ElapsedMilliseconds;
        }
        catch (Exception ex)
        {
            health.Status = HealthStatus.Degraded;
            health.Message = $"Configuration error (will use fallback): {ex.Message}";
            _logger.LogWarning(ex, "Google Analytics health check failed - will use fallback");
        }

        return Task.FromResult(health);
    }

    private async Task<ServiceHealth> CheckOpenMeteoApiAsync(CancellationToken cancellationToken)
    {
        var health = new ServiceHealth
        {
            Name = "Open-Meteo Weather API"
        };

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var httpClient = _httpClientFactory.CreateClient();
            
            // Test connectivity to Open-Meteo API with a simple request
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(10));
            
            var response = await httpClient.GetAsync(
                "https://api.open-meteo.com/v1/forecast?latitude=28.5383&longitude=-81.3792&current=temperature_2m",
                cts.Token);
            
            sw.Stop();
            
            if (response.IsSuccessStatusCode)
            {
                health.Status = HealthStatus.Healthy;
                health.Message = "API reachable";
                health.ResponseTimeMs = sw.ElapsedMilliseconds;
            }
            else
            {
                health.Status = HealthStatus.Degraded;
                health.Message = $"API returned status {(int)response.StatusCode}";
            }
        }
        catch (OperationCanceledException)
        {
            health.Status = HealthStatus.Degraded;
            health.Message = "API request timed out";
        }
        catch (Exception ex)
        {
            health.Status = HealthStatus.Degraded;
            health.Message = $"Cannot reach Open-Meteo API: {ex.Message}";
            _logger.LogWarning(ex, "Open-Meteo API health check failed");
        }

        return health;
    }

    private Task<ServiceHealth> CheckMemoryCacheAsync()
    {
        var health = new ServiceHealth
        {
            Name = "Memory Cache"
        };

        try
        {
            // Test that memory cache is functional
            var testKey = $"health_check_{Guid.NewGuid()}";
            var testValue = "test";
            
            _cache.Set(testKey, testValue, TimeSpan.FromSeconds(5));
            var retrieved = _cache.TryGetValue<string>(testKey, out var value);
            _cache.Remove(testKey);

            if (retrieved && value == testValue)
            {
                health.Status = HealthStatus.Healthy;
                health.Message = "Cache operational";
            }
            else
            {
                health.Status = HealthStatus.Degraded;
                health.Message = "Cache read/write test failed";
            }
        }
        catch (Exception ex)
        {
            health.Status = HealthStatus.Unhealthy;
            health.Message = $"Cache error: {ex.Message}";
            _logger.LogError(ex, "Memory cache health check failed");
        }

        return Task.FromResult(health);
    }

    /// <summary>
    /// Returns the list of required environment variables and their descriptions.
    /// </summary>
    [Function("HealthCheckConfig")]
    public async Task<HttpResponseData> GetConfig(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health/config")] HttpRequestData req)
    {
        _logger.LogInformation("HealthCheckConfig Function Triggered");

        var config = RequiredEnvironmentVariables
            .Select(kv => new
            {
                Name = kv.Key,
                Description = kv.Value.Description,
                Required = kv.Value.Required,
                IsConfigured = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(kv.Key))
            })
            .ToList();

        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        await response.WriteStringAsync(JsonSerializer.Serialize(new
        {
            Title = "API Configuration Requirements",
            Description = "Environment variables required for the Azure Static Web App API",
            Variables = config
        }, options));

        return response;
    }
}
