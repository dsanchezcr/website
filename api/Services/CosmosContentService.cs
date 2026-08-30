using api.Models.Content;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace api.Services;

/// <summary>
/// Interface for reading content data from Cosmos DB.
/// </summary>
public interface ICosmosContentService
{
    Task<IReadOnlyList<MovieDocument>> GetMoviesAsync(string? category = null, int? page = null, int? pageSize = null);
    Task<IReadOnlyList<SeriesDocument>> GetSeriesAsync(string? category = null, int? page = null, int? pageSize = null);
    Task<IReadOnlyList<GamingDocument>> GetGamingAsync(string platform, string? section = null, int? page = null, int? pageSize = null);
    Task<IReadOnlyList<ParkDocument>> GetParksAsync(string provider, string? parkId = null, int? page = null, int? pageSize = null);
    Task<IReadOnlyList<MonthlyUpdateDocument>> GetMonthlyUpdatesAsync(string month, int? page = null, int? pageSize = null);
    Task<IReadOnlyList<string>> GetMonthlyUpdateMonthsAsync();
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
    private const string MonthlyUpdatesContainer = "content-monthly-updates";

    public CosmosContentService(CosmosClient client, string databaseName, ILogger<CosmosContentService> logger)
    {
        _client = client;
        _databaseName = databaseName;
        _logger = logger;
    }

    public Task<bool> IsConfiguredAsync() => Task.FromResult(true);

    public async Task<IReadOnlyList<MovieDocument>> GetMoviesAsync(string? category = null, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, MoviesContainer);
        bool isTopList = string.Equals(category, "top-movies", StringComparison.OrdinalIgnoreCase);
        string orderClause = isTopList ? "ORDER BY c[\"order\"] ASC" : "ORDER BY c[\"order\"] DESC";
        string paginationClause = BuildPaginationClause(page, pageSize);

        IReadOnlyList<MovieDocument> results;
        if (!string.IsNullOrEmpty(category))
        {
            var query = new QueryDefinition($"SELECT * FROM c WHERE c.category = @category {orderClause} {paginationClause}".Trim())
                .WithParameter("@category", category);
            results = await ExecuteQueryAsync<MovieDocument>(container, query, new PartitionKey(category));
        }
        else
        {
            var query = new QueryDefinition($"SELECT * FROM c {orderClause} {paginationClause}".Trim());
            results = await ExecuteQueryAsync<MovieDocument>(container, query);
        }

