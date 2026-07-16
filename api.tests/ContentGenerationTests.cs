using api.Services;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for the admin AI content generation helpers: system-prompt construction and the strict
/// JSON parsing (including code-fence tolerance and locale fallback) used by the Foundry service.
/// </summary>
public class ContentGenerationTests
{
    [Fact]
    public void BuildSystemPrompt_IncludesToneAndStrictJsonContract()
    {
        var prompt = FoundryContentGenerationService.BuildSystemPrompt("gaming", "description");

        Assert.Contains("David Sanchez", prompt);
        Assert.Contains("English, Spanish, and Portuguese", prompt);
        Assert.Contains("\"en\"", prompt);
        Assert.Contains("untrusted", prompt); // prompt-injection guard
    }

    [Theory]
    [InlineData("gaming", "description")]
    [InlineData("parks", "description")]
    [InlineData("movies", "review")]
    [InlineData("gaming", "recommendation")]
    [InlineData("parks", "name")]
    [InlineData("monthly-updates", "introText")]
    public void BuildSystemPrompt_HasFieldGuidanceForKnownFields(string type, string field)
    {
        var prompt = FoundryContentGenerationService.BuildSystemPrompt(type, field);
        Assert.Contains("FIELD:", prompt);
    }

    [Fact]
    public void ParseLocalized_ParsesPlainJson()
    {
        var result = FoundryContentGenerationService.ParseLocalized(
            "{\"en\":\"Hello\",\"es\":\"Hola\",\"pt\":\"Olá\"}");

        Assert.Equal("Hello", result.En);
        Assert.Equal("Hola", result.Es);
        Assert.Equal("Olá", result.Pt);
    }

    [Fact]
    public void ParseLocalized_StripsCodeFences()
    {
        var raw = "```json\n{\"en\":\"A\",\"es\":\"B\",\"pt\":\"C\"}\n```";
        var result = FoundryContentGenerationService.ParseLocalized(raw);

        Assert.Equal("A", result.En);
        Assert.Equal("B", result.Es);
        Assert.Equal("C", result.Pt);
    }

    [Fact]
    public void ParseLocalized_FillsMissingLocalesFromEnglish()
    {
        var result = FoundryContentGenerationService.ParseLocalized("{\"en\":\"Only English\"}");

        Assert.Equal("Only English", result.En);
        Assert.Equal("Only English", result.Es);
        Assert.Equal("Only English", result.Pt);
    }

    [Fact]
    public void ParseLocalized_TrimsWhitespace()
    {
        var result = FoundryContentGenerationService.ParseLocalized(
            "{\"en\":\"  padded  \",\"es\":\"x\",\"pt\":\"y\"}");

        Assert.Equal("padded", result.En);
    }

    [Fact]
    public void ParseLocalized_ThrowsOnInvalidJson()
    {
        Assert.Throws<InvalidOperationException>(() =>
            FoundryContentGenerationService.ParseLocalized("not json at all"));
    }

    [Fact]
    public void ParseLocalized_ThrowsWhenNoLocalesPresent()
    {
        Assert.Throws<InvalidOperationException>(() =>
            FoundryContentGenerationService.ParseLocalized("{\"foo\":\"bar\"}"));
    }

    [Fact]
    public void ToJsonObject_ProducesLocalizedShape()
    {
        var json = new LocalizedText("A", "B", "C").ToJsonObject().ToJsonString();
        Assert.Contains("\"en\":\"A\"", json);
        Assert.Contains("\"es\":\"B\"", json);
        Assert.Contains("\"pt\":\"C\"", json);
    }
}
