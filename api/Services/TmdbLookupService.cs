using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using OpenTelemetry;

namespace api.Services;

public sealed record TmdbMetadata(
    int TmdbId, string MediaType, string? TitleId, string Title, int? Year,
    string? Plot, string? Director, string? PosterPath, string? ImageUrl,
    double? TmdbRating, string[] Genres, Dictionary<string, string> TitleTranslations,
    Dictionary<string, string> Overview, Dictionary<string, string[]> GenresTranslations);

public sealed class TmdbLookupException(HttpStatusCode status) : Exception(MessageFor(status))
{
    public HttpStatusCode Status { get; } = status;

    private static string MessageFor(HttpStatusCode status) => status switch
    {
        HttpStatusCode.BadRequest => "Provide a positive TMDB ID and a movie or tv media type.",
        HttpStatusCode.NotFound => "No title was found for that TMDB ID and media type.",
        HttpStatusCode.TooManyRequests => "The metadata lookup limit was reached. Please try again later.",
        HttpStatusCode.ServiceUnavailable => "TMDB is not configured or the server token was rejected. Contact the administrator.",
        HttpStatusCode.GatewayTimeout => "The metadata lookup timed out. Please try again.",
        _ => "Metadata could not be retrieved. Please try again later."
    };
}

public interface ITmdbLookupService
{
    Task<TmdbMetadata> LookupAsync(int tmdbId, string mediaType, CancellationToken ct = default);
}

public sealed partial class TmdbLookupService(IHttpClientFactory factory, TmdbSettings settings) : ITmdbLookupService
{
    internal const string ClientName = "tmdb";
    internal const int MaxResponseBytes = 512 * 1024;
    internal static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(10);

    [GeneratedRegex(@"\A[1-9][0-9]{0,9}\z", RegexOptions.CultureInvariant)]
    private static partial Regex IdPattern();

    [GeneratedRegex(@"\A/[a-zA-Z0-9_-]+\.(jpg|png|webp)\z", RegexOptions.CultureInvariant)]
    private static partial Regex PosterPattern();

    [GeneratedRegex(@"\Att[0-9]{6,12}\z", RegexOptions.CultureInvariant)]
    private static partial Regex ImdbPattern();