        return results;
    }

    public async Task<IReadOnlyList<SeriesDocument>> GetSeriesAsync(string? category = null, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, SeriesContainer);
        bool isTopList = string.Equals(category, "top-series", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(category, "top-tv", StringComparison.OrdinalIgnoreCase);
        string orderClause = isTopList ? "ORDER BY c[\"order\"] ASC" : "ORDER BY c[\"order\"] DESC";
        string paginationClause = BuildPaginationClause(page, pageSize);

        IReadOnlyList<SeriesDocument> results;
        if (!string.IsNullOrEmpty(category))
        {
            var query = new QueryDefinition($"SELECT * FROM c WHERE c.category = @category {orderClause} {paginationClause}".Trim())
                .WithParameter("@category", category);
            results = await ExecuteQueryAsync<SeriesDocument>(container, query, new PartitionKey(category));
        }
        else
        {
            var query = new QueryDefinition($"SELECT * FROM c {orderClause} {paginationClause}".Trim());
            results = await ExecuteQueryAsync<SeriesDocument>(container, query);
        }

        return results;
    }

    public async Task<IReadOnlyList<GamingDocument>> GetGamingAsync(string platform, string? section = null, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, GamingContainer);
        bool isTopList = string.Equals(section, "topGames", StringComparison.OrdinalIgnoreCase);
        string orderClause = isTopList ? "ORDER BY c[\"order\"] ASC" : "ORDER BY c[\"order\"] DESC";
        string paginationClause = BuildPaginationClause(page, pageSize);

        QueryDefinition query;
        if (!string.IsNullOrEmpty(section))
        {
            query = new QueryDefinition($"SELECT * FROM c WHERE c.platform = @platform AND c.section = @section {orderClause} {paginationClause}".Trim())
                .WithParameter("@platform", platform)
                .WithParameter("@section", section);
        }
        else
        {
            query = new QueryDefinition($"SELECT * FROM c WHERE c.platform = @platform {orderClause} {paginationClause}".Trim())
                .WithParameter("@platform", platform);
        }

        return await ExecuteQueryAsync<GamingDocument>(container, query, new PartitionKey(platform));
    }

    public async Task<IReadOnlyList<ParkDocument>> GetParksAsync(string provider, string? parkId = null, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, ParksContainer);
        string orderClause = "ORDER BY c[\"order\"] DESC";
        string paginationClause = BuildPaginationClause(page, pageSize);

        QueryDefinition query;
        if (!string.IsNullOrEmpty(parkId))
        {
            query = new QueryDefinition($"SELECT * FROM c WHERE c.provider = @provider AND c.parkId = @parkId {orderClause} {paginationClause}".Trim())
                .WithParameter("@provider", provider)
                .WithParameter("@parkId", parkId);
        }
        else
        {
            query = new QueryDefinition($"SELECT * FROM c WHERE c.provider = @provider {orderClause} {paginationClause}".Trim())
                .WithParameter("@provider", provider);
        }

        return await ExecuteQueryAsync<ParkDocument>(container, query, new PartitionKey(provider));
    }

    public async Task<IReadOnlyList<MonthlyUpdateDocument>> GetMonthlyUpdatesAsync(string month, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, MonthlyUpdatesContainer);
        string paginationClause = BuildPaginationClause(page, pageSize);
        var query = new QueryDefinition($"SELECT * FROM c WHERE c.month = @month ORDER BY c[\"order\"] DESC {paginationClause}".Trim())
            .WithParameter("@month", month);
        return await ExecuteQueryAsync<MonthlyUpdateDocument>(container, query, new PartitionKey(month));
    }

    public async Task<IReadOnlyList<string>> GetMonthlyUpdateMonthsAsync()
    {
        var container = _client.GetContainer(_databaseName, MonthlyUpdatesContainer);
        var query = new QueryDefinition("SELECT DISTINCT VALUE c.month FROM c");
        var months = await ExecuteQueryAsync<string>(container, query);
        return months.OrderByDescending(m => m).ToList();
    }

    private static string BuildPaginationClause(int? page, int? pageSize)
    {
        if (page.HasValue && pageSize.HasValue && page.Value >= 1 && pageSize.Value >= 1)
        {
            int skip = (page.Value - 1) * pageSize.Value;
            return $"OFFSET {skip} LIMIT {pageSize.Value}";
        }
        return string.Empty;
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
    public Task<IReadOnlyList<MovieDocument>> GetMoviesAsync(string? category = null, int? page = null, int? pageSize = null) => Task.FromResult<IReadOnlyList<MovieDocument>>(Array.Empty<MovieDocument>());
    public Task<IReadOnlyList<SeriesDocument>> GetSeriesAsync(string? category = null, int? page = null, int? pageSize = null) => Task.FromResult<IReadOnlyList<SeriesDocument>>(Array.Empty<SeriesDocument>());
    public Task<IReadOnlyList<GamingDocument>> GetGamingAsync(string platform, string? section = null, int? page = null, int? pageSize = null) => Task.FromResult<IReadOnlyList<GamingDocument>>(Array.Empty<GamingDocument>());
    public Task<IReadOnlyList<ParkDocument>> GetParksAsync(string provider, string? parkId = null, int? page = null, int? pageSize = null) => Task.FromResult<IReadOnlyList<ParkDocument>>(Array.Empty<ParkDocument>());
    public Task<IReadOnlyList<MonthlyUpdateDocument>> GetMonthlyUpdatesAsync(string month, int? page = null, int? pageSize = null) => Task.FromResult<IReadOnlyList<MonthlyUpdateDocument>>(Array.Empty<MonthlyUpdateDocument>());
    public Task<IReadOnlyList<string>> GetMonthlyUpdateMonthsAsync() => Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
}
