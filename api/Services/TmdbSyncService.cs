using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Azure.Cosmos;

namespace api.Services;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class TmdbSyncRequest
{
    public bool DryRun { get; set; } = true;
    public int MaxItems { get; set; } = 250;
    public string? ContinuationToken { get; set; }
}

public sealed class TmdbSyncResult
{
    public bool DryRun { get; set; }
    public bool Completed { get; set; }
    public string? ContinuationToken { get; set; }
    public int WatchlistImported { get; set; }
    public int RecentlyImported { get; set; }
    public int MoviesUpdated { get; set; }
    public int SeriesUpdated { get; set; }
    public int Created { get; set; }
    public int Replaced { get; set; }
    public int Deleted => 0;
    public int Skipped { get; set; }
    public string[] Warnings { get; set; } = [];
}

// Application authentication and user authorization are intentionally separate.
// TMDB validates the session against the application token; /account binds that pair
// to the explicitly configured account. Never accept these settings from an HTTP body.
public sealed class TmdbSettings
{
    public string ReadAccessToken { get; init; } = "";
    public string SessionId { get; init; } = "";
    public int AccountId { get; init; }
    public bool IsConfigured => AccountId > 0 && ValidSecret(ReadAccessToken) && ValidSecret(SessionId);
    private static bool ValidSecret(string value) =>
        !string.IsNullOrWhiteSpace(value) && value.Length <= 4096 && !value.Any(char.IsWhiteSpace);

    public static TmdbSettings FromEnvironment() => new()
    {
        ReadAccessToken = Environment.GetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN") ?? "",
        SessionId = Environment.GetEnvironmentVariable("TMDB_SESSION_ID") ?? "",
        AccountId = int.TryParse(Environment.GetEnvironmentVariable("TMDB_ACCOUNT_ID"), out var id) ? id : 0
    };
}

public sealed class TmdbSourceException(string message) : Exception(message);
public sealed class TmdbSyncBusyException() : Exception("A TMDB sync is already running.");
public sealed class TmdbContinuationException(string message, bool stale = false) : Exception(message)
{
    public bool Stale { get; } = stale;
}
public sealed class TmdbSyncProgressException(TmdbSyncResult partialResult, string phase, bool timedOut)
    : Exception("TMDB sync stopped before completion.")
{
    public TmdbSyncResult PartialResult { get; } = partialResult;
    public string Phase { get; } = phase;
    public bool TimedOut { get; } = timedOut;
}

public interface ITmdbSyncService
{
    Task<TmdbSyncResult> SyncAsync(TmdbSyncRequest request, CancellationToken ct = default);
}

