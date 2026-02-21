using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Search.Documents.Models;
using api.Services;

namespace api;

/// <summary>
/// HTTP endpoint to trigger content reindexing for Azure AI Search.
/// Called by GitHub Actions after deployment to main branch.
/// Secured with a secret key header.
/// 
/// Supports hybrid approach:
/// 1. Primary: Content extracted from MDX files passed in request body (from GitHub Actions)
/// 2. Fallback: Crawls deployed website and blog feed if no content provided
/// 
/// Security considerations:
/// - Uses constant-time comparison for secret key to prevent timing attacks
/// - Validates content size to prevent memory exhaustion
/// - Applies timeouts to all external HTTP requests
/// </summary>
public class ReindexContent
{
    private readonly ILogger<ReindexContent> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ISearchService _searchService;

    // Pages to crawl from the website (fallback mode)
    private static readonly (string Id, string Path)[] WebsitePages = new[]
    {
        ("about", "/about"),
        ("projects", "/projects"),
        ("contact", "/contact"),
        ("sponsors", "/sponsors"),
        ("disney", "/disney"),
        ("universal", "/universal"),
        ("weather", "/weather"),
        ("exchangerates", "/exchangerates")
    };

    // Configuration constants
    private const int MaxContentSizeBytes = 10 * 1024 * 1024; // 10 MB max request body
    private const int HttpTimeoutSeconds = 30;
    private const int MaxContentLength = 5000; // Max content per document

