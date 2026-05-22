using System.IO;
using System.Text.Json;
using Azure.Core;
using Microsoft.Azure.Cosmos;
using CosmosManager.Models;

namespace CosmosManager.Services;

public class CosmosManagerService : IDisposable
{
    private readonly CosmosClient _client;
    private readonly string _databaseName;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    public const string MoviesContainer = "content-movies";
    public const string SeriesContainer = "content-series";
    public const string GamingContainer = "content-gaming";
    public const string ParksContainer = "content-parks";
    public const string MonthlyUpdatesContainer = "content-monthly-updates";

    public CosmosManagerService(string endpoint, string key, string databaseName)
    {
        var options = BuildOptions();
        _client = new CosmosClient(endpoint, key, options);
        _databaseName = databaseName;
    }

    public CosmosManagerService(string endpoint, TokenCredential credential, string databaseName)
    {
        var options = BuildOptions();
        _client = new CosmosClient(endpoint, credential, options);
        _databaseName = databaseName;
    }

    private static CosmosClientOptions BuildOptions() => new()
    {
        UseSystemTextJsonSerializerWithOptions = JsonOptions,
        ConnectionMode = ConnectionMode.Gateway
    };

    private Container GetContainer(string containerName) =>
        _client.GetContainer(_databaseName, containerName);

    // ── Generic CRUD ──

    public async Task<List<T>> GetAllAsync<T>(string containerName, string? partitionKeyFilter = null, string? partitionKeyField = null)
    {
        var container = GetContainer(containerName);
        var results = new List<T>();

        QueryDefinition query;
        QueryRequestOptions? options = null;

        if (!string.IsNullOrEmpty(partitionKeyFilter) && !string.IsNullOrEmpty(partitionKeyField))
        {
            query = new QueryDefinition($"SELECT * FROM c WHERE c.{partitionKeyField} = @pk")
                .WithParameter("@pk", partitionKeyFilter);
            options = new QueryRequestOptions { PartitionKey = new PartitionKey(partitionKeyFilter) };
        }
        else
        {
            query = new QueryDefinition("SELECT * FROM c");
        }

        using var iterator = container.GetItemQueryIterator<T>(query, requestOptions: options);
        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            results.AddRange(response);
        }

        return results;
    }

    public async Task<T> CreateAsync<T>(string containerName, T item, string partitionKeyValue) where T : ContentDocument
    {
        var container = GetContainer(containerName);
        var response = await container.CreateItemAsync(item, new PartitionKey(partitionKeyValue));
        return response.Resource;
    }

    public async Task<T> UpdateAsync<T>(string containerName, T item, string partitionKeyValue) where T : ContentDocument
    {
        var container = GetContainer(containerName);
        var response = await container.ReplaceItemAsync(item, item.Id, new PartitionKey(partitionKeyValue));
        return response.Resource;
    }

    public async Task DeleteAsync(string containerName, string id, string partitionKeyValue)
    {
        var container = GetContainer(containerName);
        await container.DeleteItemAsync<object>(id, new PartitionKey(partitionKeyValue));
    }

    // ── JSON helpers for raw editing ──

    public async Task<string> GetItemJsonAsync(string containerName, string id, string partitionKeyValue)
    {
        var container = GetContainer(containerName);
        var response = await container.ReadItemStreamAsync(id, new PartitionKey(partitionKeyValue));
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Failed to read item '{id}' from '{containerName}': {response.StatusCode}");
        using var reader = new StreamReader(response.Content);
        var raw = await reader.ReadToEndAsync();
        // Re-format with indentation
        using var doc = JsonDocument.Parse(raw);
        return JsonSerializer.Serialize(doc, JsonOptions);
    }

    public async Task SaveItemJsonAsync(string containerName, string json, string partitionKeyValue)
    {
        var container = GetContainer(containerName);
        string id;
        using (var doc = JsonDocument.Parse(json))
        {
            if (!doc.RootElement.TryGetProperty("id", out var idElem) || idElem.GetString() is not string parsed || string.IsNullOrEmpty(parsed))
                throw new InvalidOperationException("JSON must contain a non-empty 'id' property.");
            id = parsed;
        }
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        using var stream = new MemoryStream(bytes, writable: false);
        using var response = await container.ReplaceItemStreamAsync(stream, id, new PartitionKey(partitionKeyValue));
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Cosmos replace failed: {(int)response.StatusCode} {response.StatusCode}. {await ReadBodyAsync(response.Content)}");
    }

    public async Task CreateItemFromJsonAsync(string containerName, string json, string partitionKeyValue)
    {
        var container = GetContainer(containerName);
        using (var doc = JsonDocument.Parse(json))
        {
            if (!doc.RootElement.TryGetProperty("id", out _))
                throw new InvalidOperationException("JSON must contain an 'id' property.");
        }
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        using var stream = new MemoryStream(bytes, writable: false);
        using var response = await container.CreateItemStreamAsync(stream, new PartitionKey(partitionKeyValue));
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Cosmos create failed: {(int)response.StatusCode} {response.StatusCode}. {await ReadBodyAsync(response.Content)}");
    }

    private static async Task<string> ReadBodyAsync(Stream? content)
    {
        if (content is null) return string.Empty;
        try { using var r = new StreamReader(content); return await r.ReadToEndAsync(); }
        catch { return string.Empty; }
    }

    /// <summary>
    /// Fetches a single sample document (TOP 1) from the container — optionally filtered by partition key —
    /// so the form can show the actual data structure stored in the database.
    /// </summary>
    public async Task<string?> GetSampleDocumentAsync(string containerName, string? partitionKeyField, string? partitionKeyValue)
    {
        var container = GetContainer(containerName);
        QueryDefinition query;
        QueryRequestOptions? options = null;
        if (!string.IsNullOrEmpty(partitionKeyField) && !string.IsNullOrEmpty(partitionKeyValue))
        {
            query = new QueryDefinition($"SELECT TOP 1 * FROM c WHERE c.{partitionKeyField} = @pk").WithParameter("@pk", partitionKeyValue);
            options = new QueryRequestOptions { PartitionKey = new PartitionKey(partitionKeyValue) };
        }
        else
        {
            query = new QueryDefinition("SELECT TOP 1 * FROM c");
        }
        using var iterator = container.GetItemQueryStreamIterator(query, requestOptions: options);
        while (iterator.HasMoreResults)
        {
            using var response = await iterator.ReadNextAsync();
            if (!response.IsSuccessStatusCode) continue;
            using var reader = new StreamReader(response.Content);
            var raw = await reader.ReadToEndAsync();
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.TryGetProperty("Documents", out var docs) && docs.ValueKind == JsonValueKind.Array && docs.GetArrayLength() > 0)
                return JsonSerializer.Serialize(docs[0], JsonOptions);
        }
        return null;
    }

    // ── Distinct values ──

    public async Task<List<string>> GetDistinctValuesAsync(string containerName, string fieldName)
    {
        var container = GetContainer(containerName);
        var query = new QueryDefinition($"SELECT DISTINCT VALUE c.{fieldName} FROM c");
        var results = new List<string>();

        using var iterator = container.GetItemQueryIterator<string>(query);
        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            results.AddRange(response);
        }

        return results.OrderBy(v => v).ToList();
    }

    public async Task<bool> TestConnectionAsync()
    {
        var database = _client.GetDatabase(_databaseName);
        await database.ReadAsync();
        return true;
    }

    public void Dispose()
    {
        _client.Dispose();
        GC.SuppressFinalize(this);
    }
}
