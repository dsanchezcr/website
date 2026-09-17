using System.Text.Json.Serialization;

namespace api.Models.Content;

/// <summary>
/// Localized text value. Supports either a plain string or per-locale strings (en/es/pt).
/// When stored in Cosmos DB, always uses the object form with locale keys.
/// </summary>
public class LocalizedText
{
    [JsonPropertyName("en")]
    public string? En { get; set; }

    [JsonPropertyName("es")]
    public string? Es { get; set; }

    [JsonPropertyName("pt")]
    public string? Pt { get; set; }

    /// <summary>
    /// Resolve the best text for the given locale, falling back to English.
    /// </summary>
    public string? Resolve(string locale) => locale switch
    {
        "es" => Es ?? En,
        "pt" => Pt ?? En,
        _ => En
    };
}

/// <summary>
/// Base document type for all content stored in Cosmos DB.
/// </summary>
public abstract class ContentDocument
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}

/// <summary>
/// Stored media metadata shared by movies and series. Legacy IMDb-only documents
/// remain valid; TMDB imports additionally carry localized metadata.
/// </summary>
public abstract class MediaDocument : ContentDocument
{
    [JsonPropertyName("titleId")]
    public string? TitleId { get; set; }

    [JsonPropertyName("tmdbId")]
    public int? TmdbId { get; set; }

    [JsonPropertyName("mediaType")]
    public string? MediaType { get; set; }

    [JsonPropertyName("posterPath")]
    public string? PosterPath { get; set; }

    [JsonPropertyName("titleTranslations")]
    public LocalizedText? TitleTranslations { get; set; }

    [JsonPropertyName("overview")]
    public LocalizedText? Overview { get; set; }

    [JsonPropertyName("genresTranslations")]
    public Dictionary<string, List<string>>? GenresTranslations { get; set; }

    [JsonPropertyName("tmdbRating")]
    public double? TmdbRating { get; set; }

    [JsonPropertyName("syncSource")]
    public string? SyncSource { get; set; }

    [JsonPropertyName("syncedAt")]
    public DateTimeOffset? SyncedAt { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("plot")]
    public string? Plot { get; set; }

    [JsonPropertyName("director")]
    public string? Director { get; set; }

    [JsonPropertyName("metadataSource")]
    public string? MetadataSource { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("year")]
    public int? Year { get; set; }

    [JsonPropertyName("genres")]
    public List<string>? Genres { get; set; }

    [JsonPropertyName("imdbRating")]
    public double? ImdbRating { get; set; }

    [JsonPropertyName("myRating")]
    public double? MyRating { get; set; }

    [JsonPropertyName("review")]
    public LocalizedText? Review { get; set; }

    [JsonPropertyName("order")]
    public int? Order { get; set; }
}

/// <summary>
/// A movie entry in content-movies, partition key /category.
/// </summary>
public class MovieDocument : MediaDocument { }

/// <summary>
/// A TV series entry in content-series, partition key /category.
/// </summary>
public class SeriesDocument : MediaDocument { }

/// <summary>
/// A gaming entry (card or group) stored in the content-gaming container.
/// Partition key: /platform
/// </summary>
public class GamingDocument : ContentDocument
{
    [JsonPropertyName("platform")]
    public string Platform { get; set; } = string.Empty;

    [JsonPropertyName("section")]
    public string Section { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "card";

    [JsonPropertyName("title")]
    public object? Title { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("recommendation")]
    public object? Recommendation { get; set; }

    [JsonPropertyName("description")]
    public object? Description { get; set; }

    [JsonPropertyName("coOp")]
    public bool? CoOp { get; set; }

    [JsonPropertyName("online")]
    public bool? Online { get; set; }

    [JsonPropertyName("games")]
    public List<GamingChildEntry>? Games { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset? CreatedAt { get; set; }

    [JsonPropertyName("manualOrder")]
    public int? ManualOrder { get; set; }

    [JsonPropertyName("order")]
    public int Order { get; set; }
}

/// <summary>
/// A child game entry within a gaming group.
/// </summary>
public class GamingChildEntry
{
    [JsonPropertyName("title")]
    public object? Title { get; set; }

    [JsonPropertyName("platform")]
    public string? Platform { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("recommendation")]
    public object? Recommendation { get; set; }

    [JsonPropertyName("description")]
    public object? Description { get; set; }

    [JsonPropertyName("coOp")]
    public bool? CoOp { get; set; }

    [JsonPropertyName("online")]
    public bool? Online { get; set; }
}

/// <summary>
/// A theme park entry stored in the content-parks container.
/// Partition key: /provider
/// </summary>
public class ParkDocument : ContentDocument
{
    [JsonPropertyName("provider")]
    public string Provider { get; set; } = string.Empty;

    [JsonPropertyName("parkId")]
    public string ParkId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public LocalizedText? Name { get; set; }

    [JsonPropertyName("description")]
    public LocalizedText? Description { get; set; }

    [JsonPropertyName("mapCenter")]
    public double[]? MapCenter { get; set; }

    [JsonPropertyName("mapZoom")]
    public double? MapZoom { get; set; }

    [JsonPropertyName("items")]
    public List<ParkItem>? Items { get; set; }
}

/// <summary>
/// An individual item within a theme park (attraction, dining, etc.).
/// </summary>
public class ParkItem
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public LocalizedText? Name { get; set; }

    [JsonPropertyName("review")]
    public LocalizedText? Review { get; set; }

    [JsonPropertyName("tips")]
    public LocalizedText? Tips { get; set; }

    [JsonPropertyName("rating")]
    public int? Rating { get; set; }

    [JsonPropertyName("mustDo")]
    public bool? MustDo { get; set; }

    [JsonPropertyName("coordinates")]
    public double[]? Coordinates { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("order")]
    public int? Order { get; set; }
}

/// <summary>
/// A monthly gaming update entry stored in the content-monthly-updates container.
/// Partition key: /month (e.g. "2026-04", "2026-05")
/// </summary>
public class MonthlyUpdateDocument : ContentDocument
{
    [JsonPropertyName("month")]
    public string Month { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public object? Title { get; set; }

    [JsonPropertyName("releaseDate")]
    public string? ReleaseDate { get; set; }

    [JsonPropertyName("description")]
    public object? Description { get; set; }

    [JsonPropertyName("platforms")]
    public string? Platforms { get; set; }

    [JsonPropertyName("youtubeVideoId")]
    public string? YoutubeVideoId { get; set; }

    [JsonPropertyName("youtubeTitle")]
    public object? YoutubeTitle { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("category")]
    public string Category { get; set; } = "upcoming";

    [JsonPropertyName("order")]
    public int Order { get; set; }

    [JsonPropertyName("heroImageUrl")]
    public string? HeroImageUrl { get; set; }

    [JsonPropertyName("introText")]
    public object? IntroText { get; set; }
}
