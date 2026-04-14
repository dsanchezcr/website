using api.Models.Content;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace api.Services;

/// <summary>
/// Interface for reading content data from Cosmos DB.
/// </summary>
public interface ICosmosContentService
{
    Task<IReadOnlyList<MovieDocument>> GetMoviesAsync(string? category = null);
    Task<IReadOnlyList<SeriesDocument>> GetSeriesAsync(string? category = null);
    Task<IReadOnlyList<GamingDocument>> GetGamingAsync(string platform, string? section = null);
    Task<IReadOnlyList<ParkDocument>> GetParksAsync(string provider, string? parkId = null);
    Task<bool> IsConfiguredAsync();
}

/// <summary>
/// Cosmos DB–backed implementation of ICosmosContentService.
/// Reads content from per-domain containers using partition-key-scoped queries.
/// </summary>
public class CosmosContentService : ICosmosContentService
{
    private readonly CosmosClient _client;
    private readonly string _databaseName;
    private readonly ILogger<CosmosContentService> _logger;

    private const string MoviesContainer = "content-movies";
    private const string SeriesContainer = "content-series";
    private const string GamingContainer = "content-gaming";
    private const string ParksContainer = "content-parks";

    public CosmosContentService(CosmosClient client, string databaseName, ILogger<CosmosContentService> logger)
    {
        _client = client;
        _databaseName = databaseName;
        _logger = logger;
    }

    public Task<bool> IsConfiguredAsync() => Task.FromResult(true);

    public async Task<IReadOnlyList<MovieDocument>> GetMoviesAsync(string? category = null)
    {
        var container = _client.GetContainer(_databaseName, MoviesContainer);

        if (!string.IsNullOrEmpty(category))
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.category = @category")
                .WithParameter("@category", category);
            return await ExecuteQueryAsync<MovieDocument>(container, query, new PartitionKey(category));
        }

        return await ExecuteQueryAsync<MovieDocument>(container, new QueryDefinition("SELECT * FROM c"));
    }

    public async Task<IReadOnlyList<SeriesDocument>> GetSeriesAsync(string? category = null)
    {
        var container = _client.GetContainer(_databaseName, SeriesContainer);

        if (!string.IsNullOrEmpty(category))
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.category = @category")
                .WithParameter("@category", category);
            return await ExecuteQueryAsync<SeriesDocument>(container, query, new PartitionKey(category));
        }

        return await ExecuteQueryAsync<SeriesDocument>(container, new QueryDefinition("SELECT * FROM c"));
    }

    public async Task<IReadOnlyList<GamingDocument>> GetGamingAsync(string platform, string? section = null)
    {
        var container = _client.GetContainer(_databaseName, GamingContainer);

        QueryDefinition query;
        if (!string.IsNullOrEmpty(section))
        {
            query = new QueryDefinition("SELECT * FROM c WHERE c.platform = @platform AND c.section = @section ORDER BY c[\"order\"]")
                .WithParameter("@platform", platform)
                .WithParameter("@section", section);
        }
        else
        {
            query = new QueryDefinition("SELECT * FROM c WHERE c.platform = @platform ORDER BY c[\"order\"]")
                .WithParameter("@platform", platform);
        }

        return await ExecuteQueryAsync<GamingDocument>(container, query, new PartitionKey(platform));
    }

    public async Task<IReadOnlyList<ParkDocument>> GetParksAsync(string provider, string? parkId = null)
    {
        var container = _client.GetContainer(_databaseName, ParksContainer);

        QueryDefinition query;
        if (!string.IsNullOrEmpty(parkId))
        {
            query = new QueryDefinition("SELECT * FROM c WHERE c.provider = @provider AND c.parkId = @parkId")
                .WithParameter("@provider", provider)
                .WithParameter("@parkId", parkId);
        }
        else
        {
            query = new QueryDefinition("SELECT * FROM c WHERE c.provider = @provider")
                .WithParameter("@provider", provider);
        }

        return await ExecuteQueryAsync<ParkDocument>(container, query, new PartitionKey(provider));
    }

    private async Task<IReadOnlyList<T>> ExecuteQueryAsync<T>(Container container, QueryDefinition query, PartitionKey? partitionKey = null)
    {
        var results = new List<T>();
        try
        {
            var options = new QueryRequestOptions();
            if (partitionKey.HasValue)
            {
                options.PartitionKey = partitionKey.Value;
            }

            using var iterator = container.GetItemQueryIterator<T>(query, requestOptions: options);
            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                results.AddRange(response);
            }
        }
        catch (CosmosException ex)
        {
            _logger.LogError(ex, "Cosmos DB query failed: {StatusCode} {Message}", ex.StatusCode, ex.Message);
            throw;
        }

        return results;
    }
}

/// <summary>
/// No-op implementation used when Cosmos DB is not configured or failed to initialize.
/// Returns empty results and reports not configured, optionally surfacing the initialization error.
/// </summary>
public class NullCosmosContentService : ICosmosContentService
{
    /// <summary>
    /// When non-null, the Cosmos SDK threw this error during initialization (env vars were present
    /// but the client could not be constructed). When null, the env vars were simply not set.
    /// </summary>
    public string? InitializationError { get; }

    public NullCosmosContentService(string? initializationError = null)
    {
        InitializationError = initializationError;
    }

    public Task<bool> IsConfiguredAsync() => Task.FromResult(false);
    public Task<IReadOnlyList<MovieDocument>> GetMoviesAsync(string? category = null) => Task.FromResult<IReadOnlyList<MovieDocument>>(Array.Empty<MovieDocument>());
    public Task<IReadOnlyList<SeriesDocument>> GetSeriesAsync(string? category = null) => Task.FromResult<IReadOnlyList<SeriesDocument>>(Array.Empty<SeriesDocument>());
    public Task<IReadOnlyList<GamingDocument>> GetGamingAsync(string platform, string? section = null) => Task.FromResult<IReadOnlyList<GamingDocument>>(Array.Empty<GamingDocument>());
    public Task<IReadOnlyList<ParkDocument>> GetParksAsync(string provider, string? parkId = null) => Task.FromResult<IReadOnlyList<ParkDocument>>(Array.Empty<ParkDocument>());
}