/// <summary>
/// Safe, read-only TMDB account import. No upstream writes, Cosmos deletes, top-list
/// queries, HTML scraping, or adoption of manual documents. Source validation and
/// metadata hydration for each bounded batch finish before that batch's first write.
/// </summary>
public sealed class TmdbSyncService(
    ICosmosAdminService admin, IHttpClientFactory httpClientFactory, TmdbSettings settings) : ITmdbSyncService
{
    public const int BatchSize = 20;
    public static readonly TimeSpan RequestBudget = TimeSpan.FromSeconds(35);
    private readonly SemaphoreSlim _gate = new(1, 1);
    private static readonly Regex PosterPattern = new(@"^/[a-zA-Z0-9_-]+\.(jpg|png|webp)$", RegexOptions.Compiled);
    private static readonly Regex ImdbPattern = new(@"^tt\d{6,12}$", RegexOptions.Compiled);
    private static readonly (string Locale, string Language)[] Languages =
        [("en", "en-US"), ("es", "es-ES"), ("pt", "pt-BR")];

    private sealed record Feed(string ContentType, string MediaType, string Path, string Category, bool Rated);
    private sealed record Entry(Feed Feed, int Id, double? Rating, int Order);
    private sealed record Plan(AdminContentType Type, string Id, JsonObject? Doc, string? ETag, bool Create, string? SkipWarning = null);

    // Small signed cursor, not a credential. Every continuation still requires
    // admin/key authentication and a freshly verified account + complete feeds.
    private sealed class Cursor
    {
        public Cursor() { }
        public int Offset { get; set; }
        public int Total { get; set; }
        public string Fingerprint { get; set; } = "";
        public DateTimeOffset Snapshot { get; set; }
        public bool DryRun { get; set; }
        public int MaxItems { get; set; }
        public int WatchlistImported { get; set; }
        public int RecentlyImported { get; set; }
        public int Created { get; set; }
        public int Replaced { get; set; }
        public int Skipped { get; set; }
        public int MoviesUpdated { get; set; }
        public int SeriesUpdated { get; set; }
    }

    private sealed class Progress
    {
        public Cursor? Cursor { get; set; }
        public string Phase { get; set; } = "source";
        public TmdbSyncResult Result { get; } = new();
        public List<string> Warnings { get; } =
        [
            "Non-destructive sync: removed or unrated TMDB entries remain on the site until explicitly removed in admin; manual and top lists are never changed."
        ];
    }
    private static readonly Feed[] Feeds =
    [
        new("movies", "movie", "watchlist/movies", "watchlist", false),
        new("movies", "movie", "rated/movies", "recently-watched", true),
        new("series", "tv", "watchlist/tv", "watchlist", false),
        new("series", "tv", "rated/tv", "completed", true)
    ];

    public async Task<TmdbSyncResult> SyncAsync(TmdbSyncRequest request, CancellationToken ct = default)
    {
        if (request.MaxItems is < 1 or > 1000)
            throw new ArgumentException("maxItems must be an integer between 1 and 1000.");
        if (!settings.IsConfigured || !admin.IsConfigured)
            throw new InvalidOperationException("TMDB and Cosmos content settings must be configured.");
        var progress = RestoreProgress(request);
        if (!await _gate.WaitAsync(0, ct)) throw new TmdbSyncBusyException();

        using var budget = CancellationTokenSource.CreateLinkedTokenSource(ct);
        budget.CancelAfter(RequestBudget);
        try
        {
            return await SyncCoreAsync(request, progress, budget.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            progress.Warnings.Add($"Stopped during {progress.Phase}; no deletions occurred. Retry with the returned continuationToken, or restart if it is null.");
            throw new TmdbSyncProgressException(Finish(progress, completed: false), progress.Phase, timedOut: true);
        }
        catch (Exception) when (progress.Phase == "storage" && !ct.IsCancellationRequested)
        {
            // A canceled/failed write may have committed without an acknowledgement.
            // Resume at the unacknowledged entry: deterministic IDs/ETags make it safe.
            progress.Warnings.Add("Storage stopped before completion. Earlier acknowledged updates remain; retry with the returned continuationToken.");
            throw new TmdbSyncProgressException(Finish(progress, completed: false), progress.Phase, timedOut: false);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<TmdbSyncResult> SyncCoreAsync(TmdbSyncRequest request, Progress progress, CancellationToken ct)
    {
        using var client = httpClientFactory.CreateClient("tmdb");
        client.Timeout = TimeSpan.FromSeconds(10);
        var account = await GetJsonAsync(client, $"account?session_id={Uri.EscapeDataString(settings.SessionId)}", ct);
        if (PositiveInt(account["id"]) != settings.AccountId)
            throw new TmdbSourceException("TMDB session does not belong to the configured account. No content was changed.");

        var warnings = progress.Warnings;
        var entries = new List<Entry>();
        // Page each feed sequentially, but read the four independent feeds in
        // parallel. Await all readers before returning/failing (no background work).
        var fetchedFeeds = await Task.WhenAll(Feeds.Select(feed => FetchFeedAsync(client, feed, request.MaxItems, ct)));
        for (var index = 0; index < Feeds.Length; index++)
        {
            var feed = Feeds[index];
            var fetched = fetchedFeeds[index];
            entries.AddRange(fetched);
            if (fetched.Count == 0)
                warnings.Add($"TMDB {feed.Path} is empty; existing content was retained.");
        }

        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
            JsonSerializer.Serialize(entries.Select(e => new { e.Feed.MediaType, e.Feed.Path, e.Id, e.Rating, e.Order })))));
        if (progress.Cursor != null &&
            (progress.Cursor.Fingerprint != fingerprint || progress.Cursor.Total != entries.Count))
            throw new TmdbContinuationException("TMDB lists changed during synchronization. Restart without continuationToken; earlier imports were retained.", stale: true);
        progress.Cursor ??= new Cursor
        {
            Fingerprint = fingerprint, Total = entries.Count, Snapshot = DateTimeOffset.UtcNow,
            DryRun = request.DryRun, MaxItems = request.MaxItems
        };
        var result = progress.Result;
        result.WatchlistImported = entries.Count(e => !e.Feed.Rated);
        result.RecentlyImported = entries.Count(e => e.Feed.Rated);
        var batch = entries.Skip(progress.Cursor.Offset).Take(BatchSize).ToList();
        var accountRatings = entries.Where(e => e.Feed.Rated)
            .ToDictionary(e => (e.Feed.MediaType, e.Id), e => e.Rating);
        progress.Phase = "metadata";
        var metadata = new System.Collections.Concurrent.ConcurrentDictionary<(string, int), JsonObject>();
        var metadataWarnings = new System.Collections.Concurrent.ConcurrentBag<string>();
        await Parallel.ForEachAsync(batch.Select(e => (e.Feed.MediaType, e.Id)).Distinct(),
            new ParallelOptions { MaxDegreeOfParallelism = 4, CancellationToken = ct },
            async (key, token) =>
            {
                metadata[key] = await FetchMetadataAsync(client, key.MediaType, key.Id, metadataWarnings, token);
            });
        warnings.AddRange(metadataWarnings.OrderBy(w => w, StringComparer.Ordinal));

        progress.Phase = "planning";
        var snapshot = progress.Cursor.Snapshot.ToString("O", CultureInfo.InvariantCulture);
        var plans = new List<Plan>();
        foreach (var feed in Feeds)
        {
            if (!batch.Any(e => e.Feed == feed)) continue;
            var type = AdminContentTypes.All[feed.ContentType];
            // Scoped query, never a cross-container/manual-top scan.
            var existing = await admin.ListAsync(type, feed.Category, ct);
            foreach (var entry in batch.Where(e => e.Feed == feed))
            {
                var id = $"tmdb-{feed.MediaType}-{(feed.Rated ? "rated" : "watch")}-{entry.Id}";
                var details = metadata[(feed.MediaType, entry.Id)];
                var imdbId = Text(details["titleId"]);
                // A manual entry for the same media wins, including legacy IMDb-only docs.
                if (existing.Any(doc => Text(doc["id"]) != id &&
                    (PositiveInt(doc["tmdbId"]) == entry.Id ||
                     (imdbId != null && Text(doc["titleId"]) == imdbId))))
                {
                    plans.Add(new Plan(type, id, null, null, false,
                        $"Preserved existing {feed.ContentType}/{feed.Category} entry for TMDB {entry.Id}."));
                    continue;
                }

                var (current, etag) = await admin.GetAsync(type, id, feed.Category, ct);
                if (current != null &&
                    (Text(current["syncSource"]) != "tmdb" || PositiveInt(current["syncAccountId"]) != settings.AccountId ||
                     PositiveInt(current["tmdbId"]) != entry.Id || string.IsNullOrEmpty(etag)))
                {
                    plans.Add(new Plan(type, id, null, null, false, $"Preserved unowned or unversioned document {id}."));
                    continue;
                }
                if (current != null && DateTimeOffset.TryParse(Text(current["syncedAt"]), out var newerSnapshot) &&
                    newerSnapshot > progress.Cursor.Snapshot)
                {
                    plans.Add(new Plan(type, id, null, null, false,
                        $"Preserved a newer sync snapshot for {id}; this older continuation cannot replace it."));
                    continue;
                }

                var merged = current?.DeepClone().AsObject() ?? new JsonObject
                {
                    ["id"] = id,
                    ["category"] = feed.Category,
                    ["review"] = new JsonObject { ["en"] = "", ["es"] = "", ["pt"] = "" }
                };
                MergeMetadata(merged, details);
                merged["myRating"] = entry.Rating ?? accountRatings.GetValueOrDefault((feed.MediaType, entry.Id));
                merged["order"] = entry.Order;
                merged["syncSource"] = "tmdb";
                merged["syncAccountId"] = settings.AccountId;
                merged["syncedAt"] = snapshot;
                // No review overwrite, even for an empty or old custom review.
                var errors = ContentValidator.Validate(type, merged);
                if (errors.Count > 0)
                    throw new TmdbSourceException("A planned media document is invalid. No content was changed; review existing media fields in admin.");
                plans.Add(new Plan(type, id, merged, etag, current == null));
            }
        }

        // Complete feeds and this batch's metadata/merges are valid. At most 20
        // documents are processed per invocation, under the SWA 45-second ceiling.
        progress.Phase = "storage";
        foreach (var plan in plans)
        {
            ct.ThrowIfCancellationRequested();
            if (plan.SkipWarning != null)
            {
                result.Skipped++;
                warnings.Add(plan.SkipWarning);
                progress.Cursor.Offset++;
                continue;
            }
            try
            {
                if (!request.DryRun)
                {
                    if (plan.Create) await admin.CreateAsync(plan.Type, plan.Doc!, ct);
                    else await admin.ReplaceAsync(plan.Type, plan.Id, plan.Doc!, plan.ETag, ct);
                }
                if (plan.Create) result.Created++; else result.Replaced++;
                if (plan.Type.Slug == "movies") result.MoviesUpdated++; else result.SeriesUpdated++;
            }
            catch (CosmosException ex) when (ex.StatusCode is HttpStatusCode.Conflict or HttpStatusCode.PreconditionFailed or HttpStatusCode.NotFound)
            {
                result.Skipped++;
                warnings.Add($"Concurrent edit preserved for {plan.Id}; retry the sync to refresh it.");
            }
            progress.Cursor.Offset++;
        }
        var completed = progress.Cursor.Offset == entries.Count;
        if (!completed)
            warnings.Add($"Processed {progress.Cursor.Offset} of {entries.Count} entries. Continue with the returned continuationToken and unchanged dryRun/maxItems.");
        return Finish(progress, completed);
    }

    private Progress RestoreProgress(TmdbSyncRequest request)
    {
        var progress = new Progress();
        progress.Result.DryRun = request.DryRun;
        if (request.ContinuationToken == null) return progress;
        try
        {
            if (request.ContinuationToken.Length > 2048) throw new FormatException();
            var parts = request.ContinuationToken.Split('.');
            if (parts.Length != 2) throw new FormatException();
            var payload = FromBase64Url(parts[0]);
            var signature = FromBase64Url(parts[1]);
            if (!CryptographicOperations.FixedTimeEquals(signature, HMACSHA256.HashData(CursorKey(), payload)))
                throw new FormatException();
            var cursor = JsonSerializer.Deserialize<Cursor>(payload) ?? throw new FormatException();
            if (cursor.DryRun != request.DryRun || cursor.MaxItems != request.MaxItems ||
                cursor.Offset < 0 || cursor.Offset >= cursor.Total || cursor.Total > 4000 ||
                cursor.Snapshot < DateTimeOffset.UtcNow.AddHours(-1) || cursor.Snapshot > DateTimeOffset.UtcNow.AddMinutes(1))
                throw new FormatException();
            progress.Cursor = cursor;
            progress.Result.WatchlistImported = cursor.WatchlistImported;
            progress.Result.RecentlyImported = cursor.RecentlyImported;
            progress.Result.Created = cursor.Created;
            progress.Result.Replaced = cursor.Replaced;
            progress.Result.Skipped = cursor.Skipped;
            progress.Result.MoviesUpdated = cursor.MoviesUpdated;
            progress.Result.SeriesUpdated = cursor.SeriesUpdated;
            return progress;
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            throw new TmdbContinuationException("Invalid or expired continuationToken, changed options, or changed account configuration. Restart without continuationToken; earlier imports were retained.");
        }
    }

    private TmdbSyncResult Finish(Progress progress, bool completed)
    {
        var result = progress.Result;
        result.Completed = completed;
        if (!completed && progress.Cursor is { } cursor && cursor.Offset < cursor.Total)
        {
            cursor.Created = result.Created;
            cursor.Replaced = result.Replaced;
            cursor.Skipped = result.Skipped;
            cursor.MoviesUpdated = result.MoviesUpdated;
            cursor.SeriesUpdated = result.SeriesUpdated;
            cursor.WatchlistImported = result.WatchlistImported;
            cursor.RecentlyImported = result.RecentlyImported;
            var payload = JsonSerializer.SerializeToUtf8Bytes(cursor);
            result.ContinuationToken = Base64Url(payload) + "." + Base64Url(HMACSHA256.HashData(CursorKey(), payload));
        }
        result.Warnings = progress.Warnings.ToArray();
        return result;
    }

    // Account/session changes invalidate cursors without putting any credentials
    // into their payload. A cursor grants no access without endpoint authentication.
    private byte[] CursorKey() => HMACSHA256.HashData(Encoding.UTF8.GetBytes(settings.ReadAccessToken),
        Encoding.UTF8.GetBytes($"tmdb-continuation:v1:{settings.AccountId}:{settings.SessionId}"));
    private static string Base64Url(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static byte[] FromBase64Url(string value)
    {
        value = value.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(value.PadRight((value.Length + 3) / 4 * 4, '='));
    }

    private async Task<List<Entry>> FetchFeedAsync(HttpClient client, Feed feed, int maxItems, CancellationToken ct)
    {
        var entries = new List<Entry>();
        var ids = new HashSet<int>();
        int? expectedPages = null, expectedTotal = null;
        for (var page = 1; page <= (expectedPages ?? 1); page++)
        {
            var data = await GetJsonAsync(client,
                $"account/{settings.AccountId}/{feed.Path}?session_id={Uri.EscapeDataString(settings.SessionId)}&language=en-US&page={page}&sort_by=created_at.desc", ct);
            var pages = NonNegativeInt(data["total_pages"]);
            var total = NonNegativeInt(data["total_results"]);
            if (PositiveInt(data["page"]) != page || pages == null || total == null ||
                pages > 500 || total > maxItems || (total > 0 && (pages == 0 || pages > total)) ||
                (total == 0 && pages > 1) ||
                (expectedPages != null && (expectedPages != pages || expectedTotal != total)) ||
                data["results"] is not JsonArray results)
                throw new TmdbSourceException("TMDB pagination is invalid, changed during sync, or exceeds maxItems. No content was changed; retry or raise maxItems (up to 1000).");
            expectedPages = pages;
            expectedTotal = total;
            if ((total > 0 && results.Count == 0) || (total == 0 && results.Count != 0) ||
                entries.Count + results.Count > total)
                throw new TmdbSourceException("TMDB returned an incomplete or inconsistent feed. No content was changed.");

            foreach (var node in results)
            {
                if (node is not JsonObject item || PositiveInt(item["id"]) is not int id || !ids.Add(id))
                    throw new TmdbSourceException("TMDB returned invalid or duplicate media IDs. No content was changed.");
                double? rating = null;
                if (feed.Rated)
                {
                    rating = Number(item["rating"]);
                    if (rating == null || rating < 0.5 || rating > 10 || rating * 2 != Math.Truncate(rating.Value * 2))
                        throw new TmdbSourceException("TMDB returned an invalid account rating. No content was changed.");
                }
                entries.Add(new Entry(feed, id, rating, total.Value - entries.Count));
            }
        }
        if (entries.Count != expectedTotal)
            throw new TmdbSourceException("TMDB pagination did not return every item. No content was changed.");
        return entries;
    }

    private async Task<JsonObject> FetchMetadataAsync(HttpClient client, string mediaType, int id,
        System.Collections.Concurrent.ConcurrentBag<string> warnings, CancellationToken ct)
    {
        var titles = new JsonObject();
        var overviews = new JsonObject();
        var localizedGenres = new JsonObject();
        JsonObject? english = null;
        foreach (var (locale, language) in Languages)
        {
            var data = await GetJsonAsync(client, $"{mediaType}/{id}?language={language}&append_to_response=external_ids", ct);
            if (PositiveInt(data["id"]) != id || data["genres"] is not JsonArray genres)
                throw new TmdbSourceException("TMDB returned invalid media metadata. No content was changed.");
            english ??= data;
            var titleField = mediaType == "movie" ? "title" : "name";
            var originalField = mediaType == "movie" ? "original_title" : "original_name";
            var title = Text(data[titleField]);
            if (string.IsNullOrWhiteSpace(title))
            {
                title = NonEmptyText(english[titleField]) ?? NonEmptyText(english[originalField]);
                warnings.Add($"TMDB {mediaType}/{id}: {locale} title uses an English/original fallback.");
            }
            if (string.IsNullOrWhiteSpace(title))
                throw new TmdbSourceException("TMDB returned metadata without a title. No content was changed.");
            titles[locale] = title;
            overviews[locale] = NonEmptyText(data["overview"]) ?? Text(english["overview"]) ?? "";
            if (locale != "en" && NonEmptyText(data["overview"]) == null && NonEmptyText(english["overview"]) != null)
                warnings.Add($"TMDB {mediaType}/{id}: {locale} overview uses an English fallback.");
            var names = new JsonArray();
            foreach (var genre in genres)
            {
                if (genre is not JsonObject obj || NonEmptyText(obj["name"]) is not string name)
                    throw new TmdbSourceException("TMDB returned invalid genres. No content was changed.");
                names.Add(name);
            }
            localizedGenres[locale] = names.Count > 0 || locale == "en"
                ? names : localizedGenres["en"]!.DeepClone();
            if (names.Count == 0 && locale != "en" && localizedGenres["en"] is JsonArray { Count: > 0 })
                warnings.Add($"TMDB {mediaType}/{id}: {locale} genres use an English fallback.");
        }
        var poster = Text(english!["poster_path"]);
        if (poster != null && !PosterPattern.IsMatch(poster))
            throw new TmdbSourceException("TMDB returned an invalid poster path. No content was changed.");
        var vote = Number(english["vote_average"]);
        if (vote == null || vote < 0 || vote > 10)
            throw new TmdbSourceException("TMDB returned an invalid community rating. No content was changed.");
        var imdb = Text(english["imdb_id"]) ?? Text((english["external_ids"] as JsonObject)?["imdb_id"]);
        var date = Text(english[mediaType == "movie" ? "release_date" : "first_air_date"]);
        int? year = DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)
            ? parsed.Year : null;
        return new JsonObject
        {
            ["tmdbId"] = id, ["mediaType"] = mediaType,
            ["titleId"] = imdb != null && ImdbPattern.IsMatch(imdb) ? imdb : null,
            ["title"] = titles["en"]!.DeepClone(), ["titleTranslations"] = titles,
            ["overview"] = overviews, ["genresTranslations"] = localizedGenres,
            ["genres"] = localizedGenres["en"]!.DeepClone(),
            ["posterPath"] = poster,
            ["imageUrl"] = poster == null ? null : $"https://image.tmdb.org/t/p/w500{poster}",
            ["year"] = year, ["tmdbRating"] = vote
        };
    }

    private async Task<JsonObject> GetJsonAsync(HttpClient client, string relativePath, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.themoviedb.org/3/{relativePath}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ReadAccessToken);
        request.Headers.Accept.ParseAdd("application/json");
        try
        {
            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                throw new TmdbSourceException($"TMDB request failed (HTTP {(int)response.StatusCode}). Verify account authorization or retry later; no source changes were applied.");
            // Bound buffered metadata/list responses; never log upstream body or request URI.
            if (response.Content.Headers.ContentLength > 2 * 1024 * 1024)
                throw new TmdbSourceException("TMDB response exceeded the safety limit.");
            var body = await response.Content.ReadAsStringAsync(ct);
            if (body.Length > 2 * 1024 * 1024 || JsonNode.Parse(body) is not JsonObject data ||
                (data["success"] is JsonValue success && success.TryGetValue<bool>(out var ok) && !ok))
                throw new TmdbSourceException("TMDB returned an invalid response. No content was changed.");
            return data;
        }
        catch (JsonException)
        {
            throw new TmdbSourceException("TMDB returned invalid JSON. No content was changed.");
        }
        catch (HttpRequestException)
        {
            throw new TmdbSourceException("TMDB could not be reached. No content was changed.");
        }
    }

    private static string? Text(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
    private static string? NonEmptyText(JsonNode? node) => Text(node) is string text && !string.IsNullOrWhiteSpace(text) ? text : null;
    private static int? NonNegativeInt(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<int>(out var number) && number >= 0 ? number : null;
    private static int? PositiveInt(JsonNode? node) => NonNegativeInt(node) is int id && id > 0 ? id : null;
    private static double? Number(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<double>(out var number) && double.IsFinite(number) ? number : null;

    private static void MergeMetadata(JsonObject target, JsonObject source)
    {
        foreach (var field in source)
        {
            if (field.Value is JsonObject child && target[field.Key] is JsonObject existing)
                MergeMetadata(existing, child);
            else
                target[field.Key] = field.Value?.DeepClone();
        }
    }
}
