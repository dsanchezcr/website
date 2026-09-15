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
        var pagination = BuildPaginationClause(page, pageSize);

        IReadOnlyList<MovieDocument> results;
        if (!string.IsNullOrEmpty(category))
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.category = @category")
                .WithParameter("@category", category);
            results = await ExecuteQueryAsync<MovieDocument>(container, query, new PartitionKey(category));
        }
        else
        {
            var query = new QueryDefinition("SELECT * FROM c");
            results = await ExecuteQueryAsync<MovieDocument>(container, query);
        }

        // Sort before paging so legacy docs missing indexed order fields remain visible.
        var sorted = MediaOrdering.Sort(results, category?.ToLowerInvariant());
        return pagination.Take > 0 ? sorted.Skip((int)pagination.Skip).Take(pagination.Take).ToList() : sorted;
    }

    public async Task<IReadOnlyList<SeriesDocument>> GetSeriesAsync(string? category = null, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, SeriesContainer);
        var pagination = BuildPaginationClause(page, pageSize);

        IReadOnlyList<SeriesDocument> results;
        if (!string.IsNullOrEmpty(category))
        {
            var query = new QueryDefinition("SELECT * FROM c WHERE c.category = @category")
                .WithParameter("@category", category);
            results = await ExecuteQueryAsync<SeriesDocument>(container, query, new PartitionKey(category));
        }
        else
        {
            var query = new QueryDefinition("SELECT * FROM c");
            results = await ExecuteQueryAsync<SeriesDocument>(container, query);
        }

        var sorted = MediaOrdering.Sort(results, category?.ToLowerInvariant());
        return pagination.Take > 0 ? sorted.Skip((int)pagination.Skip).Take(pagination.Take).ToList() : sorted;
    }

    public async Task<IReadOnlyList<GamingDocument>> GetGamingAsync(string platform, string? section = null, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, GamingContainer);

        QueryDefinition query;
        if (!string.IsNullOrEmpty(section))
        {
            query = new QueryDefinition("SELECT * FROM c WHERE c.platform = @platform AND c.section = @section")
                .WithParameter("@platform", platform)
                .WithParameter("@section", section);
        }
        else
        {
            query = new QueryDefinition("SELECT * FROM c WHERE c.platform = @platform")
                .WithParameter("@platform", platform);
        }

        // Sort the small curated partition before paging, including legacy documents that
        // lack createdAt/manualOrder. A Cosmos ORDER BY would exclude missing indexed fields.
        var items = await ExecuteQueryAsync<GamingDocument>(container, query, new PartitionKey(platform));
        var sorted = GamingOrdering.Sort(items, section);
        var pagination = BuildPaginationClause(page, pageSize);
        return pagination.Take > 0
            ? sorted.Skip((int)pagination.Skip).Take(pagination.Take).ToList()
            : sorted;
    }

    public async Task<IReadOnlyList<ParkDocument>> GetParksAsync(string provider, string? parkId = null, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, ParksContainer);
        string orderClause = "ORDER BY c[\"order\"] DESC";
        var pagination = BuildPaginationClause(page, pageSize);

        QueryDefinition query;
        if (!string.IsNullOrEmpty(parkId))
        {
            query = ApplyPagination(
                new QueryDefinition($"SELECT * FROM c WHERE c.provider = @provider AND c.parkId = @parkId {orderClause} {pagination.Clause}".Trim())
                    .WithParameter("@provider", provider)
                    .WithParameter("@parkId", parkId),
                pagination);
        }
        else
        {
            query = ApplyPagination(
                new QueryDefinition($"SELECT * FROM c WHERE c.provider = @provider {orderClause} {pagination.Clause}".Trim())
                    .WithParameter("@provider", provider),
                pagination);
        }

        return await ExecuteQueryAsync<ParkDocument>(container, query, new PartitionKey(provider));
    }

    public async Task<IReadOnlyList<MonthlyUpdateDocument>> GetMonthlyUpdatesAsync(string month, int? page = null, int? pageSize = null)
    {
        var container = _client.GetContainer(_databaseName, MonthlyUpdatesContainer);
        var pagination = BuildPaginationClause(page, pageSize);
        var query = ApplyPagination(
            new QueryDefinition($"SELECT * FROM c WHERE c.month = @month ORDER BY c[\"order\"] DESC {pagination.Clause}".Trim())
                .WithParameter("@month", month),
            pagination);
        return await ExecuteQueryAsync<MonthlyUpdateDocument>(container, query, new PartitionKey(month));
    }

    public async Task<IReadOnlyList<string>> GetMonthlyUpdateMonthsAsync()
    {
        var container = _client.GetContainer(_databaseName, MonthlyUpdatesContainer);
        var query = new QueryDefinition("SELECT DISTINCT VALUE c.month FROM c");
        var months = await ExecuteQueryAsync<string>(container, query);
        return months.OrderByDescending(m => m).ToList();
    }

    /// <summary>
    /// Builds a parameterized "OFFSET @skip LIMIT @take" clause for the given page/pageSize,
    /// clamping both to <see cref="QueryHelpers.MaxPage"/> / <see cref="QueryHelpers.MaxPageSize"/>
    /// as defense-in-depth against unbounded OFFSET scans (endpoints validate these bounds too).
    /// </summary>
    private static (string Clause, long Skip, int Take) BuildPaginationClause(int? page, int? pageSize)
    {
        if (page is null || pageSize is null || page < 1 || pageSize < 1)
        {
            return (string.Empty, 0, 0);
        }

        int effectivePageSize = Math.Min(pageSize.Value, QueryHelpers.MaxPageSize);
        int effectivePage = Math.Min(page.Value, QueryHelpers.MaxPage);

        long skip = ((long)effectivePage - 1) * effectivePageSize;
        return ("OFFSET @skip LIMIT @take", skip, effectivePageSize);
    }

    /// <summary>
    /// Applies the "@skip"/"@take" parameters to <paramref name="query"/> when
    /// <paramref name="pagination"/> represents an active pagination clause.
    /// </summary>
    private static QueryDefinition ApplyPagination(QueryDefinition query, (string Clause, long Skip, int Take) pagination)
    {
        return string.IsNullOrEmpty(pagination.Clause)
            ? query
            : query.WithParameter("@skip", pagination.Skip).WithParameter("@take", pagination.Take);
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
