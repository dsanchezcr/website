using System.Text.Json;
using System.Text.Json.Nodes;
using api.Models.Content;
using api.Services;
using Xunit;

namespace api.tests;

public class MediaMetadataTests
{
    [Theory]
    [InlineData("movies")]
    [InlineData("series")]
    public void OmdbOptionalStringsRoundTripWithoutChangingOtherFields(string slug)
    {
        var doc = new JsonObject
        {
            ["titleId"] = "tt0111161", ["category"] = "watchlist", ["plot"] = "English plot",
            ["director"] = "Director", ["custom"] = new JsonObject { ["keep"] = true },
            ["metadataSource"] = "omdb",
            ["review"] = new JsonObject { ["en"] = "Review", ["es"] = "Reseña", ["pt"] = "Resenha" }, ["order"] = 3
        };
        var original = doc.ToJsonString();
        Assert.Empty(ContentValidator.Validate(AdminContentTypes.All[slug], doc));
        Assert.Equal(original, doc.ToJsonString());
        MediaDocument media = slug == "movies"
            ? JsonSerializer.Deserialize<MovieDocument>(original)!
            : JsonSerializer.Deserialize<SeriesDocument>(original)!;
        Assert.Equal("English plot", media.Plot);
        Assert.Equal("Director", media.Director);
        Assert.Equal("omdb", media.MetadataSource);
        Assert.Contains("\"metadataSource\":\"omdb\"", JsonSerializer.Serialize(media));
        Assert.Contains("\"plot\":\"English plot\"", JsonSerializer.Serialize(media));
        foreach (var field in new[] { "plot", "director", "metadataSource" })
        {
            doc[field] = null;
            Assert.Empty(ContentValidator.Validate(AdminContentTypes.All[slug], doc));
            doc[field] = 123;
            Assert.Contains(ContentValidator.Validate(AdminContentTypes.All[slug], doc), error => error.Contains(field));
            doc.Remove(field);
        }
    }

    [Fact]
    public void MediaOrderingPreservesManualTopOrderAndSortsCurrentSnapshotBeforeRetainedTitles()
    {
        MovieDocument[] docs =
        [
            new() { Id = "old", SyncSource = "tmdb", SyncedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"), Order = 90 },
            new() { Id = "second", SyncSource = "tmdb", SyncedAt = DateTimeOffset.Parse("2026-02-01T00:00:00Z"), Order = 1 },
            new() { Id = "newest", SyncSource = "tmdb", SyncedAt = DateTimeOffset.Parse("2026-02-01T00:00:00Z"), Order = 2 },
            new() { Id = "manual-no-order" }
        ];
        Assert.Equal(new[] { "newest", "second", "old", "manual-no-order" }, MediaOrdering.Sort(docs, "watchlist").Select(d => d.Id));
        Assert.Equal(new[] { "second", "newest", "old", "manual-no-order" }, MediaOrdering.Sort(docs, "top-movies").Select(d => d.Id));
    }

    [Theory]
    [InlineData("movies", "movie")]
    [InlineData("series", "tv")]
    public void MediaValidationSupportsTmdbWithoutImdbAndHalfPointRatings(string type, string mediaType)
    {
        var doc = new JsonObject { ["category"] = "watchlist", ["tmdbId"] = 5, ["mediaType"] = mediaType, ["myRating"] = 0.5 };
        Assert.Empty(ContentValidator.Validate(AdminContentTypes.All[type], doc));
        doc["myRating"] = 8.3;
        Assert.Contains(ContentValidator.Validate(AdminContentTypes.All[type], doc), e => e.Contains("half-point"));
        doc["myRating"] = new JsonObject();
        Assert.NotEmpty(ContentValidator.Validate(AdminContentTypes.All[type], doc));
        doc["tmdbId"] = -5;
        Assert.Contains(ContentValidator.Validate(AdminContentTypes.All[type], doc), e => e.Contains("tmdbId"));
    }

    [Fact]
    public void StoredMetadataValidationRequiresAllThreeLocalesAndSafePosterPaths()
    {
        var doc = new JsonObject
        {
            ["category"] = "watchlist", ["tmdbId"] = 1, ["mediaType"] = "movie",
            ["titleTranslations"] = new JsonObject { ["en"] = "English only" },
            ["posterPath"] = "https://untrusted.test/poster.jpg"
        };
        var errors = ContentValidator.Validate(AdminContentTypes.All["movies"], doc);
        Assert.Contains(errors, e => e.Contains("titleTranslations.es"));
        Assert.Contains(errors, e => e.Contains("titleTranslations.pt"));
        Assert.Contains(errors, e => e.Contains("posterPath"));
    }

    [Theory]
    [InlineData("https://images.example.test/poster.jpg", false)]
    [InlineData("http://images.example.test/poster.jpg", true)]
    [InlineData("javascript:alert(1)", true)]
    [InlineData("data:image/png;base64,test", true)]
    [InlineData("/poster.jpg", true)]
    [InlineData("https://localhost/poster.jpg", true)]
    [InlineData("https://internal.local/poster.jpg", true)]
    [InlineData("******images.example.test/poster.jpg", true)]
    [InlineData("https://images.example.test/<script>", true)]
    public void MediaValidationRequiresExternalHttpsImageUrls(string imageUrl, bool hasError)
    {
        var doc = new JsonObject
        {
            ["category"] = "watchlist", ["titleId"] = "tt0111161", ["imageUrl"] = imageUrl
        };
        var errors = ContentValidator.Validate(AdminContentTypes.All["movies"], doc);
        Assert.Equal(hasError, errors.Any(error => error.Contains("imageUrl")));
    }
}
