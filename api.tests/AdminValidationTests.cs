using System.Text.Json.Nodes;
using api.Services;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for ContentValidator and the admin content-type allow-list. Validation must catch the
/// mistakes that would break the public site while leaving unknown fields untouched.
/// </summary>
public class AdminValidationTests
{
    private static AdminContentType Type(string slug) => AdminContentTypes.All[slug];

    [Fact]
    public void Movies_MissingCategory_FailsValidation()
    {
        var doc = new JsonObject { ["id"] = "m1", ["titleId"] = "tt0111161" };
        var errors = ContentValidator.Validate(Type("movies"), doc);
        Assert.Contains(errors, e => e.Contains("category"));
    }

    [Fact]
    public void Movies_ValidDocument_PassesValidation()
    {
        var doc = new JsonObject
        {
            ["id"] = "m1",
            ["category"] = "drama",
            ["titleId"] = "tt0111161",
            ["myRating"] = 9.5,
            ["order"] = 1,
            ["review"] = new JsonObject { ["en"] = "Great", ["es"] = "Genial", ["pt"] = "Ótimo" }
        };
        var errors = ContentValidator.Validate(Type("movies"), doc);
        Assert.Empty(errors);
    }

    [Fact]
    public void Movies_RatingOutOfRange_Fails()
    {
        var doc = new JsonObject { ["category"] = "drama", ["myRating"] = 12 };
        var errors = ContentValidator.Validate(Type("movies"), doc);
        Assert.Contains(errors, e => e.Contains("myRating"));
    }

    [Fact]
    public void Movies_ReviewAsPlainString_Fails()
    {
        var doc = new JsonObject { ["category"] = "drama", ["review"] = "not localized" };
        var errors = ContentValidator.Validate(Type("movies"), doc);
        Assert.Contains(errors, e => e.Contains("review"));
    }

    [Fact]
    public void Gaming_InvalidStatus_Fails()
    {
        var doc = new JsonObject { ["platform"] = "xbox", ["order"] = 0, ["status"] = "finished" };
        var errors = ContentValidator.Validate(Type("gaming"), doc);
        Assert.Contains(errors, e => e.Contains("status"));
    }

    [Theory]
    [InlineData("completed")]
    [InlineData("playing")]
    [InlineData("backlog")]
    [InlineData("dropped")]
    public void Gaming_ValidStatus_Passes(string status)
    {
        var doc = new JsonObject { ["platform"] = "xbox", ["order"] = 1, ["status"] = status };
        var errors = ContentValidator.Validate(Type("gaming"), doc);
        Assert.Empty(errors);
    }

    [Fact]
    public void Gaming_TitleAsString_Allowed()
    {
        var doc = new JsonObject { ["platform"] = "xbox", ["order"] = 1, ["title"] = "Halo" };
        var errors = ContentValidator.Validate(Type("gaming"), doc);
        Assert.Empty(errors);
    }

    [Fact]
    public void Gaming_TitleAsLocalizedObject_Allowed()
    {
        var doc = new JsonObject { ["platform"] = "xbox", ["order"] = 1, ["title"] = new JsonObject { ["en"] = "Halo" } };
        var errors = ContentValidator.Validate(Type("gaming"), doc);
        Assert.Empty(errors);
    }

    [Fact]
    public void Gaming_OrderNotInteger_Fails()
    {
        var doc = new JsonObject { ["platform"] = "xbox", ["order"] = 1.5 };
        var errors = ContentValidator.Validate(Type("gaming"), doc);
        Assert.Contains(errors, e => e.Contains("order"));
    }

    [Fact]
    public void Parks_MapCenterWrongLength_Fails()
    {
        var doc = new JsonObject { ["provider"] = "disney", ["mapCenter"] = new JsonArray(1.0) };
        var errors = ContentValidator.Validate(Type("parks"), doc);
        Assert.Contains(errors, e => e.Contains("mapCenter"));
    }

    [Fact]
    public void Parks_ValidDocument_Passes()
    {
        var doc = new JsonObject
        {
            ["provider"] = "disney",
            ["mapCenter"] = new JsonArray(28.4, -81.5),
            ["mapZoom"] = 15.0,
            ["name"] = new JsonObject { ["en"] = "Magic Kingdom" }
        };
        var errors = ContentValidator.Validate(Type("parks"), doc);
        Assert.Empty(errors);
    }

    [Fact]
    public void MonthlyUpdates_InvalidMonthFormat_Fails()
    {
        var doc = new JsonObject { ["month"] = "2026/05", ["order"] = 1 };
        var errors = ContentValidator.Validate(Type("monthly-updates"), doc);
        Assert.Contains(errors, e => e.Contains("month"));
    }

    [Fact]
    public void MonthlyUpdates_ValidMonth_Passes()
    {
        var doc = new JsonObject { ["month"] = "2026-05", ["order"] = 1 };
        var errors = ContentValidator.Validate(Type("monthly-updates"), doc);
        Assert.Empty(errors);
    }

    [Fact]
    public void UnknownFields_AreIgnoredByValidation()
    {
        var doc = new JsonObject
        {
            ["category"] = "drama",
            ["someFutureField"] = "kept",
            ["nested"] = new JsonObject { ["x"] = 1 }
        };
        var errors = ContentValidator.Validate(Type("movies"), doc);
        Assert.Empty(errors);
    }

    [Theory]
    [InlineData("movies", true)]
    [InlineData("series", true)]
    [InlineData("gaming", true)]
    [InlineData("parks", true)]
    [InlineData("monthly-updates", true)]
    [InlineData("MOVIES", true)] // case-insensitive
    [InlineData("newsletter-subscribers", false)]
    [InlineData("", false)]
    [InlineData("unknown", false)]
    public void AdminContentTypes_TryGet_RespectsAllowList(string slug, bool expected)
    {
        var ok = AdminContentTypes.TryGet(slug, out _);
        Assert.Equal(expected, ok);
    }
}
