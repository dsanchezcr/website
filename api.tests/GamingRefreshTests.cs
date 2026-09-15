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

    [Fact]
    public async Task PlayStationRefresh_ExchangesRotatedCredentialsAndDoesNotDiscardCacheOnFailure()
    {
        using var token = new Env("PSN_NPSSO_TOKEN", "test-only-npsso");
        using var memory = new MemoryCache(new MemoryCacheOptions());
        memory.Set("psn:access_token", "stale-token");
        var accessToken = "header." + Convert.ToBase64String(Encoding.UTF8.GetBytes("""{"account_id":"123"}""")).TrimEnd('=') + ".signature";
        var authorizeCalls = 0;
        var failTrophies = false;
        var handler = new Handler(request =>
        {
            var url = request.RequestUri!.AbsolutePath;
            if (url.EndsWith("/authorize"))
            {
                authorizeCalls++;
                var response = new HttpResponseMessage(HttpStatusCode.Found);
                response.Headers.Location = new Uri("com.scee.psxandroid.scecompcall://redirect?code=test-code");
                return response;
            }
            if (url.EndsWith("/token"))
                return new HttpResponseMessage(HttpStatusCode.OK) {
                    Content = new StringContent(JsonSerializer.Serialize(new { access_token = accessToken }))
                };
            if (url.EndsWith("trophySummary") && failTrophies)
                return new HttpResponseMessage(HttpStatusCode.Unauthorized);
            return new HttpResponseMessage(HttpStatusCode.OK) {
                Content = new StringContent(url.EndsWith("/profiles") ? """{"onlineId":"PSN User"}""" :
                    url.EndsWith("trophySummary") ? """{"trophyLevel":10,"earnedTrophies":{"gold":1}}""" :
                    """{"totalItemCount":0,"trophyTitles":[]}""")
            };
        });
        var cache = new Cache();
        var service = new PlayStationProfileService(NullLogger<PlayStationProfileService>.Instance, new Factory(handler), cache, memory);
        await service.RefreshAsync(true, default);
        Assert.Equal(1, authorizeCalls);
        Assert.Equal("PSN User", cache.Profile.OnlineId);
        failTrophies = true;
        await Assert.ThrowsAsync<HttpRequestException>(() => service.RefreshAsync(true, default));
        Assert.Equal(2, authorizeCalls);
        Assert.Equal("PSN User", cache.Profile.OnlineId);
        Assert.Equal(0, cache.Clears);
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
        public int Clears { get; private set; }
        public CancellationToken LastSaveToken { get; private set; }
        public Task<GamingProfile?> GetProfileAsync(string platform) => Task.FromResult<GamingProfile?>(Profile);
        public Task SaveProfileAsync(string platform, GamingProfile profile, CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();
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
        public Request(string body, string? role = null) : base(new TestFunctionContext())
        {
            Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
            if (role != null)
                Headers.Add("x-ms-client-principal", Convert.ToBase64String(Encoding.UTF8.GetBytes(
                    JsonSerializer.Serialize(new { userRoles = new[] { role } }))));
        }
        public override Stream Body { get; }
        public override HttpHeadersCollection Headers { get; } = new();
        public override IReadOnlyCollection<IHttpCookie> Cookies => Array.Empty<IHttpCookie>();
        public override Uri Url => new("https://example.test/api/gaming/refresh");
        public override IEnumerable<ClaimsIdentity> Identities => Array.Empty<ClaimsIdentity>();
        public override string Method => "POST";
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
