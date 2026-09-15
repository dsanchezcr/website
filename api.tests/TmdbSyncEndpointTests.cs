using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using api.Services;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace api.tests;

[CollectionDefinition("TMDB environment", DisableParallelization = true)]
public class TmdbEnvironmentCollection;

[Collection("TMDB environment")]
public class TmdbSyncEndpointTests
{
    [Theory]
    [InlineData(null, 401)]
    [InlineData("authenticated", 403)]
    public async Task UnauthorizedCallsCannotReachService(string? role, int status)
    {
        var service = new Sync();
        var response = await Endpoint(service).Run(new Request("{}", role), default);
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal(0, service.Calls);
    }

    [Theory]
    [InlineData("")]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{")]
    [InlineData("{\"maxItems\":0}")]
    [InlineData("{\"maxItems\":1001}")]
    [InlineData("{\"maxItems\":2.5}")]
    [InlineData("{\"dryRun\":null}")]
    [InlineData("{\"sessionId\":\"not-accepted\"}")]
    [InlineData("{\"accountId\":123}")]
    [InlineData("{\"watchlistUrl\":\"https://example.test\"}")]
    public async Task InvalidBodiesFailBeforeService(string body)
    {
        var service = new Sync();
        var response = await Endpoint(service).Run(new Request(body, "admin"), default);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, service.Calls);
    }

    [Fact]
    public async Task OversizedBodyIsRejected()
    {
        var service = new Sync();
        var response = await Endpoint(service).Run(new Request(new string(' ', 4097), "admin"), default);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, service.Calls);
    }

    [Theory]
    [InlineData("test-sync-key", 200)]
    [InlineData("wrong-key", 401)]
    public async Task AutomationUsesDedicatedKey(string key, int expectedStatus)
    {
        var previous = Environment.GetEnvironmentVariable("TMDB_SYNC_KEY");
        try
        {
            Environment.SetEnvironmentVariable("TMDB_SYNC_KEY", "test-sync-key");
            var req = new Request("{}");
            req.Headers.Add("X-Tmdb-Sync-Key", key);
            var response = await Endpoint(new Sync()).Run(req, default);
            Assert.Equal(expectedStatus, (int)response.StatusCode);
        }
        finally { Environment.SetEnvironmentVariable("TMDB_SYNC_KEY", previous); }
    }

    [Fact]
    public async Task AdminGetsCamelCaseContractAndSafeDefault()
    {
        var service = new Sync();
        var response = await Endpoint(service).Run(new Request("{}", "admin"), default);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        response.Body.Position = 0;
        using var json = await JsonDocument.ParseAsync(response.Body);
        Assert.True(json.RootElement.GetProperty("dryRun").GetBoolean());
        Assert.Equal(0, json.RootElement.GetProperty("deleted").GetInt32());
        Assert.True(json.RootElement.GetProperty("completed").GetBoolean());
        Assert.Equal(JsonValueKind.Null, json.RootElement.GetProperty("continuationToken").ValueKind);
        Assert.Equal(JsonValueKind.Array, json.RootElement.GetProperty("warnings").ValueKind);
        Assert.True(service.Last!.DryRun);
        Assert.Equal(250, service.Last.MaxItems);
    }

    [Theory]
    [InlineData("source", 502)]
    [InlineData("config", 503)]
    [InlineData("busy", 409)]
    [InlineData("timeout", 504)]
    [InlineData("unknown", 500)]
    [InlineData("cursor", 400)]
    [InlineData("stale", 409)]
    public async Task FailureStatusIsExplicitAndDoesNotLeakExceptionMessages(string failure, int expected)
    {
        var service = new Sync { Failure = failure };
        var response = await Endpoint(service).Run(new Request("{}", "admin"), default);
        Assert.Equal(expected, (int)response.StatusCode);
        response.Body.Position = 0;
        var body = await new StreamReader(response.Body).ReadToEndAsync();
        Assert.DoesNotContain("secret-session", body);
    }

    [Fact]
    public async Task TimeoutIncludesSafePartialCountsAndContinuationContract()
    {
        var response = await Endpoint(new Sync { Failure = "progress" }).Run(new Request("{}", "admin"), default);
        Assert.Equal(HttpStatusCode.GatewayTimeout, response.StatusCode);
        response.Body.Position = 0;
        using var json = await JsonDocument.ParseAsync(response.Body);
        Assert.True(json.RootElement.GetProperty("retryable").GetBoolean());
        Assert.Equal("storage", json.RootElement.GetProperty("phase").GetString());
        var partial = json.RootElement.GetProperty("partialResult");
        Assert.Equal(7, partial.GetProperty("created").GetInt32());
        Assert.False(partial.GetProperty("completed").GetBoolean());
        Assert.Equal("opaque-cursor", partial.GetProperty("continuationToken").GetString());
        Assert.Equal(0, partial.GetProperty("deleted").GetInt32());
    }

    private static SyncTmdbContent Endpoint(Sync service) => new(service, NullLogger<SyncTmdbContent>.Instance);
    private sealed class Sync : ITmdbSyncService
    {
        public int Calls;
        public string? Failure;
        public TmdbSyncRequest? Last;
        public Task<TmdbSyncResult> SyncAsync(TmdbSyncRequest request, CancellationToken ct = default)
        {
            Calls++;
            Last = request;
            if (Failure != null) throw Failure switch
            {
                "source" => new TmdbSourceException("Safe source failure."),
                "config" => new InvalidOperationException("secret-session"),
                "busy" => new TmdbSyncBusyException(),
                "timeout" => new TaskCanceledException("secret-session"),
                "progress" => new TmdbSyncProgressException(new TmdbSyncResult { Created = 7, ContinuationToken = "opaque-cursor" }, "storage", true),
                "cursor" => new TmdbContinuationException("Invalid continuation."),
                "stale" => new TmdbContinuationException("Source changed; restart.", stale: true),
                _ => new Exception("secret-session")
            };
            return Task.FromResult(new TmdbSyncResult { DryRun = request.DryRun, Completed = true });
        }
    }
    private sealed class Request : HttpRequestData
    {
        public Request(string body, string? role = null) : base(new TestFunctionContext())
        {
            Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
            if (role != null) Headers.Add("x-ms-client-principal", Convert.ToBase64String(Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(new { userRoles = new[] { role } }))));
        }
        public override Stream Body { get; }
        public override HttpHeadersCollection Headers { get; } = new();
        public override IReadOnlyCollection<IHttpCookie> Cookies => [];
        public override Uri Url => new("https://example.test/api/content-admin/tmdb/sync");
        public override IEnumerable<ClaimsIdentity> Identities => [];
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
