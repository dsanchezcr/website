using System.Diagnostics;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Web;
using api.Services;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using OpenTelemetry;
using OpenTelemetry.Trace;
using Xunit;

namespace api.tests;

public class OmdbLookupTests
{
    private const string Secret = "test-only-omdb-key&unexpected=value";
    private const string Id = "tt0111161";

    [Theory]
    [InlineData(null, 401)]
    [InlineData("authenticated", 403)]
    [InlineData("anonymous", 403)]
    public async Task AuthenticationCannotBeBypassed(string? role, int status)
    {
        using var http = new FakeHttp();
        var request = new Request("?imdbId=" + Id, role);
        request.Headers.Add("X-Tmdb-Sync-Key", Secret);
        var response = await Endpoint(http).Run(request, default);
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal(0, http.Calls);
        AssertNoStore(response);
    }

    [Theory]
    [InlineData("not-base64", 401)]
    [InlineData("bnVsbA==", 401)]
    [InlineData("e30=", 403)]
    [InlineData("eyJ1c2VyUm9sZXMiOm51bGx9", 403)]
    public async Task MalformedPrincipalsAreSafelyRejected(string encoded, int status)
    {
        using var http = new FakeHttp();
        var request = new Request("?imdbId=" + Id, null);
        request.Headers.Add("x-ms-client-principal", encoded);
        Assert.Equal(status, (int)(await Endpoint(http).Run(request, default)).StatusCode);
        Assert.Equal(0, http.Calls);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?imdbId=")]
    [InlineData("?imdbId=tt12345")]
    [InlineData("?imdbId=tt1234567890123")]
    [InlineData("?imdbId=TT0111161")]
    [InlineData("?imdbId=tt１２３４５６")]
    [InlineData("?imdbId=tt0111161x")]
    [InlineData("?imdbId=tt011%0A1161")]
    [InlineData("?imdbId=tt0111161%00")]
    [InlineData("?imdbId=tt0111161&imdbId=tt0111161")]
    [InlineData("?imdbId=tt0111161&imdb%49d=tt0111161")]
    [InlineData("?imdbId=tt0111161&IMDBID=tt0111161")]
    [InlineData("?imdbId=tt0111161&imdbId")]
    [InlineData("?imdbId=https://evil.test")]
    [InlineData("?imdbId=tt0111161&url=https://evil.test")]
    [InlineData("?imdbId=tt0111161&apikey=client-key")]
    [InlineData("?imdbId=tt0111161%26apikey%3Dclient-key")]
    public async Task InvalidAndRepeatedParametersNeverReachUpstream(string query)
    {
        using var http = new FakeHttp();
        var limiter = new Limiter();
        var response = await Endpoint(http, limiter).Run(new Request(query), default);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, http.Calls);
        Assert.Equal(0, limiter.Calls);
        AssertNoStore(response);
    }

