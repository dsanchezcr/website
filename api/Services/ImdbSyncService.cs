using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace api.Services;

public sealed class ImdbSyncRequest
{
    public string? WatchlistUrl { get; set; }
    public string? RatingsUrl { get; set; }
    public bool DryRun { get; set; }
    public int MaxItems { get; set; } = 250;
}

public sealed class ImdbSyncResult
{
    public int WatchlistImported { get; set; }
    public int RecentlyImported { get; set; }
    public int MoviesUpdated { get; set; }
    public int SeriesUpdated { get; set; }
    public int Created { get; set; }
    public int Replaced { get; set; }
    public int Deleted { get; set; }
    public int Skipped { get; set; }
    public string[] Warnings { get; set; } = Array.Empty<string>();
}

public interface IImdbSyncService
{
    Task<ImdbSyncResult> SyncAsync(ImdbSyncRequest request, CancellationToken ct = default);
}

public sealed class ImdbSyncService : IImdbSyncService
{
    private static readonly Regex TitleIdRegex = new(@"/title/(tt\d{6,12})/", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex TitleIdLooseRegex = new(@"\b(tt\d{6,12})\b", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Common patterns observed in IMDb page JSON/HTML payloads for user ratings.
    private static readonly Regex[] RatingsRegexes =
    {
        new("\\\"titleId\\\"\\s*:\\s*\\\"(tt\\d{6,12})\\\"[^\\r\\n]{0,200}?\\\"userRating\\\"\\s*:\\s*(\\d{1,2})", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new("\\\"id\\\"\\s*:\\s*\\\"(tt\\d{6,12})\\\"[^\\r\\n]{0,200}?\\\"userRating\\\"\\s*:\\s*(\\d{1,2})", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new("data-tconst\\s*=\\s*\\\"(tt\\d{6,12})\\\"[^\\r\\n]{0,200}?data-value\\s*=\\s*\\\"(\\d{1,2})\\\"", RegexOptions.Compiled | RegexOptions.IgnoreCase),
    };

    private readonly ICosmosAdminService _admin;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ImdbSyncService> _logger;

    public ImdbSyncService(ICosmosAdminService admin, IHttpClientFactory httpClientFactory, ILogger<ImdbSyncService> logger)
    {
        _admin = admin;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ImdbSyncResult> SyncAsync(ImdbSyncRequest request, CancellationToken ct = default)
    {
        if (!_admin.IsConfigured)
            throw new InvalidOperationException("Content service is not configured.");

        var watchlistUrl = string.IsNullOrWhiteSpace(request.WatchlistUrl)
            ? Environment.GetEnvironmentVariable("IMDB_WATCHLIST_URL")
            : request.WatchlistUrl;

        var ratingsUrl = string.IsNullOrWhiteSpace(request.RatingsUrl)
            ? Environment.GetEnvironmentVariable("IMDB_RATINGS_URL")
            : request.RatingsUrl;

        if (string.IsNullOrWhiteSpace(watchlistUrl) && string.IsNullOrWhiteSpace(ratingsUrl))
        {
            throw new ArgumentException("At least one source URL is required (watchlist or ratings). You can pass URLs in the request body or configure IMDB_WATCHLIST_URL / IMDB_RATINGS_URL.");
        }

        ValidateImdbUrl(watchlistUrl);
        ValidateImdbUrl(ratingsUrl);

        var maxItems = Math.Clamp(request.MaxItems <= 0 ? 250 : request.MaxItems, 1, 1000);
        var warnings = new List<string>();

        var watchlistIds = new List<string>();
        if (!string.IsNullOrWhiteSpace(watchlistUrl))
        {
            var watchlistHtml = await FetchPageAsync(watchlistUrl!, ct);
            watchlistIds = ExtractTitleIds(watchlistHtml).Take(maxItems).ToList();
            if (watchlistIds.Count == 0)
                warnings.Add("No watchlist title IDs were parsed from IMDb source.");
        }

        var ratingsMap = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        var ratingsOrderedIds = new List<string>();
        if (!string.IsNullOrWhiteSpace(ratingsUrl))
        {
            var ratingsHtml = await FetchPageAsync(ratingsUrl!, ct);
            ratingsMap = ExtractRatings(ratingsHtml);
            ratingsOrderedIds = ratingsMap.Keys.Take(maxItems).ToList();

            // Fallback: if ratings were not parseable, at least extract title IDs.
            if (ratingsOrderedIds.Count == 0)
            {
                ratingsOrderedIds = ExtractTitleIds(ratingsHtml).Take(maxItems).ToList();
                if (ratingsOrderedIds.Count > 0)
                    warnings.Add("IMDb ratings were not parseable; imported recently watched titles without rating values.");
            }

            if (ratingsOrderedIds.Count == 0)
                warnings.Add("No ratings title IDs were parsed from IMDb source.");
        }

        var allIds = watchlistIds.Concat(ratingsOrderedIds).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        // The third-party IMDb metadata API used to classify titles as movie vs. series
        // (api.imdbapi.dev) has been permanently discontinued. Without an authoritative
        // classification source, all synced titles default into the movies container;
        // any TV series picked up by the sync must be manually moved to series in /admin.
        if (allIds.Count > 0)
        {
            warnings.Add("IMDb title-kind classification is unavailable (upstream API discontinued); all synced titles were placed under movies. Move any TV series to the series container manually in /admin.");
        }

        var watchlistMovies = watchlistIds;
        var watchlistSeries = new List<string>();

        var recentMovies = ratingsOrderedIds;
        var recentSeries = new List<string>();

        var result = new ImdbSyncResult
        {
            WatchlistImported = watchlistIds.Count,
            RecentlyImported = ratingsOrderedIds.Count,
            MoviesUpdated = watchlistMovies.Count + recentMovies.Count,
            SeriesUpdated = watchlistSeries.Count + recentSeries.Count,
        };

        if (request.DryRun)
        {
            result.Warnings = warnings.ToArray();
            return result;
        }

        if (AdminContentTypes.TryGet("movies", out var moviesType))
        {
            var moviesWatchDocs = BuildSyncDocs(watchlistMovies, "watchlist", null, "imdb-watch", includeTbdReview: false);
            var moviesRecentDocs = BuildSyncDocs(recentMovies, "recently-watched", ratingsMap, "imdb-recent", includeTbdReview: true);

            var m1 = await SyncCategoryAsync(moviesType, "watchlist", moviesWatchDocs, ct);
            var m2 = await SyncCategoryAsync(moviesType, "recently-watched", moviesRecentDocs, ct);
            result.Created += m1.Created + m2.Created;
            result.Replaced += m1.Replaced + m2.Replaced;
            result.Deleted += m1.Deleted + m2.Deleted;
            result.Skipped += m1.Skipped + m2.Skipped;
        }

        if (AdminContentTypes.TryGet("series", out var seriesType))
        {
            var seriesWatchDocs = BuildSyncDocs(watchlistSeries, "watchlist", null, "imdb-watch", includeTbdReview: false);
            var seriesRecentDocs = BuildSyncDocs(recentSeries, "completed", ratingsMap, "imdb-recent", includeTbdReview: true);

            var s1 = await SyncCategoryAsync(seriesType, "watchlist", seriesWatchDocs, ct);
            var s2 = await SyncCategoryAsync(seriesType, "completed", seriesRecentDocs, ct);
            result.Created += s1.Created + s2.Created;
            result.Replaced += s1.Replaced + s2.Replaced;
            result.Deleted += s1.Deleted + s2.Deleted;
            result.Skipped += s1.Skipped + s2.Skipped;
        }

        result.Warnings = warnings.ToArray();
        return result;
    }

    private async Task<string> FetchPageAsync(string url, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; dsanchezcr-content-sync/1.0)");
        client.DefaultRequestHeaders.Accept.ParseAdd("text/html,application/xhtml+xml,application/json");

        using var response = await client.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"IMDb request failed ({(int)response.StatusCode}) for URL: {url}", null, response.StatusCode);

        return await response.Content.ReadAsStringAsync(ct);
    }

    /// <summary>
    /// Retained for classification of a title kind string as a TV series when a source is
    /// available in the future. Not currently invoked by <see cref="SyncAsync"/> since the
    /// third-party classification API (api.imdbapi.dev) has been discontinued.
    /// </summary>
    public static bool IsSeriesKind(string? kind)
    {
        if (string.IsNullOrWhiteSpace(kind))
            return false;

        var normalized = kind.Trim().ToLowerInvariant();
        return normalized.Contains("series") || normalized.Contains("tv") || normalized.Contains("episode") || normalized.Contains("mini");
    }

    public static List<string> ExtractTitleIds(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return new List<string>();

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var result = new List<string>();

        foreach (Match match in TitleIdRegex.Matches(html))
        {
            if (!match.Success || match.Groups.Count < 2)
                continue;

            var id = match.Groups[1].Value;
            if (seen.Add(id))
                result.Add(id);
        }

        if (result.Count > 0)
            return result;

        // Fallback for non-standard layouts.
        foreach (Match match in TitleIdLooseRegex.Matches(html))
        {
            if (!match.Success || match.Groups.Count < 2)
                continue;

            var id = match.Groups[1].Value;
            if (seen.Add(id))
                result.Add(id);
        }

        return result;
    }

    public static Dictionary<string, double> ExtractRatings(string html)
    {
        var result = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(html))
            return result;

        foreach (var regex in RatingsRegexes)
        {
            foreach (Match match in regex.Matches(html))
            {
                if (!match.Success || match.Groups.Count < 3)
                    continue;

                var id = match.Groups[1].Value;
                var ratingText = match.Groups[2].Value;
                if (double.TryParse(ratingText, out var rating))
                    result[id] = Math.Clamp(rating, 0d, 10d);
            }

            if (result.Count > 0)
                break;
        }

        return result;
    }

    private static List<JsonObject> BuildSyncDocs(
        IReadOnlyList<string> orderedTitleIds,
        string category,
        IReadOnlyDictionary<string, double>? ratings,
        string idPrefix,
        bool includeTbdReview)
    {
        var docs = new List<JsonObject>();
        var now = DateTime.UtcNow.ToString("O");

        for (var i = 0; i < orderedTitleIds.Count; i++)
        {
            var titleId = orderedTitleIds[i];
            var order = orderedTitleIds.Count - i;
            var doc = new JsonObject
            {
                ["id"] = $"{idPrefix}-{titleId}",
                ["titleId"] = titleId,
                ["category"] = category,
                ["order"] = order,
                ["syncSource"] = "imdb",
                ["syncedAt"] = now,
            };

            if (ratings != null && ratings.TryGetValue(titleId, out var rating))
                doc["myRating"] = rating;

            if (includeTbdReview)
            {
                doc["review"] = new JsonObject
                {
                    ["en"] = "TBD",
                    ["es"] = "TBD",
                    ["pt"] = "TBD",
                };
            }

            docs.Add(doc);
        }

        return docs;
    }

    private async Task<(int Created, int Replaced, int Deleted, int Skipped)> SyncCategoryAsync(
        AdminContentType type,
        string category,
        IReadOnlyList<JsonObject> desired,
        CancellationToken ct)
    {
        var created = 0;
        var replaced = 0;
        var deleted = 0;
        var skipped = 0;

        var existing = await _admin.ListAsync(type, category, ct);
        var existingById = existing
            .Where(d => d["id"] is JsonValue)
            .ToDictionary(d => d["id"]!.GetValue<string>(), d => d, StringComparer.OrdinalIgnoreCase);

        foreach (var desiredDoc in desired)
        {
            var id = desiredDoc["id"]!.GetValue<string>();
            if (!existingById.TryGetValue(id, out var current))
            {
                await _admin.CreateAsync(type, desiredDoc, ct);
                created++;
                continue;
            }

            CosmosAdminService.StripSystemProperties(current);
            if (JsonNode.DeepEquals(current, desiredDoc))
            {
                skipped++;
                continue;
            }

            await _admin.ReplaceAsync(type, id, desiredDoc, ifMatchEtag: null, ct);
            replaced++;
        }

        var desiredIds = desired
            .Select(d => d["id"]!.GetValue<string>())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var doc in existing)
        {
            var idNode = doc["id"];
            if (idNode is not JsonValue idValue || !idValue.TryGetValue<string>(out var id) || string.IsNullOrWhiteSpace(id))
                continue;

            // Only remove prior IMDb-managed documents, preserve manually curated entries.
            var syncSource = doc["syncSource"] is JsonValue ss && ss.TryGetValue<string>(out var source)
                ? source
                : string.Empty;

            if (!string.Equals(syncSource, "imdb", StringComparison.OrdinalIgnoreCase))
                continue;

            if (desiredIds.Contains(id))
                continue;

            await _admin.DeleteAsync(type, id, category, ct);
            deleted++;
        }

        return (created, replaced, deleted, skipped);
    }

    private static void ValidateImdbUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new ArgumentException($"Invalid URL: {url}");

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("IMDb URLs must use HTTPS.");

        var host = uri.Host;
        if (!string.Equals(host, "imdb.com", StringComparison.OrdinalIgnoreCase) &&
            !host.EndsWith(".imdb.com", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Only imdb.com URLs are allowed for sync.");
    }
}
