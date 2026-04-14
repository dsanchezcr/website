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
/// A movie entry stored in the content-movies container.
/// Partition key: /category
/// </summary>
public class MovieDocument : ContentDocument
{
    [JsonPropertyName("titleId")]
    public string TitleId { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("myRating")]
    public double? MyRating { get; set; }

    [JsonPropertyName("review")]
    public LocalizedText? Review { get; set; }

    [JsonPropertyName("order")]
    public int? Order { get; set; }
}

/// <summary>
/// A TV series entry stored in the content-series container.
/// Partition key: /category
/// </summary>
public class SeriesDocument : ContentDocument
{
    [JsonPropertyName("titleId")]
    public string TitleId { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("myRating")]
    public double? MyRating { get; set; }

    [JsonPropertyName("review")]
    public LocalizedText? Review { get; set; }

    [JsonPropertyName("order")]
    public int? Order { get; set; }
}

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
