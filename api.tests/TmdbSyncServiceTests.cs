using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using api.Models.Content;
using api.Services;
using Microsoft.Azure.Cosmos;
using Xunit;

namespace api.tests;

public class TmdbSyncServiceTests
{
    [Fact]
    public async Task ImportsAllFourFeeds_WithClassificationTranslationsHalfRatingsAndSourceOrder()
    {
        var store = new Store();
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(20), Item(10)]);
        http.Feeds["rated/movies"] = Page([Item(30, 8.5)]);
        http.Feeds["watchlist/tv"] = Page([Item(40)]);
        http.Feeds["rated/tv"] = Page([Item(50, 0.5)]);
        var result = await Service(store, http).SyncAsync(new() { DryRun = false });
        Assert.Equal(5, result.Created);
        Assert.Equal(3, result.MoviesUpdated);
        Assert.Equal(2, result.SeriesUpdated);
        Assert.Equal(0, result.Deleted);
        var newest = store.Docs[("movies", "watchlist", "tmdb-movie-watch-20")];
        Assert.Equal(2, newest["order"]!.GetValue<int>());
        Assert.Null(newest["myRating"]);
        Assert.Equal("title-es-ES-20", newest["titleTranslations"]!["es"]!.GetValue<string>());
        Assert.Equal("title-pt-BR-20", newest["titleTranslations"]!["pt"]!.GetValue<string>());
        Assert.Equal("https://image.tmdb.org/t/p/w500/poster.jpg", newest["imageUrl"]!.GetValue<string>());
        Assert.Equal("movie", newest["mediaType"]!.GetValue<string>());
        Assert.Equal(8.5, store.Docs[("movies", "recently-watched", "tmdb-movie-rated-30")]["myRating"]!.GetValue<double>());
        var tv = store.Docs[("series", "completed", "tmdb-tv-rated-50")];
        Assert.Equal("tv", tv["mediaType"]!.GetValue<string>());
        Assert.Equal(0.5, tv["myRating"]!.GetValue<double>());
        Assert.All(http.Requests.Where(r => r.Uri.AbsolutePath.Contains("/account/")),
            r => Assert.Contains("sort_by=created_at.desc", r.Uri.Query));
        Assert.All(http.Requests, r => Assert.Equal("Bearer test-read-token", r.Authorization));
        Assert.DoesNotContain("test-session", JsonSerializer.Serialize(store.Docs.Values));
        Assert.DoesNotContain("test-read-token", JsonSerializer.Serialize(result));
    }

    [Fact]
    public async Task DryRunDefaultsToTrue_ReportsPlannedCountsWithoutWrites()
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(1)]);
        var store = new Store();
        var result = await Service(store, http).SyncAsync(new());
        Assert.True(result.DryRun);
        Assert.Equal(1, result.Created);
        Assert.Equal(0, store.Writes);
    }

    [Fact]
    public async Task MatchingWatchlistGetsAccountRating_AndMetadataIsFetchedOncePerLocale()
    {
        var store = new Store();
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(1)]);
        http.Feeds["rated/movies"] = Page([Item(1, 9.5)]);
        await Service(store, http).SyncAsync(new() { DryRun = false });
        Assert.Equal(9.5, store.Docs[("movies", "watchlist", "tmdb-movie-watch-1")]["myRating"]!.GetValue<double>());
        Assert.Equal(3, http.Requests.Count(r => r.Uri.AbsolutePath == "/3/movie/1"));
    }

    [Fact]
    public async Task UnconfiguredServiceDoesNotContactTmdb()
    {
        var http = new TmdbHttp();
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new TmdbSyncService(new Store(), http, new TmdbSettings()).SyncAsync(new()));
        Assert.Empty(http.Requests);
    }

    [Fact]
    public async Task ConcurrentSyncIsRejectedAndGateIsReleased()
    {
        var http = new TmdbHttp { AccountPause = new(TaskCreationOptions.RunContinuationsAsynchronously) };
        var service = Service(new Store(), http);
        var first = service.SyncAsync(new());
        await http.AccountEntered.Task;
        await Assert.ThrowsAsync<TmdbSyncBusyException>(() => service.SyncAsync(new()));
        http.AccountPause.SetResult(true);
        await first;
        await service.SyncAsync(new());
    }

    [Fact]
    public async Task PaginationReadsEveryPageAndKeepsNewestFirst()
    {
        var http = new TmdbHttp();
        http.Override = uri => uri.AbsolutePath.EndsWith("watchlist/movies")
            ? Ok(uri.Query.Contains("page=2")
                ? Page([Item(1)], 2, 2, 2) : Page([Item(2)], 1, 2, 2)) : null;
        var store = new Store();
        await Service(store, http).SyncAsync(new() { DryRun = false });
        Assert.Equal(2, store.Docs[("movies", "watchlist", "tmdb-movie-watch-2")]["order"]!.GetValue<int>());
        Assert.Equal(1, store.Docs[("movies", "watchlist", "tmdb-movie-watch-1")]["order"]!.GetValue<int>());
    }

    [Theory]
    [InlineData("account")]
    [InlineData("oversized")]
    [InlineData("page-number")]
    [InlineData("empty-page")]
    [InlineData("missing-item")]
    [InlineData("duplicate")]
    [InlineData("invalid-rating")]
    [InlineData("metadata")]
    [InlineData("unauthorized")]
    [InlineData("rate-limit")]
    [InlineData("changed-total")]
    [InlineData("malformed-json")]
    public async Task InvalidOrPartialSourceFailsBeforeAnyWrites(string scenario)
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(1)]);
        switch (scenario)
        {
            case "account": http.AccountId = 999; break;
            case "oversized": http.Feeds["watchlist/movies"] = Page([Item(1)], 1, 20, 300); break;
            case "page-number": http.Feeds["watchlist/movies"] = Page([Item(1)], 2, 1, 1); break;
            case "empty-page": http.Feeds["watchlist/movies"] = Page([], 1, 1, 1); break;
            case "missing-item": http.Feeds["watchlist/movies"] = Page([Item(1)], 1, 1, 2); break;
            case "duplicate": http.Feeds["watchlist/movies"] = Page([Item(1), Item(1)]); break;
            case "invalid-rating": http.Feeds["rated/tv"] = Page([Item(3, 8.3)]); break;
            case "metadata": http.Override = uri => uri.AbsolutePath.Contains("/movie/") ? Ok(new JsonObject { ["id"] = 999 }) : null; break;
            case "unauthorized": http.Override = _ => new(HttpStatusCode.Unauthorized); break;
            case "rate-limit": http.Override = uri => uri.AbsolutePath.EndsWith("rated/tv") ? new(HttpStatusCode.TooManyRequests) : null; break;
            case "changed-total": http.Override = uri => uri.AbsolutePath.EndsWith("watchlist/movies")
                ? Ok(uri.Query.Contains("page=2") ? Page([Item(2)], 2, 2, 3) : Page([Item(1)], 1, 2, 2)) : null; break;
            case "malformed-json": http.Override = _ => new(HttpStatusCode.OK) { Content = new StringContent("<html>failure</html>") }; break;
        }
        var store = new Store();
        await Assert.ThrowsAsync<TmdbSourceException>(() => Service(store, http).SyncAsync(new() { DryRun = false }));
        Assert.Equal(0, store.Writes);
    }

    [Fact]
    public async Task MetadataTimeoutFailsBeforeWrites()
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(1)]);
        http.Override = uri => uri.AbsolutePath.Contains("/movie/") ? throw new TaskCanceledException() : null;
        var store = new Store();
        var failure = await Assert.ThrowsAsync<TmdbSyncProgressException>(() => Service(store, http).SyncAsync(new() { DryRun = false }));
        Assert.True(failure.TimedOut);
        Assert.Equal("metadata", failure.Phase);
        Assert.NotNull(failure.PartialResult.ContinuationToken);
        Assert.Equal(0, store.Writes);
    }

    [Fact]
    public async Task TwentyItemBatchesResumeAcrossServiceInstancesWithStableSnapshotAndCumulativeCounts()
    {
        var store = new Store();
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page(Enumerable.Range(1, 25).Reverse().Select(id => Item(id)).ToArray());
        var first = await Service(store, http).SyncAsync(new() { DryRun = false });
        Assert.False(first.Completed);
        Assert.Equal(20, first.Created);
        Assert.Equal(25, first.WatchlistImported);
        Assert.Equal(60, http.Requests.Count(r => r.Uri.AbsolutePath.StartsWith("/3/movie/")));
        Assert.Equal(20, store.Docs.Count);
        Assert.NotNull(first.ContinuationToken);
        Assert.True(first.ContinuationToken.Length <= 2048);

        // No in-memory job or background continuation: a fresh instance can resume.
        var final = await Service(store, http).SyncAsync(new() { DryRun = false, ContinuationToken = first.ContinuationToken });
        Assert.True(final.Completed);
        Assert.Null(final.ContinuationToken);
        Assert.Equal(25, final.Created);
        Assert.Equal(25, final.MoviesUpdated);
        Assert.Equal(25, store.Docs.Count);
        Assert.Equal(75, http.Requests.Count(r => r.Uri.AbsolutePath.StartsWith("/3/movie/")));
        Assert.Single(store.Docs.Values.Select(d => d["syncedAt"]!.GetValue<string>()).Distinct());
        Assert.Equal(25, store.Docs[("movies", "watchlist", "tmdb-movie-watch-25")]["order"]!.GetValue<int>());
        Assert.Equal(1, store.Docs[("movies", "watchlist", "tmdb-movie-watch-1")]["order"]!.GetValue<int>());
        Assert.True(TmdbSyncService.RequestBudget < TimeSpan.FromSeconds(45));
    }

    [Fact]
    public async Task DryRunContinuationNeverWrites()
    {
        var store = new Store();
        var http = new TmdbHttp();
        http.Feeds["watchlist/tv"] = Page(Enumerable.Range(1, 21).Select(id => Item(id)).ToArray());
        var first = await Service(store, http).SyncAsync(new());
        Assert.False(first.Completed);
        var final = await Service(store, http).SyncAsync(new() { ContinuationToken = first.ContinuationToken });
        Assert.True(final.Completed);
        Assert.Equal(21, final.Created);
        Assert.Equal(0, store.Writes);
    }

    [Theory]
    [InlineData("signature")]
    [InlineData("dryRun")]
    [InlineData("maxItems")]
    [InlineData("account")]
    public async Task ContinuationCannotBeTamperedReconfiguredOrChangeOptions(string change)
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page(Enumerable.Range(1, 21).Select(id => Item(id)).ToArray());
        var store = new Store();
        var first = await Service(store, http).SyncAsync(new());
        var request = new TmdbSyncRequest { ContinuationToken = first.ContinuationToken };
        if (change == "signature") request.ContinuationToken = "!" + first.ContinuationToken;
        if (change == "dryRun") request.DryRun = false;
        if (change == "maxItems") request.MaxItems = 500;
        var service = change == "account"
            ? new TmdbSyncService(store, http, new TmdbSettings { AccountId = 999, ReadAccessToken = "test-read-token", SessionId = "test-session" })
            : Service(store, http);
        var before = http.Requests.Count;
        await Assert.ThrowsAsync<TmdbContinuationException>(() => service.SyncAsync(request));
        Assert.Equal(before, http.Requests.Count);
        Assert.Equal(0, store.Writes);
    }

    [Fact]
    public async Task ChangedSourceRejectsContinuationWithoutAdditionalWrites()
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page(Enumerable.Range(1, 21).Select(id => Item(id)).ToArray());
        var store = new Store();
        var first = await Service(store, http).SyncAsync(new() { DryRun = false });
        http.Feeds["watchlist/movies"] = Page(Enumerable.Range(1, 22).Select(id => Item(id)).ToArray());
        var failure = await Assert.ThrowsAsync<TmdbContinuationException>(() =>
            Service(store, http).SyncAsync(new() { DryRun = false, ContinuationToken = first.ContinuationToken }));
        Assert.True(failure.Stale);
        Assert.Equal(20, store.Writes);
        Assert.Equal(20, store.Docs.Count);
    }

    [Fact]
    public async Task OldContinuationCannotDemoteDocumentsFromANewerSyncSnapshot()
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page(Enumerable.Range(1, 21).Select(id => Item(id)).ToArray());
        var store = new Store();
        var first = await Service(store, http).SyncAsync(new() { DryRun = false });
        var newer = store.Docs.Values.First().DeepClone().AsObject();
        newer["id"] = "tmdb-movie-watch-21";
        newer["tmdbId"] = 21;
        newer["syncedAt"] = DateTimeOffset.UtcNow.AddMinutes(5).ToString("O");
        var original = newer.ToJsonString();
        store.Docs[("movies", "watchlist", "tmdb-movie-watch-21")] = newer;
        var final = await Service(store, http).SyncAsync(new() { DryRun = false, ContinuationToken = first.ContinuationToken });
        Assert.True(final.Completed);
        Assert.Equal(1, final.Skipped);
        Assert.Equal(original, store.Docs[("movies", "watchlist", "tmdb-movie-watch-21")].ToJsonString());
        Assert.Contains(final.Warnings, w => w.Contains("newer sync snapshot"));
    }

    [Fact]
    public async Task StorageTimeoutReturnsAcknowledgedProgressAndResumesAtUnacknowledgedEntry()
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page(Enumerable.Range(1, 25).Select(id => Item(id)).ToArray());
        var store = new Store { TimeoutAfterWrites = 7 };
        var failure = await Assert.ThrowsAsync<TmdbSyncProgressException>(() =>
            Service(store, http).SyncAsync(new() { DryRun = false }));
        Assert.True(failure.TimedOut);
        Assert.Equal("storage", failure.Phase);
        Assert.Equal(7, failure.PartialResult.Created);
        Assert.False(failure.PartialResult.Completed);
        Assert.Equal(7, store.Docs.Count);
        var final = await Service(store, http).SyncAsync(new()
        {
            DryRun = false, ContinuationToken = failure.PartialResult.ContinuationToken
        });
        Assert.True(final.Completed);
        Assert.Equal(25, final.Created);
        Assert.Equal(25, store.Docs.Count);
        Assert.Single(store.Docs.Values.Select(d => d["syncedAt"]!.GetValue<string>()).Distinct());
    }

    [Fact]
    public async Task SourceTimeoutReturnsExplicitRetryInformationWithoutWritesOrCursor()
    {
        var store = new Store();
        var http = new TmdbHttp { Override = _ => throw new TaskCanceledException() };
        var failure = await Assert.ThrowsAsync<TmdbSyncProgressException>(() =>
            Service(store, http).SyncAsync(new() { DryRun = false }));
        Assert.Equal("source", failure.Phase);
        Assert.Null(failure.PartialResult.ContinuationToken);
        Assert.Equal(0, failure.PartialResult.Created);
        Assert.Equal(0, store.Writes);
    }

    [Fact]
    public async Task RepeatedSyncPreservesReviewsUnknownFieldsAndEtags_AndNeverTouchesTopOrRemovedDocs()
    {
        var store = new Store();
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(1)]);
        var service = Service(store, http);
        await service.SyncAsync(new() { DryRun = false });
        var key = ("movies", "watchlist", "tmdb-movie-watch-1");
        store.Docs[key]["review"] = new JsonObject { ["en"] = "Keep", ["es"] = "Mantener", ["pt"] = "Manter" };
        store.Docs[key]["custom"] = new JsonObject { ["nested"] = 42 };
        store.Docs[key]["titleTranslations"]!["fr"] = "Keep extra locale";
        store.Docs[("movies", "top-movies", "manual-top")] = new JsonObject { ["id"] = "manual-top", ["order"] = 1, ["titleId"] = "tt0000001" };
        var topBefore = store.Docs[("movies", "top-movies", "manual-top")].ToJsonString();
        var repeated = await service.SyncAsync(new() { DryRun = false });
        Assert.Equal(0, repeated.Created);
        Assert.Equal(1, repeated.Replaced);
        Assert.Equal("etag", store.LastETag);
        Assert.Equal("Keep", store.Docs[key]["review"]!["en"]!.GetValue<string>());
        Assert.Equal(42, store.Docs[key]["custom"]!["nested"]!.GetValue<int>());
        Assert.Equal("Keep extra locale", store.Docs[key]["titleTranslations"]!["fr"]!.GetValue<string>());
        Assert.Equal(topBefore, store.Docs[("movies", "top-movies", "manual-top")].ToJsonString());
        http.Feeds.Clear();
        var empty = await service.SyncAsync(new() { DryRun = false });
        Assert.Equal(0, empty.Created + empty.Replaced + empty.Deleted);
        Assert.Contains(empty.Warnings, w => w.Contains("is empty"));
        Assert.True(store.Docs.ContainsKey(key));
        Assert.DoesNotContain(store.QueriedPartitions, p => p.Contains("top"));
    }

    [Fact]
    public async Task ManualImdbCollisionAndOwnedIdCollisionAreSkipped()
    {
        var store = new Store();
        store.Docs[("movies", "watchlist", "manual")] = new JsonObject { ["id"] = "manual", ["titleId"] = "tt0000001" };
        store.Docs[("series", "watchlist", "tmdb-tv-watch-2")] = new JsonObject { ["id"] = "tmdb-tv-watch-2", ["tmdbId"] = 2 };
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(1)]);
        http.Feeds["watchlist/tv"] = Page([Item(2)]);
        var result = await Service(store, http).SyncAsync(new() { DryRun = false });
        Assert.Equal(2, result.Skipped);
        Assert.Equal(0, store.Writes);
    }

    [Fact]
    public async Task ConcurrentReplacementDoesNotOverwriteEditor()
    {
        var store = new Store();
        var http = new TmdbHttp();
        http.Feeds["watchlist/movies"] = Page([Item(1)]);
        var service = Service(store, http);
        await service.SyncAsync(new() { DryRun = false });
        store.Conflict = true;
        var result = await service.SyncAsync(new() { DryRun = false });
        Assert.Equal(1, result.Skipped);
        Assert.Equal(0, result.Replaced);
        Assert.Contains(result.Warnings, w => w.Contains("Concurrent edit"));
    }

    [Fact]
    public async Task MissingTranslationsAndPosterFallbackWithoutInventedReviewsOrImdbId()
    {
        var http = new TmdbHttp();
        http.Feeds["watchlist/tv"] = Page([Item(4)]);
        http.Override = uri =>
        {
            if (!uri.AbsolutePath.Contains("/tv/")) return null;
            var details = http.Details(uri);
            details["poster_path"] = null;
            details["imdb_id"] = null;
            if (!uri.Query.Contains("en-US")) details["name"] = "";
            return Ok(details);
        };
        var store = new Store();
        var result = await Service(store, http).SyncAsync(new() { DryRun = false });
        var doc = store.Docs.Values.Single();
        Assert.Null(doc["titleId"]);
        Assert.Null(doc["imageUrl"]);
        Assert.Equal(doc["titleTranslations"]!["en"]!.ToJsonString(), doc["titleTranslations"]!["pt"]!.ToJsonString());
        Assert.Equal("", doc["review"]!["pt"]!.GetValue<string>());
        Assert.Contains(result.Warnings, w => w.Contains("fallback"));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1001)]
    public async Task InvalidLimitDoesNotFetch(int max)
    {
        var http = new TmdbHttp();
        await Assert.ThrowsAsync<ArgumentException>(() => Service(new Store(), http).SyncAsync(new() { MaxItems = max }));
        Assert.Empty(http.Requests);
    }

    [Fact]
    public void MediaOrderingPreservesManualTopOrderAndSortsCurrentSnapshotBeforeRetainedTitles()
    {
        MovieDocument[] docs =
        [
            new() { Id = "old", SyncSource = "tmdb", SyncedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"), Order = 90 },
            new() { Id = "second", SyncSource = "tmdb", SyncedAt = DateTimeOffset.Parse("2026-02-01T00:00:00Z"), Order = 1 },
            new() { Id = "newest", SyncSource = "tmdb", SyncedAt = DateTimeOffset.Parse("2026-02-01T00:00:00Z"), Order = 2 },
            new() { Id = "manual-no-order" }
        ];
        Assert.Equal(new[] { "newest", "second", "old", "manual-no-order" }, MediaOrdering.Sort(docs, "watchlist").Select(d => d.Id));
        Assert.Equal(new[] { "second", "newest", "old", "manual-no-order" }, MediaOrdering.Sort(docs, "top-movies").Select(d => d.Id));
    }

    [Theory]
    [InlineData("movies", "movie")]
    [InlineData("series", "tv")]
    public void MediaValidationSupportsTmdbWithoutImdbAndHalfPointRatings(string type, string mediaType)
    {
        var doc = new JsonObject { ["category"] = "watchlist", ["tmdbId"] = 5, ["mediaType"] = mediaType, ["myRating"] = 0.5 };
        Assert.Empty(ContentValidator.Validate(AdminContentTypes.All[type], doc));
        doc["myRating"] = 8.3;
        Assert.Contains(ContentValidator.Validate(AdminContentTypes.All[type], doc), e => e.Contains("half-point"));
        doc["myRating"] = new JsonObject();
        Assert.NotEmpty(ContentValidator.Validate(AdminContentTypes.All[type], doc));
        doc["tmdbId"] = -5;
        Assert.Contains(ContentValidator.Validate(AdminContentTypes.All[type], doc), e => e.Contains("tmdbId"));
    }

    [Fact]
    public void StoredMetadataValidationRequiresAllThreeLocalesAndSafePosterPaths()
    {
        var doc = new JsonObject
        {
            ["category"] = "watchlist", ["tmdbId"] = 1, ["mediaType"] = "movie",
            ["titleTranslations"] = new JsonObject { ["en"] = "English only" },
            ["posterPath"] = "https://untrusted.test/poster.jpg"
        };
        var errors = ContentValidator.Validate(AdminContentTypes.All["movies"], doc);
        Assert.Contains(errors, e => e.Contains("titleTranslations.es"));
        Assert.Contains(errors, e => e.Contains("titleTranslations.pt"));
        Assert.Contains(errors, e => e.Contains("posterPath"));
    }

    private static TmdbSyncService Service(Store store, TmdbHttp http) => new(store, http,
        new TmdbSettings { AccountId = 123, ReadAccessToken = "test-read-token", SessionId = "test-session" });
    private static JsonObject Item(int id, double? rating = null) => new() { ["id"] = id, ["rating"] = rating };
    private static JsonObject Page(JsonObject[] items, int page = 1, int? pages = null, int? total = null) => new()
    {
        ["page"] = page, ["total_pages"] = pages ?? (items.Length == 0 ? 0 : 1),
        ["total_results"] = total ?? items.Length, ["results"] = new JsonArray(items.Cast<JsonNode?>().ToArray())
    };
    private static HttpResponseMessage Ok(JsonObject body) => new(HttpStatusCode.OK) { Content = new StringContent(body.ToJsonString()) };

    private sealed class TmdbHttp : HttpMessageHandler, IHttpClientFactory
    {
        public int AccountId = 123;
        public Dictionary<string, JsonObject> Feeds = [];
        public System.Collections.Concurrent.ConcurrentBag<(Uri Uri, string? Authorization)> Requests = [];
        public Func<Uri, HttpResponseMessage?>? Override;
        public TaskCompletionSource<bool>? AccountPause;
        public TaskCompletionSource<bool> AccountEntered = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public HttpClient CreateClient(string name) => new(this, disposeHandler: false);
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var uri = request.RequestUri!;
            Requests.Add((uri, request.Headers.Authorization?.ToString()));
            if (uri.AbsolutePath == "/3/account" && AccountPause != null)
            {
                AccountEntered.TrySetResult(true);
                await AccountPause.Task.WaitAsync(ct);
            }
            var overridden = Override?.Invoke(uri);
            if (overridden != null) return overridden;
            if (uri.AbsolutePath == "/3/account") return Ok(new JsonObject { ["id"] = AccountId });
            if (uri.AbsolutePath.StartsWith("/3/account/"))
            {
                var path = string.Join("/", uri.AbsolutePath.Split('/').TakeLast(2));
                return Ok(Feeds.GetValueOrDefault(path) ?? Page([]));
            }
            return Ok(Details(uri));
        }
        public JsonObject Details(Uri uri)
        {
            var id = int.Parse(uri.Segments.Last());
            var language = uri.Query.Contains("es-ES") ? "es-ES" : uri.Query.Contains("pt-BR") ? "pt-BR" : "en-US";
            return new JsonObject
            {
                ["id"] = id, ["title"] = $"title-{language}-{id}", ["name"] = $"title-{language}-{id}",
                ["original_title"] = "original", ["original_name"] = "original",
                ["overview"] = $"overview-{language}", ["poster_path"] = "/poster.jpg",
                ["vote_average"] = 7.8, ["release_date"] = "2026-01-01", ["first_air_date"] = "2026-01-01",
                ["imdb_id"] = $"tt{id:D7}", ["genres"] = new JsonArray(new JsonObject { ["id"] = 1, ["name"] = $"genre-{language}" })
            };
        }
    }

    private sealed class Store : ICosmosAdminService
    {
        public bool IsConfigured => true;
        public Dictionary<(string Type, string Category, string Id), JsonObject> Docs = [];
        public List<string> QueriedPartitions = [];
        public int Writes;
        public bool Conflict;
        public int? TimeoutAfterWrites;
        public string? LastETag;
        public Task<IReadOnlyList<JsonObject>> ListAsync(AdminContentType type, string? pk, CancellationToken ct = default)
        {
            QueriedPartitions.Add(pk ?? "");
            return Task.FromResult<IReadOnlyList<JsonObject>>(Docs.Where(d => d.Key.Type == type.Slug && d.Key.Category == pk)
                .Select(d => d.Value.DeepClone().AsObject()).ToList());
        }
        public Task<(JsonObject? Doc, string? ETag)> GetAsync(AdminContentType type, string id, string pk, CancellationToken ct = default) =>
            Task.FromResult<(JsonObject?, string?)>((Docs.GetValueOrDefault((type.Slug, pk, id))?.DeepClone().AsObject(), "etag"));
        public Task<(JsonObject Doc, string? ETag)> CreateAsync(AdminContentType type, JsonObject doc, CancellationToken ct = default)
        {
            if (TimeoutAfterWrites == Writes)
            {
                TimeoutAfterWrites = null;
                throw new TaskCanceledException();
            }
            Writes++;
            Docs.Add((type.Slug, doc["category"]!.GetValue<string>(), doc["id"]!.GetValue<string>()), doc.DeepClone().AsObject());
            return Task.FromResult<(JsonObject, string?)>((doc, "etag"));
        }
        public Task<(JsonObject Doc, string? ETag)> ReplaceAsync(AdminContentType type, string id, JsonObject doc, string? etag, CancellationToken ct = default)
        {
            LastETag = etag;
            if (Conflict) throw new CosmosException("edit", HttpStatusCode.PreconditionFailed, 0, "", 0);
            Assert.Equal("etag", etag);
            Writes++;
            Docs[(type.Slug, doc["category"]!.GetValue<string>(), id)] = doc.DeepClone().AsObject();
            return Task.FromResult<(JsonObject, string?)>((doc, "etag"));
        }
        public Task DeleteAsync(AdminContentType type, string id, string pk, CancellationToken ct = default) =>
            throw new Xunit.Sdk.XunitException("Sync must never delete.");
        public Task<JsonObject?> GetSampleAsync(AdminContentType type, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<IReadOnlyList<string>> GetPartitionValuesAsync(AdminContentType type, CancellationToken ct = default) => throw new NotSupportedException();
    }
}
