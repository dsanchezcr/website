using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using api.Services;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace api.tests;

[CollectionDefinition("Gaming environment", DisableParallelization = true)]
public class GamingEnvironmentCollection;

[Collection("Gaming environment")]
public class GamingRefreshTests
{
    [Fact]
    public void RefreshBudget_LeavesTimeForResponseWithinSwaLimit()
    {
        Assert.InRange(RefreshGamingProfiles.RequestTimeout.TotalSeconds, 1, 35);
    }

    [Fact]
    public async Task CancelledCacheSave_RetainsTheWorkingProfile()
    {
        using var memory = new MemoryCache(new MemoryCacheOptions());
        var cache = new InMemoryGamingCacheService(memory, NullLogger<InMemoryGamingCacheService>.Instance);
        await cache.SaveProfileAsync("xbox", new GamingProfile { Gamertag = "retained" });
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            cache.SaveProfileAsync("xbox", new GamingProfile { Gamertag = "cancelled" }, new CancellationToken(true)));
        Assert.Equal("retained", (await cache.GetProfileAsync("xbox"))!.Gamertag);
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("authenticated", 403)]
    public async Task Refresh_RejectsUnauthorizedBeforeCallingProviders(string? role, int expected)
    {
        using var env = new Env("GAMING_REFRESH_KEY", null);
        var provider = new Provider("xbox");
        var endpoint = Endpoint(provider);
        var response = await endpoint.Run(new Request("{}", role), default);
        Assert.Equal(expected, (int)response.StatusCode);
        Assert.Equal(0, provider.Calls);
    }

    [Theory]
    [InlineData("{")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{\"platform\":\"invalid\"}")]
    [InlineData("{\"platform\":null}")]
    public async Task Refresh_InvalidPayloadNeverRefreshesAll(string body)
    {
        var provider = new Provider("xbox");
        var response = await Endpoint(provider).Run(new Request(body, "admin"), default);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, provider.Calls);
    }

    [Fact]
    public async Task Refresh_AdminWorksWithoutSecretAndReportsBothOutcomes()
    {
        using var env = new Env("GAMING_REFRESH_KEY", null);
        var xbox = new Provider("xbox");
        var psn = new Provider("playstation", fail: true);
        var response = await Endpoint(xbox, psn).Run(new Request("{}", "admin"), default);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        using var body = await Read(response);
        Assert.Equal("refreshed", body.RootElement.GetProperty("results").GetProperty("xbox").GetProperty("status").GetString());
        Assert.Equal("failed", body.RootElement.GetProperty("results").GetProperty("playstation").GetProperty("status").GetString());
        Assert.True(xbox.RenewedCredentials);
    }

    [Fact]
    public async Task Refresh_LegacyKeyAndRateLimitRemainSupported()
    {
        using var env = new Env("GAMING_REFRESH_KEY", "test-only-key");
        var provider = new Provider("xbox");
        var endpoint = Endpoint(provider);
        for (var i = 0; i < 6; i++)
        {
            var req = new Request("""{"platform":"xbox"}""");
            req.Headers.Add("X-Gaming-Refresh-Key", "test-only-key");
            var response = await endpoint.Run(req, default);
            Assert.Equal(i == 5 ? HttpStatusCode.TooManyRequests : HttpStatusCode.OK, response.StatusCode);
        }
        Assert.Equal(5, provider.Calls);
    }

    [Fact]
    public async Task PublicRead_FallsBackWithoutClearingCache()
    {
        var cache = new Cache();
        var reader = new GamingProfileReader(new[] { new Provider("xbox", fail: true) }, cache,
            new MemoryCacheRateLimitService(new MemoryCache(new MemoryCacheOptions())),
            NullLogger<GamingProfileReader>.Instance);
        var response = await reader.ReadAsync(new Request("{}"), "xbox", default);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, cache.Clears);
        using var body = await Read(response);
        Assert.Equal("cached", body.RootElement.GetProperty("gamertag").GetString());
    }

    [Fact]
    public async Task XboxProvider_PersistsFreshProfileAndRetainsCacheOnFailure()
    {
        using var key = new Env("XBOX_API_KEY", "test-only-key");
        using var id = new Env("XBOX_GAMERTAG_XUID", "123");
        var cache = new Cache();
        var handler = new Handler(request => new HttpResponseMessage(HttpStatusCode.OK) {
            Content = new StringContent(request.RequestUri!.AbsolutePath.Contains("achievements")
                ? """{"titles":[]}""" : """{"gamertag":"Fresh","gamerscore":10}""")
        });
        var service = new XboxProfileService(NullLogger<XboxProfileService>.Instance, new Factory(handler), cache);
        using var request = new CancellationTokenSource();
        await service.RefreshAsync(true, request.Token);
        Assert.Equal(request.Token, cache.LastSaveToken);
        Assert.Equal("Fresh", cache.Profile.Gamertag);
        var failed = new XboxProfileService(NullLogger<XboxProfileService>.Instance,
            new Factory(new Handler(_ => new HttpResponseMessage(HttpStatusCode.Unauthorized))), cache);
        await Assert.ThrowsAsync<HttpRequestException>(() => failed.RefreshAsync(true, default));
        Assert.Equal("Fresh", cache.Profile.Gamertag);
        Assert.Equal(0, cache.Clears);
    }

    private static RefreshGamingProfiles Endpoint(params IGamingProfileService[] providers) =>
        new(NullLogger<RefreshGamingProfiles>.Instance, providers,
            new MemoryCacheRateLimitService(new MemoryCache(new MemoryCacheOptions())));

    public static IEnumerable<object[]> PlayStationIdentityCases()
    {
        var tokens = new[]
        {
            "test-only-opaque-access-token",
            Jwt("""{"scope":"psn:clientapp"}"""),
            Jwt("""{"sub":"not-an-account-id"}"""),
            Jwt("""{"sub":"777"}"""),
            Jwt("""{"account_id":"888","sub":"777"}"""),
            Jwt("""{"user_id":"999"}""")
        };
        foreach (var token in tokens)
        foreach (var stringLevel in new[] { false, true })
            yield return new object[] { token, stringLevel };
    }

    [Theory]
    [MemberData(nameof(PlayStationIdentityCases))]
    public async Task PlayStationRefresh_UsesSummaryIdentityAndAcceptsNumericOrStringLevel(
        string accessToken, bool stringLevel)
    {
        using var psn = new PlayStationFixture();
        psn.AccessTokenForExchange = _ => accessToken;
        psn.TitlesJson = """{"totalItemCount":0,"trophyTitles":[]}""";
        psn.SummaryJson = JsonSerializer.Serialize(new
        {
            accountId = PlayStationFixture.AccountId,
            trophyLevel = stringLevel ? (object)"10" : 10,
            earnedTrophies = new { platinum = 2, gold = 3, silver = 4, bronze = 5 }
        });
        using var cancellation = new CancellationTokenSource();

        var profile = await psn.Service.RefreshAsync(false, cancellation.Token);

        Assert.Equal("playstation", profile.Platform);
        Assert.Equal("PSN User", profile.OnlineId);
        Assert.Equal(10, profile.TrophyLevel);
        Assert.NotNull(profile.TrophySummary);
        Assert.Equal(2, profile.TrophySummary.Platinum);
        Assert.Equal(3, profile.TrophySummary.Gold);
        Assert.Equal(4, profile.TrophySummary.Silver);
        Assert.Equal(5, profile.TrophySummary.Bronze);
        Assert.Equal(0, profile.GamesPlayed);
        Assert.Empty(profile.RecentGames); // An empty, complete titles response is valid.
        Assert.Same(profile, psn.Cache.Profile);
        Assert.Equal(1, psn.Cache.Saves);
        Assert.Equal(cancellation.Token, psn.Cache.LastSaveToken);
        var summary = Assert.Single(psn.DataRequests, r => r.Url.AbsolutePath.EndsWith("/trophySummary"));
        Assert.Equal("https://m.np.playstation.com/api/trophy/v1/users/me/trophySummary", summary.Url.AbsoluteUri);
        var user = Assert.Single(psn.DataRequests, r => r.Url.AbsolutePath.EndsWith("/profiles"));
        Assert.Equal(
            $"https://m.np.playstation.com/api/userProfile/v1/internal/users/{PlayStationFixture.AccountId}/profiles",
            user.Url.AbsoluteUri);
        Assert.True(psn.DataRequests.IndexOf(summary) < psn.DataRequests.IndexOf(user));
        psn.AssertDataAuthentication();
    }

    [Fact]
    public async Task PlayStationRefresh_ReusesOnlyUnchangedTrimmedCredentialsAndAlwaysRenewsManually()
    {
        using var psn = new PlayStationFixture("  test-only-npsso  ");
        await psn.Service.RefreshAsync(false, default);
        await psn.Service.RefreshAsync(false, default);
        Assert.Equal(1, psn.AuthorizeCalls);
        Assert.Equal(1, psn.TokenCalls);

        using var equivalent = new Env("PSN_NPSSO_TOKEN", "test-only-npsso");
        await psn.Service.RefreshAsync(false, default);
        Assert.Equal(1, psn.AuthorizeCalls);
        Assert.Equal(1, psn.TokenCalls);

        using var rotated = new Env("PSN_NPSSO_TOKEN", "  test-only-rotated-npsso  ");
        await psn.Service.RefreshAsync(false, default);
        Assert.Equal(2, psn.AuthorizeCalls);
        Assert.Equal(2, psn.TokenCalls);
        await psn.Service.RefreshAsync(false, default);
        Assert.Equal(2, psn.AuthorizeCalls);
        Assert.Equal(2, psn.TokenCalls);

        await psn.Service.RefreshAsync(true, default);
        Assert.Equal(3, psn.AuthorizeCalls);
        Assert.Equal(3, psn.TokenCalls);
        await psn.Service.RefreshAsync(true, default);
        Assert.Equal(4, psn.AuthorizeCalls);
        Assert.Equal(4, psn.TokenCalls);
        Assert.Equal(new[]
        {
            "npsso=test-only-npsso",
            "npsso=test-only-rotated-npsso",
            "npsso=test-only-rotated-npsso",
            "npsso=test-only-rotated-npsso"
        }, psn.AuthorizeCookies);
        Assert.Equal(7, psn.Cache.Saves);
        psn.AssertDataAuthentication();
    }

    [Theory]
    [InlineData("trophySummary")]
    [InlineData("profiles")]
    [InlineData("trophyTitles")]
    public async Task PlayStationRefresh_CachedUnauthorizedTokenIsRenewedOnceAndRetryIsSaved(string endpoint)
    {
        using var psn = new PlayStationFixture();
        await psn.Service.RefreshAsync(false, default);
        var previousToken = psn.IssuedAccessToken;
        psn.ProfileJson = """{"onlineId":"Renewed User"}""";
        psn.DataResponse = request =>
            request.RequestUri!.AbsolutePath.EndsWith("/" + endpoint) &&
            request.Headers.Authorization?.Parameter == previousToken
                ? new HttpResponseMessage(HttpStatusCode.Unauthorized)
                : null;
        var requestsBeforeRetry = psn.DataRequests.Count;

        var refreshed = await psn.Service.RefreshAsync(false, default);

        Assert.Equal("Renewed User", refreshed.OnlineId);
        Assert.Same(refreshed, psn.Cache.Profile);
        Assert.Equal(2, psn.Cache.Saves);
        Assert.Equal(2, psn.AuthorizeCalls);
        Assert.Equal(2, psn.TokenCalls);
        var retryRequests = psn.DataRequests.Skip(requestsBeforeRetry).ToArray();
        Assert.Single(retryRequests, r => r.Url.AbsolutePath.EndsWith("/" + endpoint) && r.Token == previousToken);
        Assert.Contains(retryRequests, r => r.Url.AbsolutePath.EndsWith("/" + endpoint) && r.Token == psn.IssuedAccessToken);

        await psn.Service.RefreshAsync(false, default);
        Assert.Equal(2, psn.AuthorizeCalls);
        Assert.Equal(2, psn.TokenCalls);
        Assert.Equal(0, psn.Cache.Clears);
        psn.AssertDataAuthentication();
    }

    [Theory]
    [InlineData("trophySummary", false)]
    [InlineData("profiles", false)]
    [InlineData("trophyTitles", false)]
    [InlineData("trophySummary", true)]
    [InlineData("profiles", true)]
    [InlineData("trophyTitles", true)]
    public async Task PlayStationPublicRead_FailedUnauthorizedRetryIsBoundedAndReturnsSavedProfile(
        string endpoint, bool exchangeFails)
    {
        using var psn = new PlayStationFixture();
        var saved = await psn.Service.RefreshAsync(false, default);
        var savedJson = JsonSerializer.Serialize(saved);
        var previousRequests = psn.DataRequests.Count;
        using var cancellation = new CancellationTokenSource();
        // Stop a regressed retry loop by request count, never by a timing-dependent timeout.
        psn.Authorizing = () =>
        {
            if (psn.AuthorizeCalls > 2)
            {
                cancellation.Cancel();
                cancellation.Token.ThrowIfCancellationRequested();
            }
        };
        psn.FailTokenExchange = exchangeFails;
        psn.ProfileJson = """{"onlineId":"Incomplete replacement"}""";
        psn.DataResponse = request =>
        {
            if (psn.DataRequests.Count - previousRequests > 6)
            {
                cancellation.Cancel();
                cancellation.Token.ThrowIfCancellationRequested();
            }
            return request.RequestUri!.AbsolutePath.EndsWith("/" + endpoint)
                ? new HttpResponseMessage(HttpStatusCode.Unauthorized)
                : null;
        };

        var response = await psn.PublicEndpoint().Run(
            new Request("{}", method: "GET", path: "/api/gaming/playstation"), cancellation.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("public, max-age=3600", Assert.Single(response.Headers.GetValues("Cache-Control")));
        using var body = await Read(response);
        Assert.Equal(saved.OnlineId, body.RootElement.GetProperty("onlineId").GetString());
        Assert.Equal(saved.TrophyLevel, body.RootElement.GetProperty("trophyLevel").GetInt32());
        Assert.Equal(saved.RecentGames[0].Name, body.RootElement.GetProperty("recentGames")[0].GetProperty("name").GetString());
        Assert.Equal(2, psn.AuthorizeCalls);
        Assert.Equal(2, psn.TokenCalls);
        psn.AssertRetained(saved, savedJson);
        psn.AssertDataAuthentication();
    }

    public static IEnumerable<object[]> IncompletePlayStationResponses()
    {
        foreach (var manual in new[] { false, true })
        foreach (var endpoint in new[] { "trophySummary", "profiles", "trophyTitles" })
        {
            yield return new object[] { manual, endpoint, "http-error" };
            yield return new object[] { manual, endpoint, "{}" };
            yield return new object[] { manual, endpoint, "{" };
            yield return new object[] { manual, endpoint, "null" };
            if (manual) yield return new object[] { manual, endpoint, "unauthorized" };
        }
        foreach (var manual in new[] { false, true })
        {
            yield return new object[] { manual, "trophySummary",
                $$"""{"accountId":"{{PlayStationFixture.AccountId}}","trophyLevel":10}""" };
            yield return new object[] { manual, "trophySummary",
                $$"""{"accountId":"{{PlayStationFixture.AccountId}}","trophyLevel":10,"earnedTrophies":null}""" };
            yield return new object[] { manual, "profiles", """{"onlineId":"  "}""" };
            yield return new object[] { manual, "profiles", """{"profile":{"onlineId":"Not at the root"}}""" };
            yield return new object[] { manual, "trophyTitles", """{"totalItemCount":1,"trophyTitles":null}""" };
            yield return new object[] { manual, "trophyTitles", """{"totalItemCount":1,"trophyTitles":{}}""" };
        }
    }

    [Theory]
    [MemberData(nameof(IncompletePlayStationResponses))]
    public async Task PlayStationEndpoints_FailedOrIncompleteFetchNeverReplacesSavedProfile(
        bool manual, string endpoint, string failure)
    {
        using var key = new Env("GAMING_REFRESH_KEY", null);
        using var psn = new PlayStationFixture();
        var saved = await psn.Service.RefreshAsync(false, default);
        var savedJson = JsonSerializer.Serialize(saved);
        psn.ProfileJson = """{"onlineId":"Incomplete replacement"}""";
        psn.DataResponse = request =>
        {
            if (!request.RequestUri!.AbsolutePath.EndsWith("/" + endpoint)) return null;
            return failure switch
            {
                "http-error" => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
                "unauthorized" => new HttpResponseMessage(HttpStatusCode.Unauthorized),
                _ => JsonResponse(failure)
            };
        };

        if (manual)
        {
            var response = await Endpoint(psn.Service).Run(new Request("""{"platform":"playstation"}""", "admin"), default);
            Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
            using var body = await Read(response);
            Assert.Equal("failed", body.RootElement.GetProperty("results").GetProperty("playstation").GetProperty("status").GetString());
        }
        else
        {
            var response = await psn.PublicEndpoint().Run(
                new Request("{}", method: "GET", path: "/api/gaming/playstation"), default);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("public, max-age=3600", Assert.Single(response.Headers.GetValues("Cache-Control")));
            using var body = await Read(response);
            Assert.Equal(saved.OnlineId, body.RootElement.GetProperty("onlineId").GetString());
        }

        Assert.Equal(manual ? 2 : 1, psn.AuthorizeCalls);
        Assert.Equal(manual ? 2 : 1, psn.TokenCalls);
        psn.AssertRetained(saved, savedJson);
        psn.AssertDataAuthentication();
    }

    public static IEnumerable<object?[]> InvalidPlayStationAccountIds()
    {
        foreach (var manual in new[] { false, true })
        foreach (var accountId in new string?[]
        {
            null, "null", "\"\"", "\"  \"", "123", "{}", "[]",
            "\"not-an-account\"", "\"../other\"", "\"123/456\"", "\"123?other=456\"",
            "\"-123\"", "\"1e3\"", "\"١٢٣\""
        })
            yield return new object?[] { manual, accountId };
    }

    [Theory]
    [MemberData(nameof(InvalidPlayStationAccountIds))]
    public async Task PlayStationRefresh_InvalidSummaryAccountIdNeverUsesJwtIdentityOrOverwritesCache(
        bool manual, string? accountIdJson)
    {
        using var psn = new PlayStationFixture();
        psn.AccessTokenForExchange = _ => Jwt("""{"account_id":"777","sub":"888","user_id":"999"}""");
        var saved = await psn.Service.RefreshAsync(false, default);
        var savedJson = JsonSerializer.Serialize(saved);
        var summary = new Dictionary<string, object?>
        {
            ["trophyLevel"] = 10,
            ["earnedTrophies"] = new { gold = 1 }
        };
        if (accountIdJson != null)
            summary["accountId"] = JsonSerializer.Deserialize<JsonElement>(accountIdJson);
        psn.SummaryJson = JsonSerializer.Serialize(summary);
        var previousRequests = psn.DataRequests.Count;

        var error = await Record.ExceptionAsync(() => psn.Service.RefreshAsync(manual, default));

        Assert.NotNull(error);
        Assert.DoesNotContain(psn.DataRequests.Skip(previousRequests), r => r.Url.AbsolutePath.EndsWith("/profiles"));
        psn.AssertRetained(saved, savedJson);
        psn.AssertDataAuthentication();
    }

    [Theory]
    [InlineData(false, "trophySummary")]
    [InlineData(false, "profiles")]
    [InlineData(false, "trophyTitles")]
    [InlineData(true, "trophySummary")]
    [InlineData(true, "profiles")]
    [InlineData(true, "trophyTitles")]
    public async Task PlayStationRefresh_CancelledFetchNeverReplacesSavedProfile(bool manual, string endpoint)
    {
        using var psn = new PlayStationFixture();
        var saved = await psn.Service.RefreshAsync(false, default);
        var savedJson = JsonSerializer.Serialize(saved);
        using var cancellation = new CancellationTokenSource();
        psn.ProfileJson = """{"onlineId":"Cancelled replacement"}""";
        psn.DataResponse = request =>
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("/" + endpoint))
                cancellation.Cancel();
            return null;
        };

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => psn.Service.RefreshAsync(manual, cancellation.Token));

        psn.AssertRetained(saved, savedJson);
        psn.AssertDataAuthentication();
    }

    [Fact]
    public async Task PlayStationAdminRefresh_UsesRealProviderAndRenewsCredentialsWithoutLegacyKey()
    {
        using var key = new Env("GAMING_REFRESH_KEY", null);
        using var psn = new PlayStationFixture();
        await psn.Service.RefreshAsync(false, default);
        psn.ProfileJson = """{"onlineId":"Admin refreshed"}""";

        var response = await Endpoint(psn.Service).Run(new Request("""{"platform":"playstation"}""", "admin"), default);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("no-store", Assert.Single(response.Headers.GetValues("Cache-Control")));
        using var body = await Read(response);
        Assert.Equal("refreshed", body.RootElement.GetProperty("results").GetProperty("playstation").GetProperty("status").GetString());
        Assert.Equal("Admin refreshed", psn.Cache.Profile.OnlineId);
        Assert.Equal(2, psn.Cache.Saves);
        Assert.Equal(2, psn.AuthorizeCalls);
        Assert.Equal(2, psn.TokenCalls);
        Assert.Equal(0, psn.Cache.Clears);
        psn.AssertDataAuthentication();
    }

    private static string Jwt(string payload) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes("""{"alg":"none"}""")).TrimEnd('=') + "." +
        Convert.ToBase64String(Encoding.UTF8.GetBytes(payload)).TrimEnd('=').Replace('+', '-').Replace('/', '_') +
        ".test-signature";

    private static HttpResponseMessage JsonResponse(string json) =>
        new(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private sealed record SonyDataRequest(Uri Url, string? Scheme, string? Token, bool HasCookie, string ExpectedToken);

    /// <summary>All requests end here; no HttpClient can reach Sony or another live service.</summary>
    private sealed class PlayStationFixture : IDisposable
    {
        public const string AccountId = "12345678901234567890";
        private readonly Env environment;
        private readonly MemoryCache memory = new(new MemoryCacheOptions());
        private readonly Handler handler;
        public Cache Cache { get; } = new();
        public PlayStationProfileService Service { get; }
        public List<SonyDataRequest> DataRequests { get; } = new();
        public List<string?> AuthorizeCookies { get; } = new();
        public int AuthorizeCalls { get; private set; }
        public int TokenCalls { get; private set; }
        public string IssuedAccessToken { get; private set; } = "";
        public Func<int, string> AccessTokenForExchange { get; set; } = count => $"test-only-access-{count}";
        public Func<HttpRequestMessage, HttpResponseMessage?>? DataResponse { get; set; }
        public Action? Authorizing { get; set; }
        public bool FailTokenExchange { get; set; }
        public string SummaryJson { get; set; } =
            $$$"""{"accountId":"{{{AccountId}}}","trophyLevel":10,"earnedTrophies":{"gold":1}}""";
        public string ProfileJson { get; set; } =
            """{"onlineId":"PSN User","avatarUrl":"https://example.test/avatar.png"}""";
        public string TitlesJson { get; set; } = """
            {"totalItemCount":1,"trophyTitles":[
                {"trophyTitleName":"Saved game","npCommunicationId":"TEST-0001",
                 "trophyTitleIconUrl":"https://example.test/game.png","lastUpdatedDateTime":"2026-01-01T00:00:00Z"}
            ]}
            """;

        public PlayStationFixture(string npsso = "test-only-npsso")
        {
            environment = new Env("PSN_NPSSO_TOKEN", npsso);
            handler = new Handler(Respond);
            Service = new PlayStationProfileService(
                NullLogger<PlayStationProfileService>.Instance, new Factory(handler), Cache, memory);
        }

        public GetPlayStationProfile PublicEndpoint() =>
            new(new GamingProfileReader(new[] { Service }, Cache, new MemoryCacheRateLimitService(memory),
                NullLogger<GamingProfileReader>.Instance));

        private HttpResponseMessage Respond(HttpRequestMessage request)
        {
            var uri = request.RequestUri!;
            if (uri.Host == "ca.account.sony.com" && uri.AbsolutePath == "/api/authz/v3/oauth/authorize")
            {
                AuthorizeCalls++;
                AuthorizeCookies.Add(request.Headers.TryGetValues("Cookie", out var values) ? string.Join("; ", values) : null);
                Authorizing?.Invoke();
                var response = new HttpResponseMessage(HttpStatusCode.Found);
                response.Headers.Location = new Uri("com.scee.psxandroid.scecompcall://redirect?code=test-code");
                return response;
            }
            if (uri.Host == "ca.account.sony.com" && uri.AbsolutePath == "/api/authz/v3/oauth/token")
            {
                TokenCalls++;
                if (FailTokenExchange) return new HttpResponseMessage(HttpStatusCode.Unauthorized);
                IssuedAccessToken = AccessTokenForExchange(TokenCalls);
                return JsonResponse(JsonSerializer.Serialize(new { access_token = IssuedAccessToken }));
            }

            DataRequests.Add(new SonyDataRequest(uri, request.Headers.Authorization?.Scheme,
                request.Headers.Authorization?.Parameter, request.Headers.Contains("Cookie"), IssuedAccessToken));
            var overridden = DataResponse?.Invoke(request);
            if (overridden != null) return overridden;
            var json = uri.AbsolutePath switch
            {
                "/api/trophy/v1/users/me/trophySummary" => SummaryJson,
                "/api/trophy/v1/users/me/trophyTitles" => TitlesJson,
                _ when uri.AbsolutePath.EndsWith("/profiles") => ProfileJson,
                _ => throw new InvalidOperationException($"Unexpected mocked Sony request: {uri}")
            };
            return JsonResponse(json);
        }

        public void AssertDataAuthentication()
        {
            Assert.NotEmpty(DataRequests);
            Assert.All(DataRequests, request =>
            {
                Assert.Equal("https", request.Url.Scheme);
                Assert.Equal("m.np.playstation.com", request.Url.Host);
                Assert.Equal("Bearer", request.Scheme);
                Assert.Equal(request.ExpectedToken, request.Token);
                Assert.False(request.HasCookie, "NPSSO cookies must not be sent to data endpoints.");
            });
        }

        public void AssertRetained(GamingProfile saved, string savedJson)
        {
            Assert.Same(saved, Cache.Profile);
            Assert.Equal(savedJson, JsonSerializer.Serialize(Cache.Profile));
            Assert.Equal(1, Cache.Saves);
            Assert.Equal(0, Cache.Clears);
        }

        public void Dispose()
        {
            handler.Dispose();
            memory.Dispose();
            environment.Dispose();
        }
    }

    private static async Task<JsonDocument> Read(HttpResponseData response)
    {
        response.Body.Position = 0;
        return await JsonDocument.ParseAsync(response.Body);
    }

    private sealed class Provider(string platform, bool fail = false) : IGamingProfileService
    {
        public string Platform => platform;
        public int Calls { get; private set; }
        public bool RenewedCredentials { get; private set; }
        public Task<GamingProfile> RefreshAsync(bool renewCredentials, CancellationToken ct)
        {
            Calls++;
            RenewedCredentials = renewCredentials;
            if (fail) throw new HttpRequestException("Simulated provider failure");
            return Task.FromResult(new GamingProfile { Platform = platform });
        }
    }

    private sealed class Cache : IGamingCacheService
    {
        public GamingProfile Profile { get; private set; } = new() { Gamertag = "cached", IsCached = true };
        public int Saves { get; private set; }
        public int Clears { get; private set; }
        public CancellationToken LastSaveToken { get; private set; }
        public Task<GamingProfile?> GetProfileAsync(string platform) => Task.FromResult<GamingProfile?>(Profile);
        public Task SaveProfileAsync(string platform, GamingProfile profile, CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();
            Saves++;
            LastSaveToken = ct;
            Profile = profile;
            return Task.CompletedTask;
        }
        public Task ClearProfileAsync(string platform) { Clears++; return Task.CompletedTask; }
        public Task<(bool IsHealthy, string Message)> CheckHealthAsync() => Task.FromResult((true, "OK"));
    }

    private sealed class Factory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(respond(request));
    }

    private sealed class Env(string name, string? value) : IDisposable
    {
        private readonly string? previous = Set(name, value);
        private static string? Set(string name, string? value)
        {
            var previous = Environment.GetEnvironmentVariable(name);
            Environment.SetEnvironmentVariable(name, value);
            return previous;
        }
        public void Dispose() => Environment.SetEnvironmentVariable(name, previous);
    }

    private sealed class Request : HttpRequestData
    {
        public Request(string body, string? role = null, string method = "POST", string path = "/api/gaming/refresh")
            : base(new TestFunctionContext())
        {
            Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
            Method = method;
            Url = new Uri("https://example.test" + path);
            if (role != null)
                Headers.Add("x-ms-client-principal", Convert.ToBase64String(Encoding.UTF8.GetBytes(
                    JsonSerializer.Serialize(new { userRoles = new[] { role } }))));
        }
        public override Stream Body { get; }
        public override HttpHeadersCollection Headers { get; } = new();
        public override IReadOnlyCollection<IHttpCookie> Cookies => Array.Empty<IHttpCookie>();
        public override Uri Url { get; }
        public override IEnumerable<ClaimsIdentity> Identities => Array.Empty<ClaimsIdentity>();
        public override string Method { get; }
        public override HttpResponseData CreateResponse() => new Response();
    }

    private sealed class Response() : HttpResponseData(new TestFunctionContext())
    {
        public override HttpStatusCode StatusCode { get; set; }
        public override HttpHeadersCollection Headers { get; set; } = new();
        public override Stream Body { get; set; } = new MemoryStream();
        public override HttpCookies Cookies => null!;
    }
}
