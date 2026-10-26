using System.Net;
using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Web;
using api.Services;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OpenTelemetry;
using OpenTelemetry.Trace;
using Xunit;

namespace api.tests;

public class TmdbLookupTests
{
    private const string Secret = "test-only-tmdb-token";
    private const string Query = "?tmdbId=550&mediaType=movie";

    [Theory]
    [InlineData(null, 401)]
    [InlineData("authenticated", 403)]
    [InlineData("anonymous", 403)]
    public async Task AuthenticationCannotBeBypassed(string? role, int status)
    {
        using var http = new FakeHttp();
        var request = new Request(Query, role);
        request.Headers.Add("X-Tmdb-Sync-Key", Secret);
        var response = await Endpoint(http).Run(request, default);
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Empty(http.Requests);
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
        var request = new Request(Query, null);
        request.Headers.Add("x-ms-client-principal", encoded);
        Assert.Equal(status, (int)(await Endpoint(http).Run(request, default)).StatusCode);
        Assert.Empty(http.Requests);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?tmdbId=550")]
    [InlineData("?tmdbId=550&mediaType=series")]
    [InlineData("?tmdbId=550&mediaType=MOVIE")]
    [InlineData("?tmdbId=550&mediaType=movie&mediaType=movie")]
    [InlineData("?tmdbId=550&tmdbId=550&mediaType=movie")]
    [InlineData("?tmdbId=550&tmdb%49d=550&mediaType=movie")]
    [InlineData("?tmdbId=550&TMDBID=550&mediaType=movie")]
    [InlineData("?tmdbId=550&mediaType=movie&url=https://evil.test")]
    [InlineData("?tmdbId=550&mediaType=movie&apikey=client-key")]
    [InlineData("?tmdbId=550&mediaType=movie&tmdbId")]
    [InlineData("?tmdbId=0&mediaType=movie")]
    [InlineData("?tmdbId=-1&mediaType=movie")]
    [InlineData("?tmdbId=1.5&mediaType=movie")]
    [InlineData("?tmdbId=2147483648&mediaType=movie")]
    [InlineData("?tmdbId=５５０&mediaType=movie")]
    [InlineData("?tmdbId=55%0A0&mediaType=movie")]
    [InlineData("?tmdbId=550%00&mediaType=movie")]
    [InlineData("?tmdbId=tt0111161&mediaType=movie")]
    [InlineData("?tmdbId=https://evil.test&mediaType=movie")]
    public async Task InvalidParametersNeverReachUpstreamOrConsumeQuota(string query)
    {
        using var http = new FakeHttp();
        var limiter = new Limiter();
        var response = await Endpoint(http, limiter).Run(new Request(query), default);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(http.Requests);
        Assert.Equal(0, limiter.Calls);
        AssertNoStore(response);
    }

    [Fact]
    public async Task ExcessiveQueryIsBounded()
    {
        using var http = new FakeHttp();
        Assert.Equal(HttpStatusCode.BadRequest,
            (await Endpoint(http).Run(new Request("?tmdbId=" + new string('1', 300)), default)).StatusCode);
        Assert.Empty(http.Requests);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("2147483647")]
    public void StrictIdBoundariesAreSupported(string id) => Assert.True(TmdbLookupService.TryParseId(id, out _));

    [Theory]
    [InlineData("movie")]
    [InlineData("tv")]
    public async Task SuccessNormalizesLocalizedDetailsUsingFixedBearerRequests(string type)
    {
        using var http = new FakeHttp
        {
            PayloadFor = language => ValidPayload(type, language).ToJsonString()
        };
        var limiter = new Limiter();
        var response = await Endpoint(http, limiter).Run(new Request("?tmdbId=+550%20&mediaType=" + type), default);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertNoStore(response);
        var json = await Read(response);
        Assert.Equal(14, json.Count);
        Assert.Equal(550, json["tmdbId"]!.GetValue<int>());
        Assert.Equal(type, json["mediaType"]!.GetValue<string>());
        Assert.Equal("tt0111161", json["titleId"]!.GetValue<string>());
        Assert.Equal("Title en-US", json["title"]!.GetValue<string>());
        Assert.Equal(1994, json["year"]!.GetValue<int>());
        Assert.Equal("Plot en-US", json["plot"]!.GetValue<string>());
        Assert.Equal(type == "movie" ? "Director" : "Creator", json["director"]!.GetValue<string>());
        Assert.Equal("https://image.tmdb.org/t/p/w500/poster.jpg", json["imageUrl"]!.GetValue<string>());
        Assert.Equal(8.7, json["tmdbRating"]!.GetValue<double>());
        Assert.Equal("Title es-ES", json["titleTranslations"]!["es"]!.GetValue<string>());
        Assert.Equal("Plot pt-BR", json["overview"]!["pt"]!.GetValue<string>());
        Assert.Equal("Genre pt-BR", json["genresTranslations"]!["pt"]![0]!.GetValue<string>());
        Assert.Equal(3, http.Requests.Count);
        foreach (var request in http.Requests)
        {
            Assert.Equal("https", request.Uri.Scheme);
            Assert.Equal("api.themoviedb.org", request.Uri.Host);
            Assert.Equal($"/3/{type}/550", request.Uri.AbsolutePath);
            Assert.DoesNotContain(Secret, request.Uri.ToString());
            Assert.Equal("Bearer " + Secret, request.Authorization);
            Assert.Equal(HttpMethod.Get, request.Method);
        }
        var english = HttpUtility.ParseQueryString(http.Requests[0].Uri.Query);
        Assert.Equal("credits,external_ids", english["append_to_response"]);
        Assert.Equal("tmdb:admin:admin-user", limiter.Key);
        Assert.Equal(20, limiter.MaxRequests);
        Assert.Equal(TimeSpan.FromMinutes(1), limiter.Window);
        Assert.Null(json["imdbRating"]);
    }

    [Fact]
    public async Task LocalRateLimitReturns429WithoutHttp()
    {
        using var http = new FakeHttp();
        Assert.Equal(HttpStatusCode.TooManyRequests,
            (await Endpoint(http, new Limiter { Limited = true }).Run(new Request(), default)).StatusCode);
        Assert.Empty(http.Requests);
    }

    [Fact]
    public async Task HealthReportsTokenPresenceNotItsValue()
    {
        var health = new HealthCheck(NullLogger<HealthCheck>.Instance, null!, null!, null!, null!, null!, null!,
            new TmdbSettings { ReadAccessToken = Secret });
        var json = await Read(await health.GetConfig(new Request()));
        var variables = json["variables"]!.AsArray();
        var setting = Assert.Single(variables, value => value!["name"]!.GetValue<string>() == "TMDB_READ_ACCESS_TOKEN");
        Assert.True(setting!["isConfigured"]!.GetValue<bool>());
        Assert.False(setting["required"]!.GetValue<bool>());
        Assert.DoesNotContain(variables, value => value!["name"]!.GetValue<string>() == "OMDB_API_KEY");
        Assert.DoesNotContain(Secret, json.ToJsonString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public async Task MissingTokenReturns503WithoutHttp(string? token)
    {
        using var http = new FakeHttp();
        var response = await Endpoint(http, settings: new TmdbSettings { ReadAccessToken = token }).Run(new Request(), default);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Empty(http.Requests);
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
    public async Task HttpErrorsAreSanitizedAndDoNotFollowRedirects(int upstream, int status)
    {
        using var http = new FakeHttp { Status = (HttpStatusCode)upstream, PayloadFor = _ => Secret };
        var response = await Endpoint(http).Run(new Request(), default);
        Assert.Equal(status, (int)response.StatusCode);
        Assert.DoesNotContain(Secret, (await Read(response)).ToJsonString());
        Assert.Single(http.Requests);
        AssertNoStore(response);
    }

    [Theory]
    [InlineData("network", 502)]
    [InlineData("timeout", 504)]
    [InlineData("unexpected", 502)]
    public async Task RawExceptionsAreNotPreserved(string failure, int status)
    {
        using var http = new FakeHttp
        {
            Failure = failure switch
            {
                "network" => new HttpRequestException(Secret),
                "timeout" => new TaskCanceledException(Secret),
                _ => new InvalidOperationException(Secret)
            }
        };
        var exception = await Assert.ThrowsAsync<TmdbLookupException>(() => Service(http).LookupAsync(550, "movie"));
        Assert.Equal(status, (int)exception.Status);
        Assert.Null(exception.InnerException);
        Assert.DoesNotContain(Secret, exception.ToString());
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("null")]
    [InlineData("{")]
    [InlineData("{}")]
    [InlineData("<html>private</html>")]
    [InlineData("{\"id\":550,\"id\":550}")]
    [InlineData("{\"success\":false,\"status_code\":7,\"status_message\":\"private\"}")]
    public async Task MalformedResponsesFailSafely(string payload)
    {
        using var http = new FakeHttp { PayloadFor = _ => payload };
        Assert.Equal(HttpStatusCode.BadGateway, (await Endpoint(http).Run(new Request(), default)).StatusCode);
    }

    [Theory]
    [InlineData("id", "551")]
    [InlineData("id", "\"550\"")]
    [InlineData("title", "\"\"")]
    [InlineData("title", "null")]
    [InlineData("release_date", "\"not-a-date\"")]
    [InlineData("release_date", "\"2026-02-30\"")]
    [InlineData("vote_average", "11")]
    [InlineData("vote_average", "\"8.7\"")]
    [InlineData("vote_count", "-1")]
    [InlineData("poster_path", "\"https://evil.test/poster.jpg\"")]
    [InlineData("poster_path", "\"/../poster.jpg\"")]
    [InlineData("external_ids", "{\"imdb_id\":\"bad\"}")]
    [InlineData("overview", "{}")]
    [InlineData("genres", "{}")]
    [InlineData("credits", "{\"crew\":[{\"job\":\"Director\",\"name\":5}]}")]
    public async Task InvalidMetadataNeverSucceeds(string field, string value)
    {
        var payload = ValidPayload();
        payload[field] = JsonNode.Parse(value);
        using var http = new FakeHttp { PayloadFor = _ => payload.ToJsonString() };
        Assert.Equal(HttpStatusCode.BadGateway, (await Endpoint(http).Run(new Request(), default)).StatusCode);
    }

    [Fact]
    public async Task MissingOptionalValuesAndTranslationsAreExplicit()
    {
        using var http = new FakeHttp
        {
            PayloadFor = language => new JsonObject
            {
                ["id"] = 550, ["title"] = language == "en-US" ? "English title" : "",
                ["vote_average"] = 0, ["vote_count"] = 0
            }.ToJsonString()
        };
        var result = await Service(http).LookupAsync(550, "movie");
        Assert.Null(result.TmdbRating);
        Assert.Null(result.TitleId);
        Assert.Null(result.ImageUrl);
        Assert.Null(result.PosterPath);
        Assert.Null(result.Year);
        Assert.Null(result.Director);
        Assert.Null(result.Plot);
        Assert.Empty(result.Genres);
        Assert.Equal("", result.TitleTranslations["es"]);
        Assert.Equal("", result.Overview["pt"]);
        Assert.Empty(result.GenresTranslations["pt"]);
    }

    [Theory]
    [InlineData("es-ES")]
    [InlineData("pt-BR")]
    public async Task LocalizedFailureCannotReturnPartialSuccess(string locale)
    {
        using var http = new FakeHttp { PayloadFor = language => language == locale ? "{}" : ValidPayload().ToJsonString() };
        Assert.Equal(HttpStatusCode.BadGateway, (await Endpoint(http).Run(new Request(), default)).StatusCode);
    }

    [Fact]
    public async Task ReflectedTokenInLocalizedPayloadIsRejected()
    {
        using var http = new FakeHttp
        {
            PayloadFor = language =>
            {
                var payload = ValidPayload();
                payload["overview"] = language == "es-ES" ? Secret : "Overview";
                return payload.ToJsonString();
            }
        };
        var response = await Endpoint(http).Run(new Request(), default);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.DoesNotContain(Secret, (await Read(response)).ToJsonString());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ResponseSizeIsBoundedWithOrWithoutLength(bool hasLength)
    {
        using var http = new FakeHttp { PayloadFor = _ => new string(' ', TmdbLookupService.MaxResponseBytes + 1), HasLength = hasLength };
        Assert.Equal(HttpStatusCode.BadGateway, (await Endpoint(http).Run(new Request(), default)).StatusCode);
    }

    [Fact]
    public async Task BodyReadUsesTheSharedBoundedCancellationToken()
    {
        using var http = new FakeHttp { BodyFailure = true };
        Assert.Equal(HttpStatusCode.GatewayTimeout, (await Endpoint(http).Run(new Request(), default)).StatusCode);
        Assert.True(http.BodyToken.CanBeCanceled);
    }

    [Fact]
    public async Task ProviderTelemetryIsSuppressed()
    {
        var processor = new RecordingProcessor();
        using var provider = Sdk.CreateTracerProviderBuilder().AddSource("tmdb-test").AddProcessor(processor).Build();
        using var http = new FakeHttp();
        await Service(http).LookupAsync(550, "movie");
        Assert.Empty(processor.Activities);
        using var source = new ActivitySource("tmdb-test");
        using (source.StartActivity("control")) { }
        Assert.Single(processor.Activities);
    }

    [Fact]
    public void RegisteredTransportDisablesRedirectsCookiesPropagationAndLogging()
    {
        using var services = new ServiceCollection().AddLogging().AddTmdbLookup().BuildServiceProvider();
        using var client = services.GetRequiredService<IHttpClientFactory>().CreateClient(TmdbLookupService.ClientName);
        Assert.Equal(TimeSpan.FromSeconds(10), client.Timeout);
        Assert.Equal(TmdbLookupService.MaxResponseBytes, client.MaxResponseContentBufferSize);
        var handler = services.GetRequiredService<IHttpMessageHandlerFactory>().CreateHandler(TmdbLookupService.ClientName);
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

    private static JsonObject ValidPayload(string type = "movie", string language = "en-US") => new()
    {
        ["id"] = 550, [type == "movie" ? "title" : "name"] = " Title " + language + " ",
        [type == "movie" ? "release_date" : "first_air_date"] = "1994-09-23",
        ["overview"] = "Plot " + language, ["poster_path"] = "/poster.jpg",
        ["vote_average"] = 8.7, ["vote_count"] = 123,
        ["external_ids"] = new JsonObject { ["imdb_id"] = "tt0111161" },
        ["genres"] = new JsonArray(new JsonObject { ["id"] = 18, ["name"] = "Genre " + language }),
        ["credits"] = new JsonObject { ["crew"] = new JsonArray(new JsonObject { ["job"] = "Director", ["name"] = "Director" }) },
        ["created_by"] = new JsonArray(new JsonObject { ["name"] = "Creator" })
    };

    private static TmdbLookupService Service(FakeHttp http, TmdbSettings? settings = null) =>
        new(http, settings ?? new TmdbSettings { ReadAccessToken = Secret });
    private static GetTmdbMetadata Endpoint(FakeHttp http, Limiter? limiter = null, TmdbSettings? settings = null) =>
        new(Service(http, settings), limiter ?? new(), NullLogger<GetTmdbMetadata>.Instance);
    private static async Task<JsonObject> Read(HttpResponseData response)
    {
        response.Body.Position = 0;
        return (await JsonNode.ParseAsync(response.Body))!.AsObject();
    }
    private static void AssertNoStore(HttpResponseData response) =>
        Assert.Equal("no-store", Assert.Single(response.Headers.GetValues("Cache-Control")));

    private sealed class FakeHttp : HttpMessageHandler, IHttpClientFactory
    {
        public Func<string, string> PayloadFor = language => ValidPayload(language: language).ToJsonString();
        public HttpStatusCode Status = HttpStatusCode.OK;
        public Exception? Failure;
        public bool HasLength = true;
        public bool BodyFailure;
        public CancellationToken BodyToken;
        public List<(Uri Uri, string? Authorization, HttpMethod Method)> Requests = [];
        public HttpClient CreateClient(string name)
        {
            Assert.Equal(TmdbLookupService.ClientName, name);
            return new HttpClient(this, disposeHandler: false);
        }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add((request.RequestUri!, request.Headers.Authorization?.ToString(), request.Method));
            using var source = new ActivitySource("tmdb-test");
            using var activity = source.StartActivity("GET", ActivityKind.Client);
            activity?.SetTag("url.full", request.RequestUri!.ToString());
            if (Failure != null) throw Failure;
            var payload = PayloadFor(HttpUtility.ParseQueryString(request.RequestUri!.Query)["language"]!);
            var response = new HttpResponseMessage(Status);
            response.Headers.Location = new Uri("https://redirect.example.test/");
            response.Content = BodyFailure ? new StreamContent(new CancelledStream(token => BodyToken = token))
                : HasLength ? new StringContent(payload) : new StreamContent(new NonSeekableStream(Encoding.UTF8.GetBytes(payload)));
            return Task.FromResult(response);
        }
    }
    private sealed class RecordingProcessor : BaseProcessor<Activity>
    {
        public List<Activity> Activities { get; } = [];
        public override void OnEnd(Activity activity) => Activities.Add(activity);
    }
    private sealed class NonSeekableStream(byte[] bytes) : MemoryStream(bytes) { public override bool CanSeek => false; }
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
            Calls++; Key = key; MaxRequests = maxRequests; Window = window;
            return Limited;
        }
    }
    private sealed class Request : HttpRequestData
    {
        public Request(string query = TmdbLookupTests.Query, string? role = "admin") : base(new TestFunctionContext())
        {
            Url = new Uri("https://example.test/api/content-admin/tmdb" + query);
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