    public static bool TryParseId(string? value, out int id)
    {
        id = 0;
        return value != null && IdPattern().IsMatch(value) &&
            int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out id);
    }

    public async Task<TmdbMetadata> LookupAsync(int tmdbId, string mediaType, CancellationToken ct = default)
    {
        if (tmdbId <= 0 || mediaType is not ("movie" or "tv"))
            throw new TmdbLookupException(HttpStatusCode.BadRequest);
        if (!settings.IsConfigured) throw new TmdbLookupException(HttpStatusCode.ServiceUnavailable);

        try
        {
            // Keep provider headers and exception details out of HTTP telemetry.
            using var suppression = SuppressInstrumentationScope.Begin();
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(RequestTimeout);
            using var client = factory.CreateClient(ClientName);
            var titles = new Dictionary<string, string>();
            var overviews = new Dictionary<string, string>();
            var genres = new Dictionary<string, string[]>();
            JsonElement english = default;
            foreach (var (locale, language) in new[] { ("en", "en-US"), ("es", "es-ES"), ("pt", "pt-BR") })
            {
                var details = await FetchAsync(client, tmdbId, mediaType, language, locale == "en", timeout.Token);
                ValidateObject(details);
                if (!details.TryGetProperty("id", out var id) || !id.TryGetInt32(out var actualId) || actualId != tmdbId)
                    throw InvalidPayload();
                titles[locale] = Text(details, mediaType == "movie" ? "title" : "name") ?? "";
                overviews[locale] = Text(details, "overview") ?? "";
                genres[locale] = Array(details, "genres").Select(genre => Text(genre, "name") ?? throw InvalidPayload())
                    .Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
                if (locale == "en") english = details;
            }
            var title = titles["en"];
            if (string.IsNullOrWhiteSpace(title)) throw InvalidPayload();
            var releaseDate = Text(english, mediaType == "movie" ? "release_date" : "first_air_date");
            int? year = null;
            if (releaseDate != null)
            {
                if (!DateOnly.TryParseExact(releaseDate, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var date)) throw InvalidPayload();
                year = date.Year;
            }
            var poster = Text(english, "poster_path");
            if (poster != null && !PosterPattern().IsMatch(poster)) throw InvalidPayload();
            double? rating = null;
            if (english.TryGetProperty("vote_average", out var average) && average.ValueKind != JsonValueKind.Null)
            {
                if (!average.TryGetDouble(out var value) || !double.IsFinite(value) || value is < 0 or > 10)
                    throw InvalidPayload();
                if (!english.TryGetProperty("vote_count", out var votes) || !votes.TryGetInt32(out var count) || count < 0)
                    throw InvalidPayload();
                if (count > 0) rating = value;
            }
            var externalIds = Object(english, "external_ids");
            var imdbId = externalIds.HasValue ? Text(externalIds.Value, "imdb_id") : null;
            if (imdbId != null && !ImdbPattern().IsMatch(imdbId)) throw InvalidPayload();
            var credits = Object(english, "credits");
            var people = mediaType == "tv"
                ? Array(english, "created_by")
                : credits.HasValue ? Array(credits.Value, "crew").Where(person => Text(person, "job") == "Director") : [];
            var names = people.Select(person => Text(person, "name") ?? throw InvalidPayload()).Distinct().ToArray();
            return new(tmdbId, mediaType, imdbId, title, year, NullIfEmpty(overviews["en"]),
                names.Length == 0 ? null : string.Join(", ", names), poster,
                poster == null ? null : $"https://image.tmdb.org/t/p/w500{poster}",
                rating, genres["en"], titles, overviews, genres);
        }
        catch (TmdbLookupException) { throw; }
        catch (OperationCanceledException) { throw new TmdbLookupException(HttpStatusCode.GatewayTimeout); }
        catch
        {
            // Do not retain provider exceptions, response bodies or authorization headers.
            throw InvalidPayload();
        }
    }

    private async Task<JsonElement> FetchAsync(HttpClient client, int id, string type, string language, bool extras, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get,
            $"https://api.themoviedb.org/3/{type}/{id}?language={language}" +
            (extras ? "&append_to_response=credits,external_ids" : ""));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ReadAccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
            throw new TmdbLookupException(response.StatusCode switch
            {
                HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => HttpStatusCode.ServiceUnavailable,
                HttpStatusCode.NotFound => HttpStatusCode.NotFound,
                HttpStatusCode.TooManyRequests => HttpStatusCode.TooManyRequests,
                HttpStatusCode.RequestTimeout or HttpStatusCode.GatewayTimeout => HttpStatusCode.GatewayTimeout,
                _ => HttpStatusCode.BadGateway
            });
        if (response.Content.Headers.ContentLength > MaxResponseBytes) throw InvalidPayload();
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        var buffer = new byte[MaxResponseBytes + 1];
        var length = 0;
        while (length < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(length), ct);
            if (read == 0) break;
            length += read;
        }
        if (length > MaxResponseBytes) throw InvalidPayload();
        using var json = JsonDocument.Parse(buffer.AsMemory(0, length), new JsonDocumentOptions { MaxDepth = 32 });
        RejectReflectedCredential(json.RootElement);
        return json.RootElement.Clone();
    }

    private void RejectReflectedCredential(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.String &&
            value.GetString()!.Contains(settings.ReadAccessToken!, StringComparison.Ordinal)) throw InvalidPayload();
        if (value.ValueKind == JsonValueKind.Object)
        {
            ValidateObject(value);
            foreach (var property in value.EnumerateObject()) RejectReflectedCredential(property.Value);
        }
        if (value.ValueKind == JsonValueKind.Array)
            foreach (var item in value.EnumerateArray()) RejectReflectedCredential(item);
    }

    private static void ValidateObject(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Object ||
            value.EnumerateObject().Select(p => p.Name).Distinct(StringComparer.Ordinal).Count() != value.EnumerateObject().Count())
            throw InvalidPayload();
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? Text(JsonElement root, string name)
    {
        ValidateObject(root);
        if (!root.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null) return null;
        if (value.ValueKind != JsonValueKind.String) throw InvalidPayload();
        return NullIfEmpty(value.GetString());
    }

    private static JsonElement? Object(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null) return null;
        ValidateObject(value);
        return value;
    }

    private static IEnumerable<JsonElement> Array(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value) || value.ValueKind == JsonValueKind.Null) return [];
        if (value.ValueKind != JsonValueKind.Array) throw InvalidPayload();
        return value.EnumerateArray();
    }

    private static TmdbLookupException InvalidPayload() => new(HttpStatusCode.BadGateway);
}
