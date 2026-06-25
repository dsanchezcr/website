using System.Net;
using System.Text.Json.Nodes;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace api.Services;

/// <summary>
/// A content type the admin tool can manage, mapped to its Cosmos container and partition key field.
/// </summary>
public sealed record AdminContentType(string Slug, string Container, string PartitionKeyField);

/// <summary>
/// Allow-list of the content types editable through the admin API. Anything not in this map is
/// rejected at the boundary, preventing the admin API from touching other containers
/// (e.g. newsletter-subscribers).
/// </summary>
public static class AdminContentTypes
{
    public static readonly IReadOnlyDictionary<string, AdminContentType> All =
        new Dictionary<string, AdminContentType>(StringComparer.OrdinalIgnoreCase)
        {
            ["movies"] = new("movies", "content-movies", "category"),
            ["series"] = new("series", "content-series", "category"),
            ["gaming"] = new("gaming", "content-gaming", "platform"),
            ["parks"] = new("parks", "content-parks", "provider"),
            ["monthly-updates"] = new("monthly-updates", "content-monthly-updates", "month"),
        };

    public static IReadOnlyList<string> Slugs { get; } = All.Keys.ToArray();

    public static bool TryGet(string? slug, out AdminContentType type)
    {
        if (!string.IsNullOrWhiteSpace(slug) && All.TryGetValue(slug, out var t))
        {
            type = t;
            return true;
        }
        type = null!;
        return false;
    }
}

/// <summary>
/// Read/write access to the curated content containers for the admin tool. Operates on raw
/// <see cref="JsonObject"/> documents so that fields not represented in the typed models are
/// preserved on save (avoids breaking production data).
/// </summary>
public interface ICosmosAdminService
{
    bool IsConfigured { get; }

    Task<IReadOnlyList<JsonObject>> ListAsync(AdminContentType type, string? partitionValue, CancellationToken ct = default);
    Task<(JsonObject? Doc, string? ETag)> GetAsync(AdminContentType type, string id, string partitionValue, CancellationToken ct = default);
    Task<JsonObject?> GetSampleAsync(AdminContentType type, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetPartitionValuesAsync(AdminContentType type, CancellationToken ct = default);
    Task<(JsonObject Doc, string? ETag)> CreateAsync(AdminContentType type, JsonObject doc, CancellationToken ct = default);
    Task<(JsonObject Doc, string? ETag)> ReplaceAsync(AdminContentType type, string id, JsonObject doc, string? ifMatchEtag, CancellationToken ct = default);
    Task DeleteAsync(AdminContentType type, string id, string partitionValue, CancellationToken ct = default);
}

/// <summary>
/// Cosmos DB–backed implementation of <see cref="ICosmosAdminService"/>. Reuses the shared
/// <see cref="CosmosClient"/> (key-based — SWA managed functions cannot use managed identity).
/// </summary>
public class CosmosAdminService : ICosmosAdminService
{
    private readonly CosmosClient _client;
    private readonly string _databaseName;
    private readonly ILogger<CosmosAdminService> _logger;

    // Cosmos-managed system properties that must never be persisted from client input nor
    // surfaced to the editor (they are read-only and would pollute the round-tripped document).
    private static readonly string[] SystemProperties = { "_rid", "_self", "_etag", "_attachments", "_ts" };

    public CosmosAdminService(CosmosClient client, string databaseName, ILogger<CosmosAdminService> logger)
    {
        _client = client;
        _databaseName = databaseName;
        _logger = logger;
    }

    public bool IsConfigured => true;

    public async Task<IReadOnlyList<JsonObject>> ListAsync(AdminContentType type, string? partitionValue, CancellationToken ct = default)
    {
        var container = _client.GetContainer(_databaseName, type.Container);

        QueryDefinition query;
        PartitionKey? pk = null;
        if (!string.IsNullOrWhiteSpace(partitionValue))
        {
            query = new QueryDefinition($"SELECT * FROM c WHERE c[\"{type.PartitionKeyField}\"] = @pk")
                .WithParameter("@pk", partitionValue);
            pk = new PartitionKey(partitionValue);
        }
        else
        {
            query = new QueryDefinition("SELECT * FROM c");
        }

        var items = await QueryAsync<JsonObject>(container, query, pk, ct);
        foreach (var item in items) StripSystemProperties(item);
        return items;
    }

    public async Task<(JsonObject? Doc, string? ETag)> GetAsync(AdminContentType type, string id, string partitionValue, CancellationToken ct = default)
    {
        var container = _client.GetContainer(_databaseName, type.Container);
        try
        {
            var resp = await container.ReadItemAsync<JsonObject>(id, new PartitionKey(partitionValue), cancellationToken: ct);
            var doc = resp.Resource;
            if (doc != null) StripSystemProperties(doc);
            return (doc, resp.ETag);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return (null, null);
        }
    }

    public async Task<JsonObject?> GetSampleAsync(AdminContentType type, CancellationToken ct = default)
    {
        var container = _client.GetContainer(_databaseName, type.Container);
        var items = await QueryAsync<JsonObject>(container, new QueryDefinition("SELECT TOP 1 * FROM c"), null, ct);
        var doc = items.FirstOrDefault();
        if (doc != null) StripSystemProperties(doc);
        return doc;
    }

