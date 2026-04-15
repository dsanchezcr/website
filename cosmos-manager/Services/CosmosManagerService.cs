using System.IO;
using System.Text.Json;
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
        var options = new CosmosClientOptions
        {
            UseSystemTextJsonSerializerWithOptions = JsonOptions,
            ConnectionMode = ConnectionMode.Gateway
        };
        _client = new CosmosClient(endpoint, key, options);
        _databaseName = databaseName;
    }

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
        using var reader = new StreamReader(response.Content);
        var raw = await reader.ReadToEndAsync();
        // Re-format with indentation
        using var doc = JsonDocument.Parse(raw);
        return JsonSerializer.Serialize(doc, JsonOptions);
    }

    public async Task SaveItemJsonAsync(string containerName, string json, string partitionKeyValue)
    {
        var container = GetContainer(containerName);
        using var doc = JsonDocument.Parse(json);
        var id = doc.RootElement.GetProperty("id").GetString()
                 ?? throw new InvalidOperationException("JSON must contain an 'id' property.");
        using var stream = new MemoryStream();
        await JsonSerializer.SerializeAsync(stream, doc, JsonOptions);
        stream.Position = 0;
        await container.ReplaceItemStreamAsync(stream, id, new PartitionKey(partitionKeyValue));
    }

    public async Task CreateItemFromJsonAsync(string containerName, string json, string partitionKeyValue)
    {
        var container = GetContainer(containerName);
        using var stream = new MemoryStream();
        using var doc = JsonDocument.Parse(json);
        await JsonSerializer.SerializeAsync(stream, doc, JsonOptions);
        stream.Position = 0;
        await container.CreateItemStreamAsync(stream, new PartitionKey(partitionKeyValue));
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
