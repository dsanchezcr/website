using System.Text.Json.Nodes;
using api.Models.Content;
using api.Services;
using Xunit;

namespace api.tests;

public class GamingOrderingTests
{
    [Fact]
    public void Sort_ManualRanksThenNewestThenLegacy_WithStableTies()
    {
        var entries = new[]
        {
            new GamingDocument { Id = "legacy", Order = 999 },
            new GamingDocument { Id = "older", CreatedAt = DateTimeOffset.Parse("2026-09-01T00:00:00Z"), Order = 900 },
            new GamingDocument { Id = "new-b", CreatedAt = DateTimeOffset.Parse("2026-09-15T00:00:00Z") },
            new GamingDocument { Id = "pin-2", ManualOrder = 2 },
            new GamingDocument { Id = "new-a", CreatedAt = DateTimeOffset.Parse("2026-09-15T00:00:00Z") },
            new GamingDocument { Id = "pin-1", ManualOrder = 1 },
        };
        Assert.Equal(new[] { "pin-1", "pin-2", "new-a", "new-b", "older", "legacy" },
            GamingOrdering.Sort(entries).Select(g => g.Id));
        Assert.Equal("legacy", entries[0].Id);
    }

    [Fact]
    public void Sort_TopGamesKeepsManualOrder_NotDatesOrOverride()
    {
        var entries = new[]
        {
            new GamingDocument { Id = "second", Order = 2, ManualOrder = 1, CreatedAt = DateTimeOffset.UtcNow },
            new GamingDocument { Id = "first", Order = 1 },
        };
        Assert.Equal("first", GamingOrdering.Sort(entries, "topGames")[0].Id);
    }

    [Fact]
    public void ClearRank_RestoresAutomaticOrdering()
    {
        var old = new GamingDocument { Id = "old", ManualOrder = 1 };
        var recent = new GamingDocument { Id = "recent", CreatedAt = DateTimeOffset.UtcNow };
        Assert.Equal("old", GamingOrdering.Sort(new[] { old, recent })[0].Id);
        old.ManualOrder = null;
        Assert.Equal("recent", GamingOrdering.Sort(new[] { old, recent })[0].Id);
    }

    [Fact]
    public void StampAndPreserveCreation_IgnoreClientDateAndNeverPromoteLegacyEdits()
    {
        var date = DateTimeOffset.Parse("2026-09-15T00:00:00Z");
        var doc = new JsonObject { ["createdAt"] = "1999-01-01", ["title"] = "Game" };
        GamingOrdering.StampCreation(doc, date);
        Assert.Equal(date.ToString("O"), doc["createdAt"]!.GetValue<string>());
        var update = new JsonObject { ["createdAt"] = "2099-01-01" };
        GamingOrdering.PreserveCreation(update, doc);
        Assert.Equal(doc["createdAt"]!.ToString(), update["createdAt"]!.ToString());
        GamingOrdering.PreserveCreation(update, new JsonObject { ["order"] = 3 });
        Assert.False(update.ContainsKey("createdAt"));
    }

    [Fact]
    public void SortAdminDocuments_PreservesUnknownFieldsAndPartitions()
    {
        var docs = new[] {
            JsonNode.Parse("""{"id":"same","platform":"xbox","section":"topGames","order":1,"custom":"keep"}""")!.AsObject(),
            JsonNode.Parse("""{"id":"same","platform":"playstation","section":"completed","createdAt":"2026-09-15T00:00:00Z"}""")!.AsObject()
        };
        var sorted = GamingOrdering.SortDocuments(docs);
        Assert.Equal(2, sorted.Count);
        Assert.Equal("keep", sorted.Single(d => d["platform"]!.ToString() == "xbox")["custom"]!.ToString());
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("1.5")]
    [InlineData("\"one\"")]
    [InlineData("2147483647")]
    public void Validator_RejectsInvalidRank(string rank)
    {
        AdminContentTypes.TryGet("gaming", out var type);
        var doc = JsonNode.Parse($$"""{"platform":"xbox","manualOrder":{{rank}}}""")!.AsObject();
        Assert.Contains(ContentValidator.Validate(type, doc), e => e.Contains("manualOrder"));
    }
}