    public ReindexContent(ILogger<ReindexContent> logger, IHttpClientFactory httpClientFactory, ISearchService searchService)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _searchService = searchService;
    }

    /// <summary>
    /// Constant-time string comparison to prevent timing attacks on secret key.
    /// </summary>
    private static bool SecureCompare(string? a, string? b)
    {
        if (a == null || b == null)
            return a == b;

        var aBytes = Encoding.UTF8.GetBytes(a);
        var bBytes = Encoding.UTF8.GetBytes(b);

        return CryptographicOperations.FixedTimeEquals(aBytes, bBytes);
    }

    [Function("ReindexContent")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "reindex")] HttpRequestData req,
        CancellationToken cancellationToken)
    {
            var correlationId = Guid.NewGuid().ToString("D");

            // Verify secret key to prevent unauthorized calls
            var authHeader = req.Headers.TryGetValues("X-Reindex-Key", out var keys)
                ? keys.FirstOrDefault()
                : null;

            var expectedKey = Environment.GetEnvironmentVariable("REINDEX_SECRET_KEY");

            if (string.IsNullOrEmpty(expectedKey))
            {
                _logger.LogWarning("[{CorrelationId}] REINDEX_SECRET_KEY not configured", correlationId);
                var notConfigured = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
                notConfigured.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await notConfigured.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    error = "Reindex endpoint not configured",
                    errorId = correlationId
                }));
                return notConfigured;
            }

            // Use constant-time comparison to prevent timing attacks
            if (!SecureCompare(authHeader, expectedKey))
            {
                _logger.LogWarning("[{CorrelationId}] Reindex authentication failed", correlationId);
                var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
                unauthorized.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await unauthorized.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    error = "Invalid or missing X-Reindex-Key header",
                    errorId = correlationId
                }));
                return unauthorized;
            }

            if (!_searchService.IsConfigured)
            {
                _logger.LogWarning("[{CorrelationId}] Azure AI Search not configured", correlationId);
                var notConfigured = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
                notConfigured.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await notConfigured.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    error = "Azure AI Search not configured",
                    errorId = correlationId
                }));
                return notConfigured;
            }

            _logger.LogInformation("[{CorrelationId}] Starting content reindexing", correlationId);

            try
            {
                var results = new List<IndexResult>();

                // Check if content was passed in the request body (from GitHub Actions)
                var requestBody = await req.ReadAsStringAsync();
                List<SearchDocument> pageDocs;
                List<SearchDocument> blogDocs;

                if (!string.IsNullOrWhiteSpace(requestBody) && requestBody.TrimStart().StartsWith("{"))
                {
                    // Content provided by GitHub Actions script
                    _logger.LogInformation("[{CorrelationId}] Using content from request body", correlationId);
                    var providedContent = JsonSerializer.Deserialize<ProvidedContent>(requestBody,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    pageDocs = providedContent?.Pages?
                        .Select(CreateSearchDocument)
                        .ToList() ?? new List<SearchDocument>();

                    blogDocs = providedContent?.BlogPosts?
                        .Select(CreateSearchDocument)
                        .ToList() ?? new List<SearchDocument>();

                    _logger.LogInformation("[{CorrelationId}] Received {Pages} pages and {Posts} blog posts",
                        correlationId, pageDocs.Count, blogDocs.Count);
                }
                else
                {
                    // Fallback: Crawl the website
                    _logger.LogInformation("[{CorrelationId}] No content in request body, falling back to website crawling",
                        correlationId);
                    pageDocs = await CrawlWebsitePagesAsync(cancellationToken);
                    blogDocs = await CrawlBlogFeedAsync(cancellationToken);
                }

                results.Add(new IndexResult("pages", pageDocs.Count));
                results.Add(new IndexResult("blog", blogDocs.Count));

                // Index GitHub repos (always fetched fresh from API)
                var githubDocs = await IndexGitHubReposAsync(cancellationToken);
                results.Add(new IndexResult("github", githubDocs.Count));

                // Combine and upload all documents
                var allDocs = pageDocs.Concat(blogDocs).Concat(githubDocs).ToList();
                var indexed = await _searchService.IndexDocumentsAsync(allDocs, cancellationToken);

                _logger.LogInformation("[{CorrelationId}] Reindexing complete: {Indexed}/{Total} documents indexed",
                    correlationId, indexed, allDocs.Count);

                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await response.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    success = true,
                    correlationId = correlationId,
                    indexed,
                    sources = results,
                    timestamp = DateTime.UtcNow.ToString("O")
                }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[{CorrelationId}] Reindexing failed", correlationId);
                var error = req.CreateResponse(HttpStatusCode.InternalServerError);
                error.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await error.WriteStringAsync(JsonSerializer.Serialize(new
                {
                    error = "Reindexing failed. Check logs for details.",
                    errorId = correlationId
                }));
                return error;
            }
        }

    private static SearchDocument CreateSearchDocument(ContentItem item)
    {
        // Parse tags from comma-separated string to array (Azure AI Search expects Collection(Edm.String))
        var tagsArray = string.IsNullOrWhiteSpace(item.Tags)
            ? Array.Empty<string>()
            : item.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return new SearchDocument(new Dictionary<string, object?>
        {
            ["id"] = item.Id,
            ["title"] = item.Title,
            ["content"] = item.Content,
            ["description"] = item.Description,
            ["url"] = item.Url,
            ["category"] = item.Category,
            ["tags"] = tagsArray,
            ["date"] = item.Date,
            ["recent"] = item.Recent, // Index the recent flag for scoring
            ["metadata"] = item.Metadata, // Code languages, links, etc.
            ["wordCount"] = item.WordCount,
            ["readingTimeMinutes"] = item.ReadingTimeMinutes,
            ["codeLanguages"] = item.CodeLanguages ?? new List<string>()
        });
    }

    private async Task<List<SearchDocument>> CrawlWebsitePagesAsync(CancellationToken ct)
    {
        var websiteUrl = Environment.GetEnvironmentVariable("WEBSITE_URL") ?? "https://dsanchezcr.com";
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);  // 30-second timeout
        var documents = new List<SearchDocument>();

        foreach (var (id, path) in WebsitePages)
        {
            try
            {
                var url = $"{websiteUrl}{path}";
                _logger.LogDebug("Crawling page: {Url}", url);
                
                var html = await httpClient.GetStringAsync(url, ct);
                var extracted = ExtractContentFromHtml(html);

                if (!string.IsNullOrEmpty(extracted.Content))
                {
                    documents.Add(new SearchDocument(new Dictionary<string, object?>
                    {
                        ["id"] = $"page-{id}",
                        ["title"] = extracted.Title,
                        ["content"] = extracted.Content,
                        ["description"] = extracted.Description,
                        ["url"] = path,
                        ["category"] = "page",
                        ["tags"] = Array.Empty<string>(),
                        ["date"] = null
                    }));
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Timeout crawling page: {Path}", path);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to crawl page: {Path}", path);
            }
        }

        return documents;
    }

    private async Task<List<SearchDocument>> CrawlBlogFeedAsync(CancellationToken ct)
    {
        var websiteUrl = Environment.GetEnvironmentVariable("WEBSITE_URL") ?? "https://dsanchezcr.com";
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);  // 30-second timeout
        var documents = new List<SearchDocument>();

        try
        {
            // Use the JSON feed which has structured data
            var feedUrl = $"{websiteUrl}/blog/feed.json";
            _logger.LogDebug("Fetching blog feed: {Url}", feedUrl);
            
            var feedJson = await httpClient.GetStringAsync(feedUrl, ct);
            var feed = JsonSerializer.Deserialize<BlogFeed>(feedJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (feed?.Items != null)
            {
                foreach (var item in feed.Items)
                {
                    var slug = item.Url?.Replace($"{websiteUrl}/blog/", "").TrimEnd('/') ?? "";
                    
                    // Truncate content to avoid search index limits
                    var content = StripHtml(item.ContentHtml ?? item.Summary ?? "");
                    if (content.Length > 5000)
                    {
                        content = content.Substring(0, 5000);
                    }
                    
                    documents.Add(new SearchDocument(new Dictionary<string, object?>
                    {
                        ["id"] = $"blog-{slug}",
                        ["title"] = item.Title ?? "",
                        ["content"] = content,
                        ["description"] = item.Summary ?? "",
                        ["url"] = $"/blog/{slug}",
                        ["category"] = "blog",
                        ["tags"] = item.Tags ?? Array.Empty<string>(),
                        ["date"] = item.DatePublished
                    }));
                }
            }
            
            _logger.LogInformation("Fetched {Count} blog posts from feed", documents.Count);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Timeout fetching blog feed");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch blog feed");
        }

        return documents;
    }

    private (string Title, string Description, string Content) ExtractContentFromHtml(string html)
    {
        // Extract title from <title> tag
        var titleMatch = Regex.Match(html, @"<title>([^<]+)</title>", RegexOptions.IgnoreCase);
        var title = titleMatch.Success ? System.Net.WebUtility.HtmlDecode(titleMatch.Groups[1].Value) : "";
        
        // Remove site name from title if present
        title = Regex.Replace(title, @"\s*[|–-]\s*David Sanchez.*$", "", RegexOptions.IgnoreCase).Trim();

        // Extract description from meta tag
        var descMatch = Regex.Match(html, @"<meta\s+name=[""']description[""']\s+content=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
        if (!descMatch.Success)
            descMatch = Regex.Match(html, @"<meta\s+content=[""']([^""']+)[""']\s+name=[""']description[""']", RegexOptions.IgnoreCase);
        var description = descMatch.Success ? System.Net.WebUtility.HtmlDecode(descMatch.Groups[1].Value) : "";

        // Extract main content - look for article or main tag
        var contentMatch = Regex.Match(html, @"<article[^>]*>([\s\S]*?)</article>", RegexOptions.IgnoreCase);
        if (!contentMatch.Success)
            contentMatch = Regex.Match(html, @"<main[^>]*>([\s\S]*?)</main>", RegexOptions.IgnoreCase);
        
        var content = contentMatch.Success ? StripHtml(contentMatch.Groups[1].Value) : "";
        
        // Limit content size
        if (content.Length > 5000)
            content = content.Substring(0, 5000);

        return (title, description, content);
    }

    private static string StripHtml(string html)
    {
        // Remove script and style content
        html = Regex.Replace(html, @"<script[^>]*>[\s\S]*?</script>", "", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"<style[^>]*>[\s\S]*?</style>", "", RegexOptions.IgnoreCase);
        
        // Remove HTML tags
        html = Regex.Replace(html, @"<[^>]+>", " ");
        
        // Decode HTML entities
        html = System.Net.WebUtility.HtmlDecode(html);
        
        // Clean up whitespace
        html = Regex.Replace(html, @"\s+", " ");
        
        return html.Trim();
    }

    private async Task<List<SearchDocument>> IndexGitHubReposAsync(CancellationToken ct)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);  // 30-second timeout
        httpClient.DefaultRequestHeaders.Add("User-Agent", "dsanchezcr-website-indexer");
        httpClient.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");

        try
        {
            _logger.LogDebug("Fetching GitHub repositories...");
            
            var response = await httpClient.GetAsync(
                "https://api.github.com/users/dsanchezcr/repos?per_page=100&sort=updated", ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to fetch GitHub repos: {Status}", response.StatusCode);
                return new List<SearchDocument>();
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var repos = JsonSerializer.Deserialize<List<GitHubRepo>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var documents = repos?
                .Where(r => !r.Fork && !r.Private)
                .Select(r => new SearchDocument(new Dictionary<string, object?>
                {
                    ["id"] = $"github-{r.Name?.ToLowerInvariant()}",
                    ["title"] = r.Name ?? "Unknown",
                    ["content"] = BuildRepoContent(r),
                    ["description"] = r.Description ?? "",
                    ["url"] = r.HtmlUrl ?? "",
                    ["category"] = "github",
                    ["tags"] = r.Topics ?? Array.Empty<string>(),
                    ["date"] = r.UpdatedAt?.ToString("O")
                }))
                .ToList() ?? new List<SearchDocument>();
            
            _logger.LogInformation("Fetched {Count} public GitHub repositories", documents.Count);
            return documents;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Timeout fetching GitHub repos");
            return new List<SearchDocument>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch GitHub repos");
            return new List<SearchDocument>();
        }
    }

    private static string BuildRepoContent(GitHubRepo repo)
    {
        var parts = new List<string>();
        if (!string.IsNullOrEmpty(repo.Description))
            parts.Add(repo.Description);
        parts.Add("GitHub repository.");
        if (!string.IsNullOrEmpty(repo.Language))
            parts.Add($"Language: {repo.Language}.");
        if (repo.StargazersCount > 0)
            parts.Add($"Stars: {repo.StargazersCount}.");
        if (repo.Topics?.Length > 0)
            parts.Add($"Topics: {string.Join(", ", repo.Topics)}.");
        return string.Join(" ", parts);
    }

    // DTOs for request/response
    private record IndexResult(string Source, int Count);

    private class ProvidedContent
    {
        public List<ContentItem>? Pages { get; set; }
        public List<ContentItem>? BlogPosts { get; set; }
    }

    private class ContentItem
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string Content { get; set; } = "";
        public string Url { get; set; } = "";
        public string Category { get; set; } = "";
        public string? Tags { get; set; }
        public string? Date { get; set; }
        public bool Recent { get; set; } // Flag for recent blog posts (last 90 days)
        public string? Metadata { get; set; } // Code languages, referenced resources, etc.
        public int? WordCount { get; set; } // Article word count
        public int? ReadingTimeMinutes { get; set; } // Estimated reading time
        public List<string>? CodeLanguages { get; set; } // Languages in code blocks
    }

    private class BlogFeed
    {
        public List<BlogFeedItem>? Items { get; set; }
    }

    private class BlogFeedItem
    {
        public string? Title { get; set; }
        public string? Url { get; set; }
        public string? Summary { get; set; }
        public string? ContentHtml { get; set; }
        public string? DatePublished { get; set; }
        public string[]? Tags { get; set; }
    }

    private class GitHubRepo
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Language { get; set; }
        public string? HtmlUrl { get; set; }
        public bool Fork { get; set; }
        public bool Private { get; set; }
        public int StargazersCount { get; set; }
        public string[]? Topics { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
