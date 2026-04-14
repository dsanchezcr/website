using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;
using api.Services;

var aiConnectionString = Environment.GetEnvironmentVariable("APPLICATIONINSIGHTS_CONNECTION_STRING");

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Only enable Application Insights when a connection string is configured
        // (avoids crash during local development without AI setup)
        // Note: Using WorkerService 3.1.0 directly (OpenTelemetry-based).
        // The Functions-specific Worker.ApplicationInsights package (2.50.0) is
        // incompatible with AI 3.x due to removed ITelemetryInitializer types.
        if (!string.IsNullOrEmpty(aiConnectionString))
        {
            services.AddApplicationInsightsTelemetryWorkerService();
        }
        services.AddHttpClient();
        services.AddMemoryCache();
        
        // Register Rate Limit Service (thread-safe atomic operations)
        services.AddSingleton<IRateLimitService, MemoryCacheRateLimitService>();
        
        // Register Token Storage Service (Table Storage or fallback to Memory Cache)
        services.AddSingleton<ITokenStorageService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<TableStorageTokenService>>();
            var memoryLogger = sp.GetRequiredService<ILogger<InMemoryTokenService>>();
            var connectionString = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING");
            
            if (!string.IsNullOrEmpty(connectionString))
            {
                try
                {
                    return new TableStorageTokenService(connectionString, logger);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to initialize Table Storage, falling back to in-memory cache");
                }
            }
            
            // Fallback to in-memory storage for local development
            var cache = sp.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>();
            return new InMemoryTokenService(cache, memoryLogger);
        });
        
        // Register Search Service (optional - AI Search for RAG)
        services.AddSingleton<ISearchService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<AzureSearchService>>();
            return new AzureSearchService(logger);
        });
        
        // Register Gaming Cache Service (Table Storage or fallback to Memory Cache)
        services.AddSingleton<IGamingCacheService>(sp =>
        {
            var connectionString = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING");
            var memoryCache = sp.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>();
            
            if (!string.IsNullOrEmpty(connectionString))
            {
                try
                {
                    var logger = sp.GetRequiredService<ILogger<TableStorageGamingCacheService>>();
                    return new TableStorageGamingCacheService(connectionString, memoryCache, logger);
                }
                catch (Exception ex)
                {
                    var fallbackLogger = sp.GetRequiredService<ILogger<InMemoryGamingCacheService>>();
                    fallbackLogger.LogWarning(ex, "Failed to initialize Table Storage gaming cache, falling back to in-memory");
                }
            }
            
            var inMemoryLogger = sp.GetRequiredService<ILogger<InMemoryGamingCacheService>>();
            return new InMemoryGamingCacheService(memoryCache, inMemoryLogger);
        });
        
        // Register Cosmos Content Service (read-only content from Cosmos DB)
        services.AddSingleton<ICosmosContentService>(sp =>
        {
            var endpoint = Environment.GetEnvironmentVariable("AZURE_COSMOS_ENDPOINT");
            var key = Environment.GetEnvironmentVariable("AZURE_COSMOS_KEY");
            var databaseName = Environment.GetEnvironmentVariable("AZURE_COSMOS_DATABASE_NAME") ?? "website-content";
            
            if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(key))
            {
                var logger = sp.GetRequiredService<ILogger<CosmosContentService>>();
                logger.LogInformation(
                    "Cosmos DB content service not configured: AZURE_COSMOS_ENDPOINT={EndpointSet}, AZURE_COSMOS_KEY={KeySet}. Content APIs will return 503.",
                    !string.IsNullOrEmpty(endpoint),
                    !string.IsNullOrEmpty(key));
                return new NullCosmosContentService();
            }

            try
            {
                var logger = sp.GetRequiredService<ILogger<CosmosContentService>>();
                var clientOptions = new CosmosClientOptions
                {
                    UseSystemTextJsonSerializerWithOptions = new System.Text.Json.JsonSerializerOptions
                    {
                        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                    },
                    ConnectionMode = ConnectionMode.Gateway
                };
                var client = new CosmosClient(endpoint, key, clientOptions);
                logger.LogInformation("Cosmos DB content service initialized. Database: {DatabaseName}", databaseName);
                return new CosmosContentService(client, databaseName, logger);
            }
            catch (Exception ex)
            {
                var fallbackLogger = sp.GetRequiredService<ILogger<CosmosContentService>>();
                fallbackLogger.LogError(ex, "Failed to initialize Cosmos content service — falling back to NullCosmosContentService. Endpoint: {Endpoint}", endpoint);
                return new NullCosmosContentService(initializationError: ex.Message);
            }
        });
    })
    .ConfigureLogging(logging =>
    {
        // Only suppress verbose Microsoft/System logs when AI is active to prevent
        // duplicate logs from the Functions host and App Insights sinks.
        // When AI is not configured (local dev) leave defaults so diagnostics are visible.
        if (!string.IsNullOrEmpty(aiConnectionString))
        {
            logging.AddFilter("Microsoft", LogLevel.Warning);
            logging.AddFilter("System", LogLevel.Warning);
            logging.AddFilter("Function", LogLevel.Information);
        }
    })
    .Build();

host.Run();