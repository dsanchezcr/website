using System.Text.Json.Serialization;

namespace CosmosManager.Models;

public abstract class ContentDocument
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}

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
