using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using api.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        services.AddHttpClient();
        services.AddMemoryCache();
        
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
    })
    .Build();

host.Run();