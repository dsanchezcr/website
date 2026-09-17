using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using OpenTelemetry;

namespace api.Services;

public sealed record OmdbMetadata(
    string TitleId, string Title, int? Year, string? Plot, string? Director,
    string Type, string? ImageUrl, double? ImdbRating, string[] Genres);

public sealed class OmdbLookupException(HttpStatusCode status) : Exception(MessageFor(status))
{
    public HttpStatusCode Status { get; } = status;

    private static string MessageFor(HttpStatusCode status) => status switch
    {
        HttpStatusCode.BadRequest => "Enter a valid IMDb ID for a movie or series; episodes and other types are not supported.",
        HttpStatusCode.NotFound => "No movie or series was found for that IMDb ID.",
        HttpStatusCode.TooManyRequests => "The metadata lookup limit was reached. Please try again later.",
        HttpStatusCode.ServiceUnavailable => "OMDb is not configured or the server API key was rejected. Contact the administrator.",
        HttpStatusCode.GatewayTimeout => "The metadata lookup timed out. Please try again.",
        _ => "Metadata could not be retrieved. Please try again later."
    };
}

public interface IOmdbLookupService
{
    Task<OmdbMetadata> LookupAsync(string imdbId, CancellationToken ct = default);
}

public sealed partial class OmdbLookupService(IHttpClientFactory factory, OmdbSettings settings) : IOmdbLookupService
{
    internal const string ClientName = "omdb";
    internal const int MaxResponseBytes = 128 * 1024;
    internal static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);

    [GeneratedRegex(@"\Att[0-9]{6,12}\z", RegexOptions.CultureInvariant)]
    private static partial Regex ImdbPattern();

    [GeneratedRegex(@"\A([0-9]{4})(?:[–-](?:[0-9]{4})?)?\z", RegexOptions.CultureInvariant)]
    private static partial Regex YearPattern();

    public static bool IsValidId(string? value) => value != null && ImdbPattern().IsMatch(value);

    public async Task<OmdbMetadata> LookupAsync(string imdbId, CancellationToken ct = default)
    {
        if (!IsValidId(imdbId)) throw new OmdbLookupException(HttpStatusCode.BadRequest);
        if (!settings.IsConfigured) throw new OmdbLookupException(HttpStatusCode.ServiceUnavailable);

        try
        {
            // AI WorkerService 3.x uses OpenTelemetry HTTP instrumentation. RemoveAllLoggers
            // alone does not suppress dependency URLs or exception events from that pipeline.
            using var suppression = SuppressInstrumentationScope.Begin();
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(RequestTimeout);
            using var client = factory.CreateClient(ClientName);
            using var request = new HttpRequestMessage(HttpMethod.Get,
                $"https://www.omdbapi.com/?apikey={Uri.EscapeDataString(settings.ApiKey!)}&i={imdbId}&plot=full&r=json");
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            if (!response.IsSuccessStatusCode)
                throw new OmdbLookupException(response.StatusCode switch
                {
                    HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => HttpStatusCode.ServiceUnavailable,
                    HttpStatusCode.NotFound => HttpStatusCode.NotFound,
                    HttpStatusCode.TooManyRequests => HttpStatusCode.TooManyRequests,
                    HttpStatusCode.RequestTimeout or HttpStatusCode.GatewayTimeout => HttpStatusCode.GatewayTimeout,
                    _ => HttpStatusCode.BadGateway
                });

            if (response.Content.Headers.ContentLength > MaxResponseBytes)
                throw new OmdbLookupException(HttpStatusCode.BadGateway);
            await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
            var buffer = new byte[MaxResponseBytes + 1];
            var length = 0;
            while (length < buffer.Length)
            {
                var read = await stream.ReadAsync(buffer.AsMemory(length), timeout.Token);
                if (read == 0) break;
                length += read;
            }
            if (length > MaxResponseBytes) throw new OmdbLookupException(HttpStatusCode.BadGateway);
            using var json = JsonDocument.Parse(buffer.AsMemory(0, length), new JsonDocumentOptions { MaxDepth = 16 });
            var metadata = Normalize(json.RootElement, imdbId);
            // Do not trust upstream content to avoid reflecting the query credential.
            var fields = new[] { metadata.Title, metadata.Plot, metadata.Director, metadata.ImageUrl }.Concat(metadata.Genres);
            if (fields.Any(value => value != null &&
                (value.Contains(settings.ApiKey!, StringComparison.Ordinal) ||
                 value.Contains(Uri.EscapeDataString(settings.ApiKey!), StringComparison.Ordinal))))
                throw new OmdbLookupException(HttpStatusCode.BadGateway);
            return metadata;
        }
        catch (OmdbLookupException) { throw; }
        catch (OperationCanceledException) { throw new OmdbLookupException(HttpStatusCode.GatewayTimeout); }
        catch
        {
            // Never preserve the upstream exception/inner exception, URL or response body.
            throw new OmdbLookupException(HttpStatusCode.BadGateway);
        }
    }

    private static OmdbMetadata Normalize(JsonElement root, string imdbId)
    {
        if (root.ValueKind != JsonValueKind.Object ||
            root.EnumerateObject().Select(p => p.Name).Distinct(StringComparer.Ordinal).Count() != root.EnumerateObject().Count())
            throw new OmdbLookupException(HttpStatusCode.BadGateway);

        var success = Text(root, "Response");
        if (success == "False")
        {
            var error = Text(root, "Error") ?? "";
            throw new OmdbLookupException(error switch
            {
                "Invalid API key!" or "No API key provided." or "No API key provided!" => HttpStatusCode.ServiceUnavailable,
                "Request limit reached!" => HttpStatusCode.TooManyRequests,
                "Movie not found!" or "Series not found!" or "Incorrect IMDb ID." => HttpStatusCode.NotFound,
                _ => HttpStatusCode.BadGateway
            });
        }
        if (success != "True" || Text(root, "imdbID") != imdbId)
            throw new OmdbLookupException(HttpStatusCode.BadGateway);
        var type = Text(root, "Type");
        if (type == null) throw new OmdbLookupException(HttpStatusCode.BadGateway);
        if (type is not ("movie" or "series")) throw new OmdbLookupException(HttpStatusCode.BadRequest);
        var title = Text(root, "Title") ?? throw new OmdbLookupException(HttpStatusCode.BadGateway);

        int? year = null;
        if (Text(root, "Year") is { } rawYear)
        {
            var match = YearPattern().Match(rawYear);
            if (!match.Success || !int.TryParse(match.Groups[1].Value, out var parsedYear) || parsedYear < 1000)
                throw new OmdbLookupException(HttpStatusCode.BadGateway);
            year = parsedYear;
        }
        double? rating = null;
        if (Text(root, "imdbRating") is { } rawRating)
        {
            if (!double.TryParse(rawRating, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var parsedRating) ||
                !double.IsFinite(parsedRating) || parsedRating is < 0 or > 10)
                throw new OmdbLookupException(HttpStatusCode.BadGateway);
            rating = parsedRating;
        }
        var poster = SafePoster(Text(root, "Poster"));
        var genres = (Text(root, "Genre") ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Where(value => value != "N/A").Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        return new(imdbId, title, year, Text(root, "Plot"), Text(root, "Director"), type, poster, rating, genres);
    }

    private static string? Text(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null) return null;
        if (value.ValueKind != JsonValueKind.String) throw new OmdbLookupException(HttpStatusCode.BadGateway);
        var text = value.GetString()?.Trim();
        return string.IsNullOrEmpty(text) || text == "N/A" ? null : text;
    }

    private static string? SafePoster(string? poster)
    {
        if (poster == null || !ExternalHttpsUrl.IsValid(poster))
            return null;
        return poster;
    }
}