    public async Task<IReadOnlyList<string>> GetPartitionValuesAsync(AdminContentType type, CancellationToken ct = default)
    {
        var container = _client.GetContainer(_databaseName, type.Container);
        var query = new QueryDefinition($"SELECT DISTINCT VALUE c[\"{type.PartitionKeyField}\"] FROM c");
        var values = await QueryAsync<string>(container, query, null, ct);
        return values.Where(v => !string.IsNullOrWhiteSpace(v)).OrderBy(v => v, StringComparer.OrdinalIgnoreCase).ToList();
    }

    public async Task<(JsonObject Doc, string? ETag)> CreateAsync(AdminContentType type, JsonObject doc, CancellationToken ct = default)
    {
        var container = _client.GetContainer(_databaseName, type.Container);
        StripSystemProperties(doc);

        var id = TryGetString(doc["id"]);
        if (string.IsNullOrWhiteSpace(id))
        {
            id = Guid.NewGuid().ToString("N");
            doc["id"] = id;
        }

        var partitionValue = TryGetString(doc[type.PartitionKeyField]) ?? string.Empty;
        var resp = await container.CreateItemAsync(doc, new PartitionKey(partitionValue), cancellationToken: ct);
        var created = resp.Resource;
        StripSystemProperties(created);
        _logger.LogInformation("Admin created {Type} document {Id} in partition {Pk}", type.Slug, id, partitionValue);
        return (created, resp.ETag);
    }

    public async Task<(JsonObject Doc, string? ETag)> ReplaceAsync(AdminContentType type, string id, JsonObject doc, string? ifMatchEtag, CancellationToken ct = default)
    {
        var container = _client.GetContainer(_databaseName, type.Container);
        StripSystemProperties(doc);
        doc["id"] = id; // route id is authoritative

        var partitionValue = TryGetString(doc[type.PartitionKeyField]) ?? string.Empty;
        var options = string.IsNullOrWhiteSpace(ifMatchEtag) ? null : new ItemRequestOptions { IfMatchEtag = ifMatchEtag };

        var resp = await container.ReplaceItemAsync(doc, id, new PartitionKey(partitionValue), options, ct);
        var updated = resp.Resource;
        StripSystemProperties(updated);
        _logger.LogInformation("Admin updated {Type} document {Id} in partition {Pk}", type.Slug, id, partitionValue);
        return (updated, resp.ETag);
    }

    public async Task DeleteAsync(AdminContentType type, string id, string partitionValue, CancellationToken ct = default)
    {
        var container = _client.GetContainer(_databaseName, type.Container);
        await container.DeleteItemAsync<JsonObject>(id, new PartitionKey(partitionValue), cancellationToken: ct);
        _logger.LogInformation("Admin deleted {Type} document {Id} in partition {Pk}", type.Slug, id, partitionValue);
    }

    private static async Task<List<T>> QueryAsync<T>(Container container, QueryDefinition query, PartitionKey? pk, CancellationToken ct)
    {
        var results = new List<T>();
        var options = new QueryRequestOptions();
        if (pk.HasValue) options.PartitionKey = pk.Value;

        using var iterator = container.GetItemQueryIterator<T>(query, requestOptions: options);
        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync(ct);
            results.AddRange(response);
        }
        return results;
    }

    internal static void StripSystemProperties(JsonObject doc)
    {
        foreach (var prop in SystemProperties)
            doc.Remove(prop);
    }

    private static string? TryGetString(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var s) ? s : null;
}

/// <summary>
/// No-op implementation used when Cosmos DB is not configured. All operations report
/// "not configured" so the admin endpoints return 503.
/// </summary>
public class NullCosmosAdminService : ICosmosAdminService
{
    public bool IsConfigured => false;

    public Task<IReadOnlyList<JsonObject>> ListAsync(AdminContentType type, string? partitionValue, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<JsonObject>>(Array.Empty<JsonObject>());
    public Task<(JsonObject? Doc, string? ETag)> GetAsync(AdminContentType type, string id, string partitionValue, CancellationToken ct = default)
        => Task.FromResult<(JsonObject?, string?)>((null, null));
    public Task<JsonObject?> GetSampleAsync(AdminContentType type, CancellationToken ct = default)
        => Task.FromResult<JsonObject?>(null);
    public Task<IReadOnlyList<string>> GetPartitionValuesAsync(AdminContentType type, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>());
    public Task<(JsonObject Doc, string? ETag)> CreateAsync(AdminContentType type, JsonObject doc, CancellationToken ct = default)
        => throw new InvalidOperationException("Cosmos DB is not configured.");
    public Task<(JsonObject Doc, string? ETag)> ReplaceAsync(AdminContentType type, string id, JsonObject doc, string? ifMatchEtag, CancellationToken ct = default)
        => throw new InvalidOperationException("Cosmos DB is not configured.");
    public Task DeleteAsync(AdminContentType type, string id, string partitionValue, CancellationToken ct = default)
        => throw new InvalidOperationException("Cosmos DB is not configured.");
}
