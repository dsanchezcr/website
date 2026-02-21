using Azure;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using Microsoft.Extensions.Logging;

namespace api.Services;

/// <summary>
/// Service for querying Azure AI Search to provide context for the AI assistant.
/// Implements DIY RAG pattern: query search → inject into prompt → call OpenAI.
/// </summary>
public interface ISearchService
{
    /// <summary>
    /// Searches the index for content relevant to the user's query.
    /// </summary>
    /// <param name="query">User's question</param>
    /// <param name="maxResults">Maximum number of results (default: 3)</param>
    /// <returns>Formatted search results to inject into prompt</returns>
    Task<string> SearchAsync(string query, int maxResults = 3);
    
    /// <summary>
    /// Indexes documents into Azure AI Search.
    /// </summary>
    /// <param name="documents">Documents to index</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of documents successfully indexed</returns>
    Task<int> IndexDocumentsAsync(IEnumerable<SearchDocument> documents, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Checks if the service is properly configured and operational.
    /// </summary>
    Task<(bool IsHealthy, string Message)> CheckHealthAsync();
    
    /// <summary>
    /// Returns whether search is configured (to skip search when not available).
    /// </summary>
    bool IsConfigured { get; }
}

/// <summary>
/// Azure AI Search implementation for DIY RAG.
/// </summary>
public class AzureSearchService : ISearchService
{
    private readonly SearchClient? _searchClient;
    private readonly ILogger<AzureSearchService> _logger;
    private readonly bool _isConfigured;

    public bool IsConfigured => _isConfigured;

    public AzureSearchService(ILogger<AzureSearchService> logger)
    {
        _logger = logger;
        
        var endpoint = Environment.GetEnvironmentVariable("AZURE_SEARCH_ENDPOINT");
        var apiKey = Environment.GetEnvironmentVariable("AZURE_SEARCH_API_KEY");
        var indexName = Environment.GetEnvironmentVariable("AZURE_SEARCH_INDEX_NAME");

        if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(indexName))
        {
            _logger.LogWarning("Azure AI Search not configured. Chat will use static system prompt only.");
            _isConfigured = false;
            return;
        }

        try
        {
            var searchEndpoint = new Uri(endpoint);
            var credential = new AzureKeyCredential(apiKey);
            _searchClient = new SearchClient(searchEndpoint, indexName, credential);
            _isConfigured = true;
            _logger.LogInformation("Azure AI Search configured with index: {IndexName}", indexName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Azure AI Search client");
            _isConfigured = false;
        }
    }

    public async Task<string> SearchAsync(string query, int maxResults = 3)
    {
        if (!_isConfigured || _searchClient == null)
        {
            return string.Empty;
        }

        try
        {
            var searchOptions = new SearchOptions
            {
                Size = maxResults,
                QueryType = SearchQueryType.Simple,
                SearchMode = SearchMode.Any,
                IncludeTotalCount = true
            };

            // Add select fields if they exist in the index
            // Common fields for blog/content indexes
            searchOptions.Select.Add("title");
            searchOptions.Select.Add("content");
            searchOptions.Select.Add("url");
            searchOptions.Select.Add("description");
            searchOptions.Select.Add("category");

            var response = await _searchClient.SearchAsync<SearchDocument>(query, searchOptions);
            
            if (response.Value.TotalCount == 0)
            {
                _logger.LogDebug("No search results found for query: {Query}", query);
                return string.Empty;
            }

            var results = new List<string>();
            await foreach (var result in response.Value.GetResultsAsync())
            {
                var doc = result.Document;
                var title = GetFieldValue(doc, "title");
                var content = GetFieldValue(doc, "content", "description");
                var url = GetFieldValue(doc, "url");
                var category = GetFieldValue(doc, "category");

                if (!string.IsNullOrEmpty(content))
                {
                    // Truncate content to avoid token limits
                    if (content.Length > 1000)
                    {
                        content = content.Substring(0, 1000) + "...";
                    }

                    var resultText = new System.Text.StringBuilder();
                    if (!string.IsNullOrEmpty(title))
                        resultText.AppendLine($"**{title}**");
                    if (!string.IsNullOrEmpty(category))
                        resultText.AppendLine($"Category: {category}");
                    resultText.AppendLine(content);
                    if (!string.IsNullOrEmpty(url))
                        resultText.AppendLine($"URL: {url}");
                    
                    results.Add(resultText.ToString());
                }
            }

            if (results.Count == 0)
            {
                return string.Empty;
            }

            _logger.LogInformation("Search found {Count} relevant results for query", results.Count);
            
            return $@"

## Relevant Website Content
The following content from dsanchezcr.com may help answer the question:

{string.Join("\n---\n", results)}
";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Search query failed for: {Query}", query);
            return string.Empty;
        }
    }

    private static string GetFieldValue(SearchDocument doc, params string[] fieldNames)
    {
        foreach (var fieldName in fieldNames)
        {
            if (doc.TryGetValue(fieldName, out var value) && value != null)
            {
                return value.ToString() ?? string.Empty;
            }
        }
        return string.Empty;
    }

    public async Task<(bool IsHealthy, string Message)> CheckHealthAsync()
    {
        if (!_isConfigured || _searchClient == null)
        {
            return (true, "Azure AI Search not configured (optional feature)");
        }

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            
            // Simple count query to verify connectivity
            var options = new SearchOptions { Size = 0, IncludeTotalCount = true };
            var response = await _searchClient.SearchAsync<SearchDocument>("*", options);
            
            sw.Stop();
            
            var docCount = response.Value.TotalCount ?? 0;
            return (true, $"Azure AI Search operational ({docCount} documents, {sw.ElapsedMilliseconds}ms)");
        }
        catch (Exception ex)
        {
            return (false, $"Azure AI Search error: {ex.Message}");
        }
    }

    public async Task<int> IndexDocumentsAsync(IEnumerable<SearchDocument> documents, CancellationToken cancellationToken = default)
    {
        if (!_isConfigured || _searchClient == null)
        {
            _logger.LogWarning("Cannot index documents: Azure AI Search not configured");
            return 0;
        }

        var docList = documents.ToList();
        if (docList.Count == 0)
        {
            _logger.LogInformation("No documents to index");
            return 0;
        }

        try
        {
            // Upload in batches of 100 to avoid request size limits
            const int batchSize = 100;
            var totalSuccess = 0;

            for (var i = 0; i < docList.Count; i += batchSize)
            {
                var batch = docList.Skip(i).Take(batchSize).ToList();
                var indexBatch = IndexDocumentsBatch.MergeOrUpload(batch);
                var response = await _searchClient.IndexDocumentsAsync(indexBatch, cancellationToken: cancellationToken);
                
                var successCount = response.Value.Results.Count(r => r.Succeeded);
                totalSuccess += successCount;
                
                _logger.LogDebug("Indexed batch {BatchNumber}: {Success}/{Total} documents",
                    (i / batchSize) + 1, successCount, batch.Count);
            }

            _logger.LogInformation("Successfully indexed {Success}/{Total} documents", totalSuccess, docList.Count);
            return totalSuccess;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to index {Count} documents", docList.Count);
            throw;
        }
    }
}