    [Fact]
    public async Task ExcessiveQueryIsBounded()
    {
        using var http = new FakeHttp();
        var response = await Endpoint(http).Run(new Request("?imdbId=" + new string('a', 300)), default);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, http.Calls);
    }

    [Theory]
    [InlineData("tt123456")]
    [InlineData("tt123456789012")]
    public void StrictIdBoundaryIsSupported(string id) => Assert.True(OmdbLookupService.IsValidId(id));

    [Fact]
    public async Task SuccessNormalizesMetadataAndUsesOneFixedSecretSafeRequest()
    {
        using var http = new FakeHttp();
        var limiter = new Limiter();
        var response = await Endpoint(http, limiter).Run(new Request("?imdbId=+" + Id + "%20"), default);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertNoStore(response);
        var json = await Read(response);
        Assert.Equal(9, json.Count);
        Assert.Equal(Id, json["titleId"]!.GetValue<string>());
        Assert.Equal("Example title", json["title"]!.GetValue<string>());
        Assert.Equal(1994, json["year"]!.GetValue<int>());
        Assert.Equal("A complete plot.", json["plot"]!.GetValue<string>());
        Assert.Equal("A Director", json["director"]!.GetValue<string>());
        Assert.Equal("movie", json["type"]!.GetValue<string>());
        Assert.Equal("https://images.example.test/poster.jpg", json["imageUrl"]!.GetValue<string>());
        Assert.Equal(9.3, json["imdbRating"]!.GetValue<double>());
        Assert.Equal(["Drama", "Crime"], json["genres"]!.AsArray().Select(n => n!.GetValue<string>()));
        Assert.DoesNotContain(Secret, json.ToJsonString());
        Assert.Equal(1, http.Calls);
        Assert.Equal("https", http.Uri!.Scheme);
        Assert.Equal("www.omdbapi.com", http.Uri.Host);
        Assert.Equal("/", http.Uri.AbsolutePath);
        Assert.Equal(HttpMethod.Get, http.Method);
        var query = HttpUtility.ParseQueryString(http.Uri.Query);
        Assert.Equal(Secret, query["apikey"]);
        Assert.Equal(Id, query["i"]);
        Assert.Equal("full", query["plot"]);
        Assert.Equal("json", query["r"]);
        Assert.Null(query["unexpected"]);
        Assert.Equal("omdb:admin:admin-user", limiter.Key);
        Assert.Equal(20, limiter.MaxRequests);
        Assert.Equal(TimeSpan.FromMinutes(1), limiter.Window);
    }

    [Fact]
    public async Task LocalRateLimitReturns429WithoutHttp()
    {
        using var http = new FakeHttp();
        var response = await Endpoint(http, new Limiter { Limited = true }).Run(new Request(), default);
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal(0, http.Calls);
    }

    [Fact]
    public async Task HealthConfigurationReportsOmdbPresenceOnly()
    {
        var health = new HealthCheck(NullLogger<HealthCheck>.Instance, null!, null!, null!, null!, null!, null!,
            new OmdbSettings { ApiKey = Secret });
        var response = await health.GetConfig(new Request());
        var json = await Read(response);
        var variables = json["variables"]!.AsArray();
        var omdb = Assert.Single(variables, value => value!["name"]!.GetValue<string>() == "OMDB_API_KEY");
        Assert.True(omdb!["isConfigured"]!.GetValue<bool>());
        Assert.False(omdb["required"]!.GetValue<bool>());
        Assert.DoesNotContain(variables, value => value!["name"]!.GetValue<string>().StartsWith("TMDB_", StringComparison.Ordinal));
        Assert.DoesNotContain(Secret, json.ToJsonString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public async Task MissingServerKeyReturns503WithoutHttp(string? key)
    {
        using var http = new FakeHttp();
        var response = await Endpoint(http, settings: new OmdbSettings { ApiKey = key }).Run(new Request(), default);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(0, http.Calls);
    }

    [Theory]
    [InlineData(301, 502)]
    [InlineData(302, 502)]
    [InlineData(401, 503)]
    [InlineData(403, 503)]
    [InlineData(404, 404)]
    [InlineData(408, 504)]
    [InlineData(429, 429)]
    [InlineData(500, 502)]
    [InlineData(503, 502)]
    [InlineData(504, 504)]
    public async Task HttpErrorsAreSanitizedAndNeverFollowRedirects(int upstream, int status)
    {
        using var http = new FakeHttp { Status = (HttpStatusCode)upstream, Payload = Secret };
        var response = await Endpoint(http).Run(new Request(), default);
        Assert.Equal(status, (int)response.StatusCode);
        var body = (await Read(response)).ToJsonString();
        Assert.DoesNotContain(Secret, body);
        Assert.DoesNotContain("https:", body);
        Assert.Equal(1, http.Calls);
        AssertNoStore(response);
    }

    [Theory]
    [InlineData("Invalid API key!", 503)]
    [InlineData("No API key provided.", 503)]
    [InlineData("Request limit reached!", 429)]
    [InlineData("Movie not found!", 404)]
    [InlineData("Series not found!", 404)]
    [InlineData("Incorrect IMDb ID.", 404)]
    [InlineData("Error containing secret-api-key and https://provider.test", 502)]
    public async Task ProviderErrorsHaveOnlyAllowlistedMappings(string error, int status)
    {
        using var http = new FakeHttp { Payload = new JsonObject { ["Response"] = "False", ["Error"] = error }.ToJsonString() };
        var response = await Endpoint(http).Run(new Request(), default);
        Assert.Equal(status, (int)response.StatusCode);
        var body = (await Read(response)).ToJsonString();
        Assert.DoesNotContain("secret-api-key", body);
        Assert.DoesNotContain("provider.test", body);
        Assert.DoesNotContain(error, body);
    }

    [Theory]
    [InlineData("network", 502)]
    [InlineData("timeout", 504)]
    [InlineData("unexpected", 502)]
    public async Task RawExceptionsNeverReachResponsesOrLogger(string failure, int expected)
    {
        using var http = new FakeHttp
        {
            Failure = failure switch
            {
                "network" => new HttpRequestException("https://www.omdbapi.com?apikey=" + Secret),
                "timeout" => new TaskCanceledException(Secret),
                _ => new InvalidOperationException(Secret)
            }
        };
        var logger = new RecordingLogger();
        var endpoint = new GetOmdbMetadata(Service(http), new Limiter(), logger);
        var response = await endpoint.Run(new Request(), default);
        Assert.Equal(expected, (int)response.StatusCode);
        Assert.DoesNotContain(Secret, (await Read(response)).ToJsonString());
        Assert.DoesNotContain(Secret, string.Join("", logger.Messages));
        Assert.Empty(logger.Exceptions);
        var exception = await Assert.ThrowsAsync<OmdbLookupException>(() => Service(http).LookupAsync(Id));
        Assert.Null(exception.InnerException);
        Assert.DoesNotContain(Secret, exception.ToString());
    }

    [Fact]
    public async Task EndpointUnexpectedFailureLogsOnlyFixedText()
    {
        var logger = new RecordingLogger();
        var endpoint = new GetOmdbMetadata(new FailingLookup(), new Limiter(), logger);
        var response = await endpoint.Run(new Request(), default);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.DoesNotContain(Secret, (await Read(response)).ToJsonString());
        Assert.Single(logger.Messages);
        Assert.Empty(logger.Exceptions);
        Assert.DoesNotContain(Secret, logger.Messages[0]);
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("null")]
    [InlineData("{")]
    [InlineData("{}")]
    [InlineData("<html>secret-api-key</html>")]
    [InlineData("{\"Response\":\"True\",\"Response\":\"False\"}")]
    public async Task MalformedResponsesFailSafely(string payload)
    {
        using var http = new FakeHttp { Payload = payload };
        var response = await Endpoint(http).Run(new Request(), default);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.DoesNotContain("secret-api-key", (await Read(response)).ToJsonString());
    }

    [Theory]
    [InlineData("Response", "yes", 502)]
    [InlineData("imdbID", "tt1234567", 502)]
    [InlineData("imdbID", null, 502)]
    [InlineData("Title", "N/A", 502)]
    [InlineData("Title", "", 502)]
    [InlineData("Type", null, 502)]
    [InlineData("Type", "episode", 400)]
    [InlineData("Type", "game", 400)]
    [InlineData("imdbRating", "11", 502)]
    [InlineData("imdbRating", "-1", 502)]
    [InlineData("imdbRating", "NaN", 502)]
    [InlineData("imdbRating", "9,5", 502)]
    [InlineData("Year", "unknown", 502)]
    [InlineData("Year", "0000", 502)]
    public async Task InvalidMetadataIsRejected(string field, string? value, int status)
    {
        var payload = ValidPayload();
        payload[field] = value;
        using var http = new FakeHttp { Payload = payload.ToJsonString() };
        Assert.Equal(status, (int)(await Endpoint(http).Run(new Request(), default)).StatusCode);
    }

    [Theory]
    [InlineData("Genre")]
    [InlineData("Poster")]
    [InlineData("Year")]
    [InlineData("imdbRating")]
    [InlineData("Plot")]
    [InlineData("Director")]
    public async Task OptionalFieldsMustHaveProviderStringShape(string field)
    {
        var payload = ValidPayload();
        payload[field] = new JsonObject { ["nested"] = "secret-api-key" };
        using var http = new FakeHttp { Payload = payload.ToJsonString() };
        Assert.Equal(HttpStatusCode.BadGateway, (await Endpoint(http).Run(new Request(), default)).StatusCode);
    }

    [Theory]
    [InlineData("Title")]
    [InlineData("Plot")]
    [InlineData("Director")]
    [InlineData("Genre")]
    [InlineData("Poster")]
    public async Task ReflectedCredentialsAreNeverReturnedEvenInSuccessPayloads(string field)
    {
        var payload = ValidPayload();
        payload[field] = field == "Poster"
            ? "https://images.example.test/a.jpg?key=" + Uri.EscapeDataString(Secret)
            : "Upstream reflected " + Secret;
        using var http = new FakeHttp { Payload = payload.ToJsonString() };
        var response = await Endpoint(http).Run(new Request(), default);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.DoesNotContain(Secret, (await Read(response)).ToJsonString());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MissingAndNaOptionalFieldsNormalizeToNull(bool missing)
    {
        var payload = ValidPayload();
        foreach (var field in new[] { "Year", "Plot", "Director", "Poster", "imdbRating", "Genre" })
            if (missing) payload.Remove(field); else payload[field] = " N/A ";
        using var http = new FakeHttp { Payload = payload.ToJsonString() };
        var result = await Service(http).LookupAsync(Id);
        Assert.Null(result.Year);
        Assert.Null(result.Plot);
        Assert.Null(result.Director);
        Assert.Null(result.ImageUrl);
        Assert.Null(result.ImdbRating);
        Assert.Empty(result.Genres);
    }

    [Theory]
    [InlineData("2011–2019")]
    [InlineData("2011–")]
    [InlineData("2011-2019")]
    [InlineData("2011-")]
    [InlineData("2011")]
    public async Task SeriesUsesFirstYear(string year)
    {
        var payload = ValidPayload();
        payload["Type"] = "series";
        payload["Year"] = year;
        using var http = new FakeHttp { Payload = payload.ToJsonString() };
        var result = await Service(http).LookupAsync(Id);
        Assert.Equal(2011, result.Year);
        Assert.Equal("series", result.Type);
    }

    [Theory]
    [InlineData("javascript:alert(1)", null)]
    [InlineData("data:image/png;base64,abc", null)]
    [InlineData("//images.example.test/a.jpg", null)]
    [InlineData("file:///poster.jpg", null)]
    [InlineData("******images.example.test/a.jpg", null)]
    [InlineData("http://127.0.0.1/a.jpg", null)]
    [InlineData("http://169.254.169.254/a.jpg", null)]
    [InlineData("http://localhost/a.jpg", null)]
    [InlineData("http://internal.local/a.jpg", null)]
    [InlineData("https://images.example.test\\@localhost/a.jpg", null)]
    [InlineData("https://images.example.test/a.jpg", "https://images.example.test/a.jpg")]
    [InlineData("http://images.example.test/a.jpg", null)]
    public async Task PosterIsOnlyASafeExternalUrlAndIsNeverFetched(string poster, string? expected)
    {
        var payload = ValidPayload();
        payload["Poster"] = poster;
        using var http = new FakeHttp { Payload = payload.ToJsonString() };
        Assert.Equal(expected, (await Service(http).LookupAsync(Id)).ImageUrl);
        Assert.Equal(1, http.Calls);
    }

    [Fact]
    public async Task PosterCredentialsAreRejected()
    {
        var payload = ValidPayload();
        payload["Poster"] = "https://" + "user:password@" + "images.example.test/a.jpg";
        using var http = new FakeHttp { Payload = payload.ToJsonString() };
        Assert.Null((await Service(http).LookupAsync(Id)).ImageUrl);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ResponsesAreSizeBoundedWithOrWithoutContentLength(bool header)
    {
        using var http = new FakeHttp { Payload = new string(' ', OmdbLookupService.MaxResponseBytes + 1), HasLength = header };
        Assert.Equal(HttpStatusCode.BadGateway, (await Endpoint(http).Run(new Request(), default)).StatusCode);
    }

    [Fact]
    public async Task ResponseBodyReadHonorsTheBoundedCancellationToken()
    {
        using var http = new FakeHttp { BodyFailure = true };
        Assert.Equal(HttpStatusCode.GatewayTimeout, (await Endpoint(http).Run(new Request(), default)).StatusCode);
        Assert.True(http.BodyToken.CanBeCanceled);
    }

    [Fact]
    public async Task OTelExporterDoesNotReceiveSuppressedDependencies()
    {
        var processor = new RecordingProcessor();
        using var provider = Sdk.CreateTracerProviderBuilder().AddSource("omdb-test").AddProcessor(processor).Build();
        using var http = new FakeHttp();
        await Service(http).LookupAsync(Id);
        Assert.Empty(processor.Activities);
        using var source = new ActivitySource("omdb-test");
        using (source.StartActivity("control")) { }
        Assert.Single(processor.Activities);
    }

    [Fact]
    public void RegisteredTransportDisablesRedirectsCookiesPropagationAndFactoryLogging()
    {
        using var services = new ServiceCollection().AddLogging().AddOmdbLookup().BuildServiceProvider();
        using var client = services.GetRequiredService<IHttpClientFactory>().CreateClient(OmdbLookupService.ClientName);
        Assert.Equal(TimeSpan.FromSeconds(10), client.Timeout);
        Assert.Equal(OmdbLookupService.MaxResponseBytes, client.MaxResponseContentBufferSize);
        var handler = services.GetRequiredService<IHttpMessageHandlerFactory>().CreateHandler(OmdbLookupService.ClientName);
        while (handler is DelegatingHandler delegating)
        {
            Assert.DoesNotContain("Logging", handler.GetType().Name);
            handler = delegating.InnerHandler!;
        }
        var primary = Assert.IsType<SocketsHttpHandler>(handler);
        Assert.False(primary.AllowAutoRedirect);
        Assert.False(primary.UseCookies);
        Assert.Null(primary.ActivityHeadersPropagator);
    }

    private static JsonObject ValidPayload() => new()
    {
        ["Response"] = "True", ["imdbID"] = Id, ["Title"] = " Example title ", ["Year"] = "1994",
        ["Plot"] = "A complete plot.", ["Director"] = "A Director", ["Type"] = "movie",
        ["Poster"] = "https://images.example.test/poster.jpg", ["imdbRating"] = "9.3",
        ["Genre"] = "Drama, Crime, Drama", ["UnusedSecretField"] = Secret
    };

    private static OmdbLookupService Service(FakeHttp http, OmdbSettings? settings = null) =>
        new(http, settings ?? new OmdbSettings { ApiKey = Secret });

    private static GetOmdbMetadata Endpoint(FakeHttp http, Limiter? limiter = null, OmdbSettings? settings = null) =>
        new(Service(http, settings), limiter ?? new(), new RecordingLogger());

    private static async Task<JsonObject> Read(HttpResponseData response)
    {
        response.Body.Position = 0;
        return (await JsonNode.ParseAsync(response.Body))!.AsObject();
    }

    private static void AssertNoStore(HttpResponseData response) =>
        Assert.Equal("no-store", Assert.Single(response.Headers.GetValues("Cache-Control")));

    private sealed class FakeHttp : HttpMessageHandler, IHttpClientFactory
    {
        public string Payload = ValidPayload().ToJsonString();
        public HttpStatusCode Status = HttpStatusCode.OK;
        public Exception? Failure;
        public int Calls;
        public Uri? Uri;
        public HttpMethod? Method;
        public bool HasLength = true;
        public bool BodyFailure;
        public CancellationToken BodyToken;

        public HttpClient CreateClient(string name)
        {
            Assert.Equal(OmdbLookupService.ClientName, name);
            return new HttpClient(this, disposeHandler: false);
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            Uri = request.RequestUri;
            Method = request.Method;
            using var source = new ActivitySource("omdb-test");
            using var activity = source.StartActivity("GET", ActivityKind.Client);
            activity?.SetTag("url.full", Uri!.ToString());
            if (Failure != null) throw Failure;
            var response = new HttpResponseMessage(Status);
            response.Headers.Location = new Uri("https://redirect.example.test/");
            response.Content = BodyFailure
                ? new StreamContent(new CancelledStream(token => BodyToken = token))
                : HasLength ? new StringContent(Payload) : new StreamContent(new NonSeekableStream(Encoding.UTF8.GetBytes(Payload)));
            return Task.FromResult(response);
        }
    }

    private sealed class NonSeekableStream(byte[] bytes) : MemoryStream(bytes)
    {
        public override bool CanSeek => false;
    }

    private sealed class CancelledStream(Action<CancellationToken> observe) : MemoryStream
    {
        public override bool CanSeek => false;
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            observe(cancellationToken);
            throw new TaskCanceledException(Secret);
        }
    }

    private sealed class Limiter : IRateLimitService
    {
        public bool Limited;
        public int Calls;
        public string? Key;
        public int MaxRequests;
        public TimeSpan Window;
        public bool IsRateLimited(string key, int maxRequests, TimeSpan window)
        {
            Calls++;
            Key = key;
            MaxRequests = maxRequests;
            Window = window;
            return Limited;
        }
    }

    private sealed class FailingLookup : IOmdbLookupService
    {
        public Task<OmdbMetadata> LookupAsync(string imdbId, CancellationToken ct = default) =>
            throw new Exception(Secret);
    }

    private sealed class RecordingProcessor : BaseProcessor<Activity>
    {
        public List<Activity> Activities { get; } = [];
        public override void OnEnd(Activity activity) => Activities.Add(activity);
    }

    private sealed class RecordingLogger : ILogger<GetOmdbMetadata>
    {
        public List<string> Messages { get; } = [];
        public List<Exception> Exceptions { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Messages.Add(formatter(state, exception));
            if (exception != null) Exceptions.Add(exception);
        }
    }

    private sealed class Request : HttpRequestData
    {
        public Request(string query = "?imdbId=" + Id, string? role = "admin") : base(new TestFunctionContext())
        {
            Url = new Uri("https://example.test/api/content-admin/omdb" + query);
            if (role != null) Headers.Add("x-ms-client-principal", Convert.ToBase64String(Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(new { userId = "admin-user", userRoles = new[] { role } }))));
        }
        public override Stream Body { get; } = new MemoryStream();
        public override HttpHeadersCollection Headers { get; } = new();
        public override IReadOnlyCollection<IHttpCookie> Cookies => [];
        public override Uri Url { get; }
        public override IEnumerable<ClaimsIdentity> Identities => [];
        public override string Method => "GET";
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
