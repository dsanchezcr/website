using System.Text.Json.Nodes;
using api.Services;
using Xunit;

namespace api.tests;

public class MediaAdminOrderingTests
{
    [Fact]
    public void CurrentSnapshotPrecedesRetainedAndManualEntries()
    {
        var current = Document("current", "watchlist", 1, "2026-09-15T00:00:00Z");
        var retained = Document("retained", "watchlist", 100, "2026-09-01T00:00:00Z");
        var manual = Document("manual", "watchlist", 200);
        var newerInSnapshot = Document("newer", "watchlist", 2, "2026-09-15T00:00:00Z");
        var sorted = MediaOrdering.SortDocuments([manual, retained, current, newerInSnapshot]);
        Assert.Equal(["newer", "current", "retained", "manual"], sorted.Select(doc => doc["id"]!.GetValue<string>()));
    }

    [Theory]
    [InlineData("top-movies")]
    [InlineData("top-series")]
    [InlineData("top-tv")]
    public void TopCategoriesKeepManualAscendingOrder(string category)
    {
        var first = Document("first", category, 1);
        var second = Document("second", category, 2, "2026-09-15T00:00:00Z");
        Assert.Equal([first, second], MediaOrdering.SortDocuments([second, first]));
    }

    [Fact]
    public void SortingPreservesRawDocumentsForLegacyMetadataRepairs()
    {
        var doc = Document("legacy", "watchlist", 1);
        doc["titleTranslations"] = "malformed, but editable";
        doc["custom"] = new JsonObject { ["keep"] = true };
        var original = doc.ToJsonString();
        Assert.Same(doc, Assert.Single(MediaOrdering.SortDocuments([doc])));
        Assert.Equal(original, doc.ToJsonString());
    }

    private static JsonObject Document(string id, string category, int order, string? syncedAt = null) => new()
    {
        ["id"] = id, ["category"] = category, ["order"] = order,
        ["syncSource"] = syncedAt is null ? null : "tmdb", ["syncedAt"] = syncedAt
    };
}
